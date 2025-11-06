import React, { useEffect, useMemo, useState } from 'react';
import { maintenanceService } from '../services/maintenanceService';
import { leaseService } from '../services/leaseService';
import { useAuth } from '../context/AuthContext';

const Maintenance = () => {
  const { user } = useAuth();
  const role = (user?.role || user?.RoleName || '').toString();
  const isTenant = role === 'Tenant';
  const isAdmin = role === 'Admin';
  const isLandlord = role === 'Landlord';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Tenant form state
  const [propertyId, setPropertyId] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // For tenant, preload active lease to get propertyId
  useEffect(() => {
    const init = async () => {
      if (!isTenant) return;
      try {
        const res = await leaseService.getMyActiveLease(30);
        if (res?.lease?.PropertyID) setPropertyId(String(res.lease.PropertyID));
      } catch (_) {}
    };
    init();
  }, [isTenant]);

  const fetchList = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await maintenanceService.list({ status: statusFilter || undefined, page, pageSize });
      setList(Array.isArray(res?.items) ? res.items : []);
      setTotal(res?.total || 0);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to load maintenance requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [statusFilter, page, pageSize]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!propertyId || !description.trim()) return;
    try {
      setCreating(true);
      await maintenanceService.create({ propertyId: Number(propertyId), description: description.trim() });
      setDescription('');
      await fetchList();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await maintenanceService.updateStatus(id, status);
      await fetchList();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to update status');
    }
  };

  const handleReply = async (id) => {
    const message = window.prompt('Reply message to tenant:');
    if (!message) return;
    try {
      await maintenanceService.reply(id, message);
      await fetchList();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to send reply');
    }
  };

  const items = useMemo(() => list, [list]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Maintenance</h1>
        <div className="flex items-center gap-3">
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
          >
            <option value="">All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
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

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {isTenant && (
        <form onSubmit={handleCreate} className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="mb-1 block text-sm text-gray-700">Property ID</label>
            <input
              type="number"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              placeholder="Property ID"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-gray-700">Description</label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
            />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Submitting...' : 'Create Request'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No maintenance requests</td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.RequestID}>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">#{r.RequestID}</div>
                    <div className="text-xs text-gray-600">{new Date(r.CreatedAt).toISOString().slice(0, 16).replace('T',' ')}</div>
                    <div className="mt-1 text-sm text-gray-700">{r.Description}</div>
                    {/* Comments thread */}
                    <MaintenanceComments requestId={r.RequestID} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{r.PropertyTitle || '-'}</div>
                    <div className="text-xs text-gray-500">#{r.PropertyID} {r.Address || ''} {r.City ? `, ${r.City}` : ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{r.TenantName || '-'}</div>
                    <div className="text-xs text-gray-500">{r.TenantEmail || ''} {r.TenantPhone ? `• ${r.TenantPhone}` : ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{r.Status}</span>
                    {r.ResolvedAt && (
                      <div className="text-xs text-gray-500 mt-1">Resolved: {new Date(r.ResolvedAt).toISOString().slice(0, 16).replace('T',' ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(isAdmin || isLandlord) && (
                      <div className="inline-flex gap-2">
                        <select
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                          value={r.Status}
                          onChange={(e) => handleStatus(r.RequestID, e.target.value)}
                        >
                          <option>Pending</option>
                          <option>In Progress</option>
                          <option>Completed</option>
                        </select>
                        <button
                          onClick={() => handleReply(r.RequestID)}
                          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
                        >Reply</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
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

const MaintenanceComments = ({ requestId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await maintenanceService.listComments(requestId);
      setComments(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to load comments');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [requestId]);

  const onAdd = async (e) => {
    e.preventDefault();
    if (!text && !file) return;
    try {
      setSubmitting(true);
      await maintenanceService.addComment(requestId, { comment: text, attachment: file });
      setText(''); setFile(null);
      await load();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to add comment');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="mt-3 rounded-md border border-gray-200">
      <div className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50">Comments</div>
      <div className="max-h-48 overflow-y-auto px-3 py-2 space-y-2">
        {loading ? <div className="text-xs text-gray-500">Loading...</div> : comments.length === 0 ? (
          <div className="text-xs text-gray-500">No comments</div>
        ) : comments.map(c => (
          <div key={c.CommentID} className="text-xs text-gray-800">
            <div className="text-gray-600">{new Date(c.CreatedAt).toISOString().slice(0,16).replace('T',' ')}</div>
            {c.Comment && <div>{c.Comment}</div>}
            {c.AttachmentPath && (
              <a href={c.AttachmentPath} target="_blank" rel="noreferrer" className="text-blue-600 underline">Attachment</a>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={onAdd} className="flex items-center gap-2 border-t px-3 py-2">
        <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Add a comment" className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none" />
        <input type="file" onChange={(e)=>setFile(e.target.files?.[0]||null)} className="text-xs" />
        <button disabled={submitting} className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-white disabled:opacity-50">Post</button>
      </form>
      {error && <div className="px-3 py-2 text-xs text-red-600">{error}</div>}
    </div>
  );
};

export default Maintenance;
