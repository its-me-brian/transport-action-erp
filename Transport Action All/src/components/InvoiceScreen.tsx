import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
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
import { STATUS_CONFIG, STATUSES, formatCurrency } from './invoiceShared';
import InvoiceListItem from './InvoiceListItem';
import InvoiceDetailModal from './InvoiceDetailModal';
import InvoiceCreateModal from './InvoiceCreateModal';
import InvoiceVoidModal from './InvoiceVoidModal';
import InvoiceEditModal from './InvoiceEditModal';

interface InvoiceScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

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

  const [clientsList, setClientsList] = useState<ClientDTO[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  const [viewTarget, setViewTarget] = useState<InvoiceDTO | null>(null);
  const [viewItems, setViewItems] = useState<InvoiceItemDTO[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ projectId: '', clientId: '', dueDate: '', notes: '' });
  const [isCreating, setIsCreating] = useState(false);

  const [voidTarget, setVoidTarget] = useState<InvoiceDTO | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const [editTarget, setEditTarget] = useState<InvoiceDTO | null>(null);
  const [editChanges, setEditChanges] = useState({ ClientID: '', ProjectID: '', DueDate: '', Notes: '' });
  const [isEditing, setIsEditing] = useState(false);

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
                {STATUSES.map(s => (
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
          filtered.map(inv => (
            <InvoiceListItem
              key={inv.id}
              inv={inv}
              updatingStatus={updatingStatus}
              onStatusUpdate={handleStatusUpdate}
              onEdit={openEdit}
              onVoid={setVoidTarget}
              onView={openDetail}
            />
          ))
        )}
      </div>

      {viewTarget && (
        <InvoiceDetailModal
          viewTarget={viewTarget}
          viewItems={viewItems}
          loadingItems={loadingItems}
          onClose={() => { setViewTarget(null); setViewItems([]); }}
        />
      )}

      {showCreateModal && (
        <InvoiceCreateModal
          newInvoice={newInvoice}
          onChange={setNewInvoice}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          isCreating={isCreating}
        />
      )}

      {voidTarget && (
        <InvoiceVoidModal
          voidTarget={voidTarget}
          voidReason={voidReason}
          onReasonChange={setVoidReason}
          onClose={() => { setVoidTarget(null); setVoidReason(''); }}
          onConfirm={handleVoid}
          isVoiding={isVoiding}
        />
      )}

      {editTarget && (
        <InvoiceEditModal
          editTarget={editTarget}
          editChanges={editChanges}
          onChange={setEditChanges}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
          isEditing={isEditing}
        />
      )}
    </div>
  );
}
