import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorUtils';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  Loader2, 
  X, 
  Save, 
  Eye,
  Send,
  CheckCircle,
  Clock,
  Filter,
  Download,
  Trash2,
  Link,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { ScreenId } from '../types';
import StatusBadge from './StatusBadge';
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

interface RapportinoScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

type TabType = 'client' | 'driver' | 'collaborator';

type ClientStatus = 'Borrador' | 'Revisado' | 'Enviado' | 'Aceptado' | 'Facturado';
type DriverStatus = 'Borrador' | 'Revisado' | 'Enviado' | 'Aceptado' | 'Pagado';
type CollaboratorStatus = 'Borrador' | 'Enviado' | 'Aceptado' | 'Pagado';

// ─── Animated Status Flow Stepper ──────────────────────────────────────────────

interface StatusFlowProps {
  statuses: string[];
  currentStatus: string;
  statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }>;
}

function StatusFlow({ statuses, currentStatus, statusConfig }: StatusFlowProps) {
  const currentIndex = statuses.indexOf(currentStatus);

  return (
    <div className="flex items-center w-full py-3">
      {statuses.map((status, index) => {
        const config = statusConfig[status] || statusConfig.Borrador;
        const Icon = config.icon;
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <React.Fragment key={status}>
            {/* Status Node */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500
                  ${isCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : ''}
                  ${isCurrent ? `${config.bg} ${config.color} ring-2 ring-offset-1 ring-current shadow-lg animate-pulse` : ''}
                  ${isFuture ? 'bg-surface-dim text-outline border border-outline-variant/50' : ''}
                `}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[9px] font-medium whitespace-nowrap transition-colors duration-300 ${
                  isCurrent ? 'text-on-surface' : isCompleted ? 'text-emerald-600' : 'text-outline'
                }`}
              >
                {status}
              </span>
            </div>

            {/* Animated Connector Line */}
            {index < statuses.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 relative overflow-hidden rounded-full bg-surface-dim">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                    index < currentIndex
                      ? 'bg-emerald-500 w-full'
                      : index === currentIndex
                      ? 'bg-gradient-to-r from-emerald-500 to-outline-variant/30 animate-[shimmer_2s_ease-in-out_infinite]'
                      : 'w-0'
                  }`}
                />
                {/* Animated dot traveling along the line for current transition */}
                {index === currentIndex && (
                  <div className="absolute inset-y-0 left-0 w-full">
                    <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-[travel_2s_ease-in-out_infinite]" />
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const PERIOD_TYPE_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  custom: 'Personalizado'
};

// ─── State machine definitions per docs/04-STATE_MACHINES.md ──────────────────

const CLIENT_TRANSITIONS: Record<ClientStatus, ClientStatus | null> = {
  Borrador: 'Revisado',
  Revisado: 'Enviado',
  Enviado: 'Aceptado',
  Aceptado: 'Facturado',
  Facturado: null
};

const DRIVER_TRANSITIONS: Record<DriverStatus, DriverStatus | null> = {
  Borrador: 'Revisado',
  Revisado: 'Enviado',
  Enviado: 'Aceptado',
  Aceptado: 'Pagado',
  Pagado: null
};

const CLIENT_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Borrador: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
  Revisado: { icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  Enviado: { icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
  Aceptado: { icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  Facturado: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' }
};

const DRIVER_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Borrador: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
  Revisado: { icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  Enviado: { icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
  Aceptado: { icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  Pagado: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' }
};

const CLIENT_NEXT_STATUS_LABELS: Record<string, string> = {
  Borrador: 'Revisar',
  Revisado: 'Enviar',
  Enviado: 'Aceptar',
  Aceptado: 'Facturar',
};

const DRIVER_NEXT_STATUS_LABELS: Record<string, string> = {
  Borrador: 'Revisar',
  Revisado: 'Enviar',
  Enviado: 'Aceptar',
  Aceptado: 'Pagar',
};

const COLLABORATOR_TRANSITIONS: Record<CollaboratorStatus, CollaboratorStatus | null> = {
  Borrador: 'Enviado',
  Enviado: 'Aceptado',
  Aceptado: 'Pagado',
  Pagado: null
};

const COLLABORATOR_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Borrador: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
  Enviado: { icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
  Aceptado: { icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  Pagado: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' }
};

const COLLABORATOR_NEXT_STATUS_LABELS: Record<string, string> = {
  Borrador: 'Enviar',
  Enviado: 'Aceptar',
  Aceptado: 'Pagar',
};

// ─── Memoized Card Components ─────────────────────────────────────────────────

interface ClientCardProps {
  rapportino: RapportinoClientDTO;
  isUpdating: boolean;
  nextAction: 'review' | 'send' | 'accept' | 'facturar' | null;
  nextLabel: string | null;
  onStatusUpdate: (id: string, action: 'review' | 'send' | 'accept' | 'facturar') => void;
  onView: (r: RapportinoClientDTO) => void;
  formatDate: (d: string) => string;
}

const ClientRapportinoCard = React.memo(function ClientRapportinoCard({
  rapportino: r, isUpdating, nextAction, nextLabel, onStatusUpdate, onView, formatDate
}: ClientCardProps) {
  const sc = CLIENT_STATUS_CONFIG[r.status] || CLIENT_STATUS_CONFIG.Borrador;
  const StatusIcon = sc.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
        <StatusIcon className={`w-4 h-4 ${sc.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={r.status || 'Borrador'} size="xs" />
          <span className="text-[11px] text-on-surface-variant font-mono">{r.id}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-on-surface-variant">
          <span className="font-medium">{r.clientId}</span>
          {r.projectId && <span>{r.projectId}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {PERIOD_TYPE_LABELS[r.periodType || 'weekly'] || r.periodType || 'Semanal'}: {formatDate(r.periodStart || r.weekStart)} → {formatDate(r.periodEnd || r.weekEnd)}
          </span>
          {r.sentAt && <span className="text-on-surface-variant">Enviado: {formatDate(r.sentAt)}</span>}
          {r.acceptedAt && <span className="text-on-surface-variant">Aceptado: {formatDate(r.acceptedAt)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {nextAction && nextLabel && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onStatusUpdate(r.id!, nextAction)}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-medium rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {nextLabel}
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onView(r)}
          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
});

interface DriverCardProps {
  rapportino: RapportinoDriverDTO;
  isUpdating: boolean;
  nextAction: 'review' | 'send' | 'accept' | 'pay' | null;
  nextLabel: string | null;
  linkLoading: boolean;
  onStatusUpdate: (id: string, action: 'review' | 'send' | 'accept' | 'pay') => void;
  onGenerateLink: (r: RapportinoDriverDTO) => void;
  onView: (r: RapportinoDriverDTO) => void;
  formatDate: (d: string) => string;
}

const DriverRapportinoCard = React.memo(function DriverRapportinoCard({
  rapportino: r, isUpdating, nextAction, nextLabel, linkLoading, onStatusUpdate, onGenerateLink, onView, formatDate
}: DriverCardProps) {
  const sc = DRIVER_STATUS_CONFIG[r.status] || DRIVER_STATUS_CONFIG.Borrador;
  const StatusIcon = sc.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
        <StatusIcon className={`w-4 h-4 ${sc.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={r.status || 'Borrador'} size="xs" />
          <span className="text-[11px] text-on-surface-variant font-mono">{r.id}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-on-surface-variant">
          <span className="font-medium">{r.driverId}</span>
          {r.projectId && <span>{r.projectId}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {PERIOD_TYPE_LABELS[r.periodType || 'weekly'] || r.periodType || 'Semanal'}: {formatDate(r.periodStart || r.weekStart)} → {formatDate(r.periodEnd || r.weekEnd)}
          </span>
          {r.sentAt && <span className="text-on-surface-variant">Enviado: {formatDate(r.sentAt)}</span>}
          {r.paidAt && <span className="text-on-surface-variant">Pagado: {formatDate(r.paidAt)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onGenerateLink(r)}
          disabled={linkLoading}
          title="Generar link para conductor"
          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer disabled:opacity-50"
        >
          <Link className="w-3.5 h-3.5" />
        </motion.button>
        {nextAction && nextLabel && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onStatusUpdate(r.id!, nextAction)}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-medium rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {nextLabel}
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onView(r)}
          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
});

interface CollaboratorCardProps {
  rapportino: RapportinoCollaboratorDTO;
  isUpdating: boolean;
  nextAction: 'send' | 'accept' | 'pay' | null;
  nextLabel: string | null;
  onStatusUpdate: (id: string, action: 'send' | 'accept' | 'pay') => void;
  onView: (r: RapportinoCollaboratorDTO) => void;
  formatDate: (d: string) => string;
}

const CollaboratorRapportinoCard = React.memo(function CollaboratorRapportinoCard({
  rapportino: r, isUpdating, nextAction, nextLabel, onStatusUpdate, onView, formatDate
}: CollaboratorCardProps) {
  const sc = COLLABORATOR_STATUS_CONFIG[r.status] || COLLABORATOR_STATUS_CONFIG.Borrador;
  const StatusIcon = sc.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
        <StatusIcon className={`w-4 h-4 ${sc.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={r.status || 'Borrador'} size="xs" />
          <span className="text-[11px] text-on-surface-variant font-mono">{r.id}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-on-surface-variant">
          <span className="font-medium">{r.collaboratorId}</span>
          {r.projectId && <span>{r.projectId}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {PERIOD_TYPE_LABELS[r.periodType || 'weekly'] || r.periodType || 'Semanal'}: {formatDate(r.periodStart)} → {formatDate(r.periodEnd)}
          </span>
          {r.sentAt && <span className="text-on-surface-variant">Enviado: {formatDate(r.sentAt)}</span>}
          {r.paidAt && <span className="text-on-surface-variant">Pagado: {formatDate(r.paidAt)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {nextAction && nextLabel && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onStatusUpdate(r.id!, nextAction)}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-medium rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {nextLabel}
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onView(r)}
          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
});

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

      {/* Filters */}
      <div id="rapportino-filters" className="flex flex-col gap-2 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar rapportinos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full sm:w-auto bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
            />
            <span className="hidden sm:inline text-on-surface-variant text-[12px]">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full sm:w-auto bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] font-medium rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer"
            >
              <option value="All">Todos los estados</option>
              {currentStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {activeTab === 'client' && (
              <select
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer"
              >
                <option value="">Todos los clientes</option>
                {clientsList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {activeTab === 'driver' && (
              <select
                value={filterDriver}
                onChange={e => setFilterDriver(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer"
              >
                <option value="">Todos los conductores</option>
                {driversList.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            {activeTab === 'collaborator' && (
              <select
                value={filterCollaborator}
                onChange={e => setFilterCollaborator(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer"
              >
                <option value="">Todos los colaboradores</option>
                {collaboratorsList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer"
            >
              <option value="">Todos los proyectos</option>
              {projectsList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {(dateFrom || dateTo || searchQuery || statusFilter !== 'All' || filterClient || filterDriver || filterCollaborator || filterProject) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setSearchQuery(''); setStatusFilter('All'); setFilterClient(''); setFilterDriver(''); setFilterCollaborator(''); setFilterProject(''); }}
              className="text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

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

      {/* Detail Modal */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <div>
                <h3 className="text-[15px] font-semibold text-on-surface">
                  Rapportino — {activeTab === 'client' ? 'Cliente' : activeTab === 'driver' ? 'Conductor' : 'Collaboratore'}
                </h3>
                <p className="text-[11px] text-on-surface-variant">{viewTarget.id}</p>
              </div>
              <button onClick={() => setViewTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Estado</span>
                  <p className="font-medium text-on-surface">{viewTarget.status}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">
                    {activeTab === 'client' ? 'Cliente' : activeTab === 'driver' ? 'Conductor' : 'Collaboratore'}
                  </span>
                  <p className="font-medium text-on-surface">
                    {activeTab === 'client' ? (viewTarget as RapportinoClientDTO).clientId : activeTab === 'driver' ? (viewTarget as RapportinoDriverDTO).driverId : (viewTarget as RapportinoCollaboratorDTO).collaboratorId}
                  </p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Proyecto</span>
                  <p className="font-medium text-on-surface">{viewTarget.projectId || '—'}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Tipo de período</span>
                  <p className="font-medium text-on-surface">{PERIOD_TYPE_LABELS[viewTarget.periodType || 'weekly'] || viewTarget.periodType || 'Semanal'}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Creado por</span>
                  <p className="font-medium text-on-surface">{viewTarget.createdBy || '—'}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Período desde</span>
                  <p className="font-medium text-on-surface">{formatDate(viewTarget.periodStart || viewTarget.weekStart)}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Período hasta</span>
                  <p className="font-medium text-on-surface">{formatDate(viewTarget.periodEnd || viewTarget.weekEnd)}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Enviado</span>
                  <p className="font-medium text-on-surface">{formatDate(viewTarget.sentAt)}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">
                    {activeTab === 'client' ? 'Aceptado' : 'Pagado'}
                  </span>
                  <p className="font-medium text-on-surface">
                    {formatDate(activeTab === 'client' ? (viewTarget as RapportinoClientDTO).acceptedAt : (viewTarget as RapportinoDriverDTO).paidAt || (viewTarget as RapportinoCollaboratorDTO).paidAt)}
                  </p>
                </div>
              </div>
              {/* Animated Status Flow */}
              <div className="mt-2">
                <span className="text-on-surface-variant uppercase text-[10px]">Flujo de estado</span>
                <StatusFlow
                  statuses={
                    activeTab === 'client'
                      ? ['Borrador', 'Revisado', 'Enviado', 'Aceptado', 'Facturado']
                      : activeTab === 'driver'
                      ? ['Borrador', 'Revisado', 'Enviado', 'Aceptado', 'Pagado']
                      : ['Borrador', 'Enviado', 'Aceptado', 'Pagado']
                  }
                  currentStatus={viewTarget.status || 'Borrador'}
                  statusConfig={
                    activeTab === 'client'
                      ? CLIENT_STATUS_CONFIG
                      : activeTab === 'driver'
                      ? DRIVER_STATUS_CONFIG
                      : COLLABORATOR_STATUS_CONFIG
                  }
                />
              </div>

              {viewTarget.notes && (
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Notas</span>
                  <p className="text-[12px] text-on-surface mt-1">{viewTarget.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button
                onClick={() => {
                  // Export single rapportino PDF
                  const r = viewTarget;
                  const type = activeTab === 'client' ? 'Cliente' : activeTab === 'driver' ? 'Conductor' : 'Collaboratore';
                  const person = activeTab === 'client' ? (r as RapportinoClientDTO).clientId : activeTab === 'driver' ? (r as RapportinoDriverDTO).driverId : (r as RapportinoCollaboratorDTO).collaboratorId;
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  printWindow.document.write(`<!DOCTYPE html><html><head><title>Rapportino ${r.id}</title>
                    <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1a1a2e;font-size:22px}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#1a1a2e;color:white;padding:8px 12px;text-align:left;font-size:12px}td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}.label{color:#6b7280;font-size:10px;text-transform:uppercase}.value{font-weight:500}.footer{margin-top:20px;font-size:11px;color:#9ca3af}@media print{body{padding:0}}</style>
                    </head><body>
                    <h1>Rapportino ${type}</h1>
                    <p style="color:#6b7280;font-size:13px">ID: ${r.id} | Generato: ${new Date().toLocaleDateString('it-IT')}</p>
                    <table><tbody>
                    <tr><td class="label">Stato</td><td class="value">${r.status}</td></tr>
                    <tr><td class="label">${type}</td><td class="value">${person}</td></tr>
                    <tr><td class="label">Progetto</td><td class="value">${r.projectId || '—'}</td></tr>
                    <tr><td class="label">Periodo</td><td class="value">${formatDate(r.periodStart)} — ${formatDate(r.periodEnd)}</td></tr>
                    <tr><td class="label">Importo</td><td class="value">${formatCurrency(r.totalAmount || 0)}</td></tr>
                    ${r.notes ? `<tr><td class="label">Note</td><td class="value">${r.notes}</td></tr>` : ''}
                    </tbody></table>
                    <p class="footer">Transport Action ERP — Rapportino ${type}</p>
                    </body></html>`);
                  printWindow.document.close();
                  printWindow.print();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-on-surface border border-outline-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                Export PDF
              </button>
              <button
                onClick={() => setViewTarget(null)}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Link Modal */}
      {driverLinkModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <div>
                <h3 className="text-[15px] font-semibold text-on-surface">
                  Link para Conductor
                </h3>
                <p className="text-[11px] text-on-surface-variant">
                  {driverLinkModal.rapportino?.driverId} — {driverLinkModal.rapportino?.projectId}
                </p>
              </div>
              <button
                onClick={() => setDriverLinkModal({ open: false, rapportino: null, loading: false, link: null, error: '', copied: false })}
                className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
              {driverLinkModal.loading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-[12px] text-on-surface-variant">Generando link...</span>
                </div>
              ) : driverLinkModal.error ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <AlertCircle className="w-6 h-6 text-error" />
                  <span className="text-[12px] text-error">{driverLinkModal.error}</span>
                </div>
              ) : driverLinkModal.link ? (
                <div className="space-y-4">
                  <div className="bg-surface-container rounded-lg p-3">
                    <span className="text-[10px] text-on-surface-variant uppercase">Link</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        readOnly
                        value={driverLinkModal.link.link || ''}
                        className="flex-1 text-[12px] text-on-surface bg-transparent border border-outline-variant rounded px-2 py-1.5 font-mono"
                      />
                      <button
                        onClick={() => handleCopyLink(driverLinkModal.link?.link || '')}
                        className="p-2 hover:bg-surface-container rounded transition-colors cursor-pointer"
                        title="Copiar link"
                      >
                        {driverLinkModal.copied ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-on-surface-variant" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-on-surface-variant uppercase text-[10px]">Token</span>
                      <p className="font-mono text-on-surface">{driverLinkModal.link.token}</p>
                    </div>
                    <div>
                      <span className="text-on-surface-variant uppercase text-[10px]">Expira</span>
                      <p className="text-on-surface">{formatDate(driverLinkModal.link.expiresAt)}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button
                onClick={() => setDriverLinkModal({ open: false, rapportino: null, loading: false, link: null, error: '', copied: false })}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
