import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Plus, AlertCircle, AlertTriangle, ArrowRight, 
  ChevronLeft, ChevronRight, Clock, X, Save, Trash2, MessageSquare,
  ChevronDown, ChevronUp, Fuel, MapPin, DollarSign, Flag, Check, CheckCircle, Upload
} from 'lucide-react';
import { 
  Service, ScreenId, ViewMode, 
  getWeekColumns, getMonthWeeks, getMonthName, formatDateKey,
  getHourSlots, parseTimeToHour, parseDateKeyToDate, formatTimeDisplay,
  getDriverAvatar, isProductionVehicle, getServiceStatusColor, getStatusDotColor, StatusColor, mapServiceDTOToService
} from '../types';
import WhatsAppParser from './WhatsAppParser';
import { getDrivers, DriverRecord, getSettings, updateServiceField, cerrarComercialmente, facturarService, cobrarService, closeService, deleteService, cancelService, adjustRevenue, adjustCost, completeService, reportService, assignDriver, approveFinancial, markFacturable, getOperatingCompanies, OperatingCompany, getVehicleTypes, confirmService, startService, validateService, moveToRevision } from '../services/api';

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
  // State for active entity filter
  const [activeEntity, setActiveEntity] = useState<string>('All');
  const [companies, setCompanies] = useState<OperatingCompany[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    getOperatingCompanies().then(c => { if (Array.isArray(c)) setCompanies(c); }).catch(e => console.error('Failed to load operating companies:', e));
    getVehicleTypes().then(vt => setVehicleTypes(vt)).catch(() => {});
  }, []);
  
  // Selected day for detail view (null = show full week)
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Edit modal state
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState<Partial<Service>>({});

  // Cancel modal state
  const [cancellingService, setCancellingService] = useState<Service | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelMode, setCancelMode] = useState<'delete' | 'cancel'>('delete');

  // Adjustment modal state
  const [adjustingService, setAdjustingService] = useState<Service | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'revenue' | 'cost'>('revenue');
  const [adjustmentForm, setAdjustmentForm] = useState({
    description: '',
    amount: '',
  });

  // WhatsApp parser state
  const [showWhatsAppParser, setShowWhatsAppParser] = useState(false);

  // Cost change warning state
  const [costChangeWarning, setCostChangeWarning] = useState<{
    field: string;
    label: string;
    value: string;
  } | null>(null);

  // Bulk selection state
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const lastTapMapRef = React.useRef<Map<string, number>>(new Map());
  const [isBulkCompleting, setIsBulkCompleting] = useState(false);

  // Side panel state
  const [sidePanelService, setSidePanelService] = useState<Service | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Drivers database
  const [dbDrivers, setDbDrivers] = useState<DriverRecord[]>([]);

  // Production parameters (costs) — mapped from Settings key-value
  const [parametros, setParametros] = useState<{
    transfer: Record<string, number>;
    dispo: Record<string, { precioBase: number; horasBase: number; kmBase: number; extraHora: number; extraKM: number }>;
  } | null>(null);

  // Load drivers and params from API
  React.useEffect(() => {
    getDrivers().then(drivers => {
      const raw = Array.isArray(drivers) ? drivers : [];
      // Dedup by ID first, then by name
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
        // Map Settings key-value to parametros structure
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

  // Section collapse state for edit modal
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    basic: false,
    route: false,
    rapportino: true,
    costs: true,
    flags: true,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // State for advanced filters — MUST be before useMemo that uses them
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [driverFilter, setDriverFilter] = useState<string>('All');
  const [clientFilter, setClientFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Derive project options from actual data
  const projectOptions = useMemo(() => {
    const projects = [...new Set(services.map(s => s.project).filter(Boolean))];
    return projects.sort();
  }, [services]);

  // Derive filter options from actual data
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

  // Sync selectedProjects when projectOptions change
  React.useEffect(() => {
    if (projectOptions.length > 0 && selectedProjects.length === 0) {
      setSelectedProjects([...projectOptions]);
    }
  }, [projectOptions]);

  // Handle project filter pill toggle
  const toggleProject = (project: string) => {
    if (selectedProjects.includes(project)) {
      setSelectedProjects(selectedProjects.filter(p => p !== project));
    } else {
      setSelectedProjects([...selectedProjects, project]);
    }
  };

  // Apply filters
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
    // Search filter
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

  // --- Bulk selection functions (must be after filteredServices) ---
  const toggleServiceSelection = useCallback((serviceId: string) => {
    setSelectedServiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
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
      const promises = completableIds.map((serviceId: string) => 
        completeService(serviceId)
      );
      
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

  // Bulk workflow action — advance all eligible selected services through a stage
  const handleBulkWorkflow = useCallback(async (action: string) => {
    if (selectedServiceIds.size === 0) return;
    
    const actionConfig: Record<string, { validStatuses: string[]; fn: (id: string) => Promise<any>; label: string }> = {
      confirm:  { validStatuses: ['Asignado'], fn: confirmService, label: 'Confirm' },
      start:    { validStatuses: ['Confirmado'], fn: startService, label: 'Start Route' },
      complete: { validStatuses: ['EnRuta'], fn: completeService, label: 'Complete' },
      report:   { validStatuses: ['Realizado'], fn: reportService, label: 'Report' },
      review:   { validStatuses: ['Reportado'], fn: moveToRevision, label: 'Send to Review' },
      validate: { validStatuses: ['Reportado', 'Revision'], fn: validateService, label: 'Validate' },
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

  // Bulk assign driver to selected services without one
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

  // Select all services for a specific day
  const selectAllServicesForDay = useCallback((dateKey: string) => {
    const dayServices = filteredServices.filter(s => s.date === dateKey);
    setSelectedServiceIds(new Set(dayServices.map(s => s.id)));
  }, [filteredServices]);

  // Workflow action handler — advances service through operational status machine
  const handleWorkflowAction = useCallback(async (service: Service, action: string) => {
    if (action === 'assign') {
      // Open Edit modal for driver assignment — populate form first
      setEditForm({
        title: service.title,
        time: service.time,
        status: service.status,
        driverName: service.driverName,
        driverPhone: service.driverPhone || '',
        passengers: service.passengers || '',
        project: service.project,
        company: service.company,
        clientName: service.clientName || '',
        vehicleType: service.vehicleType || '',
        vehiclePlate: service.vehiclePlate || '',
        location: service.location,
        from: service.from || '',
        to: service.to || '',
        flightInfo: service.flightInfo || '',
        notes: service.notes || '',
        movements: service.movements || [],
        serviceType: service.serviceType || '',
      });
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

  // Select all services for the current month
  const selectAllServicesForMonth = useCallback(() => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const monthServices = filteredServices.filter(s => {
      const d = s.date;
      // Parse date key to check if it's in the current month
      const parts = d.split(' ');
      if (parts.length === 2) {
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthIdx = monthNames.indexOf(parts[0]);
        if (monthIdx === month) {
          return true;
        }
      }
      return false;
    });
    setSelectedServiceIds(new Set(monthServices.map(s => s.id)));
  }, [filteredServices, baseDate]);

  // --- Navigation ---
  const goToPrev = () => {
    if (viewMode === 'day') {
      const prev = new Date(baseDate);
      prev.setDate(prev.getDate() - 1);
      onBaseDateChange(prev);
    } else if (viewMode === 'week') {
      const prev = new Date(baseDate);
      prev.setDate(prev.getDate() - 7);
      onBaseDateChange(prev);
    } else {
      const prev = new Date(baseDate);
      prev.setMonth(prev.getMonth() - 1);
      onBaseDateChange(prev);
    }
  };

  const goToNext = () => {
    if (viewMode === 'day') {
      const next = new Date(baseDate);
      next.setDate(next.getDate() + 1);
      onBaseDateChange(next);
    } else if (viewMode === 'week') {
      const next = new Date(baseDate);
      next.setDate(next.getDate() + 7);
      onBaseDateChange(next);
    } else {
      const next = new Date(baseDate);
      next.setMonth(next.getMonth() + 1);
      onBaseDateChange(next);
    }
  };

  const goToToday = () => {
    onBaseDateChange(new Date());
    setSelectedDay(null);
  };

  // --- Edit service ---
  const handleDoubleClick = useCallback((service: Service) => {
    // Completed services cannot be reverted — state machine is forward-only
    if (service.status === 'Completed') {
      showToast('This service is already completed. Completed services cannot be reverted to In Progress.', 'warning');
      return;
    }
    
    // Pre-fill costs from parametros if service has a vehicleType matching a Dispo
    let preFilledCosts: Partial<Service> = {};
    if (parametros) {
      const vt = (service.vehicleType || '').toUpperCase();
      const isDispo = vt.includes('DISPO');
      const isTransfer = vt.includes('TRANSFER');
      
      if (isDispo && parametros.dispo) {
        const dispoKey = Object.keys(parametros.dispo).find(k => vt.includes(k.replace('DISPO', '').trim())) || Object.keys(parametros.dispo)[0];
        const dispo = dispoKey ? parametros.dispo[dispoKey] : null;
        if (dispo) {
          preFilledCosts = {
            baseCost: dispo.precioBase,
            kmCost: dispo.extraKM,
            overtimeCost: dispo.extraHora,
          };
        }
      } else if (isTransfer && parametros.transfer) {
        const transferKey = Object.keys(parametros.transfer).find(k => vt.includes(k.replace('TRANSFER', '').replace('AEROPUERTO', '').replace('CITY', '').trim())) || Object.keys(parametros.transfer)[0];
        if (transferKey) {
          preFilledCosts = {
            baseCost: parametros.transfer[transferKey],
          };
        }
      }
    }

    setEditingService(service);
    setEditForm({
      // Basic
      title: service.title,
      time: service.time,
      status: service.status,
      driverName: service.driverName,
      driverPhone: service.driverPhone || '',
      passengers: service.passengers || '',
      project: service.project,
      company: service.company,
      clientName: service.clientName || '',
      // Vehicle
      vehicleType: service.vehicleType || '',
      vehiclePlate: service.vehiclePlate || '',
      // Route
      location: service.location,
      from: service.from || '',
      to: service.to || '',
      flightInfo: service.flightInfo || '',
      routeDescription: service.routeDescription || '',
      // Rapportino
      startTime: service.startTime || '',
      endTime: service.endTime || '',
      km: service.km,
      overtimeBefore: service.overtimeBefore,
      overtimeAfter: service.overtimeAfter,
      overtimeHours: service.overtimeHours,
      // Costs — pre-fill from parametros if service has no costs yet
      baseCost: service.baseCost ?? preFilledCosts.baseCost,
      overtimeCost: service.overtimeCost ?? preFilledCosts.overtimeCost,
      kmCost: service.kmCost ?? preFilledCosts.kmCost,
      diariaCost: service.diariaCost,
      notturnoCost: service.notturnoCost,
      totalCost: service.totalCost,
      // Flags
      isFestivo: service.isFestivo || false,
      isNotturno: service.isNotturno || false,
      hasDiaria: service.hasDiaria || false,
      // PO
      po: service.po || '',
      // Notes
      notes: service.notes || '',
      cancelReason: service.cancelReason || '',
      // Structured movements (per-route data)
      movements: service.movements || [],
      // Track which costs came from parametros
      _costsFromParametros: {
        baseCost: service.baseCost == null && preFilledCosts.baseCost != null,
        overtimeCost: service.overtimeCost == null && preFilledCosts.overtimeCost != null,
        kmCost: service.kmCost == null && preFilledCosts.kmCost != null,
      },
    });
  }, [parametros]);

  const handleSaveEdit = async () => {
    if (!editingService) return;
    
    try {
      // Field mapping: DashboardScreen field → Service entity field
      // Only fields that exist on the Service entity can be persisted
      const fieldMap: Record<string, { field: string; mapper?: (value: any) => any }> = {
        from: { field: 'PickupLines', mapper: (v: string) => v ? [v] : [] },
        to: { field: 'DropoffLines', mapper: (v: string) => v ? [v] : [] },
        time: { field: 'Time' },
        passengers: { field: 'PassengerName' },
        notes: { field: 'Notes' },
        flightInfo: { field: 'FlightInfo' },
        startTime: { field: 'StartTime' },
        endTime: { field: 'EndTime' },
        km: { field: 'KmTotal', mapper: (v: string) => parseFloat(v) || 0 },
        diariaType: { field: 'DiariaType' },
        vehicleType: { field: 'VehicleType' },
        movements: { field: 'Movements', mapper: (v: any[]) => JSON.stringify(v || []) },
        // NOTE: status/OperationalStatus is NOT editable via updateServiceField.
        // State changes MUST go through Commands (assignDriver, confirmService, etc.)
        // NOTE: DriverID/VehicleID are NOT here — assignment MUST go through assignDriver()
        // which handles ProviderType, ProviderID, Driver.Status side effects.
      };

      // NOTE: Cost fields (baseCost, overtimeCost, kmCost) are frontend-calculated
      // from ServiceCostBreakdown. They cannot be directly saved via updateServiceField.
      // Use the "+ Cost" adjustment button to modify costs via adjustCost API.
      // The cost fields in the edit form are pre-filled from parametros for reference.

      // Handle driver assignment separately via assignDriver command
      if (editForm.driverName) {
        const driver = dbDrivers.find(d => d.name === editForm.driverName);
        if (driver) {
          try {
            const assignResult = await assignDriver(editingService.id, driver.id, driver.vehiclePreferred || '');
            if (assignResult?.error) {
              console.error('Failed to assign driver:', assignResult.error);
            }
          } catch (err) {
            console.error('Failed to assign driver:', err);
          }
        }
      }

      // Update each mapped field via updateServiceField
      const promises: Promise<any>[] = [];
      const failedFields: string[] = [];
      
      for (const [dashField, value] of Object.entries(editForm)) {
        if (value === undefined || dashField === 'driverName') continue; // Skip driverName (handled above)
        const mapping = fieldMap[dashField];
        if (!mapping) continue; // Skip unmapped fields (costs are frontend-calculated)
        
        const entityValue = mapping.mapper ? mapping.mapper(value) : value;
        promises.push(
          updateServiceField(editingService.id, mapping.field, entityValue).then(result => {
            if (result.error) {
              failedFields.push(mapping.field);
              console.error(`Failed to update ${mapping.field}: ${result.error}`);
            }
          }).catch(err => {
            failedFields.push(mapping.field);
            console.error(`Failed to update ${mapping.field}:`, err);
          })
        );
      }
      
      await Promise.all(promises);
      
      if (failedFields.length > 0) {
        showToast('Some fields could not be saved: ' + failedFields.join(', '), 'warning');
        // Do NOT update local state if any fields failed — keep UI in sync with backend
      } else {
        onServiceUpdate?.(editingService.id, editForm);
      }
      
      // Close modal
      setEditingService(null);
      setEditForm({});
    } catch (error) {
      console.error('Failed to save edit:', error);
      showToast('Failed to save changes. Please try again.', 'error');
    }
  };

  const handleCloseEdit = () => {
    setEditingService(null);
    setEditForm({});
  };

  // Handle cost field change with warning for pre-filled values
  const handleCostChange = (field: string, value: string) => {
    const costsFromParam = editForm._costsFromParametros;
    if (costsFromParam && costsFromParam[field]) {
      // This cost was pre-filled from parametros — warn user
      const labels: Record<string, string> = {
        baseCost: 'Base Cost',
        overtimeCost: 'Overtime Cost',
        kmCost: 'KM Cost',
      };
      setCostChangeWarning({
        field,
        label: labels[field] || field,
        value,
      });
      return;
    }
    // Not from parametros — apply directly
    setEditForm(prev => ({ ...prev, [field]: parseFloat(value) || undefined }));
  };

  const confirmCostChange = () => {
    if (!costChangeWarning) return;
    setEditForm(prev => ({
      ...prev,
      [costChangeWarning.field]: parseFloat(costChangeWarning.value) || undefined,
      _costsFromParametros: {
        ...(prev._costsFromParametros || {}),
        [costChangeWarning.field]: false,
      },
    }));
    setCostChangeWarning(null);
  };

  const cancelCostChange = () => {
    setCostChangeWarning(null);
  };

  // --- Delete service (only for Importado/Asignado — before confirmation) ---
  const handleOpenDelete = useCallback((service: Service) => {
    setCancellingService(service);
    setCancelReason('');
    setCancelMode('delete');
  }, []);

  const handleConfirmDelete = async () => {
    if (!cancellingService) return;
    try {
      const serviceId = cancellingService.backendId || cancellingService.id;
      const result = await deleteService(serviceId, cancelReason.trim() || undefined);
      if (result.error) {
        showToast('Error deleting service: ' + result.error, 'error');
        return;
      }
      // Remove from local state
      onServiceUpdate?.(cancellingService.id, { status: 'Deleted' });
    } catch (err) {
      showToast('Error deleting service: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setCancellingService(null);
      setCancelReason('');
    }
  };

  const handleCloseDelete = () => {
    setCancellingService(null);
    setCancelReason('');
  };

  // Cancel is an alias for delete — opens same modal with reason required
  const handleOpenCancel = useCallback((service: Service) => {
    setCancellingService(service);
    setCancelReason('');
    setCancelMode('cancel');
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancellingService || !cancelReason.trim()) return;
    try {
      const serviceId = cancellingService.backendId || cancellingService.id;
      const result = await cancelService(serviceId, cancelReason.trim());
      if (result.error) {
        showToast('Error cancelling service: ' + result.error, 'error');
        return;
      }
      // Mark as cancelled in local state
      onServiceUpdate?.(cancellingService.id, { operationalStatus: 'Cancelado' });
    } catch (err) {
      showToast('Error cancelling service: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setCancellingService(null);
      setCancelReason('');
    }
  };

  const handleCloseCancel = () => {
    setCancellingService(null);
    setCancelReason('');
  };

  // --- Adjustment handlers ---
  const handleOpenAdjustment = (service: Service, type: 'revenue' | 'cost') => {
    setAdjustingService(service);
    setAdjustmentType(type);
    setAdjustmentForm({ description: '', amount: '' });
  };

  const handleConfirmAdjustment = async () => {
    if (!adjustingService || !adjustmentForm.amount || parseFloat(adjustmentForm.amount) <= 0) return;
    try {
      const serviceId = adjustingService.backendId || adjustingService.id;
      const amount = parseFloat(adjustmentForm.amount);
      let result;
      if (adjustmentType === 'revenue') {
        result = await adjustRevenue(serviceId, {
          description: adjustmentForm.description || 'Manual revenue adjustment',
          amount,
        });
      } else {
        result = await adjustCost(serviceId, {
          description: adjustmentForm.description || 'Manual cost adjustment',
          amount,
        });
      }
      if (result.error) {
        showToast('Error: ' + result.error, 'error');
        return;
      }
      showToast(`${adjustmentType === 'revenue' ? 'Revenue' : 'Cost'} adjustment of ${amount} saved.`, 'success');
    } catch (err) {
      showToast('Error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setAdjustingService(null);
      setAdjustmentForm({ description: '', amount: '' });
    }
  };

  const handleCloseAdjustment = () => {
    setAdjustingService(null);
    setAdjustmentForm({ description: '', amount: '' });
  };

  // --- Data computations ---
  const columns = useMemo(() => getWeekColumns(baseDate), [baseDate]);
  const isTodayVisible = useMemo(() => columns.some(c => c.isToday), [columns]);

  // Compute which dates have ALL services completed/validated/cancelled (no pending work)
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
    if (viewMode === 'month') {
      return `${getMonthName(baseDate.getMonth())} ${baseDate.getFullYear()}`;
    }
    if (columns.length === 0) return '';
    return `${columns[0].date} — ${columns[columns.length - 1].date}`;
  }, [columns, viewMode, baseDate]);

  // Month weeks
  const monthWeeks = useMemo(() => {
    return getMonthWeeks(baseDate.getFullYear(), baseDate.getMonth());
  }, [baseDate]);

  // Hour slots for day view
  const hourSlots = useMemo(() => getHourSlots(), []);

  // Effective day for day view: either selectedDay (from week click) or baseDate (from Day toggle)
  const effectiveDay = useMemo(() => {
    if (selectedDay) return selectedDay;
    if (viewMode === 'day') return formatDateKey(baseDate);
    return null;
  }, [selectedDay, viewMode, baseDate]);

  // Services for selected day (day detail view)
  const dayServices = useMemo(() => {
    if (!effectiveDay) return [];
    return filteredServices.filter(s => s.date === effectiveDay);
  }, [filteredServices, effectiveDay]);

  // Layout services with collision detection for day view
  const layoutServices = useMemo(() => {
    if (dayServices.length === 0) return [];
    
    // Parse each service into time blocks
    const blocks = dayServices.map(service => {
      // Use movements for multi-route positioning if available
      const movements = service.movements || [];
      let startHour = parseTimeToHour(service.time);
      if (startHour < 0) startHour = 6;
      
      // Calculate end hour from last movement or default to start+1
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
      
      return {
        service,
        start: Math.max(6, startHour),
        end: Math.min(23, Math.max(startHour + 1, endHour)),
      };
    }).filter(b => b.start < b.end).sort((a, b) => a.start - b.start);
    
    // Assign columns using greedy algorithm
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
    return assignments.map(({ block, col }) => ({
      ...block,
      col,
      totalCols,
    }));
  }, [dayServices]);

  // Select all services for the current week
  const selectAllServicesForWeek = useCallback(() => {
    const weekDates = columns.map(c => c.date);
    const weekServices = filteredServices.filter(s => weekDates.includes(s.date));
    setSelectedServiceIds(new Set(weekServices.map(s => s.id)));
  }, [filteredServices, columns]);

  // Toggle card expand/collapse
  const toggleExpandedCard = useCallback((serviceId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  }, []);

  // --- Service Card Component (Ultra-compact, mockup style) ---
  const ServiceCard: React.FC<{ 
    service: Service; 
    onDoubleClick?: (s: Service) => void;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    onClickSidePanel?: (s: Service) => void;
    compact?: boolean;
  }> = ({ service, onDoubleClick, isSelected = false, onSelect, onClickSidePanel, compact = false }) => {
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
  };

  // --- Side Panel / Drawer (mockup style) ---
  const SidePanel = () => {
    const service = sidePanelService;
    if (!service) return null;

    const statusColor = getServiceStatusColor(service);
    const movements = service.movements || [];
    const isProduction = isProductionVehicle(service);

    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dateObj = parseDateKeyToDate(service.date);
    const displayDate = dateObj ? `${dayNames[dateObj.getDay()]}, ${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}` : service.date;

    return (
      <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSidePanelService(null)}>
        <div className="absolute inset-0 bg-black/20" />
        <div
          className="relative bg-surface-container-lowest w-full sm:w-[360px] h-full shadow-[-4px_0_24px_rgba(0,0,0,0.08)] flex flex-col animate-slide-in-right border-l border-outline-variant/30"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Service Details</span>
              <button onClick={() => setSidePanelService(null)} className="p-1 rounded-md hover:bg-surface-dim">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[13px] font-bold text-primary shrink-0">
                {service.driverName?.charAt(0) || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-on-surface truncate">{service.driverName || 'Unassigned'}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-on-surface-variant">
                    {service.serviceType ? `${service.serviceType.replace('Transfer ', 'T.').replace('Disposizione', 'Dispo')} · ` : ''}{service.vehicleType || '—'}
                  </span>
                  <span className="text-on-surface-variant/30">·</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-px rounded-full" style={{ backgroundColor: `${statusColor.hex}15`, color: statusColor.hex }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor.hex }} />
                    {statusColor.label}
                  </span>
                </div>
              </div>
            </div>
            {service.project && service.project !== 'Unknown' && (
              <div className="mt-2 text-[11px] text-on-surface-variant truncate">{service.project}</div>
            )}
          </div>

          <div className="h-px bg-outline-variant/40 mx-5" />

          {/* Service Information */}
          <div className="px-5 py-4 shrink-0">
            <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Service Information</span>
            <div className="mt-2.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-on-surface-variant">Date</span>
                <span className="text-[12px] text-on-surface font-medium">{displayDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-on-surface-variant">Driver</span>
                <span className="text-[12px] text-on-surface font-medium">{service.driverName || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-on-surface-variant">Vehicle</span>
                <span className="text-[12px] text-on-surface font-medium">{service.vehicleType || '—'}</span>
              </div>
              {service.serviceType && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-on-surface-variant">Service Type</span>
                  <span className="text-[12px] text-on-surface font-medium">{service.serviceType}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-on-surface-variant">Company</span>
                <span className="text-[12px] text-on-surface font-medium truncate max-w-[200px] text-right">{service.company || '—'}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-outline-variant/40 mx-5" />

          {/* Schedules */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
                Schedules {movements.length > 0 && `(${movements.length})`}
              </span>
              <button className="text-[11px] text-primary font-medium hover:underline cursor-pointer">+ Add schedule</button>
            </div>

            {movements.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                {movements.length > 1 && (
                  <div className="absolute left-[5px] top-[7px] bottom-[7px] w-px bg-outline-variant/50" />
                )}
                {movements.map((m, idx) => {
                  const pax = m.passengers?.map(p => p.name).join(', ') || '';
                  const from = m.pickupLines?.[0] || '';
                  const to = m.dropoffLines?.[0] || '';
                  const isLast = idx === movements.length - 1;
                  return (
                    <div key={idx} className={`flex gap-3 items-start ${!isLast ? 'pb-4' : ''}`}>
                      {/* Timeline dot */}
                      <div className="relative z-10 shrink-0 mt-[5px]">
                        <div className="w-[11px] h-[11px] rounded-full border-2 border-surface-container-lowest" style={{ backgroundColor: statusColor.hex }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-on-surface tabular-nums">{formatTimeDisplay(m.time)}</span>
                          {from && <span className="text-[10px] font-medium text-primary/70 bg-primary/5 px-1.5 py-px rounded">Pickup</span>}
                          {to && !from && <span className="text-[10px] font-medium text-on-surface-variant/60 bg-surface-container px-1.5 py-px rounded">Drop-off</span>}
                        </div>
                        {(from || to) && (
                          <div className="text-[12px] text-on-surface mt-0.5 truncate">{from || to}</div>
                        )}
                        {from && to && (
                          <div className="text-[11px] text-on-surface-variant/60 mt-0.5">↓</div>
                        )}
                        {from && to && (
                          <>
                            <div className="text-[12px] text-on-surface mt-0.5 truncate">{to}</div>
                            <span className="text-[10px] font-medium text-on-surface-variant/60 bg-surface-container px-1.5 py-px rounded inline-block mt-0.5">Drop-off</span>
                          </>
                        )}
                        {pax && <div className="text-[11px] text-on-surface-variant mt-1 truncate">{pax}</div>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant/30 shrink-0 mt-[5px]" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[12px] text-on-surface-variant/50 py-4 text-center">No schedule data</div>
            )}
          </div>

          <div className="h-px bg-outline-variant/40 mx-5" />

          {/* Workflow Actions */}
          {(() => {
            const workflowButtons: Record<string, { label: string; icon: React.ReactNode; action: string; color: string }[]> = {
              Importado:  [{ label: 'Assign Driver', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>, action: 'assign', color: 'bg-blue-500 hover:bg-blue-600' }],
              Asignado:   [{ label: 'Confirm Service', icon: <Check className="w-3.5 h-3.5" />, action: 'confirm', color: 'bg-cyan-500 hover:bg-cyan-600' }],
              Confirmado: [{ label: 'Start Route', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, action: 'start', color: 'bg-blue-600 hover:bg-blue-700' }],
              EnRuta:     [{ label: 'Complete', icon: <CheckCircle className="w-3.5 h-3.5" />, action: 'complete', color: 'bg-green-600 hover:bg-green-700' }],
              Realizado:  [{ label: 'Send Report', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>, action: 'report', color: 'bg-amber-500 hover:bg-amber-600' }],
              Reportado:  [{ label: 'Send to Review', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>, action: 'review', color: 'bg-amber-500 hover:bg-amber-600' }, { label: 'Validate', icon: <CheckCircle className="w-3.5 h-3.5" />, action: 'validate', color: 'bg-green-700 hover:bg-green-800' }],
              Revision:   [{ label: 'Validate', icon: <CheckCircle className="w-3.5 h-3.5" />, action: 'validate', color: 'bg-green-700 hover:bg-green-800' }],
            };
            const buttons = service.operationalStatus === 'Importado' && service.driverId
              ? workflowButtons['Asignado'] || []
              : workflowButtons[service.operationalStatus] || [];
            if (buttons.length === 0) return null;
            return (
              <div className="px-5 py-3 shrink-0">
                <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Workflow</span>
                <div className="flex gap-2 mt-2">
                  {buttons.map((btn) => (
                    <button key={btn.action}
                      onClick={() => { handleWorkflowAction(service, btn.action); setSidePanelService(null); }}
                      className={`flex items-center gap-1.5 px-3 py-2 text-on-primary text-[12px] font-medium rounded-lg transition-colors cursor-pointer ${btn.color}`}>
                      {btn.icon}
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="h-px bg-outline-variant/40 mx-5" />

          {/* Actions */}
          <div className="px-5 py-4 shrink-0 flex gap-2">
            <button onClick={() => {
              setEditingService(service);
              setEditForm({
                title: service.title,
                time: service.time,
                status: service.status,
                driverName: service.driverName,
                driverPhone: service.driverPhone || '',
                passengers: service.passengers || '',
                project: service.project,
                company: service.company,
                clientName: service.clientName || '',
                vehicleType: service.vehicleType || '',
                vehiclePlate: service.vehiclePlate || '',
                location: service.location,
                from: service.from || '',
                to: service.to || '',
                flightInfo: service.flightInfo || '',
                routeDescription: service.routeDescription || '',
                startTime: service.startTime || '',
                endTime: service.endTime || '',
                km: service.km,
                notes: service.notes || '',
                movements: service.movements || [],
                serviceType: service.serviceType || '',
              });
              setSidePanelService(null);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Service
            </button>
            <button onClick={() => { handleOpenCancel(service); setSidePanelService(null); }}
              className="px-3 py-2 border border-outline-variant text-on-surface-variant text-[12px] font-medium rounded-lg hover:bg-surface-dim transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Empty Day Placeholder ---
  const EmptyDay = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex flex-col items-center justify-center p-4 border border-dashed border-outline-variant rounded-lg text-center gap-2 bg-surface-dim/30 min-h-[100px]">
      <AlertCircle className="w-5 h-5 text-outline" />
      <span className="text-[12px] text-on-surface-variant">No services</span>
      {onClick && (
        <button onClick={onClick} className="text-primary text-[12px] font-medium hover:underline cursor-pointer flex items-center gap-1">
          Add <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  // --- Loading Skeleton ---
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-outline-variant/30 p-3 space-y-3 animate-pulse">
          <div className="h-4 bg-surface-dim rounded w-2/3" />
          <div className="h-3 bg-surface-dim rounded w-1/2" />
          <div className="space-y-2">
            <div className="h-16 bg-surface-dim rounded-lg" />
            <div className="h-16 bg-surface-dim rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );

  // ============================================
  // RENDER: Month View
  // ============================================
  const renderMonthView = () => (
    <div className="flex flex-col gap-4 p-5">
      {/* Month grid: 7 columns, rows = weeks */}
      <div className="grid grid-cols-7 gap-px bg-outline-variant/15 rounded-lg overflow-hidden">
        {/* Day headers */}
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="text-[10px] font-medium text-on-surface-variant/50 py-2 text-center bg-surface-container-lowest uppercase tracking-wider">{d}</div>
        ))}
        
        {/* Calendar cells */}
        {(() => {
          const year = baseDate.getFullYear();
          const month = baseDate.getMonth();
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year + 1, 0, 0);
          const firstDow = firstDay.getDay();
          const mondayOffset = firstDow === 0 ? -6 : 1 - firstDow;
          
          const cells: React.ReactNode[] = [];
          const startDate = new Date(year, month, 1 + mondayOffset);
          const today = new Date();
          const todayKey = formatDateKey(today);
          
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
          return cells;
        })()}
      </div>
    </div>
  );

  // ============================================
  // RENDER: Day Detail View (with hour guides)
  // ============================================
  const renderDayDetail = () => {
    if (!effectiveDay) return null;
    
    // Parse date for display
    const dateObj = parseDateKeyToDate(effectiveDay);
    const dayOfWeek = dateObj ? dateObj.getDay() : 0;
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const displayDate = dateObj ? `${dayNames[dayOfWeek]}, ${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}` : effectiveDay;
    
    return (
      <div className="flex flex-col gap-3 pb-4">
        {/* Day header */}
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

        {/* Hour grid */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden mx-5">
          <div className="flex">
            {/* Time column */}
            <div className="w-12 shrink-0 border-r border-outline-variant/20">
              {hourSlots.map(slot => (
                <div key={slot.hour} className="h-[72px] flex items-start justify-end pr-2 pt-0.5">
                  <span className="text-[10px] text-on-surface-variant/40 font-medium tabular-nums">{slot.label}</span>
                </div>
              ))}
            </div>
            
            {/* Services column */}
            <div className="flex-1 relative">
              {/* Hour lines - ultra subtle */}
              {hourSlots.map(slot => (
                <div key={slot.hour} className="h-[72px] border-b border-outline-variant/15" />
              ))}
              
              {/* Service blocks with collision handling */}
              <AnimatePresence>
              {layoutServices.map(({ service, start, end, col, totalCols }, idx) => {
                const HOUR_HEIGHT = 72; // px per hour
                const topOffset = (start - 6) * HOUR_HEIGHT;
                const height = (end - start) * HOUR_HEIGHT - 3; // 3px gap between blocks
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
                    {/* Checkbox for bulk selection - bottom right */}
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
                      {/* Render movements as sub-routes */}
                      {(() => {
                        const movements = service.movements || [];
                        if (movements.length > 1) {
                          const totalHours = end - start;
                          const CARD_HEIGHT = totalHours * HOUR_HEIGHT - 3;
                          const HEADER_HEIGHT = 22;
                          const availableHeight = CARD_HEIGHT - HEADER_HEIGHT;
                          
                          return (
                            <div className="relative" style={{ minHeight: `${availableHeight}px` }}>
                              {/* Vertical connecting line */}
                              <div className="absolute left-[4px] top-[6px] bottom-[6px] w-px bg-outline-variant/30" />
                              {movements.map((m, mi) => {
                                const from = m.pickupLines?.[0] || '';
                                const to = m.dropoffLines?.[0] || '';
                                const pax = m.passengers?.map(p => p.name).join(', ') || '';
                                const movementHour = parseTimeToHour(m.time);
                                
                                // Calculate spacer height from previous movement (or card start for first)
                                let spacerHeight = 0;
                                if (mi === 0) {
                                  // First movement: offset from card start
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
                                      {/* Timeline dot */}
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
                        // Single route — show time + title compact
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
  };

  // ============================================
  // RENDER: Week View (default)
  // ============================================
  const renderWeekView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-px bg-outline-variant/20 h-full">
      {columns.map((col, colIndex) => {
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
            {/* Column header */}
            <div className={`px-2.5 py-2 flex items-center justify-between border-b border-outline-variant/20 ${col.isToday ? '' : ''}`}>
              <span className={`text-[11px] font-medium ${col.isToday ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                {col.label}
              </span>
              <span className={`text-[10px] ${col.isToday ? 'text-primary/70' : 'text-on-surface-variant/50'}`}>
                {col.date}
              </span>
            </div>

            {/* Services */}
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

            {/* Service count */}
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

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      {/* ─── Header Row 1: Title + Actions ─── */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex flex-col min-w-0">
              <h1 className="text-[18px] font-semibold text-on-surface leading-tight">Master Calendar</h1>
              <p className="text-[12px] text-on-surface-variant mt-0.5">
                {viewMode === 'month'
                  ? `${getMonthName(baseDate.getMonth())} ${baseDate.getFullYear()}`
                  : viewMode === 'day'
                    ? `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][parseDateKeyToDate(formatDateKey(baseDate))?.getDay() ?? 0]}, ${formatDateKey(baseDate)}`
                    : `${columns[0]?.date} — ${columns[columns.length - 1]?.date}`
                }
              </p>
            </div>
            <button onClick={goToToday}
              className="px-3 py-1.5 text-[12px] font-medium text-on-surface border border-outline-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer shrink-0">
              Today
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onNavigate('new_service', 'slide_up')}
              className="flex items-center gap-1.5 bg-primary text-on-primary text-[12px] font-medium px-3 py-2 rounded-lg hover:bg-primary-hover transition-colors cursor-pointer">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Service</span>
            </button>
            <button onClick={() => onNavigate('transport_list', 'none')}
              className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant text-on-surface-variant text-[12px] font-medium px-3 py-2 rounded-lg hover:bg-surface-dim transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import Excel</span>
            </button>
            <button className="p-2 rounded-lg hover:bg-surface-dim text-on-surface-variant transition-colors cursor-pointer relative">
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary cursor-pointer">AD</div>
          </div>
        </div>

        {/* ─── Header Row 2: Navigation + View Toggle + Filters + Search ─── */}
        <div className="flex items-center gap-2 px-5 py-2 shrink-0">
          {/* Date navigation */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={goToPrev} className="p-1 rounded hover:bg-surface-dim transition-colors text-on-surface-variant hover:text-on-surface">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToNext} className="p-1 rounded hover:bg-surface-dim transition-colors text-on-surface-variant hover:text-on-surface">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[12px] text-on-surface font-medium shrink-0">{dateRangeLabel}</span>

          {/* View mode toggle */}
          <div className="flex bg-surface-container rounded-lg overflow-hidden border border-outline-variant/40 shrink-0 ml-2">
            {(['day','week','month'] as ViewMode[]).map(mode => (
              <button key={mode} onClick={() => { onViewModeChange(mode); setSelectedDay(null); }}
                className={`px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer capitalize ${
                  viewMode === mode ? 'bg-on-surface text-surface-container-lowest' : 'text-on-surface-variant hover:text-on-surface'
                }`}>
                {mode}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Dropdown filters */}
          <select value={activeEntity} onChange={e => setActiveEntity(e.target.value)}
            className="text-[11px] text-on-surface-variant bg-transparent border-none cursor-pointer hover:text-on-surface focus:outline-none shrink-0 appearance-none pr-4"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}>
            <option value="All">All Companies</option>
            {companies.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <select value={driverFilter} onChange={e => setDriverFilter(e.target.value)}
            className="text-[11px] text-on-surface-variant bg-transparent border-none cursor-pointer hover:text-on-surface focus:outline-none shrink-0 appearance-none pr-4"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}>
            <option value="All">All Drivers</option>
            {driverOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-[11px] text-on-surface-variant bg-transparent border-none cursor-pointer hover:text-on-surface focus:outline-none shrink-0 appearance-none pr-4"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}>
            <option value="All">Status</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="w-px h-4 bg-outline-variant/40 shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-[200px]">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search services..."
              className="w-full bg-transparent border-none pl-7 pr-2 py-1 text-[11px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none" />
          </div>

          <div className="w-px h-4 bg-outline-variant/40 shrink-0" />
        </div>

        {/* ─── Calendar Content ─── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? <LoadingSkeleton /> : (
            <>
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && selectedDay && renderDayDetail()}
              {viewMode === 'week' && !selectedDay && renderWeekView()}
              {viewMode === 'day' && renderDayDetail()}
            </>
          )}
        </div>

      {/* Side Panel */}
      {sidePanelService && <SidePanel />}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4 p-0" onClick={handleCloseEdit}>
          <div 
            className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-xl border border-outline-variant w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header - fixed */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-outline-variant shrink-0">
              <h2 className="text-[16px] sm:text-[18px] font-semibold text-on-surface">Edit Service</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowWhatsAppParser(true)}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 text-[11px] sm:text-[12px] font-medium hover:bg-green-100 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
                <button onClick={handleCloseEdit} className="p-2 rounded-full hover:bg-surface-dim min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex flex-col gap-2 px-4 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0">

              {/* === SECTION: Basic Info === */}
              <button 
                onClick={() => toggleSection('basic')}
                className="flex items-center justify-between py-2 text-[13px] font-semibold text-on-surface uppercase tracking-wide"
              >
                <span>Basic Info</span>
                {collapsedSections.basic ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              {!collapsedSections.basic && (
                <div className="flex flex-col gap-3 pb-3 border-b border-outline-variant/30">
                  {/* Vehicle / Title */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Vehicle / Title</label>
                    <input type="text" value={editForm.title || ''} onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                  </div>
                  {/* Vehicle Type + Plate */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Vehicle Type</label>
                      <select value={editForm.vehicleType || ''} onChange={e => setEditForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary">
                        <option value="">—</option>
                        {vehicleTypes.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Plate</label>
                      <input type="text" value={editForm.vehiclePlate || ''} onChange={e => setEditForm(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="AB 123 CD" />
                    </div>
                  </div>
                  {/* Time */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Scheduled Time</label>
                    <input type="text" value={formatTimeDisplay(editForm.time || '')} onChange={e => setEditForm(prev => ({ ...prev, time: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="08:00 or 08:00 - 17:00" />
                  </div>
                  {/* Status — read-only, workflow transitions via Commands */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Status</label>
                    {(() => {
                      const statusColor = getServiceStatusColor(editingService);
                      return (
                        <div className="flex items-center gap-2 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColor.hex }} />
                          <span className="text-[14px] text-on-surface font-medium">{statusColor.label}</span>
                          <span className="text-[11px] text-on-surface-variant ml-auto">via workflow commands</span>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Driver */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Driver</label>
                    <div className="flex gap-2">
                      <select value={editForm.driverName || ''} onChange={e => {
                        const name = e.target.value;
                        const matched = dbDrivers.find(d => d.name === name);
                        setEditForm(prev => ({
                          ...prev,
                          driverName: name,
                          driverPhone: matched?.phone || prev.driverPhone || '',
                        }));
                      }}
                        className="flex-1 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary">
                        <option value="">— Select —</option>
                        <option value="Unassigned">⚠ Unassigned</option>
                        {dbDrivers.length > 0 && <option disabled>─────────</option>}
                        {dbDrivers.map(d => (
                          <option key={d.id} value={d.name}>{d.name}{d.phone ? ` (${d.phone})` : ''}</option>
                        ))}
                        {dbDrivers.length === 0 && (
                          <>
                            <option disabled>No DB drivers — typing below</option>
                          </>
                        )}
                      </select>
                      <input type="text" value={editForm.driverName || ''} onChange={e => setEditForm(prev => ({ ...prev, driverName: e.target.value }))}
                        className="flex-1 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="Or type..." />
                    </div>
                  </div>
                  {/* Driver Phone */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Driver Phone</label>
                    <input type="text" value={editForm.driverPhone || ''} onChange={e => setEditForm(prev => ({ ...prev, driverPhone: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="+39 ..." />
                  </div>
                  {/* Client + Project */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Client</label>
                      <input type="text" value={editForm.clientName || ''} onChange={e => setEditForm(prev => ({ ...prev, clientName: e.target.value }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Project</label>
                      <input type="text" value={editForm.project || ''} onChange={e => setEditForm(prev => ({ ...prev, project: e.target.value }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  {/* Passengers */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Passengers</label>
                    <input type="text" value={editForm.passengers || ''} onChange={e => setEditForm(prev => ({ ...prev, passengers: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                  </div>
                </div>
              )}

              {/* === SECTION: Route === */}
              <button onClick={() => toggleSection('route')} className="flex items-center justify-between py-2 text-[13px] font-semibold text-on-surface uppercase tracking-wide">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> 
                  Route {editForm.movements && editForm.movements.length > 1 && (
                    <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
                      {editForm.movements.length} routes
                    </span>
                  )}
                </span>
                {collapsedSections.route ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              {!collapsedSections.route && (
                <div className="flex flex-col gap-3 pb-3 border-b border-outline-variant/30">
                  {/* Multi-route: show movements as editable cards */}
                  {editForm.movements && editForm.movements.length > 1 ? (
                    editForm.movements.map((m, idx) => (
                      <div key={idx} className={`flex flex-col gap-2 p-3 rounded-lg border border-outline-variant/40 bg-surface-dim/50 ${idx > 0 ? 'mt-1' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                            Route {idx + 1}
                          </span>
                          <span className="text-[11px] font-medium text-on-surface-variant">
                            {formatTimeDisplay(m.time)}
                          </span>
                        </div>
                        {/* Time */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium text-on-surface-variant uppercase">Time</label>
                          <input type="text" value={m.time || ''} onChange={e => {
                            const newMovements = [...editForm.movements!];
                            newMovements[idx] = { ...newMovements[idx], time: e.target.value };
                            setEditForm(prev => ({ ...prev, movements: newMovements }));
                          }}
                            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="08:00" />
                        </div>
                        {/* Passengers */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium text-on-surface-variant uppercase">Passengers</label>
                          <input type="text" value={m.passengers?.map(p => p.name).join('; ') || ''} onChange={e => {
                            const names = e.target.value.split(';').map(n => n.trim()).filter(Boolean);
                            const newPassengers = names.map(name => ({ name, role: '' }));
                            const newMovements = [...editForm.movements!];
                            newMovements[idx] = { ...newMovements[idx], passengers: newPassengers };
                            setEditForm(prev => ({ ...prev, movements: newMovements }));
                          }}
                            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="Name1; Name2" />
                        </div>
                        {/* From */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium text-on-surface-variant uppercase">From (Pickup)</label>
                          <input type="text" value={m.pickupLines?.[0] || ''} onChange={e => {
                            const newMovements = [...editForm.movements!];
                            newMovements[idx] = { ...newMovements[idx], pickupLines: [e.target.value] };
                            setEditForm(prev => ({ ...prev, movements: newMovements }));
                          }}
                            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                        </div>
                        {/* To */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-medium text-on-surface-variant uppercase">To (Destination)</label>
                          <input type="text" value={m.dropoffLines?.[0] || ''} onChange={e => {
                            const newMovements = [...editForm.movements!];
                            newMovements[idx] = { ...newMovements[idx], dropoffLines: [e.target.value] };
                            setEditForm(prev => ({ ...prev, movements: newMovements }));
                          }}
                            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Single route: show traditional from/to fields */
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-on-surface-variant uppercase">From (Pickup)</label>
                        <input type="text" value={editForm.from || ''} onChange={e => setEditForm(prev => ({ ...prev, from: e.target.value }))}
                          className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-on-surface-variant uppercase">To (Destination)</label>
                        <div className="flex gap-2">
                          <input type="text" value={editForm.to || ''} onChange={e => setEditForm(prev => ({ ...prev, to: e.target.value }))}
                            className="flex-1 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                          {editForm.notes?.startsWith('maps:') && (
                            <a href={editForm.notes.replace('maps:', '')} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-center px-3 py-2 rounded-lg bg-primary/10 text-primary text-[12px] font-medium hover:bg-primary/20 transition-colors shrink-0">
                              Maps
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-on-surface-variant uppercase">Route Description</label>
                        <input type="text" value={editForm.routeDescription || ''} onChange={e => setEditForm(prev => ({ ...prev, routeDescription: e.target.value }))}
                          className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="DA HOTEL NH..." />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-on-surface-variant uppercase">Flight Info</label>
                        <input type="text" value={editForm.flightInfo || ''} onChange={e => setEditForm(prev => ({ ...prev, flightInfo: e.target.value }))}
                          className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="Flight n. BA538" />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* === SECTION: Rapportino (Driver Report) === */}
              <button onClick={() => toggleSection('rapportino')} className="flex items-center justify-between py-2 text-[13px] font-semibold text-on-surface uppercase tracking-wide">
                <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Rapportino</span>
                {collapsedSections.rapportino ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              {!collapsedSections.rapportino && (
                <div className="flex flex-col gap-3 pb-3 border-b border-outline-variant/30">
                  <p className="text-[11px] text-on-surface-variant -mt-1">Actual times reported by driver (via WhatsApp or manually)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Actual Start</label>
                      <input type="text" value={editForm.startTime || ''} onChange={e => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="08:30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Actual End</label>
                      <input type="text" value={editForm.endTime || ''} onChange={e => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="21:30" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Min Before</label>
                      <input type="number" value={editForm.overtimeBefore || ''} onChange={e => setEditForm(prev => ({ ...prev, overtimeBefore: parseInt(e.target.value) || undefined }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Min After</label>
                      <input type="number" value={editForm.overtimeAfter || ''} onChange={e => setEditForm(prev => ({ ...prev, overtimeAfter: parseInt(e.target.value) || undefined }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">KM</label>
                      <input type="number" value={editForm.km || ''} onChange={e => setEditForm(prev => ({ ...prev, km: parseFloat(e.target.value) || undefined }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Overtime Hours</label>
                    <input type="number" step="0.5" value={editForm.overtimeHours || ''} onChange={e => setEditForm(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || undefined }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0" />
                  </div>
                </div>
              )}

              {/* === SECTION: Costs === */}
              <button onClick={() => toggleSection('costs')} className="flex items-center justify-between py-2 text-[13px] font-semibold text-on-surface uppercase tracking-wide">
                <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" /> Costs</span>
                {collapsedSections.costs ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              {!collapsedSections.costs && (
                <div className="flex flex-col gap-3 pb-3 border-b border-outline-variant/30">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase flex items-center gap-1">
                        Base Cost (€)
                         {(editForm._costsFromParametros?.baseCost) && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded font-normal">Production</span>
                        )}
                      </label>
                      <input type="number" step="0.01" value={editForm.baseCost ?? ''} onChange={e => handleCostChange('baseCost', e.target.value)}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase flex items-center gap-1">
                        Overtime Cost (€)
                         {(editForm._costsFromParametros?.overtimeCost) && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded font-normal">Production</span>
                        )}
                      </label>
                      <input type="number" step="0.01" value={editForm.overtimeCost ?? ''} onChange={e => handleCostChange('overtimeCost', e.target.value)}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase flex items-center gap-1">
                        KM Cost (€)
                         {(editForm._costsFromParametros?.kmCost) && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded font-normal">Production</span>
                        )}
                      </label>
                      <input type="number" step="0.01" value={editForm.kmCost ?? ''} onChange={e => handleCostChange('kmCost', e.target.value)}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Diaria (€)</label>
                      <input type="number" step="0.01" value={editForm.diariaCost || ''} onChange={e => setEditForm(prev => ({ ...prev, diariaCost: parseFloat(e.target.value) || undefined }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Notturno Cost (€)</label>
                      <input type="number" step="0.01" value={editForm.notturnoCost || ''} onChange={e => setEditForm(prev => ({ ...prev, notturnoCost: parseFloat(e.target.value) || undefined }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase font-bold">Total (€)</label>
                      <input type="number" step="0.01" value={editForm.totalCost || ''} onChange={e => setEditForm(prev => ({ ...prev, totalCost: parseFloat(e.target.value) || undefined }))}
                        className="bg-surface-dim border-2 border-primary rounded-lg px-3 py-2 text-[14px] text-on-surface font-bold focus:outline-none focus:border-primary" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">PO / Reference</label>
                    <input type="text" value={editForm.po || ''} onChange={e => setEditForm(prev => ({ ...prev, po: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                  </div>
                </div>
              )}

              {/* === SECTION: Flags === */}
              <button onClick={() => toggleSection('flags')} className="flex items-center justify-between py-2 text-[13px] font-semibold text-on-surface uppercase tracking-wide">
                <span className="flex items-center gap-2"><Flag className="w-4 h-4 text-purple-500" /> Flags & Costs</span>
                {collapsedSections.flags ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              {!collapsedSections.flags && (
                <div className="flex flex-col gap-3 pb-3">
                  <div className="flex flex-col gap-3">
                    {/* NOTE: IsFestivo, IsNotturno, HoursExtra belong to DriverReport, not Service.
                        Edit them through the DriverReport flow (submit → approve). */}
                    <p className="text-[11px] text-on-surface-variant italic">
                      Flags (Festivo, Notturno, HoursExtra) are set via DriverReport submission.
                    </p>
                    
                    {/* Diaria Type Selector */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Diaria (Meal Allowance)</label>
                      <select
                        value={editForm.diariaType || 'none'}
                        onChange={e => {
                          const type = e.target.value as 'piena' | 'mezza' | 'none';
                          // Use diaria cost from parametros/RateCard if available, otherwise fallback
                          const pienaCost = editForm._costsFromParametros?.diariaPiena || 50;
                          const mezzaCost = editForm._costsFromParametros?.diariaMezza || 35;
                          const cost = type === 'piena' ? pienaCost : type === 'mezza' ? mezzaCost : 0;
                          setEditForm(prev => ({ 
                            ...prev, 
                            diariaType: type,
                            hasDiaria: type !== 'none',
                            diariaCost: cost,
                          }));
                        }}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="none">Nessuna (€0)</option>
                        <option value="mezza">Mezza</option>
                        <option value="piena">Piena</option>
                      </select>
                    </div>

                    {/* Km Over Input */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Km Over (Extra km beyond included)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={editForm.kmOver ?? ''}
                          onChange={e => {
                            const kmOver = parseInt(e.target.value) || 0;
                            const kmRate = editForm.kmCost || 1.50; // use rate from parametros/RateCard, default €1.50
                            setEditForm(prev => ({ 
                              ...prev, 
                              kmOver,
                              kmOverCost: kmOver * kmRate,
                            }));
                          }}
                          className="w-24 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                          placeholder="0"
                        />
                        <span className="text-[12px] text-on-surface-variant">km</span>
                        {editForm.kmOver && editForm.kmOver > 0 && (
                          <span className="text-[12px] text-amber-600 font-medium">
                            +€{(editForm.kmOver * (editForm.kmCost || 1.50)).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total Cost Preview */}
                    <div className="bg-surface rounded-lg p-3 border border-outline-variant">
                      <p className="text-[11px] font-medium text-on-surface-variant uppercase mb-2">Cost Summary</p>
                      <div className="grid grid-cols-2 gap-2 text-[13px]">
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Base:</span>
                          <span className="font-medium">€{(editForm.baseCost || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Km Over:</span>
                          <span className="font-medium text-amber-600">€{(editForm.kmOverCost || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Diaria:</span>
                          <span className="font-medium text-green-600">€{(editForm.diariaCost || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Notturno:</span>
                          <span className="font-medium text-purple-600">€{(editForm.notturnoCost || 0).toFixed(2)}</span>
                        </div>
                        <div className="col-span-2 flex justify-between pt-2 border-t border-outline-variant">
                          <span className="font-semibold text-on-surface">TOTAL:</span>
                          <span className="font-bold text-primary text-[15px]">
                            €{((editForm.baseCost || 0) + (editForm.kmOverCost || 0) + (editForm.diariaCost || 0) + (editForm.notturnoCost || 0) + (editForm.isFestivo ? (editForm.baseCost || 0) * 0.5 : 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Notes</label>
                    <textarea value={editForm.notes?.startsWith('maps:') ? '' : (editForm.notes || '')} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary resize-none" rows={2} />
                  </div>
                </div>
              )}

            </div>

            {/* Footer - fixed */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-outline-variant shrink-0">
              <button onClick={() => { handleCloseEdit(); handleOpenCancel(editingService!); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[13px] font-medium hover:bg-red-100 transition-colors min-h-[44px]">
                <Trash2 className="w-4 h-4" />
                Delete Service
              </button>
              <div className="flex gap-2">
                <button onClick={handleCloseEdit}
                  className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors min-h-[44px]">
                  Close
                </button>
                <button onClick={handleSaveEdit}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-hover transition-colors min-h-[44px]">
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Parser Modal */}
      {showWhatsAppParser && editingService && (
        <WhatsAppParser 
          onApply={(data) => setEditForm(prev => ({ ...prev, ...data }))}
          onClose={() => setShowWhatsAppParser(false)}
        />
      )}


      {/* Cost Change Warning Dialog */}
      {costChangeWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={cancelCostChange}>
          <div 
            className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant w-full max-w-md flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-6 pt-5 pb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-on-surface">Production Parameter</h3>
                <p className="text-[12px] text-on-surface-variant">This value is configured for the entire production</p>
              </div>
            </div>
            <div className="px-6 py-3">
              <p className="text-[13px] text-on-surface leading-relaxed">
                These are the preconfigured parameters for <strong>ALL production</strong> — 
                <span className="font-semibold text-primary"> {editingService?.project || 'this production'}</span>.
              </p>
              <p className="text-[13px] text-on-surface mt-2">
                Do you still want to modify <strong>{costChangeWarning.label}</strong>?
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant">
              <button
                onClick={cancelCostChange}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors"
              >
                Keep Original
              </button>
              <button
                onClick={confirmCostChange}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-[13px] font-medium hover:bg-amber-600 transition-colors"
              >
                Yes, Modify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete/Cancel Service Confirmation Modal */}
      {cancellingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleCloseCancel}>
          <div 
            className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant w-full max-w-md flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="text-[18px] font-semibold text-on-surface">
                {cancelMode === 'cancel' ? 'Cancel Service' : 'Delete Service'}
                </h2>
              </div>
              <button onClick={handleCloseCancel} className="p-1 rounded-full hover:bg-surface-dim">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 px-6 py-4">
              <p className="text-[13px] text-on-surface-variant">
                {cancelMode === 'cancel' 
                  ? 'This will cancel the service and set its status to Cancelado. The service will remain in history but will no longer appear in active workflows.'
                  : 'Only services in <strong>Importado</strong> or <strong>Asignado</strong> status can be deleted. Once confirmed, services must go through the full lifecycle.'}
              </p>
              <div className="bg-surface-dim rounded-lg p-3 text-[13px] text-on-surface">
                <p><strong>{cancellingService.title}</strong></p>
                <p className="text-on-surface-variant">{cancellingService.time} · {cancellingService.driverName}</p>
                <p className="text-on-surface-variant text-[11px] mt-1">Status: {cancellingService.status}</p>
              </div>
              
              {/* Reason (only for cancel/required mode) */}
              {cancelMode === 'cancel' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-red-600">
                    Reason for cancellation <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-red-400 resize-none"
                    rows={3}
                    placeholder="Why is this service being cancelled?"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant">
              <button
                onClick={handleCloseCancel}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={cancelMode === 'cancel' ? handleConfirmCancel : handleConfirmDelete}
                disabled={cancelMode === 'cancel' && !cancelReason.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelMode === 'cancel' ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                {cancelMode === 'cancel' ? 'Cancel Service' : 'Delete Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleCloseAdjustment}>
          <div 
            className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant w-full max-w-md flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                {adjustmentType === 'revenue' ? (
                  <DollarSign className="w-5 h-5 text-indigo-500" />
                ) : (
                  <DollarSign className="w-5 h-5 text-rose-500" />
                )}
                <h2 className="text-[18px] font-semibold text-on-surface">
                  {adjustmentType === 'revenue' ? 'Adjust Revenue' : 'Adjust Cost'}
                </h2>
              </div>
              <button onClick={handleCloseAdjustment} className="p-1 rounded-full hover:bg-surface-dim">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 px-6 py-4">
              <p className="text-[13px] text-on-surface-variant">
                Add a manual {adjustmentType} adjustment to this service.
              </p>
              <div className="bg-surface-dim rounded-lg p-3 text-[13px] text-on-surface">
                <p><strong>{adjustingService.title}</strong></p>
                <p className="text-on-surface-variant">{adjustingService.time} · {adjustingService.driverName}</p>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-on-surface-variant">
                  Description
                </label>
                <input
                  type="text"
                  value={adjustmentForm.description}
                  onChange={e => setAdjustmentForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="e.g., Overtime surcharge, Parking refund"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-on-surface-variant">
                  Amount <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={adjustmentForm.amount}
                  onChange={e => setAdjustmentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant">
              <button
                onClick={handleCloseAdjustment}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdjustment}
                disabled={!adjustmentForm.amount || parseFloat(adjustmentForm.amount) <= 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  adjustmentType === 'revenue'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Save className="w-4 h-4" />
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Floating Toolbar */}
      <AnimatePresence>
        {selectedServiceIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2.5 shadow-lg max-w-[90vw] overflow-x-auto">
              <div className="flex items-center gap-2 shrink-0">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-[13px] font-medium text-on-surface whitespace-nowrap">
                  {selectedServiceIds.size} selected
                </span>
              </div>
              
              <div className="w-px h-6 bg-outline-variant shrink-0" />
              
              <button onClick={clearSelection}
                className="text-[11px] text-on-surface-variant font-medium hover:underline shrink-0">
                Clear
              </button>
              
              <div className="w-px h-6 bg-outline-variant shrink-0" />

              {/* Dynamic workflow buttons based on selected services' statuses */}
              {(() => {
                const allSvcs = [...services];
                const selected = Array.from(selectedServiceIds).map(id => allSvcs.find(s => s.id === id)).filter(Boolean) as Service[];
                
                const stages = [
                  { action: 'assign', label: 'Assign Driver', color: 'bg-blue-500 hover:bg-blue-600', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>, count: selected.filter(s => s.operationalStatus === 'Importado' && !s.driverId).length },
                  { action: 'confirm', label: 'Confirm', color: 'bg-cyan-500 hover:bg-cyan-600', icon: <Check className="w-3.5 h-3.5" />, count: selected.filter(s => s.operationalStatus === 'Asignado').length },
                  { action: 'start', label: 'Start Route', color: 'bg-blue-600 hover:bg-blue-700', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, count: selected.filter(s => s.operationalStatus === 'Confirmado').length },
                  { action: 'complete', label: 'Complete', color: 'bg-green-600 hover:bg-green-700', icon: <CheckCircle className="w-3.5 h-3.5" />, count: selected.filter(s => s.operationalStatus === 'EnRuta').length },
                  { action: 'report', label: 'Report', color: 'bg-amber-500 hover:bg-amber-600', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>, count: selected.filter(s => s.operationalStatus === 'Realizado').length },
                  { action: 'review', label: 'Review', color: 'bg-amber-600 hover:bg-amber-700', icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>, count: selected.filter(s => s.operationalStatus === 'Reportado').length },
                  { action: 'validate', label: 'Validate', color: 'bg-green-700 hover:bg-green-800', icon: <CheckCircle className="w-3.5 h-3.5" />, count: selected.filter(s => ['Reportado', 'Revision'].includes(s.operationalStatus)).length },
                ];

                return stages.filter(s => s.count > 0).map(stage => (
                  <button key={stage.action}
                    onClick={() => {
                      if (stage.action === 'assign') { setShowBulkDriverPicker(true); return; }
                      handleBulkWorkflow(stage.action);
                    }}
                    disabled={isBulkCompleting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-on-primary text-[11px] font-medium rounded-lg transition-colors disabled:opacity-50 shrink-0 ${stage.color}`}>
                    {stage.icon}
                    {stage.label}
                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{stage.count}</span>
                  </button>
                ));
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Assign Driver Modal */}
      {showBulkDriverPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4 p-0" onClick={() => setShowBulkDriverPicker(false)}>
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-xl border border-outline-variant w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-[16px] font-semibold text-on-surface">Assign Driver to {selectedServiceIds.size} Service(s)</h3>
              <p className="text-[12px] text-on-surface-variant mt-1">Select a driver to assign to all selected services</p>
            </div>
            <div className="px-5 pb-4">
              <select value={bulkAssignDriverId} onChange={e => setBulkAssignDriverId(e.target.value)}
                className="w-full bg-surface-dim border border-outline-variant rounded-lg px-3 py-2.5 text-[14px] text-on-surface focus:outline-none focus:border-primary">
                <option value="">— Select Driver —</option>
                {dbDrivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}{d.phone ? ` (${d.phone})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant">
              <button onClick={() => setShowBulkDriverPicker(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors">
                Cancel
              </button>
              <button onClick={handleBulkAssignDriver} disabled={!bulkAssignDriverId || isBulkCompleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
                {isBulkCompleting ? 'Assigning...' : 'Assign Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
