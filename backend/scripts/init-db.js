const { poolPromise, sql } = require('../config/db');

async function initializeDatabase() {
  try {
    const pool = await poolPromise;
    
    // Insert default roles if they don't exist
    const roles = [
      { id: 1, name: 'Admin', description: 'Administrator with full access' },
      { id: 2, name: 'Landlord', description: 'Property owner/manager' },
      { id: 3, name: 'Tenant', description: 'Rental property tenant' }
    ];

    for (const role of roles) {
      await pool.request()
        .input('roleId', sql.Int, role.id)
        .input('roleName', sql.NVarChar(50), role.name)
        .input('description', sql.NVarChar(255), role.description)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleID = @roleId)
          BEGIN
            SET IDENTITY_INSERT Roles ON;
            INSERT INTO Roles (RoleID, RoleName, Description)
            VALUES (@roleId, @roleName, @description);
            SET IDENTITY_INSERT Roles OFF;
            PRINT 'Added role: ' + @roleName;
          END
          ELSE
          BEGIN
            -- Update existing role
            UPDATE Roles 
            SET RoleName = @roleName, 
                Description = @description 
            WHERE RoleID = @roleId;
            PRINT 'Updated role: ' + @roleName;
          END
        `);
    }

    console.log('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
