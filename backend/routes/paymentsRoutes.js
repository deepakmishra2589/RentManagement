const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { poolPromise, sql } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Multer storage for payment screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '..', 'uploads', 'payments');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});
const upload = multer({ storage });

const getRole = (req) => (req.user?.role || req.user?.RoleName || '').toString().toLowerCase();

// Tenant submits manual payment
router.post('/manual', auth, upload.single('screenshot'), async (req, res) => {
  try {
    const role = getRole(req);
    if (role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can submit payments' });
    }

    const tenantId = Number(req.user?.id);
    const { leaseId, amount, paymentDate, paymentMethod, referenceId, notes } = req.body;

    if (!leaseId || !amount) {
      return res.status(400).json({ message: 'leaseId and amount are required' });
    }

    const pool = await poolPromise;

    // Check lease belongs to tenant and is active
    const leaseRes = await pool.request()
      .input('LeaseID', sql.Int, Number(leaseId))
      .query('SELECT TOP 1 * FROM dbo.LeaseAgreements WHERE LeaseID = @LeaseID');

    if (leaseRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Lease not found' });
    }
    const lease = leaseRes.recordset[0];
    if (String(lease.TenantID) !== String(tenantId)) {
      return res.status(403).json({ message: 'You are not the tenant for this lease' });
    }

    const screenshotPath = req.file ? `/uploads/payments/${req.file.filename}` : null;

    // Pack extra info into Notes JSON to avoid schema migration
    const extra = {
      referenceId: referenceId || null,
      screenshot: screenshotPath,
      userNotes: notes || null
    };

    const insert = await pool.request()
      .input('LeaseID', sql.Int, Number(leaseId))
      .input('PaymentDate', sql.DateTime, paymentDate ? new Date(paymentDate) : new Date())
      .input('Amount', sql.Decimal(12, 2), Number(amount))
      .input('PaymentMethod', sql.NVarChar(50), paymentMethod || 'Manual')
      .input('PaymentStatus', sql.NVarChar(20), 'Pending')
      .input('InvoiceNumber', sql.NVarChar(100), referenceId || null)
      .input('Notes', sql.NVarChar(255), JSON.stringify(extra))
      .query(`
        INSERT INTO dbo.Payments (LeaseID, PaymentDate, Amount, PaymentMethod, PaymentStatus, InvoiceNumber, Notes)
        OUTPUT INSERTED.*
        VALUES (@LeaseID, @PaymentDate, @Amount, @PaymentMethod, @PaymentStatus, @InvoiceNumber, @Notes)
      `);

    // Notify landlord and admins
    const payment = insert.recordset[0];
    await pool.request()
      .input('PropertyID', sql.Int, lease.PropertyID)
      .query('SELECT LandlordID FROM dbo.Properties WHERE PropertyID = @PropertyID');

    const landlordId = (await pool.request().input('PropertyID', sql.Int, lease.PropertyID)
      .query('SELECT TOP 1 LandlordID FROM dbo.Properties WHERE PropertyID = @PropertyID')).recordset[0]?.LandlordID;

    const admins = await pool.request().query(`SELECT u.UserID FROM dbo.Users u INNER JOIN dbo.Roles r ON r.RoleID = u.RoleID WHERE r.RoleName = 'Admin'`);

    const notify = async (userId, type, message) => {
      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('Type', sql.NVarChar(50), type)
        .input('Message', sql.NVarChar(255), message)
        .query("INSERT INTO dbo.Notifications (UserID, Type, Message, IsRead, CreatedAt) VALUES (@UserID, @Type, @Message, 0, GETDATE())");
    };

    if (landlordId) {
      await notify(landlordId, 'PaymentSubmitted', `Payment submitted for Lease #${lease.LeaseID} amount ${payment.Amount}`);
    }
    for (const a of admins.recordset) {
      await notify(a.UserID, 'PaymentSubmitted', `Payment submitted for Lease #${lease.LeaseID} amount ${payment.Amount}`);
    }

    res.status(201).json({ success: true, payment });
  } catch (err) {
    console.error('Error submitting manual payment:', err);
    res.status(500).json({ message: 'Server error submitting payment' });
  }
});

