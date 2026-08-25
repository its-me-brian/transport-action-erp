import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  CheckCircle,
  X,
  Check,
  Loader2,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { ScreenId } from '../types';
import {
  TransportService,
  normalizeTransportServices,
  passengerDisplay,
  passengerRolesDisplay,
  hasPassengerRole,
  pickupDisplay,
  dropoffDisplay,
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
  isServiceDimmed,
  DriverRecord,
  Agency,
  getProjects,
  Project
} from '../services/api';
import { PrintPreview } from './print';
import { useToast } from '../contexts/ToastContext';
import DriverCell from './DriverCell';
import ServiceTableRows from './ServiceTableRows';
import MobileServiceCard from './MobileServiceCard';
import TransportListEmailModal from './TransportListEmailModal';
import TransportListAgencyModal from './TransportListAgencyModal';
import TransportListImportModal from './TransportListImportModal';
import TransportListExportResultModal from './TransportListExportResultModal';
import TransportListSavePromptModal from './TransportListSavePromptModal';
import TransportListFilterBar from './TransportListFilterBar';
import TransportListDesktopActions from './TransportListDesktopActions';
import TransportListMobileMoreMenu from './TransportListMobileMoreMenu';
import TransportListHistoryTable from './TransportListHistoryTable';
import TransportListParserDebugPanel from './TransportListParserDebugPanel';

interface TransportListScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
  onImportComplete?: () => void;
}

type ImportStep = 'upload' | 'preview' | 'syncing' | 'done';

