import { api } from './authService';

export const paymentService = {
  submitManual: async ({ leaseId, amount, paymentDate, paymentMethod, referenceId, notes, screenshot }) => {
    const form = new FormData();
    form.append('leaseId', leaseId);
    if (amount != null) form.append('amount', amount);
    if (paymentDate) form.append('paymentDate', paymentDate);
    if (paymentMethod) form.append('paymentMethod', paymentMethod);
    if (referenceId) form.append('referenceId', referenceId);
    if (notes) form.append('notes', notes);
    if (screenshot) form.append('screenshot', screenshot);
    const res = await api.post('/payments/manual', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res;
  },

  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
    });
    const res = await api.get(`/payments${qs.toString() ? `?${qs.toString()}` : ''}`);
    return res;
  },

  updateStatus: async (paymentId, status, notes) => {
    const res = await api.put(`/payments/${paymentId}/status`, { status, notes });
    return res;
  }
};
