const sql = require('mssql');
require('dotenv').config();

// Configuration for SQL Server - prefer environment variables
const config = {
  user: process.env.DB_USER || 'RentManagementDB',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || 'RentManagement',
  options: {
    encrypt: process.env.DB_ENCRYPT ? process.env.DB_ENCRYPT === 'true' : false,
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT ? process.env.DB_TRUST_SERVER_CERT === 'true' : true,
    enableArithAbort: true,
    trustedConnection: false
  },
  connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 30000),
  requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 30000)
};

// Create a single connection pool
const pool = new sql.ConnectionPool(config);
const connection = pool.connect();

// Function to test the database connection
const testConnection = async () => {
  try {
    const pool = await connection;
    const result = await pool.request().query('SELECT 1 as test');
    console.log('✅ Successfully connected to SQL Server');
    return pool;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Connection details:', {
      server: config.server,
      database: config.database,
      user: config.user
    });
    console.error('Error details:', {
      code: err.code,
      number: err.number,
      state: err.state,
      class: err.class,
      serverName: err.serverName,
      procName: err.procName,
      lineNumber: err.lineNumber
    });
    process.exit(1);
  }
};

// Export the connection objects
module.exports = {
  sql,
  pool: connection,
  poolPromise: connection,
  testConnection
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
