import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/Layout';
import { adminDataApi } from '../../api/client';
import { CollectionPeriod, PatientField } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { SubmissionsOverTimeChart } from '../../components/SubmissionsOverTimeChart';
import { ReporterActivityChart } from '../../components/ReporterActivityChart';

interface Stats {
  total: number;
  byType: Record<string, number>;
  byHospital: { name: string; count: number }[];
  topUsers: { username: string; displayName: string | null; count: number }[];
}

interface ReporterActivity {
  submitted: number;
  notSubmitted: number;
  byHospital: { name: string; hasSubmitted: boolean }[];
}

export function AdminDashboard() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<CollectionPeriod | null>(null);
  const [fields, setFields] = useState<PatientField[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [periods, setPeriods] = useState<CollectionPeriod[]>([]);
  const [reporterActivity, setReporterActivity] = useState<ReporterActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminDataApi.current()
      .then((currentData) => {
        setPeriod(currentData.period);
        setFields(currentData.fields);
        setStats(currentData.stats);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setIsLoading(false));

    adminDataApi.periods()
      .then((allPeriods) => {
        setPeriods(allPeriods);
      })
      .catch(() => {/* non-critical: chart simply won't render */});

    adminDataApi.reporterActivity()
      .then(setReporterActivity)
      .catch(() => {/* non-critical */});
  }, []);

  const QUICK_LINKS = [
    { label: 'Add User', to: '/admin/users', icon: '👤' },
    { label: 'Add Hospital', to: '/admin/hospitals', icon: '🏥' },
    { label: 'Patient Fields', to: '/admin/fields', icon: '📋' },
    { label: 'Export Data', to: '/admin/data', icon: '📊' },
  ];

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

            {/* Submissions over time chart */}
            <SubmissionsOverTimeChart
              periods={periods}
              primaryColor={theme?.primaryColor ?? '#2563EB'}
            />

            {/* Stats grid — dynamic per PatientField */}
            {stats && stats.total > 0 && fields.length > 0 && (
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(fields.length, 4)}, minmax(0, 1fr))` }}
              >
                {fields.map((field) => (
                  <div key={field.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
                    <div className="text-3xl font-bold" style={{ color: theme?.primaryColor }}>
                      {stats.byType[field.key] ?? 0}
                    </div>
                    <div className="text-sm font-medium text-gray-600 mt-1">{field.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Reporter activity donut + hospital breakdown */}
            {reporterActivity && (
              <ReporterActivityChart
                submitted={reporterActivity.submitted}
                notSubmitted={reporterActivity.notSubmitted}
                byHospital={reporterActivity.byHospital}
                primaryColor={theme?.primaryColor ?? '#2563EB'}
              />
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
