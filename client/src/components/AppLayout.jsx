import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Icons = {
  dashboard: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
  ),
  types: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z"/></svg>
  ),
  properties: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 7-1.2 1.6L18 9.5V20H6V9.5L4.2 11.6 3 10l9-7z"/></svg>
  ),
  tenants: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.67 0-8 1.34-8 4v3h10v-3c0-2.66-5.33-4-8-4zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45v3h7v-3c0-2.66-5.33-4-8-4z"/></svg>
  ),
  users: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
  ),
  maintenance: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19.3l-6.4-6.4c.5-1.2.3-2.7-.7-3.7-1-1-2.5-1.2-3.7-.7L9.8 6 6 9.8l1.5 2.1c-.5 1.2-.3 2.7.7 3.7 1 1 2.5 1.2 3.7.7l6.4 6.4c.4.4 1 .4 1.4 0l3-3c.4-.4.4-1 0-1.4z"/></svg>
  ),
  payments: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zm0 4h16V8H4v2z"/></svg>
  ),
  renewals: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6V3L8 7l4 4V8c2.8 0 5 2.2 5 5 0 .7-.1 1.3-.4 1.9l1.5 1.5C18.7 15.4 19 14.2 19 13c0-3.9-3.1-7-7-7zm-5 1.1C5.3 8.6 5 9.8 5 11c0 3.9 3.1 7 7 7v3l4-4-4-4v3c-2.8 0-5-2.2-5-5 0-.7.1-1.3.4-1.9L5.9 7.1z"/></svg>
  ),
  reports: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm4 12h2v2H7v-2zm0-6h2v4H7V9zm6 6h2v2h-2v-2zm0-10h2v8h-2V5zm6 10h2v2h-2v-2z"/></svg>
  ),
  bell: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.5 2.5 0 002.5-2.5h-5A2.5 2.5 0 0012 22zm6-6V11a6 6 0 10-12 0v5L4 18v1h16v-1l-2-2z"/></svg>
  ),
  doc: (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM8 18h8v-2H8v2zm0-4h8v-2H8v2zm6-9.5V8h4.5L14 4.5z"/></svg>
  ),
  dot: (
    <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
  ),
};

const withIcon = (icon, item) => ({ ...item, icon });

const getNavItemsByRole = (role) => {
  if (role === 'Tenant') {
    return [
      withIcon(Icons.dashboard, { to: '/dashboard', label: 'Dashboard' }),
      withIcon(Icons.doc, { to: '/my-lease', label: 'My Lease' }),
      withIcon(Icons.maintenance, { to: '/maintenance', label: 'Maintenance' }),
      withIcon(Icons.renewals, { to: '/renewals', label: 'Renewals' }),
      withIcon(Icons.bell, { to: '/notifications', label: 'Notifications' }),
    ];
  }

  if (role === 'Landlord') {
    return [
      withIcon(Icons.dashboard, { to: '/dashboard', label: 'Dashboard' }),
      {
        label: 'Properties',
        icon: Icons.properties,
        children: [
          withIcon(Icons.dot, { to: '/properties', label: 'All Properties' }),
          withIcon(Icons.dot, { to: '/properties/add', label: 'Add Property' }),
          withIcon(Icons.dot, { to: '/properties/rented', label: 'Rented Properties' }),
        ],
      },
      withIcon(Icons.tenants, { to: '/tenants', label: 'Manage Tenants' }),
      withIcon(Icons.maintenance, { to: '/maintenance', label: 'Maintenance' }),
      withIcon(Icons.payments, { to: '/payments/review', label: 'Payments' }),
      withIcon(Icons.renewals, { to: '/renewals', label: 'Renewals' }),
      withIcon(Icons.reports, { to: '/reports', label: 'Reports' }),
      withIcon(Icons.bell, { to: '/notifications', label: 'Notifications' }),
    ];
  }

  // Admin
  return [
    withIcon(Icons.dashboard, { to: '/dashboard', label: 'Dashboard' }),
    {
      label: 'Property Types',
      icon: Icons.types,
      children: [
        withIcon(Icons.dot, { to: '/property-types', label: 'All Types' }),
        withIcon(Icons.dot, { to: '/property-types/new', label: 'Add Type' }),
      ],
    },
    {
      label: 'Properties',
      icon: Icons.properties,
      children: [
        withIcon(Icons.dot, { to: '/properties', label: 'All Properties' }),
        withIcon(Icons.dot, { to: '/properties/add', label: 'Add Property' }),
        withIcon(Icons.dot, { to: '/properties/rented', label: 'Rented Properties' }),
      ],
    },
    withIcon(Icons.tenants, { to: '/tenants', label: 'Manage Tenants' }),
    withIcon(Icons.users, { to: '/dashboard/users', label: 'Users' }),
    withIcon(Icons.maintenance, { to: '/maintenance', label: 'Maintenance' }),
    withIcon(Icons.payments, { to: '/payments/review', label: 'Payments' }),
    withIcon(Icons.renewals, { to: '/renewals', label: 'Renewals' }),
    withIcon(Icons.reports, { to: '/reports', label: 'Reports' }),
    withIcon(Icons.bell, { to: '/notifications', label: 'Notifications' }),
  ];
};

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const role = user?.role || user?.RoleName || 'Guest';
  const navItems = useMemo(() => getNavItemsByRole(role), [role]);
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('navOpenGroups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const toggleGroup = (key) => setOpenGroups((s) => ({ ...s, [key]: !s[key] }));

  // Persist open/closed state
  useEffect(() => {
    try { localStorage.setItem('navOpenGroups', JSON.stringify(openGroups)); } catch {}
  }, [openGroups]);

  // Auto-expand a group if current route is a child
  useEffect(() => {
    const path = location.pathname;
    const updates = {};
    navItems.forEach((item) => {
      if (Array.isArray(item.children)) {
        const match = item.children.some((c) => path.startsWith(c.to));
        if (match) updates[item.label] = true;
      }
    });
    if (Object.keys(updates).length) setOpenGroups((s) => ({ ...s, ...updates }));
  }, [location.pathname, navItems]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 text-white transition-transform duration-200 ease-in-out md:static md:translate-x-0`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
            <Link to="/dashboard" className="text-xl font-semibold text-white">RentManagement</Link>
            <button
              className="rounded-md p-2 text-slate-300 hover:bg-slate-800 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                if (!hasChildren) {
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <span className="flex items-center">{item.icon}{item.label}</span>
                      </NavLink>
                    </li>
                  );
                }

                const key = item.label;
                const open = !!openGroups[key];
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(key)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors text-slate-200 hover:bg-slate-800 hover:text-white ${open ? 'bg-slate-800 text-white' : ''}`}
                    >
                      <span className="flex items-center">{item.icon}{item.label}</span>
                      <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 6L14 10L6 14V6Z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {open && (
                      <ul className="mt-1 space-y-1 pl-4">
                        {item.children.map((child) => (
                          <li key={child.to}>
                            <NavLink
                              to={child.to}
                              onClick={() => setMobileMenuOpen(false)}
                              className={({ isActive }) =>
                                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                  isActive ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                                }`
                              }
                            >
                              <span className="flex items-center">{child.icon}{child.label}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-slate-800 px-4 py-5">
            {user && (
              <div className="mb-4 text-sm text-slate-300">
                <p className="font-medium text-white">{user.name || user.email}</p>
                <p className="text-xs text-slate-400">{role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-0">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:hidden">
          <Link to="/dashboard" className="text-lg font-semibold text-gray-800">
            RentManagement
          </Link>
          <button
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
