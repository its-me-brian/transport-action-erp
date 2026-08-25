import React, { useState, useEffect } from 'react';
import { Pencil, X } from 'lucide-react';
import { DriverRecord, Project, updateDriverLink } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const AVAILABLE_FIELDS = [
  { key: 'orarioInizio', label: 'Ora Inizio', type: 'time', required: true, defaultEnabled: true },
  { key: 'orarioFine', label: 'Ora Fine', type: 'time', required: true, defaultEnabled: true },
  { key: 'kmTotali', label: 'KM Totali', type: 'number', required: true, defaultEnabled: true },
  { key: 'diaria', label: 'Diaria', type: 'select', required: false, defaultEnabled: false, options: ['nessuna', 'piena', 'mezza'] },
  { key: 'note', label: 'Note', type: 'textarea', required: false, defaultEnabled: false },
];

interface DriverLink {
  Token: string;
  DriverID: string;
  ProjectID: string;
  DateFrom: string;
  DateTo: string;
  Status: string;
  FieldsSchema: string;
  CreatedAt: string;
  ExpiresAt: string;
}

interface EditLinkModalProps {
  link: DriverLink;
  driversList: DriverRecord[];
  projectsList: Project[];
  onClose: () => void;
  onSaved: () => void;
}

export default function EditLinkModal({ link, driversList, projectsList, onClose, onSaved }: EditLinkModalProps) {
  const { showToast } = useToast();
  const [editForm, setEditForm] = useState({
    driverId: link.DriverID,
    projectId: link.ProjectID,
    dateFrom: link.DateFrom?.split('T')[0] || '',
    dateTo: link.DateTo?.split('T')[0] || '',
  });
  const [editSelectedFields, setEditSelectedFields] = useState<Set<string>>(() => {
    try {
      const parsed = JSON.parse(link.FieldsSchema || '[]');
      if (Array.isArray(parsed)) {
        return new Set(parsed.map((f: any) => f.key));
      }
    } catch {}
    return new Set(AVAILABLE_FIELDS.filter(f => f.defaultEnabled || f.required).map(f => f.key));
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editForm.driverId || !editForm.projectId || !editForm.dateFrom || !editForm.dateTo) {
      showToast('All fields are required', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const fieldsSchemaJson = AVAILABLE_FIELDS
        .filter(f => editSelectedFields.has(f.key) || f.required)
        .map(f => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          ...(f.options ? { options: f.options } : {}),
        }));

      const result = await updateDriverLink(link.Token, {
        DriverID: editForm.driverId,
        ProjectID: editForm.projectId,
        DateFrom: editForm.dateFrom,
        DateTo: editForm.dateTo,
        FieldsSchema: JSON.stringify(fieldsSchemaJson),
      });
      if (result.error) {
        showToast('Error: ' + result.error, 'error');
      } else {
        onSaved();
      }
    } catch (err) {
      showToast('Error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl border border-outline-variant max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-5 shrink-0 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">Edit Driver Link</h2>
              <p className="text-xs text-on-surface-variant">Token: {link.Token}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 hover:bg-surface-dim rounded-lg">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="space-y-4 mb-5 overflow-y-auto flex-1 min-h-0 px-6">
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Driver</label>
            <select
              value={editForm.driverId}
              onChange={e => setEditForm(prev => ({ ...prev, driverId: e.target.value }))}
              className="w-full px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg text-[13px] text-on-surface"
            >
              <option value="">Select driver...</option>
              {driversList.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Project</label>
            <select
              value={editForm.projectId}
              onChange={e => setEditForm(prev => ({ ...prev, projectId: e.target.value }))}
              className="w-full px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg text-[13px] text-on-surface"
            >
              <option value="">Select project...</option>
              {projectsList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Date From</label>
              <input
                type="date"
                value={editForm.dateFrom}
                onChange={e => setEditForm(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg text-[13px] text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Date To</label>
              <input
                type="date"
                value={editForm.dateTo}
                onChange={e => setEditForm(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg text-[13px] text-on-surface"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Fields Schema</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_FIELDS.map(field => (
                <label key={field.key} className="flex items-center gap-1.5 text-[12px] text-on-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.required || editSelectedFields.has(field.key)}
                    disabled={field.required}
                    onChange={() => {
                      if (field.required) return;
                      setEditSelectedFields(prev => {
                        const next = new Set(prev);
                        if (next.has(field.key)) next.delete(field.key);
                        else next.add(field.key);
                        return next;
                      });
                    }}
                    className="rounded border-outline-variant"
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 shrink-0 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
