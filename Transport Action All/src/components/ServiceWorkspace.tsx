import React, { useState, useMemo } from 'react';
import {
  X, Phone, MessageSquare,
  CheckCircle, Clock, Link2, FileText,
  ArrowLeftRight, User, Calendar,
  Play, Send, CheckSquare, Settings, DollarSign,
  ArrowLeft, MoreVertical, ChevronRight
} from 'lucide-react';
import { Service, ScreenId, formatTimeDisplay } from '../types';
import { useRelatedData, RelatedData } from '../hooks/useRelatedData';
import { getServiceStatusColor } from '../utils/statusColors';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { assignDriver, confirmService, startService, completeService, reportService, validateService, getDrivers } from '../services/api';
import type { DriverRecord } from '../services/api';
import {
  OverviewTab, MovementsTab, DriverTab, DriverLinkTab,
  DriverReportTab, WhatsAppTab, ReconciliationTab, RapportinoTab, FinanceTab, HistoryTab
} from './ServiceWorkspaceTabs';
import { SERVICE_GROUPS, type ServiceGroupId, type ServiceSubSection } from '../routes';
import { useOpenService } from '../hooks/useOpenService';

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
  /** Called after a successful mutation — parent should re-fetch service data */
  onRefresh?: () => void;
  onNavigate?: (screen: ScreenId) => void;
  initialGroup?: ServiceGroupId;
  initialSubSection?: ServiceSubSection;
  /** 'panel' = slide-in overlay (default), 'page' = full-page routed view */
  mode?: 'panel' | 'page';
  /** Called when group/sub-section changes — used by ServiceWorkspacePage to sync URL */
  onGroupChange?: (group: ServiceGroupId, subSection?: ServiceSubSection) => void;
}

