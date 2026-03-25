import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/Layout';
import { adminAuditApi } from '../../api/client';
import { AuditLog } from '../../types';
import { useTheme } from '../../context/ThemeContext';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN_SUCCESS: { label: 'Login', color: 'bg-green-100 text-green-700' },
  LOGIN_FAILURE: { label: 'Login Failed', color: 'bg-red-100 text-red-700' },
  LOGOUT: { label: 'Logout', color: 'bg-gray-100 text-gray-600' },
  PASSWORD_CHANGED: { label: 'Password Changed', color: 'bg-blue-100 text-blue-700' },
  PASSWORD_RESET_BY_ADMIN: { label: 'PW Reset (Admin)', color: 'bg-orange-100 text-orange-700' },
  ACCOUNT_CREATED: { label: 'Account Created', color: 'bg-green-100 text-green-700' },
  ACCOUNT_DEACTIVATED: { label: 'Account Deactivated', color: 'bg-red-100 text-red-700' },
  SUBMISSION_CREATED: { label: 'Submission', color: 'bg-blue-100 text-blue-700' },
  PERIOD_ROTATED: { label: 'Period Rotated', color: 'bg-purple-100 text-purple-700' },
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

export function AuditLogPage() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminAuditApi.list({
        page,
        action: filterAction || undefined,
      });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load audit log.');
    } finally {
      setIsLoading(false);
    }
  }, [page, filterAction]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: theme?.textColor }}>Audit Log</h1>
        <p className="text-sm text-gray-500">Immutable record of all system events. Cannot be edited or deleted.</p>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium mb-1">Filter by Action</label>
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
            >
              <option value="">All Actions</option>
              {ALL_ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Timestamp', 'User', 'Action', 'IP Address', 'Details'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">No log entries.</td></tr>
                  ) : logs.map((log) => {
                    const meta = ACTION_LABELS[log.action];
                    return (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {log.user?.displayName ?? log.user?.username ?? (
                            <span className="text-gray-400 italic">System</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${meta?.color ?? 'bg-gray-100 text-gray-600'}`}>
                            {meta?.label ?? log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ipAddress ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-500">{total} total entries</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border disabled:opacity-40">Prev</button>
                  <span className="px-3 py-1">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
