import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Check } from 'lucide-react';
import {
  Service,
  parseTimeToHour,
  parseDateKeyToDate,
  formatDateKey,
  formatTimeDisplay,
  getServiceStatusColor,
  isProductionVehicle,
  getHourSlots,
} from '../types';

interface DayDetailViewProps {
  effectiveDay: string;
  selectedDay: string | null;
  dayServices: Service[];
  layoutServices: Array<{
    service: Service;
    start: number;
    end: number;
    col: number;
    totalCols: number;
  }>;
  selectedServiceIds: Set<string>;
  toggleServiceSelection: (id: string) => void;
  selectAllServicesForDay: (dateKey: string) => void;
  setSelectedDay: (day: string | null) => void;
  handleDoubleClick: (s: Service) => void;
  setSidePanelService: (s: Service) => void;
  lastTapMapRef: React.MutableRefObject<Map<string, number>>;
}

export default function DayDetailView({
  effectiveDay,
  selectedDay,
  dayServices,
  layoutServices,
  selectedServiceIds,
  toggleServiceSelection,
  selectAllServicesForDay,
  setSelectedDay,
  handleDoubleClick,
  setSidePanelService,
  lastTapMapRef,
}: DayDetailViewProps) {
  if (!effectiveDay) return null;

  const hourSlots = getHourSlots();
  const HOUR_HEIGHT = 72;
  const dateObj = parseDateKeyToDate(effectiveDay);
  const dayOfWeek = dateObj ? dateObj.getDay() : 0;
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const displayDate = dateObj ? `${dayNames[dayOfWeek]}, ${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}` : effectiveDay;

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex items-center justify-between">
        {selectedDay ? (
          <button
            onClick={() => setSelectedDay(null)}
            className="flex items-center gap-1 text-[12px] text-primary hover:text-primary-hover cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Week
          </button>
        ) : <div />}
        <span className="text-[14px] font-semibold text-on-surface">
          {displayDate}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-on-surface-variant">
            {dayServices.length} services
          </span>
          {dayServices.length > 0 && (
            <button
              onClick={() => selectAllServicesForDay(effectiveDay)}
              className="text-[11px] text-primary font-medium hover:underline"
            >
              Select All Day
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden mx-5">
        <div className="flex">
          <div className="w-12 shrink-0 border-r border-outline-variant/20">
            {hourSlots.map(slot => (
              <div key={slot.hour} className="h-[72px] flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[10px] text-on-surface-variant/40 font-medium tabular-nums">{slot.label}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 relative">
            {hourSlots.map(slot => (
              <div key={slot.hour} className="h-[72px] border-b border-outline-variant/15" />
            ))}

            <AnimatePresence>
              {layoutServices.map(({ service, start, end, col, totalCols }, idx) => {
                const topOffset = (start - 6) * HOUR_HEIGHT;
                const height = (end - start) * HOUR_HEIGHT - 3;
                const width = 100 / totalCols;
                const left = col * width;
                const isUnassigned = !service.driverName || service.driverName === 'Unassigned';
                const isSelected = selectedServiceIds.has(service.id);
                const isCompleted = service.status === 'Completed';
                const isProduction = isProductionVehicle(service);
                const statusColor = getServiceStatusColor(service);

                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    className={`absolute rounded-md px-2 py-1.5 cursor-pointer transition-all hover:shadow-md overflow-hidden ${
                      isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                    style={{
                      top: `${topOffset}px`,
                      height: `${height}px`,
                      left: `${left}%`,
                      width: `calc(${width}% - 4px)`,
                      minHeight: '24px',
                      touchAction: 'manipulation',
                      borderLeft: `4px solid ${getServiceStatusColor(service).hex}`,
                      backgroundColor: isCompleted ? '#f9fafb' : service.operationalStatus === 'Cancelado' ? '#fef2f2' : getServiceStatusColor(service).hex + '12',
                    }}
                    onClick={() => setSidePanelService(service)}
                    onDoubleClick={() => handleDoubleClick(service)}
                    onTouchEnd={() => {
                      const now = Date.now();
                      const last = lastTapMapRef.current.get(service.id) || 0;
                      if (now - last < 300) { handleDoubleClick(service); }
                      lastTapMapRef.current.set(service.id, now);
                    }}
                  >
                    {(service.operationalStatus !== 'Validado' && service.operationalStatus !== 'Cancelado') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleServiceSelection(service.id);
                      }}
                      className={`absolute bottom-1 right-1 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary text-white'
                          : 'bg-white border-outline-variant hover:border-primary'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                    )}

                    <div className="flex flex-col gap-0 h-full overflow-hidden">
                      <div className="flex items-center gap-1">
                        {isUnassigned && (
                          <span className="text-[10px] text-amber-600 font-bold shrink-0">⚠</span>
                        )}
                        <span className={`text-[12px] font-bold truncate leading-tight ${isUnassigned ? 'text-amber-700' : 'text-on-surface'}`}>
                          {service.driverName || 'Unassigned'}
                        </span>
                        {service.vehicleType && (
                          <span className={`text-[8px] px-1 py-0 rounded font-medium shrink-0 ${
                            isProduction ? 'bg-gray-100 text-gray-600' : 'bg-primary/15 text-primary'
                          }`}>
                            {service.serviceType ? `${service.serviceType.replace('Transfer ', 'T.').replace('Disposizione', 'Dispo').substring(0, 7)} · ` : ''}{service.vehicleType.replace('Disposal ', 'D-').replace('Production ', 'P-').substring(0, 6)}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const movements = service.movements || [];
                        if (movements.length > 1) {
                          const totalHours = end - start;
                          const CARD_HEIGHT = totalHours * HOUR_HEIGHT - 3;
                          const HEADER_HEIGHT = 22;
                          const availableHeight = CARD_HEIGHT - HEADER_HEIGHT;

                          return (
                            <div className="relative" style={{ minHeight: `${availableHeight}px` }}>
                              <div className="absolute left-[4px] top-[6px] bottom-[6px] w-px bg-outline-variant/30" />
                              {movements.map((m, mi) => {
                                const from = m.pickupLines?.[0] || '';
                                const to = m.dropoffLines?.[0] || '';
                                const pax = m.passengers?.map(p => p.name).join(', ') || '';
                                const movementHour = parseTimeToHour(m.time);

                                let spacerHeight = 0;
                                if (mi === 0) {
                                  const offsetHours = movementHour - start;
                                  spacerHeight = Math.max(0, (offsetHours / totalHours) * availableHeight);
                                } else {
                                  const prevHour = parseTimeToHour(movements[mi - 1].time);
                                  const gapHours = movementHour - prevHour;
                                  spacerHeight = Math.max(0, (gapHours / totalHours) * availableHeight - 14);
                                }

                                return (
                                  <div key={mi}>
                                    {spacerHeight > 0 && <div style={{ height: `${spacerHeight}px` }} />}
                                    <div className="flex gap-2 items-start">
                                      <div className="relative z-10 shrink-0 mt-[3px]">
                                        <div className="w-[9px] h-[9px] rounded-full border-[1.5px] border-white" style={{ backgroundColor: statusColor.hex }} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[9px] font-semibold text-on-surface tabular-nums leading-tight">
                                            {formatTimeDisplay(m.time)}
                                          </span>
                                          {pax && (
                                            <span className="text-[8px] text-on-surface-variant truncate leading-tight">
                                              {pax}
                                            </span>
                                          )}
                                        </div>
                                        {from && (
                                          <div className="text-[8px] text-on-surface-variant/70 truncate leading-tight">↗ {from}</div>
                                        )}
                                        {to && (
                                          <div className="text-[8px] text-primary/70 truncate leading-tight">↘ {to}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        return (
                          <>
                            <span className="text-[10px] text-on-surface-variant font-medium truncate leading-tight">
                              {formatTimeDisplay(service.time)}
                            </span>
                            <span className="text-[10px] text-on-surface-variant truncate leading-tight opacity-70">
                              {service.title}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {dayServices.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[12px] text-on-surface-variant">No services this day</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
