import React from 'react';
import { X, Plus, Loader2 } from 'lucide-react';

interface InvoiceCreateModalProps {
  newInvoice: { projectId: string; clientId: string; dueDate: string; notes: string };
  onChange: (val: { projectId: string; clientId: string; dueDate: string; notes: string }) => void;
  onClose: () => void;
  onCreate: () => void;
  isCreating: boolean;
}

export default function InvoiceCreateModal({ newInvoice, onChange, onClose, onCreate, isCreating }: InvoiceCreateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <h3 className="text-[15px] font-semibold text-on-surface">New Invoice</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Project ID *</label>
            <input
              type="text"
              value={newInvoice.projectId}
              onChange={e => onChange({ ...newInvoice, projectId: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              placeholder="PRJ-2026-00001"
            />
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Client ID *</label>
            <input
              type="text"
              value={newInvoice.clientId}
              onChange={e => onChange({ ...newInvoice, clientId: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              placeholder="CLI-2026-00001"
            />
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Due Date</label>
            <input
              type="date"
              value={newInvoice.dueDate}
              onChange={e => onChange({ ...newInvoice, dueDate: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={newInvoice.notes}
              onChange={e => onChange({ ...newInvoice, notes: e.target.value })}
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
              placeholder="Optional notes..."
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
            onClick={onCreate}
            disabled={isCreating}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
