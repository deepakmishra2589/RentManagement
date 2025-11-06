import React, { useEffect, useMemo, useState } from 'react';
import { paymentService } from '../services/paymentService';
import { useAuth } from '../context/AuthContext';

const PaymentsReview = () => {
  const { user } = useAuth();
  const role = (user?.role || user?.RoleName || '').toString();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await paymentService.list({ status, page, pageSize });
      let rows = Array.isArray(res?.items) ? res.items : [];
      setTotal(res?.total || rows.length);
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        rows = rows.filter(r =>
          String(r.PaymentID).includes(q) ||
          (r.TenantName || '').toLowerCase().includes(q) ||
          (r.PropertyTitle || '').toLowerCase().includes(q) ||
          (r.InvoiceNumber || '').toLowerCase().includes(q)
        );
      }
      setItems(rows);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [status, page, pageSize]);

  const onDecision = async (id, decision) => {
    const notes = window.prompt(`Add notes for marking as ${decision}:`, '');
    try {
      await paymentService.updateStatus(id, decision, notes || '');
      await fetchData();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to update payment');
    }
  };

  const rows = useMemo(() => items, [items]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Payments Review</h1>
        <div className="flex items-center gap-3">
          <input
            className="w-56 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search ID, tenant, property, ref"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Pending</option>
            <option>Paid</option>
            <option>Rejected</option>
          </select>
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={pageSize}
            onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No payments</td></tr>
            ) : rows.map(r => (
              <tr key={r.PaymentID}>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">#{r.PaymentID}</div>
                  <div className="text-xs text-gray-500">{new Date(r.PaymentDate).toISOString().slice(0, 16).replace('T',' ')}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">{r.TenantName || '-'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">{r.PropertyTitle || '-'}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="text-sm text-gray-900">{Number(r.Amount).toFixed(2)}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{r.PaymentMethod || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{r.InvoiceNumber || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{r.PaymentStatus}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {(status === 'Pending') && (role === 'Admin' || role === 'Landlord') && (
                    <div className="inline-flex gap-2">
                      <button onClick={() => onDecision(r.PaymentID, 'Paid')} className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700">Verify</button>
                      <button onClick={() => onDecision(r.PaymentID, 'Rejected')} className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-gray-700">
        <div>Page {page}, showing {items.length} of {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border px-3 py-1 disabled:opacity-50">Prev</button>
          <button disabled={(page*pageSize)>=total} onClick={()=>setPage(p=>p+1)} className="rounded-md border px-3 py-1 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentsReview;
