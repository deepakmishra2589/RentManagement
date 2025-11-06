import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  login as loginApi, 
  register as registerApi, 
  getCurrentUser as getCurrentUserApi, 
  api,
  setAuthToken 
} from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load user data when the component mounts
  useEffect(() => {
    let isMounted = true;
    
    const loadUser = async () => {
      // Get token from localStorage
      const storedToken = localStorage.getItem('token');
      
      if (!storedToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        console.log('Loading user with token:', storedToken.substring(0, 10) + '...');
        
        // Set the auth token in axios defaults
        setAuthToken(storedToken);
        
        // Fetch the current user
        const userData = await getCurrentUserApi(storedToken);
        
        if (isMounted) {
          if (userData) {
            console.log('✅ [AuthContext] User data loaded successfully:', userData);
            setUser(userData);
            setToken(storedToken);
          } else {
            console.log('⚠️ [AuthContext] No user data returned, clearing auth');
            // If no user data is returned, clear everything
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setAuthToken(null);
            setUser(null);
            setToken(null);
            // Only redirect to login if we're not already there
            if (window.location.pathname !== '/login') {
              navigate('/login', { replace: true });
            }
          }
        }
      } catch (error) {
        console.error('Failed to load user:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        if (isMounted) {
          // Clear everything on error
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setAuthToken(null);
          setUser(null);
          setToken(null);
          
          // Only navigate to login if this was an authentication error and we're not already there
          if (error.response?.status === 401 && window.location.pathname !== '/login') {
            navigate('/login', { replace: true });
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Load user data
    loadUser();

    // Set up a listener for storage events to handle login/logout from other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        // Token was removed (logout)
        if (isMounted) {
          setUser(null);
          setToken(null);
          navigate('/login');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  const login = async (email, password) => {
    console.log('🔑 [AuthContext] login called with email:', email);
    try {
      setLoading(true);
      console.log('🔄 [AuthContext] Calling loginApi...');
      
      const response = await loginApi(email, password);
      console.log('✅ [AuthContext] loginApi response:', { 
        hasToken: !!response?.token,
        hasUser: !!response?.user,
        user: response?.user
      });
      
      if (!response?.token || !response?.user) {
        const error = new Error('Invalid response from server');
        console.error('❌ [AuthContext] Invalid login response:', response);
        throw error;
      }
      
      const { token, user } = response;
      
      console.log('🔐 [AuthContext] Setting auth token and user state...');
      
      // IMPORTANT: Store token in localStorage first
      localStorage.setItem('token', token);
      console.log('💾 [AuthContext] Token saved to localStorage');
      
      // Set axios headers
      setAuthToken(token);
      console.log('📡 [AuthContext] Axios auth header set');
      
      // Update state
      setUser(user);
      setToken(token);
      console.log('✅ [AuthContext] State updated:', { user: user?.email });
      
      // Wait a moment to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🔄 [AuthContext] Navigating to /dashboard...');
      navigate('/dashboard', { replace: true });
      console.log('✅ [AuthContext] Navigation complete');
      
      return { success: true, user };
    } catch (error) {
      console.error('Login failed:', error);
      // Clear any partial state on error
      setAuthToken(null);
      setUser(null);
      setToken(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, phone, roleId) => {
    try {
      setLoading(true);
      const response = await registerApi({ name, email, password, phone, roleId });
      // Admin creates accounts; do not mutate current auth state
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Clear the auth token
    setAuthToken(null);
    
    // Update state
    setUser(null);
    setToken(null);
    
    // Navigate to login
    navigate('/login');
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
