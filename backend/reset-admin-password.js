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

async function resetAdminPassword() {
  const newPassword = 'admin123';
  
  try {
    console.log('🔌 Connecting to database...');
    const pool = await sql.connect(config);
    console.log('✅ Connected');
    
    // Hash the new password
    console.log(`🔒 Hashing new password: "${newPassword}"...`);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    console.log('✅ Password hashed');
    
    // Update admin password
    console.log('💾 Updating admin password in database...');
    const result = await pool.request()
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .query("UPDATE Users SET PasswordHash = @passwordHash WHERE Email = 'admin@example.com'");
    
    if (result.rowsAffected[0] > 0) {
      console.log('✅ Admin password reset successfully!');
      console.log(`\n📧 Email: admin@example.com`);
      console.log(`🔑 Password: ${newPassword}`);
      console.log('\n💡 You can now login with these credentials');
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

resetAdminPassword();
