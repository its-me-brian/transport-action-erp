import React from 'react';
import { Calendar, Pencil } from 'lucide-react';
import { Payment } from '../services/api';
import StatusBadge from './StatusBadge';
import { MethodConfig, formatCurrency, safeDate } from './paymentsShared';

interface PaymentCardProps {
  payment: Payment;
  methodConfig: MethodConfig;
  onEdit: (p: Payment) => void;
  confirmAction: { id: string; action: 'confirm' | 'reconcile' } | null;
  onSetConfirmAction: (action: { id: string; action: 'confirm' | 'reconcile' } | null) => void;
  onConfirm: (id: string) => void;
  onReconcile: (id: string) => void;
}

export default function PaymentCard({ payment, methodConfig, onEdit, confirmAction, onSetConfirmAction, onConfirm, onReconcile }: PaymentCardProps) {
  const p = payment;
  const mc = methodConfig[p.paymentMethod] || methodConfig.transfer;
  const MethodIcon = mc.icon;

  return (
    <div
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-surface-container`}>
        <MethodIcon className={`w-4 h-4 ${mc.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-on-surface">Invoice: {p.invoiceId}</span>
          <span className="text-[10px] text-on-surface-variant font-mono">{p.id}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
          <span className={mc.color}>{mc.label}</span>
          {p.clientId && <span>Client: {p.clientId}</span>}
          {p.reference && <span>Ref: {p.reference}</span>}
          {p.paymentDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {safeDate(p.paymentDate)}
            </span>
          )}
        </div>
        {p.notes && <p className="text-[11px] text-on-surface-variant mt-1 truncate">{p.notes}</p>}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <StatusBadge status={p.status || 'Registrado'} size="xs" />
        <span className="text-[14px] font-bold text-on-surface">{formatCurrency(p.amount)}</span>
        {p.status === 'Registrado' && (
          <>
            <button
              onClick={() => onEdit(p)}
              className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
              title="Modifica"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {confirmAction?.id === p.id && confirmAction.action === 'confirm' ? (
              <div className="flex gap-1">
                <button
                  onClick={() => onConfirm(p.id)}
                  className="px-2 py-1 bg-green-500 text-white text-[10px] font-medium rounded hover:bg-green-600 cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  onClick={() => onSetConfirmAction(null)}
                  className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-medium rounded cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSetConfirmAction({ id: p.id, action: 'confirm' })}
                className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-medium rounded hover:bg-green-100 cursor-pointer"
              >
                Confirm
              </button>
            )}
          </>
        )}
        {p.status === 'Confirmado' && (
          confirmAction?.id === p.id && confirmAction.action === 'reconcile' ? (
            <div className="flex gap-1">
              <button
                onClick={() => onReconcile(p.id)}
                className="px-2 py-1 bg-blue-500 text-white text-[10px] font-medium rounded hover:bg-blue-600 cursor-pointer"
              >
                Reconcile
              </button>
              <button
                onClick={() => onSetConfirmAction(null)}
                className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-medium rounded cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSetConfirmAction({ id: p.id, action: 'reconcile' })}
              className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-medium rounded hover:bg-blue-100 cursor-pointer"
            >
              Reconcile
            </button>
          )
        )}
      </div>
    </div>
  );
}
