import { useState, useMemo, useEffect } from 'react';
import {
  Service, Driver, dateKeyFromAny, calculateServiceCosts,
  parseDriverReport, parseMultipleDriverReports,
  getDiariaCost, getKmOverCost, isProductionVehicle
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
import { RapportinoType, DomainStatus, GeneratedRapportino, STATUS_CONFIG, timeToMin } from '../utils/reportHelpers';

interface UseReportsProps {
  services: Service[];
  drivers: Driver[];
  onServiceUpdate?: (serviceId: string, updates: Partial<Service>) => void;
}

export default function useReports({ services, drivers, onServiceUpdate }: UseReportsProps) {
  const { token } = useAuth();

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

  const [statusFilter, setStatusFilter] = useState<DomainStatus | 'All'>('All');

  useEffect(() => {
    loadStatuses();
    getCollaborators({ active: true }).then(setCollaboratorsList).catch(e => console.error('Failed to load collaborators:', e));
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setShowDriverDropdown(false);
    if (showDriverDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDriverDropdown]);

  const loadStatuses = async () => {
    try {
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

  const productions = useMemo(() => {
    const set = new Set(services.map(s => s.project).filter(Boolean));
    return Array.from(set).sort();
  }, [services]);

  const driverNames = useMemo(() => {
    const set = new Set(services.map(s => s.driverName).filter(Boolean));
    return Array.from(set).sort();
  }, [services]);

  const filteredServices = useMemo(() => {
    let result = services.filter(s => s.operationalStatus === 'Validado' && !isProductionVehicle(s));

    if (rapportinoType === 'production' && selectedProduction) {
      result = result.filter(s => s.project === selectedProduction);
    } else if (rapportinoType === 'driver' && selectedDriver) {
      result = result.filter(s => s.driverName === selectedDriver);
    } else if (rapportinoType === 'collaborator' && selectedCollaborator) {
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

  const filteredGeneratedList = useMemo(() => {
    if (statusFilter === 'All') return generatedList;
    return generatedList.filter(r => r.status === statusFilter);
  }, [generatedList, statusFilter]);

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
      return sum + 8;
    }, 0);
  }, [services]);

  const [whatsappText, setWhatsappText] = useState('');
  const [parsedReports, setParsedReports] = useState<import('../types').DriverReport[]>([]);
  const [showWhatsAppSection, setShowWhatsAppSection] = useState(false);
  const [matchedServices, setMatchedServices] = useState<Map<number, Service[]>>(new Map());
  const [applyingReport, setApplyingReport] = useState<number | null>(null);

  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [rapportinoName, setRapportinoName] = useState('');

  const timeToMinLocal = (t: string): number => {
    const parts = t.split(':');
    if (parts.length !== 2) return -1;
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  };

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

  const matchReportsToServices = (reports: import('../types').DriverReport[]) => {
    const matches = new Map<number, Service[]>();

    reports.forEach((report, idx) => {
      const reportDate = report.dateParsed || '';
      const reportDriver = report.driverName.toLowerCase();
      const reportStartTime = (report.start || '').replace('.', ':');

      const matched = services.filter(s => {
        const dateMatch = s.date === reportDate;
        if (!dateMatch) return false;

        const driverWords = reportDriver.split(/\s+/);
        const driverMatch = driverWords.some(word =>
          word.length > 2 && (s.driverName || '').toLowerCase().includes(word)
        );
        if (!driverMatch) return false;

        if (reportStartTime && s.startTime) {
          const svcStart = (s.startTime || '').replace('.', ':');
          const reportMin = timeToMin(reportStartTime);
          const svcMin = timeToMin(svcStart);
          if (reportMin >= 0 && svcMin >= 0) {
            return Math.abs(reportMin - svcMin) <= 30;
          }
        }

        return true;
      });

      if (matched.length > 0) {
        matches.set(idx, matched);
      }
    });

    setMatchedServices(matches);
  };

  const buildServiceDescription = (svc: Service): string => {
    const parts: string[] = [];
    if (svc.from) parts.push('DA ' + svc.from.toUpperCase());
    if (svc.to) parts.push('PER ' + svc.to.toUpperCase());
    if (parts.length === 0 && svc.notes) parts.push(svc.notes.toUpperCase());
    return parts.join(' ') || 'SERVICE';
  };

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
    return 'VAN DISPO';
  };

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

  const calcNotturnoHours = (startTime: string, endTime: string): number => {
    const start = timeToMin(startTime);
    const end = timeToMin(endTime);
    if (isNaN(start) || isNaN(end)) return 0;
    let nightHours = 0;
    if (start >= 1290) {
      if (end <= 390) {
        nightHours = (end + 1440 - start) / 60;
      } else {
        nightHours = (1440 - start) / 60 + 0;
        if (nightHours < 0) nightHours = 0;
      }
    } else if (start < 390) {
      if (end <= 390) {
        nightHours = (end - start) / 60;
      } else {
        nightHours = (390 - start) / 60;
      }
    } else if (end > 1290 || end <= 390) {
      const endNight = end <= 390 ? end + 1440 : end;
      nightHours = (endNight - Math.max(start, 1290)) / 60;
    }
    return Math.max(0, nightHours);
  };

  const calcBackendCosts = (svc: Service) => {
    const costs = calculateServiceCosts(svc);
    const kmDriven = svc.km || 0;
    const hoursWorked = calcHoursWorked(svc);
    const notturnoHours = (svc.startTime && svc.endTime) ? calcNotturnoHours(svc.startTime, svc.endTime) : 0;
    const vehicleType = mapVehicleToType(svc.vehicleType);
    const isDispo = vehicleType.indexOf('DISPO') > -1;
    const overtimeHours = isDispo && hoursWorked > 10 ? hoursWorked - 10 : 0;

    return {
      baseCost: costs.baseCost,
      overtimeHours,
      overtimeCost: costs.notturnoCost,
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

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedServiceIds.size === filteredServices.length) {
      setSelectedServiceIds(new Set());
    } else {
      setSelectedServiceIds(new Set(filteredServices.map(s => s.id)));
    }
  };

  const getSelectedServices = (): Service[] => {
    if (selectedServiceIds.size === 0) return filteredServices;
    return filteredServices.filter(s => selectedServiceIds.has(s.id));
  };

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

      onServiceUpdate?.(service.id, updates);

      setMatchedServices(prev => {
        const next = new Map<number, Service[]>(prev);
        const existing = next.get(reportIdx) ?? [];
        const remaining = existing.filter(s => s.id !== service.id);

        if (remaining.length === 0) {
          next.delete(reportIdx);
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

      const firstWithProject = servicesToUse.find(s => s.backendProjectId);
      const firstWithDriver = servicesToUse.find(s => s.driverId);

      if (rapportinoType === 'driver') {
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

      let addedCount = 0;
      for (const svc of servicesToUse) {
        const addResult = rapportinoType === 'collaborator'
          ? await addServiceToRapportinoCollaborator(rapportinoId, svc.id)
          : await addServiceToRapportino(rapportinoId, svc.id);
        if (!addResult.error) addedCount++;
      }

      let label = rapportinoName.trim() || '';
      if (!label) {
        if (rapportinoType === 'production') label = selectedProduction || 'All Productions';
        else if (rapportinoType === 'driver') label = selectedDriver || 'All Drivers';
        else if (rapportinoType === 'weekly') label = `Weekly ${dateFrom || '...'} - ${dateTo || '...'}`;
        else label = `Daily ${dateFrom || new Date().toLocaleDateString()}`;
      }

      const totalCostGen = servicesToUse.reduce((sum, s) => sum + calculateServiceCosts(s).totalCost, 0);

      const entry: GeneratedRapportino = {
        sheetName: label,
        sheetUrl: '',
        rapportinoId,
        totalServices: addedCount,
        totalCost: totalCostGen,
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

  const handleAdvanceStatus = async (rapportino: GeneratedRapportino) => {
    const config = STATUS_CONFIG[rapportino.status];
    if (!config.nextStatus || !config.nextAction) return;

    try {
      let result: any = null;
      const action = config.nextAction;
      const id = rapportino.rapportinoId;

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

  return {
    rapportinoType, setRapportinoType,
    periodType, setPeriodType,
    selectedProduction, setSelectedProduction,
    selectedDriver, setSelectedDriver,
    selectedCollaborator, setSelectedCollaborator,
    collaboratorsList,
    driverSearchQuery, setDriverSearchQuery,
    showDriverDropdown, setShowDriverDropdown,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    isGenerating,
    generatedList,
    generationError,
    statusFilter, setStatusFilter,
    whatsappText, setWhatsappText,
    parsedReports,
    showWhatsAppSection, setShowWhatsAppSection,
    matchedServices,
    applyingReport,
    selectedServiceIds,
    rapportinoName, setRapportinoName,

    productions,
    driverNames,
    filteredServices,
    filteredGeneratedList,
    totalCost,
    statusCounts,
    totalHours,

    handleGenerate,
    handleAdvanceStatus,
    handleParseWhatsApp,
    handleApplyToService,
    toggleServiceSelection,
    toggleSelectAll,
    getSelectedServices,
    calcBackendCosts,
    buildServiceDescription,
  };
}
