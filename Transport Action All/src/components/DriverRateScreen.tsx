import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Search, Loader2, X, Save, Edit3 } from 'lucide-react';
import { ScreenId } from '../types';
import { getDriverRates, createDriverRate, updateDriverRate, getDrivers, DriverRateDTO } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorUtils';

interface Props { onNavigate: (screen: ScreenId) => void; }

const VEHICLE_TYPES = ['Transfer', 'Dispo', 'HalfDay', 'FullDay'];
const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

export default function DriverRateScreen({ onNavigate }: Props) {
  const { showToast } = useToast();
  const [rates, setRates] = useState<DriverRateDTO[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<DriverRateDTO | null>(null);
  const [form, setForm] = useState({ driverId: '', vehicleType: 'Transfer', transferRate: '', halfDayRate: '', fullDayRate: '', nightExtra: '', holidayExtra: '', waitHourRate: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [r, d] = await Promise.all([getDriverRates(), getDrivers()]);
      setRates(r);
      setDrivers(Array.isArray(d) ? d : []);
    } finally { setIsLoading(false); }
  };

  const filtered = rates.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const driverName = drivers.find(d => d.id === r.driverId)?.name || '';
    return driverName.toLowerCase().includes(q) || r.vehicleType.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    if (!form.driverId) { showToast('Driver is required', 'warning'); return; }
    setIsSaving(true);
    try {
      const r = await createDriverRate({
        driverId: form.driverId, vehicleType: form.vehicleType,
        transferRate: parseFloat(form.transferRate) || 0, halfDayRate: parseFloat(form.halfDayRate) || 0,
        fullDayRate: parseFloat(form.fullDayRate) || 0, nightExtra: parseFloat(form.nightExtra) || 0,
        holidayExtra: parseFloat(form.holidayExtra) || 0, waitHourRate: parseFloat(form.waitHourRate) || 0,
      });
      if (r.error) { showToast(r.error, 'error'); return; }
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsSaving(false); setShowCreateModal(false); }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      const r = await updateDriverRate(editTarget.id, {
        VehicleType: form.vehicleType, TransferRate: parseFloat(form.transferRate) || 0,
        HalfDayRate: parseFloat(form.halfDayRate) || 0, FullDayRate: parseFloat(form.fullDayRate) || 0,
        NightExtra: parseFloat(form.nightExtra) || 0, HolidayExtra: parseFloat(form.holidayExtra) || 0,
        WaitHourRate: parseFloat(form.waitHourRate) || 0,
      });
      if (r.error) { showToast(r.error, 'error'); return; }
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsSaving(false); setEditTarget(null); }
  };

  const openEdit = (r: DriverRateDTO) => {
    setForm({ driverId: r.driverId, vehicleType: r.vehicleType, transferRate: String(r.transferRate), halfDayRate: String(r.halfDayRate), fullDayRate: String(r.fullDayRate), nightExtra: String(r.nightExtra), holidayExtra: String(r.holidayExtra), waitHourRate: String(r.waitHourRate) });
    setEditTarget(r);
  };

  const RateForm = ({ onSubmit, submitLabel, hideButtons }: { onSubmit: () => void; submitLabel: string; hideButtons?: boolean }) => (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Driver *</label>
        <select value={form.driverId} onChange={e => setForm({ ...form, driverId: e.target.value })}
          className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
          <option value="">Select driver...</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Vehicle Type</label>
        <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}
          className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
          {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Transfer (EUR)</label><input type="number" step="0.01" value={form.transferRate} onChange={e => setForm({ ...form, transferRate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Half Day (EUR)</label><input type="number" step="0.01" value={form.halfDayRate} onChange={e => setForm({ ...form, halfDayRate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Full Day (EUR)</label><input type="number" step="0.01" value={form.fullDayRate} onChange={e => setForm({ ...form, fullDayRate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Night Extra (EUR)</label><input type="number" step="0.01" value={form.nightExtra} onChange={e => setForm({ ...form, nightExtra: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Holiday Extra (EUR)</label><input type="number" step="0.01" value={form.holidayExtra} onChange={e => setForm({ ...form, holidayExtra: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
        <div><label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Wait Hour (EUR)</label><input type="number" step="0.01" value={form.waitHourRate} onChange={e => setForm({ ...form, waitHourRate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" /></div>
      </div>
      {!hideButtons && (
      <div className="flex items-center justify-end gap-2 pt-2">
        <button onClick={() => { setShowCreateModal(false); setEditTarget(null); }} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
        <button onClick={onSubmit} disabled={isSaving || !form.driverId} className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {submitLabel}
        </button>
      </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Driver Rates</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">{filtered.length} rate{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setForm({ driverId: '', vehicleType: 'Transfer', transferRate: '', halfDayRate: '', fullDayRate: '', nightExtra: '', holidayExtra: '', waitHourRate: '' }); setShowCreateModal(true); }}
          className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Rate</span>
        </button>
      </header>

      <div className="relative w-full sm:w-64 px-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
        <input type="text" placeholder="Search rates..." aria-label="Search rates" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary text-on-surface" />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 bg-surface-container-highest rounded w-28 animate-pulse" />
                    <div className="h-3 bg-surface-container-highest rounded w-20 animate-pulse" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-2.5 bg-surface-container-highest rounded w-24 animate-pulse" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-16 animate-pulse" />
                  </div>
                </div>
                <div className="h-4 bg-surface-container-highest rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <DollarSign className="w-10 h-10 text-outline" /><span className="text-[13px] text-on-surface-variant">No rates found</span>
          </div>
        ) : filtered.map(r => (
          <div key={r.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-on-surface">{drivers.find(d => d.id === r.driverId)?.name || r.driverId}</span>
                <span className="text-[10px] text-on-surface-variant uppercase bg-surface-container px-1.5 py-0.5 rounded">{r.vehicleType}</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-[11px] text-on-surface-variant flex-wrap">
                <span>Transfer: {fmt(r.transferRate)}</span>
                <span>HalfDay: {fmt(r.halfDayRate)}</span>
                <span>FullDay: {fmt(r.fullDayRate)}</span>
                {r.nightExtra > 0 && <span>Night: +{fmt(r.nightExtra)}</span>}
                {r.holidayExtra > 0 && <span>Holiday: +{fmt(r.holidayExtra)}</span>}
              </div>
            </div>
            <button onClick={() => openEdit(r)} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer" title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">New Driver Rate</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0"><RateForm onSubmit={handleCreate} submitLabel="Save" hideButtons /></div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleCreate} disabled={isSaving || !form.driverId} className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">Edit Rate — {drivers.find(d => d.id === editTarget.driverId)?.name}</h3>
              <button onClick={() => setEditTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0"><RateForm onSubmit={handleEdit} submitLabel="Update" hideButtons /></div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button onClick={() => setEditTarget(null)} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleEdit} disabled={isSaving || !form.driverId} className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
