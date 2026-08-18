import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Loader2,
  X,
  Save,
  Trash2,
  Pencil,
  CheckCircle,
  PauseCircle
} from 'lucide-react';
import { ScreenId } from '../types';
import {
  ClientDTO,
  getClients,
  createClient,
  updateClient,
  deleteClient
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ClientScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function ClientScreen({ onNavigate }: ClientScreenProps) {
  const { token } = useAuth();
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit modal
  const [editClient, setEditClient] = useState<Partial<ClientDTO> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const result = await getClients();
      if (Array.isArray(result)) {
        setClients(result);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = clients.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) ||
           (c.vat && c.vat.toLowerCase().includes(q)) ||
           (c.email && c.email.toLowerCase().includes(q)) ||
           (c.phone && c.phone.includes(q));
  });

  const handleSave = async () => {
    if (!editClient?.name?.trim()) { alert('Name is required'); return; }
    setIsSaving(true);
    try {
      if (isNew) {
        const result = await createClient({
          name: editClient.name,
          type: editClient.type,
          vat: editClient.vat,
          address: editClient.address,
          phone: editClient.phone,
          email: editClient.email,
          paymentTerms: editClient.paymentTerms,
          notes: editClient.notes
        });
        if (result.error) { alert(result.error); return; }
      } else if (editClient.id) {
        const result = await updateClient(editClient.id, {
          Name: editClient.name,
          Type: editClient.type,
          VAT: editClient.vat,
          Address: editClient.address,
          Phone: editClient.phone,
          Email: editClient.email,
          PaymentTerms: editClient.paymentTerms,
          Notes: editClient.notes,
          Active: editClient.active
        });
        if (result.error) { alert(result.error); return; }
      }
      setEditClient(null);
      await loadClients();
    } catch (err: any) {
      alert(err.message || 'Error saving client');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteClient(id);
      if (result.error) { alert(result.error); return; }
      setDeleteConfirm(null);
      await loadClients();
    } catch (err: any) {
      alert(err.message || 'Error deleting client');
    }
  };

  const handleToggleActive = async (client: ClientDTO) => {
    try {
      await updateClient(client.id, { Active: !client.active });
      await loadClients();
    } catch (err: any) {
      alert(err.message || 'Error toggling client status');
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3">
      {/* Header */}
      <header id="client-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Customers</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filtered.length} client{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditClient({ name: '', type: 'direct', vat: '', address: '', phone: '', email: '', paymentTerms: 30, notes: '', active: true }); setIsNew(true); }}
          className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Client</span>
        </button>
      </header>

      {/* Filters */}
      <div id="client-filters" className="px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
          />
        </div>
      </div>

      {/* Clients List */}
      <div id="clients-list" className="space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-[13px] text-on-surface-variant">Loading clients...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Building2 className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery ? 'No clients match your search' : 'No clients yet'}
            </span>
          </div>
        ) : (
          filtered.map(c => (
            <div
              key={c.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-surface-dim/30"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-on-surface">{c.name}</span>
                  {c.vat && <span className="text-[10px] text-on-surface-variant font-mono">VAT: {c.vat}</span>}
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                  {c.type && c.type !== 'direct' && (
                    <span className="text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">{c.type}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant flex-wrap">
                  {c.phone && <span>{c.phone}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.address && <span className="hidden sm:inline">{c.address}</span>}
                  {c.paymentTerms && <span>Net {c.paymentTerms}d</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggleActive(c)}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${c.active ? 'hover:bg-amber-50 text-on-surface-variant hover:text-amber-600' : 'hover:bg-green-50 text-on-surface-variant hover:text-green-600'}`}
                  title={c.active ? 'Deactivate' : 'Activate'}
                >
                  {c.active ? <PauseCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setEditClient(c); setIsNew(false); }}
                  className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {deleteConfirm === c.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(c.id)} className="px-2 py-1 bg-red-500 text-white text-[10px] font-medium rounded hover:bg-red-600 cursor-pointer">Yes</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-medium rounded cursor-pointer">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-red-500 rounded transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">{isNew ? 'Add Client' : 'Edit Client'}</h3>
              <button onClick={() => setEditClient(null)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Name *</label>
                <input type="text" value={editClient.name || ''} onChange={e => setEditClient({ ...editClient, name: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Type</label>
                  <select value={editClient.type || 'direct'} onChange={e => setEditClient({ ...editClient, type: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
                    <option value="direct">Direct</option>
                    <option value="agency">Agency</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">VAT</label>
                  <input type="text" value={editClient.vat || ''} onChange={e => setEditClient({ ...editClient, vat: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Address</label>
                <input type="text" value={editClient.address || ''} onChange={e => setEditClient({ ...editClient, address: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Phone</label>
                  <input type="text" value={editClient.phone || ''} onChange={e => setEditClient({ ...editClient, phone: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Email</label>
                  <input type="email" value={editClient.email || ''} onChange={e => setEditClient({ ...editClient, email: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Payment Terms (days)</label>
                <input type="number" value={editClient.paymentTerms ?? 30} onChange={e => setEditClient({ ...editClient, paymentTerms: parseInt(e.target.value) || 30 })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
                <textarea value={editClient.notes || ''} onChange={e => setEditClient({ ...editClient, notes: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none" rows={2} />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-outline-variant">
              <button onClick={() => setEditClient(null)}
                className="px-4 py-2 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isNew ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
