const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { poolPromise, sql } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Multer storage for lease documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const leaseId = req.params.id || 'misc';
    const dest = path.join(__dirname, '..', 'uploads', 'leases', String(leaseId));
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

// Create a lease and mark property Occupied
router.post('/', auth, async (req, res) => {
  let transaction;
  try {
    const { propertyId, tenantId, rentAmount, securityAmount, startDate, endDate, leaseType } = req.body;

    if (!propertyId || !tenantId || !rentAmount || !startDate) {
      return res.status(400).json({ message: 'propertyId, tenantId, rentAmount and startDate are required' });
    }

    const pool = await poolPromise;

    // Ensure property exists and is vacant
    const propRes = await pool.request()
      .input('PropertyID', sql.Int, propertyId)
      .query('SELECT TOP 1 * FROM Properties WHERE PropertyID = @PropertyID');

    if (propRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if ((propRes.recordset[0].Status || '').toLowerCase() === 'occupied') {
      return res.status(409).json({ message: 'Property is already occupied' });
    }

    // Authorization: only Admin or the landlord who owns the property can assign a tenant
    const isAdmin = (req.user?.role || '').toString().toLowerCase() === 'admin';
    const ownerId = propRes.recordset[0].LandlordID;
    const requesterId = req.user?.id;
    const isOwner = String(requesterId) === String(ownerId);
    if (!isAdmin && !isOwner) {
      console.warn('Lease create forbidden:', { propertyId, ownerId, requesterId, requesterRole: req.user?.role });
      return res.status(403).json({
        message: 'Not authorized to assign a tenant for this property',
        details: process.env.NODE_ENV !== 'production' ? { propertyId, ownerId, requesterId } : undefined
      });
    }

    // Ensure tenant exists and is role Tenant (RoleID=3)
    const tenRes = await pool.request()
      .input('TenantID', sql.Int, tenantId)
      .query('SELECT TOP 1 * FROM Users WHERE UserID = @TenantID');
    if (tenRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Detect available columns on LeaseAgreements and build dynamic INSERT
    const colsResult = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LeaseAgreements'
    `);
    const available = new Set(colsResult.recordset.map(r => r.COLUMN_NAME));

    // Decide a safe AgreementType by inspecting CHECK constraint (if present)
    let agreementTypeVal = null;
    if (available.has('AgreementType')) {
      try {
        const chk = await pool.request().query(`
          SELECT cc.CHECK_CLAUSE
          FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE cu
          JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc ON cu.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
          WHERE cu.TABLE_NAME = 'LeaseAgreements' AND cu.COLUMN_NAME = 'AgreementType'
        `);
        const clause = chk.recordset[0]?.CHECK_CLAUSE || '';
        // Extract quoted strings as allowed values e.g., IN ('A','B') or ([AgreementType]='X' OR ...)
        const matches = [...clause.matchAll(/'(.*?)'/g)].map(m => m[1]).filter(Boolean);
        if (matches.length > 0) {
          // Prefer a value matching incoming leaseType if present
          const typeLower = (leaseType || '').toString().toLowerCase();
          const preferred = matches.find(v => v.toLowerCase() === typeLower);
          agreementTypeVal = preferred || matches[0];
        }
      } catch (_) {
        // Ignore parsing errors; will fall back to null
      }
    }

    // Candidate columns and values
    const candidates = [
      { name: 'PropertyID', param: 'PropertyID', type: sql.Int, value: propertyId },
      { name: 'TenantID', param: 'TenantID', type: sql.Int, value: tenantId },
      { name: 'StartDate', param: 'StartDate', type: sql.Date, value: startDate },
      { name: 'EndDate', param: 'EndDate', type: sql.Date, value: endDate ?? null },
      { name: 'MonthlyRent', param: 'MonthlyRentParam', type: sql.Decimal(12, 2), value: rentAmount },
      { name: 'RentAmount', param: 'RentAmountParam', type: sql.Decimal(12, 2), value: rentAmount },
      { name: 'DepositAmount', param: 'DepositAmountParam', type: sql.Decimal(12, 2), value: securityAmount ?? null },
      { name: 'SecurityAmount', param: 'SecurityAmountParam', type: sql.Decimal(12, 2), value: securityAmount ?? null },
      { name: 'AgreementType', param: 'AgreementTypeParam', type: sql.NVarChar(50), value: agreementTypeVal },
      { name: 'LeaseType', param: 'LeaseTypeParam', type: sql.NVarChar(50), value: leaseType || null },
      { name: 'Terms', param: 'TermsParam', type: sql.NVarChar(sql.MAX), value: null },
      { name: 'Status', literal: "'Active'" },
      { name: 'CreatedAt', literal: 'GETDATE()' },
      { name: 'CreatedOn', literal: 'GETDATE()' }
    ];

    const insertCols = [];
    const valueTokens = [];
    const request = transaction.request();

    const addedParams = new Set();
    for (const c of candidates) {
      if (!available.has(c.name)) continue;
      if (c.name === 'AgreementType' && (c.value === null || c.value === undefined || c.value === '')) {
        // Skip AgreementType if we couldn't determine an allowed value
        continue;
      }
      insertCols.push(c.name);
      if (c.literal) {
        valueTokens.push(c.literal);
      } else {
        let paramName = c.param;
        // Ensure unique param names even if two columns map to same value
        while (addedParams.has(paramName)) {
          paramName = paramName + '_x';
        }
        addedParams.add(paramName);
        valueTokens.push('@' + paramName);
        request.input(paramName, c.type, c.value);
      }
    }

    if (insertCols.length === 0) {
      throw new Error('LeaseAgreements table has no expected columns');
    }

    const insertSql = `INSERT INTO LeaseAgreements (${insertCols.join(', ')}) OUTPUT INSERTED.* VALUES (${valueTokens.join(', ')})`;
    const leaseInsert = await request.query(insertSql);

    const lease = leaseInsert.recordset[0];

    // Update property status
    await transaction.request()
      .input('PropertyID', sql.Int, propertyId)
      .query(`UPDATE Properties SET Status = 'Occupied' WHERE PropertyID = @PropertyID`);

    await transaction.commit();

    res.status(201).json({ success: true, lease });
  } catch (err) {
    console.error('Error creating lease:', err);
    try { if (transaction) await transaction.rollback(); } catch(_) {}
    res.status(500).json({
      message: 'Server error creating lease',
      error: err?.originalError?.info?.message || err.message
    });
  }
});

// End a lease and mark property Vacant
router.put('/:id/end', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { endDate } = req.body;

    const pool = await poolPromise;

    const leaseRes = await pool.request()
      .input('LeaseID', sql.Int, id)
      .query('SELECT TOP 1 * FROM LeaseAgreements WHERE LeaseID = @LeaseID');
    if (leaseRes.recordset.length === 0) {
      return res.status(404).json({ message: 'Lease not found' });
    }

    const lease = leaseRes.recordset[0];

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    await transaction.request()
      .input('LeaseID', sql.Int, id)
      .input('EndDate', sql.Date, endDate || new Date())
      .query(`UPDATE LeaseAgreements SET Status = 'Completed', EndDate = @EndDate WHERE LeaseID = @LeaseID`);

    await transaction.request()
      .input('PropertyID', sql.Int, lease.PropertyID)
      .query(`UPDATE Properties SET Status = 'Vacant' WHERE PropertyID = @PropertyID`);

    await transaction.commit();

    res.json({ success: true });
  } catch (err) {
    console.error('Error ending lease:', err);
    res.status(500).json({ message: 'Server error ending lease' });
  }
});

// Upload documents for a lease (Aadhar, LeaseAgreement, etc.)
router.post('/:id/documents', auth, upload.array('files', 10), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { documentType, fileType } = req.body; // optional; applies to all files

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const pool = await poolPromise;
    const typeValue = fileType || documentType || null;

    const insertPromises = req.files.map(f => {
      const relPath = `/uploads/leases/${id}/${f.filename}`;
      return pool.request()
        .input('LeaseID', sql.Int, id)
        .input('FilePath', sql.NVarChar(255), relPath)
        .input('FileType', sql.NVarChar(100), typeValue)
        .query(`
          INSERT INTO Documents (LeaseID, FilePath, FileType, UploadedAt)
          VALUES (@LeaseID, @FilePath, @FileType, GETDATE())
        `);
    });

    await Promise.all(insertPromises);

    res.status(201).json({ success: true, files: req.files.map(f => ({
      fileName: f.filename,
      path: `/uploads/leases/${id}/${f.filename}`,
      fileType: typeValue
    })) });
  } catch (err) {
    console.error('Error uploading lease documents:', err);
    res.status(500).json({ 
      message: 'Server error uploading documents',
      error: process.env.NODE_ENV !== 'production' ? (err?.originalError?.info?.message || err.message) : undefined
    });
  }
});

module.exports = router;
// Get current tenant's active lease with due info
router.get('/my-active', auth, async (req, res) => {
  try {
    const role = (req.user?.role || req.user?.RoleName || '').toString().toLowerCase();
    const tenantId = Number(req.user?.id);
    const daysAhead = Number.isFinite(Number(req.query.daysAhead)) ? Math.max(0, Number(req.query.daysAhead)) : 7;

    if (role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can access their active lease' });
    }

    const pool = await poolPromise;
    const request = pool.request()
      .input('TenantID', sql.Int, tenantId)
      .input('DaysAhead', sql.Int, daysAhead);

    const query = `
      DECLARE @today date = CAST(GETDATE() AS date);
      DECLARE @rangeEnd date = DATEADD(day, @DaysAhead, @today);

      WITH Active AS (
        SELECT TOP 1 la.*
        FROM dbo.LeaseAgreements la
        WHERE la.TenantID = @TenantID AND la.Status = 'Active'
        ORDER BY la.StartDate DESC
      ),
      LeaseWithDue AS (
        SELECT 
          a.LeaseID,
          a.PropertyID,
          a.TenantID,
          a.StartDate,
          a.EndDate,
          a.MonthlyRent,
          DATEADD(day,
            CASE 
              WHEN DAY(a.StartDate) > DAY(EOMONTH(@today)) THEN DAY(EOMONTH(@today)) - 1
              ELSE DAY(a.StartDate) - 1
            END,
            DATEFROMPARTS(YEAR(@today), MONTH(@today), 1)
          ) AS DueDateThisMonth
        FROM Active a
      ),
      NextDue AS (
        SELECT *,
          CASE WHEN DueDateThisMonth < @today THEN DATEADD(month, 1, DueDateThisMonth) ELSE DueDateThisMonth END AS NextDueDate
        FROM LeaseWithDue
      )
      SELECT 
        n.LeaseID,
        n.PropertyID,
        n.TenantID,
        n.StartDate,
        n.EndDate,
        n.MonthlyRent,
        CAST(n.NextDueDate AS date) AS NextDueDate,
        DATEDIFF(day, @today, n.NextDueDate) AS DaysUntilDue,
        CASE WHEN n.NextDueDate BETWEEN @today AND @rangeEnd THEN 1 ELSE 0 END AS DueSoon,
        CASE WHEN n.EndDate IS NOT NULL AND n.EndDate BETWEEN @today AND @rangeEnd THEN 1 ELSE 0 END AS ExpirySoon,
        p.Title AS PropertyTitle,
        p.Address,
        p.City,
        p.LandlordID
      FROM NextDue n
      INNER JOIN dbo.Properties p ON p.PropertyID = n.PropertyID;
    `;

    const result = await request.query(query);
    const lease = result.recordset[0] || null;
    res.json({ lease, daysAhead });
  } catch (err) {
    console.error('Error fetching my active lease:', err);
    res.status(500).json({ message: 'Server error fetching active lease' });
  }
});
