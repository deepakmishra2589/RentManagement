const { poolPromise, sql } = require('../config/db');

class Property {
  static async create({
    landlordId,
    propertyTypeId,
    title,
    address,
    city,
    baseRentAmount,
    description,
    status = 'Vacant'
  }) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('landlordId', sql.Int, landlordId)
      .input('propertyTypeId', sql.Int, propertyTypeId)
      .input('title', sql.NVarChar(150), title)
      .input('address', sql.NVarChar(255), address)
      .input('city', sql.NVarChar(100), city)
      .input('baseRentAmount', sql.Decimal(12, 2), baseRentAmount)
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('status', sql.NVarChar(20), status)
      .query(`
        INSERT INTO Properties (LandlordID, PropertyTypeID, Title, Address, City, BaseRentAmount, Description, Status)
        OUTPUT INSERTED.PropertyID
        VALUES (@landlordId, @propertyTypeId, @title, @address, @city, @baseRentAmount, @description, @status)
      `);

    return result.recordset[0].PropertyID;
  }

  static async findById(propertyId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('propertyId', sql.Int, propertyId)
      .query(`
        SELECT p.*, pt.TypeName as PropertyType
        FROM Properties p
        JOIN PropertyTypes pt ON p.PropertyTypeID = pt.PropertyTypeID
        WHERE p.PropertyID = @propertyId
      `);

    return result.recordset[0] || null;
  }

  static async findByLandlord(landlordId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('landlordId', sql.Int, landlordId)
      .query(`
        SELECT p.*, pt.TypeName as PropertyType
        FROM Properties p
        JOIN PropertyTypes pt ON p.PropertyTypeID = pt.PropertyTypeID
        WHERE p.LandlordID = @landlordId
        ORDER BY p.CreatedAt DESC
      `);

    return result.recordset;
  }

  static async update(propertyId, updates) {
    const pool = await poolPromise;
    const {
      title, address, city, baseRentAmount, description, status
    } = updates;

    const result = await pool.request()
      .input('propertyId', sql.Int, propertyId)
      .input('title', sql.NVarChar(150), title)
      .input('address', sql.NVarChar(255), address)
      .input('city', sql.NVarChar(100), city)
      .input('baseRentAmount', sql.Decimal(12, 2), baseRentAmount)
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('status', sql.NVarChar(20), status)
      .query(`
        UPDATE Properties
        SET Title = @title,
            Address = @address,
            City = @city,
            BaseRentAmount = @baseRentAmount,
            Description = @description,
            Status = @status
        WHERE PropertyID = @propertyId
      `);

    return result.rowsAffected[0] > 0;
  }

  static async delete(propertyId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('propertyId', sql.Int, propertyId)
      .query('DELETE FROM Properties WHERE PropertyID = @propertyId');

    return result.rowsAffected[0] > 0;
  }

  // Property type specific details
  static async addFarmHouseDetails(propertyId, { landArea, hasPool, hasGarden }) {
    const pool = await poolPromise;
    await pool.request()
      .input('propertyId', sql.Int, propertyId)
      .input('landArea', sql.Decimal(12, 2), landArea)
      .input('hasPool', sql.Bit, hasPool || false)
      .input('hasGarden', sql.Bit, hasGarden || false)
      .query(`
        INSERT INTO FarmHouseDetails (PropertyID, LandArea, HasPool, HasGarden)
        VALUES (@propertyId, @landArea, @hasPool, @hasGarden)
      `);
  }

  static async addShopOfficeDetails(propertyId, { floorNumber, areaSqFt, commercialLicenseNo }) {
    const pool = await poolPromise;
    await pool.request()
      .input('propertyId', sql.Int, propertyId)
      .input('floorNumber', sql.Int, floorNumber)
      .input('areaSqFt', sql.Decimal(10, 2), areaSqFt)
      .input('commercialLicenseNo', sql.NVarChar(100), commercialLicenseNo)
      .query(`
        INSERT INTO ShopOfficeDetails (PropertyID, FloorNumber, AreaSqFt, CommercialLicenseNo)
        VALUES (@propertyId, @floorNumber, @areaSqFt, @commercialLicenseNo)
      `);
  }

  static async addFlatDetails(propertyId, { flatNumber, buildingName, floorNumber, areaSqFt }) {
    const pool = await poolPromise;
    await pool.request()
      .input('propertyId', sql.Int, propertyId)
      .input('flatNumber', sql.NVarChar(50), flatNumber)
      .input('buildingName', sql.NVarChar(150), buildingName)
      .input('floorNumber', sql.Int, floorNumber)
      .input('areaSqFt', sql.Decimal(10, 2), areaSqFt)
      .query(`
        INSERT INTO FlatDetails (PropertyID, FlatNumber, BuildingName, FloorNumber, AreaSqFt)
        VALUES (@propertyId, @flatNumber, @buildingName, @floorNumber, @areaSqFt)
      `);
  }
}

module.exports = Property;
