import React from 'react';
import {
  CheckCircle,
  Loader2,
  MapPin,
  Play,
  Pause,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
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
import EditableCell from './EditableCell';
import { OperatingCompanyCell, VehicleTypeCell, ServiceTypeCell } from './InlineCells';

interface ServiceTableRowsProps {
  services: TransportService[];
  filteredServices: TransportService[];
  selectedRows: Set<string>;
  showRoles: boolean;
  viewMode: 'flat' | 'grouped';
  expandedServices: Set<string>;
  dbDrivers: import('../services/api').DriverRecord[];
  editingCell: { rowId: string; field: string } | null;
  editValue: string;
  lifecycleLoading: Record<string, string | null>;
  onToggleRowSelection: (id: string) => void;
  onToggleServiceExpand: (id: string) => void;
  onToggleAllSelection: () => void;
  onStartEdit: (rowId: string, field: string, value: string) => void;
  onEditValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onDriverUpdate: (serviceId: string, driver: string, driverPhone: string) => void;
  onVehicleTypeUpdate: (serviceId: string, vehicleType: string) => void;
  onServiceTypeUpdate: (serviceId: string, serviceType: string) => void;
  onOperatingCompanyUpdate: (serviceId: string, operatingCompany: string) => void;
  onLifecycleTransition: (serviceId: string, action: string) => void;
}

function isServiceCompleted(service: TransportService) {
  const completedStatuses = ['Realizado', 'Reportado', 'Validado'];
  return completedStatuses.includes(service.status);
}

function LifecycleActions({
  service,
  lifecycleLoading,
  onLifecycleTransition,
}: {
  service: TransportService;
  lifecycleLoading: Record<string, string | null>;
  onLifecycleTransition: (serviceId: string, action: string) => void;
}) {
  const loading = lifecycleLoading[service.id];

  return (
    <td className="px-2 py-2 w-[120px] align-top">
      {service.status === 'Importado' && (
        <span className="text-[10px] text-on-surface-variant italic">Asignar conductor</span>
      )}
      {service.status === 'Asignado' && (
        <button
          onClick={() => onLifecycleTransition(service.id, 'confirmService')}
          disabled={!!loading}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading === 'confirmService' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          Confirmar
        </button>
      )}
      {service.status === 'Confirmado' && (
        <button
          onClick={() => onLifecycleTransition(service.id, 'startService')}
          disabled={!!loading}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading === 'startService' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          Iniciar
        </button>
      )}
      {service.status === 'EnRuta' && (
        <button
          onClick={() => onLifecycleTransition(service.id, 'completeService')}
          disabled={!!loading}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading === 'completeService' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
          Completar
        </button>
      )}
      {service.status === 'Reportado' && (
        <button
          onClick={() => onLifecycleTransition(service.id, 'validateService')}
          disabled={!!loading}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading === 'validateService' ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" />}
          Validar
        </button>
      )}
      {['Realizado', 'Validado'].includes(service.status) && (
        <span className="flex items-center gap-1 text-[10px] text-emerald-600">
          <CheckCircle className="w-3 h-3" /> Completado
        </span>
      )}
    </td>
  );
}

function renderServiceRow(
  service: TransportService,
  isSelected: boolean,
  _rowIdx: number,
  props: ServiceTableRowsProps
) {
  const { showRoles, dbDrivers, editingCell, editValue, lifecycleLoading } = props;

  return (
    <tr
      key={service.id}
      className={`transition-colors ${
        isServiceDimmed(service) ? 'bg-gray-50 opacity-60' :
        isSelected ? 'bg-primary/5' : 'hover:bg-surface-dim/50'
      }`}
    >
      <td className="px-2 py-2 w-8">
        {service.selectable !== false ? (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => props.onToggleRowSelection(service.id)}
            disabled={isServiceCompleted(service)}
            className={`rounded ${isServiceCompleted(service) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          />
        ) : null}
      </td>
      <td className="px-2 py-2">
        <EditableCell
          rowId={service.id}
          field="vehicle"
          value={service.vehicle}
          isEditing={editingCell?.rowId === service.id && editingCell?.field === 'vehicle'}
          editValue={editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <td className="px-2 py-2 hidden lg:table-cell">
        <VehicleTypeCell service={service} onUpdate={props.onVehicleTypeUpdate} />
      </td>
      <td className="px-2 py-2 hidden lg:table-cell">
        <ServiceTypeCell service={service} onUpdate={props.onServiceTypeUpdate} />
      </td>
      <td className="px-2 py-2">
        <DriverCell service={service} dbDrivers={dbDrivers} onUpdate={props.onDriverUpdate} />
      </td>
      <td className="px-2 py-2 hidden lg:table-cell">
        <EditableCell
          rowId={service.id}
          field="driverPhone"
          value={service.driverPhone}
          isEditing={editingCell?.rowId === service.id && editingCell?.field === 'driverPhone'}
          editValue={editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <td className="px-2 py-2 w-[60px]">
        <EditableCell
          rowId={service.id}
          field="time"
          value={service.time}
          isEditing={editingCell?.rowId === service.id && editingCell?.field === 'time'}
          editValue={editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <td className="px-2 py-2 max-w-[200px]">
        <EditableCell
          rowId={service.id}
          field="passengers"
          value={passengerDisplay(service.passengers)}
          isEditing={editingCell?.rowId === service.id && editingCell?.field === 'passengers'}
          editValue={editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      {showRoles && (
        <td className="px-2 py-2 text-on-surface-variant text-[11px] hidden xl:table-cell">
          {hasPassengerRole(service.passengers) ? passengerRolesDisplay(service.passengers) : '-'}
        </td>
      )}
      <td className="px-2 py-2 max-w-[180px] hidden md:table-cell overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <EditableCell
            rowId={service.id}
            field="pickupLines"
            value={pickupDisplay(service.pickupLines)}
            isEditing={editingCell?.rowId === service.id && editingCell?.field === 'pickupLines'}
            editValue={editValue}
            onEditValueChange={props.onEditValueChange}
            onStartEdit={props.onStartEdit}
            onSave={props.onSaveEdit}
            onKeyDown={props.onEditKeyDown}
          />
          {service.pickupMapsUrl && (
            <a href={service.pickupMapsUrl} target="_blank" rel="noopener noreferrer" title="Open pickup in Maps" className="shrink-0 text-primary/60 hover:text-primary transition-colors">
              <MapPin className="w-3 h-3" />
            </a>
          )}
        </div>
      </td>
      <td className="px-2 py-2 max-w-[180px] hidden md:table-cell overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <EditableCell
            rowId={service.id}
            field="dropoffLines"
            value={dropoffDisplay(service.dropoffLines)}
            isEditing={editingCell?.rowId === service.id && editingCell?.field === 'dropoffLines'}
            editValue={editValue}
            onEditValueChange={props.onEditValueChange}
            onStartEdit={props.onStartEdit}
            onSave={props.onSaveEdit}
            onKeyDown={props.onEditKeyDown}
          />
          {service.dropoffMapsUrl && (
            <a href={service.dropoffMapsUrl} target="_blank" rel="noopener noreferrer" title="Open dropoff in Maps" className="shrink-0 text-primary/60 hover:text-primary transition-colors">
              <MapPin className="w-3 h-3" />
            </a>
          )}
        </div>
      </td>
      <td className="px-2 py-2">
        <OperatingCompanyCell service={service} onUpdate={props.onOperatingCompanyUpdate} />
      </td>
      <td className="px-2 py-2 hidden xl:table-cell">
        <EditableCell
          rowId={service.id}
          field="flightInfo"
          value={service.flightInfo}
          isEditing={editingCell?.rowId === service.id && editingCell?.field === 'flightInfo'}
          editValue={editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <td className="px-2 py-2 hidden xl:table-cell">
        <EditableCell
          rowId={service.id}
          field="notes"
          value={service.notes}
          isEditing={editingCell?.rowId === service.id && editingCell?.field === 'notes'}
          editValue={editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <td className="px-2 py-2 hidden 2xl:table-cell">
        <EditableCell
          rowId={service.id}
          field="passengersList"
          value={service.passengersList}
          isEditing={editingCell?.rowId === service.id && editingCell?.field === 'passengersList'}
          editValue={editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <td className="px-2 py-2 hidden 2xl:table-cell">
        <EditableCell
          rowId={service.id}
          field="originalTransportDate"
          value={service.originalTransportDate}
          isEditing={editingCell?.rowId === service.id && editingCell?.field === 'originalTransportDate'}
          editValue={editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <LifecycleActions
        service={service}
        lifecycleLoading={lifecycleLoading}
        onLifecycleTransition={props.onLifecycleTransition}
      />
    </tr>
  );
}

function renderServiceBlock(
  service: TransportService,
  isSelected: boolean,
  _rowIdx: number,
  props: ServiceTableRowsProps
) {
  const { expandedServices, showRoles } = props;
  const isExpanded = expandedServices.has(service.id);
  const movements = service.movements && service.movements.length > 0 ? service.movements : [];
  const hasMultipleMovements = movements.length > 1;

  if (!hasMultipleMovements) {
    return renderServiceRow(service, isSelected, _rowIdx, props);
  }

  const rows: React.ReactNode[] = [];
  const firstMovement = movements[0];

  rows.push(
    <tr
      key={service.id}
      className={`transition-colors border-b-0 ${
        isServiceDimmed(service) ? 'bg-gray-50 opacity-60' :
        isSelected ? 'bg-primary/5' : 'hover:bg-surface-dim/50'
      }`}
    >
      <td className="px-2 py-2 w-8 align-top">
        <div className="flex flex-col items-center gap-1">
          {service.selectable !== false && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => props.onToggleRowSelection(service.id)}
              disabled={isServiceCompleted(service)}
              className={`rounded ${isServiceCompleted(service) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            />
          )}
          {hasMultipleMovements && (
            <button
              onClick={() => props.onToggleServiceExpand(service.id)}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse movements' : 'Expand movements'}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </td>
      <td className="px-2 py-2 align-top">
        <EditableCell
          rowId={service.id}
          field="vehicle"
          value={service.vehicle}
          isEditing={props.editingCell?.rowId === service.id && props.editingCell?.field === 'vehicle'}
          editValue={props.editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <td className="px-2 py-2 hidden lg:table-cell align-top">
        <VehicleTypeCell service={service} onUpdate={props.onVehicleTypeUpdate} />
      </td>
      <td className="px-2 py-2 hidden lg:table-cell align-top">
        <ServiceTypeCell service={service} onUpdate={props.onServiceTypeUpdate} />
      </td>
      <td className="px-2 py-2 align-top">
        <DriverCell service={service} dbDrivers={props.dbDrivers} onUpdate={props.onDriverUpdate} />
      </td>
      <td className="px-2 py-2 hidden lg:table-cell align-top">
        <EditableCell
          rowId={service.id}
          field="driverPhone"
          value={service.driverPhone}
          isEditing={props.editingCell?.rowId === service.id && props.editingCell?.field === 'driverPhone'}
          editValue={props.editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <td className="px-2 py-2 w-[60px] align-top">
        <span className="text-[11px] font-medium text-primary">{firstMovement.time || service.time || ''}</span>
      </td>
      <td className="px-2 py-2 max-w-[200px] align-top">
        <div className="text-[11px]">
          {firstMovement.passengers && firstMovement.passengers.length > 0
            ? firstMovement.passengers.map(p => p.name).filter(Boolean).join('; ')
            : passengerDisplay(service.passengers)}
        </div>
      </td>
      {showRoles && (
        <td className="px-2 py-2 text-on-surface-variant text-[11px] hidden xl:table-cell align-top">
          {firstMovement.passengers && firstMovement.passengers.length > 0
            ? firstMovement.passengers.map(p => p.role).filter(Boolean).join('; ')
            : hasPassengerRole(service.passengers) ? passengerRolesDisplay(service.passengers) : '-'}
        </td>
      )}
      <td className="px-2 py-2 max-w-[180px] hidden md:table-cell overflow-hidden align-top">
        <div className="flex items-center gap-1 min-w-0 text-[11px]">
          <span className="truncate">{firstMovement.pickupLines?.join('; ') || pickupDisplay(service.pickupLines)}</span>
          {service.pickupMapsUrl && (
            <a href={service.pickupMapsUrl} target="_blank" rel="noopener noreferrer" title="Open pickup in Maps" className="shrink-0 text-primary/60 hover:text-primary transition-colors">
              <MapPin className="w-3 h-3" />
            </a>
          )}
        </div>
      </td>
      <td className="px-2 py-2 max-w-[180px] hidden md:table-cell overflow-hidden align-top">
        <div className="flex items-center gap-1 min-w-0 text-[11px]">
          <span className="truncate">{firstMovement.dropoffLines?.join('; ') || dropoffDisplay(service.dropoffLines)}</span>
          {service.dropoffMapsUrl && (
            <a href={service.dropoffMapsUrl} target="_blank" rel="noopener noreferrer" title="Open dropoff in Maps" className="shrink-0 text-primary/60 hover:text-primary transition-colors">
              <MapPin className="w-3 h-3" />
            </a>
          )}
        </div>
      </td>
      <td className="px-2 py-2 align-top">
        <OperatingCompanyCell service={service} onUpdate={props.onOperatingCompanyUpdate} />
      </td>
      <td className="px-2 py-2 hidden xl:table-cell align-top">
        <span className="text-[11px]">{firstMovement.flightInfo || service.flightInfo || ''}</span>
      </td>
      <td className="px-2 py-2 hidden xl:table-cell align-top">
        <EditableCell
          rowId={service.id}
          field="notes"
          value={service.notes}
          isEditing={props.editingCell?.rowId === service.id && props.editingCell?.field === 'notes'}
          editValue={props.editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <td className="px-2 py-2 hidden 2xl:table-cell align-top">
        <EditableCell
          rowId={service.id}
          field="passengersList"
          value={service.passengersList}
          isEditing={props.editingCell?.rowId === service.id && props.editingCell?.field === 'passengersList'}
          editValue={props.editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <td className="px-2 py-2 hidden 2xl:table-cell align-top">
        <EditableCell
          rowId={service.id}
          field="originalTransportDate"
          value={service.originalTransportDate}
          isEditing={props.editingCell?.rowId === service.id && props.editingCell?.field === 'originalTransportDate'}
          editValue={props.editValue}
          onEditValueChange={props.onEditValueChange}
          onStartEdit={props.onStartEdit}
          onSave={props.onSaveEdit}
          onKeyDown={props.onEditKeyDown}
        />
      </td>
      <LifecycleActions
        service={service}
        lifecycleLoading={props.lifecycleLoading}
        onLifecycleTransition={props.onLifecycleTransition}
      />
    </tr>
  );

  if (isExpanded) {
    for (let m = 1; m < movements.length; m++) {
      const mov = movements[m];
      const prevMov = movements[m - 1];
      const timeChanged = mov.time && mov.time !== (prevMov?.time || firstMovement.time);
      rows.push(
        <tr
          key={service.id + '-mov-' + m}
          className={`transition-colors ${timeChanged ? 'border-t border-primary/20' : ''}`}
        >
          <td className="px-2 py-1.5 w-8"></td>
          <td className="px-2 py-1.5" colSpan={5}></td>
          <td className="px-2 py-1.5 w-[60px] align-top">
            {timeChanged && (
              <span className="text-[11px] font-medium text-primary">{mov.time}</span>
            )}
          </td>
          <td className="px-2 py-1.5 max-w-[200px] align-top">
            <div className="text-[11px]">
              {mov.passengers && mov.passengers.length > 0
                ? mov.passengers.map(p => p.name).filter(Boolean).join('; ')
                : ''}
            </div>
          </td>
          {showRoles && (
            <td className="px-2 py-1.5 text-on-surface-variant text-[11px] hidden xl:table-cell align-top">
              {mov.passengers && mov.passengers.length > 0
                ? mov.passengers.map(p => p.role).filter(Boolean).join('; ')
                : ''}
            </td>
          )}
          <td className="px-2 py-1.5 max-w-[180px] hidden md:table-cell overflow-hidden align-top">
            <div className="flex items-center gap-1 min-w-0 text-[11px]">
              <span className="truncate">{mov.pickupLines?.join('; ') || ''}</span>
            </div>
          </td>
          <td className="px-2 py-1.5 max-w-[180px] hidden md:table-cell overflow-hidden align-top">
            <div className="flex items-center gap-1 min-w-0 text-[11px]">
              <span className="truncate">{mov.dropoffLines?.join('; ') || ''}</span>
            </div>
          </td>
          <td className="px-2 py-1.5 align-top"></td>
          <td className="px-2 py-1.5 hidden xl:table-cell align-top">
            <span className="text-[11px]">{mov.flightInfo || ''}</span>
          </td>
          <td className="px-2 py-1.5 hidden xl:table-cell align-top"></td>
          <td className="px-2 py-1.5 hidden 2xl:table-cell align-top"></td>
          <td className="px-2 py-1.5 hidden 2xl:table-cell align-top"></td>
          <td className="px-2 py-1.5 w-[120px] align-top"></td>
        </tr>
      );
    }
  }

  return <React.Fragment key={service.id}>{rows}</React.Fragment>;
}

export default function ServiceTableRows(props: ServiceTableRowsProps) {
  const { filteredServices, selectedRows, viewMode } = props;

  const sectionMap = new Map<string, typeof filteredServices>();
  const noSection: typeof filteredServices = [];
  for (const svc of filteredServices) {
    const sec = svc.section || '';
    if (!sec) {
      noSection.push(svc);
    } else {
      if (!sectionMap.has(sec)) sectionMap.set(sec, []);
      sectionMap.get(sec)!.push(svc);
    }
  }

  const getSectionStyle = (name: string): string => {
    const upper = name.toUpperCase();
    if (upper.indexOf('ARRIVALS') > -1 || upper.indexOf('DEPARTURES') > -1) return 'bg-[#7ecfc0] text-black';
    if (upper === 'PUGLIA') return 'bg-[#a8d8ea] text-black';
    return 'bg-[#c6d44e] text-black';
  };

  const orderedGroups: { section: string; services: typeof services }[] = [];
  for (const [secName, secServices] of sectionMap) {
    orderedGroups.push({ section: secName, services: secServices });
  }
  if (noSection.length > 0) {
    orderedGroups.push({ section: '', services: noSection });
  }

  return (
    <div className="hidden md:block bg-surface-container-lowest rounded-lg border border-outline-variant">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-dim text-on-surface-variant text-[11px] font-medium border-b border-outline-variant uppercase tracking-wide">
              <th className="px-2 py-2 w-8">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredServices.filter(s => !isServiceCompleted(s)).length && filteredServices.filter(s => !isServiceCompleted(s)).length > 0}
                  onChange={props.onToggleAllSelection}
                  className="rounded cursor-pointer"
                />
              </th>
              <th className="px-2 py-2">Vehicle</th>
              <th className="px-2 py-2 hidden lg:table-cell">Vehicle Type</th>
              <th className="px-2 py-2 hidden lg:table-cell">Service Type</th>
              <th className="px-2 py-2">Driver</th>
              <th className="px-2 py-2 hidden lg:table-cell">Phone</th>
              <th className="px-2 py-2 w-[60px]">Time</th>
              <th className="px-2 py-2">Passengers</th>
              {props.showRoles && <th className="px-2 py-2 hidden xl:table-cell">Roles</th>}
              <th className="px-2 py-2 hidden md:table-cell">From</th>
              <th className="px-2 py-2 hidden md:table-cell">To</th>
              <th className="px-2 py-2">Company</th>
              <th className="px-2 py-2 hidden xl:table-cell">Flight</th>
              <th className="px-2 py-2 hidden xl:table-cell">Notes</th>
              <th className="px-2 py-2 hidden 2xl:table-cell">Pax List</th>
              <th className="px-2 py-2 hidden 2xl:table-cell">Orig. Date</th>
              <th className="px-2 py-2 w-[120px]">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[12px] text-on-surface divide-y divide-outline-variant/50">
            {orderedGroups.map((group) => (
              <React.Fragment key={group.section || 'nosection'}>
                {group.section && (
                  <tr>
                    <td colSpan={props.showRoles ? 17 : 16} className={`px-3 py-1 text-center text-[11px] font-bold ${getSectionStyle(group.section)}`} style={{ border: '1px solid #000' }}>
                      {group.section}
                    </td>
                  </tr>
                )}
                {group.services.map((service, idx) => viewMode === 'grouped'
                  ? renderServiceBlock(service, selectedRows.has(service.id), idx, props)
                  : renderServiceRow(service, selectedRows.has(service.id), idx, props)
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
