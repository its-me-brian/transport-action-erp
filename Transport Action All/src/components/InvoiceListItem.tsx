import React from 'react';
import { Calendar, Loader2, Send, Eye, Ban, Pencil } from 'lucide-react';
import { InvoiceDTO } from '../services/api';
import { STATUS_CONFIG, NEXT_TRANSITIONS, canVoid, formatCurrency, formatDate } from './invoiceShared';

interface InvoiceListItemProps {
  inv: InvoiceDTO;
  updatingStatus: string | null;
  onStatusUpdate: (inv: InvoiceDTO, action: string) => void;
  onEdit: (inv: InvoiceDTO) => void;
  onVoid: (inv: InvoiceDTO) => void;
  onView: (inv: InvoiceDTO) => void;
}

export default function InvoiceListItem({ inv, updatingStatus, onStatusUpdate, onEdit, onVoid, onView }: InvoiceListItemProps) {
  const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.Borrador;
  const StatusIcon = sc.icon;
  const next = NEXT_TRANSITIONS[inv.status];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
        <StatusIcon className={`w-4 h-4 ${sc.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${sc.bg} ${sc.color}`}>
            {sc.label}
          </span>
          {inv.invoiceNumber && (
            <span className="text-[12px] font-semibold text-on-surface font-mono">{inv.invoiceNumber}</span>
          )}
          <span className="text-[10px] text-on-surface-variant font-mono">{inv.id}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-on-surface-variant">
          <span className="font-medium">{inv.clientId}</span>
          {inv.projectId && <span>{inv.projectId}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
          {inv.date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(inv.date)}
            </span>
          )}
          {inv.dueDate && <span>Due: {formatDate(inv.dueDate)}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[14px] font-bold text-on-surface">{formatCurrency(inv.total)}</span>

        {next && (
          <button
            onClick={() => onStatusUpdate(inv, next.action)}
            disabled={updatingStatus === inv.id}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-medium rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {updatingStatus === inv.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            {next.label}
          </button>
        )}

        {canVoid(inv.status) && (
          <>
            {inv.status === 'Borrador' && (
              <button
                onClick={() => onEdit(inv)}
                className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
                title="Modifica"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onVoid(inv)}
              className="p-1.5 hover:bg-red-50 text-on-surface-variant hover:text-red-500 rounded transition-colors cursor-pointer"
              title="Annulla"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        <button
          onClick={() => onView(inv)}
          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
