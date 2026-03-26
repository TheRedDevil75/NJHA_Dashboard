import { CollectionPeriod, PatientField, Submission, SubmissionValue } from '@prisma/client';

type SubmissionWithRelations = Submission & {
  user: { username: string; displayName: string | null };
  hospital: { name: string; shortCode: string };
  collectionPeriod: { startedAt: Date; endedAt: Date | null };
  values: (SubmissionValue & { field: PatientField })[];
};

function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString();
}

export function buildCsv(
  submissions: SubmissionWithRelations[],
  period: CollectionPeriod,
  fields: PatientField[]
): string {
  const fieldHeaders = fields.map((f) => f.key);

  const headers = [
    'period_id',
    'period_start',
    'period_end',
    'submission_id',
    'submitted_at',
    'user_username',
    'user_display_name',
    'hospital_name',
    'hospital_short_code',
    ...fieldHeaders,
    'notes',
  ];

  const rows = submissions.map((s) => {
    const fieldValues = fields.map((f) => {
      const sv = s.values.find((v) => v.fieldId === f.id);
      return escapeCsvField(String(sv?.value ?? 0));
    });

    return [
      escapeCsvField(period.id),
      escapeCsvField(formatDate(period.startedAt)),
      escapeCsvField(formatDate(period.endedAt)),
      escapeCsvField(s.id),
      escapeCsvField(formatDate(s.submittedAt)),
      escapeCsvField(s.user.username),
      escapeCsvField(s.user.displayName),
      escapeCsvField(s.hospital.name),
      escapeCsvField(s.hospital.shortCode),
      ...fieldValues,
      escapeCsvField(s.notes),
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
