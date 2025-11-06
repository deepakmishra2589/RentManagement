require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { poolPromise, testConnection } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const cron = require('node-cron');
const CRON_TZ = process.env.CRON_TZ || 'UTC';

// Import routes
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const propertyTypeRoutes = require('./routes/propertyTypeRoutes');
const leaseRoutes = require('./routes/leaseRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const paymentsRoutes = require('./routes/paymentsRoutes');
const renewalsRoutes = require('./routes/renewalsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000', 'http://localhost:5173'];

// Enable CORS for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if the request origin is in the allowed origins
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Middleware
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Rent Management System API',
    endpoints: {
      test: '/api/test',
      auth: '/api/auth',
      properties: '/api/properties',
      docs: 'Coming soon...'
    }
  });
});

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/property-types', propertyTypeRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/renewals', renewalsRoutes);
app.use('/api/reports', reportsRoutes);
console.log('Auth routes mounted at /api/auth');
console.log('Property routes mounted at /api/properties');
console.log('Property type routes mounted at /api/property-types');
console.log('Notification routes mounted at /api/notifications');

// Ensure Users.IsActive exists
async function ensureUsersIsActiveColumn() {
  try {
    const pool = await poolPromise;
    const check = await pool.request().query(`
      SELECT COUNT(*) AS Cnt
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'IsActive'
    `);
    const present = Number(check.recordset[0]?.Cnt || 0) > 0;
    if (!present) {
      await pool.request().query(`
        ALTER TABLE Users ADD IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT(1)
      `);
      console.log('✅ Added Users.IsActive column with default 1');
    } else {
      console.log('ℹ️ Users.IsActive column already present');
    }
  } catch (err) {
    console.error('⚠️ Failed to ensure Users.IsActive column:', err.message);
  }
}

ensureUsersIsActiveColumn();

// Simple route logging for debugging
const printRoutes = (app) => {
  console.log('\nRegistered Routes:');
  console.log('GET    /');
  console.log('GET    /api/test');
  console.log('POST   /api/auth/register');
  console.log('POST   /api/auth/login');
  console.log('GET    /api/auth/me');
  console.log('POST   /api/auth/refresh-token');
  console.log('GET    /api/properties');
  console.log('POST   /api/properties');
  console.log('GET    /api/properties/:id');
  console.log('PUT    /api/properties/:id');
  console.log('DELETE /api/properties/:id');
  console.log('GET    /api/properties/landlord/:landlordId');
  console.log('GET    /api/properties/:id/leases');
  console.log('GET    /api/properties/:id/documents');
  console.log('GET    /api/users/tenants');
  console.log('GET    /api/users/tenants/summary');
  console.log('POST   /api/leases');
  console.log('PUT    /api/leases/:id/end');
  console.log('POST   /api/leases/:id/documents');
  console.log('GET    /api/leases/my-active');
  console.log('GET    /api/payments');
  console.log('POST   /api/payments/manual');
  console.log('PUT    /api/payments/:id/status');
  console.log('GET    /api/renewals');
  console.log('POST   /api/renewals/propose');
  console.log('PUT    /api/renewals/:id/accept');
  console.log('PUT    /api/renewals/:id/reject');
  console.log('GET    /api/reports/rent-roll');
  console.log('GET    /api/reports/expiries-upcoming');
  console.log('GET    /api/property-types');
  console.log('GET    /api/property-types/:id');
  console.log('POST   /api/property-types');
  console.log('PUT    /api/property-types/:id');
  console.log('DELETE /api/property-types/:id\n');
  console.log('GET    /api/maintenance');
  console.log('POST   /api/maintenance');
  console.log('PUT    /api/maintenance/:id/status');
  console.log('POST   /api/maintenance/:id/reply');
};

// Print registered routes
printRoutes(app);

// Test route to verify database connection
app.get('/api/test', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT 1 as test');
    
    res.json({ 
      success: true,
      message: 'Backend is running and connected to SQL Server',
      database: 'Connected',
      timestamp: new Date().toISOString(),
      testQuery: result.recordset[0]
    });
  } catch (error) {
    console.error('❌ Database test query failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

// Schedule daily reminders generation at 08:00 (use CRON_TZ for timezone)
// Disable cron in Vercel serverless environment
if (!process.env.VERCEL) {
  if (!global.reminderCron) {
    global.reminderCron = cron.schedule(
      '0 8 * * *',
      async () => {
        try {
          const pool = await poolPromise;
          await pool.request().execute('dbo.usp_GenerateDueAndExpiryReminders');
          console.log(`[Scheduler] Reminders generated at ${new Date().toISOString()}`);
        } catch (err) {
          console.error('[Scheduler] Failed to generate reminders:', err.message);
        }
      },
      { timezone: CRON_TZ }
    );
  }
}

// API Routes
app.use('/api/auth', authRoutes);

// API Routes
app.use('/api/auth', authRoutes);

// 404 Handler
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 Handler
app.use(notFound);

// Error Handler
app.use(errorHandler);

// Start server (disabled on Vercel serverless)
let server;
if (!process.env.VERCEL) {
  server = app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('🔌 Testing database connection...');
    
    try {
      await testConnection();
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Failed to connect to the database:', error.message);
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Check if SQL Server is running');
      console.log('2. Verify the database credentials in .env');
      console.log('3. Ensure the SQL Server allows remote connections');
      console.log('4. Check if the port is open in the firewall');
      process.exit(1);
    }
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  if (server) server.close(() => process.exit(1));
});

// Export app for Vercel serverless functions
module.exports = app;
