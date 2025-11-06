const sql = require('mssql');
const { poolPromise } = require('../config/connection');

class PropertyType {
  // Get all property types
  static async getAll() {
    try {
      const pool = await poolPromise;
      const result = await pool.request().query('SELECT * FROM PropertyTypes ORDER BY TypeName');
      return result.recordset;
    } catch (err) {
      console.error('Error getting property types:', err);
      throw err;
    }
  }

  // Get property type by ID
  static async getById(id) {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT * FROM PropertyTypes WHERE PropertyTypeID = @id');
      
      return result.recordset[0];
    } catch (err) {
      console.error('Error getting property type:', err);
      throw err;
    }
  }

  // Create new property type
  static async create(propertyTypeData) {
    try {
      const { typeName, description } = propertyTypeData;
      const pool = await poolPromise;
      
      const result = await pool.request()
        .input('typeName', sql.NVarChar(100), typeName)
        .input('description', sql.NVarChar(sql.MAX), description || null)
        .query(`
          INSERT INTO PropertyTypes (TypeName, Description)
          OUTPUT INSERTED.*
          VALUES (@typeName, @description)
        `);
      
      return result.recordset[0];
    } catch (err) {
      console.error('Error creating property type:', err);
      throw err;
    }
  }

  // Update property type
  static async update(id, propertyTypeData) {
    try {
      const { typeName, description } = propertyTypeData;
      const pool = await poolPromise;
      
      const result = await pool.request()
        .input('id', sql.Int, id)
        .input('typeName', sql.NVarChar(100), typeName)
        .input('description', sql.NVarChar(sql.MAX), description || null)
        .query(`
          UPDATE PropertyTypes 
          SET TypeName = @typeName,
              Description = @description
          WHERE PropertyTypeID = @id
          
          SELECT * FROM PropertyTypes WHERE PropertyTypeID = @id
        `);
      
      return result.recordset[0];
    } catch (err) {
      console.error('Error updating property type:', err);
      throw err;
    }
  }

  // Delete property type
  static async delete(id) {
    try {
      const pool = await poolPromise;
      
      // Check if any properties are using this type
      const checkResult = await pool.request()
        .input('typeId', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM Properties WHERE PropertyTypeID = @typeId');
      
      if (checkResult.recordset[0].count > 0) {
        throw new Error('Cannot delete property type as it is being used by one or more properties');
      }
      
      await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM PropertyTypes WHERE PropertyTypeID = @id');
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting property type:', err);
      throw err;
    }
  }
}

module.exports = PropertyType;
