import React from 'react';
import { Check } from 'lucide-react';
import {
  Service,
  getServiceStatusColor,
  isProductionVehicle,
  formatTimeDisplay,
} from '../types';

interface ServiceCardProps {
  service: Service;
  onDoubleClick?: (s: Service) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onClickSidePanel?: (s: Service) => void;
  compact?: boolean;
}

const ServiceCard = React.memo(function ServiceCard({
  service,
  onDoubleClick,
  isSelected = false,
  onSelect,
  onClickSidePanel,
  compact = false,
}: ServiceCardProps) {
  const statusColor = getServiceStatusColor(service);
  const isUnassigned = !service.driverName || service.driverName === 'Unassigned';
  const isProduction = isProductionVehicle(service);
  const movements = service.movements || [];
  const hasMultiple = movements.length > 1;
  const isTerminal = service.operationalStatus === 'Validado' || service.operationalStatus === 'Cancelado';
  const lastTapRef = React.useRef<number>(0);

  const firstTime = movements[0]?.time || service.time;
  const lastTime = movements.length > 1 ? movements[movements.length - 1].time : null;

  const handleTouchEnd = React.useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) { onDoubleClick?.(service); }
    lastTapRef.current = now;
  }, [onDoubleClick, service]);

  const badge = service.vehicleType ? (
    <span className={`text-[9px] font-semibold px-1 py-px rounded shrink-0 ${
      isProduction ? 'bg-gray-100 text-gray-500' : 'bg-primary/8 text-primary/70'
    }`}>
      {service.serviceType ? `${service.serviceType.replace('Transfer ', 'T.').substring(0, 7)} · ` : ''}{service.vehicleType.replace('Disposal ', '').replace('Production ', '').substring(0, 6)}
    </span>
  ) : null;

  // Week view: ultra-compact single line
  if (compact) {
    return (
      <div
        className={`relative flex items-center gap-1.5 px-2 py-[5px] rounded cursor-pointer transition-all border-l-[3px] group ${
          isSelected ? 'ring-1.5 ring-primary/40' : 'hover:bg-surface-dim/50'
        }`}
        style={{ borderLeftColor: statusColor.hex, backgroundColor: isSelected ? `${statusColor.hex}08` : undefined }}
        onClick={() => onClickSidePanel?.(service)}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(service); }}
        onTouchEnd={handleTouchEnd}
      >
        <span className="text-[11px] font-semibold text-on-surface/70 tabular-nums shrink-0 w-[38px]">
          {formatTimeDisplay(firstTime)}
        </span>
        <span className={`text-[12px] font-medium truncate flex-1 min-w-0 ${isUnassigned ? 'text-amber-600' : 'text-on-surface'}`}>
          {isUnassigned ? '⚠ Unassigned' : service.driverName}
        </span>
        {hasMultiple && (
          <span className="text-[9px] font-medium px-1 py-px rounded bg-surface-container text-on-surface-variant shrink-0">
            {movements.length}
          </span>
        )}
        {badge}
        {!isTerminal && (
        <button onClick={(e) => { e.stopPropagation(); onSelect?.(service.id); }}
          className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors opacity-0 group-hover:opacity-100 ${
            isSelected ? 'bg-primary border-primary text-white opacity-100' : 'border-outline-variant hover:border-primary'
          }`}>
          {isSelected && <Check className="w-2 h-2" />}
        </button>
        )}
      </div>
    );
  }

  // Day view: compact card with time + destination
  const timeDisplay = lastTime
    ? `${formatTimeDisplay(firstTime)}–${formatTimeDisplay(lastTime)}`
    : formatTimeDisplay(firstTime);

  return (
    <div
      className={`relative flex flex-col rounded cursor-pointer transition-all border-l-[3px] group ${
        isSelected ? 'ring-1.5 ring-primary/40' : 'hover:bg-surface-dim/30'
      }`}
      style={{ borderLeftColor: statusColor.hex, backgroundColor: isSelected ? `${statusColor.hex}06` : undefined }}
      onClick={() => onClickSidePanel?.(service)}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(service); }}
      onTouchEnd={handleTouchEnd}
    >
      <div className="px-2 py-1 flex items-center gap-1.5 min-w-0">
        <span className={`text-[12px] font-semibold truncate flex-1 min-w-0 ${isUnassigned ? 'text-amber-600' : 'text-on-surface'}`}>
          {isUnassigned ? '⚠ Unassigned' : service.driverName}
        </span>
        {hasMultiple && (
          <span className="text-[9px] font-medium px-1.5 py-px rounded-full bg-surface-container text-on-surface-variant shrink-0">
            {movements.length} schedules
          </span>
        )}
        {badge}
        {!isTerminal && (
        <button onClick={(e) => { e.stopPropagation(); onSelect?.(service.id); }}
          className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors opacity-0 group-hover:opacity-100 ${
            isSelected ? 'bg-primary border-primary text-white opacity-100' : 'border-outline-variant hover:border-primary'
          }`}>
          {isSelected && <Check className="w-2 h-2" />}
        </button>
        )}
      </div>
      {hasMultiple ? (
        <div className="px-2 pb-1">
          <span className="text-[10px] text-on-surface-variant tabular-nums">{timeDisplay}</span>
        </div>
      ) : (
        <div className="px-2 pb-1 flex items-center gap-1 min-w-0">
          <span className="text-[10px] text-on-surface-variant tabular-nums">{timeDisplay}</span>
          {service.from && <span className="text-[10px] text-on-surface-variant/50 truncate">→ {service.from}</span>}
        </div>
      )}
    </div>
  );
});
export default ServiceCard;