// List payments - role filtered, optional status, tenant, landlord scopes
router.get('/', auth, async (req, res) => {
  try {
    const role = getRole(req);
    const userId = Number(req.user?.id);
    const { status, tenantId, propertyId, leaseId } = req.query;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '20', 10)));
    const offset = (page - 1) * pageSize;

    const pool = await poolPromise;
    const request = pool.request()
      .input('Status', sql.NVarChar(20), status || null)
      .input('TenantID', sql.Int, tenantId ? Number(tenantId) : null)
      .input('PropertyID', sql.Int, propertyId ? Number(propertyId) : null)
      .input('LeaseID', sql.Int, leaseId ? Number(leaseId) : null)
      .input('UserID', sql.Int, userId);

    let where = 'WHERE 1=1';
    if (status) where += ' AND p.PaymentStatus = @Status';
    if (leaseId) where += ' AND p.LeaseID = @LeaseID';

    // Join tables for filtering and display
    let base = `
      SELECT p.*, l.PropertyID, u.Name AS TenantName, pr.Title AS PropertyTitle
      FROM dbo.Payments p
      INNER JOIN dbo.LeaseAgreements l ON l.LeaseID = p.LeaseID
      INNER JOIN dbo.Users u ON u.UserID = l.TenantID
      INNER JOIN dbo.Properties pr ON pr.PropertyID = l.PropertyID
    `;

    if (role === 'tenant') {
      where += ' AND u.UserID = @UserID';
    } else if (role === 'landlord') {
      where += ' AND pr.LandlordID = @UserID';
    }

    const countQuery = `SELECT COUNT(1) as total FROM (${base} ${where}) as X`;
    const dataQuery = `${base} ${where} ORDER BY p.PaymentDate DESC OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
    const [countRes, dataRes] = await Promise.all([
      request.query(countQuery),
      request.query(dataQuery)
    ]);
    res.json({ items: dataRes.recordset, total: countRes.recordset[0]?.total || 0, page, pageSize });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ message: 'Server error fetching payments' });
  }
});

// Update payment status (Admin/Landlord)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const role = getRole(req);
    const userId = Number(req.user?.id);
    if (!['admin', 'landlord'].includes(role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const id = Number(req.params.id);
    const { status, notes } = req.body; // status: Pending | Paid | Rejected
    if (!status || !['Pending', 'Paid', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const pool = await poolPromise;

    // Landlord can only update payments for their properties
    const paymentRes = await pool.request()
      .input('PaymentID', sql.Int, id)
      .query(`
        SELECT TOP 1 p.*, pr.LandlordID, l.TenantID
        FROM dbo.Payments p
        INNER JOIN dbo.LeaseAgreements l ON l.LeaseID = p.LeaseID
        INNER JOIN dbo.Properties pr ON pr.PropertyID = l.PropertyID
        WHERE p.PaymentID = @PaymentID
      `);
    if (paymentRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    const rec = paymentRes.recordset[0];
    if (role === 'landlord' && String(rec.LandlordID) !== String(userId)) {
      return res.status(403).json({ message: 'Not authorized to update this payment' });
    }

    const update = await pool.request()
      .input('PaymentID', sql.Int, id)
      .input('PaymentStatus', sql.NVarChar(20), status)
      .input('Notes', sql.NVarChar(255), notes || rec.Notes)
      .query(`UPDATE dbo.Payments SET PaymentStatus = @PaymentStatus, Notes = @Notes WHERE PaymentID = @PaymentID`);

    // Notify tenant
    await pool.request()
      .input('UserID', sql.Int, rec.TenantID)
      .input('Type', sql.NVarChar(50), 'PaymentStatus')
      .input('Message', sql.NVarChar(255), `Your payment #${rec.PaymentID} marked as ${status}`)
      .query('INSERT INTO dbo.Notifications (UserID, Type, Message, IsRead, CreatedAt) VALUES (@UserID, @Type, @Message, 0, GETDATE())');

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating payment status:', err);
    res.status(500).json({ message: 'Server error updating payment status' });
  }
});

module.exports = router;
