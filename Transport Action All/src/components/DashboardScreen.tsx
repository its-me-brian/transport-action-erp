import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, Plus, AlertCircle, AlertTriangle, Car, ArrowRight, 
  ChevronLeft, ChevronRight, Grid3X3, Rows3, Clock, X, Save, Trash2, MessageSquare,
  ChevronDown, ChevronUp, Fuel, MapPin, DollarSign, Flag, Check, CheckCircle, Upload
} from 'lucide-react';
import { 
  Service, ScreenId, ViewMode, 
  getWeekColumns, getMonthWeeks, getMonthName, formatDateKey,
  getHourSlots, parseTimeToHour, parseDateKeyToDate, formatTimeDisplay,
  getDriverAvatar, isProductionVehicle
} from '../types';
import WhatsAppParser from './WhatsAppParser';
import { getDrivers, DriverRecord, getSettings, updateServiceField, cerrarComercialmente, facturarService, cobrarService, closeService, deleteService, cancelService, adjustRevenue, adjustCost, completeService, assignDriver, approveFinancial, markFacturable, getOperatingCompanies, OperatingCompany } from '../services/api';

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

  useEffect(() => {
    getOperatingCompanies().then(c => { if (Array.isArray(c)) setCompanies(c); }).catch(e => console.error('Failed to load operating companies:', e));
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
  const [isBulkCompleting, setIsBulkCompleting] = useState(false);

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
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('All');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

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

  const vehicleTypeOptions = useMemo(() => {
    const types = [...new Set(services.map(s => s.vehicleType).filter(Boolean))];
    return types.sort();
  }, [services]);

  // Filtered options for search inputs
  const filteredDriverOptions = useMemo(() => {
    if (!driverSearch) return driverOptions;
    const search = driverSearch.toLowerCase();
    return driverOptions.filter(d => d.toLowerCase().includes(search));
  }, [driverOptions, driverSearch]);

  const filteredClientOptions = useMemo(() => {
    if (!clientSearch) return clientOptions;
    const search = clientSearch.toLowerCase();
    return clientOptions.filter(c => c.toLowerCase().includes(search));
  }, [clientOptions, clientSearch]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-filter-dropdown]')) {
        setShowDriverDropdown(false);
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (vehicleTypeFilter !== 'All' && service.vehicleType !== vehicleTypeFilter) return false;
    // Hide Production vehicle services from calendar (they belong to production, not the agency)
    if (isProductionVehicle(service)) return false;
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
    
    setIsBulkCompleting(true);
    try {
      // Use proper state machine command — completeService transitions EnRuta → Realizado
      const promises = Array.from(selectedServiceIds).map((serviceId: string) => 
        completeService(serviceId)
      );
      
      const results = await Promise.all(promises);
      const failures = results.filter(r => r?.error);
      
      if (failures.length > 0) {
        alert(`${failures.length} of ${selectedServiceIds.size} services could not be completed:\n${failures.map(f => f?.error).join('\n')}`);
      }
      
      // Clear selection
      setSelectedServiceIds(new Set());
    } catch (error) {
      console.error('Failed to mark services as completed:', error);
      alert('Failed to complete services: ' + (error as Error).message);
    } finally {
      setIsBulkCompleting(false);
    }
  }, [selectedServiceIds]);

  // Select all services for a specific day
  const selectAllServicesForDay = useCallback((dateKey: string) => {
    const dayServices = filteredServices.filter(s => s.date === dateKey);
    setSelectedServiceIds(new Set(dayServices.map(s => s.id)));
  }, [filteredServices]);

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
      alert('This service is already completed. Completed services cannot be reverted to In Progress.');
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
        // NOTE: status/OperationalStatus is NOT editable via updateServiceField.
        // State changes MUST go through Commands (assignDriver, confirmService, etc.)
        // NOTE: DriverID/VehicleID are NOT here — assignment MUST go through assignDriver()
        // which handles ProviderType, ProviderID, Driver.Status side effects.
        // NOTE: Rapportino fields (StartTime, EndTime, KmTotal, HoursExtra, DiariaType,
        // IsFestivo, IsNotturno, HasDiaria) belong to DriverReport, not Service.
        // They CANNOT be saved via updateServiceField. They must be edited through
        // the DriverReport workflow (createReport/approveReport).
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
        alert('Some fields could not be saved: ' + failedFields.join(', '));
        // Do NOT update local state if any fields failed — keep UI in sync with backend
      } else {
        onServiceUpdate?.(editingService.id, editForm);
      }
      
      // Close modal
      setEditingService(null);
      setEditForm({});
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
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
        alert('Error deleting service: ' + result.error);
        return;
      }
      // Remove from local state
      onServiceUpdate?.(cancellingService.id, { status: 'Deleted' });
    } catch (err: any) {
      alert('Error deleting service: ' + (err.message || 'Unknown error'));
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
        alert('Error cancelling service: ' + result.error);
        return;
      }
      // Mark as cancelled in local state
      onServiceUpdate?.(cancellingService.id, { operationalStatus: 'Cancelado' });
    } catch (err: any) {
      alert('Error cancelling service: ' + (err.message || 'Unknown error'));
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
        alert('Error: ' + result.error);
        return;
      }
      alert(`${adjustmentType === 'revenue' ? 'Revenue' : 'Cost'} adjustment of ${amount} saved.`);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Unknown error'));
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
      let startHour = parseTimeToHour(service.time);
      // If time is invalid, default to 6am (so it still shows)
      if (startHour < 0) startHour = 6;
      
      const timeStr = service.time instanceof Date 
        ? `${String(service.time.getHours()).padStart(2, '0')}:${String(service.time.getMinutes()).padStart(2, '0')}`
        : String(service.time || '');
      const timeMatch = timeStr.match(/(\d{1,2})[:.]\d{2}\s*[-–]\s*(\d{1,2})[:.]\d{2}/);
      const endHour = timeMatch ? parseInt(timeMatch[2]) : startHour + 1;
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

  // --- Service Card Component ---
  const ServiceCard: React.FC<{ 
    service: Service; 
    onDoubleClick?: (s: Service) => void;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
  }> = ({ service, onDoubleClick, isSelected = false, onSelect }) => {
    const isAction = service.company === 'Transport Action';
    const isUnassigned = !service.driverName || service.driverName === 'Unassigned';
    const isCompleted = service.status === 'Completed';
    const isProduction = isProductionVehicle(service);
    
    return (
      <div
        className={`bg-surface-container-lowest border rounded-lg px-2.5 py-2 flex flex-col gap-1 hover:bg-surface-container-low transition-colors relative group cursor-pointer border-l-[3px] ${
          isSelected
            ? 'ring-2 ring-primary ring-offset-1'
            : isCompleted
              ? 'opacity-60 bg-gray-50 border-gray-200 border-l-gray-400'
              : isProduction
                ? 'border-outline-variant border-l-gray-300 opacity-70'
                : isUnassigned
                  ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'
                  : isAction 
                    ? 'border-outline-variant border-l-primary' 
                    : 'border-outline-variant border-l-secondary'
        }`}
        onDoubleClick={() => onDoubleClick?.(service)}
      >
        {/* Checkbox */}
        <div className="absolute bottom-1.5 right-1.5 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onSelect?.(service.id); }}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-primary border-primary text-white'
                : 'bg-white border-outline-variant hover:border-primary'
            }`}
          >
            {isSelected && <Check className="w-2.5 h-2.5" />}
          </button>
        </div>
        
        {/* Row 1: Driver name (PRIMARY) + time */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {isUnassigned ? (
              <span className="text-[13px] font-bold text-amber-600 truncate">⚠ Unassigned</span>
            ) : (
              <span className="text-[13px] font-bold text-on-surface truncate leading-tight">
                {service.driverName}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-primary shrink-0 tabular-nums">
            {formatTimeDisplay(service.time)}
          </span>
        </div>
        
        {/* Row 2: Service type + passengers */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
            isProduction ? 'bg-gray-100 text-gray-600' : 'bg-primary/10 text-primary'
          }`}>
            {service.vehicleType || 'Service'}
          </span>
          {service.passengers && (
            <span className="text-[11px] text-on-surface-variant truncate">
              — {service.passengers}
            </span>
          )}
        </div>
        
        {/* Row 3: Project (only if relevant) */}
        {service.project && service.project !== 'Unknown' && (
          <span className="text-[10px] text-on-surface-variant/70 truncate">
            {service.project}
          </span>
        )}

        {/* Row 4: Financial Status badge */}
        {service.financialStatus && service.financialStatus !== 'Pendiente' && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
              service.financialStatus === 'Cerrado' ? 'bg-orange-100 text-orange-700' :
              service.financialStatus === 'CerradoComercial' ? 'bg-green-100 text-green-700' :
              service.financialStatus === 'Facturado' ? 'bg-blue-100 text-blue-700' :
              service.financialStatus === 'Cobrado' ? 'bg-emerald-100 text-emerald-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {service.financialStatus}
            </span>
            {/* Financial transition buttons */}
            {(service.financialStatus === 'Calculado' || service.financialStatus === 'Confrontacion') && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('Aprobar este servicio?')) return;
                  try {
                    const result = await approveFinancial(service.id);
                    if (result.error) {
                      alert('Error: ' + result.error);
                    }
                  } catch (err: any) {
                    alert('Error: ' + err.message);
                  }
                }}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100 cursor-pointer"
                title="Aprobar servicio"
              >
                Aprobar
              </button>
            )}
            {service.financialStatus === 'Aprobado' && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('Marcar como facturable?')) return;
                  try {
                    const result = await markFacturable(service.id);
                    if (result.error) {
                      alert('Error: ' + result.error);
                    }
                  } catch (err: any) {
                    alert('Error: ' + err.message);
                  }
                }}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 hover:bg-purple-100 cursor-pointer"
                title="Marcar como facturable"
              >
                Facturable
              </button>
            )}
            {service.financialStatus === 'Facturable' && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('Facturar este servicio?')) return;
                  try {
                    const result = await facturarService(service.id);
                    if (result.error) {
                      alert('Error: ' + result.error);
                    }
                  } catch (err: any) {
                    alert('Error: ' + err.message);
                  }
                }}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                title="Facturar servicio"
              >
                Facturar
              </button>
            )}
            {service.financialStatus === 'Facturado' && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('Cobrar este servicio?')) return;
                  try {
                    const result = await cobrarService(service.id);
                    if (result.error) {
                      alert('Error: ' + result.error);
                    }
                  } catch (err: any) {
                    alert('Error: ' + err.message);
                  }
                }}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer"
                title="Cobrar servicio"
              >
                Cobrar
              </button>
            )}
            {service.financialStatus === 'Cobrado' && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('Cerrar este servicio?')) return;
                  try {
                    const result = await closeService(service.id);
                    if (result.error) {
                      alert('Error: ' + result.error);
                    }
                  } catch (err: any) {
                    alert('Error: ' + err.message);
                  }
                }}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 cursor-pointer"
                title="Cerrar servicio"
              >
                Cerrar
              </button>
            )}
            {service.financialStatus === 'Cerrado' && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('Cerrar comercialmente este servicio?')) return;
                  try {
                    const result = await cerrarComercialmente(service.id);
                    if (result.error) {
                      alert('Error: ' + result.error);
                    }
                  } catch (err: any) {
                    alert('Error: ' + err.message);
                  }
                }}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100 cursor-pointer"
                title="Cerrar comercialmente"
              >
                Cerrar Com.
              </button>
            )}
            {/* Adjustment buttons — only when service is validated */}
            {service.operationalStatus === 'Validado' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAdjustment(service, 'revenue');
                  }}
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                  title="Adjust revenue"
                >
                  + Revenue
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAdjustment(service, 'cost');
                  }}
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                  title="Adjust cost"
                >
                  + Cost
                </button>
              </>
            )}
          </div>
        )}
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
    <div className="flex flex-col gap-3 pb-4">
      {/* Month header with Select All */}
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-on-surface">
          {getMonthName(baseDate.getMonth())} {baseDate.getFullYear()}
        </span>
        {filteredServices.filter(s => {
          const d = s.date;
          const parts = d.split(' ');
          if (parts.length === 2) {
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return monthNames.indexOf(parts[0]) === baseDate.getMonth();
          }
          return false;
        }).length > 0 && (
          <button
            onClick={selectAllServicesForMonth}
            className="text-[11px] text-primary font-medium hover:underline"
          >
            Select All Month
          </button>
        )}
      </div>
      
      {/* Month week selector */}
      <div className="flex flex-wrap gap-2 items-center">
        {monthWeeks.map((week, i) => {
          const weekStart = formatDateKey(week.weekStart);
          const weekEnd = new Date(week.weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const weekServices = filteredServices.filter(s => {
            const d = s.date;
            return d >= weekStart && d <= formatDateKey(weekEnd);
          });
          // Check if this week contains today
          const today = new Date();
          const todayKey = formatDateKey(today);
          const isCurrentWeek = todayKey >= weekStart && todayKey <= formatDateKey(weekEnd);
          
          return (
            <button
              key={i}
              onClick={() => {
                // Align to Monday of this week
                const monday = new Date(week.weekStart);
                const dow = monday.getDay();
                const mondayOffset = dow === 0 ? -6 : 1 - dow;
                monday.setDate(monday.getDate() + mondayOffset);
                onBaseDateChange(monday);
                onViewModeChange('week');
                setSelectedDay(null);
              }}
              className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                isCurrentWeek 
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30' 
                  : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-on-surface'
              }`}
            >
              <span className="text-[12px] font-medium">{week.label}</span>
              <span className="text-[11px] text-on-surface-variant">{weekStart} — {formatDateKey(weekEnd)}</span>
              <span className={`text-[11px] mt-0.5 ${weekServices.length > 0 ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>
                {weekServices.length} services
              </span>
            </button>
          );
        })}
      </div>

      {/* Month grid: 7 columns, rows = weeks */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Day headers */}
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="text-[11px] font-medium text-on-surface-variant py-1">{d}</div>
        ))}
        
        {/* Calendar cells */}
        {(() => {
          const year = baseDate.getFullYear();
          const month = baseDate.getMonth();
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          const firstDow = firstDay.getDay();
          const mondayOffset = firstDow === 0 ? -6 : 1 - firstDow;
          
          const cells: React.ReactNode[] = [];
          const startDate = new Date(year, month, 1 + mondayOffset);
          const today = new Date();
          const todayKey = formatDateKey(today);
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          const tomorrowKey = formatDateKey(tomorrow);
          const dayAfter = new Date(today);
          dayAfter.setDate(today.getDate() + 2);
          const dayAfterKey = formatDateKey(dayAfter);
          
          for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate() + i);
            
            const dateKey = formatDateKey(cellDate);
            const isCurrentMonth = cellDate.getMonth() === month;
            const isToday = dateKey === todayKey;
            const isTomorrow = dateKey === tomorrowKey;
            const isDayAfter = dateKey === dayAfterKey;
            const dayServices = filteredServices.filter(s => s.date === dateKey);
            
            let cellBorder = 'border-outline-variant/50';
            let cellBg = '';
            let dayText = 'text-on-surface';
            
            if (!isCurrentMonth) {
              cellBorder = 'border-transparent';
              cellBg = 'opacity-30';
            } else if (isToday) {
              cellBorder = 'border-primary';
              cellBg = 'bg-primary/8';
              dayText = 'text-primary font-bold';
            } else if (isTomorrow) {
              cellBorder = 'border-amber-400';
              cellBg = 'bg-amber-50';
              dayText = 'text-amber-700 font-semibold';
            } else if (isDayAfter) {
              cellBorder = 'border-emerald-400';
              cellBg = 'bg-emerald-50';
              dayText = 'text-emerald-700 font-semibold';
            }
            
            cells.push(
              <button
                key={i}
                onClick={() => {
                  onBaseDateChange(new Date(cellDate));
                  onViewModeChange('day');
                }}
                className={`flex flex-col items-center p-1.5 rounded-lg border min-h-[60px] transition-colors cursor-pointer ${cellBorder} ${cellBg} hover:shadow-sm`}
              >
                <span className={`text-[12px] font-medium ${dayText}`}>
                  {cellDate.getDate()}
                </span>
                {dayServices.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                    {dayServices.slice(0, 3).map((s, j) => {
                      // Color based on operational status
                      let dotColor = 'bg-gray-400'; // Default
                      switch (s.operationalStatus) {
                        case 'Importado': dotColor = 'bg-gray-400'; break;
                        case 'Asignado': dotColor = 'bg-blue-500'; break;
                        case 'Confirmado': dotColor = 'bg-green-500'; break;
                        case 'EnRuta': dotColor = 'bg-yellow-500'; break;
                        case 'Realizado': dotColor = 'bg-orange-500'; break;
                        case 'Reportado': dotColor = 'bg-purple-500'; break;
                        case 'Revision': dotColor = 'bg-indigo-500'; break;
                        case 'Validado': dotColor = 'bg-gray-600'; break;
                        case 'Cancelado': dotColor = 'bg-red-400'; break;
                      }
                      return <div key={j} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />;
                    })}
                    {dayServices.length > 3 && (
                      <span className="text-[9px] text-on-surface-variant">+{dayServices.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
            
            if (i >= 34 && cellDate.getMonth() !== month) break; // Stop after last week of month
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
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="flex">
            {/* Time column */}
            <div className="w-14 shrink-0 border-r border-outline-variant">
              {hourSlots.map(slot => (
                <div key={slot.hour} className="h-[72px] flex items-start justify-end pr-2 pt-0.5 border-b border-outline-variant/30">
                  <span className="text-[10px] text-on-surface-variant font-medium">{slot.label}</span>
                </div>
              ))}
            </div>
            
            {/* Services column */}
            <div className="flex-1 relative">
              {/* Hour lines */}
              {hourSlots.map(slot => (
                <div key={slot.hour} className="h-[72px] border-b border-outline-variant/30" />
              ))}
              
              {/* Service blocks with collision handling */}
              <AnimatePresence>
              {layoutServices.map(({ service, start, end, col, totalCols }, idx) => {
                const HOUR_HEIGHT = 72; // px per hour
                const topOffset = (start - 6) * HOUR_HEIGHT;
                const height = (end - start) * HOUR_HEIGHT - 3; // 3px gap between blocks
                const width = 100 / totalCols;
                const left = col * width;
                const isAction = service.company === 'Transport Action';
                const isUnassigned = !service.driverName || service.driverName === 'Unassigned';
                const isSelected = selectedServiceIds.has(service.id);
                const isCompleted = service.status === 'Completed';
                
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    className={`absolute rounded-md px-2 py-1.5 cursor-pointer transition-all hover:shadow-md border-l-[3px] overflow-hidden ${
                      isSelected
                        ? 'ring-2 ring-primary ring-offset-1'
                        : isCompleted
                          ? 'opacity-60 bg-gray-50 border-l-gray-400'
                          : isUnassigned
                            ? 'bg-amber-50 border-l-amber-400 hover:bg-amber-100 ring-1 ring-amber-200'
                            : isAction 
                              ? 'bg-primary/10 border-l-primary hover:bg-primary/15' 
                              : 'bg-secondary/10 border-l-secondary hover:bg-secondary/15'
                    }`}
                    style={{ 
                      top: `${topOffset}px`, 
                      height: `${height}px`,
                      left: `${left}%`,
                      width: `calc(${width}% - 4px)`,
                      minHeight: '24px',
                    }}
                    onDoubleClick={() => handleDoubleClick(service)}
                  >
                    {/* Checkbox for bulk selection - bottom right */}
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
                    
                    <div className="flex flex-col gap-0 h-full overflow-hidden">
                      <div className="flex items-center gap-1">
                        {isUnassigned && (
                          <span className="text-[10px] text-amber-600 font-bold shrink-0">⚠</span>
                        )}
                        <span className={`text-[12px] font-bold truncate leading-tight ${isUnassigned ? 'text-amber-700' : isAction ? 'text-primary' : 'text-secondary'}`}>
                          {service.driverName || 'Unassigned'}
                        </span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant font-medium truncate leading-tight">
                        {formatTimeDisplay(service.time)}
                      </span>
                      <span className="text-[10px] text-on-surface-variant truncate leading-tight opacity-70">
                        {service.title}
                      </span>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-2 h-full">
      {columns.map((col, colIndex) => {
        const colServices = filteredServices
          .filter(s => s.date === col.date)
          .sort((a, b) => parseTimeToHour(a.time) - parseTimeToHour(b.time));
        
        return (
          <motion.div 
            key={col.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: colIndex * 0.04 }}
            className={`flex flex-col min-w-0 rounded-xl border cursor-pointer transition-colors hover:shadow-md overflow-hidden ${col.colorClass}`}
            onClick={() => {
              onBaseDateChange(parseDateKeyToDate(col.date) || new Date());
              onViewModeChange('day');
            }}
          >
            {/* Column Title — fixed */}
            <div className={`flex items-center justify-between px-1.5 pt-1.5 pb-1.5 shrink-0 ${col.borderClass}`}>
              <span className={`font-headline-md text-[13px] truncate ${col.isToday ? 'font-bold' : ''} ${col.headerText}`}>
                {col.label}
              </span>
              <span className={`text-[10px] font-medium shrink-0 ml-1 ${col.headerText}`}>
                {col.date}
              </span>
            </div>

            {/* Services — scrollable */}
            <div className="flex-1 flex flex-col gap-1 px-1.5 overflow-y-auto min-h-0 hide-scrollbar">
              <AnimatePresence mode="popLayout">
                {colServices.length > 0 ? (
                  colServices.map((service, svcIndex) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: svcIndex * 0.03 }}
                    >
                      <ServiceCard 
                        service={service} 
                        onDoubleClick={handleDoubleClick}
                        isSelected={selectedServiceIds.has(service.id)}
                        onSelect={toggleServiceSelection}
                      />
                    </motion.div>
                  ))
                ) : (
                  <EmptyDay onClick={() => onNavigate('new_service', 'slide_up')} />
                )}
              </AnimatePresence>
            </div>

            {/* Service count — pinned to bottom */}
            {colServices.length > 0 && (
              <div className={`shrink-0 text-[10px] font-medium text-center py-1 border-t ${col.borderClass} ${col.headerBg} ${col.headerText}`}>
                {colServices.length} services
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div id="master-calendar-screen" className="flex flex-col gap-4 w-full max-w-[1400px] mx-auto p-4 md:p-6 h-full overflow-y-auto">
      {/* Header Area */}
      <div id="calendar-header-area" className="flex flex-col md:flex-row md:items-end justify-between gap-3 shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Master Calendar</h1>
          <p className="text-[13px] text-on-surface-variant">
            {viewMode === 'month' 
              ? `${getMonthName(baseDate.getMonth())} ${baseDate.getFullYear()} — click a week to zoom in`
              : viewMode === 'day'
                ? `Viewing ${formatDateKey(baseDate)} — day detail view`
                : selectedDay 
                  ? `Viewing ${selectedDay} — click Back to return to week`
                  : 'Manage scheduling across all active transport projects.'
            }
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex bg-surface-container rounded-lg overflow-hidden border border-outline-variant">
            <button
              onClick={() => { onViewModeChange('day'); setSelectedDay(null); }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-medium transition-colors cursor-pointer ${
                viewMode === 'day' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-dim'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Day</span>
            </button>
            <button
              onClick={() => { onViewModeChange('week'); setSelectedDay(null); }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-medium transition-colors cursor-pointer ${
                viewMode === 'week' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-dim'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Week</span>
            </button>
            <button
              onClick={() => { onViewModeChange('month'); setSelectedDay(null); }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-medium transition-colors cursor-pointer ${
                viewMode === 'month' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-dim'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Month</span>
            </button>
          </div>

          <button 
            onClick={goToPrev}
            className="flex items-center justify-center w-8 h-8 bg-surface-container-lowest border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-container-low hover:text-on-surface transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className={`flex items-center gap-1.5 sm:gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] sm:text-[13px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-surface-container-low transition-colors shrink-0 max-w-[160px] sm:max-w-none ${isTodayVisible ? 'border-primary text-primary' : ''}`}
          >
            <CalendarIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">{dateRangeLabel}</span>
          </button>
          <button 
            onClick={goToNext}
            className="flex items-center justify-center w-8 h-8 bg-surface-container-lowest border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-container-low hover:text-on-surface transition-colors shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          <button 
            id="add-service-cta-btn"
            onClick={() => onNavigate('new_service', 'slide_up')}
            className="flex items-center gap-1.5 sm:gap-2 bg-primary text-on-primary text-[12px] font-medium px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-primary-hover transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Service</span>
          </button>

          <button 
            onClick={() => onNavigate('transport_list', 'none')}
            className="flex items-center gap-1.5 sm:gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface-variant text-[12px] font-medium px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import Excel</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div id="calendar-filter-bento" className="flex flex-col gap-3 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg shrink-0">
        <div className="flex flex-col lg:flex-row justify-between gap-3 items-start lg:items-center">
          <div id="company-entity-selector" className="flex bg-surface-container rounded-md overflow-x-auto max-w-full">
            {['All', ...companies.map(c => c.name)].map(entity => (
              <button 
                key={entity}
                onClick={() => setActiveEntity(entity)}
                className={`px-3 py-1.5 rounded text-[12px] font-sans font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeEntity === entity ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {entity === 'All' ? 'All' : entity}
              </button>
            ))}
          </div>

          <div id="project-filter-pills" className="flex flex-wrap gap-1.5 items-center">
            {projectOptions.map(proj => (
              <button
                key={proj}
                onClick={() => toggleProject(proj)}
                className={`px-2.5 py-1 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                  selectedProjects.includes(proj)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {proj}
              </button>
            ))}
            {selectedProjects.length > 0 && (
              <button
                onClick={() => setSelectedProjects([])}
                className="text-primary text-[11px] font-medium underline hover:text-primary-hover ml-1"
              >
                Clear
              </button>
            )}
            
            {/* Select All Week button (only in week view) */}
            {viewMode === 'week' && !selectedDay && filteredServices.length > 0 && (
              <button
                onClick={selectAllServicesForWeek}
                className="ml-2 px-2.5 py-1 rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low text-[11px] font-medium transition-colors"
              >
                Select All Week
              </button>
            )}

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors cursor-pointer ${
                showAdvancedFilters || driverFilter !== 'All' || clientFilter !== 'All' || vehicleTypeFilter !== 'All'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
              {(driverFilter !== 'All' || clientFilter !== 'All' || vehicleTypeFilter !== 'All') && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-outline-variant/50">
            {/* Driver Filter - Searchable */}
            <div className="flex flex-col gap-1 flex-1 min-w-0 relative" data-filter-dropdown>
              <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Driver</label>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  data-driver-search="true"
                  value={showDriverDropdown ? driverSearch : (driverFilter === 'All' ? '' : driverFilter)}
                  onChange={e => {
                    setDriverSearch(e.target.value);
                    setShowDriverDropdown(true);
                    if (e.target.value === '') setDriverFilter('All');
                  }}
                  onInput={e => {
                    const val = (e.target as HTMLInputElement).value;
                    setDriverSearch(val);
                    setShowDriverDropdown(true);
                    if (val === '') setDriverFilter('All');
                  }}
                  onFocus={() => { setShowDriverDropdown(true); setDriverSearch(''); }}
                  placeholder="Search driver..."
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1.5 text-[12px] text-on-surface focus:outline-none focus:border-primary w-full"
                />
                {showDriverDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    <button
                      onClick={() => { setDriverFilter('All'); setDriverSearch(''); setShowDriverDropdown(false); }}
                      className={`w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-surface-dim ${driverFilter === 'All' ? 'text-primary font-medium bg-primary/5' : 'text-on-surface'}`}
                    >
                      All Drivers
                    </button>
                    {filteredDriverOptions.map(d => (
                      <button
                        key={d}
                        onClick={() => { setDriverFilter(d); setDriverSearch(d); setShowDriverDropdown(false); }}
                        className={`w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-surface-dim ${driverFilter === d ? 'text-primary font-medium bg-primary/5' : 'text-on-surface'}`}
                      >
                        {d}
                      </button>
                    ))}
                    {filteredDriverOptions.length === 0 && driverSearch && (
                      <div className="px-2.5 py-1.5 text-[11px] text-on-surface-variant italic">No drivers found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Client Filter - Searchable */}
            <div className="flex flex-col gap-1 flex-1 min-w-0 relative" data-filter-dropdown>
              <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Client</label>
              <div className="relative">
                <input
                  type="text"
                  value={showClientDropdown ? clientSearch : (clientFilter === 'All' ? '' : clientFilter)}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                    if (e.target.value === '') setClientFilter('All');
                  }}
                  onFocus={() => { setShowClientDropdown(true); setClientSearch(''); }}
                  placeholder="Search client..."
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1.5 text-[12px] text-on-surface focus:outline-none focus:border-primary w-full"
                />
                {showClientDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    <button
                      onClick={() => { setClientFilter('All'); setClientSearch(''); setShowClientDropdown(false); }}
                      className={`w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-surface-dim ${clientFilter === 'All' ? 'text-primary font-medium bg-primary/5' : 'text-on-surface'}`}
                    >
                      All Clients
                    </button>
                    {filteredClientOptions.map(c => (
                      <button
                        key={c}
                        onClick={() => { setClientFilter(c); setClientSearch(c); setShowClientDropdown(false); }}
                        className={`w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-surface-dim ${clientFilter === c ? 'text-primary font-medium bg-primary/5' : 'text-on-surface'}`}
                      >
                        {c}
                      </button>
                    ))}
                    {filteredClientOptions.length === 0 && clientSearch && (
                      <div className="px-2.5 py-1.5 text-[11px] text-on-surface-variant italic">No clients found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Type Filter */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Service Type</label>
              <select
                value={vehicleTypeFilter}
                onChange={e => setVehicleTypeFilter(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1.5 text-[12px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="All">All Types</option>
                {vehicleTypeOptions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Clear Advanced Filters */}
            {(driverFilter !== 'All' || clientFilter !== 'All' || vehicleTypeFilter !== 'All') && (
              <div className="flex items-end">
                <button
                  onClick={() => { setDriverFilter('All'); setClientFilter('All'); setVehicleTypeFilter('All'); }}
                  className="px-2.5 py-1.5 text-[11px] text-primary font-medium hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar Content */}
      <div id="calendar-grid-container" className="flex-1 overflow-y-auto pb-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && selectedDay && renderDayDetail()}
            {viewMode === 'week' && !selectedDay && renderWeekView()}
            {viewMode === 'day' && renderDayDetail()}
          </>
        )}
      </div>

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
                        <option value="Van Disposal">Van Disposal</option>
                        <option value="Van Transfer">Van Transfer</option>
                        <option value="Production Van">Production Van</option>
                        <option value="Cast Van">Cast Van</option>
                        <option value="Car">Car</option>
                        <option value="Minivan">Minivan</option>
                        <option value="Bus">Bus</option>
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
                  {/* Status */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Status</label>
                    <select value={editForm.status || 'Scheduled'} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as Service['status'] }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary">
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
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
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Route</span>
                {collapsedSections.route ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              {!collapsedSections.route && (
                <div className="flex flex-col gap-3 pb-3 border-b border-outline-variant/30">
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
                          const cost = type === 'piena' ? 50 : type === 'mezza' ? 35 : 0;
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
                        <option value="mezza">Mezza (€35)</option>
                        <option value="piena">Piena (€50)</option>
                      </select>
                    </div>

                    {/* Km Over Input */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Km Over (Extra km beyond 100 included)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={editForm.kmOver ?? ''}
                          onChange={e => {
                            const kmOver = parseInt(e.target.value) || 0;
                            setEditForm(prev => ({ 
                              ...prev, 
                              kmOver,
                              kmOverCost: kmOver * 1.50, // €1.50 per extra km
                            }));
                          }}
                          className="w-24 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                          placeholder="0"
                        />
                        <span className="text-[12px] text-on-surface-variant">km</span>
                        {editForm.kmOver && editForm.kmOver > 0 && (
                          <span className="text-[12px] text-amber-600 font-medium">
                            +€{(editForm.kmOver * 1.50).toFixed(2)}
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

      {/* Bulk Actions Floating Button */}
      <AnimatePresence>
        {selectedServiceIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-[13px] font-medium text-on-surface">
                  {selectedServiceIds.size} selected
                </span>
              </div>
              
              <div className="w-px h-6 bg-outline-variant" />
              
              <button
                onClick={clearSelection}
                className="text-[12px] text-on-surface-variant font-medium hover:underline"
              >
                Clear
              </button>
              
              <div className="w-px h-6 bg-outline-variant" />
              
              <button
                onClick={markSelectedAsCompleted}
                disabled={isBulkCompleting}
                className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-full text-[12px] font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isBulkCompleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Mark as Completed
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
