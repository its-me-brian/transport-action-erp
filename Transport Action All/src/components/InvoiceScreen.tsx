import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  Loader2, 
  X, 
  Send,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Ban,
  Pencil,
  Save,
  Download
} from 'lucide-react';
import { ScreenId } from '../types';
import { 
  getInvoices,
  getInvoiceItems,
  createInvoice,
  emitInvoice,
  sendInvoice,
  voidInvoice,
  editInvoice,
  InvoiceDTO,
  InvoiceItemDTO,
  getClients,
  getProjects,
  ClientDTO,
  Project
} from '../services/api';
import { exportToCSV, exportToPDF, formatDateExport, formatCurrencyExport } from '../utils/exportUtils';
import { useToast } from '../contexts/ToastContext';

interface InvoiceScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

// ─── State machine per docs/04-STATE_MACHINES.md ──────────────────────────────
// Borrador → Emitida → Enviada → PagoParcial → Pagada
//                             ↘ Vencida ↗
// Borrador → Anulada (sin pagos)
// Emitida → Anulada (sin pagos)

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Borrador:    { icon: FileText,      color: 'text-gray-600',    bg: 'bg-gray-100',    label: 'Borrador' },
  Emitida:     { icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50',    label: 'Emitida' },
  Enviada:     { icon: Send,          color: 'text-blue-600',    bg: 'bg-blue-50',     label: 'Enviada' },
  PagoParcial: { icon: AlertTriangle, color: 'text-orange-600',  bg: 'bg-orange-50',   label: 'Pago Parcial' },
  Pagada:      { icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50',  label: 'Pagada' },
  Vencida:     { icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50',      label: 'Vencida' },
  Anulada:     { icon: Ban,           color: 'text-gray-400',    bg: 'bg-gray-50',     label: 'Anulada' },
};

// Next transitions per state machine
const NEXT_TRANSITIONS: Record<string, { action: string; label: string; target: string } | null> = {
  Borrador:    { action: 'emit',  label: 'Emitir',  target: 'Emitida' },
  Emitida:     { action: 'send',  label: 'Enviar',  target: 'Enviada' },
  Enviada:     null,  // transitions to PagoParcial/Pagada come from payments
  PagoParcial: null,  // transitions to Pagada come from payments
  Pagada:      null,
  Vencida:     null,
  Anulada:     null,
};

export default function InvoiceScreen({ onNavigate }: InvoiceScreenProps) {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterProject, setFilterProject] = useState('');

  // Data for selects
  const [clientsList, setClientsList] = useState<ClientDTO[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  // Detail view
  const [viewTarget, setViewTarget] = useState<InvoiceDTO | null>(null);
  const [viewItems, setViewItems] = useState<InvoiceItemDTO[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ projectId: '', clientId: '', dueDate: '', notes: '' });
  const [isCreating, setIsCreating] = useState(false);

  // Void modal
  const [voidTarget, setVoidTarget] = useState<InvoiceDTO | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Edit modal (Borrador only)
  const [editTarget, setEditTarget] = useState<InvoiceDTO | null>(null);
  const [editChanges, setEditChanges] = useState({ ClientID: '', ProjectID: '', DueDate: '', Notes: '' });
  const [isEditing, setIsEditing] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [statusFilter, dateFrom, dateTo, driverFilter, filterClient, filterProject]);

  useEffect(() => {
    const loadSelectData = async () => {
      try {
        const [clients, projects] = await Promise.all([getClients(), getProjects()]);
        setClientsList(clients || []);
        setProjectsList(projects || []);
      } catch (err) {
        console.error('Error loading select data:', err);
        showToast('Error al cargar datos', 'error');
      }
    };
    loadSelectData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (statusFilter !== 'All') filters.status = statusFilter;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (driverFilter) filters.driverId = driverFilter;
      if (filterClient) filters.clientId = filterClient;
      if (filterProject) filters.projectId = filterProject;
      
      const result = await getInvoices(filters);
      setInvoices(result || []);
    } catch (err) {
      console.error('Error loading invoices:', err);
      showToast('Error al cargar facturas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
    if (filterClient && inv.clientId !== filterClient) return false;
    if (filterProject && inv.projectId !== filterProject) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return inv.id?.toLowerCase().includes(q) || 
             inv.invoiceNumber?.toLowerCase().includes(q) ||
             inv.clientId?.toLowerCase().includes(q) ||
             inv.projectId?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum, inv) => sum + (inv.total || 0), 0);

  const handleCreate = async () => {
    if (!newInvoice.projectId.trim() || !newInvoice.clientId.trim()) {
      showToast('Project and Client are required', 'warning');
      return;
    }
    setIsCreating(true);
    try {
      const result = await createInvoice({
        projectId: newInvoice.projectId.trim(),
        clientId: newInvoice.clientId.trim(),
        dueDate: newInvoice.dueDate || undefined,
        notes: newInvoice.notes.trim() || undefined,
      });
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setNewInvoice({ projectId: '', clientId: '', dueDate: '', notes: '' });
      await loadData();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsCreating(false);
      setShowCreateModal(false);
    }
  };

  const handleStatusUpdate = async (invoice: InvoiceDTO, action: string) => {
    setUpdatingStatus(invoice.id);
    try {
      let result;
      switch (action) {
        case 'emit': result = await emitInvoice(invoice.id); break;
        case 'send': result = await sendInvoice(invoice.id); break;
        default: return;
      }
      if (result?.error) {
        showToast('Error: ' + result.error, 'error');
        return;
      }
      await loadData();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleVoid = async () => {
    if (!voidTarget || !voidReason.trim()) return;
    setIsVoiding(true);
    try {
      const result = await voidInvoice(voidTarget.id, voidReason.trim());
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setVoidTarget(null);
      setVoidReason('');
      await loadData();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsVoiding(false);
    }
  };

  const openEdit = (inv: InvoiceDTO) => {
    setEditTarget(inv);
    setEditChanges({
      ClientID: inv.clientId || '',
      ProjectID: inv.projectId || '',
      DueDate: inv.dueDate || '',
      Notes: inv.notes || '',
    });
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setIsEditing(true);
    try {
      const changes: Record<string, string> = {};
      if (editChanges.ClientID !== (editTarget.clientId || '')) changes.ClientID = editChanges.ClientID;
      if (editChanges.ProjectID !== (editTarget.projectId || '')) changes.ProjectID = editChanges.ProjectID;
      if (editChanges.DueDate !== (editTarget.dueDate || '')) changes.DueDate = editChanges.DueDate;
      if (editChanges.Notes !== (editTarget.notes || '')) changes.Notes = editChanges.Notes;

      if (Object.keys(changes).length === 0) { setEditTarget(null); return; }

      const result = await editInvoice(editTarget.id, changes);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setEditTarget(null);
      await loadData();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const openDetail = async (inv: InvoiceDTO) => {
    setViewTarget(inv);
    setLoadingItems(true);
    try {
      const items = await getInvoiceItems(inv.id);
      setViewItems(items || []);
    } catch {
      setViewItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const canVoid = (status: string) => ['Borrador', 'Emitida', 'Enviada'].includes(status);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const statuses = ['Borrador', 'Emitida', 'Enviada', 'PagoParcial', 'Pagada', 'Vencida', 'Anulada'];

  // Export to Excel (client-side CSV)
  const handleExportExcel = () => {
    const headers = ['InvoiceNumber', 'Date', 'DueDate', 'Client', 'Project', 'Status', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance'];
    const rows = filtered.map(inv => [
      inv.invoiceNumber || '(Borrador)',
      inv.date || '',
      inv.dueDate || '',
      inv.clientId,
      inv.projectId,
      inv.status,
      inv.subtotal || 0,
      inv.taxAmount || 0,
      inv.total || 0,
      (inv.total || 0) - (inv.balance || 0),
      inv.balance || 0
    ]);
    exportToCSV(headers, rows, 'Invoices');
  };

  // Export to PDF (browser print)
  const handleExportPDF = () => {
    const columns = [
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'date', label: 'Date', format: formatDateExport },
      { key: 'dueDate', label: 'Due Date', format: formatDateExport },
      { key: 'clientId', label: 'Client' },
      { key: 'projectId', label: 'Project' },
      { key: 'status', label: 'Status' },
      { key: 'subtotal', label: 'Subtotal', align: 'right' as const, format: formatCurrencyExport },
      { key: 'taxAmount', label: 'Tax', align: 'right' as const, format: formatCurrencyExport },
      { key: 'total', label: 'Total', align: 'right' as const, format: formatCurrencyExport },
      { key: 'paid', label: 'Paid', align: 'right' as const, format: (v: any) => formatCurrencyExport(v) },
      { key: 'balance', label: 'Balance', align: 'right' as const, format: formatCurrencyExport },
    ];
    const data = filtered.map(inv => ({
      invoiceNumber: inv.invoiceNumber || '(Borrador)',
      date: inv.date,
      dueDate: inv.dueDate,
      clientId: inv.clientId,
      projectId: inv.projectId,
      status: inv.status,
      subtotal: inv.subtotal || 0,
      taxAmount: inv.taxAmount || 0,
      total: inv.total || 0,
      paid: (inv.total || 0) - (inv.balance || 0),
      balance: inv.balance || 0,
    }));
    exportToPDF('Invoices Report', columns, data, {
      subtitle: `Total: ${filtered.length} invoices | Amount: ${formatCurrencyExport(totalAmount)}`,
      footer: 'Transport Action ERP — Invoices Report',
    });
  };

  return (
    <div id="invoice-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      {/* Header */}
      <header id="invoice-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Invoices</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''} — Total: {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Invoice</span>
          </button>
        </div>
      </header>

      {/* Filters */}
      <div id="invoice-filters" className="flex flex-col gap-2 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="flex-1 sm:flex-none bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
              />
              <span className="hidden sm:inline text-on-surface-variant text-[12px] self-center">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="flex-1 sm:flex-none bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              <input
                type="text"
                placeholder="Driver ID..."
                value={driverFilter}
                onChange={e => setDriverFilter(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 w-full sm:w-32 focus:outline-none focus:border-primary shrink-0"
              />
              <select
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer shrink-0"
              >
                <option value="">All Clients</option>
                {clientsList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer shrink-0"
              >
                <option value="">All Projects</option>
                {projectsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] font-medium rounded-lg px-2 py-1.5 focus:border-primary outline-none cursor-pointer shrink-0"
              >
                <option value="All">All Status</option>
                {statuses.map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                ))}
              </select>
            </div>
          </div>
          {(searchQuery || statusFilter !== 'All' || dateFrom || dateTo || driverFilter || filterClient || filterProject) && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDateFrom(''); setDateTo(''); setDriverFilter(''); setFilterClient(''); setFilterProject(''); }}
              className="text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer self-start"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Invoices List */}
      <div id="invoices-list" className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 bg-surface-container-highest rounded w-14 animate-pulse" />
                    <div className="h-3.5 bg-surface-container-highest rounded w-20 animate-pulse" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-16 animate-pulse" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-2.5 bg-surface-container-highest rounded w-24 animate-pulse" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-20 animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="h-7 bg-surface-container-highest rounded w-7 animate-pulse" />
                  <div className="h-7 bg-surface-container-highest rounded w-7 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <FileText className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery || statusFilter !== 'All' ? 'No invoices match your filters' : 'No invoices yet'}
            </span>
            <p className="text-[11px] text-on-surface-variant">
              Create invoices manually or generate from Rapportinos
            </p>
          </div>
        ) : (
          filtered.map(inv => {
            const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.Borrador;
            const StatusIcon = sc.icon;
            const next = NEXT_TRANSITIONS[inv.status];
            return (
              <div
                key={inv.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
              >
                {/* Status icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
                  <StatusIcon className={`w-4 h-4 ${sc.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${sc.bg} ${sc.color}`}>
                      {sc.label}
                    </span>
                    {inv.invoiceNumber && (
                      <span className="text-[12px] font-semibold text-on-surface font-mono">{inv.invoiceNumber}</span>
                    )}
                    <span className="text-[10px] text-on-surface-variant font-mono">{inv.id}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[12px] text-on-surface-variant">
                    <span className="font-medium">{inv.clientId}</span>
                    {inv.projectId && <span>{inv.projectId}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
                    {inv.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(inv.date)}
                      </span>
                    )}
                    {inv.dueDate && <span>Due: {formatDate(inv.dueDate)}</span>}
                  </div>
                </div>

                {/* Amount + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[14px] font-bold text-on-surface">{formatCurrency(inv.total)}</span>
                  
                  {next && (
                    <button
                      onClick={() => handleStatusUpdate(inv, next.action)}
                      disabled={updatingStatus === inv.id}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-medium rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {updatingStatus === inv.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      {next.label}
                    </button>
                  )}

                  {canVoid(inv.status) && (
                    <>
                      {inv.status === 'Borrador' && (
                        <button
                          onClick={() => openEdit(inv)}
                          className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
                          title="Modifica"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setVoidTarget(inv)}
                        className="p-1.5 hover:bg-red-50 text-on-surface-variant hover:text-red-500 rounded transition-colors cursor-pointer"
                        title="Annulla"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => openDetail(inv)}
                    className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <div>
                <h3 className="text-[15px] font-semibold text-on-surface">Invoice Detail</h3>
                <p className="text-[11px] text-on-surface-variant">{viewTarget.invoiceNumber || viewTarget.id}</p>
              </div>
              <button onClick={() => { setViewTarget(null); setViewItems([]); }} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Status</span>
                  <p className={`font-medium ${STATUS_CONFIG[viewTarget.status]?.color || 'text-on-surface'}`}>
                    {STATUS_CONFIG[viewTarget.status]?.label || viewTarget.status}
                  </p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Invoice Number</span>
                  <p className="font-medium text-on-surface font-mono">{viewTarget.invoiceNumber || '—'}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Client</span>
                  <p className="font-medium text-on-surface">{viewTarget.clientId || '—'}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Project</span>
                  <p className="font-medium text-on-surface">{viewTarget.projectId || '—'}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Date</span>
                  <p className="font-medium text-on-surface">{formatDate(viewTarget.date)}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Due Date</span>
                  <p className="font-medium text-on-surface">{formatDate(viewTarget.dueDate)}</p>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-surface-dim rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span className="text-on-surface">{formatCurrency(viewTarget.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-on-surface-variant">Tax ({viewTarget.taxRate}%)</span>
                  <span className="text-on-surface">{formatCurrency(viewTarget.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-[13px] font-semibold border-t border-outline-variant pt-1.5">
                  <span className="text-on-surface">Total</span>
                  <span className="text-on-surface">{formatCurrency(viewTarget.total)}</span>
                </div>
              </div>

              {/* Invoice Items */}
              {loadingItems ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
              ) : viewItems.length > 0 && (
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Items ({viewItems.length})</span>
                  <div className="mt-1 space-y-1">
                    {viewItems.map(item => (
                      <div key={item.id} className="flex justify-between text-[11px] bg-surface-dim rounded px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-on-surface-variant font-mono">{item.rapportinoClientId}</span>
                          {item.serviceId && <span className="text-on-surface-variant/60 font-mono">→ {item.serviceId}</span>}
                        </div>
                        <span className="text-on-surface font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewTarget.voidReason && (
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Void Reason</span>
                  <p className="text-[12px] text-red-600 mt-1">{viewTarget.voidReason}</p>
                </div>
              )}

              {viewTarget.notes && (
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Notes</span>
                  <p className="text-[12px] text-on-surface mt-1">{viewTarget.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button
                onClick={() => { setViewTarget(null); setViewItems([]); }}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">New Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Project ID *</label>
                <input
                  type="text"
                  value={newInvoice.projectId}
                  onChange={e => setNewInvoice({ ...newInvoice, projectId: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="PRJ-2026-00001"
                />
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Client ID *</label>
                <input
                  type="text"
                  value={newInvoice.clientId}
                  onChange={e => setNewInvoice({ ...newInvoice, clientId: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="CLI-2026-00001"
                />
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Due Date</label>
                <input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
                <textarea
                  value={newInvoice.notes}
                  onChange={e => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-sm shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">Annulla Factura</h3>
              <button onClick={() => { setVoidTarget(null); setVoidReason(''); }} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <p className="text-[12px] text-on-surface-variant">
                Stai per annullare la factura <span className="font-mono font-medium text-on-surface">{voidTarget.invoiceNumber || voidTarget.id}</span>.
                Questa azione non può essere annullata.
              </p>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Motivo *</label>
                <textarea
                  value={voidReason}
                  onChange={e => setVoidReason(e.target.value)}
                  rows={2}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
                  placeholder="Motivo dell'annullamento..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button
                onClick={() => { setVoidTarget(null); setVoidReason(''); }}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleVoid}
                disabled={isVoiding || !voidReason.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 text-white text-[12px] font-medium rounded-lg hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isVoiding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal — Borrador only */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <div>
                <h3 className="text-[15px] font-semibold text-on-surface">Modifica Fattura</h3>
                <p className="text-[11px] text-on-surface-variant">{editTarget.invoiceNumber || editTarget.id}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Client ID</label>
                <input
                  type="text"
                  value={editChanges.ClientID}
                  onChange={e => setEditChanges({ ...editChanges, ClientID: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Project ID</label>
                <input
                  type="text"
                  value={editChanges.ProjectID}
                  onChange={e => setEditChanges({ ...editChanges, ProjectID: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Due Date</label>
                <input
                  type="date"
                  value={editChanges.DueDate}
                  onChange={e => setEditChanges({ ...editChanges, DueDate: e.target.value })}
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

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
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
