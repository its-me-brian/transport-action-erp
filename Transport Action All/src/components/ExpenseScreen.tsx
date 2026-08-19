import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  Loader2,
  X,
  Save,
  CheckCircle,
  Clock,
  Ban,
  Trash2,
  Edit3,
  Filter,
  Download,
  FileText
} from 'lucide-react';
import { ScreenId } from '../types';
import {
  getExpenses,
  createExpense,
  editExpense,
  confirmExpense,
  cancelExpense,
  correctExpense,
  ExpenseDTO
} from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorUtils';

interface Props {
  onNavigate: (screen: ScreenId) => void;
}

// ─── State machine per docs/04-STATE_MACHINES.md ──────────────────────────────
// Draft → Confirmed (inmutable)
// Draft → Cancelled
// Confirmed → Cancelled

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Draft:     { icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50',    label: 'Draft' },
  Confirmed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50',  label: 'Confirmed' },
  Cancelled: { icon: Ban,         color: 'text-gray-400',    bg: 'bg-gray-50',     label: 'Cancelled' },
};

const OWNER_TYPES = ['empresa', 'proyecto', 'vehiculo', 'servicio', 'conductor'];
const CATEGORIES = ['fuel', 'maintenance', 'insurance', 'tolls', 'parking', 'rent', 'utilities', 'salaries', 'software', 'office', 'travel', 'other'];

const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
const fmtDate = (d: string) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('it-IT'); } catch { return d; }
};

