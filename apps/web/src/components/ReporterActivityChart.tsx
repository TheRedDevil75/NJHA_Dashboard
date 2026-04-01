import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface HospitalRow {
  name: string;
  hasSubmitted: boolean;
}

interface Props {
  submitted: number;
  notSubmitted: number;
  byHospital: HospitalRow[];
  primaryColor: string;
}

export function ReporterActivityChart({ submitted, notSubmitted, byHospital, primaryColor }: Props) {
  const total = submitted + notSubmitted;

  const donutData = total === 0
    ? [{ name: 'No hospitals', value: 1 }]
    : [
        { name: 'Submitted', value: submitted },
        { name: 'Not Yet Submitted', value: notSubmitted },
      ];

  const COLORS = total === 0 ? ['#E5E7EB'] : [primaryColor, '#E5E7EB'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Hospital Activity — Current Period
      </h2>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Donut */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center" style={{ width: 200 }}>
          <ResponsiveContainer width={200} height={240}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="45%"
                innerRadius={58}
                outerRadius={88}
                dataKey="value"
                strokeWidth={0}
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} hospitals`, '']} />
              <Legend
                iconType="circle"
                iconSize={10}
                formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center -mt-2">
            <span className="text-3xl font-bold" style={{ color: primaryColor }}>{submitted}</span>
            <span className="text-gray-400 text-lg"> / {total}</span>
            <p className="text-xs text-gray-500 mt-0.5">hospitals submitted</p>
          </div>
        </div>

        {/* Hospital breakdown */}
        {byHospital.length > 0 && (
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 280 }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Hospital</th>
                  <th className="text-right pb-2 font-medium w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {byHospital.map((row) => (
                  <tr key={row.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 text-gray-700 truncate max-w-[200px]">{row.name}</td>
                    <td className="py-1.5 text-right">
                      {row.hasSubmitted ? (
                        <span className="text-green-600 font-semibold text-xs">Done</span>
                      ) : (
                        <span className="text-amber-500 font-semibold text-xs">Not In</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
