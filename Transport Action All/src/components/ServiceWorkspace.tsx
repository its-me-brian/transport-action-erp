import React, { useState, useMemo } from 'react';
import {
  X, Phone, MessageSquare,
  CheckCircle, Clock, Link2, FileText,
  ArrowLeftRight, User, Calendar,
  Play, Send, CheckSquare
} from 'lucide-react';
import { Service, ScreenId, formatTimeDisplay } from '../types';
import { useRelatedData, RelatedData } from '../hooks/useRelatedData';
import { getServiceStatusColor } from '../utils/statusColors';
import {
  OverviewTab, MovementsTab, DriverTab, DriverLinkTab,
  DriverReportTab, WhatsAppTab, ReconciliationTab, RapportinoTab, HistoryTab
} from './ServiceWorkspaceTabs';

// ============================================================================
// HELPERS — Derive next action from real data
// ============================================================================

function getNextAction(service: Service, relatedData: RelatedData): { label: string; icon: React.ReactNode; color: string; action: string } | null {
  const status = service.operationalStatus;
  const hasDriver = !!service.driverId && service.driverName !== 'Unassigned';
  const driverLinkActive = !!relatedData.driverLink && relatedData.driverLink?.active !== false;
  const reportStatus = relatedData.driverReport?.status || relatedData.driverReport?.Status || null;
  const inboxStatus = relatedData.inboxItem?.Status || null;
  const hasReconciliation = !!relatedData.reconciliation;

  if (status === 'Importado' && !hasDriver) {
    return { label: 'Assign Driver', icon: <User className="w-4 h-4" />, color: 'bg-blue-500 hover:bg-blue-600', action: 'assign' };
  }
  if (status === 'Importado' && hasDriver) {
    return { label: 'Confirm Service', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-cyan-500 hover:bg-cyan-600', action: 'confirm' };
  }
  if (status === 'Asignado') {
    return { label: 'Confirm Service', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-cyan-500 hover:bg-cyan-600', action: 'confirm' };
  }
  if (status === 'Confirmado') {
    return { label: 'Start Route', icon: <Play className="w-4 h-4" />, color: 'bg-blue-600 hover:bg-blue-700', action: 'start' };
  }
  if (status === 'EnRuta') {
    return { label: 'Complete Service', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-600 hover:bg-green-700', action: 'complete' };
  }
  if (status === 'Realizado') {
    return { label: 'Send Report', icon: <Send className="w-4 h-4" />, color: 'bg-amber-500 hover:bg-amber-600', action: 'report' };
  }
  if (status === 'Reportado') {
    if (reportStatus !== 'Aceptado') {
      return { label: 'Send to Review', icon: <FileText className="w-4 h-4" />, color: 'bg-amber-500 hover:bg-amber-600', action: 'review' };
    }
    return { label: 'Validate', icon: <CheckSquare className="w-4 h-4" />, color: 'bg-green-700 hover:bg-green-800', action: 'validate' };
  }
  if (status === 'Revision') {
    return { label: 'Validate', icon: <CheckSquare className="w-4 h-4" />, color: 'bg-green-700 hover:bg-green-800', action: 'validate' };
  }

  return null;
}

function getStatusStep(status: string): number {
  const steps = ['Importado', 'Asignado', 'Confirmado', 'EnRuta', 'Realizado', 'Reportado', 'Revision', 'Validado'];
  return steps.indexOf(status);
}

// ============================================================================
// SERVICE WORKSPACE — Reusable service context panel
// ============================================================================

export interface ServiceWorkspaceProps {
  service: Service;
  onClose: () => void;
  onServiceUpdate?: (serviceId: string, updates: Partial<Service>) => void;
  onNavigate?: (screen: ScreenId) => void;
  initialTab?: TabId;
  /** 'panel' = slide-in overlay (default), 'page' = full-page routed view */
  mode?: 'panel' | 'page';
  /** Called when tab changes — used by ServiceWorkspacePage to sync URL */
  onTabChange?: (tab: TabId) => void;
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ServiceWorkspace({
  service,
  onClose,
  onServiceUpdate,
  onNavigate,
  initialTab = 'overview',
  mode = 'panel',
  onTabChange
}: ServiceWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const relatedData = useRelatedData(service.id);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const nextAction = useMemo(() => getNextAction(service, relatedData), [service, relatedData]);
  const statusStep = getStatusStep(service.operationalStatus);
  const totalSteps = 8;
  const statusColor = getServiceStatusColor(service);

  const isPage = mode === 'page';

  // Build tab configs with badges
  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'movements', label: 'Movements', icon: <Calendar className="w-4 h-4" /> },
    { id: 'driver', label: 'Driver', icon: <User className="w-4 h-4" /> },
    {
      id: 'driverLink',
      label: 'Link',
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

  // === PAGE MODE — Full-page operational cockpit ===
  if (isPage) {
    return (
      <div className="flex-1 flex flex-col h-full bg-surface-container-lowest overflow-hidden">
        {/* Mobile: Compact header (visible only on small screens) */}
        <div className="md:hidden shrink-0">
          <CompactHeader service={service} relatedData={relatedData} onClose={onClose} />
        </div>

        {/* Desktop: 3-column layout | Mobile: single column */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Sidebar: Navigation + Status (hidden on mobile) */}
          <div className="hidden md:flex w-[240px] shrink-0 border-r border-outline-variant/40 bg-surface flex-col overflow-y-auto">
            {/* Service Identity */}
            <div className="px-4 pt-5 pb-4 border-b border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-[15px] font-bold text-primary shrink-0">
                  {service.driverName?.charAt(0) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-on-surface truncate">{service.driverName || 'Unassigned'}</div>
                  <div className="text-[11px] text-on-surface-variant truncate mt-0.5">
                    {service.serviceType ? service.serviceType.replace('Transfer ', 'T.').replace('Disposizione', 'Dispo') : '—'} · {service.vehicleType || '—'}
                  </div>
                </div>
              </div>
              {service.project && service.project !== 'Unknown' && (
                <div className="mt-2 text-[11px] text-on-surface-variant truncate">{service.project}</div>
              )}
            </div>

            {/* Lifecycle Progress */}
            <div className="px-4 py-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Lifecycle</span>
                <span className="text-[10px] font-medium px-1.5 py-px rounded-full" style={{ backgroundColor: `${statusColor.hex}15`, color: statusColor.hex }}>
                  {statusColor.label}
                </span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i <= statusStep ? 'opacity-100' : 'opacity-20'}`}
                    style={{ backgroundColor: statusColor.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Next Action */}
            {nextAction && (
              <div className="px-4 py-3 border-b border-outline-variant/30">
                <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Next Action</span>
                <button
                  className={`mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 text-white text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${nextAction.color}`}
                  onClick={() => console.log('Workflow action:', nextAction.action)}
                >
                  {nextAction.icon}
                  {nextAction.label}
                </button>
              </div>
            )}

            {/* Tab Navigation */}
            <nav className="flex-1 px-2 py-3 space-y-0.5">
              <div className="px-2 pb-2">
                <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Sections</span>
              </div>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {tab.icon}
                  <span className="flex-1">{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab.badgeColor || 'bg-gray-100 text-gray-500'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Desktop: Compact Header (hidden on mobile, shown above) */}
            <div className="hidden md:block">
              <CompactHeader service={service} relatedData={relatedData} onClose={onClose} />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
              {activeTab === 'overview' && <OverviewTab service={service} />}
              {activeTab === 'movements' && <MovementsTab service={service} />}
              {activeTab === 'driver' && <DriverTab service={service} />}
              {activeTab === 'driverLink' && <DriverLinkTab service={service} driverLink={relatedData.driverLink} onNavigate={onNavigate} />}
              {activeTab === 'driverReport' && <DriverReportTab service={service} driverReport={relatedData.driverReport} onNavigate={onNavigate} />}
              {activeTab === 'whatsapp' && <WhatsAppTab service={service} />}
              {activeTab === 'reconciliation' && <ReconciliationTab service={service} reconciliation={relatedData.reconciliation} onNavigate={onNavigate} />}
              {activeTab === 'rapportino' && <RapportinoTab service={service} onNavigate={onNavigate} />}
              {activeTab === 'history' && <HistoryTab service={service} />}
            </div>
          </div>

          {/* Right Context Panel (desktop only) */}
          <div className="hidden xl:flex w-[280px] shrink-0 border-l border-outline-variant/40 bg-surface flex-col overflow-y-auto">
            <ContextPanel service={service} relatedData={relatedData} onNavigate={onNavigate} />
          </div>
        </div>

        {/* Mobile: Bottom Tab Bar */}
        <div className="md:hidden shrink-0 border-t border-outline-variant/40 bg-surface px-2 py-1.5 flex gap-1 overflow-x-auto">
          {tabs.slice(0, 5).map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-[10px] font-medium transition-colors min-w-[56px] ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // === PANEL MODE — Slide-in overlay (Calendar/Dashboard) ===
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-surface-container-lowest w-full sm:w-[480px] h-full shadow-[-4px_0_24px_rgba(0,0,0,0.08)] flex flex-col animate-slide-in-right border-l border-outline-variant/30"
        onClick={e => e.stopPropagation()}
      >
        <ServiceHeader service={service} relatedData={relatedData} onClose={onClose} />
        {nextAction && (
          <div className="px-4 py-2.5 border-b border-outline-variant/30 bg-surface">
            <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Next Action</span>
            <button
              className={`mt-1.5 w-full flex items-center justify-center gap-2 px-3 py-2 text-white text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${nextAction.color}`}
              onClick={() => console.log('Workflow action:', nextAction.action)}
            >
              {nextAction.icon}
              {nextAction.label}
            </button>
          </div>
        )}
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && <OverviewTab service={service} />}
          {activeTab === 'movements' && <MovementsTab service={service} />}
          {activeTab === 'driver' && <DriverTab service={service} />}
          {activeTab === 'driverLink' && <DriverLinkTab service={service} driverLink={relatedData.driverLink} onNavigate={onNavigate} />}
          {activeTab === 'driverReport' && <DriverReportTab service={service} driverReport={relatedData.driverReport} onNavigate={onNavigate} />}
          {activeTab === 'whatsapp' && <WhatsAppTab service={service} />}
          {activeTab === 'reconciliation' && <ReconciliationTab service={service} reconciliation={relatedData.reconciliation} onNavigate={onNavigate} />}
          {activeTab === 'rapportino' && <RapportinoTab service={service} onNavigate={onNavigate} />}
          {activeTab === 'history' && <HistoryTab service={service} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT HEADER — For page mode
// ============================================================================

function CompactHeader({ service, relatedData, onClose }: {
  service: Service;
  relatedData: RelatedData;
  onClose: () => void;
}) {
  const statusColor = getServiceStatusColor(service);
  const hasDriverLink = !!relatedData.driverLink;
  const driverLinkActive = hasDriverLink && relatedData.driverLink?.active !== false;
  const hasDriverReport = !!relatedData.driverReport;
  const driverReportStatus = relatedData.driverReport?.status || relatedData.driverReport?.Status || null;
  const hasInboxItem = !!relatedData.inboxItem;
  const inboxStatus = relatedData.inboxItem?.Status || null;
  const hasReconciliation = !!relatedData.reconciliation;

  return (
    <div className="px-5 py-3 shrink-0 border-b border-outline-variant/40 bg-surface">
      <div className="flex items-center gap-4">
        {/* Service info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Service</span>
              <span className="text-[10px] font-mono text-on-surface-variant/60 bg-surface-container px-1.5 py-0.5 rounded">{service.id}</span>
              {service.date && (
                <span className="text-[10px] text-on-surface-variant">{service.date}</span>
              )}
              {service.startTime && (
                <span className="text-[10px] text-on-surface-variant">{formatTimeDisplay(service.startTime)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Status indicators — compact inline */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <StatusDot active={driverLinkActive} has={hasDriverLink} label="Link" />
          <StatusDot active={driverReportStatus === 'Aceptado'} has={hasDriverReport} pending={driverReportStatus === 'Pendiente'} label="Report" />
          <StatusDot active={inboxStatus === 'ACCEPTED'} has={hasInboxItem} pending={inboxStatus === 'PENDING_REVIEW'} label="Inbox" />
          <StatusDot active={hasReconciliation} has={hasReconciliation} label="Reconcil." />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SERVICE HEADER — For panel mode (slide-in overlay)
// ============================================================================

function ServiceHeader({ service, relatedData, onClose }: {
  service: Service;
  relatedData: RelatedData;
  onClose: () => void;
}) {
  const statusColor = getServiceStatusColor(service);

  return (
    <div className="px-5 pt-5 pb-4 shrink-0 border-b border-outline-variant/40">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Service</span>
          <span className="text-[10px] font-mono text-on-surface-variant/60 bg-surface-container px-1.5 py-0.5 rounded">{service.id}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-dim" aria-label="Close">
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
// STATUS DOT — Compact status indicator
// ============================================================================

function StatusDot({ active, has, pending, label }: { active: boolean; has: boolean; pending?: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${
      active ? 'bg-green-50 text-green-700' : pending ? 'bg-amber-50 text-amber-700' : has ? 'bg-blue-50 text-blue-700' : 'bg-surface-container text-on-surface-variant/40'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : pending ? 'bg-amber-500' : has ? 'bg-blue-500' : 'bg-gray-300'}`} />
      {label}
    </div>
  );
}

// ============================================================================
// TAB BAR — Horizontal tab navigation
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
// CONTEXT PANEL — Right sidebar for desktop (page mode)
// ============================================================================

function ContextPanel({ service, relatedData, onNavigate }: {
  service: Service;
  relatedData: RelatedData;
  onNavigate?: (screen: ScreenId) => void;
}) {
  const statusColor = getServiceStatusColor(service);
  const hasDriverLink = !!relatedData.driverLink;
  const driverLinkActive = hasDriverLink && relatedData.driverLink?.active !== false;
  const hasDriverReport = !!relatedData.driverReport;
  const driverReportStatus = relatedData.driverReport?.status || relatedData.driverReport?.Status || null;
  const hasInboxItem = !!relatedData.inboxItem;
  const inboxStatus = relatedData.inboxItem?.Status || null;
  const hasReconciliation = !!relatedData.reconciliation;

  return (
    <div className="flex flex-col">
      {/* Driver Quick View */}
      <div className="px-4 py-3 border-b border-outline-variant/30">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Driver</span>
        {service.driverName && service.driverName !== 'Unassigned' ? (
          <div className="mt-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-[13px] font-bold text-primary shrink-0">
              {service.driverName?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-on-surface truncate">{service.driverName}</div>
              {service.driverPhone && (
                <a href={`tel:${service.driverPhone}`} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {service.driverPhone}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-2 text-[12px] text-on-surface-variant/50">No driver assigned</div>
        )}
        {service.vehiclePlate && (
          <div className="mt-2">
            <span className="text-[10px] text-on-surface-variant/60">Plate</span>
            <div className="text-[12px] font-mono text-on-surface">{service.vehiclePlate}</div>
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="px-4 py-3 border-b border-outline-variant/30">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Status</span>
        <div className="mt-2 space-y-1.5">
          <StatusRow label="Link" active={driverLinkActive} has={hasDriverLink} />
          <StatusRow label="Report" active={driverReportStatus === 'Aceptado'} has={hasDriverReport} pending={driverReportStatus === 'Pendiente'} />
          <StatusRow label="Inbox" active={inboxStatus === 'ACCEPTED'} has={hasInboxItem} pending={inboxStatus === 'PENDING_REVIEW'} />
          <StatusRow label="Reconcil." active={hasReconciliation} has={hasReconciliation} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-3 border-b border-outline-variant/30">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Quick Actions</span>
        <div className="mt-2 space-y-1.5">
          {service.driverPhone && (
            <a
              href={`tel:${service.driverPhone}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-on-surface-variant" />
              Call Driver
            </a>
          )}
          {onNavigate && (
            <button
              onClick={() => onNavigate('driver_reports')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-on-surface hover:bg-surface-container transition-colors text-left"
            >
              <FileText className="w-3.5 h-3.5 text-on-surface-variant" />
              View Reports
            </button>
          )}
          {onNavigate && (
            <button
              onClick={() => onNavigate('reconciliation')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-on-surface hover:bg-surface-container transition-colors text-left"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-on-surface-variant" />
              Reconciliation
            </button>
          )}
        </div>
      </div>

      {/* Route Info */}
      {(service.from || service.to) && (
        <div className="px-4 py-3">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Route</span>
          <div className="mt-2 space-y-1.5">
            {service.from && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <span className="text-[12px] text-on-surface">{service.from}</span>
              </div>
            )}
            {service.to && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span className="text-[12px] text-on-surface">{service.to}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, active, has, pending }: { label: string; active: boolean; has: boolean; pending?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : pending ? 'bg-amber-500' : has ? 'bg-blue-500' : 'bg-gray-300'}`} />
      <span className="text-[11px] text-on-surface-variant flex-1">{label}</span>
      <span className={`text-[10px] font-medium ${active ? 'text-green-600' : pending ? 'text-amber-600' : has ? 'text-blue-600' : 'text-on-surface-variant/40'}`}>
        {active ? 'Active' : pending ? 'Pending' : has ? 'Done' : 'None'}
      </span>
    </div>
  );
}
