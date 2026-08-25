import React, { useState } from 'react';
import { LinkIcon, CheckCircle, ChevronDown, ExternalLink, X } from 'lucide-react';
import { DriverRecord, Project } from '../services/api';

const AVAILABLE_FIELDS = [
  { key: 'orarioInizio', label: 'Ora Inizio', type: 'time', required: true, defaultEnabled: true },
  { key: 'orarioFine', label: 'Ora Fine', type: 'time', required: true, defaultEnabled: true },
  { key: 'kmTotali', label: 'KM Totali', type: 'number', required: true, defaultEnabled: true },
  { key: 'diaria', label: 'Diaria', type: 'select', required: false, defaultEnabled: false, options: ['nessuna', 'piena', 'mezza'] },
  { key: 'note', label: 'Note', type: 'textarea', required: false, defaultEnabled: false },
];

interface CreatedLinkData {
  token: string;
  link: string;
  driverName: string;
  projectName: string;
  dateFrom: string;
  dateTo: string;
  expiresAt: string;
}

interface CreateLinkModalProps {
  onClose: () => void;
  onCreate: (driverId: string, projectId: string, dateFrom: string, dateTo: string, linkDuration: number, selectedFields: Set<string>) => Promise<void>;
  isCreating: boolean;
  driversList: DriverRecord[];
  projectsList: Project[];
  createdLink: CreatedLinkData | null;
  onDismissResult: () => void;
  copiedLink: string | null;
  onCopyLink: (url: string) => void;
}

export default function CreateLinkModal({ onClose, onCreate, isCreating, driversList, projectsList, createdLink, onDismissResult, copiedLink, onCopyLink }: CreateLinkModalProps) {
  const [driverId, setDriverId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [linkDuration, setLinkDuration] = useState<number>(1);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(AVAILABLE_FIELDS.filter(f => f.defaultEnabled).map(f => f.key))
  );

  const driverNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    driversList.forEach(d => { map[d.id] = d.name; });
    return map;
  }, [driversList]);

  const projectNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    projectsList.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [projectsList]);

  const handleCreate = async () => {
    if (!driverId || !projectId || !dateFrom || !dateTo) return;
    await onCreate(driverId, projectId, dateFrom, dateTo, linkDuration, selectedFields);
    setDriverId('');
    setProjectId('');
    setDateFrom('');
    setDateTo('');
    setLinkDuration(1);
    setSelectedFields(new Set(AVAILABLE_FIELDS.filter(f => f.defaultEnabled).map(f => f.key)));
  };

  if (createdLink) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
        <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl border border-outline-variant max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between mb-5 shrink-0 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">Link Created</h2>
                <p className="text-xs text-on-surface-variant">Share this link with the driver</p>
              </div>
            </div>
            <button onClick={onDismissResult} className="p-1 hover:bg-surface-dim rounded-lg">
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>
          <div className="space-y-3 mb-5 overflow-y-auto flex-1 min-h-0 px-6">
            <div className="flex justify-between text-[13px]">
              <span className="text-on-surface-variant">Driver</span>
              <span className="font-medium text-on-surface">{createdLink.driverName}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-on-surface-variant">Project</span>
              <span className="font-medium text-on-surface">{createdLink.projectName}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-on-surface-variant">Date Range</span>
              <span className="font-medium text-on-surface">{createdLink.dateFrom} → {createdLink.dateTo}</span>
            </div>
            {createdLink.expiresAt && (
              <div className="flex justify-between text-[13px]">
                <span className="text-on-surface-variant">Expires</span>
                <span className="font-medium text-on-surface">{safeDate(createdLink.expiresAt)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-outline-variant">
              <label className="block text-[11px] text-on-surface-variant mb-1">Link URL</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={createdLink.link}
                  className="flex-1 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg text-[12px] text-on-surface font-mono truncate"
                />
                <button
                  onClick={() => onCopyLink(createdLink.link)}
                  className="px-3 py-2 bg-primary text-on-primary rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors shrink-0"
                >
                  {copiedLink === createdLink.link ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 shrink-0 px-6 pb-6">
            <a
              href={createdLink.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Link
            </a>
            <button
              onClick={onDismissResult}
              className="flex-1 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl border border-outline-variant max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 mb-5 shrink-0 px-6 pt-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <LinkIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">Generate Driver Link</h2>
            <p className="text-xs text-on-surface-variant">Create a new reporting link for a driver</p>
          </div>
        </div>
        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 px-6">
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Driver</label>
            <div className="relative">
              <select
                value={driverId}
                onChange={e => setDriverId(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer appearance-none"
              >
                <option value="">Select driver...</option>
                {driversList.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Project</label>
            <div className="relative">
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer appearance-none"
              >
                <option value="">Select project...</option>
                {projectsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Link expires after (days from Date To)</label>
            <select
              value={linkDuration}
              onChange={e => setLinkDuration(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
            >
              <option value={0}>Same day as Date To</option>
              <option value={1}>+1 day</option>
              <option value={2}>+2 days</option>
              <option value={3}>+3 days</option>
              <option value={5}>+5 days</option>
              <option value={7}>+7 days</option>
              <option value={14}>+14 days</option>
              <option value={30}>+30 days</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-2">Fields included in driver form</label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_FIELDS.map(field => (
                <label
                  key={field.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] cursor-pointer transition-colors ${
                    selectedFields.has(field.key)
                      ? 'bg-primary/5 border-primary/30 text-on-surface'
                      : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:bg-surface-dim'
                  } ${field.required ? 'opacity-100' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field.key)}
                    disabled={field.required}
                    onChange={e => {
                      const next = new Set(selectedFields);
                      if (e.target.checked) next.add(field.key);
                      else next.delete(field.key);
                      setSelectedFields(next);
                    }}
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="flex-1">{field.label}</span>
                  {field.required && <span className="text-[10px] text-on-surface-variant/60">required</span>}
                </label>
              ))}
            </div>
          </div>
        </div>
        {isCreating && (
          <div className="mt-4 space-y-2 shrink-0 px-6">
            <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-[11px] text-on-surface-variant text-center">Generating link...</p>
          </div>
        )}
        <div className="flex gap-3 mt-6 shrink-0 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !driverId || !projectId || !dateFrom || !dateTo}
            className="flex-1 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isCreating ? 'Creating...' : 'Generate Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

function safeDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('it-IT');
  } catch {
    return '—';
  }
}
