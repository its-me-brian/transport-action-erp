import React from 'react';
import { Check, Send, Eye, Clock } from 'lucide-react';
import { Service, calculateServiceCosts } from '../types';

export type RapportinoType = 'production' | 'driver' | 'collaborator' | 'weekly' | 'daily';

export type DomainStatus = 'Borrador' | 'Revisado' | 'Enviado' | 'Aceptado' | 'Facturado' | 'Pagado';

export interface GeneratedRapportino {
  sheetName: string;
  sheetUrl: string;
  rapportinoId: string;
  totalServices: number;
  totalCost: number;
  type: RapportinoType;
  label: string;
  dateFrom?: string;
  dateTo?: string;
  status: DomainStatus;
}

export const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; nextStatus: DomainStatus | null; nextAction?: string }> = {
  'Borrador':   { color: 'text-gray-700',     bg: 'bg-gray-100',     icon: <Clock className="w-3 h-3" />,    nextStatus: 'Revisado', nextAction: 'review' },
  'Revisado':   { color: 'text-blue-700',     bg: 'bg-blue-100',     icon: <Eye className="w-3 h-3" />,      nextStatus: 'Enviado',  nextAction: 'send' },
  'Enviado':    { color: 'text-purple-700',   bg: 'bg-purple-100',   icon: <Send className="w-3 h-3" />,     nextStatus: 'Aceptado', nextAction: 'accept' },
  'Aceptado':   { color: 'text-amber-700',    bg: 'bg-amber-100',    icon: <Check className="w-3 h-3" />,    nextStatus: null },
  'Facturado':  { color: 'text-emerald-700',  bg: 'bg-emerald-100',  icon: <Check className="w-3 h-3" />,    nextStatus: null },
  'Pagado':     { color: 'text-emerald-700',  bg: 'bg-emerald-100',  icon: <Check className="w-3 h-3" />,    nextStatus: null },
};

export const timeToMin = (t: string): number => {
  const parts = t.split(':');
  if (parts.length !== 2) return -1;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
};

export const buildServiceDescription = (svc: Service): string => {
  const parts: string[] = [];
  if (svc.from) parts.push('DA ' + svc.from.toUpperCase());
  if (svc.to) parts.push('PER ' + svc.to.toUpperCase());
  if (parts.length === 0 && svc.notes) parts.push(svc.notes.toUpperCase());
  return parts.join(' ') || 'SERVICE';
};

export const mapVehicleToType = (vehicleType: string): string => {
  const v = (vehicleType || '').toUpperCase();
  if (v.indexOf('TRANSFER') > -1 || v.indexOf('AIRPORT') > -1 || v.indexOf('AEROPUERTO') > -1) {
    return v.indexOf('VAN') > -1 ? 'VAN TRANSFER' : 'CAR TRANSFER';
  }
  if (v.indexOf('DISPO') > -1) {
    return v.indexOf('CAR') > -1 ? 'CAR TRANSFER-DI DISPO' : 'VAN DISPO';
  }
  if (v.indexOf('VAN') > -1) return 'VAN TRANSFER';
  if (v.indexOf('CAR') > -1) return 'CAR TRANSFER';
  return 'VAN DISPO';
};

export const calcHoursWorked = (svc: Service): number => {
  if (svc.startTime && svc.endTime) {
    const startParts = svc.startTime.replace('.', ':').split(':');
    const endParts = svc.endTime.replace('.', ':').split(':');
    if (startParts.length === 2 && endParts.length === 2) {
      const startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      let endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      if (endMin <= startMin) endMin += 1440;
      return (endMin - startMin) / 60;
    }
  }
  return 0;
};

export const calcNotturnoHours = (startTime: string, endTime: string): number => {
  const start = timeToMin(startTime);
  const end = timeToMin(endTime);
  if (isNaN(start) || isNaN(end)) return 0;
  let nightHours = 0;
  if (start >= 1290) {
    if (end <= 390) {
      nightHours = (end + 1440 - start) / 60;
    } else {
      nightHours = (1440 - start) / 60;
      if (nightHours < 0) nightHours = 0;
    }
  } else if (start < 390) {
    if (end <= 390) {
      nightHours = (end - start) / 60;
    } else {
      nightHours = (390 - start) / 60;
    }
  } else if (end > 1290 || end <= 390) {
    const endNight = end <= 390 ? end + 1440 : end;
    nightHours = (endNight - Math.max(start, 1290)) / 60;
  }
  return Math.max(0, nightHours);
};

export const calcBackendCosts = (svc: Service) => {
  const costs = calculateServiceCosts(svc);
  const kmDriven = svc.km || 0;
  const hoursWorked = calcHoursWorked(svc);
  const notturnoHours = (svc.startTime && svc.endTime) ? calcNotturnoHours(svc.startTime, svc.endTime) : 0;
  const vehicleType = mapVehicleToType(svc.vehicleType);
  const isDispo = vehicleType.indexOf('DISPO') > -1;
  const overtimeHours = isDispo && hoursWorked > 10 ? hoursWorked - 10 : 0;

  return {
    baseCost: costs.baseCost,
    overtimeHours,
    overtimeCost: costs.notturnoCost,
    kmDriven,
    kmCost: costs.kmOverCost,
    notturnoHours,
    notturnoCost: costs.notturnoCost,
    festivo: costs.festivo,
    diaria: costs.diariaCost,
    total: costs.totalCost,
    vehicleType,
    hoursWorked
  };
};
