const { poolPromise, sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

// Destructure JWT config with defaults to avoid undefined errors
const { 
  secret = 'fallback_secret_key',
  refreshSecret = 'fallback_refresh_secret',
  issuer = 'rent-management-api',
  audience = 'rent-management-client',
  expiresIn = '24h',
  refreshExpiresIn = '7d'
} = jwtConfig;

class User {
  static async create({ name, email, passwordHash, phone, roleId = null }) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.NVarChar(100), name)
      .input('email', sql.NVarChar(150), email)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .input('phone', sql.NVarChar(20), phone)
      .input('roleId', sql.Int, roleId)
      .query(`INSERT INTO Users (Name, Email, PasswordHash, Phone, RoleID)
              OUTPUT INSERTED.UserID
              VALUES (@name, @email, @passwordHash, @phone, @roleId)`);
    
    return result.recordset[0].UserID;
  }

  static async findByEmail(email) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar(150), email)
      .query('SELECT * FROM Users WHERE Email = @email');
    
    return result.recordset[0] || null;
  }

  static async findById(userId) {
    console.group(`[UserModel] findById(${userId})`);
    
    try {
      if (!userId) {
        const error = new Error('User ID is required');
        console.error('[UserModel] No user ID provided to findById');
        throw error;
      }
      
      console.log('Getting database connection...');
      const pool = await poolPromise;
      
      console.log('Preparing database request...');
      const request = pool.request();
      
      // Convert userId to integer to ensure proper type
      const userIdInt = parseInt(userId, 10);
      if (isNaN(userIdInt)) {
        const error = new Error(`Invalid user ID: ${userId}`);
        console.error('[UserModel]', error.message);
        throw error;
      }
      
      console.log('Setting input parameter userId:', userIdInt);
      request.input('userId', sql.Int, userIdInt);
      
      const query = `
        SELECT 
          u.UserID, u.Name, u.Email, u.Phone, u.RoleID, u.IsActive,
          r.RoleName 
        FROM Users u
        LEFT JOIN Roles r ON u.RoleID = r.RoleID
        WHERE u.UserID = @userId
      `;
      
      console.log('Executing query:', query.replace(/\s+/g, ' ').trim());
      
      const result = await request.query(query);
      
      console.log(`Query completed. Records returned: ${result.recordset.length}`);
      
      if (!result.recordset || result.recordset.length === 0) {
        console.warn(`[UserModel] No user found with ID: ${userIdInt}`);
        console.groupEnd();
        return null;
      }
      
      const user = result.recordset[0];
      console.log('User found:', {
        UserID: user.UserID,
        Name: user.Name,
        Email: user.Email,
        RoleID: user.RoleID,
        RoleName: user.RoleName
      });
      
      console.groupEnd();
      return user;
      
    } catch (error) {
      console.error('[UserModel] Error in findById:', {
        name: error.name,
        message: error.message,
        code: error.code,
        number: error.number,
        state: error.state,
        class: error.class,
        serverName: error.serverName,
        procName: error.procName,
        lineNumber: error.lineNumber,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      console.groupEnd();
      
      // Create a more descriptive error
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.originalError = error;
      dbError.code = error.code || 'DB_ERROR';
      
      throw dbError;
    }
  }

  // Generate JWT token
  static generateAuthToken(user) {
    try {
      if (!user || !user.UserID) {
        throw new Error('Invalid user data: UserID is required');
      }
      
      // Create payload with user data only
      // Do NOT include iss and aud here - they will be added by jwt.sign options
      const payload = {
        user: {
          id: user.UserID,
          email: user.Email,
          role: user.RoleName || null
        }
      };

      console.log('Generating token with payload:', JSON.stringify(payload, null, 2));
      console.log('Using JWT config:', { issuer, audience, expiresIn });
      
      const token = jwt.sign(payload, secret, { 
        expiresIn,
        issuer,
        audience,
        algorithm: 'HS256'
      });
      
      const refreshToken = jwt.sign(payload, refreshSecret, { 
        expiresIn: refreshExpiresIn,
        issuer,
        audience,
        algorithm: 'HS256'
      });

      console.log('Generated tokens successfully');
      return { token, refreshToken };
      
    } catch (error) {
      console.error('Error generating auth token:', {
        error: error.message,
        stack: error.stack,
        user: user ? { 
          UserID: user.UserID,
          Email: user.Email,
          RoleName: user.RoleName 
        } : 'No user data'
      });
      throw error;
    }
  }

  // Register a new user
  static async register({ name, email, password, phone, roleId }) {
    try {
      // Check if user already exists
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      // Validate role exists; bootstrap default roles if table is empty
      const pool = await poolPromise;
      let roleCheck = await pool.request()
        .input('roleId', sql.Int, roleId)
        .query('SELECT RoleID FROM Roles WHERE RoleID = @roleId');

      if (roleCheck.recordset.length === 0) {
        const countRes = await pool.request()
          .query('SELECT COUNT(*) as Cnt FROM Roles');
        const total = countRes.recordset[0]?.Cnt ?? 0;
        if (Number(total) === 0) {
          // Insert default roles
          await pool.request().query(`
            INSERT INTO Roles (RoleID, RoleName) VALUES
            (1, 'Admin'),
            (2, 'Landlord'),
            (3, 'Tenant')
          `);
          // Re-check now that roles exist
          roleCheck = await pool.request()
            .input('roleId', sql.Int, roleId)
            .query('SELECT RoleID FROM Roles WHERE RoleID = @roleId');
        }
      }

      if (roleCheck.recordset.length === 0) {
        throw new Error('Invalid role ID');
      }

      // Create user
      const userId = await this.create({ 
        name, 
        email, 
        passwordHash, 
        phone, 
        roleId 
      });

      // Get the created user
      const user = await this.findById(userId);
      
      // Generate tokens
      const { token, refreshToken } = this.generateAuthToken(user);
      
      return { user, token, refreshToken };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  static async login(email, password) {
    try {
      // Find user by email
      const user = await this.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Block login for deactivated users
      if (user.IsActive === 0 || user.IsActive === false) {
        throw new Error('Account is deactivated');
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.PasswordHash);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      // Get user with role
      const userWithRole = await this.findById(user.UserID);
      
      // Generate tokens
      const { token, refreshToken } = this.generateAuthToken(userWithRole);
      
      return { 
        user: userWithRole, 
        token, 
        refreshToken 
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Refresh token
  static async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, refreshSecret);
      const user = await this.findById(decoded.user.id);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const { token: newToken, refreshToken: newRefreshToken } = this.generateAuthToken(user);
      
      return {
        token: newToken,
        refreshToken: newRefreshToken,
        user
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw new Error('Invalid refresh token');
    }
  }

  static async update(userId, updates) {
    const pool = await poolPromise;
    const { name, email, phone, roleId } = updates;
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('name', sql.NVarChar(100), name)
      .input('email', sql.NVarChar(150), email)
      .input('phone', sql.NVarChar(20), phone)
      .input('roleId', sql.Int, roleId)
      .query(`UPDATE Users 
              SET Name = @name, 
                  Email = @email, 
                  Phone = @phone, 
                  RoleID = @roleId
              WHERE UserID = @userId`);
    
    return result.rowsAffected[0] > 0;
  }
}

module.exports = User;
