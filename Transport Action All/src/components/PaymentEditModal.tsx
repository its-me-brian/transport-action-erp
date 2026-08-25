import React from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Payment } from '../services/api';

export interface EditChanges {
  Amount: string;
  PaymentMethod: Payment['paymentMethod'];
  PaymentDate: string;
  Reference: string;
  Notes: string;
}

interface PaymentEditModalProps {
  target: Payment;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  changes: EditChanges;
  onChange: (c: EditChanges) => void;
}

export default function PaymentEditModal({ target, onClose, onSave, saving, changes, onChange }: PaymentEditModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-on-surface">Modifica Pagamento</h3>
            <p className="text-[11px] text-on-surface-variant font-mono">{target.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Amount (EUR)</label>
              <input
                type="number"
                step="0.01"
                value={changes.Amount}
                onChange={e => onChange({ ...changes, Amount: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Method</label>
              <select
                value={changes.PaymentMethod}
                onChange={e => onChange({ ...changes, PaymentMethod: e.target.value as Payment['paymentMethod'] })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="check">Check</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Payment Date</label>
            <input
              type="date"
              value={changes.PaymentDate}
              onChange={e => onChange({ ...changes, PaymentDate: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Reference</label>
            <input
              type="text"
              value={changes.Reference}
              onChange={e => onChange({ ...changes, Reference: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={changes.Notes}
              onChange={e => onChange({ ...changes, Notes: e.target.value })}
              rows={2}
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
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
