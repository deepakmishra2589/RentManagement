const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/userModel');
const { auth } = require('../middleware/auth');
const { poolPromise, sql } = require('../config/db');

const router = express.Router();

const jwtConfig = require('../config/jwt');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Private/Admin (except bootstrap when no users exist yet)
router.post('/register', async (req, res) => {
  try {

    const { name, email, password, phone } = req.body;
    let { roleId } = req.body;
    // Default role to Tenant if not provided
    roleId = Number(roleId) || 3;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate role
    if (![1, 2, 3].includes(Number(roleId))) {
      return res.status(400).json({ message: 'Invalid role ID. Must be 1 (Admin), 2 (Landlord), or 3 (Tenant)' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    try {
      const { user } = await User.register({
        name,
        email,
        password,
        phone,
        roleId: Number(roleId)
      });

      res.status(201).json({
        success: true,
        user: {
          id: user.UserID,
          name: user.Name,
          email: user.Email,
          role: user.RoleName
        }
      });
    } catch (err) {
      console.error(err.message);
      if (err.message === 'User already exists') {
        return res.status(400).json({ success: false, message: err.message });
      }
      res.status(500).json({ success: false, message: 'Server error' });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const { user, token, refreshToken } = await User.login(email, password);

      res.json({
        success: true,
        token,
        refreshToken,
        user: {
          id: user.UserID,
          name: user.Name,
          email: user.Email,
          role: user.RoleName
        }
      });
    } catch (err) {
      console.error('Login error:', err.message);
      const isDeactivated = err?.message && err.message.toLowerCase().includes('deactivated');
      res.status(isDeactivated ? 403 : 401).json({ success: false, message: isDeactivated ? 'Account is deactivated' : 'Invalid credentials' });
    }
  }
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  console.log('=== /api/auth/me endpoint called ===');
  console.log('Request headers:', req.headers);
  console.log('Authenticated user from auth middleware:', req.user);
  
  if (!req.user || !req.user.id) {
    console.error('No user ID found in request');
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid user data',
      details: 'No user ID found in request'
    });
  }
  
  try {
    console.log(`Fetching user with ID: ${req.user.id}`);
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.error(`User not found in database for ID: ${req.user.id}`);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found',
        details: `No user found with ID: ${req.user.id}`
      });
    }
    
    console.log('User found in database:', {
      UserID: user.UserID,
      Email: user.Email,
      Name: user.Name,
      RoleID: user.RoleID,
      RoleName: user.RoleName
    });
    
    const userResponse = {
      id: user.UserID,
      name: user.Name || '',
      email: user.Email || '',
      phone: user.Phone || '',
      role: user.RoleName || null,
      roleId: user.RoleID || null
    };
    
    console.log('Sending user data:', userResponse);
    
    res.json({
      success: true,
      user: userResponse
    });
    
  } catch (err) {
    console.error('Error in /api/auth/me endpoint:', {
      message: err.message,
      stack: err.stack,
      userFromRequest: req.user,
      timestamp: new Date().toISOString()
    });
    
    // More detailed error response
    const errorResponse = {
      success: false,
      message: 'Server error while processing your request',
      error: {
        name: err.name,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && {
          stack: err.stack,
          details: {
            userRequest: {
              userId: req.user?.UserID,
              email: req.user?.Email
            },
            timestamp: new Date().toISOString()
          }
        })
      }
    };
    
    res.status(500).json(errorResponse);
  }
});

// @route   POST api/auth/refresh-token
// @desc    Refresh access token
// @access  Public
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const { token: newToken, refreshToken: newRefreshToken, user } = await User.refreshToken(refreshToken);
    
    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.UserID,
        name: user.Name,
        email: user.Email,
        role: user.RoleName
      }
    });
  } catch (err) {
    console.error('Refresh token error:', err.message);
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// Get all users (admin only)
router.get('/users', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admin can view users' });
    }

    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT u.UserID, u.Name, u.Email, u.Phone, u.CreatedAt, u.IsActive,
             r.RoleName, r.RoleID
      FROM Users u
      LEFT JOIN Roles r ON u.RoleID = r.RoleID
      ORDER BY u.CreatedAt DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admin can update user roles' });
    }

    const { roleId } = req.body;
    const userId = req.params.id;

    // Validate role
    if (roleId !== null && ![1, 2, 3].includes(Number(roleId))) {
      return res.status(400).json({ message: 'Invalid role ID' });
    }

    const pool = await poolPromise;
    
    // Check if user exists
    const userCheck = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Users WHERE UserID = @userId');

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user role
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('roleId', roleId === null ? sql.Int : sql.Int, roleId)
      .query('UPDATE Users SET RoleID = @roleId WHERE UserID = @userId');

    // Get updated user with role name
    const updatedUser = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT u.*, r.RoleName 
        FROM Users u
        LEFT JOIN Roles r ON u.RoleID = r.RoleID
        WHERE u.UserID = @userId
      `);

    res.json({
      success: true,
      user: updatedUser.recordset[0]
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

// Update user active status (admin only)
router.put('/users/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admin can update user status' });
    }

    const userId = req.params.id;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean' && ![0,1,'0','1'].includes(isActive)) {
      return res.status(400).json({ message: 'isActive must be boolean' });
    }

    const activeBit = (isActive === true || isActive === 1 || isActive === '1') ? 1 : 0;

    const pool = await poolPromise;

    // Ensure user exists
    const userCheck = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT UserID FROM Users WHERE UserID = @userId');
    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update status
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('active', sql.Bit, activeBit)
      .query('UPDATE Users SET IsActive = @active WHERE UserID = @userId');

    // Return updated row
    const updated = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT u.UserID, u.Name, u.Email, u.Phone, u.CreatedAt, u.IsActive,
               r.RoleName, r.RoleID
        FROM Users u
        LEFT JOIN Roles r ON u.RoleID = r.RoleID
        WHERE u.UserID = @userId
      `);

    res.json({ success: true, user: updated.recordset[0] });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
