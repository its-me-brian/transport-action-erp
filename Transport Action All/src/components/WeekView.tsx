import React from 'react';
import { Service, parseTimeToHour } from '../types';
import ServiceCard from './ServiceCard';

interface WeekColumn {
  key: string;
  label: string;
  date: string;
  isToday: boolean;
}

interface WeekViewProps {
  columns: WeekColumn[];
  filteredServices: Service[];
  completedDates: Set<string>;
  selectedServiceIds: Set<string>;
  handleDoubleClick: (s: Service) => void;
  toggleServiceSelection: (id: string) => void;
  setSidePanelService: (s: Service) => void;
}

export default function WeekView({
  columns,
  filteredServices,
  completedDates,
  selectedServiceIds,
  handleDoubleClick,
  toggleServiceSelection,
  setSidePanelService,
}: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-px bg-outline-variant/20 h-full">
      {columns.map((col) => {
        const colServices = filteredServices
          .filter(s => s.date === col.date)
          .sort((a, b) => parseTimeToHour(a.time) - parseTimeToHour(b.time));

        return (
          <div
            key={col.key}
            className={`flex flex-col min-w-0 ${
              completedDates.has(col.date) ? (col.isToday ? 'bg-emerald-50/50' : 'bg-emerald-50/40') :
              col.isToday ? 'bg-primary/[0.02]' : 'bg-surface-container-lowest'
            }`}
          >
            <div className={`px-2.5 py-2 flex items-center justify-between border-b border-outline-variant/20 ${col.isToday ? '' : ''}`}>
              <span className={`text-[11px] font-medium ${col.isToday ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                {col.label}
              </span>
              <span className={`text-[10px] ${col.isToday ? 'text-primary/70' : 'text-on-surface-variant/50'}`}>
                {col.date}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-px px-1 py-1 overflow-y-auto min-h-0">
              {colServices.length > 0 ? (
                colServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    compact
                    onDoubleClick={handleDoubleClick}
                    isSelected={selectedServiceIds.has(service.id)}
                    onSelect={toggleServiceSelection}
                    onClickSidePanel={setSidePanelService}
                  />
                ))
              ) : (
                <div className="flex-1" />
              )}
            </div>

            {colServices.length > 0 && (
              <div className={`text-[10px] text-center py-1 border-t border-outline-variant/15 ${col.isToday ? 'text-primary/50' : 'text-on-surface-variant/30'}`}>
                {colServices.length}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
