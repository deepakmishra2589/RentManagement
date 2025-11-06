const express = require('express');
const { poolPromise, sql } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const getRole = (req) => (req.user?.role || req.user?.RoleName || '').toString().toLowerCase();

async function ensureTables(pool) {
  // Create LeaseRenewals table if missing
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LeaseRenewals]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[LeaseRenewals](
        [RenewalID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [LeaseID] INT NOT NULL,
        [ProposedByUserID] INT NOT NULL,
        [ProposedAt] DATETIME NOT NULL DEFAULT(GETDATE()),
        [NewMonthlyRent] DECIMAL(12,2) NULL,
        [NewEndDate] DATE NULL,
        [Notes] NVARCHAR(255) NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT('Proposed'), -- Proposed, Accepted, Rejected, Cancelled
        [DecisionAt] DATETIME NULL,
        [DecisionByUserID] INT NULL
      );
    END
  `);
}

// Propose a renewal (Admin or Landlord)
router.post('/propose', auth, async (req, res) => {
  try {
    const role = getRole(req);
    if (!['admin', 'landlord'].includes(role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { leaseId, newMonthlyRent, newEndDate, notes } = req.body;
    if (!leaseId) return res.status(400).json({ message: 'leaseId is required' });

    const pool = await poolPromise;
    await ensureTables(pool);

    // Load lease and ensure ownership for landlord
    const leaseRes = await pool.request().input('LeaseID', sql.Int, Number(leaseId))
      .query(`SELECT la.*, p.LandlordID FROM dbo.LeaseAgreements la INNER JOIN dbo.Properties p ON p.PropertyID = la.PropertyID WHERE la.LeaseID = @LeaseID`);
    if (leaseRes.recordset.length === 0) return res.status(404).json({ message: 'Lease not found' });
    const lease = leaseRes.recordset[0];
    if (role === 'landlord' && String(lease.LandlordID) !== String(req.user?.id)) {
      return res.status(403).json({ message: 'Not authorized for this lease' });
    }

    const insert = await pool.request()
      .input('LeaseID', sql.Int, Number(leaseId))
      .input('ProposedByUserID', sql.Int, Number(req.user?.id))
      .input('NewMonthlyRent', sql.Decimal(12,2), newMonthlyRent != null ? Number(newMonthlyRent) : null)
      .input('NewEndDate', sql.Date, newEndDate || null)
      .input('Notes', sql.NVarChar(255), notes || null)
      .query(`INSERT INTO dbo.LeaseRenewals (LeaseID, ProposedByUserID, NewMonthlyRent, NewEndDate, Notes, Status) OUTPUT INSERTED.*
              VALUES (@LeaseID, @ProposedByUserID, @NewMonthlyRent, @NewEndDate, @Notes, 'Proposed')`);

    res.status(201).json({ success: true, renewal: insert.recordset[0] });
  } catch (err) {
    console.error('Error proposing renewal:', err);
    res.status(500).json({ message: 'Server error proposing renewal' });
  }
});

// List renewals (role filtered)
router.get('/', auth, async (req, res) => {
  try {
    const role = getRole(req);
    const userId = Number(req.user?.id);
    const pool = await poolPromise;
    await ensureTables(pool);

    let where = 'WHERE 1=1';
    if (role === 'tenant') where += ` AND la.TenantID = @UserID`;
    if (role === 'landlord') where += ` AND p.LandlordID = @UserID`;

    const result = await pool.request().input('UserID', sql.Int, userId).query(`
      SELECT r.*, la.PropertyID, la.TenantID, la.MonthlyRent, p.Title AS PropertyTitle
      FROM dbo.LeaseRenewals r
      INNER JOIN dbo.LeaseAgreements la ON la.LeaseID = r.LeaseID
      INNER JOIN dbo.Properties p ON p.PropertyID = la.PropertyID
      ${where}
      ORDER BY r.ProposedAt DESC
    `);

    res.json({ items: result.recordset });
  } catch (err) {
    console.error('Error listing renewals:', err);
    res.status(500).json({ message: 'Server error listing renewals' });
  }
});

// Shared handler for accept/reject
async function handleDecision(req, res, action) {
  try {
    const role = getRole(req);
    if (role !== 'tenant') return res.status(403).json({ message: 'Only tenants can decide renewals' });

    const id = Number(req.params.id);
    const userId = Number(req.user?.id);

    const pool = await poolPromise;
    await ensureTables(pool);

    const renRes = await pool.request().input('RenewalID', sql.Int, id).query(`
      SELECT r.*, la.PropertyID, la.TenantID, la.EndDate, la.MonthlyRent, la.LeaseID
      FROM dbo.LeaseRenewals r
      INNER JOIN dbo.LeaseAgreements la ON la.LeaseID = r.LeaseID
      WHERE r.RenewalID = @RenewalID
    `);
    if (renRes.recordset.length === 0) return res.status(404).json({ message: 'Renewal not found' });
    const ren = renRes.recordset[0];
    if (String(ren.TenantID) !== String(userId)) return res.status(403).json({ message: 'Not authorized' });
    if (ren.Status !== 'Proposed') return res.status(400).json({ message: 'Renewal is not in Proposed state' });

    if (action === 'reject') {
      await pool.request().input('RenewalID', sql.Int, id).input('UserID', sql.Int, userId)
        .query(`UPDATE dbo.LeaseRenewals SET Status = 'Rejected', DecisionAt = GETDATE(), DecisionByUserID = @UserID WHERE RenewalID = @RenewalID`);
      return res.json({ success: true });
    }

    // Accept -> create new lease and complete old
    const transaction = new sql.Transaction(await poolPromise);
    await transaction.begin();
    try {
      await transaction.request().input('LeaseID', sql.Int, ren.LeaseID).query(`UPDATE dbo.LeaseAgreements SET Status='Completed', EndDate = ISNULL(EndDate, GETDATE()) WHERE LeaseID = @LeaseID`);

      const startDate = ren.EndDate ? ren.EndDate : new Date();
      const newLease = await transaction.request()
        .input('PropertyID', sql.Int, ren.PropertyID)
        .input('TenantID', sql.Int, ren.TenantID)
        .input('StartDate', sql.Date, startDate)
        .input('EndDate', sql.Date, ren.NewEndDate || null)
        .input('MonthlyRent', sql.Decimal(12,2), ren.NewMonthlyRent != null ? Number(ren.NewMonthlyRent) : ren.MonthlyRent)
        .query(`
          INSERT INTO dbo.LeaseAgreements (PropertyID, TenantID, StartDate, EndDate, MonthlyRent, Status, CreatedAt)
          OUTPUT INSERTED.*
          VALUES (@PropertyID, @TenantID, @StartDate, @EndDate, @MonthlyRent, 'Active', GETDATE())
        `);

      await transaction.request().input('RenewalID', sql.Int, id).input('UserID', sql.Int, userId)
        .query(`UPDATE dbo.LeaseRenewals SET Status = 'Accepted', DecisionAt = GETDATE(), DecisionByUserID = @UserID WHERE RenewalID = @RenewalID`);

      await transaction.commit();
      return res.json({ success: true, newLease: newLease.recordset[0] });
    } catch (e) {
      try { await transaction.rollback(); } catch(_) {}
      throw e;
    }
  } catch (err) {
    console.error('Error deciding renewal:', err);
    return res.status(500).json({ message: 'Server error deciding renewal' });
  }
}

// Accept or reject by Tenant (explicit routes)
router.put('/:id/accept', auth, (req, res) => handleDecision(req, res, 'accept'));
router.put('/:id/reject', auth, (req, res) => handleDecision(req, res, 'reject'));

module.exports = router;
