import React, { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronRight, ChevronDown, Phone, MessageSquare,
  CheckCircle, Clock, AlertCircle, Link2, FileText,
  ArrowLeftRight, Car, User, Calendar
} from 'lucide-react';
import { Service, ScreenId, formatTimeDisplay, parseDateKeyToDate, isProductionVehicle } from '../types';
import { getDriverReports, getDriverLinks, getInboxItems, getReconciliations } from '../services/api';

// ============================================================================
// SERVICE WORKSPACE — Reusable service context panel
// ============================================================================

export interface ServiceWorkspaceProps {
  service: Service;
  onClose: () => void;
  onServiceUpdate?: (serviceId: string, updates: Partial<Service>) => void;
  onNavigate?: (screen: ScreenId) => void;
  initialTab?: TabId;
}

export type TabId =
  | 'overview'
  | 'movements'
  | 'driver'
  | 'driverLink'
  | 'driverReport'
  | 'whatsapp'
  | 'reconciliation'
  | 'rapportino'
  | 'history';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

interface RelatedData {
  driverReport: any | null;
  driverLink: any | null;
  inboxItem: any | null;
  reconciliation: any | null;
  loading: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ServiceWorkspace({
  service,
  onClose,
  onServiceUpdate,
  onNavigate,
  initialTab = 'overview'
}: ServiceWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [relatedData, setRelatedData] = useState<RelatedData>({
    driverReport: null,
    driverLink: null,
    inboxItem: null,
    reconciliation: null,
    loading: false
  });

  // Load related data on mount
  useEffect(() => {
    loadRelatedData();
  }, [service.id]);

  const loadRelatedData = async () => {
    setRelatedData(prev => ({ ...prev, loading: true }));
    const svcId = service.id;

    try {
      const results = await Promise.allSettled([
        getDriverReports(svcId).then((reports: any[]) =>
          reports?.length > 0 ? reports[0] : null
        ).catch(() => null),
        getDriverLinks({ serviceId: svcId }).then((links: any[]) =>
          links?.length > 0 ? links[0] : null
        ).catch(() => null),
        getInboxItems({ serviceId: svcId }).then((items: any[]) =>
          items?.length > 0 ? items[0] : null
        ).catch(() => null),
        getReconciliations({ serviceId: svcId }).then((recs: any[]) =>
          recs?.length > 0 ? recs[0] : null
        ).catch(() => null),
      ]);

      setRelatedData({
        driverReport: results[0].status === 'fulfilled' ? results[0].value : null,
        driverLink: results[1].status === 'fulfilled' ? results[1].value : null,
        inboxItem: results[2].status === 'fulfilled' ? results[2].value : null,
        reconciliation: results[3].status === 'fulfilled' ? results[3].value : null,
        loading: false,
      });
    } catch {
      setRelatedData(prev => ({ ...prev, loading: false }));
    }
  };

  // Build tab configs with badges
  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'movements', label: 'Movements', icon: <Calendar className="w-4 h-4" /> },
    { id: 'driver', label: 'Driver', icon: <User className="w-4 h-4" /> },
    {
      id: 'driverLink',
      label: 'Driver Link',
      icon: <Link2 className="w-4 h-4" />,
      badge: relatedData.driverLink ? (relatedData.driverLink?.active !== false ? 'Active' : 'Inactive') : 'None',
      badgeColor: relatedData.driverLink
        ? (relatedData.driverLink?.active !== false ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')
        : 'bg-gray-100 text-gray-500'
    },
    {
      id: 'driverReport',
      label: 'Report',
      icon: <CheckCircle className="w-4 h-4" />,
      badge: relatedData.driverReport?.status || relatedData.driverReport?.Status || 'None',
      badgeColor: relatedData.driverReport?.status === 'Aceptado' || relatedData.driverReport?.Status === 'Aceptado'
        ? 'bg-green-100 text-green-700'
        : relatedData.driverReport?.status === 'Pendiente' || relatedData.driverReport?.Status === 'Pendiente'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-gray-100 text-gray-500'
    },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="w-4 h-4" /> },
    {
      id: 'reconciliation',
      label: 'Reconcil.',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      badge: relatedData.reconciliation ? 'Done' : 'None',
      badgeColor: relatedData.reconciliation ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    },
    { id: 'rapportino', label: 'Rapportino', icon: <FileText className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-surface-container-lowest w-full sm:w-[480px] h-full shadow-[-4px_0_24px_rgba(0,0,0,0.08)] flex flex-col animate-slide-in-right border-l border-outline-variant/30"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <ServiceHeader service={service} onClose={onClose} />

        {/* Status Rail */}
        <StatusRail service={service} relatedData={relatedData} />

        {/* Tab Bar */}
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <OverviewTab service={service} />
          )}
          {activeTab === 'movements' && (
            <MovementsTab service={service} />
          )}
          {activeTab === 'driver' && (
            <DriverTab service={service} />
          )}
          {activeTab === 'driverLink' && (
            <DriverLinkTab service={service} driverLink={relatedData.driverLink} onNavigate={onNavigate} />
          )}
          {activeTab === 'driverReport' && (
            <DriverReportTab service={service} driverReport={relatedData.driverReport} onNavigate={onNavigate} />
          )}
          {activeTab === 'whatsapp' && (
            <WhatsAppTab service={service} />
          )}
          {activeTab === 'reconciliation' && (
            <ReconciliationTab service={service} reconciliation={relatedData.reconciliation} onNavigate={onNavigate} />
          )}
          {activeTab === 'rapportino' && (
            <RapportinoTab service={service} onNavigate={onNavigate} />
          )}
          {activeTab === 'history' && (
            <HistoryTab service={service} />
          )}
        </div>

        {/* Footer — Workflow Actions */}
        <WorkflowFooter service={service} onServiceUpdate={onServiceUpdate} onClose={onClose} />
      </div>
    </div>
  );
}

