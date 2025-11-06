import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { propertyService } from '../../services/propertyService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const PropertyForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    unitNumber: '',
    buildingName: '',
    floorNumber: '',
    propertyType: 'Flat', // Default to Flat
    amenities: [],
    isAvailable: true,
  });
  
  const [propertyTypes, setPropertyTypes] = useState([
    { id: 1, name: 'Flat' },
    { id: 2, name: 'Farm House' },
    { id: 3, name: 'Shop' },
    { id: 4, name: 'Office' },
  ]);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available amenities options
  const amenitiesOptions = [
    'Parking', 'Gym', 'Swimming Pool', 'Laundry', 'Air Conditioning',
    'Heating', 'WiFi', 'Cable TV', 'Furnished', 'Pet Friendly'
  ];

  // States for US
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  // Fetch property data if in edit mode
  useEffect(() => {
    const fetchProperty = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        const property = await propertyService.getPropertyById(id);
        
        // Format the property data to match our form state
        const formattedData = {
          ...property,
          price: property.price.toString(),
          bedrooms: property.bedrooms.toString(),
          bathrooms: property.bathrooms.toString(),
          area: property.area.toString(),
        };
        
        setFormData(formattedData);
      } catch (error) {
        console.error('Error fetching property:', error);
        toast.error('Failed to load property data');
        navigate('/properties');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'isAvailable') {
        setFormData(prev => ({ ...prev, [name]: checked }));
      } else {
        // Handle amenities checkboxes
        setFormData(prev => {
          const amenities = new Set(prev.amenities);
          if (checked) {
            amenities.add(value);
          } else {
            amenities.delete(value);
          }
          return { ...prev, amenities: Array.from(amenities) };
        });
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? (value ? parseFloat(value) : '') : value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'title', 'description', 'address', 'city', 'state', 'zipCode',
      'price', 'bedrooms', 'bathrooms', 'area'
    ];

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'This field is required';
      }
    });

    // Validate numbers
    const numberFields = ['price', 'bedrooms', 'bathrooms', 'area'];
    numberFields.forEach(field => {
      if (formData[field] && isNaN(formData[field])) {
        newErrors[field] = 'Must be a valid number';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Format data for API
      const formattedData = {
        title: formData.title,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        baseRentAmount: parseFloat(formData.price),
        propertyTypeId: 1, // This should be set based on your property type selection
        landlordId: user?.id, // Assuming user context has the landlord ID
        status: 'Vacant',
        details: {
          // Flat details (adjust based on property type)
          flatNumber: formData.unitNumber || '',
          buildingName: formData.buildingName || '',
          floorNumber: parseInt(formData.floorNumber) || 0,
          areaSqFt: parseFloat(formData.area) || 0
        },
        propertyType: 'Flat', // This should be dynamic based on your form
        price: parseFloat(formData.price),
        bedrooms: parseInt(formData.bedrooms, 10),
        bathrooms: parseFloat(formData.bathrooms),
        area: parseInt(formData.area, 10),
      };

      if (isEditMode) {
        await propertyService.updateProperty(id, formattedData);
        toast.success('Property updated successfully');
      } else {
        await propertyService.createProperty(formattedData);
        toast.success('Property created successfully');
      }
      
      navigate('/properties');
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error(error.response?.data?.message || 'Failed to save property');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Form field component for better organization
  const FormField = ({ label, name, type = 'text', placeholder, required = true, ...props }) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        className={`mt-1 block w-full rounded-md border ${errors[name] ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
        placeholder={placeholder}
        {...props}
      />
      {errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Property' : 'Add New Property'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode 
            ? 'Update the property details below.'
            : 'Fill in the details below to add a new property.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <FormField
                  label="Property Title"
                  name="title"
                  placeholder="e.g., Modern Apartment in Downtown"
                />
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border ${errors.description ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                  placeholder="Detailed description of the property..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>

              {/* Property Type Selection */}
              <div className="sm:col-span-6">
                <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700">
                  Property Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="propertyType"
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  {propertyTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-6">
                <FormField
                  label="Address"
                  name="address"
                  placeholder="123 Main St"
                />
              </div>

              {/* Property Type Specific Fields */}
              {formData.propertyType === 'Flat' && (
                <>
                  <div className="sm:col-span-3">
                    <FormField
                      label="Unit/Apartment Number"
                      name="unitNumber"
                      placeholder="e.g., 4B"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <FormField
                      label="Building Name"
                      name="buildingName"
                      placeholder="e.g., Sunshine Apartments"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FormField
                      type="number"
                      label="Floor Number"
                      name="floorNumber"
                      placeholder="e.g., 2"
                    />
                  </div>
                </>
              )}

              {formData.propertyType === 'Farm House' && (
                <div className="sm:col-span-6">
                  <FormField
                    type="number"
                    step="0.01"
                    label="Land Area (acres)"
                    name="landArea"
                    placeholder="e.g., 1.5"
                  />
                </div>
              )}
                />
              </div>

              <div className="sm:col-span-2">
                <FormField
                  label="City"
                  name="city"
                  placeholder="New York"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border ${errors.state ? 'border-red-300' : 'border-gray-300'} py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm`}
                >
                  <option value="">Select a state</option>
                  {states.map(state => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
              </div>

              <div className="sm:col-span-2">
                <FormField
                  label="ZIP Code"
                  name="zipCode"
                  placeholder="10001"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">Property Details</h2>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <FormField
                  label="Price ($)"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2000.00"
                />
              </div>

              <div className="sm:col-span-1">
                <FormField
                  label="Bedrooms"
                  name="bedrooms"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="2"
                />
              </div>

              <div className="sm:col-span-1">
                <FormField
                  label="Bathrooms"
                  name="bathrooms"
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="1.5"
                />
              </div>

              <div className="sm:col-span-2">
                <FormField
                  label="Area (sq ft)"
                  name="area"
                  type="number"
                  min="0"
                  placeholder="1200"
                />
              </div>

              <div className="sm:col-span-6">
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700">Amenities</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {amenitiesOptions.map((amenity) => (
                      <div key={amenity} className="flex items-center">
                        <input
                          id={`amenity-${amenity}`}
                          name="amenities"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          value={amenity}
                          checked={formData.amenities.includes(amenity)}
                          onChange={handleChange}
                        />
                        <label htmlFor={`amenity-${amenity}`} className="ml-2 text-sm text-gray-700">
                          {amenity}
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="sm:col-span-6">
                <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      id="isAvailable"
                      name="isAvailable"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.isAvailable}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="isAvailable" className="font-medium text-gray-700">
                      This property is currently available for rent
                    </label>
                    <p className="text-gray-500">Uncheck if the property is not available at the moment.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            to="/properties"
            className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : isEditMode ? 'Update Property' : 'Create Property'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PropertyForm;
