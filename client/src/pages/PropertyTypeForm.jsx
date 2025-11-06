import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  getPropertyType, 
  createPropertyType, 
  updatePropertyType 
} from '../services/propertyTypeService';

const PropertyTypeForm = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    typeName: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      const loadPropertyType = async () => {
        try {
          const data = await getPropertyType(id);
          setFormData({
            typeName: data.TypeName,
            description: data.Description || ''
          });
        } catch (err) {
          console.error('Error loading property type:', err);
          toast.error('Failed to load property type');
          navigate('/property-types');
        } finally {
          setLoading(false);
        }
      };
      
      loadPropertyType();
    }
  }, [id, isEditMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.typeName.trim()) {
      newErrors.typeName = 'Type name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setServerError('');
      
      if (isEditMode) {
        await updatePropertyType(id, formData);
        toast.success('Property type updated successfully');
      } else {
        await createPropertyType(formData);
        toast.success('Property type created successfully');
      }
      
      navigate('/property-types');
    } catch (err) {
      console.error('Error saving property type:', err);
      setServerError(err.message || 'Failed to save property type');
      toast.error('Failed to save property type');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {isEditMode ? 'Edit Property Type' : 'Add New Property Type'}
        </h1>
        
        {serverError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{serverError}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="mb-6">
            <label 
              className="block text-gray-700 text-sm font-bold mb-2" 
              htmlFor="typeName"
            >
              Type Name <span className="text-red-500">*</span>
            </label>
            <input
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.typeName ? 'border-red-500' : ''
              }`}
              id="typeName"
              name="typeName"
              type="text"
              placeholder="e.g., Apartment, House, Office"
              value={formData.typeName}
              onChange={handleChange}
            />
            {errors.typeName && (
              <p className="text-red-500 text-xs italic mt-1">{errors.typeName}</p>
            )}
          </div>
          
          <div className="mb-6">
            <label 
              className="block text-gray-700 text-sm font-bold mb-2" 
              htmlFor="description"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32 ${
                errors.description ? 'border-red-500' : ''
              }`}
              id="description"
              name="description"
              placeholder="Enter a description for this property type"
              value={formData.description}
              onChange={handleChange}
            />
            {errors.description && (
              <p className="text-red-500 text-xs italic mt-1">{errors.description}</p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/property-types')}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyTypeForm;
