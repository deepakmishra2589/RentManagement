import { api } from './authService';

export const propertyService = {
  // Get all properties
  getAllProperties: async () => {
    try {
      const response = await api.get('/properties');
      return response;
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  },

  // Get properties with optional filters (e.g., status)
  getProperties: async (params = {}) => {
    try {
      const search = new URLSearchParams(params).toString();
      const response = await api.get(`/properties${search ? `?${search}` : ''}`);
      return response;
    } catch (error) {
      console.error('Error fetching filtered properties:', error);
      throw error;
    }
  },

  // Get properties by landlord
  getLandlordProperties: async (landlordId) => {
    try {
      const response = await api.get(`/properties/landlord/${landlordId}`);
      return response;
    } catch (error) {
      console.error('Error fetching landlord properties:', error);
      throw error;
    }
  },

  // Get property by ID
  getPropertyById: async (id) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  },

  // Property types
  getPropertyTypes: async () => {
    try {
      const response = await api.get('/property-types');
      return response;
    } catch (error) {
      console.error('Error fetching property types:', error);
      throw error;
    }
  },

  createPropertyType: async (payload) => {
    try {
      const response = await api.post('/property-types', payload);
      return response;
    } catch (error) {
      console.error('Error creating property type:', error);
      throw error;
    }
  },

  updatePropertyType: async (id, payload) => {
    try {
      const response = await api.put(`/property-types/${id}`, payload);
      return response;
    } catch (error) {
      console.error('Error updating property type:', error);
      throw error;
    }
  },

  deletePropertyType: async (id) => {
    try {
      const response = await api.delete(`/property-types/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting property type:', error);
      throw error;
    }
  },

  // Create new property (Landlord only)
  createProperty: async (propertyData) => {
    try {
      const response = await api.post('/properties', propertyData);
      return response;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  },

  // Update property (Landlord/Admin only)
  updateProperty: async (id, propertyData) => {
    try {
      const response = await api.put(`/properties/${id}`, propertyData);
      return response;
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  },

  // Delete property (Landlord/Admin only)
  deleteProperty: async (id) => {
    try {
      const response = await api.delete(`/properties/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  },

  // Upload images for a property (expects backend endpoint)
  uploadPropertyImages: async (propertyId, files) => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      const response = await api.post(`/properties/${propertyId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response;
    } catch (error) {
      console.error('Error uploading property images:', error);
      throw error;
    }
  }
};

export default propertyService;
