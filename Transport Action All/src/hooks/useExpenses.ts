import { useState, useEffect } from 'react';
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
import { fmt, fmtDate } from '../utils/expenseHelpers';

export function useExpenses() {
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

  const totals = {
    draft: filtered.filter(e => e.status === 'Draft').reduce((s, e) => s + e.amount, 0),
    confirmed: filtered.filter(e => e.status === 'Confirmed').reduce((s, e) => s + e.amount, 0),
    cancelled: filtered.filter(e => e.status === 'Cancelled').reduce((s, e) => s + e.amount, 0),
  };

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

  return {
    expenses,
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
  };
}
