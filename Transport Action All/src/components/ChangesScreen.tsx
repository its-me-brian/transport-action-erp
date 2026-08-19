import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2, 
  X, 
  Save, 
  Trash2,
  Bell
} from 'lucide-react';
import { ScreenId } from '../types';
import { Change, getChanges, createChange, updateChange, deleteChange } from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface ChangesScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

type StatusFilter = 'All' | 'Open' | 'Resolved';

export default function ChangesScreen({ onNavigate }: ChangesScreenProps) {
  const { showToast } = useToast();
  const [changes, setChanges] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Open');

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChange, setNewChange] = useState({
    entityType: 'Service',
    entityId: '',
    type: 'other',
    description: '',
    priority: 'Medium',
    dueDate: '',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Resolve modal
  const [resolveTarget, setResolveTarget] = useState<Change | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadChanges();
  }, []);

  const loadChanges = async () => {
    setIsLoading(true);
    try {
      const result = await getChanges();
      if (result.changes) {
        // Dedup by ID
        const seen = new Set<string>();
        const unique = result.changes.filter(c => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
        setChanges(unique);
      }
    } catch (err) {
      console.error('Error loading changes:', err);
      showToast('Error al cargar los cambios', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = changes.filter(c => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.description.toLowerCase().includes(q) || 
             c.entityId.toLowerCase().includes(q) ||
             c.entityType.toLowerCase().includes(q) ||
             c.type.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = changes.filter(c => c.status === 'Open').length;

  const handleCreate = async () => {
    if (!newChange.description.trim()) {
      showToast('Description is required', 'warning');
      return;
    }
    if (!newChange.entityId.trim()) {
      showToast('Entity ID is required', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const result = await createChange({
        entityType: newChange.entityType,
        entityId: newChange.entityId.trim(),
        type: newChange.type,
        description: newChange.description.trim(),
        priority: newChange.priority,
        dueDate: newChange.dueDate || undefined,
        notes: newChange.notes || undefined
      });
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setNewChange({ entityType: 'Service', entityId: '', type: 'other', description: '', priority: 'Medium', dueDate: '', notes: '' });
      await loadChanges();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
      setShowAddModal(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    try {
      const result = await updateChange({
        id: resolveTarget.id,
        status: 'Resolved',
        resolvedBy: 'user',
        notes: resolveNotes
      });
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setResolveTarget(null);
      setResolveNotes('');
      await loadChanges();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteChange(id);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setDeleteConfirm(null);
      await loadChanges();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
    schedule: { label: 'Schedule', color: 'text-blue-600', bg: 'bg-blue-50' },
    driver: { label: 'Driver', color: 'text-purple-600', bg: 'bg-purple-50' },
    vehicle: { label: 'Vehicle', color: 'text-amber-600', bg: 'bg-amber-50' },
    route: { label: 'Route', color: 'text-teal-600', bg: 'bg-teal-50' },
    other: { label: 'Other', color: 'text-gray-600', bg: 'bg-gray-50' }
  };

  const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    Open: { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    Resolved: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' }
  };

  const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
    Low: { label: 'Low', color: 'text-gray-600', bg: 'bg-gray-100' },
    Medium: { label: 'Medium', color: 'text-blue-600', bg: 'bg-blue-50' },
    High: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50' },
    Critical: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50' }
  };

  const safeDate = (s: string) => {
    if (!s) return '—';
    try { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('it-IT'); }
    catch { return '—'; }
  };

  return (
    <div id="changes-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      {/* Header */}
      <header id="changes-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface flex items-center gap-2">
            Last-Minute Changes
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-[11px] font-bold">
                {pendingCount}
              </span>
            )}
          </h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filtered.length} change{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Change</span>
        </button>
      </header>

      {/* Filters */}
      <div id="changes-filters" className="flex flex-col gap-2 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              placeholder="Search changes..."
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
              <option value="Open">Open</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Changes List */}
      <div id="changes-list" className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-surface-dim shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2"><div className="h-5 w-16 bg-surface-dim rounded" /><div className="h-5 w-12 bg-surface-dim rounded" /></div>
                  <div className="h-3 w-3/4 bg-surface-dim rounded" />
                  <div className="h-3 w-1/2 bg-surface-dim rounded" />
                </div>
                <div className="h-7 w-16 bg-surface-dim rounded shrink-0" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Bell className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery || statusFilter !== 'All' ? 'No changes match your filters' : 'No changes yet'}
            </span>
            {!searchQuery && statusFilter === 'All' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 flex items-center gap-1.5 text-[12px] text-primary hover:text-primary-hover font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Report a change
              </button>
            )}
          </div>
        ) : (
          filtered.map(c => {
            const tc = typeConfig[c.type] || typeConfig.other;
            const sc = statusConfig[c.status] || statusConfig.Open;
            const pc = priorityConfig[c.priority] || priorityConfig.Medium;
            const StatusIcon = sc.icon;
            return (
              <div
                key={c.id}
                className={`bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${c.status === 'Open' ? 'border-l-4 border-l-orange-500' : ''}`}
              >
                {/* Status icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
                  <StatusIcon className={`w-4 h-4 ${sc.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${tc.bg} ${tc.color}`}>
                      {tc.label}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${pc.bg} ${pc.color}`}>
                      {pc.label}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{c.entityType}: {c.entityId}</span>
                    <span className="text-[10px] text-on-surface-variant">{c.createdAt}</span>
                  </div>
                  <p className="text-[13px] text-on-surface mt-1">{c.description}</p>
                  {c.dueDate && (
                    <p className="text-[11px] text-on-surface-variant mt-1">Due: {safeDate(c.dueDate)}</p>
                  )}
                  {c.notes && (
                    <p className="text-[11px] text-on-surface-variant mt-1 italic">Notes: {c.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.status === 'Open' && (
                    <>
                      <button
                        onClick={() => setResolveTarget(c)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[11px] font-medium rounded transition-colors cursor-pointer"
                      >
                        Resolve
                      </button>
                    </>
                  )}
                  {deleteConfirm === c.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="px-2 py-1 bg-red-500 text-white text-[10px] font-medium rounded hover:bg-red-600 cursor-pointer"
                      >
                        Del
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-medium rounded cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(c.id)}
                      className="p-1.5 hover:bg-red-50 text-on-surface-variant hover:text-red-500 rounded transition-colors cursor-pointer"
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">Report Change</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Entity Type *</label>
                  <select
                    value={newChange.entityType}
                    onChange={e => setNewChange({ ...newChange, entityType: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Service">Service</option>
                    <option value="Driver">Driver</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Project">Project</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Rapportino">Rapportino</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Entity ID *</label>
                  <input
                    type="text"
                    value={newChange.entityId}
                    onChange={e => setNewChange({ ...newChange, entityId: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="e.g. SVC-12345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Type</label>
                  <select
                    value={newChange.type}
                    onChange={e => setNewChange({ ...newChange, type: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="schedule">Schedule</option>
                    <option value="driver">Driver</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="route">Route</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Priority</label>
                  <select
                    value={newChange.priority}
                    onChange={e => setNewChange({ ...newChange, priority: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Description *</label>
                <textarea
                  value={newChange.description}
                  onChange={e => setNewChange({ ...newChange, description: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
                  rows={3}
                  placeholder="What changed?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newChange.dueDate}
                    onChange={e => setNewChange({ ...newChange, dueDate: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
                  <input
                    type="text"
                    value={newChange.notes}
                    onChange={e => setNewChange({ ...newChange, notes: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isSaving || !newChange.description.trim() || !newChange.entityId.trim()}
                className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">Resolve Change</h3>
              <button onClick={() => setResolveTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-[13px] text-on-surface">{resolveTarget.description}</p>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Resolution Notes</label>
                <textarea
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
                  rows={2}
                  placeholder="How was it resolved?"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant">
              <button
                onClick={() => setResolveTarget(null)}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                className="px-4 py-1.5 bg-emerald-500 text-white text-[12px] font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
