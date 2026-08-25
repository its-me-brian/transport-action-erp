import React from 'react';
import { Search } from 'lucide-react';
import { ClientDTO, DriverRecord, CollaboratorDTO, Project } from '../services/api';

interface RapportinoFilterBarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  currentStatuses: string[];
  activeTab: 'client' | 'driver' | 'collaborator';
  filterClient: string;
  onFilterClientChange: (v: string) => void;
  clientsList: ClientDTO[];
  filterDriver: string;
  onFilterDriverChange: (v: string) => void;
  driversList: DriverRecord[];
  filterCollaborator: string;
  onFilterCollaboratorChange: (v: string) => void;
  collaboratorsList: CollaboratorDTO[];
  filterProject: string;
  onFilterProjectChange: (v: string) => void;
  projectsList: Project[];
  onClear: () => void;
  hasActiveFilters: boolean;
}

export default function RapportinoFilterBar({
  searchQuery,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  statusFilter,
  onStatusFilterChange,
  currentStatuses,
  activeTab,
  filterClient,
  onFilterClientChange,
  clientsList,
  filterDriver,
  onFilterDriverChange,
  driversList,
  filterCollaborator,
  onFilterCollaboratorChange,
  collaboratorsList,
  filterProject,
  onFilterProjectChange,
  projectsList,
  onClear,
  hasActiveFilters
}: RapportinoFilterBarProps) {
  return (
    <div id="rapportino-filters" className="flex flex-col gap-2 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar rapportinos..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => onDateFromChange(e.target.value)}
              className="flex-1 sm:flex-none bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
            />
            <span className="hidden sm:inline text-on-surface-variant text-[12px] self-center">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => onDateToChange(e.target.value)}
              className="flex-1 sm:flex-none bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            <select
              value={statusFilter}
              onChange={e => onStatusFilterChange(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] font-medium rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer shrink-0"
            >
              <option value="All">Todos los estados</option>
              {currentStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {activeTab === 'client' && (
              <select
                value={filterClient}
                onChange={e => onFilterClientChange(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer shrink-0"
              >
                <option value="">Todos los clientes</option>
                {clientsList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {activeTab === 'driver' && (
              <select
                value={filterDriver}
                onChange={e => onFilterDriverChange(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer shrink-0"
              >
                <option value="">Todos los conductores</option>
                {driversList.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            {activeTab === 'collaborator' && (
              <select
                value={filterCollaborator}
                onChange={e => onFilterCollaboratorChange(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer shrink-0"
              >
                <option value="">Todos los colaboradores</option>
                {collaboratorsList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <select
              value={filterProject}
              onChange={e => onFilterProjectChange(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer shrink-0"
            >
              <option value="">Todos los proyectos</option>
              {projectsList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer self-start"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
