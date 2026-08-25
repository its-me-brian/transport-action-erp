import { Service } from '../types';

export function getServiceStatusColor(service: Service): { hex: string; label: string } {
  const colors: Record<string, { hex: string; label: string }> = {
    Importado: { hex: '#6366f1', label: 'Imported' },
    Asignado: { hex: '#0ea5e9', label: 'Assigned' },
    Confirmado: { hex: '#06b6d4', label: 'Confirmed' },
    EnRuta: { hex: '#3b82f6', label: 'En Route' },
    Realizado: { hex: '#22c55e', label: 'Completed' },
    Reportado: { hex: '#f59e0b', label: 'Reported' },
    Revision: { hex: '#f97316', label: 'In Review' },
    Validado: { hex: '#10b981', label: 'Validated' },
    Cancelado: { hex: '#ef4444', label: 'Canceled' },
  };
  return colors[service.operationalStatus] || { hex: '#6b7280', label: 'Unknown' };
}
