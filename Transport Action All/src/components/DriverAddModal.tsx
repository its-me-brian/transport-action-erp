import React from 'react';
import { X, Plus, Loader2 } from 'lucide-react';

interface DriverAddModalProps {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  newDriver: { name: string; phone: string; notes: string };
  onChange: (d: { name: string; phone: string; notes: string }) => void;
}

export default function DriverAddModal({ onClose, onSave, saving, newDriver, onChange }: DriverAddModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-[15px] font-semibold text-on-surface">New Driver</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Name *</label>
            <input
              type="text"
              value={newDriver.name}
              onChange={(e) => onChange({ ...newDriver, name: e.target.value })}
              placeholder="e.g. Marco Rossi"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Phone</label>
            <input
              type="text"
              value={newDriver.phone}
              onChange={(e) => onChange({ ...newDriver, phone: e.target.value })}
              placeholder="+39 ..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={newDriver.notes}
              onChange={(e) => onChange({ ...newDriver, notes: e.target.value })}
              rows={2}
              placeholder="Optional notes..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !newDriver.name.trim()}
            className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Driver
          </button>
        </div>
      </div>
    </div>
  );
}
