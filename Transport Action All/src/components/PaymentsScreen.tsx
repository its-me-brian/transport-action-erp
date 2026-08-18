import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Search, 
  Calendar, 
  Loader2, 
  X, 
  Save, 
  CheckCircle,
  Clock,
  CreditCard,
  Building,
  Banknote,
  FileCheck,
  Pencil,
  Download,
  FileText
} from 'lucide-react';
import { ScreenId } from '../types';
import { Payment, getPayments, registerPayment, confirmPayment, reconcilePayment, editPayment } from '../services/api';

interface PaymentsScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function PaymentsScreen({ onNavigate }: PaymentsScreenProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    invoiceId: '',
    clientId: '',
    amount: '',
    paymentMethod: 'transfer' as Payment['paymentMethod'],
    paymentDate: '',
    reference: '',
    notes: '',
    cashReceivedBy: '',
    cashDate: '',
    cashReference: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Confirm action
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'confirm' | 'reconcile' } | null>(null);

  // Edit modal (Registrado only)
  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const [editChanges, setEditChanges] = useState({
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
      const filters: any = {};
      if (statusFilter !== 'All') filters.status = statusFilter;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      
      const result = await getPayments(filters);
      if (Array.isArray(result)) {
        // Dedup by ID
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

  // Export to Excel (CSV)
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

  // Export to PDF (browser print)
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
        <td>${safeDate(p.paymentDate)}</td>
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
      alert('Invoice ID and amount are required');
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
      if (result.error) { alert('Error: ' + result.error); return; }
      setNewPayment({ invoiceId: '', clientId: '', amount: '', paymentMethod: 'transfer', paymentDate: '', reference: '', notes: '', cashReceivedBy: '', cashDate: '', cashReference: '' });
      await loadPayments();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
      setShowAddModal(false);
    }
  };

  const handleConfirm = async (paymentId: string) => {
    try {
      const result = await confirmPayment(paymentId);
      if (result.error) { alert('Error: ' + result.error); return; }
      setConfirmAction(null);
      await loadPayments();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleReconcile = async (paymentId: string) => {
    try {
      const result = await reconcilePayment(paymentId);
      if (result.error) { alert('Error: ' + result.error); return; }
      setConfirmAction(null);
      await loadPayments();
    } catch (err: any) {
      alert('Error: ' + err.message);
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
      if (result.error) { alert('Error: ' + result.error); return; }
      setEditTarget(null);
      await loadPayments();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsEditing(false);
    }
  };

  const methodConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    transfer: { icon: Building, label: 'Bank Transfer', color: 'text-blue-600' },
    cash: { icon: Banknote, label: 'Cash', color: 'text-emerald-600' },
    card: { icon: CreditCard, label: 'Card', color: 'text-purple-600' },
    check: { icon: FileCheck, label: 'Check', color: 'text-orange-600' }
  };

  const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    Registrado: { icon: Clock, label: 'Registered', color: 'text-amber-600 bg-amber-50' },
    Confirmado: { icon: CheckCircle, label: 'Confirmed', color: 'text-green-600 bg-green-50' },
    Conciliado: { icon: CheckCircle, label: 'Reconciled', color: 'text-blue-600 bg-blue-50' }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const safeDate = (s: string) => {
    if (!s) return '—';
    try { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('it-IT'); }
    catch { return '—'; }
  };

  const statuses = ['Registrado', 'Confirmado', 'Conciliado'];

  return (
    <div id="payments-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      {/* Header */}
      <header id="payments-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Payments</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filtered.length} payment{filtered.length !== 1 ? 's' : ''} — Total: {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Record Payment</span>
          </button>
        </div>
      </header>

      {/* Filters */}
      <div id="payments-filters" className="flex flex-col gap-2 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="flex flex-col sm:flex-row gap-2 items-center flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
            />
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
            />
            <span className="text-on-surface-variant text-[12px]">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] font-medium rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              {statuses.map(s => (
                <option key={s} value={s}>{statusConfig[s]?.label || s}</option>
              ))}
            </select>
          </div>
          {(searchQuery || statusFilter !== 'All' || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDateFrom(''); setDateTo(''); }}
              className="text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Payments List */}
      <div id="payments-list" className="space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-[13px] text-on-surface-variant">Loading payments...</span>
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
          filtered.map(p => {
            const mc = methodConfig[p.paymentMethod] || methodConfig.transfer;
            const MethodIcon = mc.icon;
            const sc = statusConfig[p.status] || statusConfig.Registrado;
            const StatusIcon = sc.icon;
            return (
              <div
                key={p.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
              >
                {/* Method icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-surface-container`}>
                  <MethodIcon className={`w-4 h-4 ${mc.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-on-surface">Invoice: {p.invoiceId}</span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{p.id}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
                    <span className={mc.color}>{mc.label}</span>
                    {p.clientId && <span>Client: {p.clientId}</span>}
                    {p.reference && <span>Ref: {p.reference}</span>}
                    {p.paymentDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {safeDate(p.paymentDate)}
                      </span>
                    )}
                  </div>
                  {p.notes && <p className="text-[11px] text-on-surface-variant mt-1 truncate">{p.notes}</p>}
                </div>

                {/* Status + Amount + Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {sc.label}
                  </span>
                  <span className="text-[14px] font-bold text-on-surface">{formatCurrency(p.amount)}</span>
                  {p.status === 'Registrado' && (
                    <>
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
                        title="Modifica"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {confirmAction?.id === p.id && confirmAction.action === 'confirm' ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleConfirm(p.id)}
                            className="px-2 py-1 bg-green-500 text-white text-[10px] font-medium rounded hover:bg-green-600 cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmAction(null)}
                            className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-medium rounded cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmAction({ id: p.id, action: 'confirm' })}
                          className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-medium rounded hover:bg-green-100 cursor-pointer"
                        >
                          Confirm
                        </button>
                      )}
                    </>
                  )}
                  {p.status === 'Confirmado' && (
                    confirmAction?.id === p.id && confirmAction.action === 'reconcile' ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleReconcile(p.id)}
                          className="px-2 py-1 bg-blue-500 text-white text-[10px] font-medium rounded hover:bg-blue-600 cursor-pointer"
                        >
                          Reconcile
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-medium rounded cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmAction({ id: p.id, action: 'reconcile' })}
                        className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-medium rounded hover:bg-blue-100 cursor-pointer"
                      >
                        Reconcile
                      </button>
                    )
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
              <h3 className="text-[15px] font-semibold text-on-surface">Record Payment</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Invoice ID *</label>
                <input
                  type="text"
                  value={newPayment.invoiceId}
                  onChange={e => setNewPayment({ ...newPayment, invoiceId: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="e.g. INV-TA-2026-00045"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Amount (EUR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayment.amount}
                    onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Method</label>
                  <select
                    value={newPayment.paymentMethod}
                    onChange={e => setNewPayment({ ...newPayment, paymentMethod: e.target.value as Payment['paymentMethod'] })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="check">Check</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={newPayment.paymentDate}
                    onChange={e => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Reference</label>
                  <input
                    type="text"
                    value={newPayment.reference}
                    onChange={e => setNewPayment({ ...newPayment, reference: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
                <textarea
                  value={newPayment.notes}
                  onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
                  rows={2}
                  placeholder="Optional notes"
                />
              </div>

              {/* Cash tracking fields — only show when method is cash */}
              {newPayment.paymentMethod === 'cash' && (
                <div className="space-y-3 p-3 bg-surface-container rounded-lg border border-outline-variant">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wide font-medium">Cash Payment Details</span>
                  <div>
                    <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Received By</label>
                    <input
                      type="text"
                      value={newPayment.cashReceivedBy}
                      onChange={e => setNewPayment({ ...newPayment, cashReceivedBy: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                      placeholder="Who received the cash"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Cash Date</label>
                      <input
                        type="date"
                        value={newPayment.cashDate}
                        onChange={e => setNewPayment({ ...newPayment, cashDate: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Cash Reference</label>
                      <input
                        type="text"
                        value={newPayment.cashReference}
                        onChange={e => setNewPayment({ ...newPayment, cashReference: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                        placeholder="Receipt #, etc."
                      />
                    </div>
                  </div>
                </div>
              )}
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
                disabled={isSaving || !newPayment.invoiceId.trim() || !newPayment.amount}
                className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal — Registrado only */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <div>
                <h3 className="text-[15px] font-semibold text-on-surface">Modifica Pagamento</h3>
                <p className="text-[11px] text-on-surface-variant font-mono">{editTarget.id}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Amount (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editChanges.Amount}
                    onChange={e => setEditChanges({ ...editChanges, Amount: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Method</label>
                  <select
                    value={editChanges.PaymentMethod}
                    onChange={e => setEditChanges({ ...editChanges, PaymentMethod: e.target.value as Payment['paymentMethod'] })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="check">Check</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={editChanges.PaymentDate}
                  onChange={e => setEditChanges({ ...editChanges, PaymentDate: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Reference</label>
                <input
                  type="text"
                  value={editChanges.Reference}
                  onChange={e => setEditChanges({ ...editChanges, Reference: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
                <textarea
                  value={editChanges.Notes}
                  onChange={e => setEditChanges({ ...editChanges, Notes: e.target.value })}
                  rows={2}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant">
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isEditing}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50"
              >
                {isEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
