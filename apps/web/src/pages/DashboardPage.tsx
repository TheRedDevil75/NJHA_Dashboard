import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { submissionsApi, adminHospitalsApi, getErrorMessage } from '../api/client';
import { Layout } from '../components/Layout';
import { Hospital, Submission, CollectionPeriod } from '../types';

const PATIENT_TYPES = [
  { key: 'alcoholRelated' as const, label: 'Alcohol Related' },
  { key: 'virus' as const, label: 'Virus' },
  { key: 'mci' as const, label: 'MCI' },
];

function useCountdown(period: CollectionPeriod | null, intervalType?: string, intervalValue?: number) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!period || !intervalType || !intervalValue) {
      setTimeLeft('');
      return;
    }

    const getMs = (type: string) => {
      switch (type) {
        case 'HOURS': return 60 * 60 * 1000;
        case 'DAYS': return 24 * 60 * 60 * 1000;
        case 'WEEKS': return 7 * 24 * 60 * 60 * 1000;
        default: return 7 * 24 * 60 * 60 * 1000;
      }
    };

    const endTime = new Date(period.startedAt).getTime() + intervalValue * getMs(intervalType);

    const tick = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) { setTimeLeft('Period ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [period, intervalType, intervalValue]);

  return timeLeft;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [counts, setCounts] = useState({ alcoholRelated: 0, virus: 0, mci: 0 });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [period, setPeriod] = useState<CollectionPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const timeLeft = useCountdown(
    period,
    (period as CollectionPeriod & { intervalConfig?: { intervalType: string; intervalValue: number } })?.intervalConfig?.intervalType,
    (period as CollectionPeriod & { intervalConfig?: { intervalType: string; intervalValue: number } })?.intervalConfig?.intervalValue
  );

  const loadData = useCallback(async () => {
    try {
      const [hospitalsData, submissionsData] = await Promise.all([
        adminHospitalsApi.list(),
        submissionsApi.mySubmissions(),
      ]);
      const activeHospitals = hospitalsData.filter((h) => h.isActive);
      setHospitals(activeHospitals);
      setMySubmissions(submissionsData.submissions);
      setPeriod(submissionsData.period);

      const assignedHospital = activeHospitals.find((h) => h.id === user?.assignedHospitalId);
      if (assignedHospital && !selectedHospitalId) {
        setSelectedHospitalId(assignedHospital.id);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.assignedHospitalId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSubmit = async () => {
    if (!selectedHospitalId) return;
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      await submissionsApi.submit({
        hospitalId: selectedHospitalId,
        alcoholRelated: counts.alcoholRelated,
        virus: counts.virus,
        mci: counts.mci,
        ...(theme?.showNotesField && notes.trim() ? { notes: notes.trim() } : {}),
      });

      setSubmitSuccess(true);
      setCounts({ alcoholRelated: 0, virus: 0, mci: 0 });
      setNotes('');
      await loadData();
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.includes('period')) {
        await loadData();
      }
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const btnRadius =
    theme?.buttonStyle === 'pill' ? '9999px' :
    theme?.buttonStyle === 'square' ? '4px' : '8px';

  const totalByType = mySubmissions.reduce(
    (acc, s) => ({
      alcoholRelated: acc.alcoholRelated + s.alcoholRelated,
      virus: acc.virus + s.virus,
      mci: acc.mci + s.mci,
    }),
    { alcoholRelated: 0, virus: 0, mci: 0 }
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {theme?.dashboardMessage && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            {theme.dashboardMessage}
          </div>
        )}

        {period && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-100 text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span>Current collection period</span>
              {timeLeft && (
                <span className="font-medium text-gray-800">Ends in: {timeLeft}</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Started: {new Date(period.startedAt).toLocaleString()}
            </div>
          </div>
        )}

        {!period && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            No active collection period. Please contact your administrator.
          </div>
        )}

        {/* Form card */}
        <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
          <h2 className="text-lg font-semibold" style={{ color: theme?.textColor }}>
            Submit a Report
          </h2>

          {/* Hospital selector */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme?.textColor }}>
              Hospital <span className="text-red-500">*</span>
            </label>
            {hospitals.length === 0 ? (
              <p className="text-sm text-gray-400">No hospitals available. Contact your administrator.</p>
            ) : (
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ minHeight: '48px' }}
              >
                <option value="">Select a hospital…</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.shortCode})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Patient type counts */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: theme?.textColor }}>
              Patient Counts <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {PATIENT_TYPES.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-700 w-36">{label}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCounts((c) => ({ ...c, [key]: Math.max(0, c[key] - 1) }))}
                      className="w-9 h-9 flex items-center justify-center border-2 border-gray-300 rounded-lg text-lg font-bold text-gray-600 hover:border-gray-400 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={counts[key]}
                      onChange={(e) => setCounts((c) => ({ ...c, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-16 text-center py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2"
                      style={{ color: theme?.textColor }}
                    />
                    <button
                      type="button"
                      onClick={() => setCounts((c) => ({ ...c, [key]: c[key] + 1 }))}
                      className="w-9 h-9 flex items-center justify-center border-2 rounded-lg text-lg font-bold text-white transition-colors"
                      style={{ backgroundColor: theme?.primaryColor ?? '#2563EB', borderColor: theme?.primaryColor ?? '#2563EB' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes (optional, admin-controlled) */}
          {theme?.showNotesField && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme?.textColor }}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
                placeholder="Add any relevant notes…"
              />
            </div>
          )}

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          {submitSuccess && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 font-medium">
              Report submitted successfully!
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedHospitalId || !period}
            className="w-full py-4 text-base font-semibold text-white transition-opacity min-h-[56px]"
            style={{
              backgroundColor: theme?.primaryColor ?? '#2563EB',
              borderRadius: btnRadius,
              opacity: (isSubmitting || !selectedHospitalId || !period) ? 0.5 : 1,
            }}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>

        {/* My submissions summary */}
        {mySubmissions.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-700">My Submissions This Period</h3>
              <Link to="/my-submissions" className="text-xs font-medium" style={{ color: theme?.primaryColor }}>
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PATIENT_TYPES.map(({ key, label }) => (
                <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-800">{totalByType[key]}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">
              {mySubmissions.length} report{mySubmissions.length !== 1 ? 's' : ''} submitted this period
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
