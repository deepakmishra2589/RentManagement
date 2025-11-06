import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PropertyList from './pages/PropertyList';
import PropertyForm from './pages/PropertyForm';
import PropertyDetail from './pages/PropertyDetail';
import RentedProperties from './pages/RentedProperties';
import PropertyTypeList from './pages/PropertyTypeList';
import PropertyTypeForm from './pages/PropertyTypeForm';
import AppLayout from './components/AppLayout';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Notifications from './pages/Notifications';
import Tenants from './pages/Tenants';
import MyLease from './pages/MyLease';
import Maintenance from './pages/Maintenance';
import PaymentsReview from './pages/PaymentsReview';
import Renewals from './pages/Renewals';
import Reports from './pages/Reports';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <ToastContainer position="top-right" autoClose={5000} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Dashboard and Property Management */}
            <Route path="/dashboard/*" element={
              <PrivateRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </PrivateRoute>
            } />
            
            {/* Property Management Routes */}
            <Route path="/properties" element={
              <PrivateRoute>
                <AppLayout>
                  <PropertyList />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/properties/add" element={
              <PrivateRoute allowedRoles={['Admin', 'Landlord']}>
                <AppLayout>
                  <PropertyForm />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/properties/rented" element={
              <PrivateRoute>
                <AppLayout>
                  <RentedProperties />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/properties/:id" element={
              <PrivateRoute>
                <AppLayout>
                  <PropertyDetail />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/properties/:id/edit" element={
              <PrivateRoute allowedRoles={['Admin', 'Landlord']}>
                <AppLayout>
                  <PropertyForm />
                </AppLayout>
              </PrivateRoute>
            } />
            {/* Tenants Management */}
            <Route path="/tenants" element={
              <PrivateRoute allowedRoles={['Admin', 'Landlord']}>
                <AppLayout>
                  <Tenants />
                </AppLayout>
              </PrivateRoute>
            } />
            {/* Tenant My Lease */}
            <Route path="/my-lease" element={
              <PrivateRoute allowedRoles={['Tenant']}>
                <AppLayout>
                  <MyLease />
                </AppLayout>
              </PrivateRoute>
            } />
            {/* Maintenance for all roles */}
            <Route path="/maintenance" element={
              <PrivateRoute allowedRoles={['Admin', 'Landlord', 'Tenant']}>
                <AppLayout>
                  <Maintenance />
                </AppLayout>
              </PrivateRoute>
            } />
            {/* Payments Review */}
            <Route path="/payments/review" element={
              <PrivateRoute allowedRoles={['Admin', 'Landlord']}>
                <AppLayout>
                  <PaymentsReview />
                </AppLayout>
              </PrivateRoute>
            } />
            {/* Renewals for all roles */}
            <Route path="/renewals" element={
              <PrivateRoute allowedRoles={['Admin', 'Landlord', 'Tenant']}>
                <AppLayout>
                  <Renewals />
                </AppLayout>
              </PrivateRoute>
            } />
            {/* Reports for Admin/Landlord */}
            <Route path="/reports" element={
              <PrivateRoute allowedRoles={['Admin', 'Landlord']}>
                <AppLayout>
                  <Reports />
                </AppLayout>
              </PrivateRoute>
            } />
            {/* Notifications */}
            <Route path="/notifications" element={
              <PrivateRoute>
                <AppLayout>
                  <Notifications />
                </AppLayout>
              </PrivateRoute>
            } />
            
            {/* Property Type Management Routes */}
            <Route path="/property-types" element={
              <PrivateRoute allowedRoles={['Admin']}>
                <AppLayout>
                  <PropertyTypeList />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/property-types/new" element={
              <PrivateRoute allowedRoles={['Admin']}>
                <AppLayout>
                  <PropertyTypeForm />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/property-types/edit/:id" element={
              <PrivateRoute allowedRoles={['Admin']}>
                <AppLayout>
                  <PropertyTypeForm />
                </AppLayout>
              </PrivateRoute>
            } />
            
            {/* Default and catch-all routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;