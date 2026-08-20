import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight,
  Search,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowRight
} from 'lucide-react';
import { ScreenId } from '../types';
import {
  ReconciliationDTO,
  getReconciliations,
  resolveReconciliation
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface ReconciliationScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

type StatusFilter = 'all' | 'Pendiente' | 'EnProceso' | 'Resuelto';

export default function ReconciliationScreen({ onNavigate }: ReconciliationScreenProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reconciliations, setReconciliations] = useState<ReconciliationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Resolution modal
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState({
    FinalStartTime: '',
    FinalEndTime: '',
    FinalKm: 0,
    FinalDiaria: 'none',
    FinalFestivo: false,
    FinalNotturno: false,
    Notes: ''
  });
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    loadReconciliations();
  }, []);

  const loadReconciliations = async () => {
    setIsLoading(true);
    try {
      const filters: { status?: string } = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      const result = await getReconciliations(filters);
      if (Array.isArray(result)) {
        setReconciliations(result);
      }
    } catch (err) {
      console.error('Error loading reconciliations:', err);
      showToast('Error al cargar conciliaciones', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReconciliations();
  }, [statusFilter]);

  const filtered = useMemo(() => reconciliations.filter(r => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.serviceId.toLowerCase().includes(q) ||
             r.projectId.toLowerCase().includes(q) ||
             r.id.toLowerCase().includes(q);
    }
    return true;
  }), [reconciliations, searchQuery]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Resuelto': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'EnProceso': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Pendiente': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resuelto': return 'bg-green-100 text-green-800 border-green-200';
      case 'EnProceso': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Pendiente': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const openResolveModal = (reconciliation: ReconciliationDTO) => {
    setResolvingId(reconciliation.id);
    // Pre-fill with driver values (or production if no driver data)
    const base = reconciliation.driver.startTime ? reconciliation.driver : reconciliation.production;
    setResolution({
      FinalStartTime: base.startTime || '',
      FinalEndTime: base.endTime || '',
      FinalKm: base.km || 0,
      FinalDiaria: base.diaria || 'none',
      FinalFestivo: base.festivo || false,
      FinalNotturno: base.notturno || false,
      Notes: ''
    });
  };

  const handleResolve = async () => {
    if (!resolvingId) return;
    setIsResolving(true);
    try {
      await resolveReconciliation(resolvingId, resolution);
      setResolvingId(null);
      await loadReconciliations();
    } catch (err) {
      console.error('Error resolving reconciliation:', err);
      showToast('Error al resolver conciliación', 'error');
      showToast('Error resolving reconciliation', 'error');
    } finally {
      setIsResolving(false);
    }
  };

  const hasDifferences = (r: ReconciliationDTO): boolean => {
    return r.production.startTime !== r.driver.startTime ||
           r.production.endTime !== r.driver.endTime ||
           r.production.km !== r.driver.km ||
           r.production.diaria !== r.driver.diaria ||
           r.production.festivo !== r.driver.festivo ||
           r.production.notturno !== r.driver.notturno;
  };

  const diffClass = (prod: any, driver: any): string => {
    return prod !== driver ? 'bg-amber-100 text-amber-800 rounded px-1 font-medium' : '';
  };

  // Stats
  const stats = {
    total: reconciliations.length,
    pendiente: reconciliations.filter(r => r.status === 'Pendiente').length,
    enProceso: reconciliations.filter(r => r.status === 'EnProceso').length,
    resuelto: reconciliations.filter(r => r.status === 'Resuelto').length,
    conDiferencias: reconciliations.filter(r => hasDifferences(r) && r.status !== 'Resuelto').length
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-3 border-b border-outline-variant shrink-0">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-primary shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-on-surface">Reconciliation</h1>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 px-4 sm:px-6 py-3 border-b border-outline-variant bg-surface-container-lowest">
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-bold text-on-surface">{stats.total}</div>
          <div className="text-[10px] sm:text-xs text-on-surface-variant">Total</div>
        </div>
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.pendiente}</div>
          <div className="text-[10px] sm:text-xs text-on-surface-variant">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-bold text-amber-600">{stats.enProceso}</div>
          <div className="text-[10px] sm:text-xs text-on-surface-variant">In Progress</div>
        </div>
        <div className="text-center hidden sm:block">
          <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.resuelto}</div>
          <div className="text-[10px] sm:text-xs text-on-surface-variant">Resolved</div>
        </div>
        <div className="text-center hidden sm:block">
          <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.conDiferencias}</div>
          <div className="text-[10px] sm:text-xs text-on-surface-variant">With Differences</div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 py-3 border-b border-outline-variant shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by service, project, or ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface-container border border-outline-variant rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-1 bg-surface-container border border-outline-variant rounded-lg p-1 overflow-x-auto hide-scrollbar shrink-0">
            {(['all', 'Pendiente', 'EnProceso', 'Resuelto'] as StatusFilter[]).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === status
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border border-outline-variant/30 rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-dim rounded w-1/4" />
                    <div className="h-3 bg-surface-dim rounded w-1/3" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-20 bg-surface-dim rounded-full" />
                    <div className="h-8 w-8 bg-surface-dim rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeftRight className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-50" />
            <p className="text-on-surface-variant">No reconciliations found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const isExpanded = expandedId === r.id;
              const diffs = hasDifferences(r);
              return (
                <div
                  key={r.id}
                  className={`border rounded-lg transition-colors ${
                    diffs && r.status !== 'Resuelto'
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-outline-variant bg-surface'
                  }`}
                >
                  {/* Row header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-container-low transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-on-surface-variant shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-on-surface-variant shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-on-surface truncate">{r.serviceId}</span>
                        <span className="text-xs text-on-surface-variant">→</span>
                        <span className="text-sm text-on-surface-variant truncate">{r.projectId}</span>
                      </div>
                    </div>
                    {diffs && r.status !== 'Resuelto' && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        Differences
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(r.status)}`}>
                      {getStatusIcon(r.status)}
                      <span className="ml-1">{r.status}</span>
                    </span>
                    {r.status !== 'Resuelto' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openResolveModal(r); }}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-outline-variant">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3">
                        {/* Production */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h4 className="text-xs font-bold text-blue-700 mb-2">Production</h4>
                          <div className="space-y-1 text-sm">
                            <div><span className="text-on-surface-variant">Start:</span> <span className={diffClass(r.production.startTime, r.driver.startTime)}>{r.production.startTime || '—'}</span></div>
                            <div><span className="text-on-surface-variant">End:</span> <span className={diffClass(r.production.endTime, r.driver.endTime)}>{r.production.endTime || '—'}</span></div>
                            <div><span className="text-on-surface-variant">KM:</span> <span className={diffClass(r.production.km, r.driver.km)}>{r.production.km}</span></div>
                            <div><span className="text-on-surface-variant">Diaria:</span> <span className={diffClass(r.production.diaria, r.driver.diaria)}>{r.production.diaria}</span></div>
                            <div><span className="text-on-surface-variant">Festivo:</span> <span className={diffClass(r.production.festivo, r.driver.festivo)}>{r.production.festivo ? 'Yes' : 'No'}</span></div>
                            <div><span className="text-on-surface-variant">Notturno:</span> <span className={diffClass(r.production.notturno, r.driver.notturno)}>{r.production.notturno ? 'Yes' : 'No'}</span></div>
                          </div>
                        </div>

                        {/* Driver */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h4 className="text-xs font-bold text-green-700 mb-2">Driver</h4>
                          <div className="space-y-1 text-sm">
                            <div><span className="text-on-surface-variant">Start:</span> <span className={diffClass(r.driver.startTime, r.production.startTime)}>{r.driver.startTime || '—'}</span></div>
                            <div><span className="text-on-surface-variant">End:</span> <span className={diffClass(r.driver.endTime, r.production.endTime)}>{r.driver.endTime || '—'}</span></div>
                            <div><span className="text-on-surface-variant">KM:</span> <span className={diffClass(r.driver.km, r.production.km)}>{r.driver.km}</span></div>
                            <div><span className="text-on-surface-variant">Diaria:</span> <span className={diffClass(r.driver.diaria, r.production.diaria)}>{r.driver.diaria}</span></div>
                            <div><span className="text-on-surface-variant">Festivo:</span> <span className={diffClass(r.driver.festivo, r.production.festivo)}>{r.driver.festivo ? 'Yes' : 'No'}</span></div>
                            <div><span className="text-on-surface-variant">Notturno:</span> <span className={diffClass(r.driver.notturno, r.production.notturno)}>{r.driver.notturno ? 'Yes' : 'No'}</span></div>
                          </div>
                        </div>

                        {/* Final (if resolved) */}
                        <div className={`rounded-lg p-3 ${
                          r.status === 'Resuelto'
                            ? 'bg-purple-50 border border-purple-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}>
                          <h4 className={`text-xs font-bold mb-2 ${
                            r.status === 'Resuelto' ? 'text-purple-700' : 'text-gray-500'
                          }`}>
                            Final {r.status === 'Resuelto' ? '(Resolved)' : '(Pending)'}
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div><span className="text-on-surface-variant">Start:</span> {r.final.startTime || '—'}</div>
                            <div><span className="text-on-surface-variant">End:</span> {r.final.endTime || '—'}</div>
                            <div><span className="text-on-surface-variant">KM:</span> {r.final.km}</div>
                            <div><span className="text-on-surface-variant">Diaria:</span> {r.final.diaria}</div>
                            <div><span className="text-on-surface-variant">Festivo:</span> {r.final.festivo ? 'Yes' : 'No'}</div>
                            <div><span className="text-on-surface-variant">Notturno:</span> {r.final.notturno ? 'Yes' : 'No'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Resolution info */}
                      {r.status === 'Resuelto' && (
                        <div className="mt-3 text-xs text-on-surface-variant">
                          Resolved by {r.resolvedBy} at {new Date(r.resolvedAt).toLocaleString()}
                          {r.resolutionNotes && <> — {r.resolutionNotes}</>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolve modal */}
      {resolvingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-outline-variant shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-on-surface">Resolve Reconciliation</h2>
              <button
                onClick={() => setResolvingId(null)}
                className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant"
              >
                ×
              </button>
            </div>
            <div className="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Final Start Time</label>
                  <input
                    type="text"
                    value={resolution.FinalStartTime}
                    onChange={e => setResolution(prev => ({ ...prev, FinalStartTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-surface-container border border-outline-variant rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Final End Time</label>
                  <input
                    type="text"
                    value={resolution.FinalEndTime}
                    onChange={e => setResolution(prev => ({ ...prev, FinalEndTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-surface-container border border-outline-variant rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Final KM</label>
                  <input
                    type="number"
                    value={resolution.FinalKm}
                    onChange={e => setResolution(prev => ({ ...prev, FinalKm: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm bg-surface-container border border-outline-variant rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Final Diaria</label>
                  <select
                    value={resolution.FinalDiaria}
                    onChange={e => setResolution(prev => ({ ...prev, FinalDiaria: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-surface-container border border-outline-variant rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="none">None</option>
                    <option value="mezza">Mezza</option>
                    <option value="piena">Piena</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={resolution.FinalFestivo}
                    onChange={e => setResolution(prev => ({ ...prev, FinalFestivo: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-on-surface">Festivo</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={resolution.FinalNotturno}
                    onChange={e => setResolution(prev => ({ ...prev, FinalNotturno: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-on-surface">Notturno</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Resolution Notes</label>
                <textarea
                  value={resolution.Notes}
                  onChange={e => setResolution(prev => ({ ...prev, Notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-surface-container border border-outline-variant rounded-lg focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-outline-variant shrink-0">
              <button
                onClick={() => setResolvingId(null)}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={isResolving}
                className="px-4 py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                {isResolving ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
