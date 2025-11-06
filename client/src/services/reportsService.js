import { api } from './authService';

export const reportsService = {
  rentRoll: async () => {
    const res = await api.get('/reports/rent-roll');
    return res;
  },
  expiriesUpcoming: async (days = 30) => {
    const res = await api.get(`/reports/expiries-upcoming?days=${encodeURIComponent(days)}`);
    return res;
  },
  maintenanceKpis: async () => {
    const res = await api.get('/reports/maintenance-kpis');
    return res;
  },
};
