import React from 'react';
import { X, Ban, Loader2 } from 'lucide-react';
import { InvoiceDTO } from '../services/api';

interface InvoiceVoidModalProps {
  voidTarget: InvoiceDTO;
  voidReason: string;
  onReasonChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isVoiding: boolean;
}

export default function InvoiceVoidModal({ voidTarget, voidReason, onReasonChange, onClose, onConfirm, isVoiding }: InvoiceVoidModalProps) {
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
            Stai per annullare la factura <span className="font-mono font-medium text-on-surface">{voidTarget.invoiceNumber || voidTarget.id}</span>.
            Questa azione non può essere annullata.
          </p>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Motivo *</label>
            <textarea
              value={voidReason}
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
            disabled={isVoiding || !voidReason.trim()}
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
