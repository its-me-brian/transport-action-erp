import React, { useState, useEffect } from 'react';
import { 
  Users, 
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
  CollaboratorDTO,
  getCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  getSupplierRates,
  SupplierRateDTO,
  createSupplierRate,
  updateSupplierRate,
  deleteSupplierRate,
  getVehicleTypes,
  getServiceTypes
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface CollaboratorScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function CollaboratorScreen({ onNavigate }: CollaboratorScreenProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [collaborators, setCollaborators] = useState<CollaboratorDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit modal
  const [editCollaborator, setEditCollaborator] = useState<Partial<CollaboratorDTO> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Rate detail modal
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorDTO | null>(null);
  const [rates, setRates] = useState<SupplierRateDTO[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [editRate, setEditRate] = useState<Partial<SupplierRateDTO> | null>(null);
  const [isNewRate, setIsNewRate] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Vehicle Types & Service Types (admin-configurable)
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  useEffect(() => {
    loadCollaborators();
    getVehicleTypes().then(vt => setVehicleTypes(vt)).catch(() => {});
    getServiceTypes().then(st => setServiceTypes(st)).catch(() => {});
  }, []);

  const loadCollaborators = async () => {
    setIsLoading(true);
    try {
      const result = await getCollaborators();
      if (Array.isArray(result)) {
        setCollaborators(result);
      }
    } catch (err) {
      console.error('Error loading collaborators:', err);
      showToast('Error al cargar colaboradores', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRates = async (collaboratorId: string) => {
    setLoadingRates(true);
    try {
      const result = await getSupplierRates({ supplierType: 'collaborator', supplierId: collaboratorId });
      if (Array.isArray(result)) {
        setRates(result);
      }
    } catch (err) {
      console.error('Error loading rates:', err);
      showToast('Error al cargar tarifas', 'error');
    } finally {
      setLoadingRates(false);
    }
  };

  const filtered = collaborators.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || 
             c.vat.toLowerCase().includes(q) ||
             c.id.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSave = async () => {
    if (!editCollaborator?.name?.trim()) {
      showToast('Name is required', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      if (isNew) {
        const result = await createCollaborator({
          name: editCollaborator.name!.trim(),
          vat: editCollaborator.vat || '',
          address: editCollaborator.address || '',
          phone: editCollaborator.phone || '',
          email: editCollaborator.email || '',
          paymentTerms: editCollaborator.paymentTerms || 30,
          notes: editCollaborator.notes || '',
          active: editCollaborator.active !== false,
          operatingCompany: editCollaborator.operatingCompany || ''
        });
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      } else {
        const result = await updateCollaborator(editCollaborator.id!, editCollaborator);
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      }
      setEditCollaborator(null);
      await loadCollaborators();
    } catch (err) {
      showToast('Error: ' + (err.message || err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteCollaborator(id);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setDeleteConfirm(null);
      await loadCollaborators();
    } catch (err) {
      showToast('Error: ' + (err.message || err), 'error');
    }
  };

  const handleOpenRates = async (collaborator: CollaboratorDTO) => {
    setSelectedCollaborator(collaborator);
    await loadRates(collaborator.id);
  };

  const handleSaveRate = async () => {
    if (!editRate) return;
    setIsSaving(true);
    try {
      if (isNewRate) {
        const result = await createSupplierRate({
          supplierType: 'collaborator',
          supplierId: selectedCollaborator!.id,
          projectId: editRate.projectId || '',
          serviceType: editRate.serviceType || 'Dispo',
          vehicleType: editRate.vehicleType || 'Van',
          baseRate: editRate.baseRate || 0,
          includedKm: editRate.includedKm || 0,
          includedHours: editRate.includedHours || 0,
          extraKmRate: editRate.extraKmRate || 0,
          extraHourRate: editRate.extraHourRate || 0,
          diariaPiena: editRate.diariaPiena || 0,
          diariaMezza: editRate.diariaMezza || 0,
          nightExtra: editRate.nightExtra || 0,
          holidayExtra: editRate.holidayExtra || 0,
          waitHourRate: editRate.waitHourRate || 0,
          validFrom: editRate.validFrom || '',
          validTo: editRate.validTo || '',
          operatingCompany: editRate.operatingCompany || ''
        });
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      } else {
        const result = await updateSupplierRate(editRate.id!, editRate);
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      }
      setEditRate(null);
      await loadRates(selectedCollaborator!.id);
    } catch (err) {
      showToast('Error: ' + (err.message || err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    try {
      const result = await deleteSupplierRate(rateId);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      await loadRates(selectedCollaborator!.id);
    } catch (err) {
      showToast('Error: ' + (err.message || err), 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div id="collaborator-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      {/* Header */}
      <header id="collaborator-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Providers</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filtered.length} collaborator{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditCollaborator({ name: '', vat: '', address: '', phone: '', email: '', paymentTerms: 30, notes: '', operatingCompany: '', active: true }); setIsNew(true); }}
          className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Provider</span>
        </button>
      </header>

      {/* Filters */}
      <div id="collaborator-filters" className="px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            placeholder="Search providers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
          />
        </div>
      </div>

      {/* Collaborators List */}
      <div id="collaborators-list" className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 bg-surface-container-highest rounded w-24 animate-pulse" />
                    <div className="h-3 bg-surface-container-highest rounded w-16 animate-pulse" />
                    <div className="h-3 bg-surface-container-highest rounded w-12 animate-pulse" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-2.5 bg-surface-container-highest rounded w-20 animate-pulse" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-28 animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="h-6 bg-surface-container-highest rounded w-12 animate-pulse" />
                  <div className="h-6 bg-surface-container-highest rounded w-6 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Users className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery ? 'No providers match your search' : 'No providers yet'}
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
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
                  {c.phone && <span>{c.phone}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.operatingCompany && <span>{c.operatingCompany}</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleOpenRates(c)}
                  className="px-2.5 py-1 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-medium rounded transition-colors cursor-pointer"
                >
                  Rates
                </button>
                <button
                  onClick={() => { setEditCollaborator(c); setIsNew(false); }}
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
      {editCollaborator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">{isNew ? 'Add Provider' : 'Edit Provider'}</h3>
              <button onClick={() => setEditCollaborator(null)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Name *</label>
                <input type="text" value={editCollaborator.name || ''} onChange={e => setEditCollaborator({ ...editCollaborator, name: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">VAT</label>
                  <input type="text" value={editCollaborator.vat || ''} onChange={e => setEditCollaborator({ ...editCollaborator, vat: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Payment Terms (days)</label>
                  <input type="number" value={editCollaborator.paymentTerms || 30} onChange={e => setEditCollaborator({ ...editCollaborator, paymentTerms: parseInt(e.target.value) || 30 })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Address</label>
                <input type="text" value={editCollaborator.address || ''} onChange={e => setEditCollaborator({ ...editCollaborator, address: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Phone</label>
                  <input type="text" value={editCollaborator.phone || ''} onChange={e => setEditCollaborator({ ...editCollaborator, phone: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Email</label>
                  <input type="email" value={editCollaborator.email || ''} onChange={e => setEditCollaborator({ ...editCollaborator, email: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Operating Company</label>
                <input type="text" value={editCollaborator.operatingCompany || ''} onChange={e => setEditCollaborator({ ...editCollaborator, operatingCompany: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
                <textarea value={editCollaborator.notes || ''} onChange={e => setEditCollaborator({ ...editCollaborator, notes: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none" rows={2} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide">Status</label>
                <button
                  type="button"
                  onClick={() => setEditCollaborator({ ...editCollaborator, active: !editCollaborator.active })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${editCollaborator.active ? 'bg-primary' : 'bg-outline-variant'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${editCollaborator.active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-[12px] text-on-surface">{editCollaborator.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button onClick={() => setEditCollaborator(null)} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleSave} disabled={isSaving || !editCollaborator.name?.trim()}
                className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isNew ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rates Modal */}
      {selectedCollaborator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <div>
                <h3 className="text-[15px] font-semibold text-on-surface">Supplier Rates</h3>
                <p className="text-[11px] text-on-surface-variant">{selectedCollaborator.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditRate({ serviceType: 'Dispo', vehicleType: 'Van', baseRate: 0, includedKm: 0, includedHours: 0, extraKmRate: 0, extraHourRate: 0, diariaPiena: 0, diariaMezza: 0, nightExtra: 0, holidayExtra: 0 }); setIsNewRate(true); }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-primary text-on-primary text-[11px] font-medium rounded-lg hover:bg-primary-hover cursor-pointer">
                  <Plus className="w-3 h-3" /> Add Rate
                </button>
                <button onClick={() => { setSelectedCollaborator(null); setEditRate(null); }} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-on-surface-variant" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
              {loadingRates ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
              ) : rates.length === 0 ? (
                <p className="text-[12px] text-on-surface-variant text-center py-8">No rates configured</p>
              ) : (
                <div className="space-y-2">
                  {rates.map(r => (
                    <div key={r.id} className="bg-surface-container rounded-lg p-3 flex items-center gap-3 text-[12px]">
                      <div className="flex-1">
                        <span className="font-medium text-on-surface">{r.serviceType} — {r.vehicleType}</span>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">
                          Base: {formatCurrency(r.baseRate)} · +km: {formatCurrency(r.extraKmRate)} · +h: {formatCurrency(r.extraHourRate)} · Diaria: {formatCurrency(r.diariaPiena)}
                        </div>
                        <div className="text-[10px] text-on-surface-variant">
                          Incl: {r.includedKm}km / {r.includedHours}h · Notte: {formatCurrency(r.nightExtra)} · Festa: {formatCurrency(r.holidayExtra)}
                        </div>
                      </div>
                      <button onClick={() => { setEditRate(r); setIsNewRate(false); }} className="p-1.5 hover:bg-surface-dim rounded cursor-pointer">
                        <Pencil className="w-3.5 h-3.5 text-on-surface-variant" />
                      </button>
                      <button onClick={() => handleDeleteRate(r.id)} className="p-1.5 hover:bg-surface-dim rounded cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inline rate edit form */}
            {editRate && (
              <div className="px-5 py-3 border-t border-outline-variant bg-surface-dim shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Service Type</label>
                    <select value={editRate.serviceType || 'Dispo'} onChange={e => setEditRate({ ...editRate, serviceType: e.target.value })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]">
                      {serviceTypes.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Vehicle Type</label>
                    <select value={editRate.vehicleType || 'Van'} onChange={e => setEditRate({ ...editRate, vehicleType: e.target.value })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]">
                      {vehicleTypes.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Base Rate</label>
                    <input type="number" step="0.01" value={editRate.baseRate || 0} onChange={e => setEditRate({ ...editRate, baseRate: parseFloat(e.target.value) || 0 })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Included Km</label>
                    <input type="number" value={editRate.includedKm || 0} onChange={e => setEditRate({ ...editRate, includedKm: parseFloat(e.target.value) || 0 })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Included Hours</label>
                    <input type="number" value={editRate.includedHours || 0} onChange={e => setEditRate({ ...editRate, includedHours: parseFloat(e.target.value) || 0 })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Extra Km Rate</label>
                    <input type="number" step="0.01" value={editRate.extraKmRate || 0} onChange={e => setEditRate({ ...editRate, extraKmRate: parseFloat(e.target.value) || 0 })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Extra Hour Rate</label>
                    <input type="number" step="0.01" value={editRate.extraHourRate || 0} onChange={e => setEditRate({ ...editRate, extraHourRate: parseFloat(e.target.value) || 0 })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Diaria Piena</label>
                    <input type="number" step="0.01" value={editRate.diariaPiena || 0} onChange={e => setEditRate({ ...editRate, diariaPiena: parseFloat(e.target.value) || 0 })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Diaria Mezza</label>
                    <input type="number" step="0.01" value={editRate.diariaMezza || 0} onChange={e => setEditRate({ ...editRate, diariaMezza: parseFloat(e.target.value) || 0 })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Night Extra</label>
                    <input type="number" step="0.01" value={editRate.nightExtra || 0} onChange={e => setEditRate({ ...editRate, nightExtra: parseFloat(e.target.value) || 0 })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Holiday Extra</label>
                    <input type="number" step="0.01" value={editRate.holidayExtra || 0} onChange={e => setEditRate({ ...editRate, holidayExtra: parseFloat(e.target.value) || 0 })}
                      className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]" />
                  </div>
                  <div>
                    <label className="text-on-surface-variant uppercase text-[9px]">Project</label>
                    <input type="text" value={editRate.projectId || ''} onChange={e => setEditRate({ ...editRate, projectId: e.target.value })}
                      placeholder="GLOBAL" className="w-full h-7 rounded border border-outline-variant bg-surface-container-lowest px-2 text-[11px]" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setEditRate(null)} className="px-3 py-1 text-[11px] text-on-surface-variant hover:bg-surface-container rounded cursor-pointer">Cancel</button>
                  <button onClick={handleSaveRate} disabled={isSaving}
                    className="px-3 py-1 bg-primary text-on-primary text-[11px] font-medium rounded hover:bg-primary-hover flex items-center gap-1 disabled:opacity-50 cursor-pointer">
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    {isNewRate ? 'Create' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
