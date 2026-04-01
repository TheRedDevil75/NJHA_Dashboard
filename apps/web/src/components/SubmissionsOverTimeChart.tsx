import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CollectionPeriod } from '../types';

interface Props {
  periods: CollectionPeriod[];
  primaryColor: string;
}

export function SubmissionsOverTimeChart({ periods, primaryColor }: Props) {
  const data = [...periods]
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map((p) => ({
      label: new Date(p.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      submissions: p._count?.submissions ?? 0,
    }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Submissions Over Time
      </h2>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
          No collection periods yet — chart will populate once periods are created.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }}
              />
              <Line
                type="monotone"
                dataKey="submissions"
                stroke={primaryColor}
                strokeWidth={2.5}
                dot={{ fill: primaryColor, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 text-right">
            {data.length} period{data.length !== 1 ? 's' : ''} shown
          </p>
        </>
      )}
    </div>
  );
}
