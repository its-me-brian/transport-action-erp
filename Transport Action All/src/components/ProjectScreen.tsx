import React from 'react';
import { 
  FolderOpen, 
  Plus, 
  Search, 
  Calendar, 
  Building2, 
  Pencil,
  Trash2,
} from 'lucide-react';
import { ScreenId } from '../types';
import { Project } from '../services/api';
import { useProjects } from '../hooks/useProjects';
import { STATUS_CONFIG, getLifecycleActions, StatusFilter } from '../utils/projectHelpers';
import { ProjectFormModal } from './ProjectModals';

interface ProjectScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function ProjectScreen({ onNavigate }: ProjectScreenProps) {
  const {
    clients,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    editProject,
    setEditProject,
    isSaving,
    isNew,
    deleteConfirm,
    setDeleteConfirm,
    dashboardSummary,
    filtered,
    handleSave,
    handleDelete,
    handleLifecycleTransition,
    openNew,
    openEdit,
  } = useProjects();

  return (
    <div id="project-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
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
              aria-label="Search projects"
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
            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.Nuovo;
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
      <ProjectFormModal
        editProject={editProject}
        setEditProject={setEditProject}
        isNew={isNew}
        isSaving={isSaving}
        clients={clients}
        handleSave={handleSave}
      />
    </div>
  );
}
