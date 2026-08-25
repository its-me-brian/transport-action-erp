import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorUtils';
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
  CLIENT_STATUS_CONFIG,
  DRIVER_STATUS_CONFIG,
  COLLABORATOR_STATUS_CONFIG,
  CLIENT_TRANSITIONS,
  DRIVER_TRANSITIONS,
  COLLABORATOR_TRANSITIONS,
  CLIENT_NEXT_STATUS_LABELS,
  DRIVER_NEXT_STATUS_LABELS,
  COLLABORATOR_NEXT_STATUS_LABELS,
  ClientStatus,
  DriverStatus,
  CollaboratorStatus
} from '../components/RapportinoCards';
import { ScreenId } from '../types';

type TabType = 'client' | 'driver' | 'collaborator';

interface UseRapportinoProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export function useRapportino({ onNavigate }: UseRapportinoProps) {
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

  const [clientsList, setClientsList] = useState<ClientDTO[]>([]);
  const [driversList, setDriversList] = useState<DriverRecord[]>([]);
  const [collaboratorsList, setCollaboratorsList] = useState<CollaboratorDTO[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  const [viewTarget, setViewTarget] = useState<RapportinoClientDTO | RapportinoDriverDTO | RapportinoCollaboratorDTO | null>(null);

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const [driverLinkModal, setDriverLinkModal] = useState<{
    open: boolean;
    rapportino: RapportinoDriverDTO | null;
    loading: boolean;
    link: DriverLinkDTO | null;
    error: string;
    copied: boolean;
  }>({ open: false, rapportino: null, loading: false, link: null, error: '', copied: false });

  const loadData = useCallback(async () => {
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
  }, [activeTab, dateFrom, dateTo, filterClient, filterDriver, filterCollaborator, filterProject, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  }, [showToast]);

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

  const getClientNextAction = useCallback((status: ClientStatus): 'review' | 'send' | 'accept' | 'facturar' | null => {
    const next = CLIENT_TRANSITIONS[status];
    if (!next) return null;
    const map: Record<string, 'review' | 'send' | 'accept' | 'facturar'> = {
      Revisado: 'review', Enviado: 'send', Aceptado: 'accept', Facturado: 'facturar'
    };
    return map[next] || null;
  }, []);

  const getDriverNextAction = useCallback((status: DriverStatus): 'review' | 'send' | 'accept' | 'pay' | null => {
    const next = DRIVER_TRANSITIONS[status];
    if (!next) return null;
    const map: Record<string, 'review' | 'send' | 'accept' | 'pay'> = {
      Revisado: 'review', Enviado: 'send', Aceptado: 'accept', Pagado: 'pay'
    };
    return map[next] || null;
  }, []);

  const getCollaboratorNextAction = useCallback((status: CollaboratorStatus): 'send' | 'accept' | 'pay' | null => {
    const next = COLLABORATOR_TRANSITIONS[status];
    if (!next) return null;
    const map: Record<string, 'send' | 'accept' | 'pay'> = {
      Enviado: 'send', Aceptado: 'accept', Pagado: 'pay'
    };
    return map[next] || null;
  }, []);

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

  const handleCopyLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setDriverLinkModal(prev => ({ ...prev, copied: true }));
      setTimeout(() => setDriverLinkModal(prev => ({ ...prev, copied: false })), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setDriverLinkModal(prev => ({ ...prev, copied: true }));
      setTimeout(() => setDriverLinkModal(prev => ({ ...prev, copied: false })), 2000);
    }
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }, []);

  const clientStatuses = ['Borrador', 'Revisado', 'Enviado', 'Aceptado', 'Facturado'];
  const driverStatuses = ['Borrador', 'Revisado', 'Enviado', 'Aceptado', 'Pagado'];
  const collaboratorStatuses = ['Borrador', 'Enviado', 'Aceptado', 'Pagado'];
  const currentStatuses = activeTab === 'client' ? clientStatuses : activeTab === 'driver' ? driverStatuses : collaboratorStatuses;

  const currentData = activeTab === 'client' ? filteredClients : activeTab === 'driver' ? filteredDrivers : filteredCollaborators;

  const handleExportExcel = useCallback(() => {
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
  }, [activeTab, currentData]);

  const handleExportPDF = useCallback(() => {
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
  }, [activeTab, currentData, formatDate, formatCurrency]);

  const handleClearFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setStatusFilter('All');
    setFilterClient('');
    setFilterDriver('');
    setFilterCollaborator('');
    setFilterProject('');
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setStatusFilter('All');
  }, []);

  return {
    activeTab,
    setActiveTab: handleTabChange,
    clientRapportinos,
    driverRapportinos,
    collaboratorRapportinos,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    filterClient,
    setFilterClient,
    filterDriver,
    setFilterDriver,
    filterCollaborator,
    setFilterCollaborator,
    filterProject,
    setFilterProject,
    clientsList,
    driversList,
    collaboratorsList,
    projectsList,
    viewTarget,
    setViewTarget,
    updatingStatus,
    driverLinkModal,
    setDriverLinkModal,
    filteredClients,
    filteredDrivers,
    filteredCollaborators,
    currentStatuses,
    currentData,
    loadData,
    handleClientStatusUpdate,
    handleDriverStatusUpdate,
    handleCollaboratorStatusUpdate,
    getClientNextAction,
    getDriverNextAction,
    getCollaboratorNextAction,
    handleGenerateDriverLink,
    handleCopyLink,
    formatCurrency,
    formatDate,
    handleExportExcel,
    handleExportPDF,
    handleClearFilters,
    onNavigate,
  };
}
