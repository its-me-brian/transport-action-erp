import React from 'react';
import { FileSpreadsheet, Save, X, Loader2 } from 'lucide-react';

interface TransportListImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  production: string;
  projectName: string;
  selectedCount: number;
  operatingCompany: string;
  clientId: string;
  projectId: string;
  loading: boolean;
  autoDetected: { client: any; project: any; clients: any[]; projects: any[] } | null;
  onOperatingCompanyChange: (v: string) => void;
  onClientChange: (v: string) => void;
  onProjectChange: (v: string) => void;
}

export default function TransportListImportModal({
  isOpen,
  onClose,
  onConfirm,
  production,
  projectName,
  selectedCount,
  operatingCompany,
  clientId,
  projectId,
  loading,
  autoDetected,
  onOperatingCompanyChange,
  onClientChange,
  onProjectChange,
}: TransportListImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <h3 className="font-semibold text-on-surface flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Link Import to Project
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-surface-dim rounded-lg px-3 py-2 text-[12px] space-y-1">
            {production && (
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant font-medium">Production:</span>
                <span className="text-on-surface font-semibold">{production}</span>
              </div>
            )}
            {projectName && (
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant font-medium">Project:</span>
                <span className="text-on-surface font-semibold italic" style={{ fontFamily: 'Georgia, serif' }}>{projectName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant font-medium">Services:</span>
              <span className="text-on-surface">{selectedCount} selected</span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Operating Company</label>
            <div className="flex gap-2">
              {['TA', 'MM'].map(co => (
                <button
                  key={co}
                  onClick={() => onOperatingCompanyChange(co)}
                  className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-lg border-2 transition-colors cursor-pointer ${
                    operatingCompany === co
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                  }`}
                >
                  {co === 'TA' ? 'Transport Action' : 'Movie Motion'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Client</label>
            {loading ? (
              <div className="flex items-center gap-2 text-[12px] text-on-surface-variant py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Detecting...
              </div>
            ) : (
              <select
                value={clientId}
                onChange={(e) => onClientChange(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">
                  {autoDetected?.client
                    ? `— Use detected: ${autoDetected.client.name} —`
                    : `— Auto-create from "${production || 'production'}" —`}
                </option>
                {autoDetected?.clients?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {autoDetected?.client && (
              <p className="text-[10px] text-emerald-600 mt-1">Detected: {autoDetected.client.name}</p>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Project</label>
            {loading ? (
              <div className="flex items-center gap-2 text-[12px] text-on-surface-variant py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Detecting...
              </div>
            ) : (
              <select
                value={projectId}
                onChange={(e) => onProjectChange(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">
                  {autoDetected?.project
                    ? `— Use detected: ${autoDetected.project.name} —`
                    : `— Auto-create from "${projectName || production || 'project'}" —`}
                </option>
                {autoDetected?.projects?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {autoDetected?.project && (
              <p className="text-[10px] text-emerald-600 mt-1">Detected: {autoDetected.project.name}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-outline-variant">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] font-medium border border-outline-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
          >
            Skip
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || selectedCount === 0}
            className="px-4 py-1.5 text-[12px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Import {selectedCount} Services
          </button>
        </div>
      </div>
    </div>
  );
}
