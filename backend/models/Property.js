const sql = require('mssql');
const { poolPromise } = require('../config/connection');
const fs = require('fs');
const path = require('path');

class Property {
  // Get all properties with their details based on property type
  static async getAll() {
    try {
      const pool = await poolPromise;
      
      // First, get all base properties
      const propertiesResult = await pool.request().query(`
        SELECT 
          p.*,
          pt.TypeName as propertyTypeName,
          u.Name as landlordName,
          u.Email as landlordEmail,
          u.Phone as landlordPhone
        FROM Properties p
        LEFT JOIN PropertyTypes pt ON p.PropertyTypeID = pt.PropertyTypeID
        LEFT JOIN Users u ON p.LandlordID = u.UserID
        ORDER BY p.CreatedAt DESC
      `);

      const properties = propertiesResult.recordset;
      
      // Get details for each property type
      for (let property of properties) {
        switch(property.propertyTypeName) {
          case 'Flat':
            const flatResult = await pool.request()
              .input('propertyId', sql.Int, property.PropertyID)
              .query('SELECT * FROM FlatDetails WHERE PropertyID = @propertyId');
            property.details = flatResult.recordset[0] || {};
            break;
            
          case 'Farm House':
            const farmResult = await pool.request()
              .input('propertyId', sql.Int, property.PropertyID)
              .query('SELECT * FROM FarmHouseDetails WHERE PropertyID = @propertyId');
            property.details = farmResult.recordset[0] || {};
            break;
            
          case 'Shop':
          case 'Office':
            const shopResult = await pool.request()
              .input('propertyId', sql.Int, property.PropertyID)
              .query('SELECT * FROM ShopOfficeDetails WHERE PropertyID = @propertyId');
            property.details = shopResult.recordset[0] || {};
            break;
        }

        // Attach amenities
        const amenitiesResult = await pool.request()
          .input('propertyId', sql.Int, property.PropertyID)
          .query(`
            SELECT a.Name FROM PropertyAmenities pa
            JOIN Amenities a ON pa.AmenityID = a.AmenityID
            WHERE pa.PropertyID = @propertyId
          `);
        property.amenities = amenitiesResult.recordset.map(r => r.Name);
        if ((!property.amenities || property.amenities.length === 0) && property.AmenitiesText) {
          property.amenities = String(property.AmenitiesText)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        }

        // Attach images
        const imagesResult = await pool.request()
          .input('propertyId', sql.Int, property.PropertyID)
          .query(`
            SELECT ImageID, FilePath, UploadedAt FROM PropertyImages WHERE PropertyID = @propertyId
          `);
        property.images = imagesResult.recordset;
      }
      
      return properties;
    } catch (err) {
      console.error('Error getting properties:', err);
      throw err;
    }
  }

