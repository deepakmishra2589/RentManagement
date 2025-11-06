const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const PropertyType = require('../models/PropertyType');
const { auth } = require('../middleware/auth');

// @route   GET api/property-types
// @desc    Get all property types
// @access  Public
router.get('/', async (req, res) => {
  try {
    const propertyTypes = await PropertyType.getAll();
    res.json(propertyTypes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/property-types/:id
// @desc    Get property type by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const propertyType = await PropertyType.getById(req.params.id);
    
    if (!propertyType) {
      return res.status(404).json({ msg: 'Property type not found' });
    }
    
    res.json(propertyType);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'Number' || err.kind === 'int') {
      return res.status(400).json({ msg: 'Invalid property type ID' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/property-types
// @desc    Create a property type
// @access  Private/Admin
router.post(
  '/',
  auth,
  [
    check('typeName', 'Type name is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newPropertyType = await PropertyType.create({
        typeName: req.body.typeName,
        description: req.body.description
      });
      
      res.json(newPropertyType);
    } catch (err) {
      console.error(err.message);
      if (err.message.includes('duplicate key')) {
        return res.status(400).json({ errors: [{ msg: 'Property type with this name already exists' }] });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/property-types/:id
// @desc    Update a property type
// @access  Private/Admin
router.put(
  '/:id',
  auth,
  [
    check('typeName', 'Type name is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let propertyType = await PropertyType.getById(req.params.id);
      
      if (!propertyType) {
        return res.status(404).json({ msg: 'Property type not found' });
      }
      
      propertyType = await PropertyType.update(req.params.id, {
        typeName: req.body.typeName,
        description: req.body.description
      });
      
      res.json(propertyType);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'Number' || err.kind === 'int') {
        return res.status(400).json({ msg: 'Invalid property type ID' });
      }
      if (err.message.includes('duplicate key')) {
        return res.status(400).json({ errors: [{ msg: 'Property type with this name already exists' }] });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/property-types/:id
// @desc    Delete a property type
// @access  Private/Admin
router.delete('/:id', auth, async (req, res) => {
  try {
    const propertyType = await PropertyType.getById(req.params.id);
    
    if (!propertyType) {
      return res.status(404).json({ msg: 'Property type not found' });
    }
    
    await PropertyType.delete(req.params.id);
    
    res.json({ msg: 'Property type removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'Number' || err.kind === 'int') {
      return res.status(400).json({ msg: 'Invalid property type ID' });
    }
    if (err.message.includes('Cannot delete property type')) {
      return res.status(400).json({ errors: [{ msg: err.message }] });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
