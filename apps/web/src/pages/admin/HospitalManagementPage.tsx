import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '../../components/Layout';
import { adminHospitalsApi, getErrorMessage } from '../../api/client';
import { Hospital } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';

const hospitalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  shortCode: z.string().min(1, 'Short code is required').max(6).regex(/^[A-Za-z0-9]+$/, 'Alphanumeric only'),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
});

type HospitalForm = z.infer<typeof hospitalSchema>;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

type ImportResult = { row: number; name: string; status: string; reason?: string };

export function HospitalManagementPage() {
  const { theme } = useTheme();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | 'deactivate' | 'import' | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [actionError, setActionError] = useState('');
  const [importRows, setImportRows] = useState<object[]>([]);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [importSummary, setImportSummary] = useState<{ created: number; skipped: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<HospitalForm>({ resolver: zodResolver(hospitalSchema) });

  const loadHospitals = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminHospitalsApi.list();
      setHospitals(data);
    } catch {
      setError('Failed to load hospitals.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadHospitals(); }, [loadHospitals]);

  const openCreate = () => {
    form.reset({ name: '', shortCode: '', address: '', city: '', state: '' });
    setSelectedHospital(null);
    setActionError('');
    setModal('create');
  };

  const openEdit = (h: Hospital) => {
    setSelectedHospital(h);
    form.reset({ name: h.name, shortCode: h.shortCode, address: h.address ?? '', city: h.city ?? '', state: h.state ?? '' });
    setActionError('');
    setModal('edit');
  };

  const onSubmit = async (data: HospitalForm) => {
    setActionError('');
    try {
      if (modal === 'create') {
        await adminHospitalsApi.create(data as Hospital);
      } else if (modal === 'edit' && selectedHospital) {
        await adminHospitalsApi.update(selectedHospital.id, data);
      }
      setModal(null);
      loadHospitals();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const onDeactivate = async () => {
    if (!selectedHospital) return;
    try {
      await adminHospitalsApi.deactivate(selectedHospital.id);
      setModal(null);
      loadHospitals();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const openImport = () => {
    setImportRows([]);
    setImportPreview([]);
    setImportResults(null);
    setImportSummary(null);
    setActionError('');
    setModal('import');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionError('');
    setImportResults(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
        if (json.length === 0) { setActionError('No rows found in the file.'); return; }
        const mapped = json.map((r) => ({
          name: String(r['Hospital Name'] ?? r['name'] ?? r['Name'] ?? '').trim(),
          shortCode: String(r['Short Code'] ?? r['shortCode'] ?? r['ShortCode'] ?? r['Code'] ?? '').trim(),
          address: String(r['Address'] ?? r['address'] ?? '').trim() || undefined,
          city: String(r['City'] ?? r['city'] ?? '').trim() || undefined,
          state: String(r['State'] ?? r['state'] ?? '').trim() || undefined,
        }));
        setImportRows(mapped);
        setImportPreview(json.slice(0, 5));
      } catch {
        setActionError('Failed to read file. Ensure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportSubmit = async () => {
    if (importRows.length === 0) { setActionError('No data to import.'); return; }
    setIsImporting(true);
    setActionError('');
    try {
      const result = await adminHospitalsApi.import(importRows);
      setImportResults(result.results);
      setImportSummary({ created: result.created, skipped: result.skipped });
      if (result.created > 0) loadHospitals();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsImporting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2';
  const btnPrimary = {
    backgroundColor: theme?.primaryColor ?? '#2563EB',
    color: 'white',
    borderRadius: theme?.buttonStyle === 'pill' ? '9999px' : theme?.buttonStyle === 'square' ? '4px' : '8px',
  };

  const HospitalForm = () => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Hospital Name *</label>
        <input {...form.register('name')} className={inputClass} placeholder="e.g. General Regional Medical Center" />
        {form.formState.errors.name && <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Short Code * (max 6 chars)</label>
        <input
          {...form.register('shortCode')}
          className={inputClass}
          placeholder="e.g. GRMH"
          style={{ textTransform: 'uppercase' }}
          onChange={(e) => form.setValue('shortCode', e.target.value.toUpperCase())}
        />
        {form.formState.errors.shortCode && <p className="text-xs text-red-500 mt-1">{form.formState.errors.shortCode.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Address</label>
        <input {...form.register('address')} className={inputClass} placeholder="Optional" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input {...form.register('city')} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <input {...form.register('state')} className={inputClass} placeholder="e.g. NJ" />
        </div>
      </div>
      {actionError && <p className="text-xs text-red-600">{actionError}</p>}
      <button type="submit" disabled={form.formState.isSubmitting} className="w-full py-2.5 text-sm font-semibold text-white" style={btnPrimary}>
        {form.formState.isSubmitting ? 'Saving…' : modal === 'create' ? 'Create Hospital' : 'Save Changes'}
      </button>
    </form>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold" style={{ color: theme?.textColor }}>Hospital Management</h1>
          <div className="flex gap-2">
            <button onClick={openImport} className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
              Import from Excel
            </button>
            <button onClick={openCreate} className="px-4 py-2 text-sm font-semibold text-white" style={btnPrimary}>
              + Add Hospital
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name', 'Code', 'City/State', 'Users', 'Submissions', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hospitals.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hospitals yet. Add the first one!</td></tr>
                ) : hospitals.map((h) => (
                  <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{h.name}</td>
                    <td className="px-4 py-3">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{h.shortCode}</code>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{[h.city, h.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{h._count?.users ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{h._count?.submissions ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${h.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {h.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(h)} className="text-xs font-medium text-blue-600 hover:underline">Edit</button>
                        {h.isActive && (
                          <button onClick={() => { setSelectedHospital(h); setModal('deactivate'); setActionError(''); }} className="text-xs font-medium text-red-600 hover:underline">
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Add Hospital' : `Edit: ${selectedHospital?.name}`} onClose={() => setModal(null)}>
          <HospitalForm />
        </Modal>
      )}

      {modal === 'import' && (
        <Modal title="Import Hospitals from Excel" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload an Excel (.xlsx) or CSV file with columns: <strong>Hospital Name</strong>, <strong>Short Code</strong>, Address, City, State.
            </p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const ws = XLSX.utils.aoa_to_sheet([['Hospital Name', 'Short Code', 'Address', 'City', 'State'], ['Example Hospital', 'EXHSP', '123 Main St', 'Newark', 'NJ']]);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Hospitals');
                XLSX.writeFile(wb, 'hospitals_template.xlsx');
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Download template
            </a>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
            {importPreview.length > 0 && !importResults && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{importRows.length} row(s) detected — preview (first 5):</p>
                <div className="overflow-x-auto border rounded text-xs">
                  <table className="w-full">
                    <thead className="bg-gray-50"><tr>{Object.keys(importPreview[0]).map((k) => <th key={k} className="px-2 py-1 text-left font-medium text-gray-500">{k}</th>)}</tr></thead>
                    <tbody>{importPreview.map((row, i) => <tr key={i} className="border-t">{Object.values(row).map((v, j) => <td key={j} className="px-2 py-1 text-gray-700">{v}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}
            {importResults && importSummary && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  <span className="text-green-700">{importSummary.created} created</span>
                  {importSummary.skipped > 0 && <span className="text-yellow-700 ml-2">{importSummary.skipped} skipped</span>}
                </p>
                {importResults.filter((r) => r.status === 'skipped').length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                    {importResults.filter((r) => r.status === 'skipped').map((r) => (
                      <p key={r.row} className="text-yellow-700">Row {r.row} ({r.name}): {r.reason}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
            {!importResults ? (
              <button
                onClick={handleImportSubmit}
                disabled={importRows.length === 0 || isImporting}
                className="w-full py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={btnPrimary}
              >
                {isImporting ? 'Importing…' : `Import ${importRows.length > 0 ? importRows.length + ' hospitals' : ''}`}
              </button>
            ) : (
              <button onClick={() => setModal(null)} className="w-full py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Close
              </button>
            )}
          </div>
        </Modal>
      )}

      {modal === 'deactivate' && selectedHospital && (
        <Modal title="Deactivate Hospital" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-700 mb-4">
            Deactivating <strong>{selectedHospital.name}</strong> will prevent new submissions from being assigned to it. Existing data is preserved.
          </p>
          {actionError && <p className="text-xs text-red-600 mb-4">{actionError}</p>}
          <div className="flex gap-3">
            <button onClick={() => setModal(null)} className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={onDeactivate} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-red-600 hover:bg-red-700">Deactivate</button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
