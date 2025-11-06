import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertyService } from '../services/propertyService';
import { leaseService } from '../services/leaseService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [property, setProperty] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    BaseRentAmount: 0,
    bedrooms: 0,
    bathrooms: 0,
    area: 0,
    status: 'Vacant',
    details: {}
  });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [creatingLease, setCreatingLease] = useState(false);
  const [assignForm, setAssignForm] = useState({
    tenantId: '',
    rentAmount: '',
    securityAmount: '',
    startDate: '',
    endDate: '',
    leaseType: '',
    aadharFiles: [],
    agreementFiles: [],
    licenseFiles: []
  });

  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return; // invalid id like 'rented' – do not fetch
    }

    const fetchProperty = async () => {
      try {
        setLoading(true);
        const propertyData = await propertyService.getPropertyById(numericId);

        if (!propertyData) {
          throw new Error('Property not found');
        }
        
        // Map the API response to the component's state structure
        const rawStatus = (propertyData.Status ?? propertyData.status ?? 'Vacant');
        const statusVal = String(rawStatus).trim();
        const mappedProperty = {
          ...propertyData,
          // Normalize IDs and ownership
          id: propertyData.PropertyID ?? propertyData.id ?? propertyData.propertyId,
          landlordId: propertyData.LandlordID ?? propertyData.landlordId,
          // Normalize basic fields for display
          title: propertyData.Title ?? propertyData.title ?? '',
          description: propertyData.Description ?? propertyData.description ?? '',
          address: propertyData.Address ?? propertyData.address ?? '',
          city: propertyData.City ?? propertyData.city ?? '',
          state: propertyData.State ?? propertyData.state ?? '',
          zipCode: propertyData.ZipCode ?? propertyData.zipCode ?? '',
          createdAt: propertyData.CreatedAt ?? propertyData.createdAt ?? propertyData.CreatedDate ?? null,
          landlord: propertyData.landlord || {
            name: propertyData.landlordName || propertyData.LandlordName || propertyData.OwnerName || '',
            email: propertyData.landlordEmail || propertyData.LandlordEmail || '',
            phone: propertyData.landlordPhone || propertyData.LandlordPhone || ''
          },
          // Normalize pricing and status
          BaseRentAmount: propertyData.BaseRentAmount ?? propertyData.baseRentAmount ?? 0,
          Status: statusVal,
          isAvailable: String(statusVal).toLowerCase() !== 'occupied',
          propertyTypeName: propertyData.propertyTypeName || propertyData.PropertyType || '',
          // Map details from the property object or details object
          bedrooms: propertyData.Bedrooms ?? propertyData.bedrooms ?? propertyData.details?.bedrooms ?? 0,
          bathrooms: propertyData.Bathrooms ?? propertyData.bathrooms ?? propertyData.details?.bathrooms ?? 0,
          area: propertyData.AreaSqFt ?? propertyData.areaSqFt ?? propertyData.details?.areaSqFt ?? 0,
          // Include all details
          details: {
            ...propertyData.details,
            // For flat type
            flatNumber: propertyData.details?.flatNumber,
            buildingName: propertyData.details?.buildingName,
            floorNumber: propertyData.details?.floorNumber,
            // For farm house
            landArea: propertyData.details?.landArea,
            hasPool: propertyData.details?.hasPool || false,
            hasGarden: propertyData.details?.hasGarden || false,
            // For shop/office
            commercialLicenseNo: propertyData.details?.commercialLicenseNo
          }
        };
        
        setProperty(mappedProperty);
        // Prime assign form defaults
        setAssignForm(prev => ({
          ...prev,
          rentAmount: propertyData.BaseRentAmount ?? propertyData.baseRentAmount ?? '',
          securityAmount: propertyData.SecurityAmount ?? propertyData.securityAmount ?? '',
          leaseType: propertyData.propertyTypeName || propertyData.PropertyType || ''
        }));
      } catch (error) {
        console.error('Error fetching property:', error);
        toast.error('Failed to load property details');
        navigate('/properties');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, navigate]);

  // Move these handlers to component scope so they are available to JSX
  const openAssignModal = async () => {
    try {
      setLoadingTenants(true);
      const list = await userService.getTenants();
      setTenants(Array.isArray(list) ? list : (list?.data || []));
      setAssignOpen(true);
    } catch (e) {
      toast.error('Failed to load tenants');
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleAssignChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setAssignForm(prev => ({ ...prev, [name]: Array.from(files) }));
    } else {
      setAssignForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.tenantId || !assignForm.rentAmount || !assignForm.startDate) {
      toast.error('Tenant, Rent Amount and Start Date are required');
      return;
    }
    try {
      setCreatingLease(true);
      const payload = {
        propertyId: Number(id),
        tenantId: Number(assignForm.tenantId),
        rentAmount: Number(assignForm.rentAmount),
        securityAmount: assignForm.securityAmount ? Number(assignForm.securityAmount) : null,
        startDate: assignForm.startDate,
        endDate: assignForm.endDate || null,
        leaseType: assignForm.leaseType || null
      };
      const { lease } = await leaseService.createLease(payload);

      // Upload documents per type
      if (lease?.LeaseID) {
        if (assignForm.aadharFiles.length) {
          await leaseService.uploadDocuments(lease.LeaseID, assignForm.aadharFiles, 'Aadhar');
        }
        if (assignForm.agreementFiles.length) {
          await leaseService.uploadDocuments(lease.LeaseID, assignForm.agreementFiles, 'LeaseAgreement');
        }
        if (assignForm.licenseFiles.length) {
          await leaseService.uploadDocuments(lease.LeaseID, assignForm.licenseFiles, 'CommercialLicense');
        }
      }

      toast.success('Tenant assigned and lease created');
      setAssignOpen(false);
      // Refresh details
      const refreshed = await propertyService.getPropertyById(id);
      setProperty(refreshed);
    } catch (err) {
      console.error('Assign tenant failed:', err);
      const srv = err?.response?.data || {};
      const msg = srv.message || 'Failed to assign tenant';
      const more = srv.error ? `: ${srv.error}` : '';
      const details = srv.details;
      if (details && (details.ownerId || details.requesterId)) {
        toast.error(`${msg}${more} (ownerId: ${details.ownerId}, requesterId: ${details.requesterId})`);
      } else {
        toast.error(`${msg}${more}`);
      }
    } finally {
      setCreatingLease(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      try {
        setDeleting(true);
        await propertyService.deleteProperty(id);
        toast.success('Property deleted successfully');
        navigate('/properties');
      } catch (error) {
        console.error('Error deleting property:', error);
        toast.error('Failed to delete property');
        setDeleting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Property Not Found</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">The requested property could not be found.</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <Link
            to="/properties"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  const role = (user?.role || '').toString().toLowerCase();
  const isAdmin = role === 'admin';
  const isLandlord = role === 'landlord' || role === 'landloard';
  const isOwner = !!user && (isAdmin || (String(user.id) === String(property.landlordId)));
  // Show button for Admin or any Landlord; backend will still enforce owner-only on create
  const canAssign = property.isAvailable && (isAdmin || isLandlord);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="lg:flex lg:items-center lg:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {property.title}
          </h2>
          <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {[property.address, property.city, property.state].filter(Boolean).join(', ')} {property.zipCode || ''}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="font-medium">{property.BaseRentAmount ? Number(property.BaseRentAmount).toLocaleString() : 'N/A'}</span>
              <span className="mx-1">/</span>
              <span>month</span>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                property.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {property.isAvailable ? 'Available' : 'Rented'}
              </span>
            </div>
          </div>
        </div>
        {(isOwner || canAssign) && (
          <div className="mt-5 flex flex-wrap items-center gap-3 lg:mt-0 lg:ml-4">
            {isOwner && (
              <span>
                <Link
                  to={`/properties/${property.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit
                </Link>
              </span>
            )}
            {canAssign && (
              <span>
                <button
                  type="button"
                  onClick={openAssignModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Assign Tenant
                </button>
              </span>
            )}
            {isOwner && (
              <span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Delete
                    </>
                  )}
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Property Information</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Detailed information about the property.</p>
        </div>
        
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {property.description?.trim() ? property.description : 'No description provided.'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {property.address || '-'}<br />
                {[property.city, property.state].filter(Boolean).join(', ')} {property.zipCode || ''}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Price</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {property.BaseRentAmount ? `${Number(property.BaseRentAmount).toLocaleString()}` : 'N/A'} / month
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Property Details</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-gray-500">Bedrooms</p>
                    <p className="font-medium">{property.bedrooms || 'N/A'}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-gray-500">Bathrooms</p>
                    <p className="font-medium">{property.bathrooms || 'N/A'}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-gray-500">Area</p>
                    <p className="font-medium">
                      {property.area ? `${Number(property.area).toLocaleString()} sq ft` : 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        property.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {property.status || (property.isAvailable ? 'Available' : 'Not Available')}
                      </span>
                    </p>
                  </div>
                  
                  {/* Property Type Specific Details */}
                  {property.details && (
                    <>
                      {/* Flat Details */}
                      {property.details.flatNumber && (
                        <div className="col-span-2">
                          <p className="text-gray-500">Flat Details</p>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <p className="text-sm text-gray-500">Flat Number</p>
                              <p className="font-medium">{property.details.flatNumber}</p>
                            </div>
                            {property.details.buildingName && (
                              <div>
                                <p className="text-sm text-gray-500">Building</p>
                                <p className="font-medium">{property.details.buildingName}</p>
                              </div>
                            )}
                            {property.details.floorNumber && (
                              <div>
                                <p className="text-sm text-gray-500">Floor</p>
                                <p className="font-medium">{property.details.floorNumber}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Farm House Details */}
                      {property.details.landArea && (
                        <div className="col-span-2">
                          <p className="text-gray-500">Farm House Details</p>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <p className="text-sm text-gray-500">Land Area</p>
                              <p className="font-medium">{property.details.landArea} sq ft</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Amenities</p>
                              <p className="font-medium">
                                {[property.details.hasPool && 'Pool', property.details.hasGarden && 'Garden']
                                  .filter(Boolean)
                                  .join(', ') || 'None'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Shop/Office Details */}
                      {property.details.commercialLicenseNo && (
                        <div className="col-span-2">
                          <p className="text-gray-500">Commercial Details</p>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <p className="text-sm text-gray-500">License No.</p>
                              <p className="font-medium">{property.details.commercialLicenseNo}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </dd>
            </div>
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Amenities</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((amenity, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Listed By</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {property.landlord?.name?.trim()
                  ? property.landlord.name
                  : (property.landlordId ? 'Landlord' : 'Admin')}
                {property.landlord?.email && (
                  <a 
                    href={`mailto:${property.landlord.email}`}
                    className="ml-2 text-blue-600 hover:text-blue-500"
                  >
                    {property.landlord.email}
                  </a>
                )}
                {property.landlord?.phone && (
                  <a 
                    href={`tel:${property.landlord.phone}`}
                    className="ml-2 text-blue-600 hover:text-blue-500"
                  >
                    {property.landlord.phone}
                  </a>
                )}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Listed On</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {property.createdAt && !isNaN(new Date(property.createdAt))
                  ? new Date(property.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : '-'}
              </dd>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 px-4 py-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/properties"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to Properties
          </Link>
          {(isOwner || canAssign) && (
            <div className="flex flex-wrap items-center gap-3">
              {isOwner && (
                <Link
                  to={`/properties/${property.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793z" />
                  </svg>
                  Edit Property
                </Link>
              )}
              {canAssign && (
                <button
                  onClick={openAssignModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Assign Tenant
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium">Assign Tenant & Create Lease</h3>
            </div>
            <form onSubmit={submitAssign} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                <select
                  name="tenantId"
                  value={assignForm.tenantId}
                  onChange={handleAssignChange}
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">{loadingTenants ? 'Loading tenants...' : 'Select tenant'}</option>
                  {tenants.map(t => (
                    <option key={t.UserID} value={t.UserID}>{t.Name} ({t.Email})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount ($)</label>
                  <input type="number" name="rentAmount" step="0.01" min="0" value={assignForm.rentAmount} onChange={handleAssignChange} className="block w-full rounded-md border border-gray-300 py-2 px-3" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Security Amount ($)</label>
                  <input type="number" name="securityAmount" step="0.01" min="0" value={assignForm.securityAmount} onChange={handleAssignChange} className="block w-full rounded-md border border-gray-300 py-2 px-3" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" name="startDate" value={assignForm.startDate} onChange={handleAssignChange} className="block w-full rounded-md border border-gray-300 py-2 px-3" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                  <input type="date" name="endDate" value={assignForm.endDate} onChange={handleAssignChange} className="block w-full rounded-md border border-gray-300 py-2 px-3" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lease Type</label>
                <input type="text" name="leaseType" value={assignForm.leaseType} onChange={handleAssignChange} className="block w-full rounded-md border border-gray-300 py-2 px-3" readOnly />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar (images/PDF)</label>
                  <input type="file" name="aadharFiles" multiple accept="image/*,application/pdf" onChange={handleAssignChange} className="block w-full text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lease Agreement (PDF)</label>
                  <input type="file" name="agreementFiles" multiple accept="application/pdf" onChange={handleAssignChange} className="block w-full text-sm" />
                </div>
                {(property.propertyTypeName === 'Shop' || property.propertyTypeName === 'Office') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commercial License</label>
                    <input type="file" name="licenseFiles" multiple accept="image/*,application/pdf" onChange={handleAssignChange} className="block w-full text-sm" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t mt-4">
                <button type="button" onClick={() => setAssignOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700">Cancel</button>
                <button type="submit" disabled={creatingLease} className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50">
                  {creatingLease ? 'Assigning...' : 'Assign Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
