const express = require('express');
const { poolPromise, sql } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all tenants (RoleID = 3)
router.get('/tenants', auth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT UserID, Name, Email, Phone FROM Users WHERE RoleID = 3 ORDER BY Name`);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching tenants:', err);
    res.status(500).json({ message: 'Server error fetching tenants' });
  }
});

// Get tenants with active lease, property details, and next rent due info
router.get('/tenants/summary', auth, async (req, res) => {
  try {
    const { search = '', daysAhead } = req.query;
    const days = Number.isFinite(Number(daysAhead)) ? Math.max(0, Number(daysAhead)) : 7;

    const pool = await poolPromise;
    const isLandlord = ((req.user?.role || req.user?.RoleName || '').toString().toLowerCase() === 'landlord');
    const landlordId = req.user?.id ? Number(req.user.id) : null;

    const request = pool.request()
      .input('Search', sql.NVarChar(150), `%${search}%`)
      .input('DaysAhead', sql.Int, days)
      .input('IsLandlord', sql.Bit, isLandlord ? 1 : 0)
      .input('LandlordID', sql.Int, landlordId);

    const query = `
      DECLARE @today date = CAST(GETDATE() AS date);
      DECLARE @rangeEnd date = DATEADD(day, @DaysAhead, @today);

      WITH ActiveLeases AS (
        SELECT la.LeaseID, la.PropertyID, la.TenantID, la.StartDate, la.EndDate, la.MonthlyRent
        FROM dbo.LeaseAgreements la
        WHERE la.Status = 'Active'
      ),
      Tenants AS (
        SELECT u.UserID AS TenantID, u.Name, u.Email, u.Phone
        FROM dbo.Users u
        WHERE u.RoleID = 3
      ),
      LeaseWithDue AS (
        SELECT 
          al.LeaseID,
          al.PropertyID,
          al.TenantID,
          al.StartDate,
          al.EndDate,
          al.MonthlyRent,
          DAY(al.StartDate) AS DueDayInMonth,
          -- due date this month
          DATEADD(day,
            CASE 
              WHEN DAY(al.StartDate) > DAY(EOMONTH(@today)) THEN DAY(EOMONTH(@today)) - 1
              ELSE DAY(al.StartDate) - 1
            END,
            DATEFROMPARTS(YEAR(@today), MONTH(@today), 1)
          ) AS DueDateThisMonth
        FROM ActiveLeases al
        WHERE (al.EndDate IS NULL OR al.EndDate >= @today)
      ),
      LeaseNextDue AS (
        SELECT 
          lwd.*,
          CASE WHEN lwd.DueDateThisMonth < @today THEN DATEADD(month, 1, lwd.DueDateThisMonth) ELSE lwd.DueDateThisMonth END AS NextDueDate
        FROM LeaseWithDue lwd
      )
      SELECT 
        t.TenantID,
        t.Name,
        t.Email,
        t.Phone,
        l.LeaseID,
        p.PropertyID,
        p.Title AS PropertyTitle,
        p.Address,
        p.City,
        l.MonthlyRent,
        CAST(l.NextDueDate AS date) AS NextDueDate,
        CASE WHEN l.NextDueDate BETWEEN @today AND @rangeEnd THEN 1 ELSE 0 END AS DueSoon,
        DATEDIFF(day, @today, l.NextDueDate) AS DaysUntilDue
      FROM Tenants t
      INNER JOIN LeaseNextDue l ON l.TenantID = t.TenantID
      INNER JOIN Properties p ON p.PropertyID = l.PropertyID
      WHERE (
        @Search IS NULL OR @Search = ''
        OR t.Name LIKE @Search
        OR t.Email LIKE @Search
        OR t.Phone LIKE @Search
        OR p.Title LIKE @Search
        OR p.Address LIKE @Search
        OR p.City LIKE @Search
      )
      AND (
        @IsLandlord = 0 OR p.LandlordID = @LandlordID
      )
      ORDER BY 
        CASE WHEN l.NextDueDate BETWEEN @today AND @rangeEnd THEN 0 ELSE 1 END,
        t.Name;
    `;

    const result = await request.query(query);
    res.json({ items: result.recordset, daysAhead: days, count: result.recordset.length });
  } catch (err) {
    console.error('Error fetching tenant summary:', err);
    res.status(500).json({ message: 'Server error fetching tenant summary' });
  }
});

module.exports = router;
