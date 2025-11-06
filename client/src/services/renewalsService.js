import { api } from './authService';

export const renewalsService = {
  list: async () => {
    const res = await api.get('/renewals');
    return res;
  },
  propose: async ({ leaseId, newMonthlyRent, newEndDate, notes }) => {
    const res = await api.post('/renewals/propose', { leaseId, newMonthlyRent, newEndDate, notes });
    return res;
  },
  accept: async (renewalId) => {
    const res = await api.put(`/renewals/${renewalId}/accept`);
    return res;
  },
  reject: async (renewalId) => {
    const res = await api.put(`/renewals/${renewalId}/reject`);
    return res;
  }
};
