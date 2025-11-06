import React, { useEffect, useMemo, useState } from 'react';
import { fetchTenantSummary } from '../services/tenantService';

const Tenants = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [daysAhead, setDaysAhead] = useState(7);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await fetchTenantSummary({ search: query, daysAhead });
        if (!active) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        if (!active) return;
        setError(typeof e === 'string' ? e : 'Failed to load tenants');
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [query, daysAhead]);

  const rows = useMemo(() => items || [], [items]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-semibold">Manage Tenants</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            className="w-full sm:w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search name, email, phone, property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
          >
            <option value={3}>3d</option>
            <option value={7}>7d</option>
            <option value={14}>14d</option>
            <option value={30}>30d</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rent</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Due</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days Left</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Loading...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">No tenants found</td>
              </tr>
            ) : (
              rows.map((r) => {
                const dueSoon = Number(r.DueSoon) === 1;
                const daysLeft = typeof r.DaysUntilDue === 'number' ? r.DaysUntilDue : '';
                return (
                  <tr key={`${r.TenantID}-${r.LeaseID || 'none'}`} className={dueSoon ? 'bg-yellow-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.Name || '-'}</div>
                      <div className="text-xs text-gray-500">#{r.TenantID}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">{r.Email || '-'}</div>
                      <div className="text-sm text-gray-700">{r.Phone || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{r.PropertyTitle || '-'}</div>
                      <div className="text-xs text-gray-500">#{r.PropertyID || '-'} {r.Address || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.City || '-'}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{typeof r.MonthlyRent === 'number' ? r.MonthlyRent.toFixed(2) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.NextDueDate ? new Date(r.NextDueDate).toISOString().slice(0,10) : '-'}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{daysLeft === '' ? '-' : daysLeft}</td>
                    <td className="px-4 py-3 text-center">
                      {dueSoon ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          <span className="h-2 w-2 rounded-full bg-red-600 animate-ping"></span>
                          Due Soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tenants;
