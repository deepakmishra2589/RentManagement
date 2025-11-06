import { api } from './authService';

export const leaseService = {
  // Create a new lease
  createLease: async ({ propertyId, tenantId, rentAmount, securityAmount, startDate, endDate, leaseType }) => {
    const payload = { propertyId, tenantId, rentAmount, securityAmount, startDate, endDate, leaseType };
    const res = await api.post('/leases', payload);
    return res; // api returns response.data
  },

  // End a lease
  endLease: async (leaseId, endDate) => {
    const res = await api.put(`/leases/${leaseId}/end`, { endDate });
    return res;
  },

  // Upload documents for a lease
  uploadDocuments: async (leaseId, files, documentType) => {
    const form = new FormData();
    for (const f of files) {
      if (f) form.append('files', f);
    }
    if (documentType) form.append('documentType', documentType);
    const res = await api.post(`/leases/${leaseId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res;
  },

  // Get leases for a property (existing endpoint)
  getPropertyLeases: async (propertyId) => {
    const res = await api.get(`/properties/${propertyId}/leases`);
    return res;
  },

  // Get current tenant's active lease with due info
  getMyActiveLease: async (daysAhead = 7) => {
    const res = await api.get(`/leases/my-active?daysAhead=${encodeURIComponent(daysAhead)}`);
    return res;
  }
};
