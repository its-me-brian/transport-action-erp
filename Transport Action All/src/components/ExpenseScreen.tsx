import React from 'react';
import {
  Receipt,
  Plus,
  Search,
  Download,
  FileText,
  Edit3,
} from 'lucide-react';
import { ScreenId } from '../types';
import { useExpenses } from '../hooks/useExpenses';
import { STATUS_CONFIG, fmt, getTransitions } from '../utils/expenseHelpers';
import { CreateExpenseModal, EditExpenseModal, ConfirmActionModal } from './ExpenseModals';

interface Props {
  onNavigate: (screen: ScreenId) => void;
}

const ExpenseCardItem = React.memo(function ExpenseCardItem({ exp, onConfirm, onEdit }: {
  exp: any;
  onConfirm: (expense: any, action: string) => void;
  onEdit: (expense: any) => void;
}) {
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
          <span>{fmt(exp.expenseDate)}</span>
          {exp.projectId && <><span>·</span><span>Project: {exp.projectId}</span></>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[14px] font-bold text-on-surface">{fmt(exp.amount)}</span>
        {transitions.map(t => {
          const TIcon = t.icon;
          return (
            <button key={t.action} onClick={() => onConfirm(exp, t.action)}
              aria-label={t.label}
              className={`p-1.5 rounded cursor-pointer ${t.color}`} title={t.label}>
              <TIcon className="w-3.5 h-3.5" />
            </button>
          );
        })}
        {exp.status === 'Draft' && (
          <button onClick={() => onEdit(exp)}
            aria-label="Edit expense"
            className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer" title="Edit">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

export default function ExpenseScreen({ onNavigate }: Props) {
  const {
    isLoading,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    filtered,
    totals,
    showCreateModal, setShowCreateModal,
    newExp, setNewExp,
    isCreating,
    editTarget, setEditTarget,
    editChanges, setEditChanges,
    isEditing,
    confirmTarget, setConfirmTarget,
    isProcessing,
    exportToExcel,
    exportToPDF,
    handleCreate,
    handleEdit,
    handleConfirm,
  } = useExpenses();

  return (
    <div className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
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
            aria-label="Export to Excel"
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer">
            <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={exportToPDF}
            aria-label="Export to PDF"
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer">
            <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => setShowCreateModal(true)}
            aria-label="Add expense"
            className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Expense</span>
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 px-1">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input type="text" placeholder="Search expenses..." aria-label="Search expenses" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
        ) : filtered.map(exp => (
          <ExpenseCardItem
            key={exp.id}
            exp={exp}
            onConfirm={(expense, action) => setConfirmTarget({ expense, action })}
            onEdit={(expense) => { setEditTarget(expense); setEditChanges({ description: expense.description, amount: expense.amount, category: expense.category, expenseDate: expense.expenseDate || '', notes: expense.notes || '' }); }}
          />
        ))}
      </div>

      {/* Modals */}
      <CreateExpenseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
        newExp={newExp}
        setNewExp={setNewExp}
        isCreating={isCreating}
      />

      <EditExpenseModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEdit}
        editTarget={editTarget}
        editChanges={editChanges}
        setEditChanges={setEditChanges}
        isEditing={isEditing}
      />

      <ConfirmActionModal
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        confirmTarget={confirmTarget}
        isProcessing={isProcessing}
      />
    </div>
  );
}
