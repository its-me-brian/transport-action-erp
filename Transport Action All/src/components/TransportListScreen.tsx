import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  CheckCircle, 
  X, 
  FileSpreadsheet, 
  RefreshCw, 
  Check, 
  Loader2,
  Edit3,
  Save,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Download,
  FileText,
  Calendar,
  MessageSquare,
  Mail,
  Send,
  Users,
  Building2,
  Printer,
  MoreVertical,
  UserPlus,
  Play,
  Pause,
  BadgeCheck
} from 'lucide-react';
import { ScreenId, formatTimeDisplay } from '../types';
import { 
  TransportService,
  Passenger,
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
  DriverRecord,
  Agency,
  getProjects,
  Project
} from '../services/api';
import { PrintPreview } from './print';
import { useToast } from '../contexts/ToastContext';

interface TransportListScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
  onImportComplete?: () => void;
}

type ImportStep = 'upload' | 'preview' | 'syncing' | 'done';

// --- DriverCell: standalone component (outside parent to preserve state) ---
interface DriverCellProps {
  service: TransportService;
  dbDrivers: DriverRecord[];
  onUpdate: (serviceId: string, driver: string, driverPhone: string) => void;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

const DriverCell = React.memo(function DriverCell({ service, dbDrivers, onUpdate }: DriverCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [phone, setPhone] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const currentValue = service.driver || '';
  const isEmpty = !currentValue || currentValue.trim() === '';

  // Sort drivers by last name, then filter by search (no useMemo — direct compute avoids stale closures)
  const getLastName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : name.toLowerCase();
  };

  const sorted = [...dbDrivers].sort((a, b) => {
    const lastA = getLastName(a.name);
    const lastB = getLastName(b.name);
    if (lastA !== lastB) return lastA.localeCompare(lastB);
    return a.name.localeCompare(b.name);
  });

  const q = search.toLowerCase().trim();
  const filteredDrivers = q
    ? sorted.filter(d => d.name.toLowerCase().includes(q))
    : sorted;

  const isExistingDriver = dbDrivers.some(d => d.name === search.trim());
  const showCreateOption = search.trim().length > 0 && !isExistingDriver;

  const handleSelect = (name: string) => {
    const matched = dbDrivers.find(d => d.name === name);
    if (matched) {
      // Existing driver — use their phone or current phone
      const driverPhone = matched.phone || service.driverPhone || '';
      setPhone(driverPhone);
      onUpdate(service.id, name, driverPhone);
    } else {
      // Custom name — set phone from input
      onUpdate(service.id, name, phone || service.driverPhone || '');
    }
    setIsOpen(false);
    setSearch('');
    setPhone('');
  };

  const handleCreateAndAssign = async () => {
    const name = search.trim();
    if (!name) return;
    // Will be handled by parent via a special callback
    onUpdate(service.id, name, phone || '');
    setIsOpen(false);
    setSearch('');
    setPhone('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
      setPhone('');
    }
    if (e.key === 'Enter' && filteredDrivers.length > 0 && !showCreateOption) {
      e.preventDefault();
      handleSelect(filteredDrivers[0].name);
    }
  };

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`group flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded hover:bg-primary/5 ${isEmpty ? 'text-red-500 italic' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{isEmpty ? '(vacío)' : currentValue}</span>
        <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />
      </div>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg min-w-[220px] max-h-[280px] flex flex-col">
          <div className="px-2 pt-2 pb-1 border-b border-outline-variant/50">
            <input
              ref={searchInputRef}
              type="text"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-driver-search="true"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              onKeyDown={handleKeyDown}
              placeholder="Search driver by name..."
              className="w-full px-2 py-1.5 text-[12px] border border-outline-variant rounded bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50"
            />
          </div>
          <div className="overflow-y-auto flex-1 py-0.5">
            {search.trim() && showCreateOption && (
              <div className="px-2 py-1.5 border-b border-outline-variant/30">
                <div className="text-[11px] text-on-surface-variant mb-1">Phone for new driver:</div>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+39..."
                  className="w-full px-2 py-1 text-[11px] border border-outline-variant rounded bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleCreateAndAssign}
                  className="w-full mt-1 text-left px-2 py-1 text-[11px] bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded transition-colors cursor-pointer"
                >
                  Create &quot;{search.trim()}&quot; {phone ? `(${phone})` : ''}
                </button>
              </div>
            )}
            {search.trim() && !showCreateOption && (
              <button
                onClick={() => { handleSelect(search.trim()); setIsOpen(false); setSearch(''); setPhone(''); }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-primary/5 transition-colors cursor-pointer border-b border-outline-variant/30"
              >
                <span className="text-primary font-medium">Use &quot;{search.trim()}&quot;</span>
              </button>
            )}
            <button
              onClick={() => { handleSelect(''); setIsOpen(false); setSearch(''); setPhone(''); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-on-surface-variant hover:bg-surface-dim transition-colors cursor-pointer"
            >
              — Unassigned —
            </button>
            {filteredDrivers.length > 0 && <div className="border-t border-outline-variant/30 my-0.5" />}
            {filteredDrivers.map(d => (
              <button
                key={d.id}
                onClick={() => handleSelect(d.name)}
                className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-dim transition-colors cursor-pointer ${
                  currentValue === d.name ? 'bg-primary/10 text-primary font-medium' : 'text-on-surface'
                }`}
              >
                <span className="font-medium">{d.name}</span>
                {d.phone && <span className="text-on-surface-variant ml-1">{d.phone}</span>}
              </button>
            ))}
            {filteredDrivers.length === 0 && search.trim() && !showCreateOption && (
              <div className="px-3 py-1.5 text-[11px] text-on-surface-variant italic text-center border-t border-outline-variant/30">
                No drivers match
              </div>
            )}
            {dbDrivers.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-on-surface-variant italic text-center">
                No drivers in DB yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// --- OperatingCompanyCell: inline dropdown for TA/MM ---
interface OperatingCompanyCellProps {
  service: TransportService;
  onUpdate: (serviceId: string, operatingCompany: string) => void;
}

const OperatingCompanyCell = React.memo(function OperatingCompanyCell({ service, onUpdate }: OperatingCompanyCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const current = service.operatingCompany || '';
  const isEmpty = !current || current.trim() === '';

  const options = [
    { id: 'TA', name: 'Transport Action', color: 'text-blue-600' },
    { id: 'MM', name: 'Movie Motion', color: 'text-purple-600' },
  ];

  const handleSelect = (id: string) => {
    onUpdate(service.id, id);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`group flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded hover:bg-primary/5 ${
          isEmpty ? 'text-red-500 italic' :
          current === 'TA' ? 'text-blue-600 font-medium' :
          current === 'MM' ? 'text-purple-600 font-medium' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-[11px]">{isEmpty ? '(vacío)' : current}</span>
        <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />
      </div>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg min-w-[160px] py-1">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-dim transition-colors cursor-pointer flex items-center gap-2 ${
                current === opt.id ? 'bg-primary/10 font-medium' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${opt.id === 'TA' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
              <span className={opt.color}>{opt.name}</span>
              {current === opt.id && <Check className="w-3 h-3 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

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
  
  // Edit state
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editOriginalValue, setEditOriginalValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showRoles, setShowRoles] = useState(false);
  
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
  const filteredServices = React.useMemo(() => {
    return services.filter(s => {
      if (filterDateFrom && s.date && s.date < filterDateFrom) return false;
      if (filterDateTo && s.date && s.date > filterDateTo) return false;
      if (filterDriver && !(s.driver || '').toLowerCase().includes(filterDriver.toLowerCase())) return false;
      if (filterOperatingCompany && s.operatingCompany !== filterOperatingCompany) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterProject && s.project !== filterProject) return false;
      if (filterFinancialStatus && s.financialStatus !== filterFinancialStatus) return false;
      return true;
    });
  }, [services, filterDateFrom, filterDateTo, filterDriver, filterOperatingCompany, filterStatus, filterProject, filterFinancialStatus]);

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
      
      // Auto-select only services that have meaningful data (not blank rows)
      const validIds = (result.servicios || [])
        .filter(s => s.vehicle || s.driver || s.time || (Array.isArray(s.passengers) ? s.passengers.length > 0 : s.passengers) || s.from || s.to || (Array.isArray(s.pickupLines) && s.pickupLines.length > 0) || (Array.isArray(s.dropoffLines) && s.dropoffLines.length > 0))
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
  };

  // --- Editing ---
  const startEdit = (rowId: string, field: string, currentValue: string) => {
    setEditingCell({ rowId, field });
    setEditValue(currentValue);
    setEditOriginalValue(currentValue);
  };

  // Fields that can be persisted via updateServiceField (whitelisted in backend)
  const PERSISTABLE_FIELDS = ['time', 'pickupLines', 'dropoffLines', 'flightInfo', 'notes', 'vehicle', 'driverPhone'];

  const saveEdit = async () => {
    if (!editingCell) return;

    const { rowId, field } = editingCell;
    
    // Optimistic update for immediate UI feedback
    setServices(prev => prev.map(s => {
      if (s.id !== rowId) return s;
      return { ...s, [field]: editValue } as TransportService;
    }));

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
      const result = await getServicesByTransportListId(entry.id);
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

      setStep('done');
      if (onImportComplete) onImportComplete();
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
        });

        if (result.error) {
          setError(toErrorMessage(result.error));
          setStep('preview');
          return;
        }
      } else {
        // Fallback: save without project linking
        const result = await importTransportListWithProject({
          services: selected,
          importId: importId,
          production: production || '',
          projectName: projectName || '',
          operatingCompany: importModalOperatingCompany || 'TA',
        });

        if (result.error) {
          setError(toErrorMessage(result.error));
          setStep('preview');
          return;
        }
      }

      setStep('done');
      // Refresh services in the parent App
      if (onImportComplete) {
        onImportComplete();
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

  // --- Editable cell component ---
  const EditableCell = ({ rowId, field, value, type = 'text' }: {
    rowId: string;
    field: string;
    value: string;
    type?: 'text' | 'select';
  }) => {
    const isEditing = editingCell?.rowId === rowId && editingCell?.field === field;
    const isEmpty = !value || value.trim() === '';

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type={type === 'select' ? 'text' : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={saveEdit}
            className="w-full px-2 py-1 text-[12px] border border-primary rounded bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
      );
    }

    return (
      <div 
        className={`group flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded hover:bg-primary/5 ${isEmpty ? 'text-red-500 italic' : ''}`}
        onClick={() => startEdit(rowId, field, value)}
      >
        <span className="truncate">{isEmpty ? '(vacío)' : value}</span>
        <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />
      </div>
    );
  };

  // --- Driver update handler (for standalone DriverCell) ---
  const handleDriverUpdate = async (serviceId: string, driver: string, driverPhone: string) => {
    // Optimistic update for immediate UI feedback
    setServices(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      return { ...s, driver, driverPhone };
    }));

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

  // --- Render a single service row ---
  const renderServiceRow = (service: TransportService, isSelected: boolean, _rowIdx: number) => {
    return (
      <tr 
        key={service.id} 
        className={`transition-colors ${
          isSelected ? 'bg-primary/5' : 'hover:bg-surface-dim/50'
        }`}
      >
        <td className="px-2 py-2 w-8">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => toggleRowSelection(service.id)}
            disabled={isServiceCompleted(service)}
            className={`rounded ${isServiceCompleted(service) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          />
        </td>
        <td className="px-2 py-2">
          <EditableCell rowId={service.id} field="vehicle" value={service.vehicle} />
        </td>
        <td className="px-2 py-2">
          <DriverCell service={service} dbDrivers={dbDrivers} onUpdate={handleDriverUpdate} />
        </td>
        <td className="px-2 py-2 hidden lg:table-cell">
          <EditableCell rowId={service.id} field="driverPhone" value={service.driverPhone} />
        </td>
        <td className="px-2 py-2 w-[60px]">
          <EditableCell rowId={service.id} field="time" value={service.time} />
        </td>
        <td className="px-2 py-2 max-w-[200px]">
          <EditableCell rowId={service.id} field="passengers" value={passengerDisplay(service.passengers)} />
        </td>
        {showRoles && (
          <td className="px-2 py-2 text-on-surface-variant text-[11px] hidden xl:table-cell">
            {hasPassengerRole(service.passengers) ? passengerRolesDisplay(service.passengers) : '-'}
          </td>
        )}
        <td className="px-2 py-2 max-w-[180px] hidden md:table-cell">
          <EditableCell rowId={service.id} field="pickupLines" value={pickupDisplay(service.pickupLines)} />
        </td>
        <td className="px-2 py-2 max-w-[180px] hidden md:table-cell">
          <EditableCell rowId={service.id} field="dropoffLines" value={dropoffDisplay(service.dropoffLines)} />
        </td>
        <td className="px-2 py-2">
          <OperatingCompanyCell service={service} onUpdate={handleOperatingCompanyUpdate} />
        </td>
        <td className="px-2 py-2 hidden xl:table-cell">
          <EditableCell rowId={service.id} field="flightInfo" value={service.flightInfo} />
        </td>
        <td className="px-2 py-2 hidden xl:table-cell">
          <EditableCell rowId={service.id} field="notes" value={service.notes} />
        </td>
        {/* Lifecycle actions */}
        <td className="px-2 py-2 w-[120px]">
          {service.status === 'Importado' && (
            <span className="text-[10px] text-on-surface-variant italic">Asignar conductor</span>
          )}
          {service.status === 'Asignado' && (
            <button
              onClick={() => handleLifecycleTransition(service.id, 'confirmService')}
              disabled={!!lifecycleLoading[service.id]}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {lifecycleLoading[service.id] === 'confirmService' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Confirmar
            </button>
          )}
          {service.status === 'Confirmado' && (
            <button
              onClick={() => handleLifecycleTransition(service.id, 'startService')}
              disabled={!!lifecycleLoading[service.id]}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {lifecycleLoading[service.id] === 'startService' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Iniciar
            </button>
          )}
          {service.status === 'EnRuta' && (
            <button
              onClick={() => handleLifecycleTransition(service.id, 'completeService')}
              disabled={!!lifecycleLoading[service.id]}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {lifecycleLoading[service.id] === 'completeService' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
              Completar
            </button>
          )}
          {service.status === 'Reportado' && (
            <button
              onClick={() => handleLifecycleTransition(service.id, 'validateService')}
              disabled={!!lifecycleLoading[service.id]}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {lifecycleLoading[service.id] === 'validateService' ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" />}
              Validar
            </button>
          )}
          {['Realizado', 'Validado'].includes(service.status) && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600">
              <CheckCircle className="w-3 h-3" /> Completado
            </span>
          )}
        </td>
      </tr>
    );
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
            onClick={() => onNavigate('dashboard', 'push_back')}
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
          <div className="mt-6">
            <h3 className="text-[13px] font-semibold text-on-surface mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Transport History
            </h3>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8 text-on-surface-variant text-[12px]">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant text-[12px] border border-dashed border-outline-variant rounded-lg">
                No transport lists imported yet
              </div>
            ) : (
              <>
                {/* Desktop: table view */}
                <div className="hidden md:block border border-outline-variant rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-dim text-on-surface-variant text-[11px] font-medium border-b border-outline-variant">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">File</th>
                        <th className="px-3 py-2">Production</th>
                        <th className="px-3 py-2">Services</th>
                        <th className="px-3 py-2">Drivers</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px] text-on-surface divide-y divide-outline-variant/50">
                      {history.slice(0, 20).map((entry) => (
                        <tr key={entry.importId} className="hover:bg-surface-dim/50 transition-colors">
                       <td className="px-3 py-2 whitespace-nowrap text-[11px]">
                             <span className="text-on-surface-variant">Import</span>{' '}
                             <span className="font-medium text-on-surface">{formatImportDate(entry.importDate)}</span>
                             {entry.dateRange && (
                               <>
                                 <span className="text-on-surface-variant mx-1">·</span>
                                 <span className="text-on-surface-variant">Servicios del</span>{' '}
                                 <span className="font-medium text-on-surface">{formatServiceDate(entry.dateRange)}</span>
                               </>
                             )}
                           </td>
                          <td className="px-3 py-2 truncate max-w-[200px] font-medium">
                            {entry.fileName || '—'}
                          </td>
                          <td className="px-3 py-2 truncate max-w-[150px] text-on-surface-variant">
                            {entry.production || '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {entry.totalServices || 0}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {entry.totalDrivers || 0}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              entry.status === 'registered' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {entry.status || 'parsed'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => handleViewHistory(entry)}
                              className="text-primary hover:text-primary/80 text-[11px] font-medium underline cursor-pointer"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {history.length > 20 && (
                    <div className="px-3 py-2 text-center text-[11px] text-on-surface-variant border-t border-outline-variant">
                      Showing 20 of {history.length} entries
                    </div>
                  )}
                </div>

                {/* Mobile: card view */}
                <div className="md:hidden space-y-2">
                  {history.slice(0, 10).map((entry) => (
                    <div
                      key={entry.importId}
                      className="border border-outline-variant rounded-lg p-3 bg-surface-container-lowest active:bg-surface-dim transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                       <span className="text-[11px] text-on-surface-variant">
                           <span className="font-medium text-on-surface">{formatImportDate(entry.importDate)}</span>
                           {entry.dateRange && (
                             <>
                               <span className="mx-1">·</span>
                               <span className="text-on-surface-variant">Servicios del</span>{' '}
                               <span className="font-medium">{formatServiceDate(entry.dateRange)}</span>
                             </>
                           )}
                         </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          entry.status === 'registered' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.status || 'parsed'}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-on-surface truncate">
                        {entry.production || '—'}
                      </p>
                      <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                        {entry.fileName || '—'}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                          <span>{entry.totalServices || 0} services</span>
                          <span>{entry.totalDrivers || 0} drivers</span>
                        </div>
                        <button
                          onClick={() => handleViewHistory(entry)}
                          className="text-[12px] font-medium text-primary px-3 py-1 rounded-lg border border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                  {history.length > 10 && (
                    <div className="text-center text-[11px] text-on-surface-variant py-2">
                      Showing 10 of {history.length} entries
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* History Preview Overlay */}
        {viewingHistory && (
          <div className="mt-6 border-2 border-primary/30 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-primary/20">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="text-[13px] font-semibold text-on-surface">
                  {viewingHistory.entry.production || 'Transport'}
                </span>
               <span className="text-[11px] text-on-surface-variant">
                   {viewingHistory.entry.dateRange ? formatServiceDate(viewingHistory.entry.dateRange) : (viewingHistory.entry.importDate ? formatImportDate(viewingHistory.entry.importDate) : '')}
                 </span>
                <span className="text-[11px] text-on-surface-variant">
                  {viewingHistory.services.length} services
                </span>
              </div>
              <button
                onClick={() => setViewingHistory(null)}
                className="text-on-surface-variant hover:text-on-surface text-[12px] px-2 py-1 rounded hover:bg-surface-dim cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-surface-dim z-10">
                  <tr className="text-[11px] font-medium text-on-surface-variant border-b border-outline-variant">
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Driver</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Passengers</th>
                    <th className="px-3 py-2">From</th>
                    <th className="px-3 py-2">To</th>
                    <th className="px-3 py-2">Section</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] divide-y divide-outline-variant/30">
                  {viewingHistory.services.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-dim/30">
                      <td className="px-3 py-1.5 font-medium">{s.vehicle || '—'}</td>
                      <td className="px-3 py-1.5">{s.driver || <span className="text-red-500 italic">(vacío)</span>}</td>
                      <td className="px-3 py-1.5">{formatTimeDisplay(s.time || '') || '—'}</td>
                      <td className="px-3 py-1.5">
                        {Array.isArray(s.passengers) && s.passengers.length > 0
                          ? s.passengers.map((p: any) => typeof p === 'string' ? p : p.name).join(', ')
                          : typeof s.passengers === 'string' ? s.passengers : '—'}
                      </td>
                      <td className="px-3 py-1.5 max-w-[200px] truncate">
                        {Array.isArray(s.pickupLines) && s.pickupLines.length > 0
                          ? s.pickupLines.join('; ')
                          : s.from || '—'}
                      </td>
                      <td className="px-3 py-1.5 max-w-[200px] truncate">
                        {Array.isArray(s.dropoffLines) && s.dropoffLines.length > 0
                          ? s.dropoffLines.join('; ')
                          : s.to || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-on-surface-variant">{s.section || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={e => setFilterDateFrom(e.target.value)}
                    placeholder="From"
                    className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-on-surface-variant text-[11px]">—</span>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={e => setFilterDateTo(e.target.value)}
                    placeholder="To"
                    className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Driver..."
                  value={filterDriver}
                  onChange={e => setFilterDriver(e.target.value)}
                  className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface w-24 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={filterOperatingCompany}
                  onChange={e => setFilterOperatingCompany(e.target.value)}
                  className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">All Companies</option>
                  <option value="TA">TA</option>
                  <option value="MM">MM</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">All Status</option>
                  <option value="Importado">Importado</option>
                  <option value="Asignado">Asignado</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="EnRuta">En Ruta</option>
                  <option value="Realizado">Realizado</option>
                  <option value="Reportado">Reportado</option>
                  <option value="Revision">Revisión</option>
                  <option value="Validado">Validado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
                <select
                  value={filterProject}
                  onChange={e => setFilterProject(e.target.value)}
                  className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">All Projects</option>
                  {[...new Set(services.map(s => s.project).filter(Boolean))].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  value={filterFinancialStatus}
                  onChange={e => setFilterFinancialStatus(e.target.value)}
                  className="px-2 py-1 bg-surface border border-outline-variant rounded text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">All Financial</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Calculado">Calculado</option>
                  <option value="Confrontacion">Confrontacion</option>
                  <option value="ActualsConfirmados">ActualsConfirmados</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="Facturable">Facturable</option>
                  <option value="Facturado">Facturado</option>
                  <option value="Cobrado">Cobrado</option>
                  <option value="Cerrado">Cerrado</option>
                  <option value="CerradoComercial">CerradoComercial</option>
                </select>
                {(filterDateFrom || filterDateTo || filterDriver || filterOperatingCompany || filterStatus || filterProject || filterFinancialStatus) && (
                  <button
                    onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterDriver(''); setFilterOperatingCompany(''); setFilterStatus(''); setFilterProject(''); setFilterFinancialStatus(''); }}
                    className="text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Right: Secondary actions — hidden on mobile, shown in overflow menu */}
              <div className="hidden md:flex items-center gap-2 flex-wrap">
                {/* Roles toggle */}
                <button
                  onClick={() => setShowRoles(!showRoles)}
                  className={`flex items-center gap-1 text-[12px] px-2 py-1 rounded border transition-colors cursor-pointer ${
                    showRoles 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'border-outline-variant text-on-surface-variant hover:border-primary'
                  }`}
                >
                  {showRoles ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  Roles
                </button>

                {/* Generate PDF */}
                <button
                  onClick={handleExportPdf}
                  disabled={selectedRows.size === 0}
                  className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>

                {/* Print */}
                <button
                  onClick={() => setShowPrintPreview(true)}
                  disabled={selectedRows.size === 0}
                  className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>

                {/* Excel dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); setShowWhatsAppMenu(false); setShowMoreMenu(false); }}
                    disabled={selectedRows.size === 0 || isExporting}
                    className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    {isExporting ? 'Exporting...' : 'Excel'}
                    {!isExporting && <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showExportMenu && (
                    <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-50 py-1 min-w-[180px]">
                      <button
                        onClick={handleExportExcel}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Export as Excel
                      </button>
                    </div>
                  )}
                </div>

                {/* WhatsApp dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowWhatsAppMenu(!showWhatsAppMenu); setShowExportMenu(false); setShowMoreMenu(false); }}
                    disabled={selectedRows.size === 0}
                    className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showWhatsAppMenu && (
                    <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-50 py-1 min-w-[200px]">
                      {[...new Set(services.filter(s => selectedRows.has(s.id)).map(s => s.driver).filter(Boolean))].map((driver: string) => (
                        <button
                          key={driver}
                          onClick={() => { handleWhatsAppDriver(driver); setShowWhatsAppMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          Send to {driver}
                        </button>
                      ))}
                      <div className="border-t border-outline-variant my-1"></div>
                      <button
                        onClick={handleWhatsAppGroup}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        Copy for Group
                      </button>
                    </div>
                  )}
                </div>

                {/* Email */}
                <button
                  onClick={() => setShowEmailModal(true)}
                  disabled={selectedRows.size === 0}
                  className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </button>

                {/* Agency */}
                <button
                  onClick={openAgencyModal}
                  disabled={selectedRows.size === 0}
                  className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Agency
                </button>

                {/* Remove */}
                {selectedRows.size > 0 && (
                  <button
                    onClick={removeSelectedRows}
                    className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove ({selectedRows.size})
                  </button>
                )}
              </div>

              {/* Mobile: Overflow "More" menu */}
              <div className="md:hidden relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); setShowExportMenu(false); setShowWhatsAppMenu(false); }}
                  className="flex items-center gap-1 text-[12px] px-2 py-1.5 rounded border border-outline-variant text-on-surface-variant hover:border-primary transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMoreMenu && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl z-50 py-1 min-w-[200px]">
                    {/* Roles */}
                    <button
                      onClick={() => { setShowRoles(!showRoles); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer"
                    >
                      {showRoles ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4" />}
                      {showRoles ? 'Hide Roles' : 'Show Roles'}
                    </button>
                    {/* PDF */}
                    <button
                      onClick={() => { handleExportPdf(); setShowMoreMenu(false); }}
                      disabled={selectedRows.size === 0}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                    {/* Print */}
                    <button
                      onClick={() => { setShowPrintPreview(true); setShowMoreMenu(false); }}
                      disabled={selectedRows.size === 0}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Printer className="w-4 h-4" />
                      Print Preview
                    </button>
                    {/* Excel */}
                    <button
                      onClick={() => { handleExportExcel(); setShowMoreMenu(false); }}
                      disabled={selectedRows.size === 0 || isExporting}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Excel
                    </button>
                    <div className="border-t border-outline-variant my-1"></div>
                    {/* WhatsApp */}
                    <button
                      onClick={() => { handleWhatsAppGroup(); setShowMoreMenu(false); }}
                      disabled={selectedRows.size === 0}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Copy WhatsApp Group
                    </button>
                    {/* Email */}
                    <button
                      onClick={() => { setShowEmailModal(true); setShowMoreMenu(false); }}
                      disabled={selectedRows.size === 0}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Mail className="w-4 h-4" />
                      Send Email
                    </button>
                    {/* Agency */}
                    <button
                      onClick={() => { openAgencyModal(); setShowMoreMenu(false); }}
                      disabled={selectedRows.size === 0}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Building2 className="w-4 h-4" />
                      Send to Agency
                    </button>
                    {selectedRows.size > 0 && (
                      <>
                        <div className="border-t border-outline-variant my-1"></div>
                        <button
                          onClick={() => { removeSelectedRows(); setShowMoreMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove ({selectedRows.size})
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Services — Desktop: table, Mobile: cards */}
            {(() => {
              // Group services by section, preserving order
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

              const getSectionStyleMobile = (name: string): string => {
                const upper = name.toUpperCase();
                if (upper.indexOf('ARRIVALS') > -1 || upper.indexOf('DEPARTURES') > -1) return 'bg-[#7ecfc0]';
                if (upper === 'PUGLIA') return 'bg-[#a8d8ea]';
                return 'bg-[#c6d44e]';
              };

              // Build ordered list of [sectionName, services[]] pairs
              const orderedGroups: { section: string; services: typeof services }[] = [];
              for (const [secName, secServices] of sectionMap) {
                orderedGroups.push({ section: secName, services: secServices });
              }
              if (noSection.length > 0) {
                orderedGroups.push({ section: '', services: noSection });
              }

              return (
                <>
                  {/* Desktop: table view */}
                  <div className="hidden md:block bg-surface-container-lowest rounded-lg border border-outline-variant">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                      <tr className="bg-surface-dim text-on-surface-variant text-[11px] font-medium border-b border-outline-variant uppercase tracking-wide">
                        <th className="px-2 py-2 w-8">
                          <input 
                            type="checkbox" 
                            checked={selectedRows.size === services.filter(s => !isServiceCompleted(s)).length && services.filter(s => !isServiceCompleted(s)).length > 0}
                            onChange={toggleAllSelection}
                            className="rounded cursor-pointer"
                          />
                        </th>
                        <th className="px-2 py-2">Vehicle</th>
                        <th className="px-2 py-2">Driver</th>
                        <th className="px-2 py-2 hidden lg:table-cell">Phone</th>
                        <th className="px-2 py-2 w-[60px]">Time</th>
                        <th className="px-2 py-2">Passengers</th>
                        {showRoles && <th className="px-2 py-2 hidden xl:table-cell">Roles</th>}
                        <th className="px-2 py-2 hidden md:table-cell">From</th>
                        <th className="px-2 py-2 hidden md:table-cell">To</th>
                        <th className="px-2 py-2">Company</th>
                        <th className="px-2 py-2 hidden xl:table-cell">Flight</th>
                        <th className="px-2 py-2 hidden xl:table-cell">Notes</th>
                        <th className="px-2 py-2 w-[120px]">Actions</th>
                      </tr>
                        </thead>
                        <tbody className="text-[12px] text-on-surface divide-y divide-outline-variant/50">
                          {orderedGroups.map((group) => (
                            <React.Fragment key={group.section || 'nosection'}>
                              {group.section && (
                                <tr>
                                  <td colSpan={showRoles ? 13 : 12} className={`px-3 py-1 text-center text-[11px] font-bold ${getSectionStyle(group.section)}`} style={{ border: '1px solid #000' }}>
                                    {group.section}
                                  </td>
                                </tr>
                              )}
                              {group.services.map((service, idx) => renderServiceRow(service, selectedRows.has(service.id), idx))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile: card view */}
                  <div className="md:hidden space-y-2">
                    {/* Select all on mobile */}
                    <div className="flex items-center justify-between px-1 py-1">
                      <button
                        onClick={toggleAllSelection}
                        className="text-[12px] text-primary font-medium cursor-pointer"
                      >
                        {selectedRows.size === filteredServices.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="text-on-surface-variant text-[11px]">{selectedRows.size} of {filteredServices.length}</span>
                    </div>

                    {orderedGroups.map((group) => (
                      <React.Fragment key={group.section || 'nosection'}>
                        {group.section && (
                          <div className={`px-3 py-1.5 rounded-md text-center text-[11px] font-bold ${getSectionStyleMobile(group.section)}`} style={{ border: '1px solid #000' }}>
                            {group.section}
                          </div>
                        )}
                        {group.services.map((service) => {
                          const isSelected = selectedRows.has(service.id);
                          const isEmpty = (v: string) => !v || v.trim() === '';
                          return (
                            <div
                              key={service.id}
                              className={`border rounded-lg p-3 transition-colors ${
                                isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'
                              }`}
                            >
                              {/* Top row: checkbox + time + vehicle */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleRowSelection(service.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={isServiceCompleted(service)}
                                  className={`rounded shrink-0 ${isServiceCompleted(service) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                />
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded min-w-[48px]">
                                  <EditableCell rowId={service.id} field="time" value={service.time} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <EditableCell rowId={service.id} field="vehicle" value={service.vehicle} />
                                </div>
                                {service.section && (
                                  <span className="text-[9px] font-medium text-on-surface-variant bg-surface-dim px-1.5 py-0.5 rounded shrink-0">
                                    {service.section}
                                  </span>
                                )}
                              </div>
                              {/* Driver + Phone */}
                              <div className="flex items-center gap-2 text-[12px]">
                                <div className="flex-1 min-w-0">
                                  <DriverCell service={service} dbDrivers={dbDrivers} onUpdate={handleDriverUpdate} />
                                </div>
                                {service.driverPhone && (
                                  <span className="text-on-surface-variant text-[11px] shrink-0">
                                    {service.driverPhone.replace(/^'/, '')}
                                  </span>
                                )}
                              </div>
                              {/* OperatingCompany */}
                              <div className="mt-1">
                                <OperatingCompanyCell service={service} onUpdate={handleOperatingCompanyUpdate} />
                              </div>
                              {/* Passengers */}
                              {(Array.isArray(service.passengers) ? service.passengers.length > 0 : !!service.passengers) && (
                                <div className="text-[11px] text-on-surface-variant mt-1 truncate">
                                  {passengerDisplay(service.passengers)}
                                </div>
                              )}
                              {/* From → To */}
                              {(pickupDisplay(service.pickupLines) || dropoffDisplay(service.dropoffLines)) && (
                                <div className="text-[10px] text-on-surface-variant/70 mt-1 truncate">
                                  {pickupDisplay(service.pickupLines)} → {dropoffDisplay(service.dropoffLines)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </>
              );
            })()}

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
              {services.filter(s => selectedRows.has(s.id)).length} servicios sincronizados con el Sheet.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={clearFile}
                className="px-4 py-2 text-[13px] font-medium border border-outline-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
              >
                Import Another
              </button>
              <button
                onClick={() => onNavigate('dashboard', 'push')}
                className="px-4 py-2 text-[13px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
              >
                View Calendar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <h3 className="font-semibold text-on-surface flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send Transport List by Email
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
                  Recipients (comma separated)
                </label>
                <input
                  type="text"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder={`Transport List — ${dateStr || 'Today'}`}
                  className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="text-[12px] text-on-surface-variant">
                {selectedRows.size} servicios serán incluidos como adjunto Excel
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-outline-variant">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-3 py-1.5 text-[12px] font-medium border border-outline-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSending || !emailRecipients.trim()}
                className="px-3 py-1.5 text-[12px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agency Modal */}
      {showAgencyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <h3 className="font-semibold text-on-surface flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Send Services to Agency
              </h3>
              <button onClick={() => setShowAgencyModal(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Agency selection */}
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
                  Select Agency
                </label>
                {loadingAgencies ? (
                  <div className="flex items-center gap-2 text-[12px] text-on-surface-variant py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading agencies...
                  </div>
                ) : agencies.length === 0 ? (
                  <div className="text-[12px] text-amber-600 py-2">
                    No agencies configured. Add them in the Agencies sheet.
                  </div>
                ) : (
                  <select
                    value={selectedAgency?.name || ''}
                    onChange={(e) => {
                      const agency = agencies.find(a => a.name === e.target.value);
                      setSelectedAgency(agency || null);
                    }}
                    className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">Select an agency...</option>
                    {agencies.map(agency => (
                      <option key={agency.name} value={agency.name}>
                        {agency.name} — {agency.contactPerson || agency.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Services to send */}
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
                  Services to send ({agencyServices.length})
                </label>
                <div className="border border-outline-variant rounded-lg max-h-[200px] overflow-y-auto">
                  {agencyServices.length === 0 ? (
                    <div className="text-[12px] text-on-surface-variant p-3 text-center">
                      No services selected
                    </div>
                  ) : (
                    agencyServices.map((service, i) => (
                      <div key={service.id} className="px-3 py-2 border-b border-outline-variant/50 last:border-0 text-[12px]">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{service.time} — {service.vehicle}</span>
                          <button
                            onClick={() => setAgencyServices(prev => prev.filter(s => s.id !== service.id))}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-on-surface-variant">{passengerDisplay(service.passengers)}</div>
                        <div className="text-on-surface-variant text-[11px]">{pickupDisplay(service.pickupLines)} → {dropoffDisplay(service.dropoffLines)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={agencyNotes}
                  onChange={(e) => setAgencyNotes(e.target.value)}
                  placeholder="Additional notes for the agency..."
                  rows={2}
                  className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              {/* Actions */}
              {selectedAgency && agencyServices.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleWhatsAppAgency}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[12px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Send via WhatsApp
                  </button>
                  <button
                    onClick={handleSendToAgency}
                    disabled={isSending}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[12px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    Send via Email
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end px-4 py-3 border-t border-outline-variant">
              <button
                onClick={() => setShowAgencyModal(false)}
                className="px-3 py-1.5 text-[12px] font-medium border border-outline-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal — Client/Project/OperatingCompany selection */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <h3 className="font-semibold text-on-surface flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                Link Import to Project
              </h3>
              <button onClick={() => { setShowImportModal(false); setStep('preview'); }} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Production / Project info */}
              <div className="bg-surface-dim rounded-lg px-3 py-2 text-[12px] space-y-1">
                {production && (
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant font-medium">Production:</span>
                    <span className="text-on-surface font-semibold">{production}</span>
                  </div>
                )}
                {projectName && (
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant font-medium">Project:</span>
                    <span className="text-on-surface font-semibold italic" style={{ fontFamily: 'Georgia, serif' }}>{projectName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant font-medium">Services:</span>
                  <span className="text-on-surface">{selectedRows.size} selected</span>
                </div>
              </div>

              {/* OperatingCompany */}
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">
                  Operating Company
                </label>
                <div className="flex gap-2">
                  {['TA', 'MM'].map(co => (
                    <button
                      key={co}
                      onClick={() => setImportModalOperatingCompany(co)}
                      className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-lg border-2 transition-colors cursor-pointer ${
                        importModalOperatingCompany === co
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                      }`}
                    >
                      {co === 'TA' ? 'Transport Action' : 'Movie Motion'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client */}
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">
                  Client
                </label>
                {importModalLoading ? (
                  <div className="flex items-center gap-2 text-[12px] text-on-surface-variant py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Detecting...
                  </div>
                ) : (
                  <select
                    value={importModalClientId}
                    onChange={(e) => setImportModalClientId(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">
                      {importModalAutoDetected?.client
                        ? `— Use detected: ${importModalAutoDetected.client.name} —`
                        : `— Auto-create from "${production || 'production'}" —`}
                    </option>
                    {importModalAutoDetected?.clients?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                {importModalAutoDetected?.client && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    Detected: {importModalAutoDetected.client.name}
                  </p>
                )}
              </div>

              {/* Project */}
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">
                  Project
                </label>
                {importModalLoading ? (
                  <div className="flex items-center gap-2 text-[12px] text-on-surface-variant py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Detecting...
                  </div>
                ) : (
                  <select
                    value={importModalProjectId}
                    onChange={(e) => setImportModalProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">
                      {importModalAutoDetected?.project
                        ? `— Use detected: ${importModalAutoDetected.project.name} —`
                        : `— Auto-create from "${projectName || production || 'project'}" —`}
                    </option>
                    {importModalAutoDetected?.projects?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                {importModalAutoDetected?.project && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    Detected: {importModalAutoDetected.project.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-outline-variant">
              <button
                onClick={() => { setShowImportModal(false); setStep('preview'); }}
                className="px-3 py-1.5 text-[12px] font-medium border border-outline-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={handleImportModalConfirm}
                disabled={importModalLoading || selectedRows.size === 0}
                className="px-4 py-1.5 text-[12px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Import {selectedRows.size} Services
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Result Modal */}
      {exportResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <h3 className="font-semibold text-on-surface flex items-center gap-2">
                {exportResult.type === 'pdf' ? (
                  <><FileText className="w-4 h-4 text-primary" /> PDF Generado</>
                ) : (
                  <><FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel Exportado</>
                )}
              </h3>
              <button onClick={() => setExportResult(null)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex flex-col items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                exportResult.type === 'pdf' ? 'bg-primary/10' : 'bg-emerald-100'
              }`}>
                {exportResult.type === 'pdf' ? (
                  <FileText className="w-7 h-7 text-primary" />
                ) : (
                  <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                )}
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium text-on-surface">
                  {exportResult.type === 'pdf' ? 'PDF descargado correctamente' : 'Archivo generado con éxito'}
                </p>
                <p className="text-[11px] text-on-surface-variant mt-0.5 truncate max-w-[250px]">{exportResult.fileName}</p>
              </div>
              {/* Excel-only: download + copy link */}
              {exportResult.type === 'excel' && (
                <div className="flex flex-col gap-2 w-full">
                  {exportResult.downloadUrl && (
                    <a
                      href={exportResult.downloadUrl}
                      download
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors text-center"
                    >
                      <Download className="w-4 h-4" />
                      Descargar archivo
                    </a>
                  )}
                  <button
                    onClick={() => {
                      const url = exportResult.downloadUrl || exportResult.url;
                      if (url) {
                        navigator.clipboard.writeText(url).then(() => {
                          showToast('Link copiado al portapapeles', 'success');
                        });
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-medium border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
                  >
                    Copiar link
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end px-4 py-3 border-t border-outline-variant">
              <button
                onClick={() => setExportResult(null)}
                className="px-3 py-1.5 text-[12px] font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Save Prompt — appears after PDF generation asking to register transport */}
      {showSavePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Save className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-on-surface text-[15px] mb-1">¿Guardar transport?</h3>
              <p className="text-[12px] text-on-surface-variant leading-relaxed">
                ¿Querés registrar estos <strong>{selectedRows.size} servicios</strong> en el sheet para usarlos en Calendar, Rapportinos e History?
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => {
                  setShowSavePrompt(false);
                  handleSync();
                }}
                className="flex-1 px-3 py-2.5 text-[13px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 inline mr-1.5" />
                Guardar en Sheet
              </button>
              <button
                onClick={() => setShowSavePrompt(false)}
                className="flex-1 px-3 py-2 text-[12px] font-medium border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
              >
                No, gracias
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
