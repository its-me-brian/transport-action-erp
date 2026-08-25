import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  TransportService,
  normalizeTransportServices,
  uploadAndParseExcel,
  importTransportListWithProject,
  autoDetectImportTargets,
  updateServiceField,
  exportTransportListExcel,
  sendTransportListEmail,
  sendServicesToAgency,
  buildDriverWhatsAppMessage,
  buildGroupWhatsAppMessage,
  buildAgencyWhatsAppMessage,
  getAgencies,
  getDrivers,
  getTransportLists,
  getServicesByTransportListId,
  getServices,
  assignDriver,
  confirmService,
  startService,
  completeService,
  validateService,
  createDriver,
  updateDriver,
  DriverRecord,
  Agency,
  getProjects,
  Project,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface UseTransportListParams {
  onImportComplete?: () => void;
}

type ImportStep = 'upload' | 'preview' | 'syncing' | 'done';

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

function toErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) return (err as { message: string }).message;
  return String(err);
}

export const PERSISTABLE_FIELDS = ['time', 'pickupLines', 'dropoffLines', 'flightInfo', 'notes', 'vehicle', 'driverPhone', 'pickupMapsUrl', 'dropoffMapsUrl', 'passengersList', 'originalTransportDate', 'serviceType', 'vehicleType'];

