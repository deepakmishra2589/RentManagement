const jwt = require('jsonwebtoken');
const { sql } = require('../config/db');
const jwtConfig = require('../config/jwt');

// Destructure with defaults
const { 
  secret = 'fallback_secret_key',
  refreshSecret = 'fallback_refresh_secret',
  issuer = 'rent-management-api',
  audience = 'rent-management-client',
  expiresIn = '24h',
  refreshExpiresIn = '7d'
} = jwtConfig;

const auth = async (req, res, next) => {
  console.log('\n=== Auth Middleware ===');
  console.log(`[${new Date().toISOString()}] Incoming request to:`, req.originalUrl);
  console.log('Request headers:', {
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer [HIDDEN]' : 'Not provided',
    'user-agent': req.headers['user-agent']
  });
  
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    // Check if no token
    if (!authHeader) {
      console.error('❌ No authorization header found');
      return res.status(401).json({ 
        success: false, 
        message: 'No token, authorization denied',
        code: 'NO_AUTH_HEADER'
      });
    }
    
    // Check if token is in Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      console.error('❌ Invalid token format. Expected: Bearer <token>');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT',
        expectedFormat: 'Bearer <token>'
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('❌ No token found after Bearer');
      return res.status(401).json({ 
        success: false, 
        message: 'No token found after Bearer',
        code: 'EMPTY_TOKEN'
      });
    }
    
    console.log('🔑 Token found, verifying...');
    
    // Verify token with issuer and audience
    let decoded;
    try {
      console.log('🔍 Verifying token with config:', { 
        issuer,
        audience,
        algorithm: 'HS256'
      });
      
      decoded = jwt.verify(token, secret, {
        issuer,
        audience,
        algorithms: ['HS256'],
        ignoreExpiration: false
      });
      
      console.log('✅ Token verified successfully');
      console.log('🔍 Decoded token payload:', {
        userId: decoded.user?.id,
        email: decoded.user?.email,
        role: decoded.user?.role,
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        iat: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null
      });
      
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', {
        name: jwtError.name,
        message: jwtError.message,
        expiredAt: jwtError.expiredAt,
        code: jwtError.code,
        stack: process.env.NODE_ENV === 'development' ? jwtError.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      let errorMessage = 'Token is not valid';
      let statusCode = 401;
      let errorCode = 'INVALID_TOKEN';
      
      if (jwtError.name === 'TokenExpiredError') {
        errorMessage = 'Token has expired';
        errorCode = 'TOKEN_EXPIRED';
      } else if (jwtError.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid token';
        errorCode = 'INVALID_TOKEN';
      } else if (jwtError.name === 'NotBeforeError') {
        errorMessage = 'Token not yet valid';
        errorCode = 'TOKEN_NOT_VALID_YET';
      }
      
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        code: errorCode,
        error: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
      });
    }
    
    // Check if user exists in the token
    if (!decoded.user || !decoded.user.id) {
      console.error('❌ No user ID found in token');
      return res.status(401).json({
        success: false,
        message: 'Invalid token: No user ID found',
        code: 'INVALID_TOKEN_PAYLOAD',
        details: 'Token payload must contain a user object with an id'
      });
    }
    
    // Add user from payload to request object
    req.user = decoded.user;
    console.log('👤 User authenticated successfully:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });
    
    console.log('✅ Auth middleware completed successfully');
    next();
  } catch (err) {
    console.error('Auth middleware error:', {
      message: err.message,
      name: err.name,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token',
        code: 'JWT_ERROR',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    // Handle database connection errors
    if (err.code === 'ETIMEOUT' || err.code === 'ESOCKET' || err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Database connection error',
        code: 'DB_CONNECTION_ERROR',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Middleware to check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.RoleName)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
