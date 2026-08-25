import { Clock, PlayCircle, CheckCircle } from 'lucide-react';
import { Project } from '../services/api';

export type StatusFilter = 'All' | Project['status'];

export type ClientOption = { id: string; name: string };

export const STATUS_CONFIG: Record<Project['status'], { icon: any; color: string; bg: string; label: string }> = {
  Nuovo: { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Nuovo' },
  Preparazione: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Preparazione' },
  Attivo: { icon: PlayCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Attivo' },
  Fatturazione: { icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Fatturazione' },
  Incasso: { icon: PlayCircle, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Incasso' },
  Chiuso: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Chiuso' },
  Archiviato: { icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Archiviato' },
};

export type LifecycleAction = 'preparar' | 'activar' | 'pasarAFacturacion' | 'pasarACobro' | 'cerrar';

export const getLifecycleActions = (status: Project['status']): Array<{ action: LifecycleAction; label: string; color: string }> => {
  switch (status) {
    case 'Nuovo': return [{ action: 'preparar', label: 'Preparare', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' }];
    case 'Preparazione': return [{ action: 'activar', label: 'Attivare', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' }];
    case 'Attivo': return [{ action: 'pasarAFacturacion', label: 'Fatturazione', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' }];
    case 'Fatturazione': return [{ action: 'pasarACobro', label: 'Incasso', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' }];
    case 'Incasso': return [{ action: 'cerrar', label: 'Chiudi', color: 'bg-green-50 text-green-600 hover:bg-green-100' }];
    default: return [];
  }
};
