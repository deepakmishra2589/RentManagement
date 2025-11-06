const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');

// GET /api/notifications
// Returns notifications for the authenticated user.
// Admins can get all with ?scope=all; otherwise defaults to current user.
router.get('/', auth, async (req, res) => {
  try {
    const scope = (req.query.scope || 'me').toLowerCase();
    const pool = await poolPromise;

    let query = `
      SELECT TOP 400 
        N.NotificationID,
        N.UserID,
        U.Name AS UserName,
        U.Email AS UserEmail,
        N.Type,
        N.Message,
        N.IsRead,
        N.CreatedAt
      FROM dbo.Notifications N
      INNER JOIN dbo.Users U ON U.UserID = N.UserID
      WHERE 1 = 1
    `;

    const request = pool.request();

    // Admins can view all; others see only their own notifications
    const isAdmin = req.user && (req.user.role === 'Admin' || req.user.RoleName === 'Admin');
    if (scope === 'all' && isAdmin) {
      // no additional filter
    } else if (scope === 'owned' && (isAdmin || (req.user && (req.user.role === 'Landlord' || req.user.RoleName === 'Landlord')))) {
      // We'll fetch broader set and filter after enrichment below
      // Do not restrict by N.UserID here
    } else {
      query += ` AND N.UserID = @userId`;
      request.input('userId', sql.Int, parseInt(req.user.id, 10));
    }

    // Optional filters: type, unread
    if (req.query.type) {
      query += ` AND N.Type = @type`;
      request.input('type', sql.NVarChar(50), req.query.type);
    }
    if (req.query.unread === 'true') {
      query += ` AND N.IsRead = 0`;
    }

    query += ` ORDER BY N.CreatedAt DESC, N.NotificationID DESC`;

    const result = await request.query(query);

    // Optionally enrich with property/lease/tenant details
    const wantDetails = (req.query.expand || '').toLowerCase() === 'details';
    if (wantDetails && result.recordset.length) {
      const rows = result.recordset;

      // Extract IDs from messages where present
      const leaseIds = new Set();
      const propertyIds = new Set();
      const tenantIds = new Set();

      rows.forEach(r => {
        if (r.Message) {
          const leaseMatch = r.Message.match(/Lease #(\d+)/i);
          if (leaseMatch) leaseIds.add(parseInt(leaseMatch[1], 10));
          const propMatch = r.Message.match(/Property #(\d+)/i);
          if (propMatch) propertyIds.add(parseInt(propMatch[1], 10));
        }
      });

      // Load leases and derive tenant and property IDs if needed
      let leasesById = {};
      if (leaseIds.size > 0) {
        const ids = Array.from(leaseIds).filter(Number.isFinite).join(',');
        if (ids) {
          const leaseRes = await pool.request().query(
            `SELECT LeaseID, PropertyID, TenantID, StartDate, EndDate FROM dbo.LeaseAgreements WHERE LeaseID IN (${ids})`
          );
          leaseRes.recordset.forEach(l => {
            leasesById[l.LeaseID] = l;
            if (l.PropertyID) propertyIds.add(l.PropertyID);
            if (l.TenantID) tenantIds.add(l.TenantID);
          });
        }
      }

      // Load properties
      let propertiesById = {};
      if (propertyIds.size > 0) {
        const ids = Array.from(propertyIds).filter(Number.isFinite).join(',');
        if (ids) {
          const propRes = await pool.request().query(
            `SELECT PropertyID, Title, Address, City, LandlordID FROM dbo.Properties WHERE PropertyID IN (${ids})`
          );
          propRes.recordset.forEach(p => { propertiesById[p.PropertyID] = p; });
        }
      }

      // Load tenant users (and include notification owners just in case)
      const userIds = new Set(rows.map(r => r.UserID));
      tenantIds.forEach(id => userIds.add(id));
      let usersById = {};
      if (userIds.size > 0) {
        const ids = Array.from(userIds).filter(Number.isFinite).join(',');
        if (ids) {
          const usrRes = await pool.request().query(
            `SELECT UserID, Name, Email, RoleID FROM dbo.Users WHERE UserID IN (${ids})`
          );
          usrRes.recordset.forEach(u => { usersById[u.UserID] = u; });
        }
      }

      let enriched = rows.map(r => {
        const leaseMatch = r.Message ? r.Message.match(/Lease #(\d+)/i) : null;
        const propMatch = r.Message ? r.Message.match(/Property #(\d+)/i) : null;
        const leaseId = leaseMatch ? parseInt(leaseMatch[1], 10) : undefined;
        const lease = leaseId ? leasesById[leaseId] : undefined;
        const propertyId = propMatch ? parseInt(propMatch[1], 10) : (lease ? lease.PropertyID : undefined);
        const property = propertyId ? propertiesById[propertyId] : undefined;
        const tenant = lease && lease.TenantID ? usersById[lease.TenantID] : undefined;

        return {
          ...r,
          LeaseID: leaseId || r.LeaseID || null,
          Lease: lease || null,
          PropertyID: propertyId || null,
          Property: property || null,
          Tenant: tenant || null
        };
      });

      // If landlord-owned scope requested, filter to owned properties or own notifications
      if (scope === 'owned' && (isAdmin || (req.user && (req.user.role === 'Landlord' || req.user.RoleName === 'Landlord')))) {
        const me = parseInt(req.user.id, 10);
        enriched = enriched.filter(r => r.UserID === me || (r.Property && r.Property.LandlordID === me));
      }

      return res.json({ success: true, count: enriched.length, notifications: enriched });
    }

    // Default response without enrichment
    res.json({ success: true, count: result.recordset.length, notifications: result.recordset });
  } catch (err) {
    console.error('[Notifications] Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read -> mark one as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const pool = await poolPromise;
    const request = pool.request();

    // Only owner or admin can mark read
    const isAdmin = req.user && (req.user.role === 'Admin' || req.user.RoleName === 'Admin');

    const updateQuery = `
      UPDATE N
      SET IsRead = 1
      FROM dbo.Notifications N
      WHERE N.NotificationID = @id
        AND (@isAdmin = 1 OR N.UserID = @userId)
    `;

    const result = await request
      .input('id', sql.Int, id)
      .input('userId', sql.Int, parseInt(req.user.id, 10))
      .input('isAdmin', sql.Bit, isAdmin ? 1 : 0)
      .query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Notifications] Error marking as read:', err);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

module.exports = router;
