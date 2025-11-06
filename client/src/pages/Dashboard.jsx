import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Routes, Route, Link, Outlet, Navigate } from 'react-router-dom';
import Users from './admin/Users';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🏠 [DashboardLayout] User state:', { 
      hasUser: !!user,
      user: user,
      path: window.location.pathname
    });
    
    if (user) {
      console.log('👤 [DashboardLayout] User details:', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        phone: user.phone,
        allProperties: Object.keys(user)
      });
    }
  }, [user]);

  const handleLogout = () => {
    console.log('👋 [DashboardLayout] Logging out...');
    logout();
    navigate('/login');
  };

  if (!user) {
    console.log('🔐 [DashboardLayout] No user, redirecting to login...');
    return <Navigate to="/login" replace state={{ from: '/dashboard' }} />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white shadow-sm px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Welcome, {user?.name || user?.email || 'User'}
        </h2>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span>
            Email: <span className="font-medium text-gray-700">{user?.email || 'N/A'}</span>
          </span>
          <span>
            Role: <span className="font-medium text-gray-700">{user?.role || 'No role assigned'}</span>
          </span>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

const DashboardHome = () => {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
        <p className="text-gray-600 mb-6">Welcome to the Rent Management System.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Your Profile</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {user?.name || 'Not set'}</p>
              <p><span className="font-medium">Email:</span> {user?.email || 'Not set'}</p>
              <p><span className="font-medium">Phone:</span> {user?.phone || 'Not set'}</p>
              <p><span className="font-medium">Role:</span> {user?.role || 'Not set'}</p>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Quick Actions</h3>
            <div className="space-y-2">
              {user?.role === 'Admin' && (
                <>
                  <Link 
                    to="/dashboard/users" 
                    className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    → Manage Users
                  </Link>
                  <Link 
                    to="/property-types/new" 
                    className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    → Add Property Type
                  </Link>
                  <Link 
                    to="/properties/add" 
                    className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    → Add Property
                  </Link>
                  <p className="text-sm text-gray-600">→ View Properties (Coming soon)</p>
                  <p className="text-sm text-gray-600">→ Manage Tenants (Coming soon)</p>
                </>
              )}
              {user?.role !== 'Admin' && (
                <p className="text-sm text-gray-600">Limited access. Contact admin for more permissions.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">System Status</h3>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <p className="text-sm text-gray-600">All systems operational</p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route 
          path="users" 
          element={
            user?.role === 'Admin' ? (
              <Users />
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-red-500">You don't have permission to access this page.</p>
              </div>
            )
          } 
        />
      </Route>
    </Routes>
  );
};

export default Dashboard;
