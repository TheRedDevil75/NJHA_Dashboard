import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { submissionsApi } from '../api/client';
import { Submission } from '../types';
import { useTheme } from '../context/ThemeContext';

export function MySubmissionsPage() {
  const { theme } = useTheme();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    submissionsApi.mySubmissions()
      .then(({ submissions }) => setSubmissions(submissions))
      .catch(() => setError('Failed to load submissions.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: theme?.textColor }}>
          My Submissions This Period
        </h1>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">{error}</div>
        )}

        {!isLoading && !error && submissions.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No submissions yet this period.</p>
            <p className="text-sm mt-1">Use the dashboard to submit your first report.</p>
          </div>
        )}

        {!isLoading && submissions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              {submissions.length} report{submissions.length !== 1 ? 's' : ''} this period
            </p>
            {submissions.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    {s.hospital?.name ?? '—'}
                    <span className="text-gray-400 font-normal"> ({s.hospital?.shortCode})</span>
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-600">
                    <span>Alcohol Related: <strong>{s.alcoholRelated}</strong></span>
                    <span>Virus: <strong>{s.virus}</strong></span>
                    <span>MCI: <strong>{s.mci}</strong></span>
                  </div>
                  {s.notes && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">"{s.notes}"</p>
                  )}
                </div>
                <div className="text-xs text-gray-400 sm:text-right whitespace-nowrap">
                  {new Date(s.submittedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
