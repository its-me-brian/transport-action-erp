import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  X, 
  History, 
  Route, 
  CheckCircle,
  Loader2,
  Calendar,
  Users,
  Building2,
  ExternalLink,
  AlertCircle,
  ChevronRight,
  Check,
  Send,
  Eye,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { 
  Service, Driver, ScreenId, dateKeyFromAny, calculateServiceCosts, 
  parseDriverReport, parseMultipleDriverReports, 
  getDiariaCost, getKmOverCost, formatTimeDisplay, isProductionVehicle
} from '../types';
import { 
  getRapportinoClients,
  getRapportinoDrivers,
  reviewRapportinoClient,
  sendRapportinoClient,
  acceptRapportinoClient,
  facturarRapportino,
  reviewRapportinoDriver,
  sendRapportinoDriver,
  acceptRapportinoDriver,
  payRapportinoDriver,
  sendRapportinoCollaborator,
  acceptRapportinoCollaborator,
  payRapportinoCollaborator,
  RapportinoClientDTO,
  RapportinoDriverDTO,
  updateServiceField,
  createRapportinoClient,
  createRapportinoDriver,
  createRapportinoCollaborator,
  addServiceToRapportino,
  addServiceToRapportinoCollaborator,
  getCollaborators,
  CollaboratorDTO
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ReportsScreenProps {
  services: Service[];
  drivers: Driver[];
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
  onServiceUpdate?: (serviceId: string, updates: Partial<Service>) => void;
}

type RapportinoType = 'production' | 'driver' | 'collaborator' | 'weekly' | 'daily';

type DomainStatus = 'Borrador' | 'Revisado' | 'Enviado' | 'Aceptado' | 'Facturado' | 'Pagado';

interface GeneratedRapportino {
  sheetName: string;
  sheetUrl: string;
  rapportinoId: string;
  totalServices: number;
  totalCost: number;
  type: RapportinoType;
  label: string;
  dateFrom?: string;
  dateTo?: string;
  status: DomainStatus;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; nextStatus: DomainStatus | null; nextAction?: string }> = {
  'Borrador':   { color: 'text-gray-700',     bg: 'bg-gray-100',     icon: <Clock className="w-3 h-3" />,    nextStatus: 'Revisado', nextAction: 'review' },
  'Revisado':   { color: 'text-blue-700',     bg: 'bg-blue-100',     icon: <Eye className="w-3 h-3" />,      nextStatus: 'Enviado',  nextAction: 'send' },
  'Enviado':    { color: 'text-purple-700',   bg: 'bg-purple-100',   icon: <Send className="w-3 h-3" />,     nextStatus: 'Aceptado', nextAction: 'accept' },
  'Aceptado':   { color: 'text-amber-700',    bg: 'bg-amber-100',    icon: <Check className="w-3 h-3" />,    nextStatus: null },
  'Facturado':  { color: 'text-emerald-700',  bg: 'bg-emerald-100',  icon: <Check className="w-3 h-3" />,    nextStatus: null },
  'Pagado':     { color: 'text-emerald-700',  bg: 'bg-emerald-100',  icon: <Check className="w-3 h-3" />,    nextStatus: null },
};

export default function ReportsScreen({ services, drivers, onNavigate, onServiceUpdate }: ReportsScreenProps) {
  const { token } = useAuth();
  
  // Rapportino generation state
  const [rapportinoType, setRapportinoType] = useState<RapportinoType>('production');
  const [periodType, setPeriodType] = useState<string>('weekly');
  const [selectedProduction, setSelectedProduction] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedCollaborator, setSelectedCollaborator] = useState('');
  const [collaboratorsList, setCollaboratorsList] = useState<CollaboratorDTO[]>([]);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedList, setGeneratedList] = useState<GeneratedRapportino[]>([]);
  const [generationError, setGenerationError] = useState('');
  
  // Status filter
  const [statusFilter, setStatusFilter] = useState<DomainStatus | 'All'>('All');
  
  // Load statuses on mount
  useEffect(() => {
    loadStatuses();
    // Load collaborators for rapportino generation
    getCollaborators({ active: true }).then(setCollaboratorsList).catch(e => console.error('Failed to load collaborators:', e));
  }, []);

  // Close driver dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowDriverDropdown(false);
    if (showDriverDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDriverDropdown]);

  const loadStatuses = async () => {
    try {
      // Load from domain endpoints (RapportinoClients + RapportinoDrivers)
      const [clientRaps, driverRaps] = await Promise.all([
        getRapportinoClients().catch(() => []),
        getRapportinoDrivers().catch(() => [])
      ]);

      setGeneratedList(prev => {
        const merged = [...prev];

        (clientRaps || []).forEach((r: RapportinoClientDTO) => {
          const existing = merged.find(m => m.rapportinoId === r.id);
          if (existing) {
            existing.status = r.status as DomainStatus;
          } else {
            merged.push({
              sheetName: r.id || '',
              sheetUrl: '',
              rapportinoId: r.id || '',
              totalServices: 0,
              totalCost: 0,
              type: 'production',
              label: r.clientId || r.id || '',
              dateFrom: r.weekStart,
              dateTo: r.weekEnd,
              status: (r.status as DomainStatus) || 'Borrador'
            });
          }
        });

        (driverRaps || []).forEach((r: RapportinoDriverDTO) => {
          const existing = merged.find(m => m.rapportinoId === r.id);
          if (existing) {
            existing.status = r.status as DomainStatus;
          } else {
            merged.push({
              sheetName: r.id || '',
              sheetUrl: '',
              rapportinoId: r.id || '',
              totalServices: 0,
              totalCost: 0,
              type: 'driver',
              label: r.driverId || r.id || '',
              dateFrom: r.weekStart,
              dateTo: r.weekEnd,
              status: (r.status as DomainStatus) || 'Borrador'
            });
          }
        });

        return merged;
      });
    } catch (err) {
      console.warn('Failed to load rapportino statuses:', err);
    }
  };

  // Extract unique productions and drivers from services
  const productions = useMemo(() => {
    const set = new Set(services.map(s => s.project).filter(Boolean));
    return Array.from(set).sort();
  }, [services]);

  const driverNames = useMemo(() => {
    const set = new Set(services.map(s => s.driverName).filter(Boolean));
    return Array.from(set).sort();
  }, [services]);

  // Filter services based on selected criteria
  const filteredServices = useMemo(() => {
    let result = services.filter(s => s.operationalStatus === 'Validado' && !isProductionVehicle(s));
    
    if (rapportinoType === 'production' && selectedProduction) {
      result = result.filter(s => s.project === selectedProduction);
    } else if (rapportinoType === 'driver' && selectedDriver) {
      result = result.filter(s => s.driverName === selectedDriver);
    } else if (rapportinoType === 'collaborator' && selectedCollaborator) {
      // Filter by services assigned to this collaborator's drivers
      const collab = collaboratorsList.find(c => c.id === selectedCollaborator);
      if (collab) {
        result = result.filter(s => s.driverName === collab.name || s.driverId === collab.id);
      }
    }
    
    if (dateFrom) {
      result = result.filter(s => dateKeyFromAny(s.date) >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(s => dateKeyFromAny(s.date) <= dateTo);
    }
    
    return result;
  }, [services, rapportinoType, selectedProduction, selectedDriver, selectedCollaborator, collaboratorsList, dateFrom, dateTo]);

  // Filter generated list by status
  const filteredGeneratedList = useMemo(() => {
    if (statusFilter === 'All') return generatedList;
    return generatedList.filter(r => r.status === statusFilter);
  }, [generatedList, statusFilter]);

  // Generate rapportino using domain API
  const handleGenerate = async () => {
    const servicesToUse = getSelectedServices();
    if (servicesToUse.length === 0) {
      setGenerationError('No completed services match the selected filters.');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');

    try {
      let rapportinoId = '';
      let rapportinoStatus: DomainStatus = 'Borrador';

      // Resolve IDs from filtered services (never use names as IDs)
      const firstWithProject = servicesToUse.find(s => s.backendProjectId);
      const firstWithDriver = servicesToUse.find(s => s.driverId);

      if (rapportinoType === 'driver') {
        // Create driver rapportino
        const projectId = firstWithProject?.backendProjectId || '';
        const driverId = selectedDriver
          ? (firstWithDriver?.driverId || '')
          : (firstWithDriver?.driverId || '');
        if (!driverId) {
          setGenerationError('Cannot resolve driver ID. Ensure services have driver assignments.');
          setIsGenerating(false);
          return;
        }
        const result = await createRapportinoDriver(projectId, driverId, dateFrom || '', dateTo || '', periodType);
        rapportinoId = result.id || '';
        rapportinoStatus = (result.status as DomainStatus) || 'Borrador';
      } else if (rapportinoType === 'collaborator') {
        // Create collaborator rapportino
        const projectId = firstWithProject?.backendProjectId || '';
        const collabId = selectedCollaborator || '';
        if (!collabId) {
          setGenerationError('Select a collaborator.');
          setIsGenerating(false);
          return;
        }
        const result = await createRapportinoCollaborator(projectId, collabId, dateFrom || '', dateTo || '', periodType);
        rapportinoId = result.id || '';
        rapportinoStatus = (result.status as DomainStatus) || 'Borrador';
      } else {
        // Create client rapportino (production/weekly/daily)
        const projectId = firstWithProject?.backendProjectId || '';
        const clientId = servicesToUse[0]?.clientId || '';
        const result = await createRapportinoClient(projectId, clientId, dateFrom || '', dateTo || '', periodType);
        rapportinoId = result.id || '';
        rapportinoStatus = (result.status as DomainStatus) || 'Borrador';
      }

      if (!rapportinoId) {
        setGenerationError('Failed to create rapportino. No ID returned.');
        return;
      }

      // Add selected services to the rapportino
      let addedCount = 0;
      for (const svc of servicesToUse) {
        const addResult = rapportinoType === 'collaborator'
          ? await addServiceToRapportinoCollaborator(rapportinoId, svc.id)
          : await addServiceToRapportino(rapportinoId, svc.id);
        if (!addResult.error) addedCount++;
      }

      // Build label
      let label = rapportinoName.trim() || '';
      if (!label) {
        if (rapportinoType === 'production') label = selectedProduction || 'All Productions';
        else if (rapportinoType === 'driver') label = selectedDriver || 'All Drivers';
        else if (rapportinoType === 'weekly') label = `Weekly ${dateFrom || '...'} - ${dateTo || '...'}`;
        else label = `Daily ${dateFrom || new Date().toLocaleDateString()}`;
      }

      const totalCost = servicesToUse.reduce((sum, s) => sum + calculateServiceCosts(s).totalCost, 0);

      const entry: GeneratedRapportino = {
        sheetName: label,
        sheetUrl: '',
        rapportinoId,
        totalServices: addedCount,
        totalCost,
        type: rapportinoType,
        label,
        dateFrom,
        dateTo,
        status: rapportinoStatus
      };

      setGeneratedList(prev => [entry, ...prev]);
    } catch (err) {
      setGenerationError('Failed to generate rapportino. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Advance status via domain endpoints
  const handleAdvanceStatus = async (rapportino: GeneratedRapportino) => {
    const config = STATUS_CONFIG[rapportino.status];
    if (!config.nextStatus || !config.nextAction) return;

    try {
      let result: any = null;
      const action = config.nextAction;
      const id = rapportino.rapportinoId;

      // Determine rapportino type
      const isDriver = rapportino.type === 'driver';
      const isCollaborator = rapportino.type === 'collaborator';

      if (isCollaborator) {
        switch (action) {
          case 'send':   result = await sendRapportinoCollaborator(id); break;
          case 'accept': result = await acceptRapportinoCollaborator(id); break;
          case 'pay':    result = await payRapportinoCollaborator(id); break;
        }
      } else if (isDriver) {
        switch (action) {
          case 'review': result = await reviewRapportinoDriver(id); break;
          case 'send':   result = await sendRapportinoDriver(id); break;
          case 'accept': result = await acceptRapportinoDriver(id); break;
          case 'pay':    result = await payRapportinoDriver(id); break;
        }
      } else {
        switch (action) {
          case 'review': result = await reviewRapportinoClient(id); break;
          case 'send':   result = await sendRapportinoClient(id); break;
          case 'accept': result = await acceptRapportinoClient(id); break;
          case 'facturar': result = await facturarRapportino(id); break;
        }
      }

      if (result?.error) {
        console.error('Failed to update status:', result.error);
        return;
      }

      setGeneratedList(prev => 
        prev.map(r => 
          r.rapportinoId === rapportino.rapportinoId 
            ? { ...r, status: config.nextStatus! }
            : r
        )
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Summary stats
  const totalCost = useMemo(() => {
    return filteredServices.reduce((sum, s) => sum + calculateServiceCosts(s).totalCost, 0);
  }, [filteredServices]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: generatedList.length };
    generatedList.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [generatedList]);

  // Calculate total hours from all completed services
  const totalHours = useMemo(() => {
    return services.filter(s => s.status === 'Completed').reduce((sum, svc) => {
      if (svc.startTime && svc.endTime) {
        const startParts = svc.startTime.replace('.', ':').split(':');
        const endParts = svc.endTime.replace('.', ':').split(':');
        if (startParts.length === 2 && endParts.length === 2) {
          const startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
          let endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
          if (endMin <= startMin) endMin += 1440;
          return sum + (endMin - startMin) / 60;
        }
      }
      return sum + 8; // fallback to 8 hours if no start/end time
    }, 0);
  }, [services]);

  // WhatsApp parser state
  const [whatsappText, setWhatsappText] = useState('');
  const [parsedReports, setParsedReports] = useState<import('../types').DriverReport[]>([]);
  const [showWhatsAppSection, setShowWhatsAppSection] = useState(false);
  const [matchedServices, setMatchedServices] = useState<Map<number, Service[]>>(new Map());
  const [applyingReport, setApplyingReport] = useState<number | null>(null);
  
  // Rapportino selection & naming
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [rapportinoName, setRapportinoName] = useState('');

  // Parse WhatsApp text and match with services
  const handleParseWhatsApp = () => {
    if (!whatsappText.trim()) return;
    
    const reports = parseMultipleDriverReports(whatsappText);
    if (reports.length === 0) {
      const single = parseDriverReport(whatsappText);
      if (single) {
        setParsedReports([single]);
        matchReportsToServices([single]);
      }
      return;
    }
    
    setParsedReports(reports);
    matchReportsToServices(reports);
  };

  // Match parsed reports to existing services by date + driver name + start time
  const matchReportsToServices = (reports: import('../types').DriverReport[]) => {
    const matches = new Map<number, Service[]>();
    
    reports.forEach((report, idx) => {
      const reportDate = report.dateParsed || '';
      const reportDriver = report.driverName.toLowerCase();
      const reportStartTime = (report.start || '').replace('.', ':');
      
      const matched = services.filter(s => {
        // 1. Date must match exactly
        const dateMatch = s.date === reportDate;
        if (!dateMatch) return false;
        
        // 2. Driver name must match (fuzzy: any word > 2 chars)
        const driverWords = reportDriver.split(/\s+/);
        const driverMatch = driverWords.some(word => 
          word.length > 2 && (s.driverName || '').toLowerCase().includes(word)
        );
        if (!driverMatch) return false;
        
        // 3. If report has startTime, service startTime should match (within 30min tolerance)
        if (reportStartTime && s.startTime) {
          const svcStart = (s.startTime || '').replace('.', ':');
          const reportMin = timeToMin(reportStartTime);
          const svcMin = timeToMin(svcStart);
          if (reportMin >= 0 && svcMin >= 0) {
            return Math.abs(reportMin - svcMin) <= 30; // 30 min tolerance
          }
        }
        
        // If no startTime to compare, date + driver is enough
        return true;
      });
      
      if (matched.length > 0) {
        matches.set(idx, matched);
      }
    });
    
    setMatchedServices(matches);
  };

  // Helper: convert "HH:MM" to minutes since midnight
  const timeToMin = (t: string): number => {
    const parts = t.split(':');
    if (parts.length !== 2) return -1;
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  };

  // Build service description like backend: "DA FROM PER TO"
  const buildServiceDescription = (svc: Service): string => {
    const parts: string[] = [];
    if (svc.from) parts.push('DA ' + svc.from.toUpperCase());
    if (svc.to) parts.push('PER ' + svc.to.toUpperCase());
    if (parts.length === 0 && svc.notes) parts.push(svc.notes.toUpperCase());
    return parts.join(' ') || 'SERVICE';
  };

  // Map vehicle to service type like backend _mapVehicleToServiceType
  const mapVehicleToType = (vehicleType: string): string => {
    const v = (vehicleType || '').toUpperCase();
    if (v.indexOf('TRANSFER') > -1 || v.indexOf('AIRPORT') > -1 || v.indexOf('AEROPUERTO') > -1) {
      return v.indexOf('VAN') > -1 ? 'VAN TRANSFER' : 'CAR TRANSFER';
    }
    if (v.indexOf('DISPO') > -1) {
      return v.indexOf('CAR') > -1 ? 'CAR TRANSFER-DI DISPO' : 'VAN DISPO';
    }
    if (v.indexOf('VAN') > -1) return 'VAN TRANSFER';
    if (v.indexOf('CAR') > -1) return 'CAR TRANSFER';
    return 'VAN DISPO'; // default
  };

  // Calculate hours worked from start/end time
  const calcHoursWorked = (svc: Service): number => {
    if (svc.startTime && svc.endTime) {
      const startParts = svc.startTime.replace('.', ':').split(':');
      const endParts = svc.endTime.replace('.', ':').split(':');
      if (startParts.length === 2 && endParts.length === 2) {
        const startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        let endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
        if (endMin <= startMin) endMin += 1440;
        return (endMin - startMin) / 60;
      }
    }
    return 0;
  };

  // Calculate notturno hours (21:30 - 06:30)
  const calcNotturnoHours = (startTime: string, endTime: string): number => {
    const start = timeToMin(startTime);
    const end = timeToMin(endTime);
    if (isNaN(start) || isNaN(end)) return 0;
    // Night period: 21:30 (1290min) to 06:30 (390min next day)
    let nightHours = 0;
    if (start >= 1290) {
      // Started during night
      if (end <= 390) {
        nightHours = (end + 1440 - start) / 60;
      } else {
        nightHours = (1440 - start) / 60 + 0; // until midnight
        if (nightHours < 0) nightHours = 0;
      }
    } else if (start < 390) {
      // Started before morning end
      if (end <= 390) {
        nightHours = (end - start) / 60;
      } else {
        nightHours = (390 - start) / 60;
      }
    } else if (end > 1290 || end <= 390) {
      // Shift crosses into night
      const endNight = end <= 390 ? end + 1440 : end;
      nightHours = (endNight - Math.max(start, 1290)) / 60;
    }
    return Math.max(0, nightHours);
  };

  // Full backend-accurate cost calculation for a service
  // Uses canonical calculateServiceCosts from types.ts, adds display fields
  const calcBackendCosts = (svc: Service) => {
    const costs = calculateServiceCosts(svc);
    const kmDriven = svc.km || 0;
    const hoursWorked = calcHoursWorked(svc);
    const notturnoHours = (svc.startTime && svc.endTime) ? calcNotturnoHours(svc.startTime, svc.endTime) : 0;
    // Overtime: only for dispo (hours > 10)
    const vehicleType = mapVehicleToType(svc.vehicleType);
    const isDispo = vehicleType.indexOf('DISPO') > -1;
    const overtimeHours = isDispo && hoursWorked > 10 ? hoursWorked - 10 : 0;
    
    return {
      baseCost: costs.baseCost,
      overtimeHours,
      overtimeCost: costs.notturnoCost, // hoursOver from backend
      kmDriven,
      kmCost: costs.kmOverCost,
      notturnoHours,
      notturnoCost: costs.notturnoCost,
      festivo: costs.festivo,
      diaria: costs.diariaCost,
      total: costs.totalCost,
      vehicleType,
      hoursWorked
    };
  };

  // Toggle service selection
  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  // Toggle all services
  const toggleSelectAll = () => {
    if (selectedServiceIds.size === filteredServices.length) {
      setSelectedServiceIds(new Set());
    } else {
      setSelectedServiceIds(new Set(filteredServices.map(s => s.id)));
    }
  };

  // Get selected services or all if none selected
  const getSelectedServices = (): Service[] => {
    if (selectedServiceIds.size === 0) return filteredServices;
    return filteredServices.filter(s => selectedServiceIds.has(s.id));
  };

  // Apply parsed report data to a service
  const handleApplyToService = async (reportIdx: number, service: Service) => {
    setApplyingReport(reportIdx);
    const report = parsedReports[reportIdx];
    
    try {
      const updates: Partial<Service> = {
        driverName: report.driverName,
        startTime: report.start,
        endTime: report.end,
        km: report.kmTotal,
        kmOver: report.kmOver,
        diariaType: report.diariaType,
        hasDiaria: report.diariaType !== 'none',
        diariaCost: getDiariaCost(report.diariaType),
        kmOverCost: getKmOverCost(report.kmOver),
      };
      
      const fieldsToUpdate: [string, any][] = [
        ['driver', report.driverName],
        ['startTime', report.start],
        ['endTime', report.end],
        ['km', report.kmTotal],
        ['kmOver', report.kmOver],
        ['diariaType', report.diariaType],
        ['hasDiaria', report.diariaType !== 'none'],
        ['diariaCost', getDiariaCost(report.diariaType)],
        ['kmOverCost', getKmOverCost(report.kmOver)],
      ];
      
      const failedFields: string[] = [];
      for (const [field, value] of fieldsToUpdate) {
        const result = await updateServiceField(service.id, field, value);
        if (result && !result.success) {
          failedFields.push(field);
        }
      }
      
      if (failedFields.length > 0) {
        console.warn(`Some fields could not be persisted: ${failedFields.join(', ')}`);
      }
      
      // Only update local state for fields that actually persisted
      onServiceUpdate?.(service.id, updates);
      
      // Remove service from matched list for this report
      setMatchedServices(prev => {
        const next = new Map<number, Service[]>(prev);
        const existing = next.get(reportIdx) ?? [];
        const remaining = existing.filter(s => s.id !== service.id);
        
        if (remaining.length === 0) {
          // No more matches for this report — remove it entirely
          next.delete(reportIdx);
          // Also remove from parsedReports
          setParsedReports(prev => prev.filter((_, i) => i !== reportIdx));
        } else {
          next.set(reportIdx, remaining);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to apply report:', err);
    } finally {
      setApplyingReport(null);
    }
  };

  return (
    <div id="reports-screen" className="flex-1 w-full max-w-[1200px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      {/* Header */}
      <div id="reports-header" className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Rapportino</h1>
          <p className="text-[13px] text-on-surface-variant">Generate cost breakdown reports for productions and drivers.</p>
        </div>
      </div>

      {/* WhatsApp Driver Reports Parser */}
      <section className="bg-surface-container-low rounded-xl border border-outline-variant">
        <button 
          onClick={() => setShowWhatsAppSection(!showWhatsAppSection)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="text-[14px] font-semibold text-on-surface">WhatsApp Driver Reports</span>
            {parsedReports.length > 0 && (
              <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {parsedReports.length} parsed
              </span>
            )}
          </div>
          {showWhatsAppSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showWhatsAppSection && (
          <div className="px-4 pb-4 space-y-3 border-t border-outline-variant">
            <p className="text-[12px] text-on-surface-variant pt-3">
              Paste driver WhatsApp reports. The system will search for matching services by date and driver name.
            </p>
            
            <textarea
              value={whatsappText}
              onChange={e => setWhatsappText(e.target.value)}
              className="w-full bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none font-mono"
              rows={5}
              placeholder={`Example:
Isidoro dragone
22/7/26
Inizio 8:30
Fine 18:30
Km tot 488
Km over 388
Diaria piena`}
            />
            
            <button
              onClick={handleParseWhatsApp}
              disabled={!whatsappText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-[13px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Parse & Match Services
            </button>

            {/* Parsed Reports with Matches */}
            {parsedReports.length > 0 && (
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-on-surface-variant">
                  Found {parsedReports.length} report{parsedReports.length > 1 ? 's' : ''}:
                </p>
                
                {parsedReports.map((report, idx) => {
                  const matches = matchedServices.get(idx) || [];
                  const diariaLabel = report.diariaType === 'piena' ? 'Piena' : 
                                     report.diariaType === 'mezza' ? 'Mezza' : 'None';
                  
                  return (
                    <div key={idx} className="bg-surface-dim rounded-lg p-3 border border-outline-variant">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[14px] font-medium text-on-surface">{report.driverName}</span>
                          <span className="text-[12px] text-on-surface-variant ml-2">{report.dateParsed || report.date}</span>
                        </div>
                        {matches.length > 0 && (
                          <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                            {matches.length} match{matches.length > 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] mb-2">
                        <div><span className="text-on-surface-variant">Inizio:</span> <span className="font-medium">{report.start || '—'}</span></div>
                        <div><span className="text-on-surface-variant">Fine:</span> <span className="font-medium">{report.end || '—'}</span></div>
                        <div><span className="text-on-surface-variant">Km:</span> <span className="font-medium">{report.kmTotal}</span></div>
                        <div><span className="text-on-surface-variant">Km Over:</span> <span className="font-medium text-amber-600">{report.kmOver}</span></div>
                        <div><span className="text-on-surface-variant">Diaria:</span> <span className="font-medium">{diariaLabel}</span></div>
                      </div>
                      
                      {/* Matching services */}
                      {matches.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-outline-variant/50">
                          <p className="text-[11px] text-on-surface-variant font-medium">Matching services:</p>
                          {matches.map(service => (
                            <div key={service.id} className="bg-surface rounded-lg px-3 py-2 border border-outline-variant/30">
                              {/* Top row: time + status */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px] font-bold text-primary">{formatTimeDisplay(service.time)}</span>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    service.status === 'Completed' ? 'bg-primary/10 text-primary'
                                    : service.status === 'In Transit' ? 'bg-secondary-container text-on-secondary-container'
                                    : service.status === 'In Progress' ? 'bg-amber-100 text-amber-800'
                                    : 'bg-surface-container text-on-surface-variant'
                                  }`}>{service.status}</span>
                                </div>
                                <button
                                  onClick={() => handleApplyToService(idx, service)}
                                  disabled={applyingReport === idx}
                                  className="text-[11px] bg-primary text-on-primary px-2.5 py-1 rounded hover:bg-primary-hover transition-colors disabled:opacity-50 shrink-0"
                                >
                                  {applyingReport === idx ? '...' : 'Apply'}
                                </button>
                              </div>
                              {/* Driver + vehicle */}
                              <div className="flex items-center gap-2 text-[11px] text-on-surface mb-0.5">
                                <span className="font-medium">{service.driverName || 'Unassigned'}</span>
                                <span className="text-on-surface-variant">·</span>
                                <span className="text-on-surface-variant">{service.vehicleType || '—'}</span>
                                {service.vehiclePlate && (
                                  <>
                                    <span className="text-on-surface-variant">·</span>
                                    <span className="text-on-surface-variant">{service.vehiclePlate}</span>
                                  </>
                                )}
                              </div>
                              {/* Route: from → to */}
                              <div className="text-[11px] text-on-surface-variant truncate">
                                {service.from || '—'} → {service.to || '—'}
                              </div>
                              {/* Passengers */}
                              {service.passengers && service.passengers.length > 0 && (
                                <div className="text-[10px] text-on-surface-variant mt-0.5 truncate">
                                  👤 {service.passengers}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {matches.length === 0 && (
                        <p className="text-[11px] text-amber-600 pt-2 border-t border-outline-variant/50">
                          ⚠ No matching services found for this date/driver
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Rapportino Generator */}
      <section id="rapportino-generator" className="bg-surface-container-low rounded-xl border border-outline-variant p-4 space-y-4">
        <div className="flex items-center gap-2 text-on-surface">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <h2 className="text-[14px] font-semibold">Generate Rapportino</h2>
        </div>

        {/* Type Selector */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { value: 'production', label: 'By Production', icon: Building2 },
            { value: 'driver', label: 'By Driver', icon: Users },
            { value: 'collaborator', label: 'By Collaborator', icon: Users },
            { value: 'weekly', label: 'Weekly Summary', icon: Calendar },
            { value: 'daily', label: 'Daily Summary', icon: FileSpreadsheet }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setRapportinoType(value as RapportinoType)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors ${
                rapportinoType === value
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-dim'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Filters based on type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {rapportinoType === 'production' && (
            <div className="space-y-0.5">
              <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Production</label>
              <select
                value={selectedProduction}
                onChange={e => setSelectedProduction(e.target.value)}
                className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
              >
                <option value="">All Productions</option>
                {productions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {rapportinoType === 'driver' && (
            <div className="space-y-0.5 relative">
              <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Driver</label>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  data-driver-search="true"
                  value={selectedDriver || (driverSearchQuery || '')}
                  onChange={e => {
                    const val = e.target.value;
                    setDriverSearchQuery(val);
                    setSelectedDriver('');
                    setShowDriverDropdown(true);
                  }}
                  onInput={e => {
                    const val = (e.target as HTMLInputElement).value;
                    setDriverSearchQuery(val);
                    setSelectedDriver('');
                    setShowDriverDropdown(true);
                  }}
                  onFocus={() => setShowDriverDropdown(true)}
                  placeholder="Search drivers..."
                  className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
                />
                {showDriverDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedDriver('');
                        setDriverSearchQuery('');
                        setShowDriverDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[12px] hover:bg-surface-dim transition-colors text-on-surface"
                    >
                      All Drivers
                    </button>
                    {driverNames
                      .filter(d => !driverSearchQuery || d.toLowerCase().includes(driverSearchQuery.toLowerCase()))
                      .map(d => (
                        <button
                          key={d}
                          onClick={() => {
                            setSelectedDriver(d);
                            setDriverSearchQuery('');
                            setShowDriverDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-[12px] hover:bg-surface-dim transition-colors ${
                            selectedDriver === d ? 'bg-primary/10 text-primary font-medium' : 'text-on-surface'
                          }`}
                        >
                          {d}
                        </button>
                      ))
                    }
                    {driverNames.filter(d => !driverSearchQuery || d.toLowerCase().includes(driverSearchQuery.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-[12px] text-on-surface-variant">No drivers found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {rapportinoType === 'collaborator' && (
            <div className="space-y-0.5">
              <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Collaborator</label>
              <select
                value={selectedCollaborator}
                onChange={e => setSelectedCollaborator(e.target.value)}
                className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
              >
                <option value="">All Collaborators</option>
                {collaboratorsList.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-0.5">
            <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
            />
          </div>

          <div className="space-y-0.5">
            <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
            />
          </div>

          <div className="space-y-0.5">
            <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Period Type</label>
            <select
              value={periodType}
              onChange={e => setPeriodType(e.target.value)}
              className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3 cursor-pointer"
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
        </div>

        {/* Rapportino Name */}
        <div className="space-y-0.5">
          <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Rapportino Name (optional)</label>
          <input
            type="text"
            value={rapportinoName}
            onChange={e => setRapportinoName(e.target.value)}
            placeholder={rapportinoType === 'production' ? selectedProduction || 'Production Name' : rapportinoType === 'driver' ? selectedDriver || 'Driver Name' : 'Rapportino Name'}
            className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
          />
        </div>

        {/* Rapportino Preview */}
        {filteredServices.length > 0 && (
          <div className="mt-4 p-4 bg-surface-dim rounded-xl border border-outline-variant">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-on-surface flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                Preview ({getSelectedServices().length} of {filteredServices.length} selected)
              </h3>
              <span className="text-[12px] text-on-surface-variant">
                Total: <span className="font-semibold text-primary">€ {getSelectedServices().reduce((sum, s) => sum + calcBackendCosts(s).total, 0).toFixed(2)}</span>
              </span>
            </div>
            
            {/* Preview table — 16 columns matching backend */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#388E3C] text-white">
                    <th className="px-1 py-1.5 text-center font-medium w-[30px]">
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.size === filteredServices.length && filteredServices.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-white"
                      />
                    </th>
                    <th className="px-1.5 py-1.5 text-left font-medium">DATE</th>
                    <th className="px-1.5 py-1.5 text-left font-medium">START-END</th>
                    <th className="px-1.5 py-1.5 text-left font-medium">VAN/CAR</th>
                    <th className="px-1.5 py-1.5 text-left font-medium max-w-[180px]">SERVICE</th>
                    <th className="px-1.5 py-1.5 text-left font-medium">CLIENT</th>
                    <th className="px-1.5 py-1.5 text-left font-medium">DRIVER</th>
                    <th className="px-1.5 py-1.5 text-right font-medium">BASE</th>
                    <th className="px-1.5 py-1.5 text-right font-medium">OT H</th>
                    <th className="px-1.5 py-1.5 text-right font-medium">OT €</th>
                    <th className="px-1.5 py-1.5 text-right font-medium">KM</th>
                    <th className="px-1.5 py-1.5 text-right font-medium">KM €</th>
                    <th className="px-1.5 py-1.5 text-right font-medium">FEST</th>
                    <th className="px-1.5 py-1.5 text-right font-medium">NOT H</th>
                    <th className="px-1.5 py-1.5 text-right font-medium">NOT €</th>
                    <th className="px-1.5 py-1.5 text-right font-medium">DIARIA</th>
                    <th className="px-1.5 py-1.5 text-right font-medium">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {filteredServices.map((svc) => {
                    const c = calcBackendCosts(svc);
                    const startEnd = (svc.startTime && svc.endTime) 
                      ? `${formatTimeDisplay(svc.startTime)} - ${formatTimeDisplay(svc.endTime)}` 
                      : svc.time ? formatTimeDisplay(svc.time) : '—';
                    return (
                      <tr key={svc.id} className={`hover:bg-surface-container-lowest ${selectedServiceIds.has(svc.id) ? 'bg-primary/5' : ''}`}>
                        <td className="px-1 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={selectedServiceIds.has(svc.id)}
                            onChange={() => toggleServiceSelection(svc.id)}
                          />
                        </td>
                        <td className="px-1.5 py-1">{svc.date}</td>
                        <td className="px-1.5 py-1 font-medium">{startEnd}</td>
                        <td className="px-1.5 py-1">{c.vehicleType}</td>
                        <td className="px-1.5 py-1 truncate max-w-[180px]">{buildServiceDescription(svc)}</td>
                        <td className="px-1.5 py-1 truncate max-w-[120px]">{svc.passengers || '—'}</td>
                        <td className="px-1.5 py-1 font-medium">{svc.driverName || '—'}</td>
                        <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">€ {c.baseCost.toFixed(2)}</td>
                        <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">{c.overtimeHours > 0 ? c.overtimeHours.toFixed(1) : ''}</td>
                        <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">{c.overtimeCost > 0 ? `€ ${c.overtimeCost.toFixed(2)}` : ''}</td>
                        <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">{c.kmDriven > 0 ? c.kmDriven : ''}</td>
                        <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">{c.kmCost > 0 ? `€ ${c.kmCost.toFixed(2)}` : ''}</td>
                        <td className="px-1.5 py-1 text-right bg-[#F8BBD0]">{c.festivo > 0 ? `€ ${c.festivo.toFixed(2)}` : ''}</td>
                        <td className="px-1.5 py-1 text-right bg-[#F8BBD0]">{c.notturnoHours > 0 ? c.notturnoHours.toFixed(1) : ''}</td>
                        <td className="px-1.5 py-1 text-right bg-[#F8BBD0]">{c.notturnoCost > 0 ? `€ ${c.notturnoCost.toFixed(2)}` : ''}</td>
                        <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">{c.diaria > 0 ? `€ ${c.diaria.toFixed(2)}` : ''}</td>
                        <td className="px-1.5 py-1 text-right font-semibold bg-amber-50">€ {c.total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50 font-semibold text-[11px]">
                    <td colSpan={7} className="px-1.5 py-1.5">TOTAL ({getSelectedServices().length} services)</td>
                    <td className="px-1.5 py-1.5 text-right">€ {getSelectedServices().reduce((a, s) => a + calcBackendCosts(s).baseCost, 0).toFixed(2)}</td>
                    <td className="px-1.5 py-1.5 text-right">{getSelectedServices().reduce((a, s) => a + calcBackendCosts(s).overtimeHours, 0).toFixed(1)}</td>
                    <td className="px-1.5 py-1.5 text-right">€ {getSelectedServices().reduce((a, s) => a + calcBackendCosts(s).overtimeCost, 0).toFixed(2)}</td>
                    <td className="px-1.5 py-1.5 text-right">{getSelectedServices().reduce((a, s) => a + calcBackendCosts(s).kmDriven, 0)}</td>
                    <td className="px-1.5 py-1.5 text-right">€ {getSelectedServices().reduce((a, s) => a + calcBackendCosts(s).kmCost, 0).toFixed(2)}</td>
                    <td className="px-1.5 py-1.5 text-right">€ {getSelectedServices().reduce((a, s) => a + calcBackendCosts(s).festivo, 0).toFixed(2)}</td>
                    <td className="px-1.5 py-1.5 text-right">{getSelectedServices().reduce((a, s) => a + calcBackendCosts(s).notturnoHours, 0).toFixed(1)}</td>
                    <td className="px-1.5 py-1.5 text-right">€ {getSelectedServices().reduce((a, s) => a + calcBackendCosts(s).notturnoCost, 0).toFixed(2)}</td>
                    <td className="px-1.5 py-1.5 text-right">€ {getSelectedServices().reduce((a, s) => a + calcBackendCosts(s).diaria, 0).toFixed(2)}</td>
                    <td className="px-1.5 py-1.5 text-right text-primary font-bold">€ {getSelectedServices().reduce((a, s) => a + calcBackendCosts(s).total, 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Preview & Generate */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-outline-variant/50">
          <div className="flex items-center gap-4 text-[12px]">
            <span className="text-on-surface-variant">
              <span className="font-semibold text-on-surface">{getSelectedServices().length}</span> services selected
            </span>
            <span className="text-on-surface-variant">
              Total: <span className="font-semibold text-primary">€ {getSelectedServices().reduce((sum, s) => sum + calcBackendCosts(s).total, 0).toFixed(2)}</span>
            </span>
          </div>

          <button
            id="generar-rapportino-btn"
            onClick={handleGenerate}
            disabled={isGenerating || getSelectedServices().length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                Generate Rapportino
              </>
            )}
          </button>
        </div>

        {generationError && (
          <div className="flex items-center gap-2 text-red-600 text-[12px] bg-red-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {generationError}
          </div>
        )}
      </section>

      {/* Status Filter Tabs */}
      {generatedList.length > 0 && (
        <section id="status-filter-tabs" className="flex flex-wrap gap-2">
          {(['All', 'Borrador', 'Revisado', 'Enviado', 'Pagado'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low border border-outline-variant text-on-surface-variant hover:bg-surface-dim'
              }`}
            >
              {status !== 'All' && STATUS_CONFIG[status].icon}
              {status}
              <span className="ml-1 text-[10px] opacity-70">({statusCounts[status] || 0})</span>
            </button>
          ))}
        </section>
      )}

      {/* Generated Rapportinos List */}
      {filteredGeneratedList.length > 0 && (
        <section id="generated-rapportinos" className="space-y-2">
          <h3 className="text-[13px] font-semibold text-on-surface">Generated Reports</h3>
          <div className="space-y-2">
            {filteredGeneratedList.map((r, idx) => {
              const statusConfig = STATUS_CONFIG[r.status];
              return (
                <div
                  key={r.rapportinoId + idx}
                  className="flex items-center justify-between bg-surface-container-low rounded-lg border border-outline-variant px-4 py-3 hover:bg-surface-dim transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-on-surface">{r.label}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {r.totalServices} services · € {r.totalCost.toFixed(2)}
                        {r.dateFrom && r.dateTo && ` · ${r.dateFrom} to ${r.dateTo}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color} ${statusConfig.bg}`}>
                      {statusConfig.icon}
                      {r.status}
                    </span>
                    
                    {/* Advance Status Button */}
                    {statusConfig.nextStatus && (
                      <button
                        onClick={() => handleAdvanceStatus(r)}
                        className="flex items-center gap-1 px-2 py-1 rounded border border-outline-variant text-[10px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                        title={`Mark as ${statusConfig.nextStatus}`}
                      >
                        <ChevronRight className="w-3 h-3" />
                        {statusConfig.nextStatus}
                      </button>
                    )}
                    
                    {/* Open Sheet Link */}
                    {r.sheetUrl && (
                      <a
                        href={r.sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary text-[11px] font-medium hover:underline"
                      >
                        Open
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Stats */}
      <section id="reports-bento-dashboard" className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-primary/5 p-3 rounded-lg border border-primary/15 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-primary">
            <History className="w-4 h-4" />
            <h4 className="text-[11px] font-medium uppercase tracking-wide">Total Hours</h4>
          </div>
          <p className="text-[20px] font-bold text-primary leading-none">
            {totalHours.toFixed(1)} hrs
          </p>
          <p className="text-[11px] text-on-surface-variant">
            {services.filter(s => s.status === 'Completed').length} completed services
          </p>
        </div>

        <div className="bg-secondary/5 p-3 rounded-lg border border-secondary/15 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-secondary">
            <Route className="w-4 h-4" />
            <h4 className="text-[11px] font-medium uppercase tracking-wide">Total Cost</h4>
          </div>
          <p className="text-[20px] font-bold text-secondary leading-none">
            € {services.filter(s => s.operationalStatus === 'Validado').reduce((sum, s) => sum + calculateServiceCosts(s).totalCost, 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-on-surface-variant">
            All validated services
          </p>
        </div>

        <div className="bg-surface-dim p-3 rounded-lg border border-outline-variant flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-on-surface">
            <CheckCircle className="w-4 h-4 text-primary" />
            <h4 className="text-[11px] font-medium uppercase tracking-wide">Generated</h4>
          </div>
          <p className="text-[20px] font-bold text-on-surface leading-none">
            {generatedList.length}
          </p>
          <p className="text-[11px] text-on-surface-variant">
            rapportinos this session
          </p>
        </div>
      </section>
    </div>
  );
}