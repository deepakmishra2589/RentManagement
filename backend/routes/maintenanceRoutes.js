const express = require('express');
const { poolPromise, sql } = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Helper: determine role
const getRole = (req) => (req.user?.role || req.user?.RoleName || '').toString();

// Multer for attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '..', 'uploads', 'maintenance');
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

async function ensureCommentsTable(pool) {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MaintenanceComments]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[MaintenanceComments](
        [CommentID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [RequestID] INT NOT NULL,
        [UserID] INT NOT NULL,
        [Comment] NVARCHAR(MAX) NULL,
        [AttachmentPath] NVARCHAR(255) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT(GETDATE())
      );
    END
  `);
}

// List maintenance requests based on role
router.get('/', auth, async (req, res) => {
  try {
    const role = getRole(req).toLowerCase();
    const userId = Number(req.user?.id);
    const pool = await poolPromise;

    const status = req.query.status || null;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '20', 10)));
    const offset = (page - 1) * pageSize;

    const request = pool.request()
      .input('UserID', sql.Int, userId)
      .input('Status', sql.NVarChar(20), status);

    let query = `
      SELECT mr.RequestID, mr.PropertyID, mr.TenantID, mr.Description, mr.Status, mr.CreatedAt, mr.ResolvedAt,
             p.Title AS PropertyTitle, p.Address, p.City,
             u.Name AS TenantName, u.Email AS TenantEmail, u.Phone AS TenantPhone
      FROM dbo.MaintenanceRequests mr
      INNER JOIN dbo.Properties p ON p.PropertyID = mr.PropertyID
      INNER JOIN dbo.Users u ON u.UserID = mr.TenantID
    `;

    let where = '';
    if (role === 'tenant') {
      where = ` WHERE mr.TenantID = @UserID`;
    } else if (role === 'landlord') {
      where = ` WHERE p.LandlordID = @UserID`;
    } else {
      where = ` WHERE 1=1`;
    }
    if (status) where += ` AND mr.Status = @Status`;

    const countQuery = `SELECT COUNT(1) as total FROM (${query} ${where}) X`;
    const dataQuery = `${query} ${where} ORDER BY mr.CreatedAt DESC OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
    const [countRes, dataRes] = await Promise.all([
      request.query(countQuery),
      request.query(dataQuery)
    ]);
    res.json({ items: dataRes.recordset, total: countRes.recordset[0]?.total || 0, page, pageSize });
  } catch (err) {
    console.error('Error fetching maintenance requests:', err);
    res.status(500).json({ message: 'Server error fetching maintenance requests' });
  }
});

// Create maintenance request (Tenant only)
router.post('/', auth, async (req, res) => {
  try {
    const role = getRole(req).toLowerCase();
    if (role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can create maintenance requests' });
    }

    const tenantId = Number(req.user?.id);
    const { propertyId, description } = req.body;
    if (!propertyId || !description) {
      return res.status(400).json({ message: 'propertyId and description are required' });
    }

    const pool = await poolPromise;

    // Ensure property exists and tenant has an active lease for it
    const leaseCheck = await pool.request()
      .input('TenantID', sql.Int, tenantId)
      .input('PropertyID', sql.Int, propertyId)
      .query(`
        SELECT TOP 1 LeaseID FROM dbo.LeaseAgreements 
        WHERE TenantID = @TenantID AND PropertyID = @PropertyID AND Status = 'Active'
      `);

    if (leaseCheck.recordset.length === 0) {
      return res.status(403).json({ message: 'You do not have an active lease for this property' });
    }

    const insert = await pool.request()
      .input('PropertyID', sql.Int, propertyId)
      .input('TenantID', sql.Int, tenantId)
      .input('Description', sql.NVarChar(sql.MAX), description)
      .query(`
        INSERT INTO dbo.MaintenanceRequests (PropertyID, TenantID, Description, Status, CreatedAt)
        OUTPUT INSERTED.*
        VALUES (@PropertyID, @TenantID, @Description, 'Pending', GETDATE())
      `);

    res.status(201).json({ success: true, request: insert.recordset[0] });
  } catch (err) {
    console.error('Error creating maintenance request:', err);
    res.status(500).json({ message: 'Server error creating maintenance request' });
  }
});

