const sql = require('mssql');
const config = {
  user: 'RentManagementDB',
  password: 'G1n9L1*j4u4dvh3#',
  server: '65.108.2.70',
  port: 1433,
  database: 'RentManagement',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    trustedConnection: false
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

async function testConnection() {
  let pool;
  
  try {
    console.log('🔌 Attempting to connect to database...');
    pool = await sql.connect(config);
    console.log('✅ Successfully connected to database');
    
    // Test query to check if Users table exists
    console.log('🔍 Checking Users table...');
    const result = await pool.request().query('SELECT TOP 1 * FROM Users');
    console.log('✅ Users table exists');
    console.log('First user:', result.recordset[0] || 'No users found');
    
    // Check if Roles table exists
    console.log('🔍 Checking Roles table...');
    const rolesResult = await pool.request().query('SELECT TOP 1 * FROM Roles');
    console.log('✅ Roles table exists');
    console.log('First role:', rolesResult.recordset[0] || 'No roles found');
    
  } catch (err) {
    console.error('❌ Error:', {
      name: err.name,
      message: err.message,
      code: err.code,
      number: err.number,
      state: err.state,
      class: err.class,
      serverName: err.serverName,
      procName: err.procName,
      lineNumber: err.lineNumber
    });
    
    if (err.code === 'ELOGIN') {
      console.error('💡 Authentication failed. Please check your database credentials.');
    } else if (err.code === 'ETIMEOUT') {
      console.error('💡 Connection timeout. Please check if the database server is running and accessible.');
    } else if (err.code === 'ESOCKET') {
      console.error('💡 Network error. Please check your network connection and database server status.');
    } else if (err.code === 'EREQUEST') {
      console.error('💡 SQL Error:', err.message);
      if (err.message.includes('Invalid object name')) {
        console.error('💡 The table does not exist. Please check your database schema.');
      }
    }
    
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
    sql.close();
  }
}

// Run the test
testConnection();
