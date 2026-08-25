import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { 
  Service, ScreenId, ViewMode, 
  getWeekColumns, getMonthWeeks, getMonthName, formatDateKey,
  getHourSlots, parseTimeToHour, parseDateKeyToDate, formatTimeDisplay,
  getDriverAvatar, isProductionVehicle, getServiceStatusColor, getStatusDotColor, StatusColor, mapServiceDTOToService
} from '../types';
import ServiceWorkspace from './ServiceWorkspace';
import EditServiceModal from './EditServiceModal';
import DeleteCancelModal from './DeleteCancelModal';
import AdjustmentModal from './AdjustmentModal';
import BulkActionsToolbar from './BulkActionsToolbar';
import BulkAssignDriverModal from './BulkAssignDriverModal';
import DashboardHeader from './DashboardHeader';
import DayDetailView from './DayDetailView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import { LoadingSkeleton, EmptyDay } from './DashboardPlaceholders';
import { getDrivers, DriverRecord, getSettings, cerrarComercialmente, facturarService, cobrarService, closeService, deleteService, cancelService, adjustRevenue, adjustCost, completeService, reportService, assignDriver, approveFinancial, markFacturable, getOperatingCompanies, OperatingCompany, getVehicleTypes, confirmService, startService, validateService, moveToRevision } from '../services/api';

interface DashboardScreenProps {
  services: Service[];
  isLoading: boolean;
  baseDate: Date;
  onBaseDateChange: (date: Date) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
  onServiceUpdate?: (serviceId: string, updates: Partial<Service>) => void;
}