// Update status (Admin or Landlord - landlord must own property)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const role = getRole(req).toLowerCase();
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    const { status } = req.body; // 'Pending' | 'In Progress' | 'Completed'

    if (!['admin', 'landlord'].includes(role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (!status || !['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const pool = await poolPromise;

    // Load request and property
    const reqRes = await pool.request()
      .input('RequestID', sql.Int, id)
      .query(`SELECT TOP 1 mr.*, p.LandlordID FROM dbo.MaintenanceRequests mr INNER JOIN dbo.Properties p ON p.PropertyID = mr.PropertyID WHERE mr.RequestID = @RequestID`);
    if (reqRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }
    const record = reqRes.recordset[0];
    if (role === 'landlord' && String(record.LandlordID) !== String(userId)) {
      return res.status(403).json({ message: 'Not authorized to update this request' });
    }

    const update = await pool.request()
      .input('RequestID', sql.Int, id)
      .input('Status', sql.NVarChar(20), status)
      .query(`
        UPDATE dbo.MaintenanceRequests
        SET Status = @Status,
            ResolvedAt = CASE WHEN @Status = 'Completed' THEN GETDATE() ELSE ResolvedAt END
        WHERE RequestID = @RequestID
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating maintenance status:', err);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

// Reply to tenant (Admin or Landlord): creates a notification for the tenant
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const role = getRole(req).toLowerCase();
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    const { message } = req.body;

    if (!['admin', 'landlord'].includes(role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (!message) {
      return res.status(400).json({ message: 'message is required' });
    }

    const pool = await poolPromise;

    const reqRes = await pool.request()
      .input('RequestID', sql.Int, id)
      .query(`SELECT TOP 1 mr.*, p.LandlordID FROM dbo.MaintenanceRequests mr INNER JOIN dbo.Properties p ON p.PropertyID = mr.PropertyID WHERE mr.RequestID = @RequestID`);
    if (reqRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }
    const record = reqRes.recordset[0];
    if (role === 'landlord' && String(record.LandlordID) !== String(userId)) {
      return res.status(403).json({ message: 'Not authorized to reply to this request' });
    }

    await pool.request()
      .input('UserID', sql.Int, record.TenantID)
      .input('Type', sql.NVarChar(50), 'MaintenanceReply')
      .input('Message', sql.NVarChar(255), message)
      .query(`
        INSERT INTO dbo.Notifications (UserID, Type, Message, IsRead, CreatedAt)
        VALUES (@UserID, @Type, @Message, 0, GETDATE())
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error sending maintenance reply:', err);
    res.status(500).json({ message: 'Server error sending reply' });
  }
});

module.exports = router;

// Comments endpoints
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const pool = await poolPromise;
    await ensureCommentsTable(pool);
    const id = Number(req.params.id);
    const result = await pool.request().input('RequestID', sql.Int, id).query(`
      SELECT * FROM dbo.MaintenanceComments WHERE RequestID = @RequestID ORDER BY CreatedAt ASC
    `);
    res.json({ items: result.recordset });
  } catch (err) {
    console.error('Error fetching maintenance comments:', err);
    res.status(500).json({ message: 'Server error fetching comments' });
  }
});

router.post('/:id/comments', auth, upload.single('attachment'), async (req, res) => {
  try {
    const pool = await poolPromise;
    await ensureCommentsTable(pool);
    const id = Number(req.params.id);
    const userId = Number(req.user?.id);
    const { comment } = req.body;
    const attachment = req.file ? `/uploads/maintenance/${req.file.filename}` : null;

    const insert = await pool.request()
      .input('RequestID', sql.Int, id)
      .input('UserID', sql.Int, userId)
      .input('Comment', sql.NVarChar(sql.MAX), comment || null)
      .input('AttachmentPath', sql.NVarChar(255), attachment)
      .query(`
        INSERT INTO dbo.MaintenanceComments (RequestID, UserID, Comment, AttachmentPath)
        OUTPUT INSERTED.*
        VALUES (@RequestID, @UserID, @Comment, @AttachmentPath)
      `);
    res.status(201).json({ success: true, comment: insert.recordset[0] });
  } catch (err) {
    console.error('Error creating maintenance comment:', err);
    res.status(500).json({ message: 'Server error creating comment' });
  }
});
