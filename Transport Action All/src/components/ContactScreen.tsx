import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Loader2, X, Save, Edit3, Phone, Mail, MessageCircle } from 'lucide-react';
import { ScreenId } from '../types';
import { getContacts, createContact, updateContact, getClients, ContactDTO } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorUtils';

interface Props { onNavigate: (screen: ScreenId) => void; }

const fmtDate = (d: string) => { if (!d) return '-'; try { return new Date(d).toLocaleDateString('it-IT'); } catch { return d; } };

const ContactCardItem = React.memo(function ContactCardItem({ c, clients, onEdit }: {
  c: ContactDTO;
  clients: { id: string; name: string }[];
  onEdit: (c: ContactDTO) => void;
}) {
  return (
    <div key={c.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-on-surface">{c.name}</span>
          {c.role && <span className="text-[10px] text-on-surface-variant uppercase bg-surface-container px-1.5 py-0.5 rounded">{c.role}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant flex-wrap">
          {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
          {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
          {c.whatsapp && <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{c.whatsapp}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-on-surface-variant">Client: {clients.find(cl => cl.id === c.clientId)?.name || c.clientId}</span>
        <button onClick={() => onEdit(c)} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer" title="Edit">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

export default function ContactScreen({ onNavigate }: Props) {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<ContactDTO[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ContactDTO | null>(null);
  const [form, setForm] = useState({ clientId: '', name: '', role: '', phone: '', email: '', whatsapp: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [c, cl] = await Promise.all([getContacts(), getClients()]);
      setContacts(c);
      setClients(Array.isArray(cl) ? cl : []);
    } finally { setIsLoading(false); }
  };

  const filtered = contacts.filter(c => {
    const matchSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.role.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    const matchClient = !clientFilter || c.clientId === clientFilter;
    return matchSearch && matchClient;
  });

  const handleCreate = async () => {
    if (!form.clientId || !form.name.trim()) { showToast('Client and Name are required', 'warning'); return; }
    setIsSaving(true);
    try {
      const r = await createContact(form);
      if (r.error) { showToast(r.error, 'error'); return; }
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsSaving(false); setShowCreateModal(false); }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      const r = await updateContact(editTarget.id, form);
      if (r.error) { showToast(r.error, 'error'); return; }
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsSaving(false); setEditTarget(null); }
  };

  const openEdit = (c: ContactDTO) => {
    setForm({ clientId: c.clientId, name: c.name, role: c.role, phone: c.phone, email: c.email, whatsapp: c.whatsapp, notes: c.notes });
    setEditTarget(c);
  };

  const ContactForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Client *</label>
        <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}
          className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
          <option value="">Select client...</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Name *</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Role</label>
          <input type="text" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="e.g. Production Manager" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Phone</label>
          <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">WhatsApp</label>
          <input type="text" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
          className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none" rows={2} />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button onClick={() => { setShowCreateModal(false); setEditTarget(null); }} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
        <button onClick={onSubmit} disabled={isSaving || !form.clientId || !form.name.trim()}
          className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {submitLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Contacts</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setForm({ clientId: '', name: '', role: '', phone: '', email: '', whatsapp: '', notes: '' }); setShowCreateModal(true); }}
          className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Contact</span>
        </button>
      </header>

      <div className="flex flex-col sm:flex-row gap-2 px-1">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input type="text" placeholder="Search contacts..." aria-label="Search contacts" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary text-on-surface" />
        </div>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-[12px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 bg-surface-container-highest rounded w-28 animate-pulse" />
                    <div className="h-3 bg-surface-container-highest rounded w-14 animate-pulse" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-2.5 bg-surface-container-highest rounded w-20 animate-pulse" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-28 animate-pulse" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-24 animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="h-2.5 bg-surface-container-highest rounded w-16 animate-pulse" />
                  <div className="h-7 bg-surface-container-highest rounded w-7 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Users className="w-10 h-10 text-outline" /><span className="text-[13px] text-on-surface-variant">No contacts found</span>
          </div>
        ) : filtered.map(c => (
          <ContactCardItem
            key={c.id}
            c={c}
            clients={clients}
            onEdit={openEdit}
          />
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">New Contact</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0"><ContactForm onSubmit={handleCreate} submitLabel="Save" /></div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">Edit Contact — {editTarget.name}</h3>
              <button onClick={() => setEditTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0"><ContactForm onSubmit={handleEdit} submitLabel="Update" /></div>
          </div>
        </div>
      )}
    </div>
  );
}