interface TabConfig {
  id: ServiceGroupId;
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
  onRefresh,
  onNavigate,
  initialGroup = 'overview',
  initialSubSection,
  mode = 'panel',
  onGroupChange
}: ServiceWorkspaceProps) {
  const [activeGroup, setActiveGroup] = useState<ServiceGroupId>(initialGroup);
  const [activeSubSection, setActiveSubSection] = useState<ServiceSubSection | undefined>(initialSubSection);
  const relatedData = useRelatedData(service.id);
  const { showToast } = useToast();
  const relatedLoading = relatedData.loading;
  const { can } = useAuth();

  const handleGroupChange = (group: ServiceGroupId, subSection?: ServiceSubSection) => {
    setActiveGroup(group);
    setActiveSubSection(subSection);
    onGroupChange?.(group, subSection);
  };

  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);

  const handleWorkflowAction = async (action: string) => {
    if (action === 'assign') {
      setLoadingDrivers(true);
      try {
        const list = await getDrivers();
        setDrivers(list.filter(d => d.status !== 'inactive'));
        setShowDriverPicker(true);
      } catch (err) {
        showToast('Error loading drivers', 'error');
      } finally {
        setLoadingDrivers(false);
      }
      return;
    }

    try {
      let result;
      switch (action) {
        case 'confirm': result = await confirmService(service.id); break;
        case 'start': result = await startService(service.id); break;
        case 'complete': result = await completeService(service.id); break;
        case 'report': result = await reportService(service.id); break;
        case 'review': result = await reportService(service.id); break;
        case 'validate': result = await validateService(service.id); break;
        default: showToast('Unknown action: ' + action, 'error'); return;
      }
      if (result?.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Action completed successfully', 'success');
        onServiceUpdate?.(service.id, {});
        onRefresh?.();
      }
    } catch (err) {
      showToast('Error: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const handleAssignDriver = async (driverId: string) => {
    try {
      const result = await assignDriver(service.id, driverId);
      if (result?.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Driver assigned successfully', 'success');
        setShowDriverPicker(false);
        onServiceUpdate?.(service.id, {});
        onRefresh?.();
      }
    } catch (err) {
      showToast('Error: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const nextAction = useMemo(() => getNextAction(service, relatedData), [service, relatedData]);
  const statusStep = getStatusStep(service.operationalStatus);
  const totalSteps = 8;
  const statusColor = getServiceStatusColor(service);

  const isPage = mode === 'page';

  // Build grouped tab configs with badges
  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'movements', label: 'Movements', icon: <Calendar className="w-4 h-4" /> },
    {
      id: 'operations',
      label: 'Operations',
      icon: <Settings className="w-4 h-4" />,
      badge: relatedData.driverLink ? (relatedData.driverLink?.active !== false ? 'Link' : 'Inactive') : undefined,
      badgeColor: relatedData.driverLink
        ? (relatedData.driverLink?.active !== false ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')
        : undefined
    },
    { id: 'communication', label: 'Communication', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'finance', label: 'Finance', icon: <FileText className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
  ];

  // Sub-section configs for grouped tabs
  const operationsSubTabs: { id: ServiceSubSection; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    { id: 'driver', label: 'Driver', icon: <User className="w-3.5 h-3.5" /> },
    {
      id: 'driverLink',
      label: 'Link',
      icon: <Link2 className="w-3.5 h-3.5" />,
      badge: relatedData.driverLink ? (relatedData.driverLink?.active !== false ? 'Active' : 'Inactive') : 'None',
      badgeColor: relatedData.driverLink
        ? (relatedData.driverLink?.active !== false ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')
        : 'bg-gray-100 text-gray-500'
    },
    {
      id: 'driverReport',
      label: 'Report',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      badge: relatedData.driverReport?.status || relatedData.driverReport?.Status || 'None',
      badgeColor: relatedData.driverReport?.status === 'Aceptado' || relatedData.driverReport?.Status === 'Aceptado'
        ? 'bg-green-100 text-green-700'
        : relatedData.driverReport?.status === 'Pendiente' || relatedData.driverReport?.Status === 'Pendiente'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-gray-100 text-gray-500'
    },
    {
      id: 'reconciliation',
      label: 'Reconcil.',
      icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
      badge: relatedData.reconciliation ? 'Done' : 'None',
      badgeColor: relatedData.reconciliation ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    },
  ];

  const communicationSubTabs: { id: ServiceSubSection; label: string; icon: React.ReactNode }[] = [
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  const financeSubTabs: { id: ServiceSubSection; label: string; icon: React.ReactNode }[] = [
    { id: 'rapportino', label: 'Rapportino', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'finance', label: 'Finance', icon: <DollarSign className="w-3.5 h-3.5" /> },
  ];

  // Get active sub-section for current group
  const getActiveSubSection = (group: ServiceGroupId): ServiceSubSection | undefined => {
    if (group === 'operations') return activeSubSection || 'driver';
    if (group === 'communication') return activeSubSection || 'whatsapp';
    if (group === 'finance') return activeSubSection || 'rapportino';
    return undefined;
  };

  // Get default sub-section for a group
  const getDefaultSubSection = (group: ServiceGroupId): ServiceSubSection | undefined => {
    if (group === 'operations') return 'driver';
    if (group === 'communication') return 'whatsapp';
    if (group === 'finance') return 'rapportino';
    return undefined;
  };

  // === PAGE MODE — Full-page operational cockpit ===
  if (isPage) {
    return (
      <div className="flex-1 flex flex-col h-full bg-surface-container-lowest overflow-hidden">
        {/* Mobile: Compact header (visible only on small screens) */}
        <div className="md:hidden shrink-0">
          <CompactHeader service={service} relatedData={relatedData} onClose={onClose} />
        </div>

        {/* Mobile: Status + Next Action (visible only on small screens) */}
        <div className="md:hidden shrink-0 px-3 py-2 border-b border-outline-variant/30 bg-surface">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Status</span>
            <span className="text-[9px] font-medium px-1.5 py-px rounded-full" style={{ backgroundColor: `${statusColor.hex}15`, color: statusColor.hex }}>
              {statusColor.label}
            </span>
          </div>
          <div className="flex gap-0.5 mb-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= statusStep ? 'opacity-100' : 'opacity-20'}`}
                style={{ backgroundColor: statusColor.hex }}
              />
            ))}
          </div>
          {nextAction && (
            <button
              className={`w-full flex items-center justify-center gap-1.5 px-2 py-2 text-white text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${nextAction.color} ${
                !can(`service.${nextAction.action}`) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => handleWorkflowAction(nextAction.action)}
              disabled={!can(`service.${nextAction.action}`)}
            >
              {nextAction.icon}
              {nextAction.label}
            </button>
          )}
        </div>

        {/* Desktop: 3-column layout | Mobile: single column */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Sidebar: Navigation + Status (hidden on mobile) */}
          <div className="hidden md:flex w-[200px] shrink-0 border-r border-outline-variant/40 bg-surface flex-col overflow-y-auto">
            {/* Service Identity */}
            <div className="px-3 pt-4 pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[13px] font-bold text-primary shrink-0">
                  {service.driverName?.charAt(0) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-on-surface truncate">{service.driverName || 'Unassigned'}</div>
                  <div className="text-[10px] text-on-surface-variant truncate mt-0.5">
                    {service.serviceType ? service.serviceType.replace('Transfer ', 'T.').replace('Disposizione', 'Dispo') : '—'} · {service.vehicleType || '—'}
                  </div>
                </div>
              </div>
              {service.project && service.project !== 'Unknown' && (
                <div className="mt-1.5 text-[10px] text-on-surface-variant truncate">{service.project}</div>
              )}
            </div>

            {/* Loading indicator for related data */}
            {relatedLoading && (
              <div className="px-3 py-1 border-b border-outline-variant/30">
                <div className="h-0.5 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}

            {/* Lifecycle Progress */}
            <div className="px-3 py-2 border-b border-outline-variant/30">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[9px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Lifecycle</span>
                <span className="text-[9px] font-medium px-1 py-px rounded-full" style={{ backgroundColor: `${statusColor.hex}15`, color: statusColor.hex }}>
                  {statusColor.label}
                </span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i <= statusStep ? 'opacity-100' : 'opacity-20'}`}
                    style={{ backgroundColor: statusColor.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Next Action */}
            {nextAction && (
              <div className="px-3 py-2 border-b border-outline-variant/30">
                <span className="text-[9px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Next Action</span>
                <button
                  className={`mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-2 text-white text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${nextAction.color} ${
                    !can(`service.${nextAction.action}`) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => handleWorkflowAction(nextAction.action)}
                  disabled={!can(`service.${nextAction.action}`)}
                >
                  {nextAction.icon}
                  {nextAction.label}
                </button>
              </div>
            )}

            {/* Tab Navigation */}
            <nav className="flex-1 px-1.5 py-2 space-y-0.5">
              <div className="px-1.5 pb-1.5">
                <span className="text-[9px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Sections</span>
              </div>
              {tabs.map(tab => {
                const isActive = activeGroup === tab.id;
                const hasSubSections = tab.id === 'operations' || tab.id === 'communication' || tab.id === 'finance';
                return (
                  <div key={tab.id}>
                    <button
                      onClick={() => {
                        if (hasSubSections) {
                          handleGroupChange(tab.id as ServiceGroupId, getDefaultSubSection(tab.id as ServiceGroupId));
                        } else {
                          handleGroupChange(tab.id as ServiceGroupId);
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left hover-lift ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {tab.icon}
                      <span className="flex-1">{tab.label}</span>
                      {tab.badge && (
                        <span className={`text-[8px] px-1 py-0.5 rounded-full ${tab.badgeColor || 'bg-gray-100 text-gray-500'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                    {/* Sub-section navigation for grouped tabs */}
                    {isActive && hasSubSections && (
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-outline-variant/30 pl-1.5">
                        {(tab.id === 'operations' ? operationsSubTabs : tab.id === 'communication' ? communicationSubTabs : financeSubTabs).map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => handleGroupChange(tab.id as ServiceGroupId, sub.id)}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors text-left ${
                              getActiveSubSection(tab.id as ServiceGroupId) === sub.id
                                ? 'bg-primary/5 text-primary'
                                : 'text-on-surface-variant/70 hover:bg-surface-container'
                            }`}
                          >
                            {sub.icon}
                            <span className="flex-1">{sub.label}</span>
                            {sub.badge && (
                              <span className={`text-[8px] px-0.5 py-0.5 rounded-full ${sub.badgeColor || 'bg-gray-100 text-gray-500'}`}>
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Desktop: Compact Header (hidden on mobile, shown above) */}
            <div className="hidden md:block">
              <CompactHeader service={service} relatedData={relatedData} onClose={onClose} />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pb-20 md:pb-0 animate-fade-in">
              {activeGroup === 'overview' && <OverviewTab service={service} relatedData={relatedData} />}
              {activeGroup === 'movements' && <MovementsTab service={service} />}
              {activeGroup === 'operations' && (
                <div className="flex flex-col">
                  {/* Sub-tab bar for Operations */}
                  <div className="px-4 py-2 border-b border-outline-variant/30 overflow-x-auto">
                    <div className="flex gap-1">
                      {operationsSubTabs.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => handleGroupChange('operations', sub.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                            (activeSubSection || 'driver') === sub.id
                              ? 'bg-primary/10 text-primary'
                              : 'text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          {sub.icon}
                          <span>{sub.label}</span>
                          {sub.badge && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${sub.badgeColor || 'bg-gray-100 text-gray-500'}`}>
                              {sub.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Sub-section content */}
                  <div className="flex-1">
                    {relatedLoading ? (
                      <div className="px-5 py-4 space-y-3" role="status">
                        <span className="sr-only">Loading related data...</span>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-3/4" />
                      </div>
                    ) : (
                      <>
                        {(activeSubSection || 'driver') === 'driver' && <DriverTab service={service} relatedData={relatedData} />}
                        {(activeSubSection || 'driver') === 'driverLink' && <DriverLinkTab service={service} driverLink={relatedData.driverLink} />}
                        {(activeSubSection || 'driver') === 'driverReport' && <DriverReportTab service={service} driverReport={relatedData.driverReport} />}
                        {(activeSubSection || 'driver') === 'reconciliation' && <ReconciliationTab service={service} reconciliation={relatedData.reconciliation} />}
                      </>
                    )}
                  </div>
                </div>
              )}
              {activeGroup === 'communication' && (
                <div className="flex flex-col">
                  {/* Sub-tab bar for Communication */}
                  <div className="px-4 py-2 border-b border-outline-variant/30 overflow-x-auto">
                    <div className="flex gap-1">
                      {communicationSubTabs.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => handleGroupChange('communication', sub.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                            (activeSubSection || 'whatsapp') === sub.id
                              ? 'bg-primary/10 text-primary'
                              : 'text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          {sub.icon}
                          <span>{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Sub-section content */}
                  <div className="flex-1">
                    {(activeSubSection || 'whatsapp') === 'whatsapp' && <WhatsAppTab service={service} relatedData={relatedData} />}
                  </div>
                </div>
              )}
              {activeGroup === 'finance' && (
                <div className="flex flex-col">
                  {/* Sub-tab bar for Finance */}
                  <div className="px-4 py-2 border-b border-outline-variant/30 overflow-x-auto">
                    <div className="flex gap-1">
                      {financeSubTabs.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => handleGroupChange('finance', sub.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                            (activeSubSection || 'rapportino') === sub.id
                              ? 'bg-primary/10 text-primary'
                              : 'text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          {sub.icon}
                          <span>{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Sub-section content */}
                  <div className="flex-1">
                    {(activeSubSection || 'rapportino') === 'rapportino' && <RapportinoTab service={service} />}
                    {(activeSubSection || 'rapportino') === 'finance' && <FinanceTab service={service} />}
                  </div>
                </div>
              )}
              {activeGroup === 'history' && <HistoryTab service={service} />}
            </div>
          </div>

          {/* Right Context Panel (desktop only) */}
          {showContextPanel && (
            <div className="hidden xl:flex w-[280px] shrink-0 border-l border-outline-variant/40 bg-surface flex-col overflow-y-auto animate-slide-in-right">
              <ContextPanel service={service} relatedData={relatedData} />
            </div>
          )}
          
          {/* Context Panel Toggle (desktop only) */}
          <button
            onClick={() => setShowContextPanel(!showContextPanel)}
            className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-surface border border-outline-variant/40 rounded-l-lg px-1 py-3 hover:bg-surface-container transition-colors"
            aria-label={showContextPanel ? 'Hide context panel' : 'Show context panel'}
          >
            <ChevronRight className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${showContextPanel ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Mobile: Bottom Tab Bar */}
        <div className="md:hidden shrink-0 border-t border-outline-variant/40 bg-surface px-2 py-1.5 flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'operations' || tab.id === 'communication' || tab.id === 'finance') {
                  handleGroupChange(tab.id, getDefaultSubSection(tab.id));
                } else {
                  handleGroupChange(tab.id);
                }
              }}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-[10px] font-medium transition-colors min-w-[56px] ${
                activeGroup === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {showDriverPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowDriverPicker(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30">
                <span className="text-[14px] font-semibold text-on-surface">Assign Driver</span>
                <button onClick={() => setShowDriverPicker(false)} className="p-1 rounded-md hover:bg-surface-dim" aria-label="Close">
                  <X className="w-4 h-4 text-on-surface-variant" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {loadingDrivers ? (
                  <div className="text-center py-8 text-[13px] text-on-surface-variant">Loading drivers...</div>
                ) : drivers.length === 0 ? (
                  <div className="text-center py-8 text-[13px] text-on-surface-variant">No drivers available</div>
                ) : (
                  drivers.map(d => (
                    <button
                      key={d.id}
                      onClick={() => handleAssignDriver(d.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[12px] font-bold text-primary shrink-0">
                        {d.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-on-surface truncate">{d.name}</div>
                        {d.phone && <div className="text-[11px] text-on-surface-variant">{d.phone}</div>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
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
              className={`mt-1.5 w-full flex items-center justify-center gap-2 px-3 py-2 text-white text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${nextAction.color} ${
                !can(`service.${nextAction.action}`) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => handleWorkflowAction(nextAction.action)}
              disabled={!can(`service.${nextAction.action}`)}
            >
              {nextAction.icon}
              {nextAction.label}
            </button>
          </div>
        )}
        <TabBar tabs={tabs} activeGroup={activeGroup} onGroupChange={(group) => {
          if (group === 'operations' || group === 'communication' || group === 'finance') {
            handleGroupChange(group, getDefaultSubSection(group));
          } else {
            handleGroupChange(group);
          }
        }} />
        <div className="flex-1 overflow-y-auto">
          {activeGroup === 'overview' && <OverviewTab service={service} relatedData={relatedData} />}
          {activeGroup === 'movements' && <MovementsTab service={service} />}
          {activeGroup === 'operations' && (
            <div className="flex flex-col">
              <div className="px-4 py-2 border-b border-outline-variant/30 overflow-x-auto">
                <div className="flex gap-1">
                  {operationsSubTabs.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => handleGroupChange('operations', sub.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                        (activeSubSection || 'driver') === sub.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {sub.icon}
                      <span>{sub.label}</span>
                      {sub.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${sub.badgeColor || 'bg-gray-100 text-gray-500'}`}>
                          {sub.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                {relatedLoading ? (
                  <div className="px-5 py-4 space-y-3" role="status">
                    <span className="sr-only">Loading...</span>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    {(activeSubSection || 'driver') === 'driver' && <DriverTab service={service} />}
                    {(activeSubSection || 'driver') === 'driverLink' && <DriverLinkTab service={service} driverLink={relatedData.driverLink} />}
                    {(activeSubSection || 'driver') === 'driverReport' && <DriverReportTab service={service} driverReport={relatedData.driverReport} />}
                    {(activeSubSection || 'driver') === 'reconciliation' && <ReconciliationTab service={service} reconciliation={relatedData.reconciliation} />}
                  </>
                )}
              </div>
            </div>
          )}
          {activeGroup === 'communication' && (
            <div className="flex flex-col">
              <div className="px-4 py-2 border-b border-outline-variant/30 overflow-x-auto">
                <div className="flex gap-1">
                  {communicationSubTabs.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => handleGroupChange('communication', sub.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                        (activeSubSection || 'whatsapp') === sub.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {sub.icon}
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                {(activeSubSection || 'whatsapp') === 'whatsapp' && <WhatsAppTab service={service} />}
              </div>
            </div>
          )}
          {activeGroup === 'finance' && (
            <div className="flex flex-col">
              <div className="px-4 py-2 border-b border-outline-variant/30 overflow-x-auto">
                <div className="flex gap-1">
                  {financeSubTabs.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => handleGroupChange('finance', sub.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                        (activeSubSection || 'rapportino') === sub.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {sub.icon}
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                {(activeSubSection || 'rapportino') === 'rapportino' && <RapportinoTab service={service} />}
              </div>
            </div>
          )}
          {activeGroup === 'history' && <HistoryTab service={service} />}
        </div>

        {showDriverPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowDriverPicker(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30">
                <span className="text-[14px] font-semibold text-on-surface">Assign Driver</span>
                <button onClick={() => setShowDriverPicker(false)} className="p-1 rounded-md hover:bg-surface-dim" aria-label="Close">
                  <X className="w-4 h-4 text-on-surface-variant" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {loadingDrivers ? (
                  <div className="text-center py-8 text-[13px] text-on-surface-variant">Loading drivers...</div>
                ) : drivers.length === 0 ? (
                  <div className="text-center py-8 text-[13px] text-on-surface-variant">No drivers available</div>
                ) : (
                  drivers.map(d => (
                    <button
                      key={d.id}
                      onClick={() => handleAssignDriver(d.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[12px] font-bold text-primary shrink-0">
                        {d.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-on-surface truncate">{d.name}</div>
                        {d.phone && <div className="text-[11px] text-on-surface-variant">{d.phone}</div>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
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
    <div className="px-4 md:px-5 py-3 shrink-0 border-b border-outline-variant/40 bg-surface">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile: Back button */}
        <button onClick={onClose} className="md:hidden p-1 rounded-md hover:bg-surface-dim" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-on-surface-variant" />
        </button>
        
        {/* Service info */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-[10px] md:text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Service</span>
              <span className="text-[9px] md:text-[10px] font-mono text-on-surface-variant/60 bg-surface-container px-1 md:px-1.5 py-0.5 rounded">{service.id}</span>
              {/* Mobile: Status only */}
              <span className="md:hidden inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-px rounded-full" style={{ backgroundColor: `${statusColor.hex}15`, color: statusColor.hex }}>
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor.hex }} />
                {statusColor.label}
              </span>
            </div>
            {/* Desktop: Show date and time */}
            <div className="hidden md:flex items-center gap-1.5 mt-0.5">
              {service.date && (
                <span className="text-[10px] text-on-surface-variant">{service.date}</span>
              )}
              {service.startTime && (
                <span className="text-[10px] text-on-surface-variant">{formatTimeDisplay(service.startTime)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Desktop: Status indicators — compact inline */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <StatusDot active={driverLinkActive} has={hasDriverLink} label="Link" />
          <StatusDot active={driverReportStatus === 'Aceptado'} has={hasDriverReport} pending={driverReportStatus === 'Pendiente'} label="Report" />
          <StatusDot active={inboxStatus === 'ACCEPTED'} has={hasInboxItem} pending={inboxStatus === 'PENDING_REVIEW'} label="Inbox" />
          <StatusDot active={hasReconciliation} has={hasReconciliation} label="Reconcil." />
        </div>

        {/* Mobile: Menu button */}
        <button className="md:hidden p-1 rounded-md hover:bg-surface-dim" aria-label="Menu">
          <MoreVertical className="w-4 h-4 text-on-surface-variant" />
        </button>
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

function TabBar({ tabs, activeGroup, onGroupChange }: {
  tabs: TabConfig[];
  activeGroup: ServiceGroupId;
  onGroupChange: (group: ServiceGroupId) => void;
}) {
  return (
    <div className="px-5 py-2 shrink-0 border-b border-outline-variant/40 overflow-x-auto">
      <div className="flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onGroupChange(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
              activeGroup === tab.id
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

function ContextPanel({ service, relatedData }: {
  service: Service;
  relatedData: RelatedData;
}) {
  const openService = useOpenService();
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
          <button
            onClick={() => openService(service.id, 'operations', 'driverReport')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-on-surface hover:bg-surface-container transition-colors text-left"
          >
            <FileText className="w-3.5 h-3.5 text-on-surface-variant" />
            View Reports
          </button>
          <button
            onClick={() => openService(service.id, 'operations', 'reconciliation')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-on-surface hover:bg-surface-container transition-colors text-left"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-on-surface-variant" />
            Reconciliation
          </button>
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
