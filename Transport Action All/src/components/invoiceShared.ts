import React from 'react';
import {
  FileText,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle,
  Ban,
} from 'lucide-react';
import { InvoiceDTO } from '../services/api';

export const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Borrador:    { icon: FileText,      color: 'text-gray-600',    bg: 'bg-gray-100',    label: 'Borrador' },
  Emitida:     { icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50',    label: 'Emitida' },
  Enviada:     { icon: Send,          color: 'text-blue-600',    bg: 'bg-blue-50',     label: 'Enviada' },
  PagoParcial: { icon: AlertTriangle, color: 'text-orange-600',  bg: 'bg-orange-50',   label: 'Pago Parcial' },
  Pagada:      { icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50',  label: 'Pagada' },
  Vencida:     { icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50',      label: 'Vencida' },
  Anulada:     { icon: Ban,           color: 'text-gray-400',    bg: 'bg-gray-50',     label: 'Anulada' },
};

export const NEXT_TRANSITIONS: Record<string, { action: string; label: string; target: string } | null> = {
  Borrador:    { action: 'emit',  label: 'Emitir',  target: 'Emitida' },
  Emitida:     { action: 'send',  label: 'Enviar',  target: 'Enviada' },
  Enviada:     null,
  PagoParcial: null,
  Pagada:      null,
  Vencida:     null,
  Anulada:     null,
};

export const STATUSES = ['Borrador', 'Emitida', 'Enviada', 'PagoParcial', 'Pagada', 'Vencida', 'Anulada'];

export const canVoid = (status: string) => ['Borrador', 'Emitida', 'Enviada'].includes(status);

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};
