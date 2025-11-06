import { api } from './authService';

export const fetchTenantSummary = async ({ search = '', daysAhead = 7 } = {}) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (typeof daysAhead === 'number') params.append('daysAhead', String(daysAhead));
  const url = `/users/tenants/summary${params.toString() ? `?${params.toString()}` : ''}`;
  const data = await api.get(url);
  return data;
};
