import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/Layout';
import { adminDataApi, adminHospitalsApi } from '../../api/client';
import { CollectionPeriod, Submission, Hospital } from '../../types';
import { useTheme } from '../../context/ThemeContext';

const PATIENT_LABELS: Record<string, string> = {
  ALCOHOL_RELATED: 'Alcohol Related',
  VIRUS: 'Virus',
  MCI: 'MCI',
};

export function DataExportPage() {
  const { theme } = useTheme();
  const [periods, setPeriods] = useState<CollectionPeriod[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [filterHospital, setFilterHospital] = useState('');
  const [filterSymptom, setFilterSymptom] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<{
    byType: Record<string, number>;
    byHospital: { name: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    Promise.all([adminDataApi.periods(), adminHospitalsApi.list()])
      .then(([p, h]) => {
        setPeriods(p);
        setHospitals(h);
        // Default to active period
        const active = p.find((period) => period.isActive);
        if (active) setSelectedPeriodId(active.id);
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPeriodId) return;
    setSubmissionsLoading(true);
    setPage(1);
    adminDataApi
      .submissions(selectedPeriodId, {
        hospitalId: filterHospital || undefined,
        symptomType: filterSymptom || undefined,
      })
      .then((data) => {
        setSubmissions(data.submissions);
        setTotal(data.total);
        setTotalPages(data.totalPages);

        // Calculate stats from all submissions
        const byType: Record<string, number> = { ALCOHOL_RELATED: 0, VIRUS: 0, MCI: 0 };
        const byHospitalMap: Record<string, { name: string; count: number }> = {};
        for (const s of data.submissions) {
          byType['ALCOHOL_RELATED'] += s.alcoholRelated;
          byType['VIRUS'] += s.virus;
          byType['MCI'] += s.mci;
          const hName = s.hospital?.name ?? 'Unknown';
          const hId = s.hospitalId;
          if (!byHospitalMap[hId]) byHospitalMap[hId] = { name: hName, count: 0 };
          byHospitalMap[hId].count += s.alcoholRelated + s.virus + s.mci;
        }
        setStats({ byType, byHospital: Object.values(byHospitalMap) });
      })
      .catch(() => setError('Failed to load submissions.'))
      .finally(() => setSubmissionsLoading(false));
  }, [selectedPeriodId, filterHospital, filterSymptom]);

  const handleExport = () => {
    if (!selectedPeriodId) return;
    const url = adminDataApi.exportUrl(selectedPeriodId, {
      hospitalId: filterHospital || undefined,
      symptomType: filterSymptom || undefined,
    });

    // Use fetch with auth header then trigger download
    const token = localStorage.getItem('auth_token');
    fetch(url.replace(`?token=${token}&`, '?').replace(`?token=${token}`, ''), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `submissions_${selectedPeriodId}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);
  const btnPrimary = {
    backgroundColor: theme?.primaryColor ?? '#2563EB',
    color: 'white',
    borderRadius: theme?.buttonStyle === 'pill' ? '9999px' : theme?.buttonStyle === 'square' ? '4px' : '8px',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: theme?.textColor }}>Data & Export</h1>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <>
            {/* Period selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Collection Period</label>
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {new Date(p.startedAt).toLocaleDateString()} — {p.endedAt ? new Date(p.endedAt).toLocaleDateString() : 'Active'}{' '}
                        ({p._count?.submissions ?? 0} subs)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Filter by Hospital</label>
                  <select value={filterHospital} onChange={(e) => setFilterHospital(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
                    <option value="">All Hospitals</option>
                    {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div />
              </div>

              <div className="flex justify-end">
                <button onClick={handleExport} disabled={!selectedPeriodId} className="px-5 py-2 text-sm font-semibold text-white" style={btnPrimary}>
                  ⬇ Export CSV
                </button>
              </div>
            </div>

            {/* Stats */}
            {stats && !submissionsLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                  <div className="text-3xl font-bold" style={{ color: theme?.primaryColor }}>{total}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Submissions</div>
                </div>
                {['ALCOHOL_RELATED', 'VIRUS', 'MCI'].map((type) => (
                  <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                    <div className="text-3xl font-bold text-gray-700">{stats.byType[type] ?? 0}</div>
                    <div className="text-xs text-gray-500 mt-1">{PATIENT_LABELS[type]}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Submissions table */}
            {submissionsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Submitted At', 'Username', 'Hospital', 'Alcohol Related', 'Virus', 'MCI', 'Notes'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-400">No submissions for this period / filter.</td></tr>
                      ) : submissions.map((s) => (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(s.submittedAt).toLocaleString()}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{s.user?.displayName ?? s.user?.username ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{s.hospital?.shortCode ?? '—'}</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700">{s.alcoholRelated}</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700">{s.virus}</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700">{s.mci}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{s.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-500">{total} total submissions</p>
                    <div className="flex gap-2">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border disabled:opacity-40">Prev</button>
                      <span className="px-3 py-1">{page} / {totalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border disabled:opacity-40">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
