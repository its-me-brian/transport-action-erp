import React from 'react';
import { Calendar } from 'lucide-react';
import { TransportService } from '../services/api';

interface TransportListFilterBarProps {
  filterDateFrom: string;
  filterDateTo: string;
  filterDriver: string;
  filterOperatingCompany: string;
  filterStatus: string;
  filterProject: string;
  filterFinancialStatus: string;
  services: TransportService[];
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onDriverChange: (v: string) => void;
  onOperatingCompanyChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onProjectChange: (v: string) => void;
  onFinancialStatusChange: (v: string) => void;
  onClear: () => void;
}

export default function TransportListFilterBar({
  filterDateFrom,
  filterDateTo,
  filterDriver,
  filterOperatingCompany,
  filterStatus,
  filterProject,
  filterFinancialStatus,
  services,
  onDateFromChange,
  onDateToChange,
  onDriverChange,
  onOperatingCompanyChange,
  onStatusChange,
  onProjectChange,
  onFinancialStatusChange,
  onClear,
}: TransportListFilterBarProps) {
  const hasFilters = filterDateFrom || filterDateTo || filterDriver || filterOperatingCompany || filterStatus || filterProject || filterFinancialStatus;
  const projects = [...new Set(services.map(s => s.project).filter(Boolean))];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
        <input
          type="date"
          value={filterDateFrom}
          onChange={e => onDateFromChange(e.target.value)}
          placeholder="From"
          className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-on-surface-variant text-[11px]">—</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={e => onDateToChange(e.target.value)}
          placeholder="To"
          className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <input
        type="text"
        placeholder="Driver..."
        value={filterDriver}
        onChange={e => onDriverChange(e.target.value)}
        className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface w-24 focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <select
        value={filterOperatingCompany}
        onChange={e => onOperatingCompanyChange(e.target.value)}
        className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="">All Companies</option>
        <option value="TA">TA</option>
        <option value="MM">MM</option>
      </select>
      <select
        value={filterStatus}
        onChange={e => onStatusChange(e.target.value)}
        className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="">All Status</option>
        <option value="Importado">Importado</option>
        <option value="Asignado">Asignado</option>
        <option value="Confirmado">Confirmado</option>
        <option value="EnRuta">En Ruta</option>
        <option value="Realizado">Realizado</option>
        <option value="Reportado">Reportado</option>
        <option value="Revision">Revisión</option>
        <option value="Validado">Validado</option>
        <option value="Cancelado">Cancelado</option>
      </select>
      <select
        value={filterProject}
        onChange={e => onProjectChange(e.target.value)}
        className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="">All Projects</option>
        {projects.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <select
        value={filterFinancialStatus}
        onChange={e => onFinancialStatusChange(e.target.value)}
        className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="">All Financial</option>
        <option value="Pendiente">Pendiente</option>
        <option value="Calculado">Calculado</option>
        <option value="Confrontacion">Confrontacion</option>
        <option value="ActualsConfirmados">ActualsConfirmados</option>
        <option value="Aprobado">Aprobado</option>
        <option value="Facturable">Facturable</option>
        <option value="Facturado">Facturado</option>
        <option value="Cobrado">Cobrado</option>
        <option value="Cerrado">Cerrado</option>
        <option value="CerradoComercial">CerradoComercial</option>
      </select>
      {hasFilters && (
        <button
          onClick={onClear}
          className="text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer"
        >
          Clear
        </button>
      )}
    </div>
  );
}
