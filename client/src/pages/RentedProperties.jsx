import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { propertyService } from '../services/propertyService';
import { leaseService } from '../services/leaseService';
import { api } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const RentedProperties = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [leasesByProp, setLeasesByProp] = useState({});
  const [docsByProp, setDocsByProp] = useState({});
  const [expanded, setExpanded] = useState({});
  const [preview, setPreview] = useState({ open: false, url: '', type: '' });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Decide source by role
        const role = (user?.role || '').toString().toLowerCase();
        let items = [];
        if (role === 'admin') {
          const list = await propertyService.getAllProperties();
          items = Array.isArray(list) ? list : (list?.data || []);
        } else if (role === 'landlord' || role === 'landloard') {
          const list = await propertyService.getLandlordProperties(user?.id);
          items = Array.isArray(list) ? list : (list?.data || []);
        } else {
          // Other roles see nothing
          items = [];
        }
        const occupied = items.filter(p => {
          const status = (p.Status ?? p.status ?? '').toString().toLowerCase();
          return status === 'occupied';
        });
        setProperties(occupied);
        // For each occupied property, fetch leases and documents
        const leasePromises = occupied.map(async (p) => {
          try {
            const propId = p.PropertyID || p.propertyId || p.id;
            const lr = await leaseService.getPropertyLeases(propId);
            return { id: propId, leases: Array.isArray(lr) ? lr : (lr?.data || []) };
          } catch (e) {
            console.warn('Failed to load leases for property', p.PropertyID, e);
            return { id: p.PropertyID, leases: [] };
          }
        });
        const docPromises = occupied.map(async (p) => {
          try {
            const propId = p.PropertyID || p.propertyId || p.id;
            const dr = await api.get(`/properties/${propId}/documents`);
            return { id: propId, docs: Array.isArray(dr) ? dr : (dr?.data || []) };
          } catch (e) {
            console.warn('Failed to load docs for property', p.PropertyID, e);
            return { id: p.PropertyID, docs: [] };
          }
        });
        const leaseResults = await Promise.all(leasePromises);
        const docResults = await Promise.all(docPromises);
        const leaseMap = {};
        leaseResults.forEach(({ id, leases }) => { leaseMap[id] = leases; });
        const docMap = {};
        docResults.forEach(({ id, docs }) => { docMap[id] = docs; });
        setLeasesByProp(leaseMap);
        setDocsByProp(docMap);
      } catch (err) {
        console.error('Error loading rented properties:', err);
        toast.error('Failed to load rented properties');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getFullDocUrl = (filePath) => {
    const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
    return `${base}${filePath}`;
  };

  const openPreview = (doc) => {
    if (!doc?.FilePath) return;
    const url = getFullDocUrl(doc.FilePath);
    const type = (doc.FileType || '').toLowerCase();
    setPreview({ open: true, url, type });
  };

  const closePreview = () => setPreview({ open: false, url: '', type: '' });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Rented Properties</h1>
          <p className="mt-2 text-sm text-gray-700">All properties currently occupied with tenant and documents.</p>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rented properties</h3>
            <p className="mt-1 text-sm text-gray-500">When properties are assigned to tenants, they will appear here.</p>
            <div className="mt-6">
              <Link to="/properties" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Go to Properties
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {properties.map((p) => {
            const propId = p.PropertyID || p.propertyId || p.id;
            const leases = leasesByProp[propId] || [];
            // Choose the most recent lease (assume first returned or sort by StartDate desc)
            const activeLease = leases.find(l => (l.Status ?? l.status) === 'Active') || leases[0];
            const docs = docsByProp[propId] || [];
            const isOpen = !!expanded[propId];
            return (
              <div key={propId} className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{p.Title || p.title || 'Property'}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">{p.Address || p.address}, {p.City || p.city}, {p.State || p.state} {p.ZipCode || p.zipCode}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Occupied</span>
                    <button
                      onClick={() => toggleExpand(propId)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {isOpen ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-2">Tenant / Lease</h4>
                        {activeLease ? (
                          <div className="space-y-1 text-sm text-gray-700">
                            <div><span className="font-medium">Tenant:</span> {activeLease.tenantName || activeLease.TenantName} ({activeLease.tenantEmail || activeLease.TenantEmail})</div>
                            <div><span className="font-medium">Phone:</span> {activeLease.tenantPhone || activeLease.TenantPhone || 'N/A'}</div>
                            <div><span className="font-medium">Start:</span> {activeLease.StartDate ? new Date(activeLease.StartDate).toLocaleDateString() : 'N/A'}</div>
                            <div><span className="font-medium">End:</span> {activeLease.EndDate ? new Date(activeLease.EndDate).toLocaleDateString() : 'N/A'}</div>
                            <div><span className="font-medium">Monthly Rent:</span> {activeLease.MonthlyRent ? `$${Number(activeLease.MonthlyRent).toLocaleString()}` : 'N/A'}</div>
                            <div><span className="font-medium">Deposit:</span> {activeLease.DepositAmount ? `$${Number(activeLease.DepositAmount).toLocaleString()}` : 'N/A'}</div>
                            <div><span className="font-medium">Status:</span> {activeLease.Status || 'Active'}</div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No lease data found.</p>
                        )}
                      </div>
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-2">Documents</h4>
                        {docs.length > 0 ? (
                          <ul className="divide-y divide-gray-200">
                            {docs.map((d, idx) => (
                              <li key={idx} className="py-2 flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-700"><span className="font-medium">Type:</span> {d.FileType || 'Document'}</p>
                                  <p className="text-xs text-gray-500">Uploaded: {d.UploadedAt ? new Date(d.UploadedAt).toLocaleString() : ''}</p>
                                </div>
                                {d.FilePath && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openPreview(d)}
                                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                      View
                                    </button>
                                    <a
                                      href={getFullDocUrl(d.FilePath)}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                      Download
                                    </a>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">No documents uploaded.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {preview.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closePreview}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Document Preview</h3>
              <div className="flex items-center gap-2">
                <a
                  href={preview.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Download
                </a>
                <button onClick={closePreview} className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900">Close</button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {/* Show PDF in iframe, images in img tag */}
              {/\.pdf($|\?)/i.test(preview.url) ? (
                <iframe title="Document" src={preview.url} className="w-full h-full" />
              ) : (
                <div className="w-full h-full overflow-auto flex items-center justify-center bg-gray-50">
                  <img src={preview.url} alt="Document" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentedProperties;
