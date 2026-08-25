import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorUtils';
import { 
  FileText, 
  Plus, 
  Download, 
  Loader2
} from 'lucide-react';
import { ScreenId } from '../types';
import { 
  getRapportinoClients,
  getRapportinoDrivers,
  getRapportinoCollaborators,
  RapportinoClientDTO,
  RapportinoDriverDTO,
  RapportinoCollaboratorDTO,
  reviewRapportinoClient,
  sendRapportinoClient,
  acceptRapportinoClient,
  facturarRapportino,
  reviewRapportinoDriver,
  sendRapportinoDriver,
  acceptRapportinoDriver,
  payRapportinoDriver,
  sendRapportinoCollaborator,
  acceptRapportinoCollaborator,
  payRapportinoCollaborator,
  removeServiceFromRapportino,
  RapportinoItemDTO,
  generateDriverLink,
  DriverLinkDTO,
  getProjects,
  getClients,
  getDrivers,
  getCollaborators,
  Project,
  ClientDTO,
  DriverRecord,
  CollaboratorDTO
} from '../services/api';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { 
  ClientRapportinoCard, DriverRapportinoCard, CollaboratorRapportinoCard,
  CLIENT_STATUS_CONFIG, DRIVER_STATUS_CONFIG, COLLABORATOR_STATUS_CONFIG,
  CLIENT_TRANSITIONS, DRIVER_TRANSITIONS, COLLABORATOR_TRANSITIONS,
  CLIENT_NEXT_STATUS_LABELS, DRIVER_NEXT_STATUS_LABELS, COLLABORATOR_NEXT_STATUS_LABELS,
  ClientStatus, DriverStatus, CollaboratorStatus
} from './RapportinoCards';
import RapportinoFilterBar from './RapportinoFilterBar';
import RapportinoDetailModal from './RapportinoDetailModal';
import DriverLinkModal from './DriverLinkModal';

interface RapportinoScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

type TabType = 'client' | 'driver' | 'collaborator';