export default function TransportListScreen({ onNavigate, onImportComplete }: TransportListScreenProps) {
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
    // If it's an ISO date string like "2026-07-06T22:00:00.000Z"
    if (dateRange.includes('T')) {
      try {
        const d = new Date(dateRange);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('es-IT', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      } catch { /* fall through */ }
    }
    // Already a nice string like "Tuesday July 07th" — clean it up
    return dateRange.replace(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*/i, '').trim();
  };
  // --- State ---
  const [step, setStep] = useState<ImportStep>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ created?: number; skipped?: number } | null>(null);

  // Helper: extract error message from string or object
  const toErrorMessage = (err: unknown): string => {
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in err) return (err as { message: string }).message;
    return String(err);
  };
  
  // Parsed data
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
  // Edit state
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editOriginalValue, setEditOriginalValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showRoles, setShowRoles] = useState(false);
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>(() => {
    try { return (localStorage.getItem('tl_viewMode') as 'flat' | 'grouped') || 'flat'; } catch { return 'flat'; }
  });
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  
  // Export/Share state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Project linking state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importModalClientId, setImportModalClientId] = useState<string>('');
  const [importModalProjectId, setImportModalProjectId] = useState<string>('');
  const [importModalOperatingCompany, setImportModalOperatingCompany] = useState<string>('TA');
  const [importModalClients, setImportModalClients] = useState<{ id: string; name: string; status: string }[]>([]);
  const [importModalLoading, setImportModalLoading] = useState(false);
  const [importModalAutoDetected, setImportModalAutoDetected] = useState<{
    client: any; project: any; clients: any[]; projects: any[];
  } | null>(null);
  
  // Export result state (PDF/Excel)
  const [exportResult, setExportResult] = useState<{
    type: 'pdf' | 'excel';
    url?: string;
    downloadUrl?: string;
    fileName?: string;
  } | null>(null);
  
  // Print preview state
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  // Save prompt: shows after PDF generation asking to register transport

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterOperatingCompany, setFilterOperatingCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterFinancialStatus, setFilterFinancialStatus] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const pdfGeneratedForSave = useRef(false);
  
  // History preview state
  const [viewingHistory, setViewingHistory] = useState<{
    entry: any;
    services: TransportService[];
  } | null>(null);
  
  // Email state
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailNotes, setEmailNotes] = useState('');
  
  // Agency state
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [agencyServices, setAgencyServices] = useState<TransportService[]>([]);
  const [agencyNotes, setAgencyNotes] = useState('');
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  
  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered services based on current filters
  // Sort by time only after import (preview preserves Excel order)
  const filteredServices = React.useMemo(() => {
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
    // After import (step === 'syncing' or history), sort by time ascending
    if (step === 'syncing' || step === 'done' || viewingHistory) {
      return filtered.sort((a, b) => {
        const timeA = a.time || 'zz:zz';
        const timeB = b.time || 'zz:zz';
        return timeA.localeCompare(timeB);
      });
    }
    // In preview/upload, preserve original Excel order
    return filtered;
  }, [services, filterDateFrom, filterDateTo, filterDriver, filterOperatingCompany, filterStatus, filterProject, filterFinancialStatus, step, viewingHistory]);

  // Drivers database
  const [dbDrivers, setDbDrivers] = useState<DriverRecord[]>([]);

  // Load drivers from API
  React.useEffect(() => {
    getDrivers().then(drivers => {
      const raw = Array.isArray(drivers) ? drivers : [];
      // Dedup by ID first, then by name — prevents duplicate React keys
      const byId = new Map<string, DriverRecord>();
      const byName = new Map<string, DriverRecord>();
      raw.forEach(d => {
        const name = (d.name || '').trim();
        if (!name) return;
        const id = (d.id || '').trim();
        // Pass 1: same ID = same row in Sheets
        if (id && byId.has(id)) {
          const existing = byId.get(id)!;
          if (!existing.vehiclePreferred && d.vehiclePreferred) existing.vehiclePreferred = d.vehiclePreferred;
          if (!existing.phone && d.phone) existing.phone = d.phone;
          return;
        }
        byId.set(id || `gen-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, { ...d, name, id: id || `gen-${Date.now()}-${Math.random().toString(36).slice(2,6)}` });
      });
      // Pass 2: same normalized name = same driver
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

  // Load transport history on mount
  React.useEffect(() => {
    setLoadingHistory(true);
    getTransportLists().then(lists => {
      setHistory(Array.isArray(lists) ? lists : []);
    }).catch(e => console.error('Failed to load transport history:', e)).finally(() => setLoadingHistory(false));
  }, []);

  // Load projects for linking
  React.useEffect(() => {
    getProjects().then(result => {
      if (Array.isArray(result)) setProjects(result);
    }).catch(e => console.error('Failed to load projects:', e));
  }, []);

  // Load persisted metadata from localStorage (for PDF export)
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

  // Close dropdowns when clicking outside
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

  // --- File handling ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

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

  const processFile = async (file: File) => {
    // Validate file type
    if (!file.name.match(/\.xlsx?$/i)) {
      setError('Solo se aceptan archivos .xlsx o .xls');
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
    setError(null);

    // Simulate progress while uploading
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

      // Set parsed data
      setImportId(result.importId || '');
      setProduction(result.production || '');
      setProjectName(result.projectName || '');
      setTransportCompany(result.transportCompany || '');
      setFileUrl(result.fileUrl || '');
      // Close any history preview when loading a new transport
      setViewingHistory(null);

      // Auto-select project if parsed name matches an existing project
      if (result.projectName && projects.length > 0) {
        const match = projects.find(p => p.name.toLowerCase() === result.projectName.toLowerCase());
        if (match) setSelectedProjectId(match.id);
      }

      setDateStr(result.dateStr || '');
      setFooterContacts(result.footerContacts || []);
      
      // Persist metadata in localStorage for PDF export
      try {
        localStorage.setItem('tl_metadata', JSON.stringify({
          production: result.production || '',
          projectName: result.projectName || '',
          transportCompany: result.transportCompany || '',
          dateStr: result.dateStr || '',
          footerContacts: result.footerContacts || [],
        }));
      } catch (e) { /* ignore */ }
      // Map backend dateStr to TransportService.date field, then normalize
      const rawServices = (result.servicios || []).map((s: any) => ({
        ...s,
        date: s.date || s.dateStr || '',
      }));
      const mappedServices = normalizeTransportServices(rawServices);
      setServices(mappedServices);
      const _dbg = (result as any)._debug;
      setParsingLog(_dbg?.parsingLog || []);
      setServiceSummary(_dbg?.serviceSummary || []);
      // Auto-select only non-walking, non-production services by default
      const validIds = (result.servicios || [])
        .filter(s => {
          // Must have meaningful data
          const hasData = s.vehicle || s.driver || s.time || (Array.isArray(s.passengers) ? s.passengers.length > 0 : s.passengers) || s.from || s.to || (Array.isArray(s.pickupLines) && s.pickupLines.length > 0) || (Array.isArray(s.dropoffLines) && s.dropoffLines.length > 0);
          if (!hasData) return false;
          // Walking and production are selectable but unchecked by default
          if (s.isWalking || s.isProduction) return false;
          return true;
        })
        .map(s => s.id);
      setSelectedRows(new Set(validIds));
      
      setTimeout(() => {
        // Auto-detect Client/Project from production name
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

  // --- Editing ---
  const startEdit = (rowId: string, field: string, currentValue: string) => {
    setEditingCell({ rowId, field });
    setEditValue(currentValue);
    setEditOriginalValue(currentValue);
  };

  // Fields that can be persisted via updateServiceField (whitelisted in backend)
  const PERSISTABLE_FIELDS = ['time', 'pickupLines', 'dropoffLines', 'flightInfo', 'notes', 'vehicle', 'driverPhone', 'pickupMapsUrl', 'dropoffMapsUrl', 'passengersList', 'originalTransportDate', 'serviceType', 'vehicleType'];

  const saveEdit = async () => {
    if (!editingCell) return;

    const { rowId, field } = editingCell;
    
    // Optimistic update for immediate UI feedback (only for persistable fields)
    if (PERSISTABLE_FIELDS.includes(field)) {
      setServices(prev => prev.map(s => {
        if (s.id !== rowId) return s;
        return { ...s, [field]: editValue } as TransportService;
      }));
    }

    setEditingCell(null);
    setEditValue('');

    // Persist to backend if field is whitelisted
    if (PERSISTABLE_FIELDS.includes(field)) {
      try {
        const result = await updateServiceField(rowId, field, editValue);
        if (result.error) {
          console.error('Failed to persist field:', result.error);
          setError('Failed to save: ' + result.error);
          // Revert optimistic update on error — restore original value
          setServices(prev => prev.map(s => {
            if (s.id !== rowId) return s;
            return { ...s, [field]: editOriginalValue } as TransportService;
          }));
        }
      } catch (err) {
        console.error('API error persisting field:', err);
        setError('Failed to save changes. Please try again.');
        // Revert optimistic update on exception
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

  // --- Selection ---
  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Check if service is completed (cannot be modified)
  const isServiceCompleted = (service: TransportService) => {
    const completedStatuses = ['Realizado', 'Reportado', 'Validado'];
    return completedStatuses.includes(service.status);
  };

  // Lifecycle transition handler
  const [lifecycleLoading, setLifecycleLoading] = useState<Record<string, string | null>>({});
  const handleLifecycleTransition = async (serviceId: string, action: string) => {
    setLifecycleLoading(prev => ({ ...prev, [serviceId]: action }));
    try {
      let result;
      switch (action) {
        case 'assignDriver':
          // For now, assignDriver requires a driverId — skip if no driver set
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
        // Reload from backend to get authoritative state
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

  // --- Export handlers ---
  const handleExportPdf = async () => {
    const selected = services.filter(s => selectedRows.has(s.id));
    if (selected.length === 0) {
      setError('Seleccioná al menos un servicio para exportar');
      return;
    }

    // Flag: after print preview closes, show save prompt
    pdfGeneratedForSave.current = true;
    // Open print preview — user saves as PDF from the browser's print dialog
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

  // --- WhatsApp handlers ---
  const handleWhatsAppDriver = (driver: string) => {
    const driverServices = services.filter(s => 
      selectedRows.has(s.id) && s.driver === driver
    );
    if (driverServices.length === 0) return;

    const phone = driverServices[0]?.driverPhone?.replace(/[^0-9+]/g, '') || '';
    const message = buildDriverWhatsAppMessage(driver, driverServices, dateStr);
    const encodedMsg = encodeURIComponent(message);

    if (phone) {
      // Clean phone: remove + and spaces
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
    } else {
      // No phone: copy to clipboard
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
    
    // Copy to clipboard for group sharing
    navigator.clipboard.writeText(message).then(() => {
      showToast('Mensaje copiado al portapapeles. Pegalo en el grupo de WhatsApp.', 'success');
    }).catch(() => {
      // Fallback: open WhatsApp Web
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

  // --- Email handlers ---
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

  // --- Agency handlers ---
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

  // --- View history entry ---
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

  // --- Import modal confirm ---
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

      // Update local state with created entities
      if (result.clientId) setImportModalClientId(result.clientId);
      if (result.projectId) {
        setImportModalProjectId(result.projectId);
        setSelectedProjectId(result.projectId);
      }

      setImportResult({ created: result.servicesCreated, skipped: result.servicesSkipped });
      setStep('done');
      // Show import logs in browser console
      if (result.importLogs && result.importLogs.length > 0) {
        console.log('=== IMPORT LOGS ===');
        for (const log of result.importLogs) {
          console.log(log);
        }
        console.log('=== END IMPORT LOGS ===');
      }
      if (onImportComplete) onImportComplete();
      // Refresh services from backend to get canonical data (fixes driver corruption)
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

  // --- Sync ---
  const handleSync = async () => {
    const selected = services.filter(s => selectedRows.has(s.id));
    if (selected.length === 0) {
      setError('Seleccioná al menos un servicio para sincronizar');
      return;
    }

    // If import modal was skipped (no project selected yet), show it again
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
      // Use importTransportListWithProject if a project is selected
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
        // Show import logs in browser console
        if (result.importLogs && result.importLogs.length > 0) {
          console.log('=== IMPORT LOGS (with project) ===');
          for (const log of result.importLogs) {
            console.log(log);
          }
          console.log('=== END IMPORT LOGS ===');
        }
      } else {
        // Fallback: save without project linking
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
        // Show import logs in browser console
        if (result.importLogs && result.importLogs.length > 0) {
          console.log('=== IMPORT LOGS (no project) ===');
          for (const log of result.importLogs) {
            console.log(log);
          }
          console.log('=== END IMPORT LOGS ===');
        }
      }

      setStep('done');
      // Refresh services in the parent App
      if (onImportComplete) {
        onImportComplete();
      }
      // Refresh services from backend to get canonical data (fixes driver corruption)
      try {
        const refreshedServices = await getServices({});
        if (refreshedServices && Array.isArray(refreshedServices) && refreshedServices.length > 0) {
          setServices(normalizeTransportServices(refreshedServices));
        }
      } catch (e) {
        console.error('Failed to refresh services after sync:', e);
      }
      // Refresh history
      getTransportLists().then(lists => {
        setHistory(Array.isArray(lists) ? lists : []);
      }).catch(e => console.error('Failed to refresh history:', e));
    } catch (err) {
      setError(err.message || 'Error al sincronizar');
      setStep('preview');
    }
  };

  // --- Driver update handler (for standalone DriverCell) ---
  const handleDriverUpdate = async (serviceId: string, driver: string, driverPhone: string) => {
    // Optimistic update for immediate UI feedback
    setServices(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      return { ...s, driver, driverPhone };
    }));

    // PREVIEW MODE: Only update local state — services don't exist in the Sheet yet
    // The driver assignment will be applied when the user syncs to the Sheet
    if (step === 'preview') {
      return;
    }

    // Find driverId from name OR from normalized phone
    const normalizedPhone = normalizePhone(driverPhone);
    const matchedDriver = dbDrivers.find(d => d.name === driver)
      || (normalizedPhone.length >= 8 && dbDrivers.find(d => normalizePhone(d.phone) === normalizedPhone));

    try {
      let driverId: string;

      if (matchedDriver) {
        // Existing driver — use their ID
        driverId = matchedDriver.id;
        // If driver exists but phone is empty and user provided one, update Driver.Phone
        if (driverPhone && !matchedDriver.phone) {
          await updateDriver(driverId, { phone: driverPhone });
        }
      } else {
        // New driver — create via API
        const createResult = await createDriver(driver, driverPhone || '', 'Created from Transport List');
        if (createResult.error) {
          setError(`Failed to create driver: ${createResult.error}`);
          const services = await getServices({});
          if (services) setServices(normalizeTransportServices(services));
          return;
        }
        driverId = createResult.id!;
        // Reload driver list
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

  // --- VehicleType update handler ---
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

  // --- ServiceType update handler ---
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

  // --- OperatingCompany update handler (for OperatingCompanyCell) ---
  const handleOperatingCompanyUpdate = (serviceId: string, operatingCompany: string) => {
    // Capture original value for rollback
    const originalValue = services.find(s => s.id === serviceId)?.operatingCompany || '';
    // Update local state immediately
    setServices(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      return { ...s, operatingCompany } as TransportService;
    }));
    // Persist to backend (service is in Services sheet, not Transport List)
    updateServiceField(serviceId, 'OperatingCompany', operatingCompany).then(result => {
      if (result?.error) {
        console.error('Failed to update OperatingCompany:', result.error);
        setError('Failed to update company: ' + result.error);
        // Rollback on error
        setServices(prev => prev.map(s => {
          if (s.id !== serviceId) return s;
          return { ...s, operatingCompany: originalValue } as TransportService;
        }));
      }
    }).catch(err => {
      console.error('Failed to update OperatingCompany:', err);
      setError('Failed to update company. Please try again.');
      // Rollback on error
      setServices(prev => prev.map(s => {
        if (s.id !== serviceId) return s;
        return { ...s, operatingCompany: originalValue } as TransportService;
      }));
    });
  };

  // --- Render ---
  return (
    <div id="transport-list-screen" className="flex-1 w-full flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center w-full px-3 md:px-6 py-3 max-w-[1400px] mx-auto border-b border-outline-variant bg-background/90 backdrop-blur-md sticky top-0 z-30">
        <div className="min-w-0 flex-1">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface truncate">
            {step === 'upload' && 'Import Transport List'}
            {step === 'preview' && 'Preview & Edit'}
            {step === 'syncing' && 'Syncing...'}
            {step === 'done' && 'Import Complete'}
          </h2>
          <p className="text-on-surface-variant text-[11px] md:text-[12px] mt-0.5 truncate">
            {step === 'upload' && 'Subí el Excel de la transport list para parsear y previsualizar.'}
            {step === 'preview' && `${services.length} servicios · ${selectedRows.size} seleccionados`}
            {step === 'syncing' && 'Guardando en el Sheet...'}
            {step === 'done' && 'Servicios registrados exitosamente'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {step === 'preview' && (
            <button 
              onClick={clearFile}
              className="hidden md:flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer text-[12px] font-medium px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary bg-surface-container-lowest"
            >
              <X className="w-3.5 h-3.5" />
              <span>New Import</span>
            </button>
          )}
          <button 
            onClick={() => onNavigate('transport', 'push_back')}
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer text-[12px] font-medium px-2.5 md:px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary bg-surface-container-lowest"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cancel</span>
          </button>
        </div>
      </div>

      <div className="px-4 md:px-6 max-w-[1400px] mx-auto w-full space-y-4 flex-1">
        
        {/* Error alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] text-red-700 font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP: Upload */}
        {step === 'upload' && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[200px] cursor-pointer transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-dim hover:border-primary'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
            />

            {!selectedFile ? (
              <label className="flex flex-col items-center cursor-pointer w-full" onClick={() => fileInputRef.current?.click()}>
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-[14px] font-semibold text-on-surface">Drag & Drop Excel</h3>
                <p className="text-on-surface-variant text-[12px] mt-1 mb-3">.xlsx files only</p>
                <span className="bg-surface-container-lowest text-primary border border-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors">
                  Browse Files
                </span>
              </label>
            ) : (
              <div className="flex flex-col items-center w-full max-w-xs">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  uploadProgress === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary animate-pulse'
                }`}>
                  {uploadProgress === 100 ? <Check className="w-6 h-6" /> : <Loader2 className="w-6 h-6 animate-spin" />}
                </div>
                
                <h4 className="font-medium text-[13px] text-on-surface truncate max-w-xs">{selectedFile.name}</h4>
                <p className="text-on-surface-variant text-[11px] mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>

                {uploadProgress !== null && (
                  <div className="w-full bg-surface-container rounded-full h-1 mt-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-150 ${uploadProgress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}

                {uploadProgress === 100 ? (
                  <div className="mt-4 flex flex-col items-center gap-1">
                    <span className="text-emerald-600 text-[11px] font-medium">Parsed successfully</span>
                    <button 
                      onClick={clearFile}
                      className="text-red-500 hover:text-red-700 text-[11px] font-medium underline cursor-pointer"
                    >
                      Clear and choose another
                    </button>
                  </div>
                ) : (
                  <span className="text-primary text-[11px] font-medium mt-3">Parsing...</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* History — show below upload when on upload step */}
        {step === 'upload' && (
          <TransportListHistoryTable
            history={history}
            loadingHistory={loadingHistory}
            viewingHistory={viewingHistory}
            onViewHistory={handleViewHistory}
            onClosePreview={() => setViewingHistory(null)}
            formatImportDate={formatImportDate}
            formatServiceDate={formatServiceDate}
          />
        )}

        {/* STEP: Preview & Edit */}
        {(step === 'preview' || step === 'syncing') && services.length > 0 && (
          <>
            {/* Excel-like header — Production | Project Name | Transport Company */}
            <div className="rounded-lg border-2 border-black overflow-hidden">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="px-2 md:px-4 py-2 md:py-2.5 font-bold text-[10px] md:text-[12px] text-center uppercase border border-black" style={{ width: '33%' }}>
                      {production || 'Production'}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-2.5 text-center border border-black" style={{ width: '34%' }}>
                      <span className="font-bold italic" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(16px, 4vw, 22px)' }}>
                        {projectName || 'Project'}
                      </span>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-2.5 font-bold text-[10px] md:text-[12px] text-center uppercase border border-black" style={{ width: '33%' }}>
                      {transportCompany || 'Transport Co.'}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-1.5 text-center text-[11px] md:text-[12px] font-medium border border-black bg-[#e8e8e8]">
                      Prep. Transport List {dateStr || ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left: Selection controls + Project selector + Save CTA */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={toggleAllSelection}
                  className="text-[12px] text-primary hover:text-primary-hover font-medium cursor-pointer"
                >
                  {selectedRows.size === filteredServices.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-on-surface-variant text-[12px]">
                  {selectedRows.size} of {filteredServices.length}
                </span>

                {/* Project selector */}
                {projects.length > 0 && (
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[11px] font-medium rounded px-2 py-1 focus:border-primary outline-none cursor-pointer"
                    title="Link import to project"
                  >
                    <option value="">No project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}

                {/* Register / Save to Sheet — primary CTA */}
                <button
                  onClick={handleSync}
                  disabled={selectedRows.size === 0 || step === 'syncing'}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded bg-primary text-on-primary font-semibold hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {step === 'syncing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{step === 'syncing' ? 'Guardando...' : `Save to Sheet (${selectedRows.size})`}</span>
                  <span className="sm:hidden">{step === 'syncing' ? '...' : `Save (${selectedRows.size})`}</span>
                </button>
              </div>

              {/* Filters bar */}
              <TransportListFilterBar
                filterDateFrom={filterDateFrom}
                filterDateTo={filterDateTo}
                filterDriver={filterDriver}
                filterOperatingCompany={filterOperatingCompany}
                filterStatus={filterStatus}
                filterProject={filterProject}
                filterFinancialStatus={filterFinancialStatus}
                services={services}
                onDateFromChange={setFilterDateFrom}
                onDateToChange={setFilterDateTo}
                onDriverChange={setFilterDriver}
                onOperatingCompanyChange={setFilterOperatingCompany}
                onStatusChange={setFilterStatus}
                onProjectChange={setFilterProject}
                onFinancialStatusChange={setFilterFinancialStatus}
                onClear={() => {
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setFilterDriver('');
                  setFilterOperatingCompany('');
                  setFilterStatus('');
                  setFilterProject('');
                  setFilterFinancialStatus('');
                }}
              />

              {/* Right: Secondary actions — hidden on mobile, shown in overflow menu */}
              <TransportListDesktopActions
                showRoles={showRoles}
                viewMode={viewMode}
                selectedCount={selectedRows.size}
                isExporting={isExporting}
                showExportMenu={showExportMenu}
                showWhatsAppMenu={showWhatsAppMenu}
                services={services}
                selectedRows={selectedRows}
                onToggleRoles={() => setShowRoles(!showRoles)}
                onToggleViewMode={toggleViewMode}
                onExpandAll={expandAllGrouped}
                onCollapseAll={collapseAllGrouped}
                onExportPdf={handleExportPdf}
                onPrint={() => setShowPrintPreview(true)}
                onExportExcel={handleExportExcel}
                onToggleExportMenu={() => { setShowExportMenu(!showExportMenu); setShowWhatsAppMenu(false); setShowMoreMenu(false); }}
                onToggleWhatsAppMenu={() => { setShowWhatsAppMenu(!showWhatsAppMenu); setShowExportMenu(false); setShowMoreMenu(false); }}
                onWhatsAppDriver={handleWhatsAppDriver}
                onWhatsAppGroup={handleWhatsAppGroup}
                onOpenEmail={() => setShowEmailModal(true)}
                onOpenAgency={openAgencyModal}
                onRemoveSelected={removeSelectedRows}
              />

              {/* Mobile: Overflow "More" menu */}
              <TransportListMobileMoreMenu
                showMoreMenu={showMoreMenu}
                showRoles={showRoles}
                selectedCount={selectedRows.size}
                isExporting={isExporting}
                onToggleMenu={() => { setShowMoreMenu(!showMoreMenu); setShowExportMenu(false); setShowWhatsAppMenu(false); }}
                onToggleRoles={() => { setShowRoles(!showRoles); setShowMoreMenu(false); }}
                onExportPdf={() => { handleExportPdf(); setShowMoreMenu(false); }}
                onPrint={() => { setShowPrintPreview(true); setShowMoreMenu(false); }}
                onExportExcel={() => { handleExportExcel(); setShowMoreMenu(false); }}
                onWhatsAppGroup={() => { handleWhatsAppGroup(); setShowMoreMenu(false); }}
                onOpenEmail={() => { setShowEmailModal(true); setShowMoreMenu(false); }}
                onOpenAgency={() => { openAgencyModal(); setShowMoreMenu(false); }}
                onRemoveSelected={() => { removeSelectedRows(); setShowMoreMenu(false); }}
              />
            </div>

            {/* Services — Desktop: table */}
            <ServiceTableRows
              services={services}
              filteredServices={filteredServices}
              selectedRows={selectedRows}
              showRoles={showRoles}
              viewMode={viewMode}
              expandedServices={expandedServices}
              dbDrivers={dbDrivers}
              editingCell={editingCell}
              editValue={editValue}
              lifecycleLoading={lifecycleLoading}
              onToggleRowSelection={toggleRowSelection}
              onToggleServiceExpand={toggleServiceExpand}
              onToggleAllSelection={toggleAllSelection}
              onStartEdit={startEdit}
              onEditValueChange={setEditValue}
              onSaveEdit={saveEdit}
              onEditKeyDown={handleEditKeyDown}
              onDriverUpdate={handleDriverUpdate}
              onVehicleTypeUpdate={handleVehicleTypeUpdate}
              onServiceTypeUpdate={handleServiceTypeUpdate}
              onOperatingCompanyUpdate={handleOperatingCompanyUpdate}
              onLifecycleTransition={handleLifecycleTransition}
            />

            {/* Services — Mobile: cards */}
            <div className="md:hidden space-y-2">
              <div className="flex items-center justify-between px-1 py-1">
                <button
                  onClick={toggleAllSelection}
                  className="text-[12px] text-primary font-medium cursor-pointer"
                >
                  {selectedRows.size === filteredServices.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-on-surface-variant text-[11px]">{selectedRows.size} of {filteredServices.length}</span>
              </div>

              {(() => {
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

                const getSectionStyleMobile = (name: string): string => {
                  const upper = name.toUpperCase();
                  if (upper.indexOf('ARRIVALS') > -1 || upper.indexOf('DEPARTURES') > -1) return 'bg-[#7ecfc0]';
                  if (upper === 'PUGLIA') return 'bg-[#a8d8ea]';
                  return 'bg-[#c6d44e]';
                };

                const orderedGroups: { section: string; services: typeof services }[] = [];
                for (const [secName, secServices] of sectionMap) {
                  orderedGroups.push({ section: secName, services: secServices });
                }
                if (noSection.length > 0) {
                  orderedGroups.push({ section: '', services: noSection });
                }

                return orderedGroups.map((group) => (
                  <React.Fragment key={group.section || 'nosection'}>
                    {group.section && (
                      <div className={`px-3 py-1.5 rounded-md text-center text-[11px] font-bold ${getSectionStyleMobile(group.section)}`} style={{ border: '1px solid #000' }}>
                        {group.section}
                      </div>
                    )}
                    {group.services.map((service) => (
                      <MobileServiceCard
                        key={service.id}
                        service={service}
                        isSelected={selectedRows.has(service.id)}
                        isExpanded={expandedServices.has(service.id)}
                        viewMode={viewMode}
                        dbDrivers={dbDrivers}
                        isServiceCompleted={isServiceCompleted}
                        onToggleRowSelection={toggleRowSelection}
                        onToggleServiceExpand={toggleServiceExpand}
                        onDriverUpdate={handleDriverUpdate}
                        onOperatingCompanyUpdate={handleOperatingCompanyUpdate}
                      />
                    ))}
                  </React.Fragment>
                ));
              })()}
            </div>

            {/* Summary */}
            <div className="flex flex-wrap items-center gap-4 text-[12px] text-on-surface-variant">
              <span>Showing: {filteredServices.length} of {services.length}</span>
              <span>Drivers: {[...new Set(filteredServices.map(s => s.driver).filter(Boolean))].length}</span>
              <span>Vehicles: {[...new Set(filteredServices.map(s => s.vehicle).filter(Boolean))].length}</span>
              <span>With phone: {filteredServices.filter(s => s.driverPhone).length}</span>
              <span className="text-amber-600">Missing driver: {filteredServices.filter(s => !s.driver).length}</span>
            </div>

            {/* Footer contacts — same as Excel footer */}
            {footerContacts.length > 0 && (
              <div className="rounded-lg border-2 border-black overflow-hidden">
                <div className="text-center py-1 text-[11px] font-bold" style={{ background: '#7ecfc0', border: '1px solid #000' }}>
                  Arrivals&amp;Departures
                </div>
                <div className="px-4 py-2 text-center" style={{ background: '#e8e8e8' }}>
                  {footerContacts.map((c, i) => (
                    <div key={i} className="text-[10px] leading-relaxed">
                      <span className="font-bold">{c.name}</span>
                      {c.role && <span> ({c.role})</span>}
                      {c.phone && <span> {c.phone.replace(/^'/, '')}</span>}
                      {c.email && <span>  {c.email}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DEBUG: Parser parsing log */}
            <TransportListParserDebugPanel
              parsingLog={parsingLog}
              serviceSummary={serviceSummary}
              showDebug={showDebug}
              onToggleDebug={() => setShowDebug(!showDebug)}
            />
          </>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-[16px] font-semibold text-on-surface mb-2">Import Complete</h3>
            <p className="text-on-surface-variant text-[13px] max-w-md">
              {importResult?.created || services.filter(s => selectedRows.has(s.id)).length} servicios sincronizados con el Sheet
              {importResult?.skipped ? ` · ${importResult.skipped} duplicados omitidos` : ''}.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={clearFile}
                className="px-4 py-2 text-[13px] font-medium border border-outline-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
              >
                Import Another
              </button>
              <button
                onClick={() => onNavigate('transport', 'push')}
                className="px-4 py-2 text-[13px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
              >
                View Calendar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      <TransportListEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleSendEmail}
        recipients={emailRecipients}
        subject={emailSubject}
        dateStr={dateStr}
        selectedCount={selectedRows.size}
        isSending={isSending}
        onRecipientsChange={setEmailRecipients}
        onSubjectChange={setEmailSubject}
      />

      <TransportListAgencyModal
        isOpen={showAgencyModal}
        onClose={() => setShowAgencyModal(false)}
        agencies={agencies}
        agencyServices={agencyServices}
        selectedAgency={selectedAgency}
        agencyNotes={agencyNotes}
        loadingAgencies={loadingAgencies}
        isSending={isSending}
        onAgencyChange={setSelectedAgency}
        onNotesChange={setAgencyNotes}
        onRemoveService={(id) => setAgencyServices(prev => prev.filter(s => s.id !== id))}
        onSendWhatsApp={handleWhatsAppAgency}
        onSendEmail={handleSendToAgency}
      />

      <TransportListImportModal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setStep('preview'); }}
        onConfirm={handleImportModalConfirm}
        production={production}
        projectName={projectName}
        selectedCount={selectedRows.size}
        operatingCompany={importModalOperatingCompany}
        clientId={importModalClientId}
        projectId={importModalProjectId}
        loading={importModalLoading}
        autoDetected={importModalAutoDetected}
        onOperatingCompanyChange={setImportModalOperatingCompany}
        onClientChange={setImportModalClientId}
        onProjectChange={setImportModalProjectId}
      />

      <TransportListExportResultModal
        result={exportResult}
        onClose={() => setExportResult(null)}
      />

      {/* Print Preview Modal — separated component tree for clean print output */}
      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => {
          setShowPrintPreview(false);
          if (pdfGeneratedForSave.current) {
            pdfGeneratedForSave.current = false;
            setShowSavePrompt(true);
          }
        }}
        onPrint={() => window.print()}
        services={services}
        selectedIds={selectedRows}
        production={production}
        projectName={projectName}
        transportCompany={transportCompany}
        dateStr={dateStr}
        footerContacts={footerContacts}
      />

      <TransportListSavePromptModal
        isOpen={showSavePrompt}
        selectedCount={selectedRows.size}
        onSave={() => { setShowSavePrompt(false); handleSync(); }}
        onDismiss={() => setShowSavePrompt(false)}
      />
    </div>
  );
}
