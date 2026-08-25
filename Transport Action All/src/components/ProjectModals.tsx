import React from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Project } from '../services/api';
import { ClientOption } from '../utils/projectHelpers';

interface ProjectFormModalProps {
  editProject: Partial<Project> | null;
  setEditProject: React.Dispatch<React.SetStateAction<Partial<Project> | null>>;
  isNew: boolean;
  isSaving: boolean;
  clients: ClientOption[];
  handleSave: () => void;
}

export function ProjectFormModal({ editProject, setEditProject, isNew, isSaving, clients, handleSave }: ProjectFormModalProps) {
  if (!editProject) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <h3 className="text-[15px] font-semibold text-on-surface">
            {isNew ? 'New Project' : 'Edit Project'}
          </h3>
          <button onClick={() => setEditProject(null)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Project Name *</label>
            <input
              type="text"
              value={editProject.name || ''}
              onChange={e => setEditProject({ ...editProject, name: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              placeholder="e.g. Film Production ABC"
            />
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Status</label>
            <div className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface">
              {editProject.status || 'Nuovo'}
            </div>
            <p className="text-[10px] text-on-surface-variant mt-1">Status changes via lifecycle buttons</p>
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Client</label>
            <select
              value={editProject.clientId || ''}
              onChange={e => setEditProject({ ...editProject, clientId: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">— None —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Operating Company</label>
              <input
                type="text"
                value={editProject.operatingCompany || ''}
                onChange={e => setEditProject({ ...editProject, operatingCompany: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                placeholder="e.g. TA"
              />
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Coordinator</label>
              <input
                type="text"
                value={editProject.coordinator || ''}
                onChange={e => setEditProject({ ...editProject, coordinator: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                placeholder="e.g. Marco"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Start Date</label>
              <input
                type="date"
                value={editProject.dateFrom || ''}
                onChange={e => setEditProject({ ...editProject, dateFrom: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">End Date</label>
              <input
                type="date"
                value={editProject.dateTo || ''}
                onChange={e => setEditProject({ ...editProject, dateTo: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Transport Company</label>
            <input
              type="text"
              value={editProject.transportCompany || ''}
              onChange={e => setEditProject({ ...editProject, transportCompany: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              placeholder="e.g. Transport Movie SRL"
            />
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={editProject.notes || ''}
              onChange={e => setEditProject({ ...editProject, notes: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
          <button
            onClick={() => setEditProject(null)}
            className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !editProject.name?.trim()}
            className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
