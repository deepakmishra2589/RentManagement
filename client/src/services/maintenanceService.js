import { api } from './authService';

export const maintenanceService = {
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
    });
    const res = await api.get(`/maintenance${qs.toString() ? `?${qs.toString()}` : ''}`);
    return res;
  },
  create: async ({ propertyId, description }) => {
    const res = await api.post('/maintenance', { propertyId, description });
    return res;
  },
  updateStatus: async (requestId, status) => {
    const res = await api.put(`/maintenance/${requestId}/status`, { status });
    return res;
  },
  reply: async (requestId, message) => {
    const res = await api.post(`/maintenance/${requestId}/reply`, { message });
    return res;
  },
  listComments: async (requestId) => {
    const res = await api.get(`/maintenance/${requestId}/comments`);
    return res;
  },
  addComment: async (requestId, { comment, attachment }) => {
    const form = new FormData();
    if (comment) form.append('comment', comment);
    if (attachment) form.append('attachment', attachment);
    const res = await api.post(`/maintenance/${requestId}/comments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res;
  }
};
