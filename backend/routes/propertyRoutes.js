const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Property = require('../models/Property');
const { poolPromise, sql } = require('../config/db');

// @route   GET /api/properties/types
// @desc    Get all property types
// @access  Public
router.get('/types', async (req, res) => {
  try {
    const propertyTypes = await Property.getPropertyTypes();
    res.json(propertyTypes);
  } catch (err) {
    console.error('Error getting property types:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/properties
// @desc    Get all properties with optional filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { type, city, minRent, maxRent, status } = req.query;
    let properties = await Property.getAll();
    
    // Apply filters if provided
    if (type) {
      properties = properties.filter(p => p.propertyTypeName === type);
    }
    if (city) {
      properties = properties.filter(p => p.City.toLowerCase().includes(city.toLowerCase()));
    }
    if (minRent) {
      properties = properties.filter(p => p.BaseRentAmount >= parseFloat(minRent));
    }
    if (maxRent) {
      properties = properties.filter(p => p.BaseRentAmount <= parseFloat(maxRent));
    }
    if (status) {
      properties = properties.filter(p => p.Status.toLowerCase() === status.toLowerCase());
    }
    
    res.json(properties);
  } catch (err) {
    console.error('Error getting properties:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/properties/landlord/:landlordId
// @desc    Get properties by landlord ID
// @access  Private
router.get('/landlord/:landlordId', auth, async (req, res) => {
  try {
    // Only allow admins or the landlord themselves to view their properties
    if (req.user.role !== 'Admin' && req.user.id !== parseInt(req.params.landlordId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const properties = await Property.getByLandlordId(parseInt(req.params.landlordId));
    res.json(properties);
  } catch (err) {
    console.error('Error getting properties by landlord:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/properties/:id
// @desc    Get property by ID with details
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.getById(parseInt(req.params.id));
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    res.json(property);
  } catch (err) {
    console.error('Error getting property:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/properties
// @desc    Create a new property (Landlord only)
// @access  Private/Landlord
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty().trim().escape(),
      check('propertyTypeId', 'Property type is required').isInt(),
      check('address', 'Address is required').not().isEmpty().trim().escape(),
      check('city', 'City is required').not().isEmpty().trim().escape(),
      check('baseRentAmount', 'Valid base rent amount is required').isDecimal({ min: 0 }),
      check('status', 'Status must be either Vacant or Occupied').optional().isIn(['Vacant', 'Occupied']),
      // Common details validation
      check('details').optional().isObject()
    ]
  ],
  async (req, res) => {
    // Check if user is a landlord or admin
    if (req.user.role !== 'Landlord' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only landlords can add properties' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Get property type name if not provided
      let propertyData = { ...req.body };
      propertyData.landlordId = req.user.role === 'Admin' && req.body.landlordId ? req.body.landlordId : req.user.id;
      
      // If propertyType is not provided but propertyTypeId is, fetch the type name
      if (!propertyData.propertyType && propertyData.propertyTypeId) {
        const pool = await require('../config/connection').poolPromise;
        const typeResult = await pool.request()
          .input('propertyTypeId', require('mssql').Int, propertyData.propertyTypeId)
          .query('SELECT TypeName FROM PropertyTypes WHERE PropertyTypeID = @propertyTypeId');
          
        if (typeResult.recordset.length > 0) {
          propertyData.propertyType = typeResult.recordset[0].TypeName;
        }
      }
      
      // Create new property
      const newProperty = await Property.create(propertyData);

      res.status(201).json(newProperty);
    } catch (err) {
      console.error('Error creating property:', err);
      res.status(500).json({ 
        message: 'Error creating property',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
);

// @route   PUT /api/properties/:id
// @desc    Update a property
// @access  Private/Landlord & Admin
router.put(
  '/:id',
  [
    auth,
    [
      check('title', 'Title is required').optional().not().isEmpty().trim().escape(),
      check('address', 'Address is required').optional().not().isEmpty().trim().escape(),
      check('city', 'City is required').optional().not().isEmpty().trim().escape(),
      check('baseRentAmount', 'Valid base rent amount is required').optional().isDecimal({ min: 0 }),
      check('status', 'Status must be either Vacant or Occupied').optional().isIn(['Vacant', 'Occupied']),
      check('details').optional().isObject()
    ]
  ],
  async (req, res) => {
    try {
      const property = await Property.getById(parseInt(req.params.id));

      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      // Only allow landlord who owns the property or admin to update
      if (property.LandlordID !== req.user.id && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not authorized to update this property' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Update property
      const updatedProperty = await Property.update(parseInt(req.params.id), {
        ...req.body,
        // Only allow admin to change the landlord
        landlordId: req.user.role === 'Admin' && req.body.landlordId 
          ? req.body.landlordId 
          : property.LandlordID
      });
      
      res.json(updatedProperty);
    } catch (err) {
      console.error('Error updating property:', err);
      res.status(500).json({ 
        message: 'Error updating property',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
);

// @route   DELETE /api/properties/:id
// @desc    Delete a property
// @access  Private/Landlord or Admin
router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.getById(parseInt(req.params.id));
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Only allow landlord who owns the property or admin to delete
    if (property.LandlordID !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to delete this property' });
    }

    await Property.delete(parseInt(req.params.id));
    res.json({ message: 'Property removed successfully' });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ 
      message: 'Error deleting property',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// @route   GET /api/properties/:id/leases
// @desc    Get all leases for a property
// @access  Private
router.get('/:id/leases', auth, async (req, res) => {
  try {
    const property = await Property.getById(parseInt(req.params.id));
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Only allow landlord who owns the property, admin, or tenants with active leases
    const role = (req.user?.role || '').toString().toLowerCase();
    const isAdmin = role === 'admin';
    const isOwner = String(property.LandlordID) === String(req.user?.id);
    if (!isOwner && !isAdmin) {
      // Check if user is a tenant with an active lease for this property
      const pool = await poolPromise;
      const leaseCheck = await pool.request()
        .input('propertyId', sql.Int, req.params.id)
        .input('tenantId', sql.Int, req.user.id)
        .query(`
          SELECT 1 FROM LeaseAgreements 
          WHERE PropertyID = @propertyId 
          AND TenantID = @tenantId 
          AND Status = 'Active'
          AND GETDATE() BETWEEN StartDate AND ISNULL(EndDate, '9999-12-31')
        `);
      
      if (leaseCheck.recordset.length === 0) {
        return res.status(403).json({ message: 'Not authorized to view leases for this property' });
      }
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('propertyId', sql.Int, req.params.id)
      .query(`
        SELECT 
          l.*,
          u.Name as tenantName,
          u.Email as tenantEmail
        FROM LeaseAgreements l
        JOIN Users u ON l.TenantID = u.UserID
        WHERE l.PropertyID = @propertyId
        ORDER BY l.StartDate DESC
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error getting property leases:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV !== 'production' ? (err?.originalError?.info?.message || err.message) : undefined
    });
  }
});

// @route   GET /api/properties/:id/documents
// @desc    Get all documents for a property
// @access  Private
router.get('/:id/documents', auth, async (req, res) => {
  try {
    const property = await Property.getById(parseInt(req.params.id));
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Only allow landlord who owns the property, admin, or tenants with active leases
    if (property.LandlordID !== req.user.id && req.user.role !== 'Admin') {
      // Check if user is a tenant with an active lease for this property
      const pool = await poolPromise;
      const leaseCheck = await pool.request()
        .input('propertyId', sql.Int, req.params.id)
        .input('tenantId', sql.Int, req.user.id)
        .query(`
          SELECT 1 FROM LeaseAgreements 
          WHERE PropertyID = @propertyId 
          AND TenantID = @tenantId 
          AND Status = 'Active'
          AND GETDATE() BETWEEN StartDate AND ISNULL(EndDate, '9999-12-31')
        `);
      
      if (leaseCheck.recordset.length === 0) {
        return res.status(403).json({ message: 'Not authorized to view documents for this property' });
      }
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('propertyId', sql.Int, req.params.id)
      .query(`
        SELECT d.*, l.LeaseID, l.StartDate, l.EndDate
        FROM Documents d
        JOIN LeaseAgreements l ON d.LeaseID = l.LeaseID
        WHERE l.PropertyID = @propertyId
        ORDER BY d.UploadedAt DESC
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error getting property documents:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV !== 'production' ? (err?.originalError?.info?.message || err.message) : undefined
    });
  }
});

// @route   GET /api/properties/:id/maintenance-requests
// @desc    Get maintenance requests for a property
// @access  Private
router.get('/:id/maintenance-requests', auth, async (req, res) => {
  try {
    const property = await Property.getById(parseInt(req.params.id));
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Only allow landlord who owns the property, admin, or the tenant who created the request
    if (property.LandlordID !== req.user.id && req.user.role !== 'Admin') {
      // For tenants, only show their own requests
      const pool = await poolPromise;
      const result = await pool.request()
        .input('propertyId', sql.Int, req.params.id)
        .input('tenantId', sql.Int, req.user.id)
        .query(`
          SELECT mr.*, 
                 p.Title as propertyTitle,
                 u.Name as tenantName,
                 u.Email as tenantEmail,
                 u.Phone as tenantPhone
          FROM MaintenanceRequests mr
          JOIN Properties p ON mr.PropertyID = p.PropertyID
          JOIN Users u ON mr.TenantID = u.UserID
          WHERE mr.PropertyID = @propertyId
          AND mr.TenantID = @tenantId
          ORDER BY mr.CreatedAt DESC
        `);
      
      return res.json(result.recordset);
    }

    // For landlord/admin, show all requests for the property
    const pool = await poolPromise;
    const result = await pool.request()
      .input('propertyId', sql.Int, req.params.id)
      .query(`
        SELECT mr.*, 
               p.Title as propertyTitle,
               u.Name as tenantName,
               u.Email as tenantEmail,
               u.Phone as tenantPhone
        FROM MaintenanceRequests mr
        JOIN Properties p ON mr.PropertyID = p.PropertyID
        JOIN Users u ON mr.TenantID = u.UserID
        WHERE mr.PropertyID = @propertyId
        ORDER BY 
          CASE WHEN mr.Status = 'Pending' THEN 0 ELSE 1 END,
          mr.CreatedAt DESC
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error getting maintenance requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
