// JWT Configuration
// Note: In production, use environment variables for secrets
// For development, we're using fixed values for consistency

module.exports = {
  // Use env in production, fallback to dev values locally
  secret: process.env.JWT_SECRET || 'dev_secret_key_rent_management_2025!@#',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // Refresh token configuration
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_rent_management_2025!@#',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Token issuer and audience for additional security
  issuer: process.env.JWT_ISSUER || 'rent-management-api',
  audience: process.env.JWT_AUDIENCE || 'rent-management-client'
};

// Log the JWT configuration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('JWT Configuration:');
  console.log('- Using fixed secret key for development');
  console.log(`- Token expires in: ${module.exports.expiresIn}`);
}
