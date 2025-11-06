import React, { useEffect, useState } from 'react';
import { reportsService } from '../services/reportsService';

const Reports = () => {
  const [kpis, setKpis] = useState({ Pending: 0, InProgress: 0, Completed: 0 });
  const [rentRoll, setRentRoll] = useState([]);
  const [expiries, setExpiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [kpiRes, rollRes, expRes] = await Promise.all([
        reportsService.maintenanceKpis(),
        reportsService.rentRoll(),
        reportsService.expiriesUpcoming(days)
      ]);
      setKpis(kpiRes?.kpis || { Pending: 0, InProgress: 0, Completed: 0 });
      setRentRoll(Array.isArray(rollRes?.items) ? rollRes.items : []);
      setExpiries(Array.isArray(expRes?.items) ? expRes.items : []);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Expiries window</label>
          <select className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={days} onChange={(e)=>setDays(Number(e.target.value))}>
            <option value={7}>7d</option>
            <option value={14}>14d</option>
            <option value={30}>30d</option>
            <option value={60}>60d</option>
          </select>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Maintenance Pending</div>
          <div className="text-2xl font-semibold text-gray-900">{kpis.Pending}</div>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-2xl font-semibold text-gray-900">{kpis.InProgress}</div>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-semibold text-gray-900">{kpis.Completed}</div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Rent Roll</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
              ) : rentRoll.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No active leases</td></tr>
              ) : rentRoll.map(r => (
                <tr key={r.LeaseID}>
                  <td className="px-4 py-3 text-sm text-gray-900">#{r.LeaseID}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.PropertyTitle || '-'}<div className="text-xs text-gray-500">{r.Address || ''} {r.City ? `, ${r.City}` : ''}</div></td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.TenantName || '-'}<div className="text-xs text-gray-500">{r.TenantEmail || ''}</div></td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">{Number(r.MonthlyRent).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Upcoming Expiries</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
              ) : expiries.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No upcoming expiries</td></tr>
              ) : expiries.map(e => (
                <tr key={`${e.LeaseID}-${e.EndDate}`}>
                  <td className="px-4 py-3 text-sm text-gray-900">#{e.LeaseID}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{e.PropertyTitle || '-'}<div className="text-xs text-gray-500">{e.Address || ''}</div></td>
                  <td className="px-4 py-3 text-sm text-gray-900">{e.TenantName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{e.EndDate ? new Date(e.EndDate).toISOString().slice(0,10) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
