import { api } from './authService';

export const userService = {
  // Get all users (admin only)
  getAllUsers: async () => {
    try {
      const response = await api.get('/auth/users');
      return response; // authService api returns response.data already
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Get tenants (RoleID=3)
  getTenants: async () => {
    try {
      const response = await api.get('/users/tenants');
      return response;
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw error;
    }
  },

  // Update user role (admin only)
  updateUserRole: async (userId, roleId) => {
    try {
      const response = await api.put(`/auth/users/${userId}/role`, { roleId });
      return response; // authService api returns response.data already
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  // Update user active status (admin only)
  updateUserStatus: async (userId, isActive) => {
    try {
      const response = await api.put(`/auth/users/${userId}/status`, { isActive });
      return response;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }
};
