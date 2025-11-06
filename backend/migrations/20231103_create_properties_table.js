const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Properties', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false
      },
      zipCode: {
        type: DataTypes.STRING,
        allowNull: false
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      bedrooms: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      bathrooms: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: false
      },
      area: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      isAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      images: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
      },
      amenities: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
      },
      landlordId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Users',
          key: 'UserID'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Properties');
  }
};