export default function DashboardScreen({ 
  services, isLoading, baseDate, onBaseDateChange, viewMode, onViewModeChange, onNavigate, onServiceUpdate 
}: DashboardScreenProps) {
  const [activeEntity, setActiveEntity] = useState<string>('All');
  const [companies, setCompanies] = useState<OperatingCompany[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteCancelService, setDeleteCancelService] = useState<Service | null>(null);
  const [deleteCancelMode, setDeleteCancelMode] = useState<'delete' | 'cancel'>('delete');
  const [adjustingService, setAdjustingService] = useState<Service | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'revenue' | 'cost'>('revenue');
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const lastTapMapRef = React.useRef<Map<string, number>>(new Map());
  const [isBulkCompleting, setIsBulkCompleting] = useState(false);
  const [sidePanelService, setSidePanelService] = useState<Service | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [dbDrivers, setDbDrivers] = useState<DriverRecord[]>([]);
  const [parametros, setParametros] = useState<{
    transfer: Record<string, number>;
    dispo: Record<string, { precioBase: number; horasBase: number; kmBase: number; extraHora: number; extraKM: number }>;
  } | null>(null);

  React.useEffect(() => {
    getOperatingCompanies().then(c => { if (Array.isArray(c)) setCompanies(c); }).catch(e => console.error('Failed to load operating companies:', e));
    getVehicleTypes().then(vt => setVehicleTypes(vt)).catch(() => {});
  }, []);

  React.useEffect(() => {
    getDrivers().then(drivers => {
      const raw = Array.isArray(drivers) ? drivers : [];
      const byId = new Map<string, typeof raw[0]>();
      const byName = new Map<string, typeof raw[0]>();
      raw.forEach(d => {
        const name = (d.name || '').trim();
        if (!name) return;
        const id = (d.id || '').trim();
        if (id && byId.has(id)) {
          const existing = byId.get(id)!;
          if (!existing.vehiclePreferred && d.vehiclePreferred) existing.vehiclePreferred = d.vehiclePreferred;
          if (!existing.phone && d.phone) existing.phone = d.phone;
          return;
        }
        byId.set(id || `gen-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, { ...d, name });
      });
      byId.forEach(d => {
        const key = d.name.toLowerCase().replace(/\s+/g, ' ').replace(/['']/g, "'").trim();
        if (byName.has(key)) {
          const existing = byName.get(key)!;
          if (!existing.phone && d.phone) existing.phone = d.phone;
          if (!existing.vehiclePreferred && d.vehiclePreferred) existing.vehiclePreferred = d.vehiclePreferred;
          return;
        }
        byName.set(key, d);
      });
      setDbDrivers(Array.from(byName.values()));
    }).catch(e => console.error('Failed to load drivers:', e));
    getSettings().then(s => {
      if (s && Object.keys(s).length > 0) {
        setParametros({
          transfer: {
            'VAN': Number(s['TransferVan']) || 45,
            'CAR': Number(s['TransferCar']) || 35,
            'AEROPUERTO': Number(s['TransferAirport']) || 55,
          },
          dispo: {
            'VAN': { precioBase: Number(s['DispoVanBase']) || 450, horasBase: Number(s['DispoVanHours']) || 8, kmBase: Number(s['DispoVanKm']) || 80, extraHora: Number(s['DispoVanExtraHour']) || 25, extraKM: Number(s['DispoVanExtraKm']) || 0.30 },
            'CAR': { precioBase: Number(s['DispoCarBase']) || 350, horasBase: Number(s['DispoCarHours']) || 8, kmBase: Number(s['DispoCarKm']) || 80, extraHora: Number(s['DispoCarExtraHour']) || 25, extraKM: Number(s['DispoCarExtraKm']) || 0.30 },
          },
        });
      }
    }).catch(e => console.error('Failed to load settings:', e));
  }, []);

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [driverFilter, setDriverFilter] = useState<string>('All');
  const [clientFilter, setClientFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const projectOptions = useMemo(() => {
    const projects = [...new Set(services.map(s => s.project).filter(Boolean))];
    return projects.sort();
  }, [services]);

  const driverOptions = useMemo(() => {
    const drivers = [...new Set(services.map(s => s.driverName).filter(Boolean))];
    return drivers.sort();
  }, [services]);

  const clientOptions = useMemo(() => {
    const clients = [...new Set(services.map(s => s.clientName).filter(Boolean))];
    return clients.sort();
  }, [services]);

  const statusOptions = useMemo(() => {
    const statuses = [...new Set(services.map(s => s.operationalStatus).filter(Boolean))];
    return statuses.sort();
  }, [services]);

  React.useEffect(() => {
    if (projectOptions.length > 0 && selectedProjects.length === 0) {
      setSelectedProjects([...projectOptions]);
    }
  }, [projectOptions]);

  const filteredServices = services.filter(service => {
    if (activeEntity !== 'All' && service.company !== activeEntity) return false;
    if (selectedProjects.length > 0 && !selectedProjects.includes(service.project)) return false;
    if (driverFilter !== 'All' && service.driverName !== driverFilter) return false;
    if (clientFilter !== 'All' && service.clientName !== clientFilter) return false;
    if (statusFilter !== 'All') {
      const effectiveStatus = service.operationalStatus === 'Importado' && service.driverId ? 'Asignado' : service.operationalStatus;
      if (effectiveStatus !== statusFilter) return false;
    }
    if (isProductionVehicle(service)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchable = [
        service.driverName, service.passengers, service.vehicleType,
        service.project, service.clientName, service.from, service.to,
        service.title
      ].filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  const toggleServiceSelection = useCallback((serviceId: string) => {
    setSelectedServiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) newSet.delete(serviceId);
      else newSet.add(serviceId);
      return newSet;
    });
  }, []);

  const selectAllVisibleServices = useCallback(() => {
    const visibleIds = filteredServices.map(s => s.id);
    setSelectedServiceIds(new Set(visibleIds));
  }, [filteredServices]);

  const clearSelection = useCallback(() => {
    setSelectedServiceIds(new Set());
  }, []);

  const markSelectedAsCompleted = useCallback(async () => {
    if (selectedServiceIds.size === 0) return;
    const allServices = [...services];
    const completableIds = Array.from(selectedServiceIds).filter(id => {
      const svc = allServices.find(s => s.id === id);
      return svc?.operationalStatus === 'EnRuta';
    });
    const skippedCount = selectedServiceIds.size - completableIds.length;
    if (completableIds.length === 0) {
      showToast('No services in "En Route" status. Services must be in EnRuta to be completed.', 'warning');
      return;
    }
    if (skippedCount > 0) {
      showToast(`Skipping ${skippedCount} service(s) not in "En Route" status`, 'warning');
    }
    setIsBulkCompleting(true);
    try {
      const promises = completableIds.map((serviceId: string) => completeService(serviceId));
      const results = await Promise.all(promises);
      const failures = results.filter(r => r?.error);
      if (failures.length > 0) {
        showToast(`${failures.length} of ${completableIds.length} services could not be completed: ${failures.map(f => f?.error).join(', ')}`, 'error');
      } else {
        showToast(`${completableIds.length} service(s) completed successfully`, 'success');
      }
      setSelectedServiceIds(new Set());
    } catch (error) {
      console.error('Failed to mark services as completed:', error);
      showToast('Failed to complete services: ' + (error as Error).message, 'error');
    } finally {
      setIsBulkCompleting(false);
    }
  }, [selectedServiceIds, services]);

  const handleBulkWorkflow = useCallback(async (action: string) => {
    if (selectedServiceIds.size === 0) return;
    const actionConfig: Record<string, { validStatuses: string[]; fn: (id: string) => Promise<any>; label: string }> = {
      confirm:  { validStatuses: ['Asignado'], fn: confirmService, label: 'Confirm' },
      start:    { validStatuses: ['Confirmado'], fn: startService, label: 'Start Route' },
      complete: { validStatuses: ['EnRuta'], fn: completeService, label: 'Complete' },
      report:   { validStatuses: ['Realizado'], fn: reportService, label: 'Report' },
      review:   { validStatuses: ['Reportado'], fn: moveToRevision, label: 'Send to Review' },
      validate: { validStatuses: ['Revision'], fn: validateService, label: 'Validate' },
    };
    const config = actionConfig[action];
    if (!config) return;
    const allSvcs = [...services];
    const eligibleIds = Array.from(selectedServiceIds).filter(id => {
      const svc = allSvcs.find(s => s.id === id);
      if (!svc) return false;
      if (config.validStatuses.includes(svc.operationalStatus)) return true;
      if (action === 'confirm' && svc.operationalStatus === 'Importado' && svc.driverId) return true;
      return false;
    });
    const skippedCount = selectedServiceIds.size - eligibleIds.length;
    if (eligibleIds.length === 0) {
      showToast(`No services eligible for "${config.label}"`, 'warning');
      return;
    }
    setIsBulkCompleting(true);
    try {
      const results = await Promise.all(eligibleIds.map(id => config.fn(id)));
      const failures = results.filter(r => r?.error);
      const successCount = eligibleIds.length - failures.length;
      if (failures.length > 0) {
        showToast(`${failures.length} failed: ${failures.map(f => f?.error).join('; ')}`, 'error');
      }
      if (successCount > 0) {
        showToast(`${successCount} service(s) ${config.label.toLowerCase()}d`, 'success');
        results.forEach((r: any) => {
          if (r?.id) {
            const updated = mapServiceDTOToService(r);
            onServiceUpdate?.(updated.id, updated);
          }
        });
      }
      if (skippedCount > 0) {
        showToast(`${skippedCount} skipped (wrong status)`, 'warning');
      }
      setSelectedServiceIds(new Set());
    } catch (error) {
      showToast('Failed: ' + (error as Error).message, 'error');
    } finally {
      setIsBulkCompleting(false);
    }
  }, [selectedServiceIds, services, onServiceUpdate, showToast]);

  const [showBulkDriverPicker, setShowBulkDriverPicker] = useState(false);
  const [bulkAssignDriverId, setBulkAssignDriverId] = useState('');
  const handleBulkAssignDriver = useCallback(async () => {
    if (!bulkAssignDriverId || selectedServiceIds.size === 0) return;
    const driver = dbDrivers.find(d => d.id === bulkAssignDriverId);
    if (!driver) return;
    setIsBulkCompleting(true);
    try {
      const results = await Promise.all(
        Array.from(selectedServiceIds).map(id => assignDriver(id, driver.id, driver.vehiclePreferred || ''))
      );
      const failures = results.filter(r => r?.error);
      const successCount = selectedServiceIds.size - failures.length;
      if (failures.length > 0) showToast(`${failures.length} failed`, 'error');
      if (successCount > 0) {
        showToast(`${successCount} driver(s) assigned to ${driver.name}`, 'success');
        results.forEach((r: any) => {
          if (r?.id) {
            const updated = mapServiceDTOToService(r);
            onServiceUpdate?.(updated.id, updated);
          }
        });
      }
      setSelectedServiceIds(new Set());
      setShowBulkDriverPicker(false);
      setBulkAssignDriverId('');
    } catch (error) {
      showToast('Failed: ' + (error as Error).message, 'error');
    } finally {
      setIsBulkCompleting(false);
    }
  }, [bulkAssignDriverId, selectedServiceIds, dbDrivers, onServiceUpdate, showToast]);

  const selectAllServicesForDay = useCallback((dateKey: string) => {
    const dayServices = filteredServices.filter(s => s.date === dateKey);
    setSelectedServiceIds(new Set(dayServices.map(s => s.id)));
  }, [filteredServices]);

  const handleWorkflowAction = useCallback(async (service: Service, action: string) => {
    if (action === 'assign') {
      setEditingService(service);
      setSidePanelService(null);
      return;
    }
    const apiMap: Record<string, () => Promise<any>> = {
      confirm: () => confirmService(service.id),
      start: () => startService(service.id),
      complete: () => completeService(service.id),
      report: () => reportService(service.id),
      review: () => moveToRevision(service.id),
      validate: () => validateService(service.id),
    };
    const fn = apiMap[action];
    if (!fn) return;
    try {
      const result = await fn();
      if (result?.error) {
        showToast(`Error: ${result.error}`, 'error');
      } else {
        showToast(`Service advanced to next status`, 'success');
        if (result?.id) {
          const updated = mapServiceDTOToService(result);
          onServiceUpdate?.(service.id, updated);
        }
      }
    } catch (err) {
      showToast(`Failed: ${(err as Error).message}`, 'error');
    }
  }, [onServiceUpdate, showToast]);

  const selectAllServicesForMonth = useCallback(() => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const monthServices = filteredServices.filter(s => {
      const d = s.date;
      const parts = d.split(' ');
      if (parts.length === 2) {
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthIdx = monthNames.indexOf(parts[0]);
        if (monthIdx === month) return true;
      }
      return false;
    });
    setSelectedServiceIds(new Set(monthServices.map(s => s.id)));
  }, [filteredServices, baseDate]);

  const handleDoubleClick = useCallback((service: Service) => {
    if (service.status === 'Completed') {
      showToast('This service is already completed. Completed services cannot be reverted to In Progress.', 'warning');
      return;
    }
    setEditingService(service);
  }, [parametros]);

  const handleCloseEdit = () => setEditingService(null);

  const handleOpenCancel = useCallback((service: Service) => {
    setDeleteCancelService(service);
    setDeleteCancelMode('cancel');
  }, []);

  const handleOpenDelete = useCallback((service: Service) => {
    setDeleteCancelService(service);
    setDeleteCancelMode('delete');
  }, []);

  const handleDeleteCancelConfirm = (serviceId: string, mode: 'delete' | 'cancel') => {
    if (mode === 'cancel') onServiceUpdate?.(serviceId, { operationalStatus: 'Cancelado' });
    else onServiceUpdate?.(serviceId, { status: 'Deleted' });
    setDeleteCancelService(null);
  };

  const handleOpenAdjustment = (service: Service, type: 'revenue' | 'cost') => {
    setAdjustingService(service);
    setAdjustmentType(type);
  };

  const handleAdjustmentConfirm = (serviceId: string, updates: Partial<Service>) => {
    onServiceUpdate?.(serviceId, updates);
    setAdjustingService(null);
  };

  const columns = useMemo(() => getWeekColumns(baseDate), [baseDate]);

  const completedDates = useMemo(() => {
    const terminal = new Set(['Realizado', 'Reportado', 'Revision', 'Validado', 'Cancelado']);
    const dateMap = new Map<string, { total: number; done: number }>();
    for (const s of filteredServices) {
      if (!s.date) continue;
      const prev = dateMap.get(s.date) || { total: 0, done: 0 };
      prev.total++;
      if (terminal.has(s.operationalStatus || '')) prev.done++;
      dateMap.set(s.date, prev);
    }
    const result = new Set<string>();
    for (const [date, { total, done }] of dateMap) {
      if (total > 0 && total === done) result.add(date);
    }
    return result;
  }, [filteredServices]);

  const dateRangeLabel = useMemo(() => {
    if (viewMode === 'month') return `${getMonthName(baseDate.getMonth())} ${baseDate.getFullYear()}`;
    if (columns.length === 0) return '';
    return `${columns[0].date} — ${columns[columns.length - 1].date}`;
  }, [columns, viewMode, baseDate]);

  const monthWeeks = useMemo(() => getMonthWeeks(baseDate.getFullYear(), baseDate.getMonth()), [baseDate]);
  const hourSlots = useMemo(() => getHourSlots(), []);

  const effectiveDay = useMemo(() => {
    if (selectedDay) return selectedDay;
    if (viewMode === 'day') return formatDateKey(baseDate);
    return null;
  }, [selectedDay, viewMode, baseDate]);

  const dayServices = useMemo(() => {
    if (!effectiveDay) return [];
    return filteredServices.filter(s => s.date === effectiveDay);
  }, [filteredServices, effectiveDay]);

  const layoutServices = useMemo(() => {
    if (dayServices.length === 0) return [];
    const blocks = dayServices.map(service => {
      const movements = service.movements || [];
      let startHour = parseTimeToHour(service.time);
      if (startHour < 0) startHour = 6;
      let endHour = startHour + 1;
      if (movements.length > 1) {
        const lastMovementTime = movements[movements.length - 1].time;
        const lastHour = parseTimeToHour(lastMovementTime);
        if (lastHour > startHour) endHour = lastHour + 1;
      } else {
        const timeStr = service.time instanceof Date
          ? `${String(service.time.getHours()).padStart(2, '0')}:${String(service.time.getMinutes()).padStart(2, '0')}`
          : String(service.time || '');
        const timeMatch = timeStr.match(/(\d{1,2})[:.]\d{2}\s*[-–]\s*(\d{1,2})[:.]\d{2}/);
        if (timeMatch) endHour = parseInt(timeMatch[2]);
      }
      return { service, start: Math.max(6, startHour), end: Math.min(23, Math.max(startHour + 1, endHour)) };
    }).filter(b => b.start < b.end).sort((a, b) => a.start - b.start);

    const columns: { end: number }[] = [];
    const assignments: { block: typeof blocks[0]; col: number }[] = [];
    for (const block of blocks) {
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        if (columns[col].end <= block.start) {
          columns[col].end = block.end;
          assignments.push({ block, col });
          placed = true;
          break;
        }
      }
      if (!placed) {
        assignments.push({ block, col: columns.length });
        columns.push({ end: block.end });
      }
    }
    const totalCols = columns.length;
    return assignments.map(({ block, col }) => ({ ...block, col, totalCols }));
  }, [dayServices]);

  const selectAllServicesForWeek = useCallback(() => {
    const weekDates = columns.map(c => c.date);
    const weekServices = filteredServices.filter(s => weekDates.includes(s.date));
    setSelectedServiceIds(new Set(weekServices.map(s => s.id)));
  }, [filteredServices, columns]);

  const toggleExpandedCard = useCallback((serviceId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      <DashboardHeader
        viewMode={viewMode}
        baseDate={baseDate}
        onBaseDateChange={onBaseDateChange}
        onViewModeChange={(mode) => { onViewModeChange(mode); setSelectedDay(null); }}
        onNavigate={onNavigate}
        dateRangeLabel={dateRangeLabel}
        companies={companies}
        driverOptions={driverOptions}
        statusOptions={statusOptions}
        activeEntity={activeEntity}
        driverFilter={driverFilter}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        onEntityChange={setActiveEntity}
        onDriverFilterChange={setDriverFilter}
        onStatusFilterChange={setStatusFilter}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? <LoadingSkeleton /> : (
          <>
            {viewMode === 'month' && (
              <MonthView
                baseDate={baseDate}
                filteredServices={filteredServices}
                completedDates={completedDates}
                onBaseDateChange={onBaseDateChange}
                onViewModeChange={onViewModeChange}
              />
            )}
            {viewMode === 'week' && selectedDay && (
              <DayDetailView
                effectiveDay={effectiveDay}
                selectedDay={selectedDay}
                dayServices={dayServices}
                layoutServices={layoutServices}
                selectedServiceIds={selectedServiceIds}
                toggleServiceSelection={toggleServiceSelection}
                selectAllServicesForDay={selectAllServicesForDay}
                setSelectedDay={setSelectedDay}
                handleDoubleClick={handleDoubleClick}
                setSidePanelService={setSidePanelService}
                lastTapMapRef={lastTapMapRef}
              />
            )}
            {viewMode === 'week' && !selectedDay && (
              <WeekView
                columns={columns}
                filteredServices={filteredServices}
                completedDates={completedDates}
                selectedServiceIds={selectedServiceIds}
                handleDoubleClick={handleDoubleClick}
                toggleServiceSelection={toggleServiceSelection}
                setSidePanelService={setSidePanelService}
              />
            )}
            {viewMode === 'day' && (
              <DayDetailView
                effectiveDay={effectiveDay}
                selectedDay={selectedDay}
                dayServices={dayServices}
                layoutServices={layoutServices}
                selectedServiceIds={selectedServiceIds}
                toggleServiceSelection={toggleServiceSelection}
                selectAllServicesForDay={selectAllServicesForDay}
                setSelectedDay={setSelectedDay}
                handleDoubleClick={handleDoubleClick}
                setSidePanelService={setSidePanelService}
                lastTapMapRef={lastTapMapRef}
              />
            )}
          </>
        )}
      </div>

      {sidePanelService && (
        <ServiceWorkspace
          service={sidePanelService}
          onClose={() => setSidePanelService(null)}
          onServiceUpdate={onServiceUpdate}
          onNavigate={onNavigate}
        />
      )}

      <EditServiceModal
        service={editingService}
        onClose={handleCloseEdit}
        onSave={onServiceUpdate || (() => {})}
        onDelete={handleOpenCancel}
        dbDrivers={dbDrivers}
        vehicleTypes={vehicleTypes}
        parametros={parametros}
      />

      <DeleteCancelModal
        service={deleteCancelService}
        mode={deleteCancelMode}
        onClose={() => setDeleteCancelService(null)}
        onConfirm={handleDeleteCancelConfirm}
      />

      <AdjustmentModal
        service={adjustingService}
        type={adjustmentType}
        onClose={() => setAdjustingService(null)}
        onConfirm={handleAdjustmentConfirm}
      />

      <BulkActionsToolbar
        selectedServiceIds={selectedServiceIds}
        services={services}
        onClearSelection={clearSelection}
        onBulkWorkflow={handleBulkWorkflow}
        onOpenBulkAssignDriver={() => setShowBulkDriverPicker(true)}
        isBulkCompleting={isBulkCompleting}
      />

      <BulkAssignDriverModal
        show={showBulkDriverPicker}
        onClose={() => setShowBulkDriverPicker(false)}
        selectedCount={selectedServiceIds.size}
        drivers={dbDrivers}
        bulkAssignDriverId={bulkAssignDriverId}
        onAssignDriverChange={setBulkAssignDriverId}
        onAssign={handleBulkAssignDriver}
        isAssigning={isBulkCompleting}
      />
    </div>
  );
}
