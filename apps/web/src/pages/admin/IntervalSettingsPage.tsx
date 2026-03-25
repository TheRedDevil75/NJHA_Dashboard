import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/Layout';
import { adminIntervalsApi, getErrorMessage } from '../../api/client';
import { IntervalConfig } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const intervalSchema = z.object({
  name: z.string().min(1, 'Name required'),
  intervalType: z.enum(['HOURS', 'DAYS', 'WEEKS']),
  intervalValue: z.coerce.number().int().positive('Must be positive'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  timezone: z.string().min(1),
});

type IntervalForm = z.infer<typeof intervalSchema>;

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Phoenix', 'UTC',
];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function IntervalSettingsPage() {
  const { theme } = useTheme();
  const [configs, setConfigs] = useState<IntervalConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | 'reset' | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<IntervalConfig | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const form = useForm<IntervalForm>({
    resolver: zodResolver(intervalSchema),
    defaultValues: { intervalType: 'WEEKS', intervalValue: 1, startTime: '00:00', timezone: 'America/New_York' },
  });

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminIntervalsApi.list();
      setConfigs(data);
    } catch {
      setError('Failed to load interval configs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const onSubmit = async (data: IntervalForm) => {
    setActionError('');
    try {
      if (modal === 'create') {
        await adminIntervalsApi.create(data as IntervalConfig);
      } else if (modal === 'edit' && selectedConfig) {
        await adminIntervalsApi.update(selectedConfig.id, data);
      }
      setModal(null);
      loadConfigs();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const onActivate = async (id: string) => {
    try {
      await adminIntervalsApi.activate(id);
      setActionSuccess('Interval config activated.');
      loadConfigs();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const onTriggerReset = async () => {
    try {
      await adminIntervalsApi.triggerReset();
      setModal(null);
      setActionSuccess('Period reset. A new collection period has started.');
      loadConfigs();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const activeConfig = configs.find((c) => c.isActive);
  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2';
  const btnPrimary = {
    backgroundColor: theme?.primaryColor ?? '#2563EB',
    color: 'white',
    borderRadius: theme?.buttonStyle === 'pill' ? '9999px' : theme?.buttonStyle === 'square' ? '4px' : '8px',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: theme?.textColor }}>Collection Intervals</h1>

        {actionSuccess && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{actionSuccess}</p>
        )}

        {/* Active config card */}
        {activeConfig && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Active Config</p>
                <h2 className="text-lg font-semibold text-gray-800">{activeConfig.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Every {activeConfig.intervalValue} {activeConfig.intervalType.toLowerCase()}
                  {activeConfig.intervalValue !== 1 ? 's' : ''}, resetting at{' '}
                  {activeConfig.startTime} ({activeConfig.timezone})
                </p>
              </div>
              <button
                onClick={() => { setModal('reset'); setActionError(''); }}
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                Manual Reset
              </button>
            </div>
          </div>
        )}

        {/* Config list */}
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-700">All Configs</h2>
              <button
                onClick={() => { form.reset({ intervalType: 'WEEKS', intervalValue: 1, startTime: '00:00', timezone: 'America/New_York' }); setSelectedConfig(null); setActionError(''); setModal('create'); }}
                className="px-4 py-2 text-sm font-semibold text-white"
                style={btnPrimary}
              >
                + New Config
              </button>
            </div>

            <div className="space-y-3">
              {configs.map((c) => (
                <div key={c.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{c.name}</span>
                      {c.isActive && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Every {c.intervalValue} {c.intervalType.toLowerCase()}{c.intervalValue !== 1 ? 's' : ''} at {c.startTime} ({c.timezone})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedConfig(c); form.reset({ name: c.name, intervalType: c.intervalType, intervalValue: c.intervalValue, startTime: c.startTime, timezone: c.timezone }); setActionError(''); setModal('edit'); }}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    {!c.isActive && (
                      <button onClick={() => onActivate(c.id)} className="text-xs font-medium text-green-600 hover:underline">
                        Set Active
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {configs.length === 0 && (
                <p className="text-center py-8 text-gray-400">No interval configs yet.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New Interval Config' : 'Edit Config'} onClose={() => setModal(null)}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input {...form.register('name')} className={inputClass} placeholder="e.g. Weekly Monday Reset" />
              {form.formState.errors.name && <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Interval Type</label>
                <select {...form.register('intervalType')} className={inputClass}>
                  <option value="HOURS">Hours</option>
                  <option value="DAYS">Days</option>
                  <option value="WEEKS">Weeks</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Value</label>
                <input {...form.register('intervalValue')} type="number" min="1" className={inputClass} />
                {form.formState.errors.intervalValue && <p className="text-xs text-red-500 mt-1">{form.formState.errors.intervalValue.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reset Time (HH:MM)</label>
              <input {...form.register('startTime')} className={inputClass} placeholder="00:00" />
              {form.formState.errors.startTime && <p className="text-xs text-red-500 mt-1">{form.formState.errors.startTime.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select {...form.register('timezone')} className={inputClass}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
            <button type="submit" disabled={form.formState.isSubmitting} className="w-full py-2.5 text-sm font-semibold text-white" style={btnPrimary}>
              {form.formState.isSubmitting ? 'Saving…' : modal === 'create' ? 'Create Config' : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}

      {/* Manual reset confirmation */}
      {modal === 'reset' && (
        <Modal title="Manual Period Reset" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-700 mb-2 font-semibold">⚠️ This cannot be undone.</p>
          <p className="text-sm text-gray-600 mb-6">
            This will immediately end the current collection period and archive all submitted data. A new period will begin.
          </p>
          {actionError && <p className="text-xs text-red-600 mb-4">{actionError}</p>}
          <div className="flex gap-3">
            <button onClick={() => setModal(null)} className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={onTriggerReset} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-red-600 hover:bg-red-700">
              Reset Period
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