// ============================================================================
// HEADER
// ============================================================================

function ServiceHeader({ service, onClose }: { service: Service; onClose: () => void }) {
  const statusColor = getServiceStatusColor(service);

  return (
    <div className="px-5 pt-5 pb-4 shrink-0 border-b border-outline-variant/40">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Service</span>
          <span className="text-[10px] font-mono text-on-surface-variant/60 bg-surface-container px-1.5 py-0.5 rounded">{service.id}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-dim">
          <X className="w-4 h-4 text-on-surface-variant" />
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[13px] font-bold text-primary shrink-0">
          {service.driverName?.charAt(0) || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-on-surface truncate">{service.driverName || 'Unassigned'}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-on-surface-variant">
              {service.serviceType ? `${service.serviceType.replace('Transfer ', 'T.').replace('Disposizione', 'Dispo')} · ` : ''}{service.vehicleType || '—'}
            </span>
            <span className="text-on-surface-variant/30">·</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-px rounded-full" style={{ backgroundColor: `${statusColor.hex}15`, color: statusColor.hex }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor.hex }} />
              {statusColor.label}
            </span>
          </div>
        </div>
      </div>
      {service.project && service.project !== 'Unknown' && (
        <div className="mt-2 text-[11px] text-on-surface-variant truncate">{service.project}</div>
      )}
    </div>
  );
}

// ============================================================================
// STATUS RAIL — 4 key indicators
// ============================================================================

function StatusRail({ service, relatedData }: { service: Service; relatedData: RelatedData }) {
  const hasDriverLink = !!relatedData.driverLink;
  const driverLinkActive = hasDriverLink && relatedData.driverLink?.active !== false;
  const hasDriverReport = !!relatedData.driverReport;
  const driverReportStatus = relatedData.driverReport?.status || relatedData.driverReport?.Status || null;
  const hasInboxItem = !!relatedData.inboxItem;
  const inboxStatus = relatedData.inboxItem?.Status || null;
  const hasReconciliation = !!relatedData.reconciliation;

  return (
    <div className="px-5 py-3 shrink-0 border-b border-outline-variant/40">
      <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Status</span>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {/* Driver Link */}
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${driverLinkActive ? 'bg-green-50 text-green-700' : hasDriverLink ? 'bg-amber-50 text-amber-700' : 'bg-surface-container text-on-surface-variant/50'}`}>
          <span className={`w-2 h-2 rounded-full ${driverLinkActive ? 'bg-green-500' : hasDriverLink ? 'bg-amber-500' : 'bg-gray-300'}`} />
          <span className="font-medium">Driver Link</span>
          <span className="ml-auto text-[10px]">{driverLinkActive ? 'Active' : hasDriverLink ? 'Inactive' : 'None'}</span>
        </div>
        {/* Driver Report */}
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${driverReportStatus === 'Aceptado' ? 'bg-green-50 text-green-700' : driverReportStatus === 'Pendiente' ? 'bg-amber-50 text-amber-700' : driverReportStatus === 'Rechazado' ? 'bg-red-50 text-red-700' : 'bg-surface-container text-on-surface-variant/50'}`}>
          <span className={`w-2 h-2 rounded-full ${driverReportStatus === 'Aceptado' ? 'bg-green-500' : driverReportStatus === 'Pendiente' ? 'bg-amber-500' : driverReportStatus === 'Rechazado' ? 'bg-red-500' : 'bg-gray-300'}`} />
          <span className="font-medium">Report</span>
          <span className="ml-auto text-[10px]">{driverReportStatus || 'None'}</span>
        </div>
        {/* Inbox */}
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${inboxStatus === 'ACCEPTED' ? 'bg-green-50 text-green-700' : inboxStatus === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-700' : hasInboxItem ? 'bg-blue-50 text-blue-700' : 'bg-surface-container text-on-surface-variant/50'}`}>
          <span className={`w-2 h-2 rounded-full ${inboxStatus === 'ACCEPTED' ? 'bg-green-500' : inboxStatus === 'PENDING_REVIEW' ? 'bg-amber-500' : hasInboxItem ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span className="font-medium">Inbox</span>
          <span className="ml-auto text-[10px]">{inboxStatus || 'None'}</span>
        </div>
        {/* Reconciliation */}
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${hasReconciliation ? 'bg-green-50 text-green-700' : 'bg-surface-container text-on-surface-variant/50'}`}>
          <span className={`w-2 h-2 rounded-full ${hasReconciliation ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="font-medium">Reconcil.</span>
          <span className="ml-auto text-[10px]">{hasReconciliation ? 'Done' : 'None'}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB BAR
// ============================================================================

function TabBar({ tabs, activeTab, onTabChange }: {
  tabs: TabConfig[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <div className="px-5 py-2 shrink-0 border-b border-outline-variant/40 overflow-x-auto">
      <div className="flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab.badgeColor || 'bg-gray-100 text-gray-500'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: OVERVIEW
// ============================================================================

function OverviewTab({ service }: { service: Service }) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dateObj = parseDateKeyToDate(service.date);
  const displayDate = dateObj ? `${dayNames[dateObj.getDay()]}, ${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}` : service.date;

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Date & Time */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-on-surface-variant" />
          <span className="text-[13px] text-on-surface">{displayDate}</span>
        </div>
        {service.startTime && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-on-surface-variant" />
            <span className="text-[13px] text-on-surface">{formatTimeDisplay(service.startTime)}</span>
            {service.endTime && (
              <span className="text-[12px] text-on-surface-variant">→ {formatTimeDisplay(service.endTime)}</span>
            )}
          </div>
        )}
      </div>

      {/* Route */}
      {(service.from || service.to) && (
        <div className="space-y-2">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Route</span>
          {service.from && (
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
              <span className="text-[13px] text-on-surface">{service.from}</span>
            </div>
          )}
          {service.to && (
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <span className="text-[13px] text-on-surface">{service.to}</span>
            </div>
          )}
        </div>
      )}

      {/* Passengers */}
      {service.passengers && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Passengers</span>
          <div className="text-[13px] text-on-surface">{service.passengers}</div>
        </div>
      )}

      {/* Vehicle & Service Type */}
      <div className="flex gap-4">
        {service.vehicleType && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Vehicle</span>
            <div className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-on-surface-variant" />
              <span className="text-[13px] text-on-surface">{service.vehicleType}</span>
            </div>
          </div>
        )}
        {service.serviceType && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Type</span>
            <div className="text-[13px] text-on-surface">{service.serviceType}</div>
          </div>
        )}
      </div>

      {/* Flight Info */}
      {service.flightInfo && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Flight</span>
          <div className="text-[13px] text-on-surface">{service.flightInfo}</div>
        </div>
      )}

      {/* Notes */}
      {service.notes && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Notes</span>
          <div className="text-[13px] text-on-surface-variant whitespace-pre-wrap">{service.notes}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: MOVEMENTS
// ============================================================================

function MovementsTab({ service }: { service: Service }) {
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
// TAB: DRIVER
// ============================================================================

function DriverTab({ service }: { service: Service }) {
  return (
    <div className="px-5 py-4 space-y-4">
      {service.driverName && service.driverName !== 'Unassigned' ? (
        <>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-[18px] font-bold text-primary">
              {service.driverName?.charAt(0) || '?'}
            </div>
            <div>
              <div className="text-[15px] font-semibold text-on-surface">{service.driverName}</div>
              {service.driverPhone && (
                <a href={`tel:${service.driverPhone}`} className="text-[13px] text-primary hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {service.driverPhone}
                </a>
              )}
            </div>
          </div>
          {service.vehiclePlate && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Vehicle Plate</span>
              <div className="text-[13px] text-on-surface font-mono">{service.vehiclePlate}</div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <User className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No driver assigned</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: DRIVER LINK
// ============================================================================

function DriverLinkTab({ service, driverLink, onNavigate }: {
  service: Service;
  driverLink: any | null;
  onNavigate?: (screen: ScreenId) => void;
}) {
  return (
    <div className="px-5 py-4 space-y-4">
      {driverLink ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-on-surface">Driver Link</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              driverLink.active !== false ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {driverLink.active !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="text-[12px] text-on-surface-variant">
            Link token: {driverLink.linkToken || '—'}
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('driver_links')}
              className="text-[12px] text-primary hover:underline"
            >
              View all Driver Links →
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <Link2 className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No Driver Link for this service</div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('driver_links')}
              className="mt-2 text-[12px] text-primary hover:underline"
            >
              Create Driver Link →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: DRIVER REPORT
// ============================================================================

function DriverReportTab({ service, driverReport, onNavigate }: {
  service: Service;
  driverReport: any | null;
  onNavigate?: (screen: ScreenId) => void;
}) {
  return (
    <div className="px-5 py-4 space-y-4">
      {driverReport ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-on-surface">Driver Report</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              driverReport.status === 'Aceptado' || driverReport.Status === 'Aceptado'
                ? 'bg-green-100 text-green-700'
                : driverReport.status === 'Pendiente' || driverReport.Status === 'Pendiente'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
            }`}>
              {driverReport.status || driverReport.Status || 'Unknown'}
            </span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('driver_reports')}
              className="text-[12px] text-primary hover:underline"
            >
              View all Reports →
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <CheckCircle className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No report submitted yet</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: WHATSAPP
// ============================================================================

function WhatsAppTab({ service }: { service: Service }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    // TODO: Implement WhatsApp send via backend
    setTimeout(() => {
      setSending(false);
      setMessage('');
    }, 1000);
  };

  return (
    <div className="px-5 py-4 space-y-4">
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Send WhatsApp</span>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="w-full h-24 px-3 py-2 text-[13px] bg-surface-container rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="w-full py-2 bg-green-600 text-white text-[13px] font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Sending...' : 'Send via WhatsApp'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: RECONCILIATION
// ============================================================================

function ReconciliationTab({ service, reconciliation, onNavigate }: {
  service: Service;
  reconciliation: any | null;
  onNavigate?: (screen: ScreenId) => void;
}) {
  return (
    <div className="px-5 py-4 space-y-4">
      {reconciliation ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-on-surface">Reconciliation</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completed</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('reconciliation')}
              className="text-[12px] text-primary hover:underline"
            >
              View Reconciliation →
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <ArrowLeftRight className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No reconciliation yet</div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('reconciliation')}
              className="mt-2 text-[12px] text-primary hover:underline"
            >
              Create Reconciliation →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: RAPPORTINO
// ============================================================================

function RapportinoTab({ service, onNavigate }: {
  service: Service;
  onNavigate?: (screen: ScreenId) => void;
}) {
  return (
    <div className="px-5 py-4 space-y-4">
      <div className="text-center py-8">
        <FileText className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
        <div className="text-[13px] text-on-surface-variant">Add this service to a Rapportino</div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('rapportinos')}
            className="mt-2 text-[12px] text-primary hover:underline"
          >
            Open Rapportinos →
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: HISTORY
// ============================================================================

function HistoryTab({ service }: { service: Service }) {
  return (
    <div className="px-5 py-4 space-y-4">
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
        <div className="text-[13px] text-on-surface-variant">Service history and audit trail</div>
        <div className="text-[11px] text-on-surface-variant/60 mt-1">Coming soon</div>
      </div>
    </div>
  );
}

// ============================================================================
// WORKFLOW FOOTER
// ============================================================================

function WorkflowFooter({ service, onServiceUpdate, onClose }: {
  service: Service;
  onServiceUpdate?: (serviceId: string, updates: Partial<Service>) => void;
  onClose: () => void;
}) {
  const workflowButtons: Record<string, { label: string; icon: React.ReactNode; action: string; color: string }[]> = {
    Importado: [{ label: 'Assign Driver', icon: <User className="w-3.5 h-3.5" />, action: 'assign', color: 'bg-blue-500 hover:bg-blue-600' }],
    Asignado: [{ label: 'Confirm Service', icon: <CheckCircle className="w-3.5 h-3.5" />, action: 'confirm', color: 'bg-cyan-500 hover:bg-cyan-600' }],
    Confirmado: [{ label: 'Start Route', icon: <Car className="w-3.5 h-3.5" />, action: 'start', color: 'bg-blue-600 hover:bg-blue-700' }],
    EnRuta: [{ label: 'Complete', icon: <CheckCircle className="w-3.5 h-3.5" />, action: 'complete', color: 'bg-green-600 hover:bg-green-700' }],
    Realizado: [{ label: 'Send Report', icon: <FileText className="w-3.5 h-3.5" />, action: 'report', color: 'bg-amber-500 hover:bg-amber-600' }],
    Reportado: [
      { label: 'Send to Review', icon: <FileText className="w-3.5 h-3.5" />, action: 'review', color: 'bg-amber-500 hover:bg-amber-600' },
      { label: 'Validate', icon: <CheckCircle className="w-3.5 h-3.5" />, action: 'validate', color: 'bg-green-700 hover:bg-green-800' }
    ],
    Revision: [{ label: 'Validate', icon: <CheckCircle className="w-3.5 h-3.5" />, action: 'validate', color: 'bg-green-700 hover:bg-green-800' }],
  };

  const buttons = service.operationalStatus === 'Importado' && service.driverId
    ? workflowButtons['Asignado'] || []
    : workflowButtons[service.operationalStatus] || [];

  if (buttons.length === 0) return null;

  return (
    <div className="px-5 py-3 shrink-0 border-t border-outline-variant/40">
      <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Workflow</span>
      <div className="flex gap-2 mt-2">
        {buttons.map((btn) => (
          <button
            key={btn.action}
            onClick={() => {
              // TODO: Handle workflow action
              onClose();
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-on-primary text-[12px] font-medium rounded-lg transition-colors cursor-pointer ${btn.color}`}
          >
            {btn.icon}
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getServiceStatusColor(service: Service) {
  const colors: Record<string, { hex: string; label: string }> = {
    Importado: { hex: '#6366f1', label: 'Imported' },
    Asignado: { hex: '#0ea5e9', label: 'Assigned' },
    Confirmado: { hex: '#06b6d4', label: 'Confirmed' },
    EnRuta: { hex: '#3b82f6', label: 'En Route' },
    Realizado: { hex: '#22c55e', label: 'Completed' },
    Reportado: { hex: '#f59e0b', label: 'Reported' },
    Revision: { hex: '#f97316', label: 'In Review' },
    Validado: { hex: '#10b981', label: 'Validated' },
    Cancelado: { hex: '#ef4444', label: 'Canceled' },
  };
  return colors[service.operationalStatus] || { hex: '#6b7280', label: 'Unknown' };
}
