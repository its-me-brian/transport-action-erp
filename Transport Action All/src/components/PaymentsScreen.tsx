import React, { useState, useEffect } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { ScreenId } from '../types';
import { Payment, getPayments, registerPayment, confirmPayment, reconcilePayment, editPayment } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import PaymentHeader from './PaymentHeader';
import PaymentFilters from './PaymentFilters';
import PaymentCard from './PaymentCard';
import PaymentAddModal, { NewPayment, EMPTY_NEW_PAYMENT } from './PaymentAddModal';
import PaymentEditModal, { EditChanges } from './PaymentEditModal';
import { methodConfig, formatCurrency } from './paymentsShared';
import { Skeleton, SkeletonAvatar } from './ui/Skeleton';

interface PaymentsScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function PaymentsScreen({ onNavigate }: PaymentsScreenProps) {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newPayment, setNewPayment] = useState<NewPayment>(EMPTY_NEW_PAYMENT);
  const [isSaving, setIsSaving] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'confirm' | 'reconcile' } | null>(null);

  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const [editChanges, setEditChanges] = useState<EditChanges>({
    Amount: '',
    PaymentMethod: '' as Payment['paymentMethod'],
    PaymentDate: '',
    Reference: '',
    Notes: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [statusFilter, dateFrom, dateTo]);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (statusFilter !== 'All') filters.status = statusFilter;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      
      const result = await getPayments(filters);
      if (Array.isArray(result)) {
        const seen = new Set<string>();
        const unique = result.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setPayments(unique);
      }
    } catch (err) {
      console.error('Error loading payments:', err);
      showToast('Error al cargar pagos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = payments.filter(p => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.invoiceId.toLowerCase().includes(q) || 
             p.clientId.toLowerCase().includes(q) ||
             p.id.toLowerCase().includes(q) ||
             p.notes.toLowerCase().includes(q) ||
             p.reference.toLowerCase().includes(q);
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const exportToExcel = () => {
    const headers = ['PaymentID', 'InvoiceID', 'ClientID', 'Amount', 'Method', 'Date', 'Reference', 'Status', 'Notes'];
    const rows = filtered.map(p => [
      p.id,
      p.invoiceId,
      p.clientId,
      p.amount || 0,
      p.paymentMethod,
      p.paymentDate || '',
      p.reference || '',
      p.status,
      (p.notes || '').replace(/\n/g, ' ')
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const rows = filtered.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.invoiceId}</td>
        <td>${p.clientId}</td>
        <td>${formatCurrency(p.amount || 0)}</td>
        <td>${methodConfig[p.paymentMethod]?.label || p.paymentMethod}</td>
        <td>${formatCurrency(p.amount || 0)}</td>
        <td>${p.reference || '—'}</td>
        <td><span class="status-${p.status?.toLowerCase()}">${p.status}</span></td>
        <td>${(p.notes || '').substring(0, 50)}</td>
      </tr>
    `).join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payments Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1a1a2e; font-size: 24px; margin-bottom: 5px; }
          .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #1a1a2e; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
          td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          tr:nth-child(even) { background: #f9fafb; }
          .status-registrado { color: #d97706; font-weight: 600; }
          .status-confirmado { color: #059669; font-weight: 600; }
          .status-conciliado { color: #2563eb; font-weight: 600; }
          .footer { margin-top: 20px; font-size: 11px; color: #9ca3af; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Payments Report</h1>
        <p class="subtitle">Generated: ${new Date().toLocaleDateString('it-IT')} | Total: ${filtered.length} payments | Amount: ${formatCurrency(totalAmount)}</p>
        <table>
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Invoice</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="footer">Transport Action ERP — Payments Report</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCreate = async () => {
    if (!newPayment.invoiceId.trim() || !newPayment.amount) {
      showToast('Invoice ID and amount are required', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const result = await registerPayment(newPayment.invoiceId.trim(), {
        amount: parseFloat(newPayment.amount) || 0,
        paymentMethod: newPayment.paymentMethod,
        paymentDate: newPayment.paymentDate || new Date().toISOString().split('T')[0],
        reference: newPayment.reference,
        notes: newPayment.notes,
        cashReceivedBy: newPayment.cashReceivedBy,
        cashDate: newPayment.cashDate,
        cashReference: newPayment.cashReference
      });
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setNewPayment(EMPTY_NEW_PAYMENT);
      await loadPayments();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
      setShowAddModal(false);
    }
  };

  const handleConfirm = async (paymentId: string) => {
    try {
      const result = await confirmPayment(paymentId);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setConfirmAction(null);
      await loadPayments();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleReconcile = async (paymentId: string) => {
    try {
      const result = await reconcilePayment(paymentId);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setConfirmAction(null);
      await loadPayments();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const openEdit = (p: Payment) => {
    setEditTarget(p);
    setEditChanges({
      Amount: String(p.amount || ''),
      PaymentMethod: p.paymentMethod,
      PaymentDate: p.paymentDate || '',
      Reference: p.reference || '',
      Notes: p.notes || '',
    });
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setIsEditing(true);
    try {
      const changes: Record<string, any> = {};
      const newAmt = parseFloat(editChanges.Amount) || 0;
      if (newAmt !== Number(editTarget.amount)) changes.Amount = newAmt;
      if (editChanges.PaymentMethod !== editTarget.paymentMethod) changes.PaymentMethod = editChanges.PaymentMethod;
      if (editChanges.PaymentDate !== (editTarget.paymentDate || '')) changes.PaymentDate = editChanges.PaymentDate;
      if (editChanges.Reference !== (editTarget.reference || '')) changes.Reference = editChanges.Reference;
      if (editChanges.Notes !== (editTarget.notes || '')) changes.Notes = editChanges.Notes;

      if (Object.keys(changes).length === 0) { setEditTarget(null); return; }

      const result = await editPayment(editTarget.id, changes);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setEditTarget(null);
      await loadPayments();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const hasActiveFilters = !!(searchQuery || statusFilter !== 'All' || dateFrom || dateTo);

  return (
    <div id="payments-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
      <PaymentHeader
        filteredCount={filtered.length}
        totalAmount={totalAmount}
        onExportExcel={exportToExcel}
        onExportPDF={exportToPDF}
        onOpenAddModal={() => setShowAddModal(true)}
      />

      <PaymentFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onClear={() => { setSearchQuery(''); setStatusFilter('All'); setDateFrom(''); setDateTo(''); }}
        hasActiveFilters={hasActiveFilters}
      />

      <div id="payments-list" className="space-y-2">
        {isLoading ? (
          <div className="space-y-2" role="status">
            <span className="sr-only">Loading...</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3">
                <SkeletonAvatar size="sm" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <DollarSign className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery ? 'No payments match your search' : 'No payments recorded yet'}
            </span>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 flex items-center gap-1.5 text-[12px] text-primary hover:text-primary-hover font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Record your first payment
              </button>
            )}
          </div>
        ) : (
          filtered.map(p => (
            <PaymentCard
              key={p.id}
              payment={p}
              methodConfig={methodConfig}
              onEdit={openEdit}
              confirmAction={confirmAction}
              onSetConfirmAction={setConfirmAction}
              onConfirm={handleConfirm}
              onReconcile={handleReconcile}
            />
          ))
        )}
      </div>

      {showAddModal && (
        <PaymentAddModal
          onClose={() => setShowAddModal(false)}
          onSave={handleCreate}
          saving={isSaving}
          newPayment={newPayment}
          onChange={setNewPayment}
        />
      )}

      {editTarget && (
        <PaymentEditModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
          saving={isEditing}
          changes={editChanges}
          onChange={setEditChanges}
        />
      )}
    </div>
  );
}