export default function ExpenseScreen({ onNavigate }: Props) {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExp, setNewExp] = useState({
    ownerType: 'empresa',
    ownerId: '',
    category: 'other',
    description: '',
    amount: '',
    expenseDate: '',
    accountingDate: '',
    projectId: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<ExpenseDTO | null>(null);
  const [editChanges, setEditChanges] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Delete/confirm/cancel confirmation
  const [confirmTarget, setConfirmTarget] = useState<{ expense: ExpenseDTO; action: 'confirm' | 'cancel' | 'correct' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } finally { setIsLoading(false); }
  };

  const filtered = expenses.filter(e => {
    const matchSearch = !searchQuery ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Export to Excel (CSV)
  const exportToExcel = () => {
    const headers = ['ExpenseID', 'Description', 'Category', 'OwnerType', 'OwnerID', 'Amount', 'ExpenseDate', 'AccountingDate', 'ProjectID', 'Status'];
    const rows = filtered.map(e => [
      e.id,
      e.description,
      e.category,
      e.ownerType,
      e.ownerId || '',
      e.amount || 0,
      e.expenseDate || '',
      e.accountingDate || '',
      e.projectId || '',
      e.status
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Expenses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Export to PDF (browser print)
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = filtered.map(e => `
      <tr>
        <td>${e.id}</td>
        <td>${e.description}</td>
        <td>${e.category}</td>
        <td>${e.ownerType}${e.ownerId ? ` #${e.ownerId}` : ''}</td>
        <td>${fmt(e.amount)}</td>
        <td>${fmtDate(e.expenseDate)}</td>
        <td>${fmtDate(e.accountingDate)}</td>
        <td>${e.projectId || '—'}</td>
        <td><span class="status-${e.status?.toLowerCase()}">${e.status}</span></td>
      </tr>
    `).join('');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expenses Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1a1a2e; font-size: 24px; margin-bottom: 5px; }
          .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #1a1a2e; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
          td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          tr:nth-child(even) { background: #f9fafb; }
          .status-draft { color: #d97706; font-weight: 600; }
          .status-confirmed { color: #059669; font-weight: 600; }
          .status-cancelled { color: #dc2626; font-weight: 600; }
          .footer { margin-top: 20px; font-size: 11px; color: #9ca3af; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Expenses Report</h1>
        <p class="subtitle">Generated: ${new Date().toLocaleDateString('it-IT')} | Total: ${filtered.length} expenses | Confirmed: ${fmt(totals.confirmed)}</p>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Category</th>
              <th>Owner</th>
              <th>Amount</th>
              <th>Expense Date</th>
              <th>Accounting Date</th>
              <th>Project</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="footer">Transport Action ERP — Expenses Report</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const totals = {
    draft: filtered.filter(e => e.status === 'Draft').reduce((s, e) => s + e.amount, 0),
    confirmed: filtered.filter(e => e.status === 'Confirmed').reduce((s, e) => s + e.amount, 0),
    cancelled: filtered.filter(e => e.status === 'Cancelled').reduce((s, e) => s + e.amount, 0),
  };

  // ─── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newExp.description.trim() || !newExp.amount || parseFloat(newExp.amount) <= 0) {
      showToast('Description and amount (> 0) are required', 'warning');
      return;
    }
    setIsCreating(true);
    try {
      const r = await createExpense('session', {
        ownerType: newExp.ownerType,
        ownerId: newExp.ownerId,
        category: newExp.category,
        description: newExp.description,
        amount: parseFloat(newExp.amount) || 0,
        expenseDate: newExp.expenseDate || new Date().toISOString(),
        accountingDate: newExp.accountingDate || undefined,
        projectId: newExp.projectId || undefined,
      });
      if (r.error) { showToast(r.error, 'error'); return; }
      setNewExp({ ownerType: 'empresa', ownerId: '', category: 'other', description: '', amount: '', expenseDate: '', accountingDate: '', projectId: '' });
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsCreating(false); setShowCreateModal(false); }
  };

  // ─── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = async () => {
    if (!editTarget) return;
    setIsEditing(true);
    try {
      const r = await editExpense('session', editTarget.id, editChanges);
      if (r.error) { showToast(r.error, 'error'); return; }
      setEditChanges({});
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsEditing(false); setEditTarget(null); }
  };

  // ─── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setIsProcessing(true);
    try {
      let r;
      if (confirmTarget.action === 'confirm') {
        r = await confirmExpense('session', confirmTarget.expense.id);
      } else if (confirmTarget.action === 'cancel') {
        r = await cancelExpense('session', confirmTarget.expense.id);
      } else if (confirmTarget.action === 'correct') {
        r = await correctExpense(confirmTarget.expense.id);
      }
      if (r.error) { showToast(r.error, 'error'); return; }
      setConfirmTarget(null);
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsProcessing(false); }
  };

  // ─── Available transitions per state machine ────────────────────────────────
  const getTransitions = (status: string) => {
    switch (status) {
      case 'Draft':
        return [
          { action: 'confirm' as const, label: 'Confirm', icon: CheckCircle, color: 'text-emerald-600 hover:bg-emerald-50' },
          { action: 'cancel' as const, label: 'Cancel', icon: Ban, color: 'text-red-500 hover:bg-red-50' },
        ];
      case 'Confirmed':
        return [
          { action: 'correct' as const, label: 'Correct', icon: Edit3, color: 'text-amber-600 hover:bg-amber-50' },
          { action: 'cancel' as const, label: 'Cancel', icon: Ban, color: 'text-red-500 hover:bg-red-50' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Expenses</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filtered.length} expense{filtered.length !== 1 ? 's' : ''} — Confirmed: {fmt(totals.confirmed)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportToExcel}
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer">
            <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={exportToPDF}
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer">
            <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Expense</span>
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 px-1">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input type="text" placeholder="Search expenses..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary text-on-surface" />
        </div>
        <div className="flex gap-1">
          {['All', 'Draft', 'Confirmed', 'Cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                statusFilter === s ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <p className="text-[11px] text-amber-700 uppercase">Draft</p>
          <p className="text-[16px] font-bold text-amber-800">{fmt(totals.draft)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <p className="text-[11px] text-emerald-700 uppercase">Confirmed</p>
          <p className="text-[16px] font-bold text-emerald-800">{fmt(totals.confirmed)}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-[11px] text-gray-500 uppercase">Cancelled</p>
          <p className="text-[16px] font-bold text-gray-600">{fmt(totals.cancelled)}</p>
        </div>
      </div>

      {/* Expense list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 bg-surface-container-highest rounded w-14 animate-pulse" />
                    <div className="h-3.5 bg-surface-container-highest rounded w-32 animate-pulse" />
                    <div className="h-3 bg-surface-container-highest rounded w-16 animate-pulse" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-2.5 bg-surface-container-highest rounded w-24 animate-pulse" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-20 animate-pulse" />
                  </div>
                </div>
                <div className="h-4 bg-surface-container-highest rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Receipt className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">No expenses found</span>
          </div>
        ) : filtered.map(exp => {
          const cfg = STATUS_CONFIG[exp.status] || STATUS_CONFIG.Draft;
          const Icon = cfg.icon;
          const transitions = getTransitions(exp.status);
          return (
            <div key={exp.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                    <Icon className="w-3 h-3" />{cfg.label}
                  </span>
                  <span className="text-[13px] font-semibold text-on-surface">{exp.description}</span>
                  <span className="text-[10px] text-on-surface-variant uppercase bg-surface-container px-1.5 py-0.5 rounded">{exp.category}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
                  <span>{exp.ownerType}{exp.ownerId ? ` #${exp.ownerId}` : ''}</span>
                  <span>·</span>
                  <span>{fmtDate(exp.expenseDate)}</span>
                  {exp.projectId && <><span>·</span><span>Project: {exp.projectId}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[14px] font-bold text-on-surface">{fmt(exp.amount)}</span>
                {transitions.map(t => {
                  const TIcon = t.icon;
                  return (
                    <button key={t.action} onClick={() => setConfirmTarget({ expense: exp, action: t.action })}
                      className={`p-1.5 rounded cursor-pointer ${t.color}`} title={t.label}>
                      <TIcon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
                {exp.status === 'Draft' && (
                  <button onClick={() => { setEditTarget(exp); setEditChanges({ description: exp.description, amount: exp.amount, category: exp.category }); }}
                    className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer" title="Edit">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Create Modal ───────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">New Expense</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Description *</label>
                <input type="text" value={newExp.description} onChange={e => setNewExp({ ...newExp, description: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="e.g. Fuel for vehicle..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Amount (EUR) *</label>
                  <input type="number" step="0.01" min="0.01" value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Category</label>
                  <select value={newExp.category} onChange={e => setNewExp({ ...newExp, category: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Owner Type</label>
                  <select value={newExp.ownerType} onChange={e => setNewExp({ ...newExp, ownerType: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
                    {OWNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Owner ID</label>
                  <input type="text" value={newExp.ownerId} onChange={e => setNewExp({ ...newExp, ownerId: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Expense Date</label>
                  <input type="date" value={newExp.expenseDate} onChange={e => setNewExp({ ...newExp, expenseDate: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Accounting Date</label>
                  <input type="date" value={newExp.accountingDate} onChange={e => setNewExp({ ...newExp, accountingDate: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Project ID (optional)</label>
                <input type="text" value={newExp.projectId} onChange={e => setNewExp({ ...newExp, projectId: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="For cross-project analysis" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleCreate} disabled={isCreating || !newExp.description.trim() || !newExp.amount || parseFloat(newExp.amount) <= 0}
                className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Modal ─────────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">Edit Expense — {editTarget.id}</h3>
              <button onClick={() => setEditTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Description</label>
                <input type="text" value={editChanges.description || ''} onChange={e => setEditChanges({ ...editChanges, description: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Amount (EUR)</label>
                  <input type="number" step="0.01" value={editChanges.amount || ''} onChange={e => setEditChanges({ ...editChanges, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Category</label>
                  <select value={editChanges.category || ''} onChange={e => setEditChanges({ ...editChanges, category: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant">
              <button onClick={() => setEditTarget(null)} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleEdit} disabled={isEditing}
                className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                {isEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm/Cancel Modal ───────────────────────────────────────────── */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">
                {confirmTarget.action === 'confirm' ? 'Confirm Expense' : confirmTarget.action === 'correct' ? 'Correct Expense' : 'Cancel Expense'}
              </h3>
              <button onClick={() => setConfirmTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-on-surface">
                {confirmTarget.action === 'confirm'
                  ? `Confirm expense "${confirmTarget.expense.description}" for ${fmt(confirmTarget.expense.amount)}? This action is irreversible.`
                  : confirmTarget.action === 'correct'
                    ? `Correct expense "${confirmTarget.expense.description}"? This will create a new Draft.`
                    : `Cancel expense "${confirmTarget.expense.description}"? This action is irreversible.`}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant">
              <button onClick={() => setConfirmTarget(null)} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Back</button>
              <button onClick={handleConfirm} disabled={isProcessing}
                className={`px-4 py-1.5 text-[12px] font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                  confirmTarget.action === 'confirm'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : confirmTarget.action === 'correct'
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-red-500 text-white hover:bg-red-600'
                }`}>
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (confirmTarget.action === 'confirm' ? <CheckCircle className="w-3.5 h-3.5" /> : confirmTarget.action === 'correct' ? <Edit3 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />)}
                {confirmTarget.action === 'confirm' ? 'Confirm' : confirmTarget.action === 'correct' ? 'Correct' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
