import React from 'react';
import { Service, ViewMode, formatDateKey, getServiceStatusColor } from '../types';

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

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);

    const dateKey = formatDateKey(cellDate);
    const isCurrentMonth = cellDate.getMonth() === month;
    const isToday = dateKey === todayKey;
    const dayServices = filteredServices.filter(s => s.date === dateKey);

    cells.push(
      <button
        key={i}
        onClick={() => {
          onBaseDateChange(new Date(cellDate));
          onViewModeChange('day');
        }}
        className={`flex flex-col items-center p-1.5 min-h-[56px] transition-colors cursor-pointer border-none ${
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
              <div key={j} className="w-1 h-1 rounded-full" style={{ backgroundColor: getServiceStatusColor(s).hex }} />
            ))}
            {dayServices.length > 4 && (
              <span className="text-[8px] text-on-surface-variant/40">+{dayServices.length - 4}</span>
            )}
          </div>
        )}
      </button>
    );

    if (i >= 34 && cellDate.getMonth() !== month) break;
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="grid grid-cols-7 gap-px bg-outline-variant/15 rounded-lg overflow-hidden">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="text-[10px] font-medium text-on-surface-variant/50 py-2 text-center bg-surface-container-lowest uppercase tracking-wider">{d}</div>
        ))}
        {cells}
      </div>
    </div>
  );
}