export default function RapportinoScreen({ onNavigate }: RapportinoScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('client');
  const [clientRapportinos, setClientRapportinos] = useState<RapportinoClientDTO[]>([]);
  const [driverRapportinos, setDriverRapportinos] = useState<RapportinoDriverDTO[]>([]);
  const [collaboratorRapportinos, setCollaboratorRapportinos] = useState<RapportinoCollaboratorDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterCollaborator, setFilterCollaborator] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const { showToast } = useToast();

  // Data for selects
  const [clientsList, setClientsList] = useState<ClientDTO[]>([]);
  const [driversList, setDriversList] = useState<DriverRecord[]>([]);
  const [collaboratorsList, setCollaboratorsList] = useState<CollaboratorDTO[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  // Detail view
  const [viewTarget, setViewTarget] = useState<RapportinoClientDTO | RapportinoDriverDTO | RapportinoCollaboratorDTO | null>(null);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Driver Link modal
  const [driverLinkModal, setDriverLinkModal] = useState<{
    open: boolean;
    rapportino: RapportinoDriverDTO | null;
    loading: boolean;
    link: DriverLinkDTO | null;
    error: string;
    copied: boolean;
  }>({ open: false, rapportino: null, loading: false, link: null, error: '', copied: false });

  useEffect(() => {
    loadData();
  }, [activeTab, dateFrom, dateTo, filterClient, filterDriver, filterCollaborator, filterProject]);

  useEffect(() => {
    const loadSelectData = async () => {
      try {
        const [projects, clients, drivers, collaborators] = await Promise.all([
          getProjects(), getClients(), getDrivers(), getCollaborators()
        ]);
        setProjectsList(projects || []);
        setClientsList(clients || []);
        setDriversList(drivers || []);
        setCollaboratorsList(collaborators || []);
      } catch (err) {
        console.error('Error loading select data:', err);
        showToast('Error al cargar datos de filtro', 'error');
      }
    };
    loadSelectData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (filterClient) filters.clientId = filterClient;
      if (filterDriver) filters.driverId = filterDriver;
      if (filterCollaborator) filters.collaboratorId = filterCollaborator;
      if (filterProject) filters.projectId = filterProject;
      
      if (activeTab === 'client') {
        const result = await getRapportinoClients(filters);
        setClientRapportinos(result || []);
      } else if (activeTab === 'driver') {
        const result = await getRapportinoDrivers(filters);
        setDriverRapportinos(result || []);
      } else {
        const result = await getRapportinoCollaborators(filters);
        setCollaboratorRapportinos(result || []);
      }
    } catch (err) {
      console.error('Error loading rapportinos:', err);
      showToast('Error al cargar rapportinos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = useMemo(() => clientRapportinos.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (filterClient && r.clientId !== filterClient) return false;
    if (filterProject && r.projectId !== filterProject) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.id?.toLowerCase().includes(q) || 
             r.clientId?.toLowerCase().includes(q) ||
             r.projectId?.toLowerCase().includes(q);
    }
    return true;
  }), [clientRapportinos, statusFilter, filterClient, filterProject, searchQuery]);

  const filteredDrivers = useMemo(() => driverRapportinos.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (filterDriver && r.driverId !== filterDriver) return false;
    if (filterProject && r.projectId !== filterProject) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.id?.toLowerCase().includes(q) || 
             r.driverId?.toLowerCase().includes(q) ||
             r.projectId?.toLowerCase().includes(q);
    }
    return true;
  }), [driverRapportinos, statusFilter, filterDriver, filterProject, searchQuery]);

  const filteredCollaborators = useMemo(() => collaboratorRapportinos.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (filterCollaborator && r.collaboratorId !== filterCollaborator) return false;
    if (filterProject && r.projectId !== filterProject) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.id?.toLowerCase().includes(q) || 
             r.collaboratorId?.toLowerCase().includes(q) ||
             r.projectId?.toLowerCase().includes(q);
    }
    return true;
  }), [collaboratorRapportinos, statusFilter, filterCollaborator, filterProject, searchQuery]);

  const handleClientStatusUpdate = useCallback(async (rapportinoId: string, action: 'review' | 'send' | 'accept' | 'facturar') => {
    setUpdatingStatus(rapportinoId);
    try {
      let result;
      switch (action) {
        case 'review': result = await reviewRapportinoClient(rapportinoId); break;
        case 'send': result = await sendRapportinoClient(rapportinoId); break;
        case 'accept': result = await acceptRapportinoClient(rapportinoId); break;
        case 'facturar': result = await facturarRapportino(rapportinoId); break;
      }
      if (result?.error) {
        showToast(result.error, 'error');
        return;
      }
      showToast('Rapportino actualizado correctamente', 'success');
      await loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setUpdatingStatus(null);
    }
  }, [loadData, showToast]);

  const handleDriverStatusUpdate = useCallback(async (rapportinoId: string, action: 'review' | 'send' | 'accept' | 'pay') => {
    setUpdatingStatus(rapportinoId);
    try {
      let result;
      switch (action) {
        case 'review': result = await reviewRapportinoDriver(rapportinoId); break;
        case 'send': result = await sendRapportinoDriver(rapportinoId); break;
        case 'accept': result = await acceptRapportinoDriver(rapportinoId); break;
        case 'pay': result = await payRapportinoDriver(rapportinoId); break;
      }
      if (result?.error) {
        showToast(result.error, 'error');
        return;
      }
      showToast('Rapportino actualizado correctamente', 'success');
      await loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setUpdatingStatus(null);
    }
  }, [loadData, showToast]);

  const getClientNextAction = (status: ClientStatus): 'review' | 'send' | 'accept' | 'facturar' | null => {
    const next = CLIENT_TRANSITIONS[status];
    if (!next) return null;
    const map: Record<string, 'review' | 'send' | 'accept' | 'facturar'> = {
      Revisado: 'review', Enviado: 'send', Aceptado: 'accept', Facturado: 'facturar'
    };
    return map[next] || null;
  };

  const getDriverNextAction = (status: DriverStatus): 'review' | 'send' | 'accept' | 'pay' | null => {
    const next = DRIVER_TRANSITIONS[status];
    if (!next) return null;
    const map: Record<string, 'review' | 'send' | 'accept' | 'pay'> = {
      Revisado: 'review', Enviado: 'send', Aceptado: 'accept', Pagado: 'pay'
    };
    return map[next] || null;
  };

  const handleCollaboratorStatusUpdate = useCallback(async (rapportinoId: string, action: 'send' | 'accept' | 'pay') => {
    setUpdatingStatus(rapportinoId);
    try {
      let result;
      switch (action) {
        case 'send': result = await sendRapportinoCollaborator(rapportinoId); break;
        case 'accept': result = await acceptRapportinoCollaborator(rapportinoId); break;
        case 'pay': result = await payRapportinoCollaborator(rapportinoId); break;
      }
      if (result?.error) {
        showToast(result.error, 'error');
        return;
      }
      showToast('Rapportino actualizado correctamente', 'success');
      await loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setUpdatingStatus(null);
    }
  }, [loadData, showToast]);

  const getCollaboratorNextAction = (status: CollaboratorStatus): 'send' | 'accept' | 'pay' | null => {
    const next = COLLABORATOR_TRANSITIONS[status];
    if (!next) return null;
    const map: Record<string, 'send' | 'accept' | 'pay'> = {
      Enviado: 'send', Aceptado: 'accept', Pagado: 'pay'
    };
    return map[next] || null;
  };

  // Driver Link handlers
  const handleGenerateDriverLink = useCallback(async (rapportino: RapportinoDriverDTO) => {
    setDriverLinkModal({ open: true, rapportino, loading: true, link: null, error: '', copied: false });
    try {
      const link = await generateDriverLink(
        rapportino.driverId || '',
        rapportino.projectId || '',
        rapportino.weekStart || '',
        rapportino.weekEnd || rapportino.weekStart || ''
      );
      setDriverLinkModal(prev => ({ ...prev, loading: false, link }));
    } catch (err) {
      setDriverLinkModal(prev => ({ ...prev, loading: false, error: err.message || 'Failed to generate link' }));
    }
  }, []);

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setDriverLinkModal(prev => ({ ...prev, copied: true }));
      setTimeout(() => setDriverLinkModal(prev => ({ ...prev, copied: false })), 2000);
    } catch {
      // Fallback: select text
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setDriverLinkModal(prev => ({ ...prev, copied: true }));
      setTimeout(() => setDriverLinkModal(prev => ({ ...prev, copied: false })), 2000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const clientStatuses = ['Borrador', 'Revisado', 'Enviado', 'Aceptado', 'Facturado'];
  const driverStatuses = ['Borrador', 'Revisado', 'Enviado', 'Aceptado', 'Pagado'];
  const collaboratorStatuses = ['Borrador', 'Enviado', 'Aceptado', 'Pagado'];
  const currentStatuses = activeTab === 'client' ? clientStatuses : activeTab === 'driver' ? driverStatuses : collaboratorStatuses;

  // Get current filtered data
  const currentData = activeTab === 'client' ? filteredClients : activeTab === 'driver' ? filteredDrivers : filteredCollaborators;

  // Export to Excel (client-side CSV)
  const handleExportExcel = () => {
    const entityLabel = activeTab === 'client' ? 'Client' : activeTab === 'driver' ? 'Driver' : 'Collaborator';
    const headers = ['ID', 'Type', entityLabel, 'Project', 'PeriodStart', 'PeriodEnd', 'Status', 'Services', 'Amount', 'CreatedAt', 'SentAt', 'AcceptedAt', 'PaidAt'];
    const rows = currentData.map(r => [
      r.id,
      activeTab,
      r.clientId || r.driverId || r.collaboratorId,
      r.projectId,
      r.periodStart,
      r.periodEnd,
      r.status,
      r.items?.length || 0,
      r.totalAmount || 0,
      r.createdAt,
      r.sentAt || '',
      r.acceptedAt || '',
      r.paidAt || ''
    ]);
    exportToCSV(headers, rows, `Rapportino_${activeTab}`);
  };

  // Export to PDF (browser print)
  const handleExportPDF = () => {
    const typeLabel = activeTab === 'client' ? 'Clienti' : activeTab === 'driver' ? 'Conductores' : 'Collaboratori';
    const entityLabel = activeTab === 'client' ? 'Client' : activeTab === 'driver' ? 'Driver' : 'Collaborator';
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'entity', label: entityLabel },
      { key: 'project', label: 'Project' },
      { key: 'period', label: 'Period' },
      { key: 'status', label: 'Status' },
      { key: 'services', label: 'Services', align: 'right' as const },
      { key: 'amount', label: 'Amount', align: 'right' as const },
      { key: 'sentAt', label: 'Sent' },
      { key: 'acceptedAt', label: 'Accepted' },
    ];
    const data = currentData.map(r => ({
      id: r.id,
      entity: r.clientId || r.driverId || r.collaboratorId,
      project: r.projectId,
      period: `${formatDate(r.periodStart)} — ${formatDate(r.periodEnd)}`,
      status: r.status,
      services: r.items?.length || 0,
      amount: formatCurrency(r.totalAmount || 0),
      sentAt: formatDate(r.sentAt),
      acceptedAt: formatDate(r.acceptedAt),
    }));
    exportToPDF(`Rapportino ${typeLabel} Report`, columns, data, {
      subtitle: `Total: ${currentData.length} rapportinos`,
      footer: 'Transport Action ERP — Rapportino Report',
    });
  };

  return (
    <div id="rapportino-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      {/* Header */}
      <header id="rapportino-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Rapportinos</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {(activeTab === 'client' ? filteredClients : activeTab === 'driver' ? filteredDrivers : filteredCollaborators).length} rapportino{(activeTab === 'client' ? filteredClients : activeTab === 'driver' ? filteredDrivers : filteredCollaborators).length !== 1 ? 's' : ''} · {activeTab === 'client' ? 'Clienti' : activeTab === 'driver' ? 'Conductores' : 'Collaboratori'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Generar desde Reportes</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-dim rounded-lg p-1 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => { setActiveTab('client'); setStatusFilter('All'); }}
          className={`flex-1 min-w-0 py-2 px-2 text-[11px] sm:text-[12px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'client'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Clienti ({clientRapportinos.length})
        </button>
        <button
          onClick={() => { setActiveTab('driver'); setStatusFilter('All'); }}
          className={`flex-1 min-w-0 py-2 px-2 text-[11px] sm:text-[12px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'driver'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Conductores ({driverRapportinos.length})
        </button>
        <button
          onClick={() => { setActiveTab('collaborator'); setStatusFilter('All'); }}
          className={`flex-1 min-w-0 py-2 px-2 text-[11px] sm:text-[12px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'collaborator'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Collaboratori ({collaboratorRapportinos.length})
        </button>
      </div>

      <RapportinoFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        currentStatuses={currentStatuses}
        activeTab={activeTab}
        filterClient={filterClient}
        onFilterClientChange={setFilterClient}
        clientsList={clientsList}
        filterDriver={filterDriver}
        onFilterDriverChange={setFilterDriver}
        driversList={driversList}
        filterCollaborator={filterCollaborator}
        onFilterCollaboratorChange={setFilterCollaborator}
        collaboratorsList={collaboratorsList}
        filterProject={filterProject}
        onFilterProjectChange={setFilterProject}
        projectsList={projectsList}
        onClear={() => { setDateFrom(''); setDateTo(''); setSearchQuery(''); setStatusFilter('All'); setFilterClient(''); setFilterDriver(''); setFilterCollaborator(''); setFilterProject(''); }}
        hasActiveFilters={!!(dateFrom || dateTo || searchQuery || statusFilter !== 'All' || filterClient || filterDriver || filterCollaborator || filterProject)}
      />

      {/* Rapportinos List */}
      <div id="rapportinos-list" className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-dim rounded w-1/3" />
                  <div className="h-3 bg-surface-dim rounded w-1/2" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-16 bg-surface-dim rounded-full" />
                  <div className="h-8 w-8 bg-surface-dim rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (activeTab === 'client' ? filteredClients : activeTab === 'driver' ? filteredDrivers : filteredCollaborators).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <FileText className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery || statusFilter !== 'All' ? 'No hay rapportinos que coincidan' : 'No hay rapportinos aún'}
            </span>
            <p className="text-[11px] text-on-surface-variant">
              Generar rapportinos desde la pantalla de Reportes
            </p>
          </div>
        ) : activeTab === 'client' ? (
          <AnimatePresence mode="popLayout">
            {filteredClients.map(r => (
            <ClientRapportinoCard
              key={r.id}
              rapportino={r}
              isUpdating={updatingStatus === r.id}
              nextAction={getClientNextAction(r.status as ClientStatus)}
              nextLabel={r.status ? CLIENT_NEXT_STATUS_LABELS[r.status] : null}
              onStatusUpdate={handleClientStatusUpdate}
              onView={(rec) => setViewTarget(rec)}
              formatDate={formatDate}
            />
          ))}
          </AnimatePresence>
        ) : activeTab === 'driver' ? (
          <AnimatePresence mode="popLayout">
            {filteredDrivers.map(r => (
              <DriverRapportinoCard
                key={r.id}
                rapportino={r}
                isUpdating={updatingStatus === r.id}
                nextAction={getDriverNextAction(r.status as DriverStatus)}
                nextLabel={r.status ? DRIVER_NEXT_STATUS_LABELS[r.status] : null}
                linkLoading={driverLinkModal.loading && driverLinkModal.rapportino?.id === r.id}
                onStatusUpdate={handleDriverStatusUpdate}
                onGenerateLink={handleGenerateDriverLink}
                onView={(rec) => setViewTarget(rec)}
                formatDate={formatDate}
              />
            ))}
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredCollaborators.map(r => (
              <CollaboratorRapportinoCard
                key={r.id}
                rapportino={r}
                isUpdating={updatingStatus === r.id}
                nextAction={getCollaboratorNextAction(r.status as CollaboratorStatus)}
                nextLabel={r.status ? COLLABORATOR_NEXT_STATUS_LABELS[r.status] : null}
                onStatusUpdate={handleCollaboratorStatusUpdate}
                onView={(rec) => setViewTarget(rec)}
                formatDate={formatDate}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {viewTarget && (
        <RapportinoDetailModal
          viewTarget={viewTarget}
          activeTab={activeTab}
          onClose={() => setViewTarget(null)}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      )}

      <DriverLinkModal
        open={driverLinkModal.open}
        rapportino={driverLinkModal.rapportino}
        loading={driverLinkModal.loading}
        link={driverLinkModal.link}
        error={driverLinkModal.error}
        copied={driverLinkModal.copied}
        onClose={() => setDriverLinkModal({ open: false, rapportino: null, loading: false, link: null, error: '', copied: false })}
        onCopyLink={handleCopyLink}
        formatDate={formatDate}
      />
    </div>
  );
}
