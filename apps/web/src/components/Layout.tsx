import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  showAdminNav?: boolean;
}

export function Layout({ children, showAdminNav = false }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme?.backgroundColor ?? '#F9FAFB' }}>
      {/* Header */}
      <header
        className="header-bar shadow-md"
        style={{
          backgroundColor: theme?.headerBackground ?? '#1E3A5F',
          color: theme?.headerTextColor ?? '#FFFFFF',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {theme?.logoUrl && (
              <img src={theme.logoUrl} alt="Logo" className="h-8 w-auto" />
            )}
            <Link
              to={user?.role === 'ADMIN' ? '/admin' : '/'}
              className="text-lg font-bold hover:opacity-80 transition-opacity"
              style={{ color: theme?.headerTextColor ?? '#FFFFFF' }}
            >
              {theme?.appName ?? 'Symptom Tracker'}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className="text-sm font-medium px-3 py-1 rounded hover:bg-white/10 transition-colors"
                style={{ color: theme?.headerTextColor ?? '#FFFFFF' }}
              >
                Admin
              </Link>
            )}
            <Link
              to="/"
              className="text-sm font-medium px-3 py-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: theme?.headerTextColor ?? '#FFFFFF' }}
            >
              Report
            </Link>
            <Link
              to="/my-submissions"
              className="text-sm font-medium px-3 py-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: theme?.headerTextColor ?? '#FFFFFF' }}
            >
              My Submissions
            </Link>
            <span className="text-sm opacity-70" style={{ color: theme?.headerTextColor ?? '#FFFFFF' }}>
              {user?.displayName ?? user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium px-3 py-1 rounded border border-white/30 hover:bg-white/10 transition-colors"
              style={{ color: theme?.headerTextColor ?? '#FFFFFF' }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Admin sub-nav */}
      {showAdminNav && user?.role === 'ADMIN' && (
        <nav className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 py-2 overflow-x-auto">
            {[
              { label: 'Dashboard', to: '/admin' },
              { label: 'Users', to: '/admin/users' },
              { label: 'Hospitals', to: '/admin/hospitals' },
              { label: 'Intervals', to: '/admin/intervals' },
              { label: 'Appearance', to: '/admin/theme' },
              { label: 'Data & Export', to: '/admin/data' },
              { label: 'Audit Log', to: '/admin/audit' },
            ].map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="text-sm font-medium px-3 py-1.5 rounded whitespace-nowrap transition-colors hover:bg-gray-100 text-gray-700"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Layout showAdminNav>{children}</Layout>;
}
