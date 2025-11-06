import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { propertyService } from '../services/propertyService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        console.log('Fetching properties...');
        const response = await propertyService.getAllProperties();
        console.log('API Response:', response);
        
        // Handle different response structures
        let propertiesData = [];
        
        if (Array.isArray(response)) {
          // If response is already an array, use it directly
          propertiesData = response;
        } else if (response && Array.isArray(response.data)) {
          // If response has a data property that's an array
          propertiesData = response.data;
        } else if (response && response.data && Array.isArray(response.data.properties)) {
          // If response has a data.properties that's an array
          propertiesData = response.data.properties;
        }
        
        console.log('Processed properties:', propertiesData);
        setProperties(propertiesData);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Failed to load properties. Please try again later.');
        toast.error('Failed to load properties');
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const canAddProperty = user && (user.role === 'Admin' || user.role === 'Landlord');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Error Loading Properties</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all available rental properties.
          </p>
        </div>
        {canAddProperty && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              to="/properties/add"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              Add Property
            </Link>
          </div>
        )}
      </div>
      
      {properties.length === 0 ? (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No properties</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding a new property.
            </p>
            {canAddProperty && (
              <div className="mt-6">
                <Link
                  to="/properties/add"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  New Property
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      >
                        Property
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Address
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Price
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Status
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">View</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {properties.map((property, index) => {
                      // Use PropertyID with fallback to array index
                      const propertyId = property.PropertyID || `property-${index}`;

                      // Derive display values with safe fallbacks
                      const bedrooms = (
                        property.Bedrooms ?? property.bedrooms ?? property.details?.Bedrooms ?? property.details?.bedrooms ?? 0
                      );
                      const bathrooms = (
                        property.Bathrooms ?? property.bathrooms ?? property.details?.Bathrooms ?? property.details?.bathrooms ?? 0
                      );
                      const typeName = property.propertyTypeName || property.PropertyType || '';
                      const isFarmHouse = String(typeName).toLowerCase() === 'farm house';
                      const area = isFarmHouse
                        ? (property.details?.LandArea ?? property.details?.landArea ?? 0)
                        : (property.details?.AreaSqFt ?? property.details?.areaSqFt ?? property.AreaSqFt ?? property.area ?? 0);
                      const areaUnit = isFarmHouse ? 'acres' : 'sqft';
                      const firstImageSrc = property.images && property.images.length > 0
                        ? (property.images[0].FilePath || property.images[0].filePath || property.images[0])
                        : null;
                      const amenitiesLine = Array.isArray(property.amenities) && property.amenities.length > 0
                        ? property.amenities.join(', ')
                        : null;

                      return (
                        <tr key={propertyId}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                {firstImageSrc ? (
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={firstImageSrc}
                                    alt=""
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <svg
                                      className="h-6 w-6 text-gray-500"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-gray-900">{property.Title || 'Untitled Property'}</div>
                                <div className="text-gray-500">
                                  {bedrooms} beds · {bathrooms} baths · {area} {areaUnit}
                                </div>
                                {amenitiesLine && (
                                  <div className="text-gray-400 text-xs truncate max-w-xs">
                                    {amenitiesLine}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <div className="text-gray-900">{property.Address || 'No address provided'}</div>
                            <div className="text-gray-500">
                              {property.City || ''}{property.City && property.State ? ', ' : ''} 
                              {property.State || ''} {property.zipCode || ''}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span className="font-medium text-gray-900">
                              {property.BaseRentAmount ? `${Number(property.BaseRentAmount).toLocaleString()}` : 'N/A'}
                            </span>
                            <span className="text-gray-500">/month</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                property.Status === 'Vacant' || property.isAvailable
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {property.Status === 'Vacant' || property.isAvailable ? 'Available' : 'Rented'}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                            <Link
                              to={`/properties/${propertyId}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View<span className="sr-only">, {property.Title || 'property'}</span>
                            </Link>
                            <Link
                              to={`/properties/${propertyId}/edit`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit<span className="sr-only">, {property.Title || 'property'}</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyList;
