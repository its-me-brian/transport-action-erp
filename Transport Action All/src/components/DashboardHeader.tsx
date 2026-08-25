import React from 'react';
import { Plus, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { ViewMode, getMonthName, parseDateKeyToDate, formatDateKey } from '../types';
import { OperatingCompany } from '../services/api';

interface DashboardHeaderProps {
  viewMode: ViewMode;
  baseDate: Date;
  onBaseDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigate: (screen: string, transition?: string) => void;
  dateRangeLabel: string;
  companies: OperatingCompany[];
  driverOptions: string[];
  statusOptions: string[];
  activeEntity: string;
  driverFilter: string;
  statusFilter: string;
  searchQuery: string;
  onEntityChange: (v: string) => void;
  onDriverFilterChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onSearchChange: (v: string) => void;
}

export default function DashboardHeader({
  viewMode,
  baseDate,
  onBaseDateChange,
  onViewModeChange,
  onNavigate,
  dateRangeLabel,
  companies,
  driverOptions,
  statusOptions,
  activeEntity,
  driverFilter,
  statusFilter,
  searchQuery,
  onEntityChange,
  onDriverFilterChange,
  onStatusFilterChange,
  onSearchChange,
}: DashboardHeaderProps) {
  const goToPrev = () => {
    const d = new Date(baseDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    onBaseDateChange(d);
  };

  const goToNext = () => {
    const d = new Date(baseDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    onBaseDateChange(d);
  };

  const goToToday = () => {
    onBaseDateChange(new Date());
  };

  const dropdownBase = "text-[10px] text-on-surface-variant bg-transparent border-none cursor-pointer hover:text-on-surface focus:outline-none appearance-none min-w-0";
  const dropdownBg = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 2px center' as const, backgroundSize: '10px' as const };

  return (
    <>
      {/* Row 1: Title + Actions */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col min-w-0">
            <h1 className="text-[15px] font-semibold text-on-surface leading-tight">Master Calendar</h1>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {viewMode === 'month'
                ? `${getMonthName(baseDate.getMonth())} ${baseDate.getFullYear()}`
                : viewMode === 'day'
                  ? `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][parseDateKeyToDate(formatDateKey(baseDate))?.getDay() ?? 0]}, ${formatDateKey(baseDate)}`
                  : dateRangeLabel
              }
            </p>
          </div>
          <button onClick={goToToday}
            className="px-2.5 py-1 text-[11px] font-medium text-on-surface border border-outline-variant rounded-md hover:bg-surface-dim transition-colors cursor-pointer shrink-0">
            Today
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onNavigate('new_service', 'slide_up')}
            className="flex items-center gap-1 bg-primary text-on-primary text-[11px] font-medium px-2.5 py-1.5 rounded-md hover:bg-primary-hover transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Service</span>
          </button>
          <button onClick={() => onNavigate('transport_list', 'none')}
            className="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant text-on-surface-variant text-[11px] font-medium px-2.5 py-1.5 rounded-md hover:bg-surface-dim transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import Excel</span>
          </button>
          <button className="p-1.5 rounded-md hover:bg-surface-dim text-on-surface-variant transition-colors cursor-pointer relative">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          </button>
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary cursor-pointer">AD</div>
        </div>
      </div>

      {/* Row 2: Navigation + View Toggle + Filters + Search */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 shrink-0">
        {/* Date navigation */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={goToPrev} className="p-0.5 rounded hover:bg-surface-dim transition-colors text-on-surface-variant hover:text-on-surface">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={goToNext} className="p-0.5 rounded hover:bg-surface-dim transition-colors text-on-surface-variant hover:text-on-surface">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-[11px] text-on-surface font-medium shrink-0 whitespace-nowrap">{dateRangeLabel}</span>

        {/* View mode toggle */}
        <div className="flex bg-surface-container rounded-md overflow-hidden border border-outline-variant/40 shrink-0">
          {(['day','week','month'] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => onViewModeChange(mode)}
              className={`px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer capitalize ${
                viewMode === mode ? 'bg-on-surface text-surface-container-lowest' : 'text-on-surface-variant hover:text-on-surface'
              }`}>
              {mode}
            </button>
          ))}
        </div>

        <div className="w-px h-3.5 bg-outline-variant/30 shrink-0" />

        {/* Compact dropdowns */}
        <select value={activeEntity} onChange={e => onEntityChange(e.target.value)}
          className={dropdownBase} style={{ ...dropdownBg, paddingRight: '14px' }}>
          <option value="All">Company</option>
          {companies.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select value={driverFilter} onChange={e => onDriverFilterChange(e.target.value)}
          className={dropdownBase} style={{ ...dropdownBg, paddingRight: '14px' }}>
          <option value="All">Driver</option>
          {driverOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)}
          className={dropdownBase} style={{ ...dropdownBg, paddingRight: '14px' }}>
          <option value="All">Status</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="w-px h-3.5 bg-outline-variant/30 shrink-0" />

        {/* Search — takes remaining space */}
        <div className="relative flex-1 min-w-[120px] max-w-[180px]">
          <svg className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" value={searchQuery} onChange={e => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent border-none pl-6 pr-1.5 py-1 text-[10px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none" />
        </div>
      </div>
    </>
  );
}
