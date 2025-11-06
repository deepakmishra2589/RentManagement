const express = require('express');
const { poolPromise, sql } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const getRole = (req) => (req.user?.role || req.user?.RoleName || '').toString().toLowerCase();

// Rent roll: active leases with tenant, property, rent
router.get('/rent-roll', auth, async (req, res) => {
  try {
    const role = getRole(req);
    const userId = Number(req.user?.id);
    const pool = await poolPromise;
    const request = pool.request().input('UserID', sql.Int, userId);

    let where = "WHERE la.Status = 'Active'";
    if (role === 'tenant') where += ' AND la.TenantID = @UserID';
    if (role === 'landlord') where += ' AND p.LandlordID = @UserID';

    const result = await request.query(`
      SELECT la.LeaseID, la.PropertyID, la.TenantID, la.MonthlyRent, la.StartDate, la.EndDate,
             u.Name AS TenantName, u.Email AS TenantEmail,
             p.Title AS PropertyTitle, p.Address, p.City
      FROM dbo.LeaseAgreements la
      INNER JOIN dbo.Users u ON u.UserID = la.TenantID
      INNER JOIN dbo.Properties p ON p.PropertyID = la.PropertyID
      ${where}
      ORDER BY p.Title, u.Name
    `);
    res.json({ items: result.recordset });
  } catch (err) {
    console.error('Error generating rent roll:', err);
    res.status(500).json({ message: 'Server error generating rent roll' });
  }
});

// Upcoming expiries within N days (default 30)
router.get('/expiries-upcoming', auth, async (req, res) => {
  try {
    const role = getRole(req);
    const userId = Number(req.user?.id);
    const days = Math.max(1, parseInt(req.query.days || '30', 10));
    const pool = await poolPromise;
    const request = pool.request().input('UserID', sql.Int, userId).input('Days', sql.Int, days);

    let where = "WHERE la.Status = 'Active' AND la.EndDate IS NOT NULL AND la.EndDate <= DATEADD(day, @Days, CAST(GETDATE() as date))";
    if (role === 'tenant') where += ' AND la.TenantID = @UserID';
    if (role === 'landlord') where += ' AND p.LandlordID = @UserID';

    const result = await request.query(`
      SELECT la.LeaseID, la.PropertyID, la.TenantID, la.EndDate,
             u.Name AS TenantName,
             p.Title AS PropertyTitle, p.Address
      FROM dbo.LeaseAgreements la
      INNER JOIN dbo.Users u ON u.UserID = la.TenantID
      INNER JOIN dbo.Properties p ON p.PropertyID = la.PropertyID
      ${where}
      ORDER BY la.EndDate ASC
    `);
    res.json({ items: result.recordset, days });
  } catch (err) {
    console.error('Error fetching upcoming expiries:', err);
    res.status(500).json({ message: 'Server error fetching expiries' });
  }
});

// Maintenance KPIs: open, in progress, completed counts (role scoped)
router.get('/maintenance-kpis', auth, async (req, res) => {
  try {
    const role = getRole(req);
    const userId = Number(req.user?.id);
    const pool = await poolPromise;
    const request = pool.request().input('UserID', sql.Int, userId);

    let where = 'WHERE 1=1';
    if (role === 'tenant') where += ' AND mr.TenantID = @UserID';
    if (role === 'landlord') where += ' AND p.LandlordID = @UserID';

    const result = await request.query(`
      SELECT 
        SUM(CASE WHEN mr.Status = 'Pending' THEN 1 ELSE 0 END) as Pending,
        SUM(CASE WHEN mr.Status = 'In Progress' THEN 1 ELSE 0 END) as InProgress,
        SUM(CASE WHEN mr.Status = 'Completed' THEN 1 ELSE 0 END) as Completed
      FROM dbo.MaintenanceRequests mr
      INNER JOIN dbo.Properties p ON p.PropertyID = mr.PropertyID
      ${where}
    `);
    res.json({ kpis: result.recordset[0] || { Pending: 0, InProgress: 0, Completed: 0 } });
  } catch (err) {
    console.error('Error generating maintenance KPIs:', err);
    res.status(500).json({ message: 'Server error generating KPIs' });
  }
});

module.exports = router;
