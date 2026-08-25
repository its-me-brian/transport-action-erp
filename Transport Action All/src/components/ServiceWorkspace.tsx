import React, { useState } from 'react';
import {
  X, Phone, MessageSquare,
  CheckCircle, Clock, AlertCircle, Link2, FileText,
  ArrowLeftRight, Car, User, Calendar
} from 'lucide-react';
import { Service, ScreenId, formatTimeDisplay, parseDateKeyToDate } from '../types';
import { useRelatedData, RelatedData } from '../hooks/useRelatedData';
import { getServiceStatusColor } from '../utils/statusColors';
import {
  OverviewTab, MovementsTab, DriverTab, DriverLinkTab,
  DriverReportTab, WhatsAppTab, ReconciliationTab, RapportinoTab, HistoryTab
} from './ServiceWorkspaceTabs';

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
  const relatedData = useRelatedData(service.id);

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
