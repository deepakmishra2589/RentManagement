import { api } from './authService';

export async function getNotifications({ scope = 'me', type = '', unread = false, expand = false } = {}) {
  const params = new URLSearchParams();
  if (scope) params.set('scope', scope);
  if (type) params.set('type', type);
  if (unread) params.set('unread', 'true');
  if (expand) params.set('expand', 'details');

  const res = await api.get(`/notifications?${params.toString()}`);
  return res;
}

export async function markNotificationRead(id) {
  const res = await api.patch(`/notifications/${id}/read`);
  return res;
}
