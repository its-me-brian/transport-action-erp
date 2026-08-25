import React from 'react';
import { X, Plus, Ban, Save, Loader2 } from 'lucide-react';
import { InvoiceDTO, InvoiceItemDTO } from '../services/api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  Borrador:    { color: 'text-gray-600',    bg: 'bg-gray-100',    label: 'Borrador' },
  Emitida:     { color: 'text-amber-600',   bg: 'bg-amber-50',    label: 'Emitida' },
  Enviada:     { color: 'text-blue-600',    bg: 'bg-blue-50',     label: 'Enviada' },
  PagoParcial: { color: 'text-orange-600',  bg: 'bg-orange-50',   label: 'Pago Parcial' },
  Pagada:      { color: 'text-emerald-600', bg: 'bg-emerald-50',  label: 'Pagada' },
  Vencida:     { color: 'text-red-600',     bg: 'bg-red-50',      label: 'Vencida' },
  Anulada:     { color: 'text-gray-400',    bg: 'bg-gray-50',     label: 'Anulada' },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return dateStr; }
};

interface DetailModalProps {
  invoice: InvoiceDTO;
  items: InvoiceItemDTO[];
  loadingItems: boolean;
  onClose: () => void;
}

export function InvoiceDetailModal({ invoice, items, loadingItems, onClose }: DetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-on-surface">Invoice Detail</h3>
            <p className="text-[11px] text-on-surface-variant">{invoice.invoiceNumber || invoice.id}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Status</span>
              <p className={`font-medium ${STATUS_CONFIG[invoice.status]?.color || 'text-on-surface'}`}>
                {STATUS_CONFIG[invoice.status]?.label || invoice.status}
              </p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Invoice Number</span>
              <p className="font-medium text-on-surface font-mono">{invoice.invoiceNumber || '—'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Client</span>
              <p className="font-medium text-on-surface">{invoice.clientId || '—'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Project</span>
              <p className="font-medium text-on-surface">{invoice.projectId || '—'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Date</span>
              <p className="font-medium text-on-surface">{formatDate(invoice.date)}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Due Date</span>
              <p className="font-medium text-on-surface">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          <div className="bg-surface-dim rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <span className="text-on-surface-variant">Subtotal</span>
              <span className="text-on-surface">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-on-surface-variant">Tax ({invoice.taxRate}%)</span>
              <span className="text-on-surface">{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-semibold border-t border-outline-variant pt-1.5">
              <span className="text-on-surface">Total</span>
              <span className="text-on-surface">{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {loadingItems ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          ) : items.length > 0 && (
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Items ({items.length})</span>
              <div className="mt-1 space-y-1">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-[11px] bg-surface-dim rounded px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-on-surface-variant font-mono">{item.rapportinoClientId}</span>
                      {item.serviceId && <span className="text-on-surface-variant/60 font-mono">→ {item.serviceId}</span>}
                    </div>
                    <span className="text-on-surface font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invoice.voidReason && (
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Void Reason</span>
              <p className="text-[12px] text-red-600 mt-1">{invoice.voidReason}</p>
            </div>
          )}

          {invoice.notes && (
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Notes</span>
              <p className="text-[12px] text-on-surface mt-1">{invoice.notes}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateModalProps {
  newInvoice: { projectId: string; clientId: string; dueDate: string; notes: string };
  onChange: (v: { projectId: string; clientId: string; dueDate: string; notes: string }) => void;
  onClose: () => void;
  onSubmit: () => void;
  isCreating: boolean;
}

export function InvoiceCreateModal({ newInvoice, onChange, onClose, onSubmit, isCreating }: CreateModalProps) {
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
            onClick={onSubmit}
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

interface VoidModalProps {
  invoice: InvoiceDTO;
  reason: string;
  onReasonChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isVoiding: boolean;
}

export function InvoiceVoidModal({ invoice, reason, onReasonChange, onClose, onConfirm, isVoiding }: VoidModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-sm shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <h3 className="text-[15px] font-semibold text-on-surface">Annulla Factura</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <p className="text-[12px] text-on-surface-variant">
            Stai per annullare la factura <span className="font-mono font-medium text-on-surface">{invoice.invoiceNumber || invoice.id}</span>.
            Questa azione non può essere annullata.
          </p>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Motivo *</label>
            <textarea
              value={reason}
              onChange={e => onReasonChange(e.target.value)}
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
              placeholder="Motivo dell'annullamento..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isVoiding || !reason.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 text-white text-[12px] font-medium rounded-lg hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isVoiding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
            Conferma
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditModalProps {
  invoice: InvoiceDTO;
  editChanges: { ClientID: string; ProjectID: string; DueDate: string; Notes: string };
  onChange: (v: { ClientID: string; ProjectID: string; DueDate: string; Notes: string }) => void;
  onClose: () => void;
  onSubmit: () => void;
  isEditing: boolean;
}

export function InvoiceEditModal({ invoice, editChanges, onChange, onClose, onSubmit, isEditing }: EditModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-on-surface">Modifica Fattura</h3>
            <p className="text-[11px] text-on-surface-variant">{invoice.invoiceNumber || invoice.id}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Client ID</label>
            <input
              type="text"
              value={editChanges.ClientID}
              onChange={e => onChange({ ...editChanges, ClientID: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Project ID</label>
            <input
              type="text"
              value={editChanges.ProjectID}
              onChange={e => onChange({ ...editChanges, ProjectID: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Due Date</label>
            <input
              type="date"
              value={editChanges.DueDate}
              onChange={e => onChange({ ...editChanges, DueDate: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={editChanges.Notes}
              onChange={e => onChange({ ...editChanges, Notes: e.target.value })}
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
            onClick={onSubmit}
            disabled={isEditing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50"
          >
            {isEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
