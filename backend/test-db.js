const sql = require('mssql');
require('dotenv').config();

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
  connectionTimeout: 10000,
  requestTimeout: 10000
};

async function testConnection() {
  try {
    console.log('🔌 Attempting to connect to SQL Server...');
    const pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server!');
    
    const result = await pool.request().query('SELECT 1 as test');
    console.log('✅ Test query result:', result.recordset[0]);
    
    await pool.close();
    console.log('✅ Connection closed.');
    
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Error details:', {
      code: err.code,
      name: err.name,
      number: err.number,
      state: err.state,
      class: err.class,
      serverName: err.serverName,
      procName: err.procName,
      lineNumber: err.lineNumber
    });
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('✅ Test completed successfully!');
  } else {
    console.log('❌ Test failed.');
  }
  process.exit(success ? 0 : 1);
});
