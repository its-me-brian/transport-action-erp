import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  getInboxItems, normalizeReport, submitToReview, acceptReport,
  rejectReport, lockReport, getServiceById, getDrivers, getProjects,
  getServices
} from '../services/api';

export interface InboxItem {
  ID: string;
  Source: string;
  Channel: string;
  DriverID: string;
  ProjectID: string;
  ServiceDate: string;
  RawData: string;
  NormalizedData: string;
  Status: string;
  CorrelationID: string;
  ReviewedBy: string;
  ReviewedAt: string;
  RejectionReason: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface NormalizedFields {
  serviceId: string;
  startTime: string;
  endTime: string;
  kmTotal: number;
  kmOver: number;
  diariaType: 'piena' | 'mezza' | 'none';
  notes: string;
}

const DEFAULT_NORMALIZED: NormalizedFields = {
  serviceId: '',
  startTime: '',
  endTime: '',
  kmTotal: 0,
  kmOver: 0,
  diariaType: 'none',
  notes: '',
};

interface ServiceRef {
  id: string;
  time: string;
  production: string;
  section: string;
  passengerName: string;
  passengerRole: string;
  vehicleId: string;
  operationalStatus: string;
  driverId: string;
  date: string;
}

interface UseReportInboxProps {
  onNavigate: (screen: string) => void;
  onServiceUpdate?: () => void;
}

export function useReportInbox({ onNavigate, onServiceUpdate }: UseReportInboxProps) {
  const { token, can } = useAuth();
  const { showToast } = useToast();

  // State
  const [items, setItems] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [serviceRef, setServiceRef] = useState<ServiceRef | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [normForm, setNormForm] = useState<NormalizedFields>(DEFAULT_NORMALIZED);
  const [matchingServices, setMatchingServices] = useState<any[]>([]);
  const [isSearchingServices, setIsSearchingServices] = useState(false);
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [driverMap, setDriverMap] = useState<Record<string, string>>({});
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});

  // Load lookups
  const loadLookups = useCallback(async () => {
    try {
      const [drivers, projects] = await Promise.all([getDrivers(), getProjects()]);
      const dMap: Record<string, string> = {};
      if (Array.isArray(drivers)) drivers.forEach((d: any) => { dMap[d.id] = d.name || d.id; });
      const pMap: Record<string, string> = {};
      if (Array.isArray(projects)) projects.forEach((p: any) => { pMap[p.id] = p.name || p.id; });
      setDriverMap(dMap);
      setProjectMap(pMap);
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  }, []);

  // Load inbox items
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getInboxItems();
      if (Array.isArray(result)) {
        setItems(result);
      }
    } catch (err) {
      console.error('Failed to load inbox items:', err);
      showToast('Error al cargar los reportes', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    loadItems();
    loadLookups();
  }, [loadItems, loadLookups]);

  // Helper functions
  const driverName = useCallback((id: string, item?: InboxItem) => {
    if (driverMap[id]) return driverMap[id];
    if (item) {
      try {
        const raw = JSON.parse(item.RawData || '{}');
        if (raw.driverName) return raw.driverName;
      } catch {}
    }
    return id;
  }, [driverMap]);

  const projectName = useCallback((id: string, item?: InboxItem) => {
    if (!id && !item) return '—';
    if (projectMap[id]) return projectMap[id];
    if (item) {
      try {
        const raw = JSON.parse(item.RawData || '{}');
        if (raw.projectName) return raw.projectName;
      } catch {}
    }
    return id || '—';
  }, [projectMap]);

  const getRawData = useCallback((item: InboxItem) => {
    try {
      return JSON.parse(item.RawData || '{}');
    } catch {
      return {};
    }
  }, []);

  const formatDisplayDate = useCallback((d: string) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return d;
    }
  }, []);

  const parseRawData = useCallback((rawJson: string): NormalizedFields => {
    try {
      const raw = JSON.parse(rawJson || '{}');
      const toTime = (v: any) => {
        if (!v) return '';
        if (/^\d{1,2}:\d{2}$/.test(String(v))) return String(v);
        const s = String(v).replace(/[.,]/, ':');
        if (/^\d{1,2}:\d{2}$/.test(s)) return s;
        return String(v);
      };
      return {
        startTime: toTime(raw.startTime || raw.start || raw.orarioInizio || ''),
        endTime: toTime(raw.endTime || raw.end || raw.orarioFine || ''),
        kmTotal: parseFloat(raw.kmTotal || raw.km || raw.kmTotali) || 0,
        kmOver: parseFloat(raw.kmOver || raw.kmExtra) || 0,
        diariaType: raw.diariaType || raw.diaria || 'none',
        notes: raw.notes || raw.note || '',
      };
    } catch {
      return DEFAULT_NORMALIZED;
    }
  }, []);

  // Handlers
  const handleSelectItem = useCallback(async (item: InboxItem) => {
    setSelectedItem(item);
    setRejectReason('');
    setServiceRef(null);
    setMatchingServices([]);

    if (item.NormalizedData) {
      setNormForm(parseRawData(item.NormalizedData));
    } else {
      setNormForm(parseRawData(item.RawData));
    }

    try {
      const raw = JSON.parse(item.RawData || '{}');
      const serviceId = raw.serviceId || '';
      if (serviceId) {
        const svc = await getServiceById(serviceId);
        if (svc) {
          setServiceRef(svc);
          setNormForm(p => ({ ...p, serviceId }));
        }
      }
    } catch {}

    if (item.Source === 'whatsapp' && item.DriverID) {
      setIsSearchingServices(true);
      try {
        const services = await getServices({ driverId: item.DriverID });
        const REPORTABLE = ['Importado', 'Asignado', 'Confirmado', 'EnRuta', 'Realizado', 'Reportado', 'Revision'];
        const matched = (services || [])
          .filter((s: any) => {
            const st = s.operationalStatus || s.status || '';
            return REPORTABLE.includes(st);
          })
          .sort((a: any, b: any) => {
            const da = new Date(a.date || 0).getTime();
            const db = new Date(b.date || 0).getTime();
            return db - da;
          });
        setMatchingServices(matched);
      } catch (err) {
        console.error('Failed to search matching services:', err);
      } finally {
        setIsSearchingServices(false);
      }
    }
  }, [parseRawData]);

  const getFieldDiff = useCallback((driverValue: string | number, refValue: string | number | undefined): boolean => {
    if (!refValue && refValue !== 0) return false;
    return String(driverValue) !== String(refValue);
  }, []);

  const handleNormalize = useCallback(async (inboxId: string) => {
    if (selectedItem?.Source === 'whatsapp' && !serviceRef && !normForm.serviceId) {
      showToast('Please select a service before normalizing', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await normalizeReport(inboxId, normForm);
      setSelectedItem(null);
      loadItems();
    } catch (err) {
      console.error('Failed to normalize report:', err);
      showToast('Error al normalizar el reporte', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [selectedItem, serviceRef, normForm, showToast, loadItems]);

  const handleQuickApprove = useCallback(async (inboxId: string) => {
    if (selectedItem?.Source === 'whatsapp' && !serviceRef && !normForm.serviceId) {
      showToast('Please select a service before approving', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await normalizeReport(inboxId, normForm);
      await submitToReview(inboxId);
      setSelectedItem(null);
      showToast('Reporte normalizado y enviado a revisión', 'success');
      loadItems();
    } catch (err) {
      console.error('Quick approve failed:', err);
      showToast('Error en la aprobación rápida. Intentá paso a paso.', 'error');
      loadItems();
    } finally {
      setIsSaving(false);
    }
  }, [selectedItem, serviceRef, normForm, showToast, loadItems]);

  const handleSubmitToReview = useCallback(async (inboxId: string) => {
    setIsSaving(true);
    try {
      await submitToReview(inboxId);
      setSelectedItem(null);
      loadItems();
    } catch (err) {
      console.error('Failed to submit to review:', err);
      showToast('Error al enviar a revisión', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [loadItems, showToast]);

  const handleAccept = useCallback(async (inboxId: string) => {
    setIsSaving(true);
    try {
      await acceptReport(inboxId);
      setSelectedItem(null);
      showToast('Reporte aceptado y creado', 'success');
      loadItems();
    } catch (err) {
      console.error('Failed to accept report:', err);
      showToast('Error al aceptar el reporte', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [loadItems, showToast]);

  const handleReject = useCallback(async (inboxId: string) => {
    if (!rejectReason) return;
    setIsSaving(true);
    try {
      await rejectReport(inboxId, rejectReason);
      setSelectedItem(null);
      setRejectReason('');
      loadItems();
    } catch (err) {
      console.error('Failed to reject report:', err);
      showToast('Error al rechazar el reporte', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [rejectReason, loadItems, showToast]);

  const handleLock = useCallback(async (inboxId: string) => {
    setIsSaving(true);
    try {
      await lockReport(inboxId);
      setSelectedItem(null);
      loadItems();
    } catch (err) {
      console.error('Failed to lock report:', err);
      showToast('Error al bloquear el reporte', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [loadItems, showToast]);

  // Computed values
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterSource && item.Source !== filterSource) return false;
      if (filterStatus && item.Status !== filterStatus) return false;
      if (filterDriver && item.DriverID !== filterDriver) return false;
      return true;
    });
  }, [items, filterSource, filterStatus, filterDriver]);

  const stats = useMemo(() => ({
    total: items.length,
    captured: items.filter(i => i.Status === 'CAPTURED').length,
    pendingReview: items.filter(i => i.Status === 'PENDING_REVIEW').length,
    accepted: items.filter(i => i.Status === 'ACCEPTED').length,
    rejected: items.filter(i => i.Status === 'REJECTED').length,
  }), [items]);

  const isNormalizable = selectedItem?.Status === 'CAPTURED';
  const isReviewable = selectedItem?.Status === 'NORMALIZED';
  const isPendingReview = selectedItem?.Status === 'PENDING_REVIEW';

  return {
    // State
    items,
    isLoading,
    selectedItem,
    serviceRef,
    rejectReason,
    isSaving,
    normForm,
    matchingServices,
    isSearchingServices,
    filterSource,
    filterStatus,
    filterDriver,
    driverMap,
    projectMap,

    // Computed
    filteredItems,
    stats,
    isNormalizable,
    isReviewable,
    isPendingReview,

    // Handlers
    setSelectedItem,
    setRejectReason,
    setNormForm,
    setFilterSource,
    setFilterStatus,
    setFilterDriver,
    handleSelectItem,
    handleNormalize,
    handleQuickApprove,
    handleSubmitToReview,
    handleAccept,
    handleReject,
    handleLock,
    loadItems,

    // Helpers
    driverName,
    projectName,
    getRawData,
    formatDisplayDate,
    getFieldDiff,

    // Auth
    can,
  };
}
