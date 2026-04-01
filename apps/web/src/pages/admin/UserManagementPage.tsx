import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '../../components/Layout';
import { adminUsersApi, adminHospitalsApi, getErrorMessage } from '../../api/client';
import { User, Hospital } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';

const createSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(8).regex(/[a-zA-Z]/).regex(/[0-9]/),
  displayName: z.string().max(100).optional(),
  assignedHospitalId: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']),
});

const editSchema = z.object({
  displayName: z.string().max(100).optional(),
  assignedHospitalId: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']),
  isActive: z.boolean(),
});

const resetPwSchema = z.object({
  newPassword: z.string().min(8).regex(/[a-zA-Z]/).regex(/[0-9]/),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;
type ResetPwForm = z.infer<typeof resetPwSchema>;
type ImportResult = { row: number; username: string; status: string; reason?: string };

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

export function UserManagementPage() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | 'resetPw' | 'deactivate' | 'import' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [importRows, setImportRows] = useState<object[]>([]);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [importSummary, setImportSummary] = useState<{ created: number; skipped: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { role: 'USER' } });
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });
  const resetPwForm = useForm<ResetPwForm>({ resolver: zodResolver(resetPwSchema) });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, hospitalsData] = await Promise.all([
        adminUsersApi.list({ page, search }),
        adminHospitalsApi.list(),
      ]);
      setUsers(usersData.users);
      setTotal(usersData.total);
      setTotalPages(usersData.totalPages);
      setHospitals(hospitalsData);
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const openEdit = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      displayName: user.displayName ?? '',
      assignedHospitalId: user.assignedHospitalId ?? '',
      role: user.role,
      isActive: user.isActive ?? true,
    });
    setModal('edit');
    setActionError('');
    setActionSuccess('');
  };

  const onCreateSubmit = async (data: CreateForm) => {
    setActionError('');
    try {
      await adminUsersApi.create({
        ...data,
        assignedHospitalId: data.assignedHospitalId || undefined,
      });
      setActionSuccess('User created.');
      createForm.reset();
      setModal(null);
      loadData();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const onEditSubmit = async (data: EditForm) => {
    if (!selectedUser) return;
    setActionError('');
    try {
      await adminUsersApi.update(selectedUser.id, {
        displayName: data.displayName,
        assignedHospitalId: data.assignedHospitalId || null,
        role: data.role,
        isActive: data.isActive,
      });
      setModal(null);
      loadData();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const onResetPassword = async (data: ResetPwForm) => {
    if (!selectedUser) return;
    setActionError('');
    try {
      await adminUsersApi.resetPassword(selectedUser.id, data.newPassword);
      setActionSuccess(`Password reset for ${selectedUser.username}.`);
      setModal(null);
      resetPwForm.reset();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const onDeactivate = async () => {
    if (!selectedUser) return;
    try {
      await adminUsersApi.deactivate(selectedUser.id);
      setModal(null);
      loadData();
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
          username: String(r['Username'] ?? r['username'] ?? '').trim(),
          password: String(r['Password'] ?? r['password'] ?? '').trim(),
          displayName: String(r['Display Name'] ?? r['displayName'] ?? '').trim() || undefined,
          assignedHospitalCode: String(r['Hospital Code'] ?? r['hospitalCode'] ?? r['Hospital'] ?? '').trim() || undefined,
          role: (['USER', 'ADMIN'].includes(String(r['Role'] ?? r['role'] ?? '').toUpperCase()) ? String(r['Role'] ?? r['role']).toUpperCase() : 'USER') as 'USER' | 'ADMIN',
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
      const result = await adminUsersApi.import(importRows);
      setImportResults(result.results);
      setImportSummary({ created: result.created, skipped: result.skipped });
      if (result.created > 0) loadData();
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-2xl font-bold" style={{ color: theme?.textColor }}>User Management</h1>
          <div className="flex gap-2">
            <button onClick={openImport} className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
              Import from Excel
            </button>
            <button
              onClick={() => { setModal('create'); setActionError(''); createForm.reset({ role: 'USER' }); }}
              className="px-4 py-2 text-sm font-semibold text-white"
              style={btnPrimary}
            >
              + Add User
            </button>
          </div>
        </div>

        {actionSuccess && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{actionSuccess}</p>
        )}

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by username or name…"
          className={inputClass}
        />

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Username', 'Display Name', 'Hospital', 'Role', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No users found.</td></tr>
                  ) : users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
                      <td className="px-4 py-3 text-gray-600">{u.displayName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {hospitals.find((h) => h.id === u.assignedHospitalId)?.shortCode ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(u)} className="text-xs font-medium text-blue-600 hover:underline">Edit</button>
                          <button
                            onClick={() => { setSelectedUser(u); setModal('resetPw'); setActionError(''); resetPwForm.reset(); }}
                            className="text-xs font-medium text-orange-600 hover:underline"
                          >
                            Reset PW
                          </button>
                          {u.isActive && (
                            <button onClick={() => { setSelectedUser(u); setModal('deactivate'); }} className="text-xs font-medium text-red-600 hover:underline">
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-500">Showing {users.length} of {total} users</p>
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

      {/* Import modal */}
      {modal === 'import' && (
        <Modal title="Import Users from Excel" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload an Excel (.xlsx) or CSV file with columns: <strong>Username</strong>, <strong>Password</strong>, Display Name, Hospital Code, Role (USER or ADMIN).
            </p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const ws = XLSX.utils.aoa_to_sheet([['Username', 'Password', 'Display Name', 'Hospital Code', 'Role'], ['jsmith', 'Password1', 'John Smith', 'GRMH', 'USER']]);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Users');
                XLSX.writeFile(wb, 'users_template.xlsx');
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
                    <tbody>{importPreview.map((row, i) => <tr key={i} className="border-t">{Object.values(row).map((v, j) => <td key={j} className="px-2 py-1 text-gray-700">{j === 1 ? '••••••••' : v}</td>)}</tr>)}</tbody>
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
                      <p key={r.row} className="text-yellow-700">Row {r.row} ({r.username}): {r.reason}</p>
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
                {isImporting ? 'Importing…' : `Import ${importRows.length > 0 ? importRows.length + ' users' : ''}`}
              </button>
            ) : (
              <button onClick={() => setModal(null)} className="w-full py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Close
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Create modal */}
      {modal === 'create' && (
        <Modal title="Add User" onClose={() => setModal(null)}>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username *</label>
              <input {...createForm.register('username')} className={inputClass} placeholder="e.g. jsmith" />
              {createForm.formState.errors.username && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password *</label>
              <input {...createForm.register('password')} type="password" className={inputClass} placeholder="Min 8 chars, 1 letter, 1 number" />
              {createForm.formState.errors.password && <p className="text-xs text-red-500 mt-1">Min 8 chars with letter and number</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input {...createForm.register('displayName')} className={inputClass} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assigned Hospital</label>
              <select {...createForm.register('assignedHospitalId')} className={inputClass}>
                <option value="">None</option>
                {hospitals.filter((h) => h.isActive).map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select {...createForm.register('role')} className={inputClass}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
            <button type="submit" disabled={createForm.formState.isSubmitting} className="w-full py-2.5 text-sm font-semibold text-white" style={btnPrimary}>
              {createForm.formState.isSubmitting ? 'Creating…' : 'Create User'}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {modal === 'edit' && selectedUser && (
        <Modal title={`Edit: ${selectedUser.username}`} onClose={() => setModal(null)}>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input {...editForm.register('displayName')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assigned Hospital</label>
              <select {...editForm.register('assignedHospitalId')} className={inputClass}>
                <option value="">None</option>
                {hospitals.filter((h) => h.isActive).map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select {...editForm.register('role')} className={inputClass}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...editForm.register('isActive')} id="isActive" />
              <label htmlFor="isActive" className="text-sm">Active</label>
            </div>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
            <button type="submit" disabled={editForm.formState.isSubmitting} className="w-full py-2.5 text-sm font-semibold text-white" style={btnPrimary}>
              {editForm.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}

      {/* Reset password modal */}
      {modal === 'resetPw' && selectedUser && (
        <Modal title={`Reset Password: ${selectedUser.username}`} onClose={() => setModal(null)}>
          <form onSubmit={resetPwForm.handleSubmit(onResetPassword)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">New Password *</label>
              <input {...resetPwForm.register('newPassword')} type="password" className={inputClass} placeholder="Min 8 chars, 1 letter, 1 number" />
              {resetPwForm.formState.errors.newPassword && <p className="text-xs text-red-500 mt-1">Min 8 chars with letter and number</p>}
            </div>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
            <button type="submit" disabled={resetPwForm.formState.isSubmitting} className="w-full py-2.5 text-sm font-semibold text-white" style={btnPrimary}>
              {resetPwForm.formState.isSubmitting ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        </Modal>
      )}

      {/* Deactivate confirmation */}
      {modal === 'deactivate' && selectedUser && (
        <Modal title="Deactivate User" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-700 mb-6">
            Deactivate <strong>{selectedUser.username}</strong>? They will no longer be able to log in. Their data is preserved and they can be reactivated later.
          </p>
          {actionError && <p className="text-xs text-red-600 mb-4">{actionError}</p>}
          <div className="flex gap-3">
            <button onClick={() => setModal(null)} className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button
              onClick={onDeactivate}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-red-600 hover:bg-red-700"
            >
              Deactivate
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
