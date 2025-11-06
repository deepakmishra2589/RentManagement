import React, { useEffect, useMemo, useState } from 'react';
import { renewalsService } from '../services/renewalsService';
import { useAuth } from '../context/AuthContext';

const Renewals = () => {
  const { user } = useAuth();
  const role = (user?.role || user?.RoleName || '').toString();
  const isTenant = role === 'Tenant';
  const isAdmin = role === 'Admin';
  const isLandlord = role === 'Landlord';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Propose form (Admin/Landlord)
  const [leaseId, setLeaseId] = useState('');
  const [newRent, setNewRent] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await renewalsService.list();
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to load renewals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onPropose = async (e) => {
    e.preventDefault();
    if (!leaseId) return;
    try {
      setSubmitting(true);
      await renewalsService.propose({ leaseId: Number(leaseId), newMonthlyRent: newRent ? Number(newRent) : undefined, newEndDate: newEndDate || undefined, notes: notes || undefined });
      setLeaseId(''); setNewRent(''); setNewEndDate(''); setNotes('');
      await load();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to propose renewal');
    } finally { setSubmitting(false); }
  };

  const onDecision = async (id, action) => {
    try {
      if (action === 'accept') await renewalsService.accept(id);
      else await renewalsService.reject(id);
      await load();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to update renewal');
    }
  };

  const rows = useMemo(() => items, [items]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Renewals</h1>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {(isAdmin || isLandlord) && (
        <form onSubmit={onPropose} className="mb-6 grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-gray-700">Lease ID</label>
            <input value={leaseId} onChange={(e)=>setLeaseId(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Lease ID" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-gray-700">New Monthly Rent</label>
            <input type="number" step="0.01" value={newRent} onChange={(e)=>setNewRent(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-gray-700">New End Date</label>
            <input type="date" value={newEndDate} onChange={(e)=>setNewEndDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-6">
            <label className="mb-1 block text-sm text-gray-700">Notes</label>
            <textarea rows={2} value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-6 flex justify-end">
            <button disabled={submitting || !leaseId} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Submitting...' : 'Propose Renewal'}</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renewal</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Rent</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proposed</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No renewals</td></tr>
            ) : rows.map(r => (
              <tr key={r.RenewalID}>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">#{r.RenewalID} (Lease #{r.LeaseID})</div>
                  <div className="text-xs text-gray-600">Proposed: {new Date(r.ProposedAt).toISOString().slice(0,16).replace('T',' ')}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">{r.PropertyTitle || '-'}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{typeof r.MonthlyRent === 'number' ? r.MonthlyRent.toFixed(2) : '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{r.NewMonthlyRent != null ? Number(r.NewMonthlyRent).toFixed(2) : '-'} {r.NewEndDate ? `(End ${new Date(r.NewEndDate).toISOString().slice(0,10)})` : ''}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{r.Status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {isTenant && r.Status === 'Proposed' && (
                    <div className="inline-flex gap-2">
                      <button onClick={()=>onDecision(r.RenewalID,'accept')} className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700">Accept</button>
                      <button onClick={()=>onDecision(r.RenewalID,'reject')} className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Renewals;
