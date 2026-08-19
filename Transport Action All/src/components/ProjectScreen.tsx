import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Search, 
  Calendar, 
  Building2, 
  Loader2, 
  X, 
  Save, 
  Trash2, 
  Pencil,
  CheckCircle,
  PlayCircle,
  Clock
} from 'lucide-react';
import { ScreenId } from '../types';
import { Project, getProjects, createProject, updateProject, deleteProject, getClients, prepararProject, activarProject, pasarAFacturacionProject, pasarACobroProject, cerrarProject, getMainDashboard, DashboardSummary } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface ProjectScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

type StatusFilter = 'All' | Project['status'];

type ClientOption = { id: string; name: string };

export default function ProjectScreen({ onNavigate }: ProjectScreenProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  // Add/Edit modal
  const [editProject, setEditProject] = useState<Partial<Project> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Dashboard summary
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    loadProjects();
    loadClients();
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const summary = await getMainDashboard();
      setDashboardSummary(summary);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      showToast('Error al cargar dashboard', 'error');
    }
  };

  const loadClients = async () => {
    try {
      const result = await getClients();
      if (Array.isArray(result)) {
        setClients(result.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (err) {
      console.error('Error loading clients:', err);
      showToast('Error al cargar clientes', 'error');
    }
  };

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const result = await getProjects();
      if (Array.isArray(result)) {
        // Dedup by ID
        const seen = new Set<string>();
        const unique = result.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setProjects(unique);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      showToast('Error al cargar proyectos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = projects.filter(p => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || 
             p.transportCompany.toLowerCase().includes(q) ||
             p.id.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSave = async () => {
    if (!editProject?.name?.trim()) {
      showToast('Project name is required', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      if (isNew) {
        const result = await createProject(token, {
          name: editProject.name!.trim(),
          clientId: editProject.clientId || '',
          transportCompany: editProject.transportCompany || '',
          operatingCompany: editProject.operatingCompany || '',
          coordinator: editProject.coordinator || '',
          status: editProject.status || 'Nuovo',
          dateFrom: editProject.dateFrom || '',
          dateTo: editProject.dateTo || '',
          notes: editProject.notes || ''
        });
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      } else {
        const result = await updateProject(token, editProject as Project);
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      }
      setEditProject(null);
      await loadProjects();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteProject(token, id);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setDeleteConfirm(null);
      await loadProjects();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // Project lifecycle transitions
  const handleLifecycleTransition = async (projectId: string, action: 'preparar' | 'activar' | 'pasarAFacturacion' | 'pasarACobro' | 'cerrar') => {
    const confirmMessages: Record<string, string> = {
      preparar: 'Preparare questo progetto?',
      activar: 'Attivare questo progetto?',
      pasarAFacturacion: 'Passare a fatturazione?',
      pasarACobro: 'Passare a incasso?',
      cerrar: 'Chiudere questo progetto?',
    };
    
    if (!confirm(confirmMessages[action])) return;
    
    try {
      let result;
      switch (action) {
        case 'preparar': result = await prepararProject(token, projectId); break;
        case 'activar': result = await activarProject(token, projectId); break;
        case 'pasarAFacturacion': result = await pasarAFacturacionProject(token, projectId); break;
        case 'pasarACobro': result = await pasarACobroProject(token, projectId); break;
        case 'cerrar': result = await cerrarProject(token, projectId); break;
      }
      if (result?.error) {
        showToast('Error: ' + result.error, 'error');
      } else {
        await loadProjects();
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // Get available lifecycle actions for a project status
  const getLifecycleActions = (status: Project['status']): Array<{ action: 'preparar' | 'activar' | 'pasarAFacturacion' | 'pasarACobro' | 'cerrar'; label: string; color: string }> => {
    switch (status) {
      case 'Nuovo': return [{ action: 'preparar', label: 'Preparare', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' }];
      case 'Preparazione': return [{ action: 'activar', label: 'Attivare', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' }];
      case 'Attivo': return [{ action: 'pasarAFacturacion', label: 'Fatturazione', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' }];
      case 'Fatturazione': return [{ action: 'pasarACobro', label: 'Incasso', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' }];
      case 'Incasso': return [{ action: 'cerrar', label: 'Chiudi', color: 'bg-green-50 text-green-600 hover:bg-green-100' }];
      default: return [];
    }
  };

  const statusConfig: Record<Project['status'], { icon: any; color: string; bg: string; label: string }> = {
    Nuovo: { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Nuovo' },
    Preparazione: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Preparazione' },
    Attivo: { icon: PlayCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Attivo' },
    Fatturazione: { icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Fatturazione' },
    Incasso: { icon: PlayCircle, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Incasso' },
    Chiuso: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Chiuso' },
    Archiviato: { icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Archiviato' },
  };

  const openNew = () => {
    setIsNew(true);
    setEditProject({
      name: '',
      clientId: '',
      transportCompany: '',
      operatingCompany: '',
      coordinator: '',
      status: 'Nuovo',
      dateFrom: '',
      dateTo: '',
      notes: ''
    });
  };

  const openEdit = (p: Project) => {
    setIsNew(false);
    setEditProject({ ...p });
  };

  return (
    <div id="project-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      {/* Header */}
      <header id="project-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Projects</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Project</span>
          </button>
        </div>
      </header>

      {/* Dashboard Summary */}
      {dashboardSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Services</p>
            <p className="text-[20px] font-bold text-on-surface mt-1">{dashboardSummary.services.total}</p>
            <p className="text-[10px] text-on-surface-variant">{dashboardSummary.services.validated} validated</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Revenue</p>
            <p className="text-[20px] font-bold text-emerald-600 mt-1">€{dashboardSummary.financials.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Cost</p>
            <p className="text-[20px] font-bold text-rose-600 mt-1">€{dashboardSummary.financials.totalCost.toLocaleString()}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Profit</p>
            <p className={`text-[20px] font-bold mt-1 ${dashboardSummary.financials.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              €{dashboardSummary.financials.profit.toLocaleString()}
            </p>
            <p className="text-[10px] text-on-surface-variant">{dashboardSummary.services.pendingValidation} pending validation</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div id="project-filters" className="flex flex-col gap-2 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] font-medium rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Nuovo">Nuovo</option>
              <option value="Preparazione">Preparazione</option>
              <option value="Attivo">Attivo</option>
              <option value="Fatturazione">Fatturazione</option>
              <option value="Incasso">Incasso</option>
              <option value="Chiuso">Chiuso</option>
              <option value="Archiviato">Archiviato</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div id="projects-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-surface-container-highest rounded w-32 animate-pulse" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-20 animate-pulse" />
                  </div>
                  <div className="h-5 bg-surface-container-highest rounded w-16 animate-pulse" />
                </div>
                <div className="flex gap-3">
                  <div className="h-2.5 bg-surface-container-highest rounded w-24 animate-pulse" />
                  <div className="h-2.5 bg-surface-container-highest rounded w-16 animate-pulse" />
                </div>
              </div>
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <FolderOpen className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery || statusFilter !== 'All' ? 'No projects match your filters' : 'No projects yet'}
            </span>
            {!searchQuery && statusFilter === 'All' && (
              <button
                onClick={openNew}
                className="mt-2 flex items-center gap-1.5 text-[12px] text-primary hover:text-primary-hover font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create your first project
              </button>
            )}
          </div>
        ) : (
          filtered.map(p => {
            const sc = statusConfig[p.status] || statusConfig.Nuovo;
            const StatusIcon = sc.icon;
            return (
              <div
                key={p.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col gap-3 hover:bg-surface-dim/30 transition-colors group relative"
              >
                {/* Top row: name + status */}
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-semibold text-on-surface truncate">{p.name}</h3>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">{p.id}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium gap-1 ${sc.bg} ${sc.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {sc.label}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 space-y-2 text-[12px]">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>
                      {p.dateFrom || '—'} → {p.dateTo || '—'}
                    </span>
                  </div>
                  {p.transportCompany && (
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{p.transportCompany}</span>
                    </div>
                  )}
                  {p.notes && (
                    <p className="text-[11px] text-on-surface-variant line-clamp-2">{p.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 pt-2 border-t border-outline-variant/30">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[12px] font-medium rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  {getLifecycleActions(p.status).map(lifecycle => (
                    <button
                      key={lifecycle.action}
                      onClick={() => handleLifecycleTransition(p.id, lifecycle.action)}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${lifecycle.color}`}
                    >
                      {lifecycle.label}
                    </button>
                  ))}
                  {deleteConfirm === p.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-3 py-1.5 bg-red-500 text-white text-[11px] font-medium rounded hover:bg-red-600 transition-colors cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 bg-surface-container text-on-surface-variant text-[11px] font-medium rounded hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(p.id)}
                      className="p-1.5 bg-surface-container hover:bg-red-50 text-on-surface-variant hover:text-red-500 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">
                {isNew ? 'New Project' : 'Edit Project'}
              </h3>
              <button onClick={() => setEditProject(null)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Project Name *</label>
                <input
                  type="text"
                  value={editProject.name || ''}
                  onChange={e => setEditProject({ ...editProject, name: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="e.g. Film Production ABC"
                />
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Status</label>
                <div className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface">
                  {editProject.status || 'Nuovo'}
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">Status changes via lifecycle buttons</p>
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Client</label>
                <select
                  value={editProject.clientId || ''}
                  onChange={e => setEditProject({ ...editProject, clientId: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">— None —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Operating Company</label>
                  <input
                    type="text"
                    value={editProject.operatingCompany || ''}
                    onChange={e => setEditProject({ ...editProject, operatingCompany: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="e.g. TA"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Coordinator</label>
                  <input
                    type="text"
                    value={editProject.coordinator || ''}
                    onChange={e => setEditProject({ ...editProject, coordinator: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="e.g. Marco"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editProject.dateFrom || ''}
                    onChange={e => setEditProject({ ...editProject, dateFrom: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">End Date</label>
                  <input
                    type="date"
                    value={editProject.dateTo || ''}
                    onChange={e => setEditProject({ ...editProject, dateTo: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Transport Company</label>
                <input
                  type="text"
                  value={editProject.transportCompany || ''}
                  onChange={e => setEditProject({ ...editProject, transportCompany: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="e.g. Transport Movie SRL"
                />
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
                <textarea
                  value={editProject.notes || ''}
                  onChange={e => setEditProject({ ...editProject, notes: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant">
              <button
                onClick={() => setEditProject(null)}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editProject.name?.trim()}
                className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isNew ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
