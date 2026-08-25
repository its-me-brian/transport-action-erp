import React from 'react';
import {
  CheckCircle,
  Clock,
  Ban,
  Edit3,
} from 'lucide-react';

export const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Draft:     { icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50',    label: 'Draft' },
  Confirmed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50',  label: 'Confirmed' },
  Cancelled: { icon: Ban,         color: 'text-gray-400',    bg: 'bg-gray-50',     label: 'Cancelled' },
};

export const OWNER_TYPES = ['empresa', 'proyecto', 'vehiculo', 'servicio', 'conductor'];
export const CATEGORIES = ['fuel', 'maintenance', 'insurance', 'tolls', 'parking', 'rent', 'utilities', 'salaries', 'software', 'office', 'travel', 'other'];

export const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
export const fmtDate = (d: string) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('it-IT'); } catch { return d; }
};

export const getTransitions = (status: string) => {
  switch (status) {
    case 'Draft':
      return [
        { action: 'confirm' as const, label: 'Confirm', icon: CheckCircle, color: 'text-emerald-600 hover:bg-emerald-50' },
        { action: 'cancel' as const, label: 'Cancel', icon: Ban, color: 'text-red-500 hover:bg-red-50' },
      ];
    case 'Confirmed':
      return [
        { action: 'correct' as const, label: 'Correct', icon: Edit3, color: 'text-amber-600 hover:bg-amber-50' },
        { action: 'cancel' as const, label: 'Cancel', icon: Ban, color: 'text-red-500 hover:bg-red-50' },
      ];
    default:
      return [];
  }
};
