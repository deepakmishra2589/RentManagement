import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: typeof window !== 'undefined'
    ? (import.meta.env?.VITE_API_URL || '/api')
    : (process.env?.VITE_API_URL || 'http://localhost:5000/api'),
  withCredentials: true,  // This is important for sending cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Handle successful responses
    if (response.data && response.data.success === false) {
      // Handle API-level errors (e.g., validation errors)
      return Promise.reject({
        response: {
          ...response,
          data: response.data.message || 'An error occurred'
        }
      });
    }
    return response.data; // Return only the data part of the response
  },
  (error) => {
    // Handle error responses
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      errorMessage = data?.message || data?.error || `Request failed with status code ${status}`;
      
      // Handle specific status codes
      if (status === 401) {
        // Clear token but do not redirect here; let UI show inline error
        localStorage.removeItem('token');
      }
      
      console.error('API Error:', {
        status,
        message: errorMessage,
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response from server. Please check your connection.';
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message || 'Error setting up request';
      console.error('Request error:', errorMessage);
    }
    
    // Return a rejected promise with enriched Error
    const err = new Error(errorMessage);
    if (error.response) {
      err.status = error.response.status;
      err.response = error.response;
      err.config = error.config;
    }
    return Promise.reject(err);
  }
);

export const login = async (email, password) => {
  console.log('🔑 [authService] Attempting login with:', { email });
  try {
    // NOTE: The axios interceptor returns response.data directly, 
    // so 'data' here is already the response body
    const data = await api.post('/auth/login', { email, password });
    console.log('✅ [authService] Login response received:', { 
      success: data?.success,
      hasToken: !!data?.token,
      hasUser: !!data?.user,
      user: data?.user
    });
    
    // Check if data exists
    if (!data) {
      throw new Error('Invalid response from server');
    }
    
    if (data.success && data.token) {
      const { token, user, refreshToken } = data;
      
      // Store the token in localStorage
      localStorage.setItem('token', token);
      console.log('💾 [authService] Token stored in localStorage');
      
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
        console.log('💾 [authService] Refresh token stored');
      }
      
      // Set the default authorization header
      setAuthToken(token);
      console.log('📡 [authService] Auth header set');
      
      console.log('✅ [authService] Login successful!');
      return { token, user };
    }
    
    // If we got here, login failed but didn't throw an error
    throw new Error(data?.message || 'Login failed');
    
  } catch (error) {
    console.error('❌ [authService] Login error:', {
      message: error?.message,
      error: error
    });
    
    // Clear any existing tokens on error
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setAuthToken(null);
    
    // Re-throw with better error message
    // The interceptor already extracts the error message
    const errorMessage = typeof error === 'string' ? error : (error?.message || 'Login failed');
    throw new Error(errorMessage);
  }
};

export const register = async (userData) => {
  // NOTE: The axios interceptor returns response.data directly
  const data = await api.post('/auth/register', userData);
  return data;
};

export const getCurrentUser = async (token) => {
  console.group('🔍 getCurrentUser');
  try {
    if (!token) {
      console.warn('❌ No token provided to getCurrentUser');
      console.groupEnd();
      return null;
    }
    
    console.log('🔑 Token (first 10 chars):', token.substring(0, 10) + '...');
    
    // Decode token to verify it's valid before making the request
    let decodedToken;
    try {
      const tokenPayload = token.split('.')[1];
      decodedToken = JSON.parse(atob(tokenPayload));
      console.log('🔍 Decoded token:', decodedToken);
      
      // Check if token is expired
      if (decodedToken.exp && Date.now() >= decodedToken.exp * 1000) {
        console.warn('⚠️ Token has expired');
        setAuthToken(null);
        console.groupEnd();
        return null;
      }
    } catch (decodeError) {
      console.error('❌ Failed to decode token:', decodeError);
      setAuthToken(null);
      console.groupEnd();
      return null;
    }
    
    // Set the auth header
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('📤 Request headers:', {
      'Content-Type': api.defaults.headers.common['Content-Type'],
      'Authorization': 'Bearer ' + token.substring(0, 10) + '...'
    });
    
    console.log('🔄 Sending request to /auth/me...');
    
    try {
      // NOTE: The axios interceptor returns response.data directly
      const data = await api.get('/auth/me');
      console.log('✅ Response from /auth/me:', {
        success: data?.success,
        hasUser: !!data?.user,
        user: data?.user
      });
      
      if (data && data.success && data.user) {
        console.log('👤 User data retrieved successfully');
        console.groupEnd();
        return data.user;
      }
      
      console.warn('⚠️ Unexpected response format from /auth/me:', data);
      console.groupEnd();
      return null;
      
    } catch (apiError) {
      console.error('❌ API Error:', {
        message: apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        config: {
          url: apiError.config?.url,
          method: apiError.config?.method,
          headers: {
            ...apiError.config?.headers,
            Authorization: apiError.config?.headers?.Authorization 
              ? 'Bearer ' + apiError.config.headers.Authorization.split(' ')[1].substring(0, 10) + '...' 
              : 'Not set'
          }
        }
      });
      
      if (apiError.response?.status === 401) {
        console.warn('🔒 Authentication failed, clearing token');
        setAuthToken(null);
      }
      
      console.groupEnd();
      return null;
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in getCurrentUser:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // In case of any unexpected error, clear the token to be safe
    setAuthToken(null);
    console.groupEnd();
    return null;
  }
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear token from localStorage
    localStorage.removeItem('token');
    // Clear axios default headers
    delete api.defaults.headers.common['Authorization'];
  }
};

// Function to set the auth token
const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// Export the api instance and setAuthToken function
export { api, setAuthToken };

// Initialize with token from localStorage if it exists
const initializeAuth = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      return token;
    }
  }
  return null;
};

// Initialize auth when this module is loaded
initializeAuth();
