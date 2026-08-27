import React from 'react';
import { Search } from 'lucide-react';
import { statusConfig } from './paymentsShared';

const statuses = ['Registrado', 'Confirmado', 'Conciliado', 'Anulado'];

interface PaymentFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  dateFrom: string;
  onDateFromChange: (d: string) => void;
  dateTo: string;
  onDateToChange: (d: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export default function PaymentFilters({
  searchQuery, onSearchQueryChange,
  statusFilter, onStatusFilterChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  onClear, hasActiveFilters
}: PaymentFiltersProps) {
  return (
    <div id="payments-filters" className="flex flex-col gap-2 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
      <div className="flex flex-col sm:flex-row gap-2 items-center flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            placeholder="Search payments..."
            aria-label="Search payments"
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
          />
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
          />
          <span className="text-on-surface-variant text-[12px]">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => onDateToChange(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] font-medium rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer"
          >
            <option value="All">All Status</option>
            {statuses.map(s => (
              <option key={s} value={s}>{statusConfig[s]?.label || s}</option>
            ))}
          </select>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
