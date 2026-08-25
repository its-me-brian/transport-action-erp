import React from 'react';
import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import {
  TransportService,
  passengerDisplay,
  passengerRolesDisplay,
  hasPassengerRole,
  pickupDisplay,
  dropoffDisplay,
  isServiceDimmed,
} from '../services/api';
import DriverCell from './DriverCell';
import { OperatingCompanyCell } from './InlineCells';

interface MobileServiceCardProps {
  service: TransportService;
  isSelected: boolean;
  isExpanded: boolean;
  viewMode: 'flat' | 'grouped';
  dbDrivers: import('../services/api').DriverRecord[];
  isServiceCompleted: (service: TransportService) => boolean;
  onToggleRowSelection: (id: string) => void;
  onToggleServiceExpand: (id: string) => void;
  onDriverUpdate: (serviceId: string, driver: string, driverPhone: string) => void;
  onOperatingCompanyUpdate: (serviceId: string, operatingCompany: string) => void;
}

function getSectionStyleMobile(name: string): string {
  const upper = name.toUpperCase();
  if (upper.indexOf('ARRIVALS') > -1 || upper.indexOf('DEPARTURES') > -1) return 'bg-[#7ecfc0]';
  if (upper === 'PUGLIA') return 'bg-[#a8d8ea]';
  return 'bg-[#c6d44e]';
}

