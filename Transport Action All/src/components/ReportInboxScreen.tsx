import React, { useState, useEffect } from 'react';
import { Inbox, Eye, Filter } from 'lucide-react';
import InboxNormalizeModal from './InboxNormalizeModal';
import InboxDetailsModal from './InboxDetailsModal';
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

// Normalized data fields (what the user edits during normalization)
export export interface NormalizedFields {
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

// Service reference data (from transport list — matches backend DTO camelCase)
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

interface ReportInboxScreenProps {
  onNavigate: (screen: string) => void;
}

export default function ReportInboxScreen({ onNavigate }: ReportInboxScreenProps) {
  const { token, can } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [serviceRef, setServiceRef] = useState<ServiceRef | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Normalize form state
  const [normForm, setNormForm] = useState<NormalizedFields>(DEFAULT_NORMALIZED);

  // Service matching for WhatsApp captures
  const [matchingServices, setMatchingServices] = useState<any[]>([]);
  const [isSearchingServices, setIsSearchingServices] = useState(false);

  // Filters
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDriver, setFilterDriver] = useState('');

  // ID → Name lookup maps
  const [driverMap, setDriverMap] = useState<Record<string, string>>({});
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadItems();
    loadLookups();
  }, []);

  const loadLookups = async () => {
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
  };

  const driverName = (id: string, item?: InboxItem) => {
    if (driverMap[id]) return driverMap[id];
    // Fallback: try to get name from rawData
    if (item) {
      try { const raw = JSON.parse(item.RawData || '{}'); if (raw.driverName) return raw.driverName; } catch {}
    }
    return id;
  };
  const projectName = (id: string, item?: InboxItem) => {
    if (!id && !item) return '—';
    if (projectMap[id]) return projectMap[id];
    // Fallback: try to get name from rawData
    if (item) {
      try {
        const raw = JSON.parse(item.RawData || '{}');
        if (raw.projectName) return raw.projectName;
      } catch {}
    }
    return id || '—';
  };

  const getRawData = (item: InboxItem) => {
    try { return JSON.parse(item.RawData || '{}'); } catch { return {}; }
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return d; }
  };

  const loadItems = async () => {
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
  };

  // Parse raw data into normalized fields for editing
  // Supports both Italian (orarioInizio...) and English (startTime...) field names
  const parseRawData = (rawJson: string): NormalizedFields => {
    try {
      const raw = JSON.parse(rawJson || '{}');
      const toTime = (v: any) => {
        if (!v) return '';
        // If it's already HH:MM format, return as-is
        if (/^\d{1,2}:\d{2}$/.test(String(v))) return String(v);
        // If it's "H.M" transport list format, normalize
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
  };

  // When selecting an item, pre-fill normalize form + fetch service ref
  const handleSelectItem = async (item: InboxItem) => {
    setSelectedItem(item);
    setRejectReason('');
    setServiceRef(null);
    setMatchingServices([]);

    // Pre-fill form from NormalizedData if exists, else from RawData
    if (item.NormalizedData) {
      setNormForm(parseRawData(item.NormalizedData));
    } else {
      setNormForm(parseRawData(item.RawData));
    }

    // Fetch service reference data for comparison
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
    } catch {
      // Service not found — show form without reference
    }

    // For WhatsApp captures: search for matching services by driver
    if (item.Source === 'whatsapp' && item.DriverID) {
      setIsSearchingServices(true);
      try {
        const services = await getServices({ driverId: item.DriverID });
        // Only show services that can accept a report
        // Importado→Realizado: no report yet. Reportado/Revision: report may be missing or need update.
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
  };

  // Compare driver input vs service reference
  const getFieldDiff = (driverValue: string | number, refValue: string | number | undefined): boolean => {
    if (!refValue && refValue !== 0) return false;
    return String(driverValue) !== String(refValue);
  };

  // Normalize: CAPTURED → NORMALIZED
  const handleNormalize = async (inboxId: string) => {
    // Validate service selection for WhatsApp captures
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
  };

  // §28: Quick Approve → Normalize + Send to Review (no auto-accept)
  const handleQuickApprove = async (inboxId: string) => {
    // Validate service selection for WhatsApp captures
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
      // Reload to show current state
      loadItems();
    } finally {
      setIsSaving(false);
    }
  };

  // Submit to review: NORMALIZED → PENDING_REVIEW
  const handleSubmitToReview = async (inboxId: string) => {
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
  };

  // Accept: PENDING_REVIEW → ACCEPTED
  const handleAccept = async (inboxId: string) => {
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
  };

  // Reject: PENDING_REVIEW → REJECTED
  const handleReject = async (inboxId: string) => {
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
  };

  // Lock: PENDING_REVIEW → LOCKED
  const handleLock = async (inboxId: string) => {
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
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CAPTURED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Captured</span>;
      case 'NORMALIZED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Normalized</span>;
      case 'PENDING_REVIEW': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Review</span>;
      case 'ACCEPTED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Accepted</span>;
      case 'REJECTED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
      case 'LOCKED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Locked</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100">{status}</span>;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'whatsapp': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">WhatsApp</span>;
      case 'driverlink': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Driver Link</span>;
      case 'backoffice': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Backoffice</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100">{source}</span>;
    }
  };

  const filteredItems = items.filter(item => {
    if (filterSource && item.Source !== filterSource) return false;
    if (filterStatus && item.Status !== filterStatus) return false;
    if (filterDriver && item.DriverID !== filterDriver) return false;
    return true;
  });

  // Stats
  const stats = {
    total: items.length,
    captured: items.filter(i => i.Status === 'CAPTURED').length,
    pendingReview: items.filter(i => i.Status === 'PENDING_REVIEW').length,
    accepted: items.filter(i => i.Status === 'ACCEPTED').length,
    rejected: items.filter(i => i.Status === 'REJECTED').length,
  };

  const isNormalizable = selectedItem?.Status === 'CAPTURED';
  const isReviewable = selectedItem?.Status === 'NORMALIZED';
  const isPendingReview = selectedItem?.Status === 'PENDING_REVIEW';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto overflow-x-hidden">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Report Inbox</h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1">Unified capture layer for driver reports</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-on-surface">{stats.total}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">Total</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-blue-600">{stats.captured}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">Captured</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-yellow-600">{stats.pendingReview}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">Pending Review</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-green-600">{stats.accepted}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">Accepted</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-red-600">{stats.rejected}</div>
          <div className="text-[11px] text-on-surface-variant mt-1">Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-on-surface-variant" />
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="px-2 py-1.5 border border-outline-variant rounded-lg text-[12px] bg-surface focus:border-primary outline-none cursor-pointer"
          >
            <option value="">All Sources</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="driverlink">Driver Link</option>
            <option value="backoffice">Backoffice</option>
          </select>
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-2 py-1.5 border border-outline-variant rounded-lg text-[12px] bg-surface focus:border-primary outline-none cursor-pointer shrink-0"
        >
          <option value="">All Status</option>
          <option value="CAPTURED">Captured</option>
          <option value="NORMALIZED">Normalized</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
          <option value="LOCKED">Locked</option>
        </select>
        <input
          type="text"
          placeholder="Filter by Driver..."
          value={filterDriver}
          onChange={e => setFilterDriver(e.target.value)}
          className="px-2 py-1.5 border border-outline-variant rounded-lg text-[12px] bg-surface focus:border-primary outline-none shrink-0 w-full sm:w-auto"
        />
      </div>

      {/* Items Table */}
      {isLoading ? (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Source</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Driver</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Project</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Date</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Correlation</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-5 w-16 bg-surface-dim rounded-full" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-20 bg-surface-dim rounded-full" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-24 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3 text-right"><div className="h-7 w-7 bg-surface-dim rounded ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No inbox items found</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Source</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Driver</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Project</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Date</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Correlation</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredItems.map(item => (
                <tr key={item.ID} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-3">{getSourceBadge(item.Source)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{driverName(item.DriverID, item)}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{projectName(item.ProjectID, item)}</td>
                  <td className="px-4 py-3 text-sm">{formatDisplayDate(item.ServiceDate)}</td>
                  <td className="px-4 py-3">{getStatusBadge(item.Status)}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">{item.CorrelationID?.substring(0, 12)}...</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSelectItem(item)}
                      className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4 text-on-surface-variant" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ============================================================================
          COMPARISON MODAL — CAPTURED: Driver input vs Service reference
          ============================================================================ */}
      {selectedItem && isNormalizable && (
        <InboxNormalizeModal
          item={selectedItem}
          normForm={normForm}
          onNormFormChange={setNormForm}
          serviceRef={serviceRef}
          matchingServices={matchingServices}
          isSearchingServices={isSearchingServices}
          onClose={() => setSelectedItem(null)}
          onQuickApprove={handleQuickApprove}
          onNormalize={handleNormalize}
          isSaving={isSaving}
          canNormalize={!!can('inbox.normalize')}
          driverName={driverName}
          projectName={projectName}
          formatDisplayDate={formatDisplayDate}
          getFieldDiff={getFieldDiff}
          getRawData={getRawData}
        />
      )}

      {/* ============================================================================
          STANDARD MODAL — NORMALIZED / PENDING_REVIEW / ACCEPTED / REJECTED
          ============================================================================ */}
      {selectedItem && !isNormalizable && (
        <InboxDetailsModal
          item={selectedItem}
          rejectReason={rejectReason}
          onRejectReasonChange={setRejectReason}
          onClose={() => setSelectedItem(null)}
          onSubmitToReview={handleSubmitToReview}
          onAccept={handleAccept}
          onReject={handleReject}
          onLock={handleLock}
          isSaving={isSaving}
          isReviewable={isReviewable}
          isPendingReview={isPendingReview}
          canReview={!!can('inbox.review')}
          driverName={driverName}
          projectName={projectName}
          formatDisplayDate={formatDisplayDate}
        />
      )}
    </div>
  );
}
