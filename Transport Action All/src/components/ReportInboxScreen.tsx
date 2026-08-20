import React, { useState, useEffect } from 'react';
import { Inbox, Check, X, Lock, Eye, Filter, Send, Edit3, Zap, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  getInboxItems, normalizeReport, submitToReview, acceptReport,
  rejectReport, lockReport, getServiceById, getDrivers, getProjects
} from '../services/api';

interface InboxItem {
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
interface NormalizedFields {
  startTime: string;
  endTime: string;
  kmTotal: number;
  kmOver: number;
  diariaType: 'piena' | 'mezza' | 'none';
  notes: string;
}

const DEFAULT_NORMALIZED: NormalizedFields = {
  startTime: '',
  endTime: '',
  kmTotal: 0,
  kmOver: 0,
  diariaType: 'none',
  notes: '',
};

// Service reference data (from transport list)
interface ServiceRef {
  Time: string;
  Production: string;
  Section: string;
  PassengerName: string;
  PassengerRole: string;
  VehicleID: string;
  OperationalStatus: string;
  DriverID: string;
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
        if (svc) setServiceRef(svc);
      }
    } catch {
      // Service not found — show form without reference
    }
  };

  // Compare driver input vs service reference
  const getFieldDiff = (driverValue: string | number, refValue: string | number | undefined): boolean => {
    if (!refValue && refValue !== 0) return false;
    return String(driverValue) !== String(refValue);
  };

  // Normalize: CAPTURED → NORMALIZED
  const handleNormalize = async (inboxId: string) => {
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

  // Quick Approve: CAPTURED → NORMALIZED → PENDING_REVIEW → ACCEPTED (one click)
  const handleQuickApprove = async (inboxId: string) => {
    setIsSaving(true);
    try {
      await normalizeReport(inboxId, normForm);
      await submitToReview(inboxId);
      await acceptReport(inboxId);
      setSelectedItem(null);
      showToast('Reporte aprobado y creado exitosamente', 'success');
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Report Inbox</h1>
        <p className="text-sm text-on-surface-variant mt-1">Unified capture layer for driver reports</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-on-surface">{stats.total}</div>
          <div className="text-xs text-on-surface-variant mt-1">Total</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.captured}</div>
          <div className="text-xs text-on-surface-variant mt-1">Captured</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</div>
          <div className="text-xs text-on-surface-variant mt-1">Pending Review</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          <div className="text-xs text-on-surface-variant mt-1">Accepted</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-xs text-on-surface-variant mt-1">Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-on-surface-variant" />
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm"
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
          className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm"
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
          className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm"
        />
      </div>

      {/* Items Table */}
      {isLoading ? (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <table className="w-full">
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
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No inbox items found</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <table className="w-full">
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
      )}

      {/* ============================================================================
          COMPARISON MODAL — CAPTURED: Driver input vs Service reference
          ============================================================================ */}
      {selectedItem && isNormalizable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Review Driver Submission</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Compare driver input with transport list reference
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-surface-container rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata */}
            <div className="px-6 py-3 bg-surface-container flex flex-wrap gap-4 text-xs">
              <div><span className="text-on-surface-variant">Source:</span> {getSourceBadge(selectedItem.Source)}</div>
              <div><span className="text-on-surface-variant">Driver:</span> <strong>{driverName(selectedItem.DriverID, selectedItem)}</strong></div>
              <div><span className="text-on-surface-variant">Project:</span> {projectName(selectedItem.ProjectID, selectedItem)}</div>
              <div><span className="text-on-surface-variant">Date:</span> {formatDisplayDate(selectedItem.ServiceDate)}</div>
            </div>

            <div className="px-6 py-4">
              {/* Service Reference — from API or from rawData fallback */}
              {(serviceRef || getRawData(selectedItem).production) && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">
                    Transport List Reference
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {serviceRef?.Time && (
                      <div>
                        <span className="text-blue-600">Time:</span>{' '}
                        <strong className="font-mono">{serviceRef.Time}</strong>
                      </div>
                    )}
                    <div>
                      <span className="text-blue-600">Production:</span>{' '}
                      {serviceRef?.Production || getRawData(selectedItem).production || '—'}
                    </div>
                    {(serviceRef?.Section || getRawData(selectedItem).section) && (
                      <div>
                        <span className="text-blue-600">Section:</span>{' '}
                        {serviceRef?.Section || getRawData(selectedItem).section}
                      </div>
                    )}
                    {(serviceRef?.PassengerName || getRawData(selectedItem).passengerName) && (
                      <div>
                        <span className="text-blue-600">Passenger:</span>{' '}
                        {serviceRef?.PassengerName || getRawData(selectedItem).passengerName}
                        {serviceRef?.PassengerRole && ` (${serviceRef.PassengerRole})`}
                      </div>
                    )}
                    {serviceRef?.OperationalStatus && (
                      <div>
                        <span className="text-blue-600">Status:</span> {serviceRef.OperationalStatus}
                      </div>
                    )}
                    {(serviceRef?.VehicleID || getRawData(selectedItem).vehicleId) && (
                      <div>
                        <span className="text-blue-600">Vehicle:</span>{' '}
                        {serviceRef?.VehicleID || getRawData(selectedItem).vehicleId}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Driver Input Fields — Editable */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-2">
                  Driver Input (editable)
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-1">
                      Start Time
                      {serviceRef?.Time && getFieldDiff(normForm.startTime, serviceRef.Time) && (
                        <span className="ml-1 text-amber-600"> diff</span>
                      )}
                    </label>
                    <input
                      type="time"
                      value={normForm.startTime}
                      onChange={e => setNormForm(p => ({ ...p, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-1">End Time</label>
                    <input
                      type="time"
                      value={normForm.endTime}
                      onChange={e => setNormForm(p => ({ ...p, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-1">KM Total</label>
                    <input
                      type="number"
                      value={normForm.kmTotal}
                      onChange={e => setNormForm(p => ({ ...p, kmTotal: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-1">KM Over</label>
                    <input
                      type="number"
                      value={normForm.kmOver}
                      onChange={e => setNormForm(p => ({ ...p, kmOver: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-on-surface-variant mb-1">Diaria</label>
                  <select
                    value={normForm.diariaType}
                    onChange={e => setNormForm(p => ({ ...p, diariaType: e.target.value as NormalizedFields['diariaType'] }))}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                  >
                    <option value="none">Nessuna</option>
                    <option value="piena">Piena</option>
                    <option value="mezza">Mezza</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-on-surface-variant mb-1">Notes</label>
                  <textarea
                    value={normForm.notes}
                    onChange={e => setNormForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm resize-none"
                    rows={2}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              {/* Raw data preview from driver submission */}
              {selectedItem.RawData && (
                <details className="mt-3">
                  <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface font-medium">
                    Raw data from driver submission
                  </summary>
                  <pre className="mt-2 p-3 bg-surface-container rounded-lg text-xs overflow-x-auto max-h-32 font-mono">
                    {JSON.stringify(getRawData(selectedItem), null, 2)}
                  </pre>
                </details>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-outline-variant flex gap-3">
              {can('inbox.normalize') && (
                <>
                  {/* Quick Approve — one click */}
                  <button
                    onClick={() => handleQuickApprove(selectedItem.ID)}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-semibold"
                  >
                    <Zap className="w-4 h-4" />
                    {isSaving ? 'Processing...' : 'Quick Approve'}
                  </button>
                  {/* Step-by-step normalize */}
                  <button
                    onClick={() => handleNormalize(selectedItem.ID)}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
                  >
                    <Edit3 className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Normalize Only'}
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          STANDARD MODAL — NORMALIZED / PENDING_REVIEW / ACCEPTED / REJECTED
          ============================================================================ */}
      {selectedItem && !isNormalizable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Report Details</h2>
              <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-surface-container rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata */}
            <div className="space-y-2 text-sm mb-4 pb-4 border-b border-outline-variant">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Source</span>
                {getSourceBadge(selectedItem.Source)}
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Channel</span>
                <span>{selectedItem.Channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Driver</span>
                <span className="font-medium">{driverName(selectedItem.DriverID, selectedItem)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Project</span>
                <span>{projectName(selectedItem.ProjectID, selectedItem)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Date</span>
                <span>{formatDisplayDate(selectedItem.ServiceDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Status</span>
                {getStatusBadge(selectedItem.Status)}
              </div>
            </div>

            {/* Show normalized data for NORMALIZED items (read-only) */}
            {selectedItem.Status === 'NORMALIZED' && selectedItem.NormalizedData && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-on-surface mb-2">Normalized Data</div>
                <pre className="p-2 bg-surface-container rounded text-xs overflow-x-auto">
                  {JSON.stringify(JSON.parse(selectedItem.NormalizedData), null, 2)}
                </pre>
              </div>
            )}

            {/* Show raw data for non-captured items */}
            {selectedItem.RawData && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-on-surface mb-2">Raw Data</div>
                <pre className="p-2 bg-surface-container rounded text-xs overflow-x-auto">
                  {JSON.stringify(JSON.parse(selectedItem.RawData), null, 2)}
                </pre>
              </div>
            )}

            {selectedItem.RejectionReason && (
              <div className="text-sm mb-4">
                <span className="font-semibold">Rejection Reason:</span> {selectedItem.RejectionReason}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-4 pt-4 border-t border-outline-variant">
              {/* NORMALIZED → PENDING_REVIEW (submit to review) */}
              {isReviewable && can('inbox.review') && (
                <button
                  onClick={() => handleSubmitToReview(selectedItem.ID)}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSaving ? 'Sending...' : 'Submit to Review'}
                </button>
              )}

              {/* PENDING_REVIEW → ACCEPTED/REJECTED/LOCKED */}
              {isPendingReview && can('inbox.review') && (
                <>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Rejection reason..."
                    className="flex-1 px-3 py-2 border border-outline-variant rounded-lg text-sm"
                  />
                  <button
                    onClick={() => handleReject(selectedItem.ID)}
                    disabled={!rejectReason || isSaving}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleLock(selectedItem.ID)}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAccept(selectedItem.ID)}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Close button for other statuses */}
              {!isReviewable && !isPendingReview && (
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