  // Get properties by landlord ID
  static async getByLandlordId(landlordId) {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('landlordId', sql.Int, landlordId)
        .query(`
          SELECT 
            p.*,
            pt.TypeName as propertyTypeName,
            u.Name as landlordName,
            u.Email as landlordEmail,
            u.Phone as landlordPhone
          FROM Properties p
          LEFT JOIN PropertyTypes pt ON p.PropertyTypeID = pt.PropertyTypeID
          LEFT JOIN Users u ON p.LandlordID = u.UserID
          WHERE p.LandlordID = @landlordId
          ORDER BY p.CreatedAt DESC
        `);
      
      return result.recordset;
    } catch (err) {
      console.error('Error getting properties by landlord:', err);
      throw err;
    }
  }

  // Get property by ID with details
  static async getById(id) {
    try {
      const pool = await poolPromise;
      
      // Get base property info
      const propertyResult = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT 
            p.*,
            pt.TypeName as propertyTypeName,
            u.Name as landlordName,
            u.Email as landlordEmail,
            u.Phone as landlordPhone
          FROM Properties p
          LEFT JOIN PropertyTypes pt ON p.PropertyTypeID = pt.PropertyTypeID
          LEFT JOIN Users u ON p.LandlordID = u.UserID
          WHERE p.PropertyID = @id
        `);
      
      if (propertyResult.recordset.length === 0) {
        return null;
      }
      
      const property = propertyResult.recordset[0];
      
      // Get property type specific details
      if (property.propertyTypeName === 'Flat') {
        const flatResult = await pool.request()
          .input('propertyId', sql.Int, id)
          .query('SELECT * FROM FlatDetails WHERE PropertyID = @propertyId');
        property.details = flatResult.recordset[0] || {};
      } 
      else if (property.propertyTypeName === 'Farm House') {
        const farmResult = await pool.request()
          .input('propertyId', sql.Int, id)
          .query('SELECT * FROM FarmHouseDetails WHERE PropertyID = @propertyId');
        property.details = farmResult.recordset[0] || {};
      } 
      else if (property.propertyTypeName === 'Shop' || property.propertyTypeName === 'Office') {
        const shopResult = await pool.request()
          .input('propertyId', sql.Int, id)
          .query('SELECT * FROM ShopOfficeDetails WHERE PropertyID = @propertyId');
        property.details = shopResult.recordset[0] || {};
      }
      
      // Attach amenities
      const amenitiesResult = await pool.request()
        .input('propertyId', sql.Int, id)
        .query(`
          SELECT a.Name FROM PropertyAmenities pa
          JOIN Amenities a ON pa.AmenityID = a.AmenityID
          WHERE pa.PropertyID = @propertyId
        `);
      property.amenities = amenitiesResult.recordset.map(r => r.Name);

      // Attach images
      const imagesResult = await pool.request()
        .input('propertyId', sql.Int, id)
        .query(`
          SELECT ImageID, FilePath, UploadedAt FROM PropertyImages WHERE PropertyID = @propertyId
        `);
      property.images = imagesResult.recordset;

      return property;
    } catch (err) {
      console.error('Error getting property by ID:', err);
      throw err;
    }
  }

  // Create a new property with type-specific details
  static async create(propertyData) {
    const transaction = new sql.Transaction(await poolPromise);
    
    try {
      await transaction.begin();
      
      // Insert base property
      const propertyResult = await transaction.request()
        .input('LandlordID', sql.Int, propertyData.landlordId)
        .input('PropertyTypeID', sql.Int, propertyData.propertyTypeId)
        .input('Title', sql.NVarChar(150), propertyData.title)
        .input('Address', sql.NVarChar(255), propertyData.address)
        .input('City', sql.NVarChar(100), propertyData.city)
        .input('BaseRentAmount', sql.Decimal(12, 2), propertyData.baseRentAmount)
        .input('SecurityAmount', sql.Decimal(12, 2), propertyData.securityAmount ?? null)
        .input('Description', sql.NVarChar(sql.MAX), propertyData.description || '')
        .input('Status', sql.NVarChar(20), propertyData.status || 'Vacant')
        .input('Bedrooms', sql.Int, propertyData.bedrooms ?? null)
        .input('Bathrooms', sql.Decimal(4,1), propertyData.bathrooms ?? null)
        .input('AreaSqFt', sql.Decimal(10, 2), propertyData.areaSqFt ?? null)
        .input('AmenitiesText', sql.NVarChar(1000), propertyData.amenitiesText ?? null)
        .query(`
          INSERT INTO Properties (
            LandlordID, PropertyTypeID, Title, Address, City,
            BaseRentAmount, SecurityAmount, Description, Status, Bedrooms, Bathrooms, AreaSqFt, AmenitiesText, CreatedAt
          )
          OUTPUT INSERTED.*
          VALUES (
            @LandlordID, @PropertyTypeID, @Title, @Address, @City,
            @BaseRentAmount, @SecurityAmount, @Description, @Status, @Bedrooms, @Bathrooms, @AreaSqFt, @AmenitiesText, GETDATE()
          )
        `);
      
      const newProperty = propertyResult.recordset[0];
      
      // Get property type name
      const typeResult = await transaction.request()
        .input('propertyTypeId', sql.Int, propertyData.propertyTypeId)
        .query('SELECT TypeName FROM PropertyTypes WHERE PropertyTypeID = @propertyTypeId');
      
      const propertyTypeName = typeResult.recordset[0]?.TypeName;
      
      // Insert type-specific details
      if (propertyTypeName === 'Flat' && propertyData.details) {
        await transaction.request()
          .input('PropertyID', sql.Int, newProperty.PropertyID)
          .input('FlatNumber', sql.NVarChar(50), propertyData.details.flatNumber)
          .input('BuildingName', sql.NVarChar(150), propertyData.details.buildingName)
          .input('FloorNumber', sql.Int, propertyData.details.floorNumber)
          .input('AreaSqFt', sql.Decimal(10, 2), propertyData.details.areaSqFt)
          .query(`
            INSERT INTO FlatDetails (
              PropertyID, FlatNumber, BuildingName, FloorNumber, AreaSqFt
            ) VALUES (
              @PropertyID, @FlatNumber, @BuildingName, @FloorNumber, @AreaSqFt
            )
          `);
      } 
      else if (propertyTypeName === 'Farm House' && propertyData.details) {
        await transaction.request()
          .input('PropertyID', sql.Int, newProperty.PropertyID)
          .input('LandArea', sql.Decimal(12, 2), propertyData.details.landArea)
          .input('HasPool', sql.Bit, propertyData.details.hasPool || false)
          .input('HasGarden', sql.Bit, propertyData.details.hasGarden || false)
          .query(`
            INSERT INTO FarmHouseDetails (
              PropertyID, LandArea, HasPool, HasGarden
            ) VALUES (
              @PropertyID, @LandArea, @HasPool, @HasGarden
            )
          `);
      } 
      else if ((propertyTypeName === 'Shop' || propertyTypeName === 'Office') && propertyData.details) {
        await transaction.request()
          .input('PropertyID', sql.Int, newProperty.PropertyID)
          .input('FloorNumber', sql.Int, propertyData.details.floorNumber)
          .input('AreaSqFt', sql.Decimal(10, 2), propertyData.details.areaSqFt)
          .input('CommercialLicenseNo', sql.NVarChar(100), propertyData.details.commercialLicenseNo || null)
          .query(`
            INSERT INTO ShopOfficeDetails (
              PropertyID, FloorNumber, AreaSqFt, CommercialLicenseNo
            ) VALUES (
              @PropertyID, @FloorNumber, @AreaSqFt, @CommercialLicenseNo
            )
          `);
      }

      // Insert amenities if provided (guarded)
      if (Array.isArray(propertyData.amenities) && propertyData.amenities.length > 0) {
        try {
          await this.setAmenities(transaction, newProperty.PropertyID, propertyData.amenities);
        } catch (amenityErr) {
          console.warn('Amenities persistence failed (continuing):', amenityErr.message);
        }
      }
      
      await transaction.commit();
      return await this.getById(newProperty.PropertyID);
      
    } catch (err) {
      await transaction.rollback();
      console.error('Error creating property:', err);
      throw err;
    }
  }

  // Update a property with type-specific details
  static async update(id, propertyData) {
    const transaction = new sql.Transaction(await poolPromise);
    
    try {
      await transaction.begin();
      
      // Update base property
      await transaction.request()
        .input('PropertyID', sql.Int, id)
        .input('Title', sql.NVarChar(150), propertyData.title)
        .input('Address', sql.NVarChar(255), propertyData.address)
        .input('City', sql.NVarChar(100), propertyData.city)
        .input('BaseRentAmount', sql.Decimal(12, 2), propertyData.baseRentAmount)
        .input('SecurityAmount', sql.Decimal(12, 2), propertyData.securityAmount ?? null)
        .input('Description', sql.NVarChar(sql.MAX), propertyData.description)
        .input('Status', sql.NVarChar(20), propertyData.status)
        .input('Bedrooms', sql.Int, propertyData.bedrooms ?? null)
        .input('Bathrooms', sql.Decimal(4,1), propertyData.bathrooms ?? null)
        .input('AreaSqFt', sql.Decimal(10, 2), propertyData.areaSqFt ?? null)
        .input('AmenitiesText', sql.NVarChar(1000), propertyData.amenitiesText ?? null)
        .query(`
          UPDATE Properties SET
            Title = @Title,
            Address = @Address,
            City = @City,
            BaseRentAmount = @BaseRentAmount,
            SecurityAmount = @SecurityAmount,
            Description = @Description,
            Status = @Status,
            Bedrooms = @Bedrooms,
            Bathrooms = @Bathrooms,
            AreaSqFt = @AreaSqFt,
            AmenitiesText = @AmenitiesText
          WHERE PropertyID = @PropertyID
        `);
      
      // Update type-specific details if provided
      if (propertyData.details) {
        if (propertyData.propertyType === 'Flat') {
          await this.updateFlatDetails(transaction, id, propertyData.details);
        } 
        else if (propertyData.propertyType === 'Farm House') {
          await this.updateFarmHouseDetails(transaction, id, propertyData.details);
        } 
        else if (propertyData.propertyType === 'Shop' || propertyData.propertyType === 'Office') {
          await this.updateShopOfficeDetails(transaction, id, propertyData.details);
        }
      }

      // Update amenities if provided (guarded)
      if (Array.isArray(propertyData.amenities)) {
        try {
          await this.setAmenities(transaction, id, propertyData.amenities);
        } catch (amenityErr) {
          console.warn('Amenities update failed (continuing):', amenityErr.message);
        }
      }
      
      await transaction.commit();
      return await this.getById(id);
      
    } catch (err) {
      await transaction.rollback();
      console.error('Error updating property:', err);
      throw err;
    }
  }
  
  // Helper method to update flat details
  static async updateFlatDetails(transaction, propertyId, details) {
    // Check if details already exist
    const checkResult = await transaction.request()
      .input('PropertyID', sql.Int, propertyId)
      .query('SELECT 1 FROM FlatDetails WHERE PropertyID = @PropertyID');
    
    if (checkResult.recordset.length > 0) {
      // Update existing
      await transaction.request()
        .input('PropertyID', sql.Int, propertyId)
        .input('FlatNumber', sql.NVarChar(50), details.flatNumber)
        .input('BuildingName', sql.NVarChar(150), details.buildingName)
        .input('FloorNumber', sql.Int, details.floorNumber)
        .input('AreaSqFt', sql.Decimal(10, 2), details.areaSqFt)
        .query(`
          UPDATE FlatDetails SET
            FlatNumber = @FlatNumber,
            BuildingName = @BuildingName,
            FloorNumber = @FloorNumber,
            AreaSqFt = @AreaSqFt
          WHERE PropertyID = @PropertyID
        `);
    } else {
      // Insert new
      await transaction.request()
        .input('PropertyID', sql.Int, propertyId)
        .input('FlatNumber', sql.NVarChar(50), details.flatNumber)
        .input('BuildingName', sql.NVarChar(150), details.buildingName)
        .input('FloorNumber', sql.Int, details.floorNumber)
        .input('AreaSqFt', sql.Decimal(10, 2), details.areaSqFt)
        .query(`
          INSERT INTO FlatDetails (
            PropertyID, FlatNumber, BuildingName, FloorNumber, AreaSqFt
          ) VALUES (
            @PropertyID, @FlatNumber, @BuildingName, @FloorNumber, @AreaSqFt
          )
        `);
    }
  }
  
  // Helper method to update farm house details
  static async updateFarmHouseDetails(transaction, propertyId, details) {
    const checkResult = await transaction.request()
      .input('PropertyID', sql.Int, propertyId)
      .query('SELECT 1 FROM FarmHouseDetails WHERE PropertyID = @PropertyID');
    
    if (checkResult.recordset.length > 0) {
      await transaction.request()
        .input('PropertyID', sql.Int, propertyId)
        .input('LandArea', sql.Decimal(12, 2), details.landArea)
        .input('HasPool', sql.Bit, details.hasPool || false)
        .input('HasGarden', sql.Bit, details.hasGarden || false)
        .query(`
          UPDATE FarmHouseDetails SET
            LandArea = @LandArea,
            HasPool = @HasPool,
            HasGarden = @HasGarden
          WHERE PropertyID = @PropertyID
        `);
    } else {
      await transaction.request()
        .input('PropertyID', sql.Int, propertyId)
        .input('LandArea', sql.Decimal(12, 2), details.landArea)
        .input('HasPool', sql.Bit, details.hasPool || false)
        .input('HasGarden', sql.Bit, details.hasGarden || false)
        .query(`
          INSERT INTO FarmHouseDetails (
            PropertyID, LandArea, HasPool, HasGarden
          ) VALUES (
            @PropertyID, @LandArea, @HasPool, @HasGarden
          )
        `);
    }
  }
  
  // Helper method to update shop/office details
  static async updateShopOfficeDetails(transaction, propertyId, details) {
    const checkResult = await transaction.request()
      .input('PropertyID', sql.Int, propertyId)
      .query('SELECT 1 FROM ShopOfficeDetails WHERE PropertyID = @PropertyID');
    
    if (checkResult.recordset.length > 0) {
      await transaction.request()
        .input('PropertyID', sql.Int, propertyId)
        .input('FloorNumber', sql.Int, details.floorNumber)
        .input('AreaSqFt', sql.Decimal(10, 2), details.areaSqFt)
        .input('CommercialLicenseNo', sql.NVarChar(100), details.commercialLicenseNo || null)
        .query(`
          UPDATE ShopOfficeDetails SET
            FloorNumber = @FloorNumber,
            AreaSqFt = @AreaSqFt,
            CommercialLicenseNo = @CommercialLicenseNo
          WHERE PropertyID = @PropertyID
        `);
    } else {
      await transaction.request()
        .input('PropertyID', sql.Int, propertyId)
        .input('FloorNumber', sql.Int, details.floorNumber)
        .input('AreaSqFt', sql.Decimal(10, 2), details.areaSqFt)
        .input('CommercialLicenseNo', sql.NVarChar(100), details.commercialLicenseNo || null)
        .query(`
          INSERT INTO ShopOfficeDetails (
            PropertyID, FloorNumber, AreaSqFt, CommercialLicenseNo
          ) VALUES (
            @PropertyID, @FloorNumber, @AreaSqFt, @CommercialLicenseNo
          )
        `);
    }
  }

  // Delete a property and its related records
  static async delete(id) {
    const transaction = new sql.Transaction(await poolPromise);
    
    try {
      await transaction.begin();
      
      // First, delete from child tables
      await transaction.request()
        .input('propertyId', sql.Int, id)
        .query('DELETE FROM FlatDetails WHERE PropertyID = @propertyId');
      
      await transaction.request()
        .input('propertyId', sql.Int, id)
        .query('DELETE FROM FarmHouseDetails WHERE PropertyID = @propertyId');
      
      await transaction.request()
        .input('propertyId', sql.Int, id)
        .query('DELETE FROM ShopOfficeDetails WHERE PropertyID = @propertyId');
      
      // Then delete the main property
      await transaction.request()
        .input('propertyId', sql.Int, id)
        .query('DELETE FROM Properties WHERE PropertyID = @propertyId');
      
      await transaction.commit();
      return true;
      
    } catch (err) {
      await transaction.rollback();
      console.error('Error deleting property:', err);
      throw err;
    }
  }
  
  // Get all property types
  static async getPropertyTypes() {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .query('SELECT * FROM PropertyTypes ORDER BY TypeName');
      
      return result.recordset;
    } catch (err) {
      console.error('Error getting property types:', err);
      throw err;
    }
  }
}

module.exports = Property;
