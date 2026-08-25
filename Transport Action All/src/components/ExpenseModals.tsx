import React from 'react';
import {
  X,
  Save,
  Loader2,
  CheckCircle,
  Edit3,
  Ban,
} from 'lucide-react';
import { ExpenseDTO } from '../services/api';
import { CATEGORIES, OWNER_TYPES, fmt } from '../utils/expenseHelpers';

// ─── Create Modal ──────────────────────────────────────────────────────────

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  newExp: {
    ownerType: string;
    ownerId: string;
    category: string;
    description: string;
    amount: string;
    expenseDate: string;
    accountingDate: string;
    projectId: string;
  };
  setNewExp: (exp: CreateExpenseModalProps['newExp']) => void;
  isCreating: boolean;
}

export function CreateExpenseModal({ isOpen, onClose, onSave, newExp, setNewExp, isCreating }: CreateExpenseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <h3 className="text-[15px] font-semibold text-on-surface">New Expense</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
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
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
          <button onClick={onSave} disabled={isCreating || !newExp.description.trim() || !newExp.amount || parseFloat(newExp.amount) <= 0}
            className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
            {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editTarget: ExpenseDTO | null;
  editChanges: Record<string, any>;
  setEditChanges: (changes: Record<string, any>) => void;
  isEditing: boolean;
}

export function EditExpenseModal({ isOpen, onClose, onSave, editTarget, editChanges, setEditChanges, isEditing }: EditExpenseModalProps) {
  if (!isOpen || !editTarget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <h3 className="text-[15px] font-semibold text-on-surface">Edit Expense — {editTarget.id}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
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
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Expense Date</label>
            <input type="date" value={editChanges.expenseDate || ''} onChange={e => setEditChanges({ ...editChanges, expenseDate: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
            <textarea value={editChanges.notes || ''} onChange={e => setEditChanges({ ...editChanges, notes: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none" rows={2} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
          <button onClick={onSave} disabled={isEditing}
            className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
            {isEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm/Cancel/Correct Modal ─────────────────────────────────────────────

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmTarget: { expense: ExpenseDTO; action: 'confirm' | 'cancel' | 'correct' } | null;
  isProcessing: boolean;
}

export function ConfirmActionModal({ isOpen, onClose, onConfirm, confirmTarget, isProcessing }: ConfirmActionModalProps) {
  if (!isOpen || !confirmTarget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-sm shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <h3 className="text-[15px] font-semibold text-on-surface">
            {confirmTarget.action === 'confirm' ? 'Confirm Expense' : confirmTarget.action === 'correct' ? 'Correct Expense' : 'Cancel Expense'}
          </h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
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
          <button onClick={onClose} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Back</button>
          <button onClick={onConfirm} disabled={isProcessing}
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
  );
}
