import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  Loader2,
  X,
  Save,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { ScreenId } from '../types';
import {
  getDriverAdvances,
  createDriverAdvance,
  updateDriverAdvance,
  getDrivers,
  DriverAdvanceDTO,
  DriverRecord
} from '../services/api';

interface Props {
  onNavigate: (screen: ScreenId) => void;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Pendiente: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pendiente' },
  Descontado: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Descontado' },
};

const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
const fmtDate = (d: string) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('it-IT'); } catch { return d; }
};

export default function DriverAdvanceScreen({ onNavigate }: Props) {
  const [advances, setAdvances] = useState<DriverAdvanceDTO[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAdvance, setNewAdvance] = useState({
    driverId: '',
    projectId: '',
    amount: '',
    notes: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [advancesData, driversData] = await Promise.all([
        getDriverAdvances(),
        getDrivers()
      ]);
      setAdvances(advancesData);
      setDrivers(driversData);
    } catch (err) {
      console.error('Error loading advances:', err);
    } finally { setIsLoading(false); }
  };

  const filtered = advances.filter(a => {
    const driver = drivers.find(d => d.id === a.driverId);
    const driverName = driver?.name?.toLowerCase() || '';
    const matchSearch = !searchQuery ||
      a.driverId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driverName.includes(searchQuery.toLowerCase()) ||
      a.projectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totals = {
    pending: filtered.filter(a => a.status === 'Pendiente').reduce((s, a) => s + a.remainingAmount, 0),
    deducted: filtered.filter(a => a.status === 'Descontado').reduce((s, a) => s + a.amount, 0),
  };

  const handleCreate = async () => {
    if (!newAdvance.driverId || !newAdvance.amount || parseFloat(newAdvance.amount) <= 0) {
      alert('Driver and amount (> 0) are required');
      return;
    }
    setIsCreating(true);
    try {
      const r = await createDriverAdvance({
        driverId: newAdvance.driverId,
        projectId: newAdvance.projectId || undefined,
        amount: parseFloat(newAdvance.amount) || 0,
        notes: newAdvance.notes || undefined,
      });
      if (r.error) { alert(r.error); return; }
      setNewAdvance({ driverId: '', projectId: '', amount: '', notes: '' });
      await loadData();
    } catch (err: any) { alert(err.message); } finally { setIsCreating(false); setShowCreateModal(false); }
  };

  return (
    <div className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Driver Advances</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filtered.length} advance{filtered.length !== 1 ? 's' : ''} — Pending: {fmt(totals.pending)}
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">New Advance</span>
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 px-1">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input type="text" placeholder="Search advances..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary text-on-surface" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] font-medium rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer">
          <option value="All">All statuses</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Descontado">Descontado</option>
        </select>
      </div>

      {/* Advances List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-[13px] text-on-surface-variant">Loading advances...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Wallet className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery ? 'No advances match your search' : 'No advances recorded yet'}
            </span>
            {!searchQuery && (
              <button onClick={() => setShowCreateModal(true)}
                className="mt-2 flex items-center gap-1.5 text-[12px] text-primary hover:text-primary-hover font-medium cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Record your first advance
              </button>
            )}
          </div>
        ) : (
          filtered.map(a => {
            const driver = drivers.find(d => d.id === a.driverId);
            const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.Pendiente;
            const StatusIcon = sc.icon;
            return (
              <div key={a.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30">
                {/* Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
                  <StatusIcon className={`w-4 h-4 ${sc.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-on-surface">{driver?.name || a.driverId}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.color} ${sc.bg}`}>
                      <StatusIcon className="w-3 h-3" />
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
                    {a.projectId && <span>Project: {a.projectId}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {fmtDate(a.date)}
                    </span>
                    {a.deductedIn && <span>Deducted in: {a.deductedIn}</span>}
                  </div>
                  {a.notes && <p className="text-[11px] text-on-surface-variant mt-1 truncate">{a.notes}</p>}
                </div>

                {/* Amounts */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-[14px] font-bold text-on-surface">{fmt(a.amount)}</div>
                    {a.status === 'Pendiente' && a.remainingAmount < a.amount && (
                      <div className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Remaining: {fmt(a.remainingAmount)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">New Driver Advance</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Driver *</label>
                <select value={newAdvance.driverId} onChange={e => setNewAdvance({ ...newAdvance, driverId: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary">
                  <option value="">Select driver...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Project (optional)</label>
                <input type="text" value={newAdvance.projectId} onChange={e => setNewAdvance({ ...newAdvance, projectId: e.target.value })}
                  placeholder="PRJ-2026-00001"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Amount *</label>
                <input type="number" step="0.01" min="0" value={newAdvance.amount} onChange={e => setNewAdvance({ ...newAdvance, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
                <input type="text" value={newAdvance.notes} onChange={e => setNewAdvance({ ...newAdvance, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-outline-variant">
              <button onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-[12px] text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={isCreating}
                className="px-4 py-2 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Create Advance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
