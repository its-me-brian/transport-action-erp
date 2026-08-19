import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, Loader2, X, Save, Edit3 } from 'lucide-react';
import { ScreenId } from '../types';
import { getRateCards, createRateCard, updateRateCard, getClients, RateCardDTO } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorUtils';

interface Props { onNavigate: (screen: ScreenId) => void; }

const VEHICLE_TYPES = ['Van', 'Minivan', 'Sedan', 'SUV', 'Bus', 'Coach'];
const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

export default function RateCardScreen({ onNavigate }: Props) {
  const { showToast } = useToast();
  const [cards, setCards] = useState<RateCardDTO[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<RateCardDTO | null>(null);
  const [form, setForm] = useState({ name: '', category: '', vehicleType: 'Van', basePrice: '', extraKmRate: '', extraHourRate: '', waitRate: '', nightFee: '', holidayFee: '', halfDayPrice: '', fullDayPrice: '', airportSurcharge: '', clientId: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [c, cl] = await Promise.all([getRateCards(), getClients()]);
      setCards(c);
      setClients(Array.isArray(cl) ? cl : []);
    } finally { setIsLoading(false); }
  };

  const filtered = cards.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.vehicleType.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'warning'); return; }
    setIsSaving(true);
    try {
      const r = await createRateCard({
        name: form.name, category: form.category, vehicleType: form.vehicleType,
        basePrice: parseFloat(form.basePrice) || 0, clientId: form.clientId || undefined,
      });
      if (r.error) { showToast(r.error, 'error'); return; }
      await loadCards();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsSaving(false); setShowCreateModal(false); }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      const r = await updateRateCard(editTarget.id, {
        Name: form.name, Category: form.category, VehicleType: form.vehicleType,
        BasePrice: parseFloat(form.basePrice) || 0, ExtraKmRate: parseFloat(form.extraKmRate) || 0,
        ExtraHourRate: parseFloat(form.extraHourRate) || 0, WaitRate: parseFloat(form.waitRate) || 0,
        NightFee: parseFloat(form.nightFee) || 0, HolidayFee: parseFloat(form.holidayFee) || 0,
        HalfDayPrice: parseFloat(form.halfDayPrice) || 0, FullDayPrice: parseFloat(form.fullDayPrice) || 0,
        AirportSurcharge: parseFloat(form.airportSurcharge) || 0, Notes: form.notes,
      });
      if (r.error) { showToast(r.error, 'error'); return; }
      await loadCards();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsSaving(false); setEditTarget(null); }
  };

  const openEdit = (c: RateCardDTO) => {
    setForm({ name: c.name, category: c.category, vehicleType: c.vehicleType, basePrice: String(c.basePrice), extraKmRate: String(c.extraKmRate), extraHourRate: String(c.extraHourRate), waitRate: String(c.waitRate), nightFee: String(c.nightFee), holidayFee: String(c.holidayFee), halfDayPrice: String(c.halfDayPrice), fullDayPrice: String(c.fullDayPrice), airportSurcharge: String(c.airportSurcharge), clientId: c.clientId, notes: c.notes });
    setEditTarget(c);
  };

  const CardForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Vehicle Type</label><select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">{VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Category</label><input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="e.g. Airport Transfer" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Client</label><select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"><option value="">Global</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Base Price (EUR)</label><input type="number" step="0.01" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Half Day (EUR)</label><input type="number" step="0.01" value={form.halfDayPrice} onChange={e => setForm({ ...form, halfDayPrice: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Full Day (EUR)</label><input type="number" step="0.01" value={form.fullDayPrice} onChange={e => setForm({ ...form, fullDayPrice: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Extra Km (EUR)</label><input type="number" step="0.01" value={form.extraKmRate} onChange={e => setForm({ ...form, extraKmRate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Extra Hour (EUR)</label><input type="number" step="0.01" value={form.extraHourRate} onChange={e => setForm({ ...form, extraHourRate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Night Fee (EUR)</label><input type="number" step="0.01" value={form.nightFee} onChange={e => setForm({ ...form, nightFee: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Holiday (EUR)</label><input type="number" step="0.01" value={form.holidayFee} onChange={e => setForm({ ...form, holidayFee: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button onClick={() => { setShowCreateModal(false); setEditTarget(null); }} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
        <button onClick={onSubmit} disabled={isSaving || !form.name.trim()} className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {submitLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Rate Cards</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">{filtered.length} card{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setForm({ name: '', category: '', vehicleType: 'Van', basePrice: '', extraKmRate: '', extraHourRate: '', waitRate: '', nightFee: '', holidayFee: '', halfDayPrice: '', fullDayPrice: '', airportSurcharge: '', clientId: '', notes: '' }); setShowCreateModal(true); }}
          className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Card</span>
        </button>
      </header>

      <div className="relative w-full sm:w-64 px-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
        <input type="text" placeholder="Search rate cards..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary text-on-surface" />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2"><div className="h-4 w-24 bg-surface-dim rounded" /><div className="h-5 w-12 bg-surface-dim rounded" /></div>
                  <div className="flex gap-4"><div className="h-3 w-16 bg-surface-dim rounded" /><div className="h-3 w-20 bg-surface-dim rounded" /><div className="h-3 w-16 bg-surface-dim rounded" /></div>
                </div>
                <div className="h-7 w-7 bg-surface-dim rounded shrink-0" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <CreditCard className="w-10 h-10 text-outline" /><span className="text-[13px] text-on-surface-variant">No rate cards found</span>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-on-surface">{c.name}</span>
                <span className="text-[10px] text-on-surface-variant uppercase bg-surface-container px-1.5 py-0.5 rounded">{c.vehicleType}</span>
                {c.clientId && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{clients.find(cl => cl.id === c.clientId)?.name || c.clientId}</span>}
              </div>
              <div className="flex items-center gap-4 mt-1 text-[11px] text-on-surface-variant">
                <span>Base: {fmt(c.basePrice)}</span>
                {c.halfDayPrice > 0 && <span>HalfDay: {fmt(c.halfDayPrice)}</span>}
                {c.fullDayPrice > 0 && <span>FullDay: {fmt(c.fullDayPrice)}</span>}
                {c.extraKmRate > 0 && <span>ExtraKm: {fmt(c.extraKmRate)}</span>}
              </div>
            </div>
            <button onClick={() => openEdit(c)} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer" title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">New Rate Card</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4"><CardForm onSubmit={handleCreate} submitLabel="Save" /></div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-[15px] font-semibold text-on-surface">Edit Rate Card — {editTarget.name}</h3>
              <button onClick={() => setEditTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4"><CardForm onSubmit={handleEdit} submitLabel="Update" /></div>
          </div>
        </div>
      )}
    </div>
  );
}
