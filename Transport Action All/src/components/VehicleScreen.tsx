import React, { useState, useEffect } from 'react';
import { Car, Plus, Search, Loader2, X, Save, Edit3, AlertTriangle } from 'lucide-react';
import { ScreenId } from '../types';
import { getVehicles, createVehicle, updateVehicle, VehicleDTO, getVehicleTypes } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorUtils';
import { Skeleton } from './ui/Skeleton';

interface Props { onNavigate: (screen: ScreenId) => void; }

const OWNERSHIP_TYPES = ['propio', 'tercero', 'alquiler'];
const STATUSES = ['Disponible', 'En uso', 'Mantenimiento', 'Inactivo'];

const fmtDate = (d: string) => { if (!d) return '-'; try { return new Date(d).toLocaleDateString('it-IT'); } catch { return d; } };

const isExpiringSoon = (d: string) => {
  if (!d) return false;
  const diff = new Date(d).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
};

const VehicleCardItem = React.memo(function VehicleCardItem({ v, onEdit }: {
  v: VehicleDTO;
  onEdit: (v: VehicleDTO) => void;
}) {
  return (
    <div key={v.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-on-surface">{v.plate}</span>
          <span className="text-[10px] text-on-surface-variant uppercase bg-surface-container px-1.5 py-0.5 rounded">{v.type}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${v.status === 'Disponible' ? 'bg-emerald-50 text-emerald-700' : v.status === 'En uso' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{v.status}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
          <span>{v.brand} {v.model}</span>
          <span>·</span>
          <span>{v.ownership}</span>
          {v.capacity > 0 && <><span>·</span><span>{v.capacity} pax</span></>}
          {isExpiringSoon(v.insuranceExpiry) && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" />Insurance expiring</span>}
          {isExpiringSoon(v.inspectionExpiry) && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" />Inspection expiring</span>}
        </div>
      </div>
      <button onClick={() => onEdit(v)} aria-label="Edit vehicle" className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer" title="Edit">
        <Edit3 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

export default function VehicleScreen({ onNavigate }: Props) {
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<VehicleDTO | null>(null);
  const [form, setForm] = useState({ plate: '', brand: '', model: '', type: 'Van', ownership: 'tercero', capacity: '', status: 'Disponible', driverDefault: '', insuranceExpiry: '', inspectionExpiry: '', operatingCompany: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [v, vt] = await Promise.all([getVehicles(), getVehicleTypes()]);
      setVehicles(v);
      setVehicleTypes(vt);
    } finally { setIsLoading(false); }
  };

  const filtered = vehicles.filter(v => {
    const matchSearch = !searchQuery || v.plate.toLowerCase().includes(searchQuery.toLowerCase()) || v.brand.toLowerCase().includes(searchQuery.toLowerCase()) || v.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !statusFilter || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    if (!form.plate.trim()) { showToast('Plate is required', 'warning'); return; }
    setIsSaving(true);
    try {
      const r = await createVehicle({ ...form, capacity: parseInt(form.capacity) || 0 });
      if (r.error) { showToast(r.error, 'error'); return; }
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsSaving(false); setShowCreateModal(false); }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      const changes: Record<string, any> = {};
      if (form.brand !== editTarget.brand) changes.Brand = form.brand;
      if (form.model !== editTarget.model) changes.Model = form.model;
      if (form.type !== editTarget.type) changes.Type = form.type;
      if (form.ownership !== editTarget.ownership) changes.Ownership = form.ownership;
      if (parseInt(form.capacity) !== editTarget.capacity) changes.Capacity = parseInt(form.capacity) || 0;
      if (form.status !== editTarget.status) changes.Status = form.status;
      if (form.driverDefault !== (editTarget.driverDefault || '')) changes.DriverDefault = form.driverDefault;
      if (form.insuranceExpiry !== editTarget.insuranceExpiry) changes.InsuranceExpiry = form.insuranceExpiry;
      if (form.inspectionExpiry !== editTarget.inspectionExpiry) changes.InspectionExpiry = form.inspectionExpiry;
      if (form.operatingCompany !== editTarget.operatingCompany) changes.OperatingCompany = form.operatingCompany;
      if (form.notes !== editTarget.notes) changes.Notes = form.notes;
      const r = await updateVehicle(editTarget.id, changes);
      if (r.error) { showToast(r.error, 'error'); return; }
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsSaving(false); setEditTarget(null); }
  };

  const openEdit = (v: VehicleDTO) => {
    setForm({ plate: v.plate, brand: v.brand, model: v.model, type: v.type, ownership: v.ownership, capacity: String(v.capacity), status: v.status || 'Disponible', driverDefault: v.driverDefault || '', insuranceExpiry: v.insuranceExpiry, inspectionExpiry: v.inspectionExpiry, operatingCompany: v.operatingCompany, notes: v.notes });
    setEditTarget(v);
  };

  const VehicleForm = ({ onSubmit, submitLabel, hideButtons }: { onSubmit: () => void; submitLabel: string; hideButtons?: boolean }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Plate *</label>
          <input type="text" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value.toUpperCase() })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="ABC 123" />
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Type</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
            {vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Brand</label>
          <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Model</label>
          <input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Ownership</label>
          <select value={form.ownership} onChange={e => setForm({ ...form, ownership: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
            {OWNERSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Capacity</label>
          <input type="number" min="0" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Oper. Company</label>
          <input type="text" value={form.operatingCompany} onChange={e => setForm({ ...form, operatingCompany: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Default Driver</label>
          <input type="text" value={form.driverDefault} onChange={e => setForm({ ...form, driverDefault: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="Driver name or ID" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Insurance Expiry</label>
          <input type="date" value={form.insuranceExpiry} onChange={e => setForm({ ...form, insuranceExpiry: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Inspection Expiry</label>
          <input type="date" value={form.inspectionExpiry} onChange={e => setForm({ ...form, inspectionExpiry: e.target.value })}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
          className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none" rows={2} />
      </div>
      {!hideButtons && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={() => { setShowCreateModal(false); setEditTarget(null); }} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
          <button onClick={onSubmit} disabled={isSaving || !form.plate.trim()}
            className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
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
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Vehicles</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">{filtered.length} vehicle{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button         onClick={() => { setForm({ plate: '', brand: '', model: '', type: 'Van', ownership: 'tercero', capacity: '', status: 'Disponible', driverDefault: '', insuranceExpiry: '', inspectionExpiry: '', operatingCompany: '', notes: '' }); setShowCreateModal(true); }}
          aria-label="Add vehicle"
          className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Vehicle</span>
        </button>
      </header>

      <div className="flex flex-col sm:flex-row gap-2 px-1">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input type="text" placeholder="Search vehicles..." aria-label="Search vehicles" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary text-on-surface" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          aria-label="Select status filter"
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-[12px] text-on-surface focus:outline-none focus:border-primary cursor-pointer">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2" role="status">
            <span className="sr-only">Loading...</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-2.5 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
                <Skeleton className="h-6 w-6" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Car className="w-10 h-10 text-outline" /><span className="text-[13px] text-on-surface-variant">No vehicles found</span>
          </div>
        ) : filtered.map(v => (
          <VehicleCardItem
            key={v.id}
            v={v}
            onEdit={openEdit}
          />
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">New Vehicle</h3>
              <button onClick={() => setShowCreateModal(false)} aria-label="Close modal" className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0"><VehicleForm onSubmit={handleCreate} submitLabel="Save" hideButtons /></div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleCreate} disabled={isSaving || !form.plate.trim()}
                className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">Edit Vehicle — {editTarget.plate}</h3>
              <button onClick={() => setEditTarget(null)} aria-label="Close modal" className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0"><VehicleForm onSubmit={handleEdit} submitLabel="Update" hideButtons /></div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button onClick={() => setEditTarget(null)} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleEdit} disabled={isSaving || !form.plate.trim()}
                className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
