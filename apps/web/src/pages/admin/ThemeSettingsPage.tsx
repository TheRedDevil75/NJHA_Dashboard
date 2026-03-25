import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/Layout';
import { useTheme } from '../../context/ThemeContext';
import { ThemeConfig, ButtonStyle, CardStyle } from '../../types';
import { getErrorMessage } from '../../api/client';

const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Nunito', 'Source Sans Pro'] as const;

const COLOR_FIELDS: { key: keyof ThemeConfig; label: string }[] = [
  { key: 'primaryColor', label: 'Primary Color' },
  { key: 'secondaryColor', label: 'Secondary Color' },
  { key: 'backgroundColor', label: 'Background Color' },
  { key: 'textColor', label: 'Text Color' },
  { key: 'headerBackground', label: 'Header Background' },
  { key: 'headerTextColor', label: 'Header Text Color' },
];

export function ThemeSettingsPage() {
  const { theme, update } = useTheme();
  const [draft, setDraft] = useState<Partial<ThemeConfig>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (theme) setDraft({ ...theme });
  }, [theme]);

  const patch = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setIsDirty(true);
  };

  const onSave = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      await update(draft);
      setIsDirty(false);
      setSuccess('Theme saved and applied to all users.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2';
  const t = draft;

  if (!theme) {
    return <AdminLayout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-2xl font-bold" style={{ color: theme.textColor }}>Appearance Settings</h1>
          <div className="flex items-center gap-3">
            {isDirty && <span className="text-sm text-orange-500 font-medium">Unsaved changes</span>}
            <button
              onClick={onSave}
              disabled={isSaving || !isDirty}
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-opacity"
              style={{ backgroundColor: theme.primaryColor, opacity: (isSaving || !isDirty) ? 0.5 : 1 }}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {/* Branding */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-700 border-b pb-3">Branding</h2>

          <div>
            <label className="block text-sm font-medium mb-1">App Name</label>
            <input
              type="text"
              value={t.appName ?? ''}
              onChange={(e) => patch('appName', e.target.value)}
              className={inputClass}
              placeholder="Symptom Tracker"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Logo URL (optional)</label>
            <input
              type="url"
              value={t.logoUrl ?? ''}
              onChange={(e) => patch('logoUrl', e.target.value || null)}
              className={inputClass}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Login Page Message</label>
            <textarea
              value={t.loginMessage ?? ''}
              onChange={(e) => patch('loginMessage', e.target.value || null)}
              rows={3}
              className={inputClass + ' resize-none'}
              placeholder="Optional message shown below the login form"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Dashboard Message</label>
            <textarea
              value={t.dashboardMessage ?? ''}
              onChange={(e) => patch('dashboardMessage', e.target.value || null)}
              rows={3}
              className={inputClass + ' resize-none'}
              placeholder="Optional message shown at top of user dashboard"
            />
          </div>
        </section>

        {/* Colors */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-700 border-b pb-3">Colors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={(t[key] as string) ?? '#000000'}
                    onChange={(e) => patch(key, e.target.value as ThemeConfig[typeof key])}
                    className="h-10 w-12 rounded border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={(t[key] as string) ?? ''}
                    onChange={(e) => patch(key, e.target.value as ThemeConfig[typeof key])}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2"
                    placeholder="#2563EB"
                    maxLength={7}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-700 border-b pb-3">Typography</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Font Family</label>
            <select value={t.fontFamily ?? 'Inter'} onChange={(e) => patch('fontFamily', e.target.value)} className={inputClass}>
              {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Font Size Base: <span className="font-bold">{t.fontSizeBase ?? 16}px</span>
            </label>
            <input
              type="range"
              min="14"
              max="18"
              value={t.fontSizeBase ?? 16}
              onChange={(e) => patch('fontSizeBase', parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>14px (Small)</span>
              <span>18px (Large)</span>
            </div>
          </div>
        </section>

        {/* Component Styles */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-700 border-b pb-3">Component Style</h2>

          <div>
            <label className="block text-sm font-medium mb-2">Button Style</label>
            <div className="flex gap-3">
              {(['rounded', 'square', 'pill'] as ButtonStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => patch('buttonStyle', style)}
                  className="flex-1 py-2 text-sm font-medium border-2 transition-all"
                  style={{
                    borderColor: t.buttonStyle === style ? (theme.primaryColor ?? '#2563EB') : '#E5E7EB',
                    backgroundColor: t.buttonStyle === style ? `${theme.primaryColor ?? '#2563EB'}15` : 'white',
                    borderRadius: style === 'pill' ? '9999px' : style === 'square' ? '4px' : '8px',
                  }}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Card Style</label>
            <div className="flex gap-3">
              {(['flat', 'raised', 'bordered'] as CardStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => patch('cardStyle', style)}
                  className="flex-1 py-2 text-sm font-medium border-2 transition-all rounded-lg"
                  style={{
                    borderColor: t.cardStyle === style ? (theme.primaryColor ?? '#2563EB') : '#E5E7EB',
                    backgroundColor: t.cardStyle === style ? `${theme.primaryColor ?? '#2563EB'}15` : 'white',
                  }}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Form Fields */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-700 border-b pb-3">User Dashboard Form Fields</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Severity Field</p>
              <p className="text-xs text-gray-500">Adds Mild / Moderate / Severe selector</p>
            </div>
            <button
              type="button"
              onClick={() => patch('showSeverityField', !t.showSeverityField)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${t.showSeverityField ? 'bg-blue-600' : 'bg-gray-300'}`}
              style={{ backgroundColor: t.showSeverityField ? (theme.primaryColor ?? '#2563EB') : '#D1D5DB' }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${t.showSeverityField ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Notes Field</p>
              <p className="text-xs text-gray-500">Adds optional free-text notes input</p>
            </div>
            <button
              type="button"
              onClick={() => patch('showNotesField', !t.showNotesField)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ backgroundColor: t.showNotesField ? (theme.primaryColor ?? '#2563EB') : '#D1D5DB' }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${t.showNotesField ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
