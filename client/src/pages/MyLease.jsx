import React, { useEffect, useState } from 'react';
import { leaseService } from '../services/leaseService';
import { paymentService } from '../services/paymentService';

const Badge = ({ children, color = 'gray' }) => {
  const map = {
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${map[color] || map.gray}`}>
      {children}
    </span>
  );
};

const MyLease = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [daysAhead, setDaysAhead] = useState(7);
  const [payments, setPayments] = useState([]);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState('');

  // payment form state
  const [refId, setRefId] = useState('');
  const [pAmount, setPAmount] = useState('');
  const [pDate, setPDate] = useState('');
  const [pMethod, setPMethod] = useState('Bank Transfer');
  const [pNotes, setPNotes] = useState('');
  const [pFile, setPFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await leaseService.getMyActiveLease(daysAhead);
        if (!active) return;
        setData(res?.lease || null);
      } catch (e) {
        if (!active) return;
        setError(typeof e === 'string' ? e : 'Failed to load lease');
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => { active = false; };
  }, [daysAhead]);

  const lease = data;

  useEffect(() => {
    const loadPayments = async () => {
      if (!lease?.LeaseID) return;
      try {
        setPLoading(true);
        setPError('');
        const res = await paymentService.list({ leaseId: lease.LeaseID });
        setPayments(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setPError(typeof e === 'string' ? e : 'Failed to load payments');
      } finally {
        setPLoading(false);
      }
    };
    loadPayments();
  }, [lease?.LeaseID]);

  const onSubmitPayment = async (e) => {
    e.preventDefault();
    if (!lease?.LeaseID || !pAmount) return;
    try {
      setSubmitting(true);
      await paymentService.submitManual({
        leaseId: lease.LeaseID,
        amount: Number(pAmount),
        paymentDate: pDate || undefined,
        paymentMethod: pMethod,
        referenceId: refId || undefined,
        notes: pNotes || undefined,
        screenshot: pFile || undefined,
      });
      // reset form
      setRefId('');
      setPAmount('');
      setPDate('');
      setPMethod('Bank Transfer');
      setPNotes('');
      setPFile(null);
      // reload list
      const res = await paymentService.list({ leaseId: lease.LeaseID, status: 'Pending' });
      setPayments(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-semibold">My Lease</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Alerts window</label>
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

      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!loading && !lease && (
        <div className="text-gray-600">No active lease found.</div>
      )}

      {lease && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Property</h2>
              <div className="mt-2 text-sm text-gray-700">{lease.PropertyTitle || '-'}</div>
              <div className="text-sm text-gray-500">{lease.Address || '-'}{lease.City ? `, ${lease.City}` : ''}</div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lease</h2>
              <div className="mt-2 text-sm text-gray-700">Start: {lease.StartDate ? new Date(lease.StartDate).toISOString().slice(0,10) : '-'}</div>
              <div className="text-sm text-gray-700">End: {lease.EndDate ? new Date(lease.EndDate).toISOString().slice(0,10) : '-'}</div>
              <div className="text-sm text-gray-700">Monthly Rent: {typeof lease.MonthlyRent === 'number' ? lease.MonthlyRent.toFixed(2) : '-'}</div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Next Rent Due</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{lease.NextDueDate ? new Date(lease.NextDueDate).toISOString().slice(0,10) : '-'}</div>
              <div className="text-sm text-gray-600">in {lease.DaysUntilDue ?? '-'} days</div>
            </div>
            <div className="rounded-md border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Rent Due Alert</div>
              {Number(lease.DueSoon) === 1 ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                  <Badge color="red">Due within {daysAhead} days</Badge>
                </div>
              ) : (
                <Badge color="green">No upcoming due within {daysAhead} days</Badge>
              )}
            </div>
            <div className="rounded-md border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Agreement Expiry</div>
              {Number(lease.ExpirySoon) === 1 ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500 animate-ping" />
                  <Badge color="yellow">Expiring within {daysAhead} days</Badge>
                </div>
              ) : (
                <Badge color="green">Not expiring within {daysAhead} days</Badge>
              )}
            </div>
          </div>

          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Tip: Check Notifications to see system alerts for rent due and lease expiry.
          </div>

          {/* Manual Payment Submission */}
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Submit Payment</h2>
            <form onSubmit={onSubmitPayment} className="grid gap-3 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-700">Amount</label>
                <input type="number" step="0.01" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={pAmount} onChange={(e) => setPAmount(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-700">Payment Date</label>
                <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={pDate} onChange={(e) => setPDate(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-700">Method</label>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={pMethod} onChange={(e) => setPMethod(e.target.value)}>
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                  <option>Cash</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-sm text-gray-700">Reference ID</label>
                <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={refId} onChange={(e) => setRefId(e.target.value)} placeholder="Txn/UTR/Ref #" />
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-sm text-gray-700">Screenshot</label>
                <input type="file" accept="image/*" onChange={(e) => setPFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-700" />
              </div>
              <div className="sm:col-span-6">
                <label className="mb-1 block text-sm text-gray-700">Notes</label>
                <textarea rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={pNotes} onChange={(e) => setPNotes(e.target.value)} placeholder="Optional notes" />
              </div>
              <div className="sm:col-span-6 flex justify-end">
                <button disabled={submitting || !pAmount} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Payments */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Recent Payments</h2>
            {pError && <div className="mb-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{pError}</div>}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {pLoading ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
                  ) : payments.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No payments yet</td></tr>
                  ) : payments.map((p) => (
                    <tr key={p.PaymentID}>
                      <td className="px-4 py-3 text-sm text-gray-900">#{p.PaymentID}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{new Date(p.PaymentDate).toISOString().slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{Number(p.Amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{p.PaymentMethod || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{p.InvoiceNumber || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{p.PaymentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLease;
