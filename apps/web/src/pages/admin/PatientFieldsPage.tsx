import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/Layout';
import { adminFieldsApi, getErrorMessage } from '../../api/client';
import { PatientField } from '../../types';
import { useTheme } from '../../context/ThemeContext';

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function PatientFieldsPage() {
  const { theme } = useTheme();
  const [fields, setFields] = useState<PatientField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Add form
  const [addLabel, setAddLabel] = useState('');
  const [addKey, setAddKey] = useState('');
  const [addOrder, setAddOrder] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit state: fieldId -> draft values
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editOrder, setEditOrder] = useState(0);
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = () =>
    adminFieldsApi.list()
      .then(setFields)
      .catch(() => setError('Failed to load fields.'))
      .finally(() => setIsLoading(false));

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!addLabel.trim() || !addKey.trim()) return;
    setIsAdding(true);
    setAddError('');
    try {
      await adminFieldsApi.create({ label: addLabel.trim(), key: addKey.trim(), sortOrder: addOrder });
      setAddLabel('');
      setAddKey('');
      setAddOrder(fields.length);
      setShowAddForm(false);
      await load();
    } catch (err) {
      setAddError(getErrorMessage(err));
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (field: PatientField) => {
    setEditingId(field.id);
    setEditLabel(field.label);
    setEditOrder(field.sortOrder);
    setEditError('');
  };

  const handleSave = async (id: string) => {
    setIsSaving(true);
    setEditError('');
    try {
      await adminFieldsApi.update(id, { label: editLabel.trim(), sortOrder: editOrder });
      setEditingId(null);
      await load();
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (field: PatientField) => {
    try {
      await adminFieldsApi.update(field.id, { isActive: !field.isActive });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (field: PatientField) => {
    if (!confirm(`Delete field "${field.label}"? This cannot be undone.`)) return;
    try {
      await adminFieldsApi.delete(field.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const btnRadius =
    theme?.buttonStyle === 'pill' ? '9999px' :
    theme?.buttonStyle === 'square' ? '4px' : '8px';

  return (
    <AdminLayout>
      <div className="max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: theme?.textColor }}>
            Patient Count Fields
          </h1>
          <button
            onClick={() => { setShowAddForm((v) => !v); setAddError(''); }}
            className="px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: theme?.primaryColor ?? '#2563EB', borderRadius: btnRadius }}
          >
            {showAddForm ? 'Cancel' : '+ Add Field'}
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          These fields appear on the submission form. Reorder them using the sort order number.
          Fields with existing data can be deactivated but not deleted.
        </p>

        {/* Add form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">New Field</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                <input
                  type="text"
                  value={addLabel}
                  onChange={(e) => {
                    setAddLabel(e.target.value);
                    setAddKey(slugify(e.target.value));
                  }}
                  placeholder="e.g. Alcohol Related"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Key (auto-generated slug)</label>
                <input
                  type="text"
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value)}
                  placeholder="e.g. alcohol_related"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2"
                />
              </div>
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
              <input
                type="number"
                min={0}
                value={addOrder}
                onChange={(e) => setAddOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
              />
            </div>
            {addError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
            )}
            <button
              onClick={handleAdd}
              disabled={isAdding || !addLabel.trim() || !addKey.trim()}
              className="px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: theme?.primaryColor ?? '#2563EB', borderRadius: btnRadius }}
            >
              {isAdding ? 'Adding…' : 'Add Field'}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600 mb-4">{error}</div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {!isLoading && fields.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No fields yet. Add your first field above.
          </div>
        )}

        {!isLoading && fields.length > 0 && (
          <div className="space-y-3">
            {fields.map((field) => (
              <div
                key={field.id}
                className={`bg-white rounded-xl border p-4 ${field.isActive ? 'border-gray-100 shadow-sm' : 'border-gray-200 opacity-60'}`}
              >
                {editingId === field.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
                        <input
                          type="number"
                          min={0}
                          value={editOrder}
                          onChange={(e) => setEditOrder(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                        />
                      </div>
                    </div>
                    {editError && (
                      <p className="text-sm text-red-600">{editError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(field.id)}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                        style={{ backgroundColor: theme?.primaryColor ?? '#2563EB', borderRadius: btnRadius }}
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-6 text-right">{field.sortOrder}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{field.label}</p>
                        <p className="text-xs text-gray-400 font-mono">{field.key}</p>
                      </div>
                      {!field.isActive && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                      {field._count && field._count.values > 0 && (
                        <span className="text-xs text-gray-400">{field._count.values.toLocaleString()} values</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(field)}
                        className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(field)}
                        className={`text-xs px-3 py-1.5 border rounded-lg ${
                          field.isActive
                            ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {field.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {(!field._count || field._count.values === 0) && (
                        <button
                          onClick={() => handleDelete(field)}
                          className="text-xs px-3 py-1.5 border border-red-300 rounded-lg text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