export default function useTransportList({ onImportComplete }: UseTransportListParams) {
  const { showToast } = useToast();
  // --- Helper: format history dates ---
  const formatImportDate = (importDate: string): string => {
    if (!importDate) return '';
    try {
      const d = new Date(importDate);
      if (isNaN(d.getTime())) return importDate;
      return d.toLocaleDateString('es-IT', { day: 'numeric', month: 'short' }) + ' ' +
             d.toLocaleTimeString('es-IT', { hour: '2-digit', minute: '2-digit' });
    } catch { return importDate; }
  };

  const formatServiceDate = (dateRange: string): string => {
    if (!dateRange) return '';
    if (dateRange.includes('T')) {
      try {
        const d = new Date(dateRange);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('es-IT', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      } catch { /* fall through */ }
    }
    return dateRange.replace(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*/i, '').trim();
  };

  // --- State ---
  const [step, setStep] = useState<ImportStep>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ created?: number; skipped?: number } | null>(null);

  const [importId, setImportId] = useState<string>('');
  const [production, setProduction] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [transportCompany, setTransportCompany] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [services, setServices] = useState<TransportService[]>([]);
  const [footerContacts, setFooterContacts] = useState<{name: string; role: string; phone: string; email: string}[]>([]);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [parsingLog, setParsingLog] = useState<any[]>([]);
  const [serviceSummary, setServiceSummary] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editOriginalValue, setEditOriginalValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showRoles, setShowRoles] = useState(false);
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>(() => {
    try { return (localStorage.getItem('tl_viewMode') as 'flat' | 'grouped') || 'flat'; } catch { return 'flat'; }
  });
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importModalClientId, setImportModalClientId] = useState<string>('');
  const [importModalProjectId, setImportModalProjectId] = useState<string>('');
  const [importModalOperatingCompany, setImportModalOperatingCompany] = useState<string>('TA');
  const [importModalClients, setImportModalClients] = useState<{ id: string; name: string; status: string }[]>([]);
  const [importModalLoading, setImportModalLoading] = useState(false);
  const [importModalAutoDetected, setImportModalAutoDetected] = useState<{
    client: any; project: any; clients: any[]; projects: any[];
  } | null>(null);

  const [exportResult, setExportResult] = useState<{
    type: 'pdf' | 'excel';
    url?: string;
    downloadUrl?: string;
    fileName?: string;
  } | null>(null);

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterOperatingCompany, setFilterOperatingCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterFinancialStatus, setFilterFinancialStatus] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const pdfGeneratedForSave = useRef(false);

  const [viewingHistory, setViewingHistory] = useState<{
    entry: any;
    services: TransportService[];
  } | null>(null);

  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailNotes, setEmailNotes] = useState('');

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [agencyServices, setAgencyServices] = useState<TransportService[]>([]);
  const [agencyNotes, setAgencyNotes] = useState('');
  const [loadingAgencies, setLoadingAgencies] = useState(false);

  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [dbDrivers, setDbDrivers] = useState<DriverRecord[]>([]);

  const [lifecycleLoading, setLifecycleLoading] = useState<Record<string, string | null>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Computed ---
  const filteredServices = useMemo(() => {
    const filtered = services.filter(s => {
      if (filterDateFrom && s.date && s.date < filterDateFrom) return false;
      if (filterDateTo && s.date && s.date > filterDateTo) return false;
      if (filterDriver && !(s.driver || '').toLowerCase().includes(filterDriver.toLowerCase())) return false;
      if (filterOperatingCompany && s.operatingCompany !== filterOperatingCompany) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterProject && s.project !== filterProject) return false;
      if (filterFinancialStatus && s.financialStatus !== filterFinancialStatus) return false;
      return true;
    });
    if (step === 'syncing' || step === 'done' || viewingHistory) {
      return filtered.sort((a, b) => {
        const timeA = a.time || 'zz:zz';
        const timeB = b.time || 'zz:zz';
        return timeA.localeCompare(timeB);
      });
    }
    return filtered;
  }, [services, filterDateFrom, filterDateTo, filterDriver, filterOperatingCompany, filterStatus, filterProject, filterFinancialStatus, step, viewingHistory]);

  // --- Effects ---
  React.useEffect(() => {
    getDrivers().then(drivers => {
      const raw = Array.isArray(drivers) ? drivers : [];
      const byId = new Map<string, DriverRecord>();
      const byName = new Map<string, DriverRecord>();
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
        byId.set(id || `gen-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, { ...d, name, id: id || `gen-${Date.now()}-${Math.random().toString(36).slice(2,6)}` });
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
  }, []);

  React.useEffect(() => {
    setLoadingHistory(true);
    getTransportLists().then(lists => {
      setHistory(Array.isArray(lists) ? lists : []);
    }).catch(e => console.error('Failed to load transport history:', e)).finally(() => setLoadingHistory(false));
  }, []);

  React.useEffect(() => {
    getProjects().then(result => {
      if (Array.isArray(result)) setProjects(result);
    }).catch(e => console.error('Failed to load projects:', e));
  }, []);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('tl_metadata');
      if (saved) {
        const meta = JSON.parse(saved);
        if (meta.production) setProduction(meta.production);
        if (meta.projectName) setProjectName(meta.projectName);
        if (meta.transportCompany) setTransportCompany(meta.transportCompany);
        if (meta.dateStr) setDateStr(meta.dateStr);
        if (meta.footerContacts?.length) setFooterContacts(meta.footerContacts);
      }
    } catch (e) { /* ignore */ }
  }, []);

  React.useEffect(() => {
    const handleClick = () => {
      setShowExportMenu(false);
      setShowWhatsAppMenu(false);
      setShowMoreMenu(false);
    };
    if (showExportMenu || showWhatsAppMenu || showMoreMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showExportMenu, showWhatsAppMenu, showMoreMenu]);

  // --- Handlers ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setError('Solo se aceptan archivos .xlsx o .xls');
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return 0;
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const result = await uploadAndParseExcel(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.error) {
        setError(toErrorMessage(result.error));
        setStep('upload');
        return;
      }

      setImportId(result.importId || '');
      setProduction(result.production || '');
      setProjectName(result.projectName || '');
      setTransportCompany(result.transportCompany || '');
      setFileUrl(result.fileUrl || '');
      setViewingHistory(null);

      if (result.projectName && projects.length > 0) {
        const match = projects.find(p => p.name.toLowerCase() === result.projectName.toLowerCase());
        if (match) setSelectedProjectId(match.id);
      }

      setDateStr(result.dateStr || '');
      setFooterContacts(result.footerContacts || []);

      try {
        localStorage.setItem('tl_metadata', JSON.stringify({
          production: result.production || '',
          projectName: result.projectName || '',
          transportCompany: result.transportCompany || '',
          dateStr: result.dateStr || '',
          footerContacts: result.footerContacts || [],
        }));
      } catch (e) { /* ignore */ }
      const rawServices = (result.servicios || []).map((s: any) => ({
        ...s,
        date: s.date || s.dateStr || '',
      }));
      const mappedServices = normalizeTransportServices(rawServices);
      setServices(mappedServices);
      const _dbg = (result as any)._debug;
      setParsingLog(_dbg?.parsingLog || []);
      setServiceSummary(_dbg?.serviceSummary || []);
      const validIds = (result.servicios || [])
        .filter(s => {
          const hasData = s.vehicle || s.driver || s.time || (Array.isArray(s.passengers) ? s.passengers.length > 0 : s.passengers) || s.from || s.to || (Array.isArray(s.pickupLines) && s.pickupLines.length > 0) || (Array.isArray(s.dropoffLines) && s.dropoffLines.length > 0);
          if (!hasData) return false;
          if (s.isWalking || s.isProduction) return false;
          return true;
        })
        .map(s => s.id);
      setSelectedRows(new Set(validIds));

      setTimeout(() => {
        if (result.production || result.projectName) {
          setImportModalLoading(true);
          setShowImportModal(true);
          autoDetectImportTargets(result.production || '', result.projectName || '').then(detection => {
            setImportModalAutoDetected(detection);
            if (detection.client) setImportModalClientId(detection.client.id);
            if (detection.project) setImportModalProjectId(detection.project.id);
            setImportModalLoading(false);
          }).catch(() => {
            setImportModalLoading(false);
          });
        } else {
          setStep('preview');
        }
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message || 'Error al procesar el archivo');
      setStep('upload');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  }, []);

  const clearFile = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    setError(null);
    setStep('upload');
    setServices([]);
    setSelectedRows(new Set());
    setProjectName('');
    setTransportCompany('');
    setFooterContacts([]);
    setImportResult(null);
  };

  const startEdit = (rowId: string, field: string, currentValue: string) => {
    setEditingCell({ rowId, field });
    setEditValue(currentValue);
    setEditOriginalValue(currentValue);
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const { rowId, field } = editingCell;

    if (PERSISTABLE_FIELDS.includes(field)) {
      setServices(prev => prev.map(s => {
        if (s.id !== rowId) return s;
        return { ...s, [field]: editValue } as TransportService;
      }));
    }

    setEditingCell(null);
    setEditValue('');

    if (PERSISTABLE_FIELDS.includes(field)) {
      try {
        const result = await updateServiceField(rowId, field, editValue);
        if (result.error) {
          console.error('Failed to persist field:', result.error);
          setError('Failed to save: ' + result.error);
          setServices(prev => prev.map(s => {
            if (s.id !== rowId) return s;
            return { ...s, [field]: editOriginalValue } as TransportService;
          }));
        }
      } catch (err) {
        console.error('API error persisting field:', err);
        setError('Failed to save changes. Please try again.');
        setServices(prev => prev.map(s => {
          if (s.id !== rowId) return s;
          return { ...s, [field]: editOriginalValue } as TransportService;
        }));
      }
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isServiceCompleted = (service: TransportService) => {
    const completedStatuses = ['Realizado', 'Reportado', 'Validado'];
    return completedStatuses.includes(service.status);
  };

  const handleLifecycleTransition = async (serviceId: string, action: string) => {
    setLifecycleLoading(prev => ({ ...prev, [serviceId]: action }));
    try {
      let result;
      switch (action) {
        case 'assignDriver':
          result = { error: 'Assign a driver first via the Driver column' };
          break;
        case 'confirmService':
          result = await confirmService(serviceId);
          break;
        case 'startService':
          result = await startService(serviceId);
          break;
        case 'completeService':
          result = await completeService(serviceId);
          break;
        case 'validateService':
          result = await validateService(serviceId);
          break;
        default:
          result = { error: 'Unknown action' };
      }
      if (result?.error) {
        setError(`Lifecycle error: ${result.error}`);
      } else {
        const refreshedServices = await getServices({});
        if (refreshedServices) {
          setServices(normalizeTransportServices(refreshedServices));
        }
      }
    } catch (err) {
      setError(err.message || 'Lifecycle transition failed');
    } finally {
      setLifecycleLoading(prev => ({ ...prev, [serviceId]: null }));
    }
  };

  const toggleAllSelection = () => {
    const selectableServices = filteredServices.filter(s => !isServiceCompleted(s));
    if (selectedRows.size === selectableServices.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableServices.map(s => s.id)));
    }
  };

  const removeSelectedRows = () => {
    setServices(prev => prev.filter(s => !selectedRows.has(s.id)));
    setSelectedRows(new Set());
  };

  const toggleViewMode = () => {
    setViewMode(prev => {
      const next = prev === 'flat' ? 'grouped' : 'flat';
      try { localStorage.setItem('tl_viewMode', next); } catch {}
      return next;
    });
  };

  const toggleServiceExpand = (serviceId: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const expandAllGrouped = () => {
    setExpandedServices(new Set(filteredServices.map(s => s.id)));
  };

  const collapseAllGrouped = () => {
    setExpandedServices(new Set());
  };

  const handleExportPdf = async () => {
    const selected = services.filter(s => selectedRows.has(s.id));
    if (selected.length === 0) {
      setError('Seleccioná al menos un servicio para exportar');
      return;
    }
    pdfGeneratedForSave.current = true;
    setShowPrintPreview(true);
  };

  const handleExportExcel = async () => {
    const selected = services.filter(s => selectedRows.has(s.id));
    if (selected.length === 0) {
      setError('Seleccioná al menos un servicio para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportTransportListExcel(selected, `Transport_List_${dateStr || 'today'}`);
      if (result.error) {
        setError(toErrorMessage(result.error));
      } else {
        setExportResult({
          type: 'excel',
          url: result.excelUrl,
          downloadUrl: result.excelDownloadUrl,
          fileName: `Transport_List_${dateStr || 'today'}.xlsx`,
        });
      }
    } catch (err) {
      setError(err.message || 'Error al exportar Excel');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleWhatsAppDriver = (driver: string) => {
    const driverServices = services.filter(s =>
      selectedRows.has(s.id) && s.driver === driver
    );
    if (driverServices.length === 0) return;

    const phone = driverServices[0]?.driverPhone?.replace(/[^0-9+]/g, '') || '';
    const message = buildDriverWhatsAppMessage(driver, driverServices, dateStr);
    const encodedMsg = encodeURIComponent(message);

    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
    } else {
      navigator.clipboard.writeText(message);
      showToast('Mensaje copiado al portapapeles (no se encontró número de teléfono)', 'success');
    }
  };

  const handleWhatsAppGroup = () => {
    const selected = services.filter(s => selectedRows.has(s.id));
    if (selected.length === 0) {
      setError('Seleccioná al menos un servicio');
      return;
    }

    const message = buildGroupWhatsAppMessage(selected, dateStr, production);
    const encodedMsg = encodeURIComponent(message);

    navigator.clipboard.writeText(message).then(() => {
      showToast('Mensaje copiado al portapapeles. Pegalo en el grupo de WhatsApp.', 'success');
    }).catch(() => {
      window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
    });

    setShowWhatsAppMenu(false);
  };

  const handleWhatsAppAgency = () => {
    if (agencyServices.length === 0 || !selectedAgency) return;

    const message = buildAgencyWhatsAppMessage(agencyServices, selectedAgency.name, dateStr);
    const phone = selectedAgency.phone?.replace(/[^0-9+]/g, '') || '';
    const encodedMsg = encodeURIComponent(message);

    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
    } else {
      navigator.clipboard.writeText(message).then(() => {
        showToast('Mensaje copiado al portapapeles.', 'success');
      });
    }

    setShowAgencyModal(false);
  };

  const handleSendEmail = async () => {
    const recipients = emailRecipients.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      setError('Ingresá al menos un destinatario');
      return;
    }

    const selected = services.filter(s => selectedRows.has(s.id));
    if (selected.length === 0) {
      setError('Seleccioná al menos un servicio para enviar');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendTransportListEmail(
        recipients,
        emailSubject || `Transport List — ${dateStr || 'Hoy'}`,
        selected,
        dateStr,
        production
      );

      if (result.error) {
        setError(toErrorMessage(result.error));
      } else {
        showToast(`Email enviado a: ${result.sentTo?.join(', ')}`, 'success');
        setEmailRecipients('');
        setEmailSubject('');
      }
    } catch (err) {
      setError(err.message || 'Error al enviar email');
    } finally {
      setIsSending(false);
      setShowEmailModal(false);
    }
  };

  const loadAgencies = async () => {
    setLoadingAgencies(true);
    try {
      const result = await getAgencies();
      if (result.agencies) {
        setAgencies(result.agencies.filter(a => a.active));
      }
    } catch (err) {
      console.error('Error loading agencies:', err);
    } finally {
      setLoadingAgencies(false);
    }
  };

  const openAgencyModal = () => {
    loadAgencies();
    setAgencyServices(services.filter(s => selectedRows.has(s.id)));
    setShowAgencyModal(true);
  };

  const handleSendToAgency = async () => {
    if (!selectedAgency) {
      setError('Seleccioná una agencia');
      return;
    }
    if (agencyServices.length === 0) {
      setError('Seleccioná al menos un servicio para enviar');
      return;
    }

    const recipients = selectedAgency.email.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      setError('La agencia no tiene email configurado');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendServicesToAgency(
        recipients,
        selectedAgency.name,
        agencyServices,
        dateStr,
        agencyNotes
      );

      if (result.error) {
        setError(toErrorMessage(result.error));
      } else {
        showToast(`Servicios enviados a ${selectedAgency.name}: ${result.sentTo?.join(', ')}`, 'success');
        setSelectedAgency(null);
        setAgencyNotes('');
      }
    } catch (err) {
      setError(err.message || 'Error al enviar a la agencia');
    } finally {
      setIsSending(false);
      setShowAgencyModal(false);
    }
  };

  const handleViewHistory = async (entry: any) => {
    try {
      const result = await getServicesByTransportListId(entry.fileName || entry.id);
      const rawServices = (Array.isArray(result) ? result : []).map((s: any) => ({
        ...s,
        date: s.date || s.dateStr || '',
      }));
      const mapped = normalizeTransportServices(rawServices);
      setViewingHistory({ entry, services: mapped });
    } catch (err) {
      setError(err.message || 'Error loading transport');
    }
  };

  const handleImportModalConfirm = async () => {
    const selected = services.filter(s => selectedRows.has(s.id));
    if (selected.length === 0) {
      setError('Seleccioná al menos un servicio para importar');
      setShowImportModal(false);
      return;
    }

    setStep('syncing');
    setShowImportModal(false);
    setError(null);

    try {
      const result = await importTransportListWithProject({
        services: selected,
        importId: importId,
        production: production || '',
        projectName: projectName || '',
        clientId: importModalClientId || undefined,
        projectId: importModalProjectId || undefined,
        operatingCompany: importModalOperatingCompany || 'TA',
        fileUrl: fileUrl || undefined,
        dateStr: dateStr || '',
      });

      if (result.error) {
        setError(toErrorMessage(result.error));
        setStep('preview');
        return;
      }

      if (result.clientId) setImportModalClientId(result.clientId);
      if (result.projectId) {
        setImportModalProjectId(result.projectId);
        setSelectedProjectId(result.projectId);
      }

      setImportResult({ created: result.servicesCreated, skipped: result.servicesSkipped });
      setStep('done');
      if (result.importLogs && result.importLogs.length > 0) {
        console.log('=== IMPORT LOGS ===');
        for (const log of result.importLogs) {
          console.log(log);
        }
        console.log('=== END IMPORT LOGS ===');
      }
      if (onImportComplete) onImportComplete();
      try {
        const refreshedServices = await getServices({});
        if (refreshedServices && Array.isArray(refreshedServices) && refreshedServices.length > 0) {
          setServices(normalizeTransportServices(refreshedServices));
        }
      } catch (e) {
        console.error('Failed to refresh services after import:', e);
      }
      getTransportLists().then(lists => {
        setHistory(Array.isArray(lists) ? lists : []);
      }).catch(e => console.error('Failed to refresh history:', e));
    } catch (err) {
      setError(err.message || 'Error al importar');
      setStep('preview');
    }
  };

  const handleSync = async () => {
    const selected = services.filter(s => selectedRows.has(s.id));
    if (selected.length === 0) {
      setError('Seleccioná al menos un servicio para sincronizar');
      return;
    }

    if (!selectedProjectId && !importModalProjectId) {
      setStep('preview');
      setImportModalLoading(true);
      setShowImportModal(true);
      autoDetectImportTargets(production || '', projectName || '').then(detection => {
        setImportModalAutoDetected(detection);
        if (detection.client) setImportModalClientId(detection.client.id);
        if (detection.project) setImportModalProjectId(detection.project.id);
        setImportModalLoading(false);
      }).catch(() => {
        setImportModalLoading(false);
      });
      return;
    }

    setStep('syncing');
    setError(null);

    try {
      if (selectedProjectId) {
        const proj = projects.find(p => p.id === selectedProjectId);
        const result = await importTransportListWithProject({
          services: selected,
          importId: importId,
          production: production || '',
          projectName: proj?.name || projectName || '',
          projectId: selectedProjectId,
          operatingCompany: importModalOperatingCompany || 'TA',
          fileUrl: fileUrl || undefined,
          dateStr: dateStr || '',
        });

        if (result.error) {
          setError(toErrorMessage(result.error));
          setStep('preview');
          return;
        }
        if (result.importLogs && result.importLogs.length > 0) {
          console.log('=== IMPORT LOGS (with project) ===');
          for (const log of result.importLogs) {
            console.log(log);
          }
          console.log('=== END IMPORT LOGS ===');
        }
      } else {
        const result = await importTransportListWithProject({
          services: selected,
          importId: importId,
          production: production || '',
          projectName: projectName || '',
          operatingCompany: importModalOperatingCompany || 'TA',
          fileUrl: fileUrl || undefined,
          dateStr: dateStr || '',
        });

        if (result.error) {
          setError(toErrorMessage(result.error));
          setStep('preview');
          return;
        }
        if (result.importLogs && result.importLogs.length > 0) {
          console.log('=== IMPORT LOGS (no project) ===');
          for (const log of result.importLogs) {
            console.log(log);
          }
          console.log('=== END IMPORT LOGS ===');
        }
      }

      setStep('done');
      if (onImportComplete) {
        onImportComplete();
      }
      try {
        const refreshedServices = await getServices({});
        if (refreshedServices && Array.isArray(refreshedServices) && refreshedServices.length > 0) {
          setServices(normalizeTransportServices(refreshedServices));
        }
      } catch (e) {
        console.error('Failed to refresh services after sync:', e);
      }
      getTransportLists().then(lists => {
        setHistory(Array.isArray(lists) ? lists : []);
      }).catch(e => console.error('Failed to refresh history:', e));
    } catch (err) {
      setError(err.message || 'Error al sincronizar');
      setStep('preview');
    }
  };

  const handleDriverUpdate = async (serviceId: string, driver: string, driverPhone: string) => {
    setServices(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      return { ...s, driver, driverPhone };
    }));

    if (step === 'preview') {
      return;
    }

    const normalizedPhone = normalizePhone(driverPhone);
    const matchedDriver = dbDrivers.find(d => d.name === driver)
      || (normalizedPhone.length >= 8 && dbDrivers.find(d => normalizePhone(d.phone) === normalizedPhone));

    try {
      let driverId: string;

      if (matchedDriver) {
        driverId = matchedDriver.id;
        if (driverPhone && !matchedDriver.phone) {
          await updateDriver(driverId, { phone: driverPhone });
        }
      } else {
        const createResult = await createDriver(driver, driverPhone || '', 'Created from Transport List');
        if (createResult.error) {
          setError(`Failed to create driver: ${createResult.error}`);
          const services = await getServices({});
          if (services) setServices(normalizeTransportServices(services));
          return;
        }
        driverId = createResult.id!;
        const updatedDrivers = await getDrivers();
        if (updatedDrivers) setDbDrivers(updatedDrivers);
      }

      const result = await assignDriver(serviceId, driverId, '');
      if (result?.error) {
        setError(`Assign driver error: ${result.error}`);
        const services = await getServices({});
        if (services) setServices(normalizeTransportServices(services));
      } else {
        const services = await getServices({});
        if (services) setServices(normalizeTransportServices(services));
      }
    } catch (err) {
      setError(err.message || 'Failed to assign driver');
      const services = await getServices({});
      if (services) setServices(normalizeTransportServices(services));
    }
  };

  const handleVehicleTypeUpdate = (serviceId: string, vehicleType: string) => {
    setServices(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      return { ...s, vehicleType } as TransportService;
    }));
    if (step !== 'preview') {
      updateServiceField(serviceId, 'VehicleType', vehicleType).catch(err => {
        console.error('Failed to update VehicleType:', err);
      });
    }
  };

  const handleServiceTypeUpdate = (serviceId: string, serviceType: string) => {
    setServices(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      return { ...s, serviceType, serviceTypeConfirmed: true } as TransportService;
    }));
    if (step !== 'preview') {
      updateServiceField(serviceId, 'ServiceType', serviceType).then(() => {
        return updateServiceField(serviceId, 'ServiceTypeConfirmed', 'TRUE');
      }).catch(err => {
        console.error('Failed to update ServiceType:', err);
      });
    }
  };

  const handleOperatingCompanyUpdate = (serviceId: string, operatingCompany: string) => {
    const originalValue = services.find(s => s.id === serviceId)?.operatingCompany || '';
    setServices(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      return { ...s, operatingCompany } as TransportService;
    }));
    updateServiceField(serviceId, 'OperatingCompany', operatingCompany).then(result => {
      if (result?.error) {
        console.error('Failed to update OperatingCompany:', result.error);
        setError('Failed to update company: ' + result.error);
        setServices(prev => prev.map(s => {
          if (s.id !== serviceId) return s;
          return { ...s, operatingCompany: originalValue } as TransportService;
        }));
      }
    }).catch(err => {
      console.error('Failed to update OperatingCompany:', err);
      setError('Failed to update company. Please try again.');
      setServices(prev => prev.map(s => {
        if (s.id !== serviceId) return s;
        return { ...s, operatingCompany: originalValue } as TransportService;
      }));
    });
  };

  const clearFilterBar = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterDriver('');
    setFilterOperatingCompany('');
    setFilterStatus('');
    setFilterProject('');
    setFilterFinancialStatus('');
  };

  return {
    step, setStep,
    dragOver,
    selectedFile,
    uploadProgress,
    error, setError,
    importResult,
    importId,
    production,
    projectName,
    transportCompany,
    dateStr,
    services,
    footerContacts,
    fileUrl,
    parsingLog,
    serviceSummary,
    showDebug, setShowDebug,
    editingCell,
    editValue, setEditValue,
    selectedRows, setSelectedRows,
    showRoles, setShowRoles,
    viewMode,
    expandedServices,
    showExportMenu, setShowExportMenu,
    showWhatsAppMenu, setShowWhatsAppMenu,
    showEmailModal, setShowEmailModal,
    showAgencyModal, setShowAgencyModal,
    isExporting,
    isSending,
    projects,
    selectedProjectId, setSelectedProjectId,
    showMoreMenu, setShowMoreMenu,
    showImportModal, setShowImportModal,
    importModalClientId, setImportModalClientId,
    importModalProjectId, setImportModalProjectId,
    importModalOperatingCompany, setImportModalOperatingCompany,
    importModalClients,
    importModalLoading,
    importModalAutoDetected,
    exportResult, setExportResult,
    showPrintPreview, setShowPrintPreview,
    filterDateFrom, setFilterDateFrom,
    filterDateTo, setFilterDateTo,
    filterDriver, setFilterDriver,
    filterOperatingCompany, setFilterOperatingCompany,
    filterStatus, setFilterStatus,
    filterProject, setFilterProject,
    filterFinancialStatus, setFilterFinancialStatus,
    showSavePrompt, setShowSavePrompt,
    viewingHistory, setViewingHistory,
    emailRecipients, setEmailRecipients,
    emailSubject, setEmailSubject,
    emailNotes, setEmailNotes,
    agencies,
    selectedAgency, setSelectedAgency,
    agencyServices, setAgencyServices,
    agencyNotes, setAgencyNotes,
    loadingAgencies,
    history,
    loadingHistory,
    dbDrivers,
    lifecycleLoading,
    filteredServices,
    PERSISTABLE_FIELDS,
    fileInputRef,
    pdfGeneratedForSave,
    formatImportDate,
    formatServiceDate,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    processFile,
    clearFile,
    startEdit,
    saveEdit,
    cancelEdit,
    handleEditKeyDown,
    toggleRowSelection,
    isServiceCompleted,
    handleLifecycleTransition,
    toggleAllSelection,
    removeSelectedRows,
    toggleViewMode,
    toggleServiceExpand,
    expandAllGrouped,
    collapseAllGrouped,
    handleExportPdf,
    handleExportExcel,
    handleWhatsAppDriver,
    handleWhatsAppGroup,
    handleWhatsAppAgency,
    handleSendEmail,
    loadAgencies,
    openAgencyModal,
    handleSendToAgency,
    handleViewHistory,
    handleImportModalConfirm,
    handleSync,
    handleDriverUpdate,
    handleVehicleTypeUpdate,
    handleServiceTypeUpdate,
    handleOperatingCompanyUpdate,
    clearFilterBar,
  };
}