export default function MobileServiceCard({
  service,
  isSelected,
  isExpanded,
  viewMode,
  dbDrivers,
  isServiceCompleted,
  onToggleRowSelection,
  onToggleServiceExpand,
  onDriverUpdate,
  onOperatingCompanyUpdate,
}: MobileServiceCardProps) {
  const hasDriver = !!(service.driver && service.driver.trim());
  const firstMov = service.movements?.[0];

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all ${
        isServiceDimmed(service) ? 'bg-gray-50 opacity-60 border border-gray-200' :
        isSelected ? 'border-2 border-primary shadow-sm' : 'border border-outline-variant'
      }`}
    >
      {/* Header: time + vehicle + badges */}
      <div className={`flex items-center gap-2 px-3 py-2 ${
        service.isProduction ? 'bg-gray-100' :
        !service.serviceTypeConfirmed ? 'bg-red-50/80' :
        'bg-surface-dim/50'
      }`}>
        {service.selectable !== false && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleRowSelection(service.id)}
            onClick={(e) => e.stopPropagation()}
            disabled={isServiceCompleted(service)}
            className={`rounded shrink-0 ${isServiceCompleted(service) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          />
        )}
        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
          {service.time || '??:??'}
        </span>
        <span className="text-[12px] font-semibold text-on-surface truncate flex-1">
          {service.vehicle || '(sin vehículo)'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {service.section && (
            <span className="text-[8px] font-bold text-on-surface-variant bg-surface-dim px-1.5 py-0.5 rounded uppercase">
              {service.section}
            </span>
          )}
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
            service.vehicleType === 'Walking' ? 'bg-teal-100 text-teal-700' :
            'bg-surface-dim text-on-surface-variant'
          }`}>
            {service.vehicleType || 'Van'}
          </span>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
            service.isProduction ? 'bg-gray-200 text-gray-600' :
            !service.serviceTypeConfirmed ? 'bg-red-100 text-red-600' :
            service.serviceType === 'Transfer Airport' ? 'bg-blue-100 text-blue-600' :
            service.serviceType === 'Transfer City' ? 'bg-blue-100 text-blue-600' :
            'bg-amber-100 text-amber-700'
          }`}>
            {service.isProduction ? 'PROD' : service.serviceType?.substring(0, 5)?.toUpperCase() || 'DISP'}
            {!service.serviceTypeConfirmed && ' !'}
          </span>
        </div>
      </div>

      {/* Driver section */}
      <div className={`px-3 py-2.5 flex items-center gap-2.5 ${
        !hasDriver ? 'bg-amber-50/70' : 'bg-white'
      }`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
          !hasDriver ? 'bg-amber-200 text-amber-700' :
          'bg-primary/15 text-primary'
        }`}>
          {!hasDriver ? '?' : (service.driver || '?').split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-semibold leading-tight ${!hasDriver ? 'text-amber-600 italic' : 'text-on-surface'}`}>
            <DriverCell service={service} dbDrivers={dbDrivers} onUpdate={onDriverUpdate} />
          </div>
          {service.driverPhone && (
            <div className="text-[10px] text-on-surface-variant/70 mt-0.5">
              {service.driverPhone.replace(/^'/, '')}
            </div>
          )}
        </div>
        <OperatingCompanyCell service={service} onUpdate={onOperatingCompanyUpdate} />
      </div>

      {/* Route section — first movement */}
      {viewMode === 'grouped' && firstMov && (firstMov.passengers?.length > 0 || firstMov.pickupLines?.length > 0 || firstMov.dropoffLines?.length > 0) && (
        <div className="px-3 py-2 border-t border-outline-variant/30 bg-white">
          {firstMov.passengers && firstMov.passengers.length > 0 && (
            <div className="text-[11px] text-on-surface mb-1">
              {firstMov.passengers.map((p, pi) => (
                <span key={p.name}>
                  {pi > 0 && '; '}
                  <span className="font-medium">{p.name}</span>
                  {p.role && <span className="text-on-surface-variant/50 text-[10px]"> {p.role}</span>}
                </span>
              ))}
            </div>
          )}
          {(firstMov.pickupLines?.length > 0 || firstMov.dropoffLines?.length > 0) && (
            <div className="text-[10px] text-on-surface-variant/70 space-y-0.5">
              <div className="flex items-start gap-1">
                {service.pickupMapsUrl && (
                  <a href={service.pickupMapsUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary/60 hover:text-primary mt-0.5">
                    <MapPin className="w-3 h-3" />
                  </a>
                )}
                <span className="line-clamp-2">{firstMov.pickupLines?.join('; ')}</span>
              </div>
              <div className="flex items-start gap-1">
                {service.dropoffMapsUrl && (
                  <a href={service.dropoffMapsUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary/60 hover:text-primary mt-0.5">
                    <MapPin className="w-3 h-3" />
                  </a>
                )}
                <span className="line-clamp-2">→ {firstMov.dropoffLines?.join('; ')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Flat mode: show all passengers */}
      {viewMode !== 'grouped' && (
        <div className="px-3 py-2 border-t border-outline-variant/30 bg-white">
          {(Array.isArray(service.passengers) ? service.passengers.length > 0 : !!service.passengers) && (
            <div className="text-[11px] text-on-surface mb-1">
              {passengerDisplay(service.passengers)}
            </div>
          )}
          {(pickupDisplay(service.pickupLines) || dropoffDisplay(service.dropoffLines)) && (
            <div className="text-[10px] text-on-surface-variant/70 flex items-start gap-1">
              {service.pickupMapsUrl && (
                <a href={service.pickupMapsUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary/60 hover:text-primary mt-0.5">
                  <MapPin className="w-3 h-3" />
                </a>
              )}
              <span className="line-clamp-2">{pickupDisplay(service.pickupLines)} → {dropoffDisplay(service.dropoffLines)}</span>
            </div>
          )}
        </div>
      )}

      {/* Grouped: additional movements */}
      {viewMode === 'grouped' && service.movements && service.movements.length > 1 && (
        <div className="px-3 py-2 border-t border-outline-variant/30 bg-white">
          <button
            onClick={() => onToggleServiceExpand(service.id)}
            className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary-hover cursor-pointer"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {service.movements.length - 1} movimientos adicionales
          </button>
          {isExpanded && service.movements.slice(1).map((mov, mi) => {
            const allMovements = service.movements || [];
            const prevMov = allMovements[mi] || allMovements[0];
            const timeChanged = mov.time && mov.time !== (prevMov?.time || '');
            return (
              <div key={mi} className={`ml-2 mt-1.5 pl-2 border-l-2 text-[10px] space-y-0.5 ${timeChanged ? 'border-primary/40' : 'border-primary/15'}`}>
                {timeChanged && (
                  <div className="font-bold text-primary text-[11px]">{mov.time}</div>
                )}
                {mov.passengers && mov.passengers.length > 0 && (
                  <div className="text-on-surface">
                    {mov.passengers.map((p, pi) => (
                      <span key={p.name}>
                        {pi > 0 && '; '}
                        <span className="font-medium">{p.name}</span>
                        {p.role && <span className="text-on-surface-variant/50 text-[9px]"> {p.role}</span>}
                      </span>
                    ))}
                  </div>
                )}
                {(mov.pickupLines?.length > 0 || mov.dropoffLines?.length > 0) && (
                  <div className="text-on-surface-variant/70 text-[9px]">
                    {mov.pickupLines?.join('; ')}
                    {mov.pickupLines?.length > 0 && mov.dropoffLines?.length > 0 && ' → '}
                    {mov.dropoffLines?.join('; ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
