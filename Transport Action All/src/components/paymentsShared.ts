import React from 'react';
import { Building, Banknote, CreditCard, FileCheck, Clock, CheckCircle, XCircle } from 'lucide-react';

export interface MethodConfig {
  [key: string]: { icon: React.ElementType; label: string; color: string };
}

export const methodConfig: MethodConfig = {
  transfer: { icon: Building, label: 'Bank Transfer', color: 'text-blue-600' },
  cash: { icon: Banknote, label: 'Cash', color: 'text-emerald-600' },
  card: { icon: CreditCard, label: 'Card', color: 'text-purple-600' },
  check: { icon: FileCheck, label: 'Check', color: 'text-orange-600' }
};

export const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  Registrado: { icon: Clock, label: 'Registered', color: 'text-amber-600 bg-amber-50' },
  Confirmado: { icon: CheckCircle, label: 'Confirmed', color: 'text-green-600 bg-green-50' },
  Conciliado: { icon: CheckCircle, label: 'Reconciled', color: 'text-blue-600 bg-blue-50' },
  Anulado: { icon: XCircle, label: 'Voided', color: 'text-red-600 bg-red-50' }
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
};

export const safeDate = (s: string) => {
  if (!s) return '—';
  try { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('it-IT'); }
  catch { return '—'; }
};
