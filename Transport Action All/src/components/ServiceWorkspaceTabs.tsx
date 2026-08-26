import React, { useState, useEffect } from 'react';
import {
  ChevronRight, Phone, User, Calendar,
  CheckCircle, Clock, AlertCircle, Link2, FileText,
  ArrowLeftRight, Car, MessageSquare, Loader2, Check,
  Send, Eye, ThumbsUp, ThumbsDown, Lock, DollarSign
} from 'lucide-react';
import { Service, ScreenId, formatTimeDisplay, parseDateKeyToDate } from '../types';
import { RelatedData } from '../hooks/useRelatedData';
import { getServiceStatusColor } from '../utils/statusColors';
import { getActivityFeed, ActivityFeedEntry, parseWhatsApp, captureWhatsAppReports } from '../services/api';
import { Skeleton } from './ui/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { useOpenService } from '../hooks/useOpenService';

// ============================================================================
// TAB: OVERVIEW — Service Command Center
// ============================================================================

export function OverviewTab({ service, relatedData }: { service: Service; relatedData?: RelatedData }) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dateObj = parseDateKeyToDate(service.date);
  const displayDate = dateObj ? `${dayNames[dateObj.getDay()]}, ${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}` : service.date;

  const statusColor = getServiceStatusColor(service);
  const hasDriver = !!service.driverName && service.driverName !== 'Unassigned';
  const driverLinkActive = !!relatedData?.driverLink && relatedData.driverLink?.active !== false;
  const hasDriverLink = !!relatedData?.driverLink;
  const driverReportStatus = relatedData?.driverReport?.status || relatedData?.driverReport?.Status || null;
  const hasDriverReport = !!relatedData?.driverReport;
  const hasInboxItem = !!relatedData?.inboxItem;
  const inboxStatus = relatedData?.inboxItem?.Status || null;
  const hasReconciliation = !!relatedData?.reconciliation;
  const movements = service.movements || [];

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Row 1: Service Identity + Status */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Service</span>
            <span className="text-[10px] font-mono text-on-surface-variant/60 bg-surface-container px-1.5 py-0.5 rounded">{service.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
            <span className="text-[13px] text-on-surface">{displayDate}</span>
            {service.startTime && (
              <>
                <span className="text-[11px] text-on-surface-variant">·</span>
                <Clock className="w-3.5 h-3.5 text-on-surface-variant" />
                <span className="text-[12px] text-on-surface">{formatTimeDisplay(service.startTime)}</span>
                {service.endTime && <span className="text-[11px] text-on-surface-variant">→ {formatTimeDisplay(service.endTime)}</span>}
              </>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${statusColor.hex}15`, color: statusColor.hex }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor.hex }} />
          {statusColor.label}
        </span>
      </div>

      {/* Row 2: Route */}
      {(service.from || service.to) && (
        <div className="flex items-center gap-4 text-[12px]">
          {service.from && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-on-surface truncate max-w-[200px]">{service.from}</span>
            </div>
          )}
          {service.from && service.to && <span className="text-on-surface-variant/40">→</span>}
          {service.to && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-on-surface truncate max-w-[200px]">{service.to}</span>
            </div>
          )}
        </div>
      )}

      {/* Row 3: Driver + Vehicle + Passengers */}
      <div className="flex items-center gap-4 text-[12px]">
        {hasDriver && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-on-surface-variant" />
            <span className="text-on-surface">{service.driverName}</span>
            {service.driverPhone && <a href={`tel:${service.driverPhone}`} className="text-primary hover:underline ml-1">{service.driverPhone}</a>}
          </div>
        )}
        {!hasDriver && <span className="text-on-surface-variant/50 italic">No driver assigned</span>}
        {service.vehicleType && (
          <div className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-on-surface-variant" />
            <span className="text-on-surface">{service.vehicleType}</span>
            {service.vehiclePlate && <span className="text-on-surface-variant font-mono text-[11px]">· {service.vehiclePlate}</span>}
          </div>
        )}
        {service.passengers && <span className="text-on-surface-variant">{service.passengers}</span>}
      </div>

      {/* Row 4: Status Grid — All subsystems at a glance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatusCard
          label="Driver Link"
          status={driverLinkActive ? 'active' : hasDriverLink ? 'inactive' : 'none'}
          value={driverLinkActive ? 'Active' : hasDriverLink ? 'Inactive' : 'None'}
          icon={<Link2 className="w-3.5 h-3.5" />}
        />
        <StatusCard
          label="Report"
          status={driverReportStatus === 'Aceptado' ? 'active' : driverReportStatus === 'Pendiente' ? 'pending' : hasDriverReport ? 'done' : 'none'}
          value={driverReportStatus || 'None'}
          icon={<CheckCircle className="w-3.5 h-3.5" />}
        />
        <StatusCard
          label="Inbox"
          status={inboxStatus === 'ACCEPTED' ? 'active' : inboxStatus === 'PENDING_REVIEW' ? 'pending' : hasInboxItem ? 'done' : 'none'}
          value={inboxStatus || 'None'}
          icon={<FileText className="w-3.5 h-3.5" />}
        />
        <StatusCard
          label="Reconcil."
          status={hasReconciliation ? 'active' : 'none'}
          value={hasReconciliation ? 'Done' : 'None'}
          icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
        />
      </div>

      {/* Row 5: Movements Summary */}
      {movements.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Movements ({movements.length})</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {movements.slice(0, 3).map((m, idx) => (
              <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/20 shrink-0">
                <span className="text-[11px] font-medium text-on-surface tabular-nums">{formatTimeDisplay(m.time)}</span>
                <span className="text-[10px] text-on-surface-variant truncate max-w-[120px]">{m.pickupLines?.[0] || m.dropoffLines?.[0] || '—'}</span>
              </div>
            ))}
            {movements.length > 3 && (
              <span className="flex items-center text-[10px] text-on-surface-variant/50">+{movements.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Row 6: Flight + Notes (compact) */}
      {(service.flightInfo || service.notes) && (
        <div className="flex gap-4 text-[11px] text-on-surface-variant">
          {service.flightInfo && <span>✈ {service.flightInfo}</span>}
          {service.notes && <span className="truncate">📝 {service.notes}</span>}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STATUS CARD — Compact status indicator for Overview
// ============================================================================

function StatusCard({ label, status, value, icon }: {
  label: string;
  status: 'active' | 'pending' | 'done' | 'inactive' | 'none';
  value: string;
  icon: React.ReactNode;
}) {
  const colors = {
    active: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    done: 'bg-blue-50 text-blue-700 border-blue-200',
    inactive: 'bg-amber-50 text-amber-700 border-amber-200',
    none: 'bg-surface-container text-on-surface-variant/50 border-outline-variant/20',
  };

  const dotColors = {
    active: 'bg-green-500',
    pending: 'bg-amber-500',
    done: 'bg-blue-500',
    inactive: 'bg-amber-500',
    none: 'bg-gray-300',
  };

  return (
    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${colors[status]}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium opacity-70">{label}</div>
        <div className="text-[11px] font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: MOVEMENTS
// ============================================================================

export function MovementsTab({ service }: { service: Service }) {
  const movements = service.movements || [];
  const statusColor = getServiceStatusColor(service);

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
          Schedules {movements.length > 0 && `(${movements.length})`}
        </span>
      </div>

      {movements.length > 0 ? (
        <div className="relative">
          {movements.length > 1 && (
            <div className="absolute left-[5px] top-[7px] bottom-[7px] w-px bg-outline-variant/50" />
          )}
          {movements.map((m, idx) => {
            const pax = m.passengers?.map((p: any) => p.name).join(', ') || '';
            const from = m.pickupLines?.[0] || '';
            const to = m.dropoffLines?.[0] || '';
            const isLast = idx === movements.length - 1;
            return (
              <div key={idx} className={`flex gap-3 items-start ${!isLast ? 'pb-4' : ''}`}>
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
  );
}

// ============================================================================
// TAB: DRIVER — Full driver context (ERG Phase 7)
// ============================================================================

export function DriverTab({ service, relatedData }: {
  service: Service;
  relatedData?: RelatedData;
}) {
  const openService = useOpenService();
  const hasDriver = !!service.driverName && service.driverName !== 'Unassigned';
  const driverLinkActive = !!relatedData?.driverLink && relatedData.driverLink?.active !== false;
  const hasDriverLink = !!relatedData?.driverLink;
  const driverReportStatus = relatedData?.driverReport?.status || relatedData?.driverReport?.Status || null;
  const hasDriverReport = !!relatedData?.driverReport;

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Driver Identity */}
      {hasDriver ? (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-[18px] font-bold text-primary">
            {service.driverName?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-on-surface">{service.driverName}</div>
            {service.driverPhone && (
              <a href={`tel:${service.driverPhone}`} className="text-[13px] text-primary hover:underline flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {service.driverPhone}
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <User className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No driver assigned</div>
        </div>
      )}

      {/* Vehicle Info */}
      {service.vehiclePlate && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Vehicle</span>
          <div className="flex items-center gap-2 text-[13px]">
            <Car className="w-3.5 h-3.5 text-on-surface-variant" />
            <span className="text-on-surface">{service.vehicleType || '—'}</span>
            <span className="font-mono text-on-surface-variant">· {service.vehiclePlate}</span>
          </div>
        </div>
      )}

      {/* Related Status Grid */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Status</span>
        <div className="grid grid-cols-2 gap-2">
          {/* Driver Link Status */}
          <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
            driverLinkActive ? 'bg-green-50 text-green-700 border-green-200' :
            hasDriverLink ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-surface-container text-on-surface-variant/50 border-outline-variant/20'
          }`}>
            <Link2 className="w-3.5 h-3.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium opacity-70">Driver Link</div>
              <div className="text-[11px] font-semibold">{driverLinkActive ? 'Active' : hasDriverLink ? 'Inactive' : 'None'}</div>
            </div>
          </div>

          {/* Report Status */}
          <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
            driverReportStatus === 'Aceptado' ? 'bg-green-50 text-green-700 border-green-200' :
            driverReportStatus === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            hasDriverReport ? 'bg-blue-50 text-blue-700 border-blue-200' :
            'bg-surface-container text-on-surface-variant/50 border-outline-variant/20'
          }`}>
            <CheckCircle className="w-3.5 h-3.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium opacity-70">Report</div>
              <div className="text-[11px] font-semibold">{driverReportStatus || 'None'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {hasDriver && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Quick Actions</span>
          <div className="flex flex-wrap gap-2">
            {service.driverPhone && (
              <a
                href={`tel:${service.driverPhone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high transition-colors"
              >
                <Phone className="w-3 h-3" />
                Call
              </a>
            )}
            <button
              onClick={() => openService(service.id, 'operations', 'driverLink')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high transition-colors"
            >
              <Link2 className="w-3 h-3" />
              Driver Link
            </button>
            <button
              onClick={() => openService(service.id, 'operations', 'driverReport')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high transition-colors"
            >
              <FileText className="w-3 h-3" />
              Reports
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: DRIVER LINK — Full integration (ERG Phase 8)
// ============================================================================

export function DriverLinkTab({ service, driverLink }: {
  service: Service;
  driverLink: any | null;
}) {
  const { showToast } = useToast();
  const openService = useOpenService();
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [linkDuration, setLinkDuration] = useState(7);

  const handleCopyLink = () => {
    if (driverLink?.linkUrl) {
      navigator.clipboard.writeText(driverLink.linkUrl);
      setCopied(true);
      showToast('Link copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenLink = () => {
    if (driverLink?.linkUrl) {
      window.open(driverLink.linkUrl, '_blank');
    }
  };

  const handleCreateLink = async () => {
    if (!service.driverId || service.driverId === '' || service.driverName === 'Unassigned') {
      showToast('Assign a driver first before creating a link', 'error');
      return;
    }
    setCreating(true);
    try {
      const { generateDriverLink } = await import('../services/api');
      const result = await generateDriverLink(
        service.driverId,
        service.backendProjectId || service.project || '',
        service.date || new Date().toISOString().split('T')[0],
        service.date || new Date().toISOString().split('T')[0],
        { linkDurationDays: linkDuration }
      );
      if (result?.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Driver link created', 'success');
        setShowCreateModal(false);
        // Refresh will happen via parent
      }
    } catch (err) {
      showToast('Error creating link', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!driverLink?.linkToken) return;
    if (!confirm('Are you sure you want to revoke this link?')) return;
    setRevoking(true);
    try {
      const { deactivateDriverLink } = await import('../services/api');
      const result = await deactivateDriverLink(driverLink.linkToken);
      if (result?.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Link revoked', 'success');
        // Refresh will happen via parent
      }
    } catch (err) {
      showToast('Error revoking link', 'error');
    } finally {
      setRevoking(false);
    }
  };

  // Derive status from link data
  const getStatus = (): { label: string; color: string; dotColor: string } => {
    if (!driverLink) return { label: 'Not Created', color: 'bg-surface-container text-on-surface-variant/50', dotColor: 'bg-gray-300' };
    if (driverLink.active === false) return { label: 'Revoked', color: 'bg-red-50 text-red-700', dotColor: 'bg-red-500' };
    if (driverLink.submittedAt) return { label: 'Submitted', color: 'bg-green-50 text-green-700', dotColor: 'bg-green-500' };
    if (driverLink.lastAccessAt) return { label: 'Opened', color: 'bg-blue-50 text-blue-700', dotColor: 'bg-blue-500' };
    return { label: 'Active', color: 'bg-amber-50 text-amber-700', dotColor: 'bg-amber-500' };
  };

  const status = getStatus();
  const isActive = driverLink && driverLink.active !== false && !driverLink.submittedAt;

  return (
    <div className="px-5 py-4 space-y-4">
      {driverLink ? (
        <>
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-on-surface">Driver Link</span>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
              {status.label}
            </span>
          </div>

          {/* Link Details */}
          <div className="space-y-2 text-[12px]">
            {driverLink.createdAt && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Created</span>
                <span className="text-on-surface">{new Date(driverLink.createdAt).toLocaleDateString()}</span>
              </div>
            )}
            {driverLink.expiresAt && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Expires</span>
                <span className="text-on-surface">{new Date(driverLink.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
            {driverLink.lastAccessAt && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Last Access</span>
                <span className="text-on-surface">{new Date(driverLink.lastAccessAt).toLocaleString()}</span>
              </div>
            )}
            {driverLink.submittedAt && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Submitted</span>
                <span className="text-on-surface">{new Date(driverLink.submittedAt).toLocaleString()}</span>
              </div>
            )}
            {driverLink.linkToken && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Token</span>
                <span className="text-on-surface font-mono text-[11px]">{driverLink.linkToken.slice(0, 12)}...</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Link2 className="w-3 h-3" />
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={handleOpenLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-container border border-outline-variant/30 hover:bg-surface-container-high transition-colors"
            >
              Open Link
            </button>
            {isActive && (
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {revoking ? 'Revoking...' : 'Revoke Link'}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Link2 className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No Driver Link for this service</div>
          <div className="text-[11px] text-on-surface-variant/60 mt-1">Create one to let the driver submit their report</div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 mx-auto rounded-lg text-[12px] font-medium bg-primary text-on-primary hover:bg-primary/90 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            Create Driver Link
          </button>
        </div>
      )}

      {/* Create Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-on-surface mb-3">Create Driver Link</h3>
            <div className="space-y-3">
              <div className="text-[12px] text-on-surface-variant">
                <p>Driver: <span className="font-medium text-on-surface">{service.driverName || 'Unassigned'}</span></p>
                <p>Date: <span className="font-medium text-on-surface">{service.date || 'Today'}</span></p>
              </div>
              <div>
                <label className="text-[11px] font-medium text-on-surface-variant">Link Duration (days)</label>
                <input type="number" value={linkDuration} onChange={(e) => setLinkDuration(parseInt(e.target.value) || 7)}
                  min={1} max={30}
                  className="w-full mt-1 px-3 py-2 text-[12px] bg-surface-container rounded-lg border border-outline-variant/40" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCreateLink} disabled={creating}
                className="flex-1 py-2 bg-primary text-on-primary text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Link2 className="w-4 h-4" /> Create Link</>}
              </button>
              <button onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: DRIVER REPORT — Full flow (ERG Phase 10)
// ============================================================================

export function DriverReportTab({ service, driverReport, onServiceUpdate }: {
  service: Service;
  driverReport: any | null;
  onServiceUpdate?: () => void;
}) {
  const { showToast } = useToast();
  const openService = useOpenService();
  const [actionLoading, setActionLoading] = useState(false);

  const handleApprove = async () => {
    if (!driverReport?.id) return;
    setActionLoading(true);
    try {
      const { approveDriverReport } = await import('../services/api');
      const result = await approveDriverReport(driverReport.id);
      if (result?.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Report approved', 'success');
        onServiceUpdate?.();
      }
    } catch {
      showToast('Error approving report', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!driverReport?.id) return;
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    setActionLoading(true);
    try {
      const { rejectDriverReport } = await import('../services/api');
      const result = await rejectDriverReport(driverReport.id, reason);
      if (result?.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Report rejected', 'success');
        onServiceUpdate?.();
      }
    } catch {
      showToast('Error rejecting report', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const status = driverReport?.status || driverReport?.Status || null;
  const isPending = status === 'Pendiente';
  const isAccepted = status === 'Aceptado';

  return (
    <div className="px-5 py-4 space-y-4">
      {driverReport ? (
        <>
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-on-surface">Driver Report</span>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
              isAccepted ? 'bg-green-100 text-green-700' :
              isPending ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {status || 'Unknown'}
            </span>
          </div>

          {/* Report Details */}
          <div className="space-y-2 text-[12px]">
            {driverReport.createdAt && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Received</span>
                <span className="text-on-surface">{new Date(driverReport.createdAt).toLocaleString()}</span>
              </div>
            )}
            {driverReport.source && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Source</span>
                <span className="text-on-surface">{driverReport.source}</span>
              </div>
            )}
            {driverReport.kmExtra != null && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">KM Extra</span>
                <span className="text-on-surface">{driverReport.kmExtra}</span>
              </div>
            )}
            {driverReport.hoursExtra != null && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Hours Extra</span>
                <span className="text-on-surface">{driverReport.hoursExtra}</span>
              </div>
            )}
            {driverReport.parking != null && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Parking</span>
                <span className="text-on-surface">€{driverReport.parking}</span>
              </div>
            )}
            {driverReport.tolls != null && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Tolls</span>
                <span className="text-on-surface">€{driverReport.tolls}</span>
              </div>
            )}
            {driverReport.fuel != null && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Fuel</span>
                <span className="text-on-surface">€{driverReport.fuel}</span>
              </div>
            )}
            {driverReport.waitMinutes != null && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Wait</span>
                <span className="text-on-surface">{driverReport.waitMinutes}min</span>
              </div>
            )}
            {driverReport.totalExtras != null && (
              <div className="flex justify-between font-medium border-t border-outline-variant/30 pt-2">
                <span className="text-on-surface">Total Extras</span>
                <span className="text-on-surface">€{driverReport.totalExtras}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isPending && (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 py-2 bg-green-600 text-white text-[13px] font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-50 text-red-700 text-[13px] font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}

          {/* Navigate to full Reports screen */}
        </>
      ) : (
        <div className="text-center py-8">
          <CheckCircle className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No report submitted yet</div>
          <div className="text-[11px] text-on-surface-variant/60 mt-1">Report will appear here after driver submission</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: WHATSAPP — Full integration (ERG Phase 9)
// ============================================================================

export function WhatsAppTab({ service, relatedData, onCaptureSuccess, onServiceUpdate }: {
  service: Service;
  relatedData?: RelatedData;
  onCaptureSuccess?: () => void;
  onServiceUpdate?: () => void;
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [parsedReports, setParsedReports] = useState<any[]>([]);
  const [captureStep, setCaptureStep] = useState<'paste' | 'review' | 'done'>('paste');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const inboxItem = relatedData?.inboxItem;
  const inboxStatus = inboxItem?.Status || null;

  const message = [
    `🚗 *Servicio — ${service.date || 'Hoy'}*`,
    '',
    service.startTime ? `⏰ ${formatTimeDisplay(service.startTime)}${service.endTime ? ` → ${formatTimeDisplay(service.endTime)}` : ''}` : '',
    service.from ? `📍 ${service.from}` : '',
    service.to ? `🏁 ${service.to}` : '',
    service.passengers ? `👥 ${service.passengers}` : '',
    service.vehicleType ? `🚐 ${service.vehicleType}` : '',
    service.notes ? `📝 ${service.notes}` : '',
    '',
    `📋 ID: ${service.id}`,
  ].filter(Boolean).join('\n');

  const handleSend = () => {
    const phone = service.driverPhone?.replace(/[^0-9]/g, '') || '';
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParse = async () => {
    if (!pasteText.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseWhatsApp(pasteText);
      if (result.success && result.reports && result.reports.length > 0) {
        // Auto-link to current service
        const linkedReports = result.reports.map((r: any) => ({
          ...r,
          serviceId: service.id,
          selectedServiceId: service.id
        }));
        setParsedReports(linkedReports);
        setCaptureStep('review');
        showToast(`${result.reportCount} report(s) parsed successfully`, 'success');
      } else {
        showToast(result.error || 'Could not parse any reports', 'error');
      }
    } catch (err) {
      console.error('Parse failed:', err);
      showToast('Error parsing message', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCapture = async () => {
    if (parsedReports.length === 0) return;
    setIsCapturing(true);
    try {
      const result = await captureWhatsAppReports(parsedReports, service.backendProjectId || service.project || '');
      if (result.success) {
        showToast(`${result.captured}/${result.total} reports captured to inbox`, 'success');
        setCaptureStep('done');
        setPasteText('');
        setParsedReports([]);
        onCaptureSuccess?.();
        onServiceUpdate?.();
      } else {
        showToast('Failed to capture reports', 'error');
      }
    } catch (err) {
      console.error('Capture failed:', err);
      showToast('Error capturing reports', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleReset = () => {
    setCaptureStep('paste');
    setPasteText('');
    setParsedReports([]);
  };

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Inbox Status */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Report Status</span>
        <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
          inboxStatus === 'ACCEPTED' ? 'bg-green-50 text-green-700 border-green-200' :
          inboxStatus === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
          inboxItem ? 'bg-blue-50 text-blue-700 border-blue-200' :
          'bg-surface-container text-on-surface-variant/50 border-outline-variant/20'
        }`}>
          <MessageSquare className="w-3.5 h-3.5" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium opacity-70">Driver Report</div>
            <div className="text-[11px] font-semibold">
              {inboxStatus === 'ACCEPTED' ? 'Report received and approved' :
               inboxStatus === 'PENDING_REVIEW' ? 'Report received, pending review' :
               inboxItem ? 'Report received' :
               'No report received yet'}
            </div>
          </div>
        </div>
        {/* Reject/Lock actions for pending reports */}
        {inboxItem && inboxStatus === 'PENDING_REVIEW' && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowRejectReason(true)}
              disabled={isProcessing}
              className="flex-1 py-1.5 bg-red-50 text-red-700 text-[11px] font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1 border border-red-200"
            >
              <ThumbsDown className="w-3 h-3" />
              Reject
            </button>
            <button
              onClick={async () => {
                setIsProcessing(true);
                try {
                  const { lockReport } = await import('../services/api');
                  await lockReport(inboxItem.id || inboxItem.Id);
                  showToast('Report locked', 'success');
                  onServiceUpdate?.();
                } catch (err) {
                  showToast(`Failed: ${err instanceof Error ? err.message : 'Lock'}`, 'error');
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
              className="flex-1 py-1.5 bg-amber-50 text-amber-700 text-[11px] font-medium rounded-lg hover:bg-amber-100 transition-colors flex items-center justify-center gap-1 border border-amber-200"
            >
              <Lock className="w-3 h-3" />
              Lock
            </button>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {showRejectReason && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRejectReason(false)}>
          <div className="bg-surface rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-on-surface mb-4">Reject Report</h3>
            <div>
              <label className="text-[11px] text-on-surface-variant">Reason</label>
              <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[13px] bg-surface-container rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Why reject this report?" />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={async () => {
                setIsProcessing(true);
                try {
                  const { rejectReport } = await import('../services/api');
                  await rejectReport(inboxItem.id || inboxItem.Id, rejectReason || 'Rejected from ServiceWorkspace');
                  showToast('Report rejected', 'success');
                  setShowRejectReason(false);
                  setRejectReason('');
                  onServiceUpdate?.();
                } catch (err) {
                  showToast(`Failed: ${err instanceof Error ? err.message : 'Reject'}`, 'error');
                } finally {
                  setIsProcessing(false);
                }
              }} disabled={isProcessing}
                className="flex-1 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5">
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                Reject
              </button>
              <button onClick={() => { setShowRejectReason(false); setRejectReason(''); }}
                className="px-4 py-2 bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INBOUND SECTION - Paste and parse driver's WhatsApp message */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
          {captureStep === 'paste' ? 'Paste Driver Message' :
           captureStep === 'review' ? 'Review Parsed Report' :
           'Report Captured'}
        </span>
        
        {captureStep === 'paste' && (
          <div className="space-y-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the WhatsApp message from the driver here..."
              className="w-full h-32 px-3 py-2 text-[12px] bg-surface-container rounded-lg border border-outline-variant/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleParse}
              disabled={!pasteText.trim() || isParsing}
              className={`w-full py-2 text-[13px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                pasteText.trim() && !isParsing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-surface-container text-on-surface-variant/50 cursor-not-allowed'
              }`}
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Parse Message
                </>
              )}
            </button>
          </div>
        )}

        {captureStep === 'review' && parsedReports.length > 0 && (
          <div className="space-y-3">
            {parsedReports.map((report, idx) => {
              // Fallback: extract date from rawText if backend didn't provide dateParsed/date
              // Matches: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YY, DD MMMM YYYY (Italian)
              const displayDate = report.dateParsed || report.date || (() => {
                if (!report.rawText) return '—';
                const numericMatch = report.rawText.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
                if (numericMatch) return numericMatch[1];
                const italianMatch = report.rawText.match(/(\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4})/i);
                return italianMatch ? italianMatch[1] : '—';
              })();
              
              return (
              <div key={idx} className="p-3 bg-surface-container rounded-lg border border-outline-variant/40 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span className="text-[12px] font-semibold text-on-surface">{report.driverName || 'Unknown Driver'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-on-surface-variant/60">Date:</span>
                    <span className="ml-1 text-on-surface">{displayDate}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant/60">KM Total:</span>
                    <span className="ml-1 text-on-surface">{report.kmTotal || '—'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant/60">Start:</span>
                    <span className="ml-1 text-on-surface">{report.startTime || '—'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant/60">End:</span>
                    <span className="ml-1 text-on-surface">{report.endTime || '—'}</span>
                  </div>
                  {report.kmOver > 0 && (
                    <div>
                      <span className="text-on-surface-variant/60">KM Over:</span>
                      <span className="ml-1 text-amber-600 font-medium">{report.kmOver}</span>
                    </div>
                  )}
                  {report.diariaType && (
                    <div>
                      <span className="text-on-surface-variant/60">Diaria:</span>
                      <span className="ml-1 text-on-surface font-medium">{report.diariaType.charAt(0).toUpperCase() + report.diariaType.slice(1)}</span>
                    </div>
                  )}
                </div>
                {report.rawText && (
                  <details className="text-[10px] text-on-surface-variant/50">
                    <summary className="cursor-pointer hover:text-on-surface-variant">Raw message text</summary>
                    <pre className="mt-1 p-2 bg-surface rounded text-[10px] whitespace-pre-wrap overflow-x-auto">{report.rawText}</pre>
                  </details>
                )}
                <div className="text-[10px] text-on-surface-variant/50">
                  Will be linked to: {service.id}
                </div>
              </div>
              );
            })}
            <div className="flex gap-2">
              <button
                onClick={handleCapture}
                disabled={isCapturing}
                className="flex-1 py-2 bg-green-600 text-white text-[13px] font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Capture to Inbox
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {captureStep === 'done' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <Check className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-[12px] font-semibold text-green-800">Report captured successfully!</div>
            <div className="text-[11px] text-green-600 mt-1">The report is now in the inbox for review.</div>
            <button
              onClick={handleReset}
              className="mt-3 px-4 py-1.5 bg-green-600 text-white text-[12px] font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Paste Another Message
            </button>
          </div>
        )}
      </div>

      {/* OUTBOUND SECTION - Message to send to driver */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Message to Send</span>
        <div className="w-full h-40 px-3 py-2 text-[12px] bg-surface-container rounded-lg border border-outline-variant/40 whitespace-pre-wrap text-on-surface overflow-y-auto">
          {message}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSend}
          className="flex-1 py-2 bg-green-600 text-white text-[13px] font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          Open WhatsApp
        </button>
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: RECONCILIATION — Full flow (ERG Phase 11)
// ============================================================================

export function ReconciliationTab({ service, reconciliation }: {
  service: Service;
  reconciliation: any | null;
}) {
  const openService = useOpenService();
  const { showToast } = useToast();
  const [resolving, setResolving] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState({
    startTime: '',
    endTime: '',
    km: '',
    diaria: '',
    festivo: '',
    notturno: '',
    notes: ''
  });
  const status = reconciliation?.status || null;
  const isResolved = status === 'Resuelto' || status === 'Resolved';
  const isInProgress = status === 'EnProgreso' || status === 'In Progress';

  const handleResolve = async () => {
    if (!reconciliation?.id) return;
    setResolving(true);
    try {
      const { resolveReconciliation } = await import('../services/api');
      const result = await resolveReconciliation(reconciliation.id, {
        FinalStartTime: resolution.startTime || undefined,
        FinalEndTime: resolution.endTime || undefined,
        FinalKm: resolution.km ? parseFloat(resolution.km) : undefined,
        FinalDiaria: resolution.diaria || undefined,
        FinalFestivo: resolution.festivo === 'true',
        FinalNotturno: resolution.notturno === 'true',
        Notes: resolution.notes || 'Resolved from Service'
      });
      if (result?.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Reconciliation resolved', 'success');
        setShowResolveModal(false);
        setResolution({ startTime: '', endTime: '', km: '', diaria: '', festivo: '', notturno: '', notes: '' });
      }
    } catch (err) {
      showToast('Error resolving reconciliation', 'error');
    } finally {
      setResolving(false);
    }
  };

  const openResolve = () => {
    // Pre-fill with driver values if available
    if (reconciliation?.driver) {
      setResolution({
        startTime: reconciliation.driver.startTime || '',
        endTime: reconciliation.driver.endTime || '',
        km: reconciliation.driver.km?.toString() || '',
        diaria: reconciliation.driver.diaria || '',
        festivo: reconciliation.driver.festivo?.toString() || 'false',
        notturno: reconciliation.driver.notturno?.toString() || 'false',
        notes: ''
      });
    }
    setShowResolveModal(true);
  };

  return (
    <div className="px-5 py-4 space-y-4">
      {reconciliation ? (
        <>
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-on-surface">Reconciliation</span>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
              isResolved ? 'bg-green-100 text-green-700' :
              isInProgress ? 'bg-amber-100 text-amber-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {status || 'Pending'}
            </span>
          </div>

          {/* Reconciliation Details */}
          <div className="space-y-2 text-[12px]">
            {reconciliation.expected != null && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Expected</span>
                <span className="text-on-surface">€{reconciliation.expected}</span>
              </div>
            )}
            {reconciliation.actual != null && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Actual</span>
                <span className="text-on-surface">€{reconciliation.actual}</span>
              </div>
            )}
            {reconciliation.difference != null && (
              <div className={`flex justify-between font-medium ${reconciliation.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Difference</span>
                <span>{reconciliation.difference >= 0 ? '+' : ''}€{reconciliation.difference}</span>
              </div>
            )}
            {reconciliation.reason && (
              <div className="space-y-1">
                <span className="text-on-surface-variant">Reason</span>
                <div className="text-on-surface bg-surface-container rounded-lg px-3 py-2">{reconciliation.reason}</div>
              </div>
            )}
            {reconciliation.resolution && (
              <div className="space-y-1">
                <span className="text-on-surface-variant">Resolution</span>
                <div className="text-on-surface bg-surface-container rounded-lg px-3 py-2">{reconciliation.resolution}</div>
              </div>
            )}
          </div>

          {/* Navigate to full Reconciliation screen */}
          {!isResolved && (
            <button
              onClick={openResolve}
              className="w-full py-2 bg-green-600 text-white text-[13px] font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Resolve Reconciliation
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <ArrowLeftRight className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No reconciliation yet</div>
          <div className="text-[11px] text-on-surface-variant/60 mt-1">Reconciliation will be created after driver report approval</div>
          <button
            onClick={async () => {
              try {
                const { createReconciliation } = await import('../services/api');
                const result = await createReconciliation(service.id);
                if (result?.id) {
                  showToast('Reconciliation created', 'success');
                  onServiceUpdate?.();
                }
              } catch (err) {
                showToast(`Failed: ${err instanceof Error ? err.message : 'Create'}`, 'error');
              }
            }}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 mx-auto rounded-lg text-[12px] font-medium bg-primary text-on-primary hover:bg-primary/90 transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Create Reconciliation
          </button>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowResolveModal(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-on-surface mb-3">Resolve Reconciliation</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant">Start Time</label>
                  <input type="text" value={resolution.startTime} onChange={(e) => setResolution(r => ({ ...r, startTime: e.target.value }))}
                    placeholder="08:30" className="w-full mt-1 px-3 py-2 text-[12px] bg-surface-container rounded-lg border border-outline-variant/40" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant">End Time</label>
                  <input type="text" value={resolution.endTime} onChange={(e) => setResolution(r => ({ ...r, endTime: e.target.value }))}
                    placeholder="21:30" className="w-full mt-1 px-3 py-2 text-[12px] bg-surface-container rounded-lg border border-outline-variant/40" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-on-surface-variant">KM</label>
                <input type="number" value={resolution.km} onChange={(e) => setResolution(r => ({ ...r, km: e.target.value }))}
                  placeholder="73" className="w-full mt-1 px-3 py-2 text-[12px] bg-surface-container rounded-lg border border-outline-variant/40" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-on-surface-variant">Notes</label>
                <textarea value={resolution.notes} onChange={(e) => setResolution(r => ({ ...r, notes: e.target.value }))}
                  placeholder="Resolution notes..." className="w-full mt-1 h-16 px-3 py-2 text-[12px] bg-surface-container rounded-lg border border-outline-variant/40 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleResolve} disabled={resolving}
                className="flex-1 py-2 bg-green-600 text-white text-[13px] font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {resolving ? <><Loader2 className="w-4 h-4 animate-spin" /> Resolving...</> : <><CheckCircle className="w-4 h-4" /> Resolve</>}
              </button>
              <button onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: RAPPORTINO — Filtered by serviceId (ERG Phase 12)
// ============================================================================

export function RapportinoTab({ service, onServiceUpdate }: {
  service: Service;
  onServiceUpdate?: () => void;
}) {
  const { showToast } = useToast();
  const openService = useOpenService();
  const [rapportinos, setRapportinos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { getRapportinoClients } = await import('../services/api');
        const list = await getRapportinoClients({ serviceId: service.id });
        if (!cancelled) setRapportinos(list || []);
      } catch {
        try {
          const { getRapportinoClients } = await import('../services/api');
          const list = await getRapportinoClients({ projectId: service.backendProjectId || service.project });
          if (!cancelled) setRapportinos(list || []);
        } catch {
          if (!cancelled) setRapportinos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [service.id, service.backendProjectId, service.project]);

  const handleRapportinoAction = async (rapportinoId: string, action: string, fn: () => Promise<any>) => {
    setIsProcessing(`${rapportinoId}-${action}`);
    try {
      await fn();
      showToast(`${action} completed`, 'success');
      setRapportinos(prev => prev.map(r => r.id === rapportinoId ? { ...r, status: action === 'review' ? 'REVIEWED' : action === 'send' ? 'SENT' : 'ACCEPTED' } : r));
      onServiceUpdate?.();
    } catch (err) {
      showToast(`Failed: ${err instanceof Error ? err.message : action}`, 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="px-5 py-4 space-y-4">
      <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Rapportinos</span>
      {loading ? (
        <div className="text-center py-4 text-[12px] text-on-surface-variant">Loading...</div>
      ) : rapportinos.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No rapportinos for this service</div>
        </div>
      ) : (
        <div className="space-y-2">
          {rapportinos.map(r => (
            <div key={r.id} className="p-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-on-surface">{r.clientName || r.projectName || 'Rapportino'}</div>
                  <div className="text-[11px] text-on-surface-variant">{r.status} · {r.periodType}</div>
                </div>
              </div>
              {/* Submission Timeline */}
              <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60">
                {r.createdAt && <span>Created {new Date(r.createdAt).toLocaleDateString()}</span>}
                {r.sentAt && <span>· Sent {new Date(r.sentAt).toLocaleDateString()}</span>}
                {r.acceptedAt && <span>· Accepted {new Date(r.acceptedAt).toLocaleDateString()}</span>}
              </div>
              <div className="flex gap-1.5">
                {r.status === 'DRAFT' && (
                  <button
                    onClick={() => handleRapportinoAction(r.id, 'review', async () => {
                      const { reviewRapportinoClient } = await import('../services/api');
                      return reviewRapportinoClient(r.id);
                    })}
                    disabled={isProcessing === `${r.id}-review`}
                    className="flex-1 py-1.5 bg-blue-600 text-white text-[11px] font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                  >
                    {isProcessing === `${r.id}-review` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    Review
                  </button>
                )}
                {r.status === 'REVIEWED' && (
                  <button
                    onClick={() => handleRapportinoAction(r.id, 'send', async () => {
                      const { sendRapportinoClient } = await import('../services/api');
                      return sendRapportinoClient(r.id);
                    })}
                    disabled={isProcessing === `${r.id}-send`}
                    className="flex-1 py-1.5 bg-emerald-600 text-white text-[11px] font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                  >
                    {isProcessing === `${r.id}-send` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Send
                  </button>
                )}
                {r.status === 'SENT' && (
                  <button
                    onClick={() => handleRapportinoAction(r.id, 'accept', async () => {
                      const { acceptRapportinoClient } = await import('../services/api');
                      return acceptRapportinoClient(r.id);
                    })}
                    disabled={isProcessing === `${r.id}-accept`}
                    className="flex-1 py-1.5 bg-green-600 text-white text-[11px] font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                  >
                    {isProcessing === `${r.id}-accept` ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                    Accept
                  </button>
                )}
                <button
                  onClick={() => openService(service.id, 'finance', 'rapportino')}
                  className="px-3 py-1.5 bg-surface-container text-on-surface text-[11px] font-medium rounded-lg hover:bg-surface-container-high transition-colors"
                >
                  View →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => openService(service.id, 'finance', 'rapportino')}
        className="w-full py-2 bg-primary/10 text-primary text-[12px] font-medium rounded-lg hover:bg-primary/20 transition-colors"
      >
        Open Rapportinos →
      </button>
    </div>
  );
}

// ============================================================================
// TAB: FINANCE — Revenue, Cost, Margin + Invoices + Payments (ERG Phase 13)
// ============================================================================

export function FinanceTab({ service, onServiceUpdate }: {
  service: Service;
  onServiceUpdate?: () => void;
}) {
  const { showToast } = useToast();
  const revenue = service.revenueBreakdown;
  const cost = service.costBreakdown;
  const [showAdjustRevenue, setShowAdjustRevenue] = useState(false);
  const [showAdjustCost, setShowAdjustCost] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [showVoidInvoice, setShowVoidInvoice] = useState<any>(null);
  const [voidReason, setVoidReason] = useState('');
  const [showVoidPayment, setShowVoidPayment] = useState<any>(null);
  const [voidPaymentReason, setVoidPaymentReason] = useState('');

  const totalRevenue = (revenue?.base || 0) + (revenue?.kmOver || 0) + (revenue?.hoursOver || 0) + (revenue?.diaria || 0) + (revenue?.notturno || 0);
  const totalCost = (cost?.base || 0) + (cost?.kmOver || 0) + (cost?.hoursOver || 0) + (cost?.diaria || 0) + (cost?.notturno || 0);
  const margin = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? ((margin / totalRevenue) * 100).toFixed(1) : '0.0';

  const financialStatus = service.financialStatus || 'Pendiente';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { getInvoices, getPayments } = await import('../services/api');
        const [invList, payList] = await Promise.all([
          getInvoices({ projectId: service.backendProjectId || service.project }),
          getPayments({ clientId: service.clientId })
        ]);
        if (!cancelled) {
          setInvoices(invList || []);
          setPayments(payList || []);
        }
      } catch {
        if (!cancelled) { setInvoices([]); setPayments([]); }
      } finally {
        if (!cancelled) { setLoadingInvoices(false); setLoadingPayments(false); }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [service.backendProjectId, service.project, service.clientId]);

  const handleFinancialAction = async (action: string, fn: () => Promise<any>) => {
    setIsProcessing(action);
    try {
      await fn();
      showToast(`${action} completed`, 'success');
      onServiceUpdate?.();
    } catch (err) {
      showToast(`Failed: ${err instanceof Error ? err.message : action}`, 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAdjust = async (type: 'revenue' | 'cost') => {
    if (!adjustAmount || isNaN(parseFloat(adjustAmount))) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    setIsAdjusting(true);
    try {
      const { adjustRevenue, adjustCost } = await import('../services/api');
      const fn = type === 'revenue' ? adjustRevenue : adjustCost;
      await fn(service.id, { amount: parseFloat(adjustAmount), reason: adjustReason || `Manual ${type} adjustment` });
      showToast(`${type} adjusted by €${adjustAmount}`, 'success');
      setShowAdjustRevenue(false);
      setShowAdjustCost(false);
      setAdjustAmount('');
      setAdjustReason('');
      onServiceUpdate?.();
    } catch (err) {
      showToast(`Failed to adjust: ${err instanceof Error ? err.message : 'Error'}`, 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Financial Status */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-on-surface">Financial Status</span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
          {financialStatus}
        </span>
      </div>

      {/* Financial Actions */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Actions</span>
        <div className="grid grid-cols-2 gap-2">
          {financialStatus === 'Calculado' && (
            <button
              onClick={() => handleFinancialAction('Approve', async () => {
                const { approveFinancial } = await import('../services/api');
                return approveFinancial(service.id);
              })}
              disabled={isProcessing === 'Approve'}
              className="py-2 bg-green-600 text-white text-[12px] font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
            >
              {isProcessing === 'Approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Approve
            </button>
          )}
          {financialStatus === 'Aprobado' && (
            <button
              onClick={() => handleFinancialAction('Facturar', async () => {
                const { facturarService } = await import('../services/api');
                return facturarService(service.id);
              })}
              disabled={isProcessing === 'Facturar'}
              className="py-2 bg-blue-600 text-white text-[12px] font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
            >
              {isProcessing === 'Facturar' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Facturar
            </button>
          )}
          {financialStatus === 'Facturado' && (
            <button
              onClick={() => handleFinancialAction('Cobrar', async () => {
                const { cobrarService } = await import('../services/api');
                return cobrarService(service.id);
              })}
              disabled={isProcessing === 'Cobrar'}
              className="py-2 bg-emerald-600 text-white text-[12px] font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
            >
              {isProcessing === 'Cobrar' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
              Cobrar
            </button>
          )}
          {financialStatus === 'Cobrado' && (
            <button
              onClick={() => handleFinancialAction('Close', async () => {
                const { closeService } = await import('../services/api');
                return closeService(service.id);
              })}
              disabled={isProcessing === 'Close'}
              className="py-2 bg-surface-container text-on-surface text-[12px] font-medium rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
            >
              {isProcessing === 'Close' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Close
            </button>
          )}
          <button
            onClick={() => setShowAdjustRevenue(true)}
            className="py-2 bg-surface-container text-on-surface text-[12px] font-medium rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Adjust Revenue
          </button>
          <button
            onClick={() => setShowAdjustCost(true)}
            className="py-2 bg-surface-container text-on-surface text-[12px] font-medium rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Adjust Cost
          </button>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Revenue</span>
        <div className="space-y-1.5 text-[12px]">
          {revenue?.base != null && revenue.base > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Base</span>
              <span className="text-on-surface">€{revenue.base.toFixed(2)}</span>
            </div>
          )}
          {revenue?.kmOver != null && revenue.kmOver > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">KM Extra</span>
              <span className="text-on-surface">€{revenue.kmOver.toFixed(2)}</span>
            </div>
          )}
          {revenue?.hoursOver != null && revenue.hoursOver > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Hours Extra</span>
              <span className="text-on-surface">€{revenue.hoursOver.toFixed(2)}</span>
            </div>
          )}
          {revenue?.diaria != null && revenue.diaria > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Diaria</span>
              <span className="text-on-surface">€{revenue.diaria.toFixed(2)}</span>
            </div>
          )}
          {revenue?.notturno != null && revenue.notturno > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Notturno</span>
              <span className="text-on-surface">€{revenue.notturno.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium border-t border-outline-variant/30 pt-1.5">
            <span className="text-on-surface">Total Revenue</span>
            <span className="text-on-surface">€{totalRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Cost</span>
        <div className="space-y-1.5 text-[12px]">
          {cost?.base != null && cost.base > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Base</span>
              <span className="text-on-surface">€{cost.base.toFixed(2)}</span>
            </div>
          )}
          {cost?.kmOver != null && cost.kmOver > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">KM Extra</span>
              <span className="text-on-surface">€{cost.kmOver.toFixed(2)}</span>
            </div>
          )}
          {cost?.hoursOver != null && cost.hoursOver > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Hours Extra</span>
              <span className="text-on-surface">€{cost.hoursOver.toFixed(2)}</span>
            </div>
          )}
          {cost?.diaria != null && cost.diaria > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Diaria</span>
              <span className="text-on-surface">€{cost.diaria.toFixed(2)}</span>
            </div>
          )}
          {cost?.notturno != null && cost.notturno > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Notturno</span>
              <span className="text-on-surface">€{cost.notturno.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium border-t border-outline-variant/30 pt-1.5">
            <span className="text-on-surface">Total Cost</span>
            <span className="text-on-surface">€{totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Margin Summary */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${
        margin >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <span className={`text-[13px] font-medium ${margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>Margin</span>
        <div className="text-right">
          <span className={`text-[15px] font-bold ${margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {margin >= 0 ? '+' : ''}€{margin.toFixed(2)}
          </span>
          <span className={`text-[11px] ml-2 ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ({marginPercent}%)
          </span>
        </div>
      </div>

      {/* Validation Status */}
      <div className="flex gap-2 text-[11px]">
        <div className={`flex-1 text-center py-1.5 rounded-lg ${service.revenueValidated ? 'bg-green-50 text-green-700' : 'bg-surface-container text-on-surface-variant/50'}`}>
          Revenue {service.revenueValidated ? '✓ Validated' : 'Not Validated'}
        </div>
        <div className={`flex-1 text-center py-1.5 rounded-lg ${service.costValidated ? 'bg-green-50 text-green-700' : 'bg-surface-container text-on-surface-variant/50'}`}>
          Cost {service.costValidated ? '✓ Validated' : 'Not Validated'}
        </div>
      </div>

      {/* Adjust Revenue Modal */}
      {showAdjustRevenue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAdjustRevenue(false)}>
          <div className="bg-surface rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-on-surface mb-4">Adjust Revenue</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-on-surface-variant">Amount (€)</label>
                <input type="number" step="0.01" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-[13px] bg-surface-container rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g. 50.00 or -25.00" />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant">Reason</label>
                <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-[13px] bg-surface-container rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Optional reason" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => handleAdjust('revenue')} disabled={isAdjusting}
                className="flex-1 py-2 bg-primary text-on-primary text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                {isAdjusting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Apply
              </button>
              <button onClick={() => { setShowAdjustRevenue(false); setAdjustAmount(''); setAdjustReason(''); }}
                className="px-4 py-2 bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Cost Modal */}
      {showAdjustCost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAdjustCost(false)}>
          <div className="bg-surface rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-on-surface mb-4">Adjust Cost</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-on-surface-variant">Amount (€)</label>
                <input type="number" step="0.01" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-[13px] bg-surface-container rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g. 30.00 or -15.00" />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant">Reason</label>
                <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-[13px] bg-surface-container rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Optional reason" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => handleAdjust('cost')} disabled={isAdjusting}
                className="flex-1 py-2 bg-primary text-on-primary text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                {isAdjusting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Apply
              </button>
              <button onClick={() => { setShowAdjustCost(false); setAdjustAmount(''); setAdjustReason(''); }}
                className="px-4 py-2 bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Invoices</span>
          {financialStatus === 'Facturable' && (
            <button onClick={() => setShowCreateInvoice(true)}
              className="text-[11px] text-primary hover:underline font-medium">+ Create</button>
          )}
        </div>
        {loadingInvoices ? (
          <div className="text-[11px] text-on-surface-variant py-2">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="text-[11px] text-on-surface-variant/50 py-2">No invoices</div>
        ) : (
          <div className="space-y-1.5">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest">
                <div>
                  <div className="text-[12px] font-medium text-on-surface">{inv.invoiceNumber}</div>
                  <div className="text-[10px] text-on-surface-variant">{inv.status} · €{inv.total?.toFixed(2)}</div>
                </div>
                <div className="flex gap-1">
                  {inv.status === 'Borrador' && (
                    <button onClick={async () => {
                      setIsProcessing(`send-${inv.id}`);
                      try {
                        const { sendInvoice } = await import('../services/api');
                        await sendInvoice(inv.id);
                        showToast('Invoice sent', 'success');
                        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'Enviada' } : i));
                        onServiceUpdate?.();
                      } catch (err) { showToast(`Failed: ${err instanceof Error ? err.message : 'Send'}`, 'error'); }
                      finally { setIsProcessing(null); }
                    }} disabled={!!isProcessing}
                      className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200">
                      Send
                    </button>
                  )}
                  {inv.status !== 'Anulada' && inv.status !== 'Paid' && (
                    <button onClick={() => setShowVoidInvoice(inv)}
                      className="text-[10px] px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">
                      Void
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payments Section */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Payments</span>
        {loadingPayments ? (
          <div className="text-[11px] text-on-surface-variant py-2">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="text-[11px] text-on-surface-variant/50 py-2">No payments</div>
        ) : (
          <div className="space-y-1.5">
            {payments.map(pay => (
              <div key={pay.id} className="flex items-center justify-between p-2.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest">
                <div>
                  <div className="text-[12px] font-medium text-on-surface">€{pay.amount?.toFixed(2)}</div>
                  <div className="text-[10px] text-on-surface-variant">{pay.status} · {pay.paymentMethod} · {pay.paymentDate}</div>
                </div>
                <div className="flex gap-1">
                  {pay.status === 'Registrado' && (
                    <button onClick={async () => {
                      setIsProcessing(`confirm-${pay.id}`);
                      try {
                        const { confirmPayment } = await import('../services/api');
                        await confirmPayment(pay.id);
                        showToast('Payment confirmed', 'success');
                        setPayments(prev => prev.map(p => p.id === pay.id ? { ...p, status: 'Confirmado' } : p));
                        onServiceUpdate?.();
                      } catch (err) { showToast(`Failed: ${err instanceof Error ? err.message : 'Confirm'}`, 'error'); }
                      finally { setIsProcessing(null); }
                    }} disabled={!!isProcessing}
                      className="text-[10px] px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200">
                      Confirm
                    </button>
                  )}
                  {pay.status !== 'Conciliado' && (
                    <button onClick={() => setShowVoidPayment(pay)}
                      className="text-[10px] px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">
                      Void
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateInvoice(false)}>
          <div className="bg-surface rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-on-surface mb-4">Create Invoice</h3>
            <div>
              <label className="text-[11px] text-on-surface-variant">Notes (optional)</label>
              <input type="text" value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[13px] bg-surface-container rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Invoice notes" />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={async () => {
                setIsProcessing('create-invoice');
                try {
                  const { createInvoice } = await import('../services/api');
                  const result = await createInvoice({
                    projectId: service.backendProjectId || service.project,
                    clientId: service.clientId || '',
                    notes: invoiceNotes || undefined
                  });
                  if (result.error) throw new Error(result.error);
                  showToast('Invoice created', 'success');
                  setShowCreateInvoice(false);
                  setInvoiceNotes('');
                  onServiceUpdate?.();
                } catch (err) { showToast(`Failed: ${err instanceof Error ? err.message : 'Create'}`, 'error'); }
                finally { setIsProcessing(null); }
              }} disabled={isProcessing === 'create-invoice'}
                className="flex-1 py-2 bg-primary text-on-primary text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                {isProcessing === 'create-invoice' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Create
              </button>
              <button onClick={() => { setShowCreateInvoice(false); setInvoiceNotes(''); }}
                className="px-4 py-2 bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Invoice Modal */}
      {showVoidInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowVoidInvoice(null)}>
          <div className="bg-surface rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-on-surface mb-4">Void Invoice {showVoidInvoice.invoiceNumber}</h3>
            <div>
              <label className="text-[11px] text-on-surface-variant">Reason</label>
              <input type="text" value={voidReason} onChange={e => setVoidReason(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[13px] bg-surface-container rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Why void this invoice?" />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={async () => {
                setIsProcessing(`void-${showVoidInvoice.id}`);
                try {
                  const { voidInvoice } = await import('../services/api');
                  await voidInvoice(showVoidInvoice.id, voidReason || 'Voided from ServiceWorkspace');
                  showToast('Invoice voided', 'success');
                  setInvoices(prev => prev.map(i => i.id === showVoidInvoice.id ? { ...i, status: 'Anulada' } : i));
                  setShowVoidInvoice(null);
                  setVoidReason('');
                  onServiceUpdate?.();
                } catch (err) { showToast(`Failed: ${err instanceof Error ? err.message : 'Void'}`, 'error'); }
                finally { setIsProcessing(null); }
              }} disabled={!!isProcessing}
                className="flex-1 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5">
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Void Invoice
              </button>
              <button onClick={() => { setShowVoidInvoice(null); setVoidReason(''); }}
                className="px-4 py-2 bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Payment Modal */}
      {showVoidPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowVoidPayment(null)}>
          <div className="bg-surface rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-on-surface mb-4">Void Payment</h3>
            <div>
              <label className="text-[11px] text-on-surface-variant">Reason</label>
              <input type="text" value={voidPaymentReason} onChange={e => setVoidPaymentReason(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[13px] bg-surface-container rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Why void this payment?" />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={async () => {
                setIsProcessing(`voidpay-${showVoidPayment.id}`);
                try {
                  const { voidPayment } = await import('../services/api');
                  await voidPayment(showVoidPayment.id, voidPaymentReason || 'Voided from ServiceWorkspace');
                  showToast('Payment voided', 'success');
                  setPayments(prev => prev.filter(p => p.id !== showVoidPayment.id));
                  setShowVoidPayment(null);
                  setVoidPaymentReason('');
                  onServiceUpdate?.();
                } catch (err) { showToast(`Failed: ${err instanceof Error ? err.message : 'Void'}`, 'error'); }
                finally { setIsProcessing(null); }
              }} disabled={!!isProcessing}
                className="flex-1 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5">
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Void Payment
              </button>
              <button onClick={() => { setShowVoidPayment(null); setVoidPaymentReason(''); }}
                className="px-4 py-2 bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: HISTORY — Activity timeline from activity feed
// ============================================================================

function getEventColor(eventType: string): string {
  switch (eventType?.toLowerCase()) {
    case 'created': return 'bg-green-500';
    case 'updated': return 'bg-blue-500';
    case 'deleted': return 'bg-red-500';
    case 'assigned': return 'bg-purple-500';
    case 'confirmed': return 'bg-emerald-500';
    case 'started': return 'bg-cyan-500';
    case 'completed': return 'bg-teal-500';
    case 'validated': return 'bg-amber-500';
    case 'link_created':
    case 'link_accessed':
    case 'link_submitted':
    case 'link_expired':
    case 'link_revoked': return 'bg-indigo-500';
    case 'report_submitted':
    case 'report_approved':
    case 'report_rejected': return 'bg-orange-500';
    case 'whatsapp_parsed':
    case 'whatsapp_captured': return 'bg-emerald-600';
    default: return 'bg-gray-400';
  }
}

function formatEventType(eventType: string): string {
  return eventType?.replace(/([A-Z])/g, ' $1').trim() || 'Unknown';
}

export function HistoryTab({ service }: { service: Service }) {
  const [entries, setEntries] = useState<ActivityFeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      try {
        const all = await getActivityFeed(100);
        if (cancelled) return;
        const serviceEntries = all.filter(e => {
          if (e.entityType === 'Service' && e.entityId === service.id) return true;
          if (e.entityType === 'DriverLink' && e.metadata) {
            try {
              const meta = JSON.parse(e.metadata);
              if (meta.serviceId === service.id || meta.serviceID === service.id) return true;
            } catch {}
          }
          if (e.entityType === 'DriverReport' && e.metadata) {
            try {
              const meta = JSON.parse(e.metadata);
              if (meta.serviceId === service.id || meta.serviceID === service.id) return true;
            } catch {}
          }
          if (e.entityType === 'WhatsApp' && e.metadata) {
            try {
              const meta = JSON.parse(e.metadata);
              if (meta.serviceId === service.id || meta.serviceID === service.id) return true;
            } catch {}
          }
          return false;
        });
        setEntries(serviceEntries);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadHistory();
    return () => { cancelled = true; };
  }, [service.id]);

  if (loading) {
    return (
      <div className="px-5 py-4 space-y-3" role="status">
        <span className="sr-only">Loading...</span>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-2 h-2 rounded-full mt-2 shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-5 py-4 text-center">
        <Clock className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
        <div className="text-[13px] text-on-surface-variant">No activity recorded yet</div>
        <div className="text-[11px] text-on-surface-variant/60 mt-1">Changes will appear here as they happen</div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
        Activity ({entries.length})
      </span>
      <div className="mt-3 relative">
        {entries.length > 1 && (
          <div className="absolute left-[5px] top-[7px] bottom-[7px] w-px bg-outline-variant/50" />
        )}
        {entries.map((entry, idx) => {
          const isLast = idx === entries.length - 1;
          const ts = entry.timestamp ? new Date(entry.timestamp) : null;
          const timeStr = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const dateStr = ts ? ts.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
          const eventColor = getEventColor(entry.eventType);

          return (
            <div key={entry.id || idx} className={`flex gap-3 items-start ${!isLast ? 'pb-4' : ''}`}>
              <div className="relative z-10 shrink-0 mt-[5px]">
                <div className={`w-[11px] h-[11px] rounded-full border-2 border-surface-container-lowest ${eventColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-on-surface">{entry.description}</span>
                  <span className="text-[10px] font-medium text-primary/70 bg-primary/5 px-1.5 py-px rounded">
                    {formatEventType(entry.eventType)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {entry.user && (
                    <span className="text-[10px] text-on-surface-variant/60">{entry.user}</span>
                  )}
                  {timeStr && (
                    <span className="text-[10px] text-on-surface-variant/40">{dateStr} {timeStr}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
