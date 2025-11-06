import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { propertyService } from '../services/propertyService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

// Form field component
const FormField = ({ 
  label, 
  name, 
  type = 'text', 
  value, 
  checked,
  onChange, 
  error, 
  placeholder, 
  options, 
  required,
  ...props 
}) => {
  if (type === 'checkbox') {
    return (
      <div>
        <div className="flex items-center">
          <input
            id={name}
            name={name}
            type="checkbox"
            checked={checked ?? Boolean(value)}
            onChange={onChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            {...props}
          />
          <label htmlFor={name} className="ml-2 text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={name} className="block text-gray-700 text-sm font-bold mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1">
        {type === 'select' ? (
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${error ? 'border-red-500' : ''}`}
            {...props}
          >
            <option value="">Select {label}</option>
            {options && options.map((option, index) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? (option.label || option.value) : option;
              const key = optionValue || `option-${index}`;

              return (
                <option key={key} value={optionValue}>
                  {optionLabel}
                </option>
              );
            })}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            id={name}
            name={name}
            rows={3}
            value={value}
            onChange={onChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32 ${error ? 'border-red-500' : ''}`}
            placeholder={placeholder}
            {...props}
          />
        ) : (
          <input
            type={type}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${error ? 'border-red-500' : ''}`}
            placeholder={placeholder}
            {...props}
          />
        )}
        {error && <p className="mt-1 text-xs italic text-red-500">{error}</p>}
      </div>
    </div>
  );
};

const PropertyForm = () => {
  const { id } = useParams();
  // Treat 'undefined'/'null'/empty as not in edit mode
  const isValidId = id && id !== 'undefined' && id !== 'null';
  const isEditMode = Boolean(isValidId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [propertyTypes, setPropertyTypes] = useState([]);
  const [propertyTypesLoading, setPropertyTypesLoading] = useState(true);

  // States and Union Territories of India
  const states = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry'
  ];
  
  const [formData, setFormData] = useState({
    // Basic info
    title: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    price: '',
    securityAmount: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    
    // Property type specific
    propertyType: '',
    propertyTypeId: '',
    
    // Flat specific
    unitNumber: '',
    buildingName: '',
    floorNumber: '',
    
    // Farm House specific
    landArea: '',
    hasPool: false,
    hasGarden: false,
    
    // Shop/Office specific
    commercialLicenseNo: '',
    
    // Common
    isAvailable: true,
    amenities: [],
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [amenityInput, setAmenityInput] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    const fetchPropertyTypes = async () => {
      try {
        setPropertyTypesLoading(true);
        const types = await propertyService.getPropertyTypes();
        const formattedTypes = (types || []).map((type) => ({
          id: Number(type.PropertyTypeID || type.propertyTypeId || type.id || 0),
          name: type.TypeName || type.typeName || type.name,
        })).filter((type) => type.id && type.name);

        setPropertyTypes(formattedTypes);

        if (!isEditMode && formattedTypes.length > 0) {
          setFormData((prev) => ({
            ...prev,
            propertyType: formattedTypes[0].name,
            propertyTypeId: String(formattedTypes[0].id),
          }));
        }
      } catch (error) {
        console.error('Failed to load property types:', error);
        toast.error('Unable to load property types');
      } finally {
        setPropertyTypesLoading(false);
      }
    };

    fetchPropertyTypes();
  }, [isEditMode]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle property type change
  const handlePropertyTypeChange = (e) => {
    const selectedId = Number(e.target.value);
    const selectedType = propertyTypes.find((type) => type.id === selectedId);
    setFormData(prev => ({
      ...prev,
      propertyType: selectedType?.name || '',
      propertyTypeId: selectedType ? String(selectedType.id) : '',
    }));
  };

  // Handle adding amenities
  const handleAddAmenity = () => {
    if (amenityInput && !formData.amenities.includes(amenityInput)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenityInput]
      }));
      setAmenityInput('');
    }
  };

  // Handle removing amenity
  const handleRemoveAmenity = (amenityToRemove) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(amenity => amenity !== amenityToRemove)
    }));
  };

  // Handle image selection
  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(files);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['title', 'description', 'address', 'city', 'price', 'propertyTypeId'];
    
    // Common required fields
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'This field is required';
      }
    });

    // Property type specific validations
    if (formData.propertyType === 'Flat') {
      if (!formData.unitNumber) newErrors.unitNumber = 'Unit number is required';
      if (!formData.floorNumber) newErrors.floorNumber = 'Floor number is required';
    } else if (formData.propertyType === 'Farm House') {
      if (!formData.landArea) newErrors.landArea = 'Land area is required';
    }

    // Number validations
    const numberFields = ['price', 'securityAmount', 'bedrooms', 'bathrooms', 'area', 'floorNumber'];
    numberFields.forEach(field => {
      if (formData[field] && isNaN(formData[field])) {
        newErrors[field] = 'Must be a valid number';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    try {
      setSubmitting(true);
      
      // Format data for API based on property type
      const formattedData = {
        title: formData.title,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        baseRentAmount: parseFloat(formData.price),
        securityAmount: formData.securityAmount !== '' ? parseFloat(formData.securityAmount) : null,
        propertyTypeId: Number(formData.propertyTypeId),
        propertyType: formData.propertyType,
        landlordId: user?.id,
        status: formData.isAvailable ? 'Vacant' : 'Occupied',
        bedrooms: formData.bedrooms !== '' ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms !== '' ? parseFloat(formData.bathrooms) : null,
        // Store a flat, comma-separated amenities string in base table
        amenitiesText: Array.isArray(formData.amenities) && formData.amenities.length > 0 ? formData.amenities.join(',') : null,
        // Store area in base table for all types
        areaSqFt: formData.area !== '' ? parseFloat(formData.area) : null,
        details: {}
      };

      // Add type-specific details
      if (formData.propertyType === 'Flat') {
        // Map to FlatDetails schema (AreaSqFt, FloorNumber, FlatNumber, BuildingName)
        formattedData.details = {
          flatNumber: formData.unitNumber || '',
          buildingName: formData.buildingName || '',
          floorNumber: parseInt(formData.floorNumber) || 0,
          areaSqFt: parseFloat(formData.area) || 0
        };
      } else if (formData.propertyType === 'Farm House') {
        // Map to FarmHouseDetails schema (LandArea, HasPool, HasGarden)
        formattedData.details = {
          landArea: formData.landArea !== '' ? parseFloat(formData.landArea) : null,
          hasPool: formData.hasPool || false,
          hasGarden: formData.hasGarden || false
        };
      } else if (['Shop', 'Office'].includes(formData.propertyType)) {
        // Map to ShopOfficeDetails schema (FloorNumber, AreaSqFt, CommercialLicenseNo)
        formattedData.details = {
          floorNumber: parseInt(formData.floorNumber) || 0,
          areaSqFt: parseFloat(formData.area) || 0,
          commercialLicenseNo: formData.commercialLicenseNo || ''
        };
      }

      let createdOrUpdated;
      if (isEditMode) {
        createdOrUpdated = await propertyService.updateProperty(id, formattedData);
        toast.success('Property updated successfully');
      } else {
        createdOrUpdated = await propertyService.createProperty(formattedData);
        toast.success('Property created successfully');
      }

      // Optional image upload after create/update
      const propertyId = isEditMode
        ? Number(id)
        : (createdOrUpdated?.PropertyID || createdOrUpdated?.propertyId || createdOrUpdated?.id);

      if (propertyId && images.length > 0) {
        try {
          await propertyService.uploadPropertyImages(propertyId, images);
          toast.success('Images uploaded successfully');
        } catch (imgErr) {
          console.warn('Image upload failed or endpoint unavailable:', imgErr);
          toast.info('Images will be supported once the upload endpoint is ready.');
        }
      }
      
      navigate('/properties');
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error(error.response?.data?.message || 'Error saving property');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch property data if in edit mode
  useEffect(() => {
    const fetchProperty = async () => {
      if (!isEditMode) return;
      // Also guard against invalid numeric id
      const numericId = Number(id);
      if (!Number.isFinite(numericId) || numericId <= 0) return;
      
      try {
        setLoading(true);
        const property = await propertyService.getPropertyById(numericId);
        const details = property.details || {};

        // Map the API response to form data (support both lower and upper-case keys from DB)
        const formData = {
          // Basic info
          title: property.Title ?? property.title ?? '',
          description: property.Description ?? property.description ?? '',
          address: property.Address ?? property.address ?? '',
          city: property.City ?? property.city ?? '',
          state: property.State ?? property.state ?? '',
          zipCode: property.ZipCode ?? property.zipCode ?? '',
          price: property.BaseRentAmount ?? property.baseRentAmount ?? '',
          securityAmount: property.SecurityAmount ?? property.securityAmount ?? '',
          bedrooms: property.Bedrooms ?? property.bedrooms ?? details.bedrooms ?? '',
          bathrooms: property.Bathrooms ?? property.bathrooms ?? details.bathrooms ?? '',
          area: property.AreaSqFt ?? property.areaSqFt ?? details.areaSqFt ?? '',
          
          // Property type
          propertyType: property.propertyTypeName || property.PropertyType || '',
          propertyTypeId: property.PropertyTypeID ? String(property.PropertyTypeID) : (property.propertyTypeId ? String(property.propertyTypeId) : ''),
          
          // Common
          isAvailable: (property.Status ?? property.status) !== 'Occupied',
          amenities: Array.isArray(property.amenities)
            ? property.amenities
            : (property.AmenitiesText || property.amenitiesText || '')
                .split(',')
                .map(a => a.trim())
                .filter(Boolean),
        };
        
        // Add type-specific fields
        const typeName = property.propertyTypeName || property.PropertyType || '';
        if (typeName === 'Flat') {
          formData.unitNumber = details.flatNumber || '';
          formData.buildingName = details.buildingName || '';
          formData.floorNumber = details.floorNumber || '';
        } else if (typeName === 'Farm House') {
          formData.landArea = details.landArea || '';
          formData.hasPool = details.hasPool || false;
          formData.hasGarden = details.hasGarden || false;
        } else if (['Shop', 'Office'].includes(typeName)) {
          formData.commercialLicenseNo = details.commercialLicenseNo || '';
          formData.floorNumber = details.floorNumber || '';
        }
        
        setFormData(formData);
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

  // Render loading state
  if (loading || propertyTypesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {isEditMode ? 'Edit Property' : 'Add New Property'}
        </h1>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="border-b border-gray-200 pb-5">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Property Information</h3>
            <p className="mt-1 text-sm text-gray-500">
              Provide details about the property you're {isEditMode ? 'editing' : 'adding'}.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Title */}
            <div className="sm:col-span-2">
              <FormField
                label="Property Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                error={errors.title}
                placeholder="e.g., Modern Apartment in Downtown"
                required
              />
            </div>
            
            {/* Description */}
            <div>
              <FormField
                label="Description"
                name="description"
                type="textarea"
                value={formData.description}
                onChange={handleChange}
                error={errors.description}
                placeholder="Detailed description of the property..."
                required
              />
            </div>
            
            {/* Property Type */}
            <div>
              <FormField
                label="Property Type"
                name="propertyTypeId"
                type="select"
                value={formData.propertyTypeId}
                onChange={handlePropertyTypeChange}
                options={propertyTypes.map((t)=>({ value: String(t.id), label: t.name }))}
                error={errors.propertyTypeId}
                required
                disabled={propertyTypesLoading || propertyTypes.length === 0}
              />
            </div>

            {/* Address */}
            <div>
              <FormField
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                error={errors.address}
                placeholder="123 Main St"
                required
              />
            </div>

            {/* City */}
            <div>
              <FormField
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                error={errors.city}
                placeholder="e.g., New York"
                required
              />
            </div>

            {/* State */}
            <div>
              <FormField
                label="State"
                name="state"
                type="select"
                value={formData.state}
                onChange={handleChange}
                options={states.map(state => ({
                  value: state,
                  label: state
                }))}
                required
              />
            </div>

            {/* ZIP Code */}
            <div>
              <FormField
                label="ZIP Code"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                error={errors.zipCode}
                placeholder="12345"
                required
              />
            </div>

            {/* Price */}
            <div>
              <FormField
                label="Monthly Rent"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                error={errors.price}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            {/* Security Amount */}
            <div>
              <FormField
                label="Security Amount"
                name="securityAmount"
                type="number"
                value={formData.securityAmount}
                onChange={handleChange}
                error={errors.securityAmount}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            {/* Bedrooms */}
            <div>
              <FormField
                label="Bedrooms"
                name="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={handleChange}
                error={errors.bedrooms}
                placeholder="0"
                min="0"
              />
            </div>

            {/* Bathrooms */}
            <div>
              <FormField
                label="Bathrooms"
                name="bathrooms"
                type="number"
                value={formData.bathrooms}
                onChange={handleChange}
                error={errors.bathrooms}
                placeholder="0"
                min="0"
                step="0.5"
              />
            </div>

            {/* Area */}
            <div>
              <FormField
                label="Area (sq ft)"
                name="area"
                type="number"
                value={formData.area}
                onChange={handleChange}
                error={errors.area}
                placeholder="0"
                min="0"
              />
            </div>

            {/* Property Type Specific Fields */}
            {formData.propertyType === 'Flat' && (
              <>
                <div>
                  <FormField
                    label="Unit Number"
                    name="unitNumber"
                    value={formData.unitNumber}
                    onChange={handleChange}
                    error={errors.unitNumber}
                    placeholder="e.g., 4B"
                  />
                </div>
                <div>
                  <FormField
                    label="Building Name"
                    name="buildingName"
                    value={formData.buildingName}
                    onChange={handleChange}
                    placeholder="e.g., The Grand"
                  />
                </div>
                <div>
                  <FormField
                    label="Floor Number"
                    name="floorNumber"
                    type="number"
                    value={formData.floorNumber}
                    onChange={handleChange}
                    error={errors.floorNumber}
                    placeholder="e.g., 3"
                    min="0"
                  />
                </div>
              </>
            )}

            {formData.propertyType === 'Farm House' && (
              <>
                <div>
                  <FormField
                    label="Land Area (acres)"
                    name="landArea"
                    type="number"
                    value={formData.landArea}
                    onChange={handleChange}
                    error={errors.landArea}
                    placeholder="0"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <FormField
                    label="Has Pool"
                    name="hasPool"
                    type="checkbox"
                    checked={formData.hasPool}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <FormField
                    label="Has Garden"
                    name="hasGarden"
                    type="checkbox"
                    checked={formData.hasGarden}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {['Shop', 'Office'].includes(formData.propertyType) && (
              <div className="sm:col-span-2">
                <FormField
                  label="Commercial License Number"
                  name="commercialLicenseNo"
                  value={formData.commercialLicenseNo}
                  onChange={handleChange}
                  placeholder="e.g., CL-123456"
                />
              </div>
            )}

            {/* Amenities */}
            <div className="sm:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Amenities
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAmenity())}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded border border-gray-300 shadow appearance-none focus:outline-none focus:shadow-outline text-gray-700"
                  placeholder="Add an amenity and press Enter"
                />
                <button
                  type="button"
                  onClick={handleAddAmenity}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add
                </button>
              </div>
              
              {formData.amenities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {amenity}
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(amenity)}
                        className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-200 text-blue-600 hover:bg-blue-300 focus:outline-none"
                      >
                        <span className="sr-only">Remove</span>
                        <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                          <path fillRule="evenodd" d="M4 3.293L6.146 1.146a.5.5 0 01.708.708L4.707 4l2.147 2.146a.5.5 0 01-.708.708L4 4.707l-2.146 2.147a.5.5 0 01-.708-.708L3.293 4 1.146 1.854a.5.5 0 01.708-.708L4 3.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Images */}
            <div className="sm:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">Images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded cursor-pointer focus:outline-none"
              />
              {imagePreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative group border rounded-md overflow-hidden">
                      <img src={src} alt={`preview-${idx}`} className="object-cover w-full h-24" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-5 border-t border-gray-200 mt-4">
            <div className="flex justify-end">
              <Link
                to="/properties"
                className="bg-white py-2 px-4 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow text-sm font-medium rounded text-white ${submitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : isEditMode ? (
                  'Update Property'
                ) : (
                  'Create Property'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyForm;
