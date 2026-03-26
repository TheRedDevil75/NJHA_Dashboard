import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/Layout';
import { adminDataApi, adminIntervalsApi } from '../../api/client';
import { CollectionPeriod } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface Stats {
  total: number;
  byType: Record<string, number>;
  byHospital: { name: string; count: number }[];
  topUsers: { username: string; displayName: string | null; count: number }[];
}

export function AdminDashboard() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<CollectionPeriod | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminDataApi.current()
      .then(({ period, stats }) => {
        setPeriod(period);
        setStats(stats);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setIsLoading(false));
  }, []);

  const QUICK_LINKS = [
    { label: 'Add User', to: '/admin/users', icon: '👤' },
    { label: 'Add Hospital', to: '/admin/hospitals', icon: '🏥' },
    { label: 'Manage Intervals', to: '/admin/intervals', icon: '⏰' },
    { label: 'Export Data', to: '/admin/data', icon: '📊' },
  ];

  const PATIENT_LABELS: Record<string, { label: string }> = {
    ALCOHOL_RELATED: { label: 'Alcohol Related' },
    VIRUS: { label: 'Virus' },
    MCI: { label: 'MCI' },
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold" style={{ color: theme?.textColor }}>
            Admin Dashboard
          </h1>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">{error}</div>
        )}

        {!isLoading && !error && (
          <>
            {/* Active period card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Active Collection Period
              </h2>
              {period ? (
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    Started: <span className="font-medium text-gray-800">{new Date(period.startedAt).toLocaleString()}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Total submissions: <span className="font-bold text-2xl" style={{ color: theme?.primaryColor }}>{stats?.total ?? 0}</span>
                  </p>
                </div>
              ) : (
                <p className="text-yellow-600 text-sm">
                  No active period. Go to{' '}
                  <Link to="/admin/intervals" className="underline">Interval Settings</Link> to configure one.
                </p>
              )}
            </div>

            {/* Stats grid */}
            {stats && stats.total > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['ALCOHOL_RELATED', 'VIRUS', 'MCI'].map((type) => {
                  const { label } = PATIENT_LABELS[type];
                  const count = stats.byType[type] ?? 0;
                  return (
                    <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
                      <div className="text-3xl font-bold" style={{ color: theme?.primaryColor }}>{count}</div>
                      <div className="text-sm font-medium text-gray-600 mt-1">{label}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* By hospital */}
            {stats && stats.byHospital.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Submissions by Hospital
                </h2>
                <div className="space-y-3">
                  {stats.byHospital
                    .sort((a, b) => b.count - a.count)
                    .map(({ name, count }) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-40 truncate">{name}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-2.5 rounded-full"
                            style={{
                              width: `${Math.round((count / (stats.total || 1)) * 100)}%`,
                              backgroundColor: theme?.primaryColor ?? '#2563EB',
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-800 w-8 text-right">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Top users */}
            {stats && stats.topUsers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Most Active Users (This Period)
                </h2>
                <div className="space-y-2">
                  {stats.topUsers.map(({ username, displayName, count }, i) => (
                    <div key={username} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5">#{i + 1}</span>
                        <span className="text-sm font-medium text-gray-700">{displayName ?? username}</span>
                        {displayName && <span className="text-xs text-gray-400">({username})</span>}
                      </div>
                      <span className="text-sm font-bold" style={{ color: theme?.primaryColor }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {QUICK_LINKS.map(({ label, to, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center hover:shadow-md transition-shadow"
                >
                  <div className="text-3xl mb-2">{icon}</div>
                  <div className="text-sm font-medium text-gray-700">{label}</div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
