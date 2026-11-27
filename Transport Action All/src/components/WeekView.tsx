import React from 'react';
import { Service, parseTimeToHour, isProductionVehicle } from '../types';
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
  openService: (s: Service) => void;
}

export default function WeekView({
  columns,
  filteredServices,
  completedDates,
  selectedServiceIds,
  handleDoubleClick,
  toggleServiceSelection,
  openService,
}: WeekViewProps) {
  const servicesFor = (date: string) => filteredServices
    .filter(s => s.date === date)
    .sort((a, b) => parseTimeToHour(a.time) - parseTimeToHour(b.time));

  const cardsFor = (colServices: Service[]) => colServices.length > 0 ? (
    colServices.map(service => (
      <ServiceCard
        key={service.id}
        service={service}
        compact
        onDoubleClick={handleDoubleClick}
        isSelected={selectedServiceIds.has(service.id)}
        onSelect={toggleServiceSelection}
        onClickSidePanel={openService}
      />
    ))
  ) : (
    <div className="flex-1" />
  );

  const productionCount = filteredServices.filter(isProductionVehicle).length;

  return (
    <>
      {/* Desktop: keep the familiar seven-column board. */}
      <div className="hidden lg:grid grid-cols-5 xl:grid-cols-7 gap-px bg-outline-variant/20 h-full">
        {columns.map((col) => {
          const colServices = servicesFor(col.date);

          return (
            <div
              key={col.key}
              className={`flex flex-col min-w-0 ${
                completedDates.has(col.date) ? (col.isToday ? 'bg-emerald-50/50' : 'bg-emerald-50/40') :
                col.isToday ? 'bg-primary/[0.02]' : 'bg-surface-container-lowest'
              }`}
            >
              <div className="px-2.5 py-2 flex items-center justify-between border-b border-outline-variant/20">
                <span className={`text-[11px] font-medium ${col.isToday ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                  {col.label}
                </span>
                <span className={`text-[10px] ${col.isToday ? 'text-primary/70' : 'text-on-surface-variant/50'}`}>
                  {col.date}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-px px-1 py-1 overflow-y-auto min-h-0">
                {cardsFor(colServices)}
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

      {/* Mobile: a day is a row, not one of seven blocks to scroll through. */}
      <div className="lg:hidden flex flex-col gap-2 p-3">
        {productionCount > 0 && (
          <p className="text-[10px] text-on-surface-variant/70">
            ⚑ {productionCount} transporte(s) de producción en gris, solo lectura.
          </p>
        )}
        {columns.map((col) => {
          const colServices = servicesFor(col.date);
          const unassigned = colServices.filter(s => !s.driverName || s.driverName === 'Unassigned').length;

          return (
            <details
              key={col.key}
              open={col.isToday}
              className={`rounded-lg border border-outline-variant/25 bg-surface-container-lowest ${
                completedDates.has(col.date) ? 'bg-emerald-50/40' : ''
              }`}
            >
              <summary className="flex items-center justify-between px-3 py-2 cursor-pointer list-none">
                <span className={`text-[12px] font-medium ${col.isToday ? 'text-primary' : 'text-on-surface'}`}>
                  {col.label} · {col.date}{col.isToday ? ' · hoy' : ''}
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  {colServices.length} servicio(s){unassigned > 0 ? ` · ⚠ ${unassigned} sin chofer` : ''}
                </span>
              </summary>
              <div className="flex flex-col gap-1 px-2 pb-2">
                {cardsFor(colServices)}
                {colServices.length === 0 && (
                  <span className="px-1 py-2 text-[11px] text-on-surface-variant/60">Sin servicios</span>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
