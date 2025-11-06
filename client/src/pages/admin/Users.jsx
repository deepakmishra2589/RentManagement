import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const { user } = useAuth();

  const roleOptions = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Landlord' },
    { id: 3, name: 'Tenant' },
    { id: null, name: 'No Role' }
  ];

  useEffect(() => {
    if (user && user.role === 'Admin') {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
      setLoading(false);
    }
  };

  const handleToggleStatus = async (u) => {
    try {
      setToggling(u.UserID);
      const next = !(u.IsActive === true || u.IsActive === 1);
      await userService.updateUserStatus(u.UserID, next);
      toast.success(`User ${next ? 'activated' : 'deactivated'} successfully`);
      await loadUsers();
    } catch (error) {
      console.error('Failed to update status:', error);
      const msg = error?.message || error?.response?.data?.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      setToggling(null);
    }
  };

  const handleRoleChange = async (userId, newRoleId) => {
    try {
      await userService.updateUserRole(userId, newRoleId);
      toast.success('User role updated successfully');
      loadUsers(); // Refresh the user list
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading users...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.UserID}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{u.Name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{u.Email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${u.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {u.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={u.RoleID || ''}
                    onChange={(e) => handleRoleChange(u.UserID, e.target.value ? parseInt(e.target.value) : null)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    {roleOptions.map((role) => (
                      <option key={role.id || 'null'} value={role.id || ''}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={toggling === u.UserID}
                    className={`mr-4 ${u.IsActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                  >
                    {toggling === u.UserID ? 'Please wait...' : (u.IsActive ? 'Deactivate' : 'Activate')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
