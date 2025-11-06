const sql = require('mssql');
const bcrypt = require('bcryptjs');

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

async function checkAdminPassword() {
  try {
    console.log('🔌 Connecting to database...');
    const pool = await sql.connect(config);
    console.log('✅ Connected');
    
    // Get admin user
    const result = await pool.request()
      .query("SELECT TOP 1 UserID, Email, Name, PasswordHash FROM Users WHERE Email = 'admin@example.com'");
    
    if (result.recordset.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }
    
    const admin = result.recordset[0];
    console.log('\n📧 Admin user found:');
    console.log('  UserID:', admin.UserID);
    console.log('  Email:', admin.Email);
    console.log('  Name:', admin.Name);
    console.log('  Password Hash:', admin.PasswordHash.substring(0, 20) + '...');
    
    // Test common passwords
    const testPasswords = [
      'admin123',
      'password',
      'admin',
      'Admin123',
      'password123',
      '123456',
      'admin@123'
    ];
    
    console.log('\n🔍 Testing common passwords...');
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, admin.PasswordHash);
      if (match) {
        console.log(`✅ FOUND! The correct password is: "${pwd}"`);
        break;
      } else {
        console.log(`❌ Not: "${pwd}"`);
      }
    }
    
    // Offer to reset password
    console.log('\n💡 If none of the above passwords worked, run the following command to reset the password to "admin123":');
    console.log('   node reset-admin-password.js');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkAdminPassword();
