import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { InvoiceDTO, InvoiceItemDTO } from '../services/api';
import { STATUS_CONFIG, formatCurrency, formatDate } from './invoiceShared';

interface InvoiceDetailModalProps {
  viewTarget: InvoiceDTO;
  viewItems: InvoiceItemDTO[];
  loadingItems: boolean;
  onClose: () => void;
}

export default function InvoiceDetailModal({ viewTarget, viewItems, loadingItems, onClose }: InvoiceDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-on-surface">Invoice Detail</h3>
            <p className="text-[11px] text-on-surface-variant">{viewTarget.invoiceNumber || viewTarget.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Status</span>
              <p className={`font-medium ${STATUS_CONFIG[viewTarget.status]?.color || 'text-on-surface'}`}>
                {STATUS_CONFIG[viewTarget.status]?.label || viewTarget.status}
              </p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Invoice Number</span>
              <p className="font-medium text-on-surface font-mono">{viewTarget.invoiceNumber || '—'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Client</span>
              <p className="font-medium text-on-surface">{viewTarget.clientId || '—'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Project</span>
              <p className="font-medium text-on-surface">{viewTarget.projectId || '—'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Date</span>
              <p className="font-medium text-on-surface">{formatDate(viewTarget.date)}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Due Date</span>
              <p className="font-medium text-on-surface">{formatDate(viewTarget.dueDate)}</p>
            </div>
          </div>

          <div className="bg-surface-dim rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <span className="text-on-surface-variant">Subtotal</span>
              <span className="text-on-surface">{formatCurrency(viewTarget.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-on-surface-variant">Tax ({viewTarget.taxRate}%)</span>
              <span className="text-on-surface">{formatCurrency(viewTarget.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-semibold border-t border-outline-variant pt-1.5">
              <span className="text-on-surface">Total</span>
              <span className="text-on-surface">{formatCurrency(viewTarget.total)}</span>
            </div>
          </div>

          {loadingItems ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          ) : viewItems.length > 0 && (
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Items ({viewItems.length})</span>
              <div className="mt-1 space-y-1">
                {viewItems.map(item => (
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

          {viewTarget.voidReason && (
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Void Reason</span>
              <p className="text-[12px] text-red-600 mt-1">{viewTarget.voidReason}</p>
            </div>
          )}

          {viewTarget.notes && (
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Notes</span>
              <p className="text-[12px] text-on-surface mt-1">{viewTarget.notes}</p>
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
