import React from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Payment } from '../services/api';

export interface NewPayment {
  invoiceId: string;
  clientId: string;
  amount: string;
  paymentMethod: Payment['paymentMethod'];
  paymentDate: string;
  reference: string;
  notes: string;
  cashReceivedBy: string;
  cashDate: string;
  cashReference: string;
}

export const EMPTY_NEW_PAYMENT: NewPayment = {
  invoiceId: '',
  clientId: '',
  amount: '',
  paymentMethod: 'transfer',
  paymentDate: '',
  reference: '',
  notes: '',
  cashReceivedBy: '',
  cashDate: '',
  cashReference: ''
};

interface PaymentAddModalProps {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  newPayment: NewPayment;
  onChange: (p: NewPayment) => void;
}

export default function PaymentAddModal({ onClose, onSave, saving, newPayment, onChange }: PaymentAddModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <h3 className="text-[15px] font-semibold text-on-surface">Record Payment</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Invoice ID *</label>
            <input
              type="text"
              value={newPayment.invoiceId}
              onChange={e => onChange({ ...newPayment, invoiceId: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              placeholder="e.g. INV-TA-2026-00045"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Amount (EUR) *</label>
              <input
                type="number"
                step="0.01"
                value={newPayment.amount}
                onChange={e => onChange({ ...newPayment, amount: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Method</label>
              <select
                value={newPayment.paymentMethod}
                onChange={e => onChange({ ...newPayment, paymentMethod: e.target.value as Payment['paymentMethod'] })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="check">Check</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Payment Date</label>
              <input
                type="date"
                value={newPayment.paymentDate}
                onChange={e => onChange({ ...newPayment, paymentDate: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Reference</label>
              <input
                type="text"
                value={newPayment.reference}
                onChange={e => onChange({ ...newPayment, reference: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={newPayment.notes}
              onChange={e => onChange({ ...newPayment, notes: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
              rows={2}
              placeholder="Optional notes"
            />
          </div>

          {newPayment.paymentMethod === 'cash' && (
            <div className="space-y-3 p-3 bg-surface-container rounded-lg border border-outline-variant">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wide font-medium">Cash Payment Details</span>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Received By</label>
                <input
                  type="text"
                  value={newPayment.cashReceivedBy}
                  onChange={e => onChange({ ...newPayment, cashReceivedBy: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="Who received the cash"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Cash Date</label>
                  <input
                    type="date"
                    value={newPayment.cashDate}
                    onChange={e => onChange({ ...newPayment, cashDate: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Cash Reference</label>
                  <input
                    type="text"
                    value={newPayment.cashReference}
                    onChange={e => onChange({ ...newPayment, cashReference: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="Receipt #, etc."
                  />
                </div>
              </div>
            </div>
          )}
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
            disabled={saving || !newPayment.invoiceId.trim() || !newPayment.amount}
            className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
