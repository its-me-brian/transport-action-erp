import React from 'react';
import { Service, ViewMode, formatDateKey, getServiceStatusColor, isProductionVehicle } from '../types';

interface MonthViewProps {
  baseDate: Date;
  filteredServices: Service[];
  completedDates: Set<string>;
  onBaseDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function MonthView({
  baseDate,
  filteredServices,
  completedDates,
  onBaseDateChange,
  onViewModeChange,
}: MonthViewProps) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstDow = firstDay.getDay();
  const mondayOffset = firstDow === 0 ? -6 : 1 - firstDow;

  const today = new Date();
  const todayKey = formatDateKey(today);

  const cells: React.ReactNode[] = [];
  const startDate = new Date(year, month, 1 + mondayOffset);
  let monthTotal = 0;
  let monthUnassigned = 0;
  let monthProduction = 0;

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);

    const dateKey = formatDateKey(cellDate);
    const isCurrentMonth = cellDate.getMonth() === month;
    const isToday = dateKey === todayKey;
    const dayServices = filteredServices.filter(s => s.date === dateKey);
    const unassigned = dayServices.filter(s => !s.driverName || s.driverName === 'Unassigned').length;
    const production = dayServices.filter(isProductionVehicle).length;

    if (isCurrentMonth) {
      monthTotal += dayServices.length;
      monthUnassigned += unassigned;
      monthProduction += production;
    }

    cells.push(
      <button
        key={i}
        onClick={() => {
          onBaseDateChange(new Date(cellDate));
          onViewModeChange('day');
        }}
        title={`${dateKey} · ${dayServices.length} servicio(s)${unassigned ? ` · ⚠ ${unassigned} sin chofer` : ''}${production ? ` · ⚑ ${production} producción (solo lectura)` : ''}`}
        className={`flex flex-col items-center p-1.5 min-h-[72px] transition-colors cursor-pointer border-none ${
          !isCurrentMonth ? 'bg-surface-dim/30 opacity-30' :
          completedDates.has(dateKey) ? 'bg-emerald-50/60' :
          isToday ? 'bg-primary/[0.04]' : 'bg-surface-container-lowest hover:bg-surface-dim/30'
        }`}
      >
        <span className={`text-[11px] ${
          isToday ? 'w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-semibold' :
          'text-on-surface font-medium'
        }`}>
          {cellDate.getDate()}
        </span>
        {dayServices.length > 0 && (
          <div className="flex flex-wrap gap-px mt-1 justify-center">
            {dayServices.slice(0, 4).map((s, j) => (
              <div
                key={j}
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: isProductionVehicle(s) ? '#9ca3af' : getServiceStatusColor(s).hex }}
              />
            ))}
            {dayServices.length > 4 && (
              <span className="text-[8px] text-on-surface-variant/40">+{dayServices.length - 4}</span>
            )}
          </div>
        )}
        {dayServices.length > 0 && (
          <span className="text-[8px] text-on-surface-variant/60 tabular-nums mt-0.5">
            {dayServices.length}{unassigned > 0 ? ` · ⚠${unassigned}` : ''}
          </span>
        )}
      </button>
    );

    if (i >= 34 && cellDate.getMonth() !== month) break;
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-on-surface-variant">
        <span className="font-medium text-on-surface">{monthTotal} servicio(s) este mes</span>
        {monthUnassigned > 0 && <span>⚠ {monthUnassigned} sin chofer</span>}
        {monthProduction > 0 && <span>⚑ {monthProduction} producción (solo lectura)</span>}
      </div>
      <div className="grid grid-cols-7 gap-px bg-outline-variant/15 rounded-lg overflow-hidden">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="text-[10px] font-medium text-on-surface-variant/50 py-2 text-center bg-surface-container-lowest uppercase tracking-wider">{d}</div>
        ))}
        {cells}
      </div>
    </div>
  );
}
