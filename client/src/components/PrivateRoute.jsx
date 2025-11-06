import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('🛡️ [PrivateRoute] Auth state:', { 
      hasUser: !!user, 
      loading, 
      path: window.location.pathname 
    });
  }, [user, loading]);

  if (loading) {
    console.log('🔄 [PrivateRoute] Loading auth state...');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🔒 [PrivateRoute] No user, redirecting to login...');
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = user?.role || user?.RoleName;
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.warn('🚫 [PrivateRoute] User lacks required role:', { userRole, allowedRoles });
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="bg-white shadow rounded-lg p-6 max-w-md text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You do not have permission to view this page.</p>
          </div>
        </div>
      );
    }
  }

  console.log('✅ [PrivateRoute] User authenticated, rendering protected content');
  return children ? children : <Outlet />;
}
