import { api } from './authService';

// Get all property types
export const getPropertyTypes = async () => {
  try {
    const response = await api.get('/property-types');
    return response;
  } catch (error) {
    console.error('Error fetching property types:', error);
    throw error.response?.data || error.message;
  }
};

// Get property type by ID
export const getPropertyType = async (id) => {
  try {
    const response = await api.get(`/property-types/${id}`);
    return response;
  } catch (error) {
    console.error('Error fetching property type:', error);
    throw error.response?.data || error.message;
  }
};

// Create a new property type
export const createPropertyType = async (propertyTypeData) => {
  try {
    const response = await api.post('/property-types', propertyTypeData);
    return response;
  } catch (error) {
    console.error('Error creating property type:', error);
    throw error.response?.data || error.message;
  }
};

// Update a property type
export const updatePropertyType = async (id, propertyTypeData) => {
  try {
    const response = await api.put(`/property-types/${id}`, propertyTypeData);
    return response;
  } catch (error) {
    console.error('Error updating property type:', error);
    throw error.response?.data || error.message;
  }
};

// Delete a property type
export const deletePropertyType = async (id) => {
  try {
    const response = await api.delete(`/property-types/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting property type:', error);
    throw error.response?.data || error.message;
  }
};
