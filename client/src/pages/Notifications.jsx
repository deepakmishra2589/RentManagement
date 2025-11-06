import React, { useEffect, useMemo, useState } from 'react';
import { getNotifications, markNotificationRead } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

const Notifications = () => {
  const { user } = useAuth();
  const role = user?.role || user?.RoleName;
  const isAdmin = role === 'Admin';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState(''); // '', 'RentDue', 'LeaseExpiry'
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [scopeAll, setScopeAll] = useState(false); // admins can toggle all/me
  const [scopeOwned, setScopeOwned] = useState(false); // landlords can toggle owned/me

  const query = useMemo(() => ({
    scope: scopeAll && isAdmin ? 'all' : (scopeOwned && role === 'Landlord' ? 'owned' : 'me'),
    type,
    unread: unreadOnly,
  }), [scopeAll, isAdmin, scopeOwned, role, type, unreadOnly]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getNotifications({ ...query, expand: true })
      .then((res) => {
        if (!cancelled) setRows(res.notifications || []);
      })
      .catch((e) => console.error(e))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [query]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setRows((r) => r.map((n) => (n.NotificationID === id ? { ...n, IsRead: true } : n)));
    } catch (e) {
      console.error('Failed to mark as read', e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Notifications</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-md border">
        {isAdmin && (
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={scopeAll} onChange={(e) => setScopeAll(e.target.checked)} />
            <span>Show all users</span>
          </label>
        )}
        {!isAdmin && role === 'Landlord' && (
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={scopeOwned} onChange={(e) => setScopeOwned(e.target.checked)} />
            <span>Show my properties</span>
          </label>
        )}
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border rounded-md px-2 py-1"
        >
          <option value="">All Types</option>
          <option value="RentDue">Rent Due</option>
          <option value="LeaseExpiry">Lease Expiry</option>
        </select>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          <span>Unread only</span>
        </label>
      </div>

      <div className="bg-white rounded-md border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {isAdmin && scopeAll && <th className="text-left px-3 py-2">User</th>}
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Property</th>
              <th className="text-left px-3 py-2">Tenant</th>
              <th className="text-left px-3 py-2">Message</th>
              <th className="text-left px-3 py-2">Created</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={scopeAll && isAdmin ? 8 : 7}>Loading...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={scopeAll && isAdmin ? 8 : 7}>No notifications found</td>
              </tr>
            ) : (
              rows.map((n) => (
                <tr key={n.NotificationID} className="border-t">
                  {isAdmin && scopeAll && (
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{n.UserName || n.UserID}</span>
                        {n.UserEmail && <span className="text-xs text-gray-500">{n.UserEmail}</span>}
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-2">{n.Type}</td>
                  <td className="px-3 py-2">
                    {n.Property ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{n.Property.Title || `Property #${n.PropertyID}`}</span>
                        <span className="text-xs text-gray-500">{n.Property.Address}{n.Property.City ? `, ${n.Property.City}` : ''}</span>
                      </div>
                    ) : (n.PropertyID ? `#${n.PropertyID}` : '-')}
                  </td>
                  <td className="px-3 py-2">
                    {n.Tenant ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{n.Tenant.Name || `User #${n.Tenant.UserID}`}</span>
                        <span className="text-xs text-gray-500">{n.Tenant.Email}</span>
                      </div>
                    ) : '-' }
                  </td>
                  <td className="px-3 py-2">{n.Message}</td>
                  <td className="px-3 py-2">{new Date(n.CreatedAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{n.IsRead ? 'Read' : 'Unread'}</td>
                  <td className="px-3 py-2">
                    {!n.IsRead && (
                      <button
                        onClick={() => handleMarkRead(n.NotificationID)}
                        className="text-blue-600 hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Notifications;
