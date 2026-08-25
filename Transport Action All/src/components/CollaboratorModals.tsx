import React from 'react';
import {
  X,
  Save,
  Trash2,
  Pencil,
  Plus,
  Loader2,
  Truck
} from 'lucide-react';
import { CollaboratorDTO } from '../services/api';
import { SupplierRateDTO, DriverRecord } from '../services/api';

interface CollaboratorFormModalProps {
  editCollaborator: Partial<CollaboratorDTO> | null;
  setEditCollaborator: (value: Partial<CollaboratorDTO> | null) => void;
  isNew: boolean;
  isSaving: boolean;
  linkedDrivers: DriverRecord[];
  allDrivers: DriverRecord[];
  loadingDrivers: boolean;
  handleSave: () => void;
  handleLinkDriver: (driverId: string) => void;
  handleUnlinkDriver: (driverId: string) => void;
  serviceTypes: string[];
  setLinkedDrivers: (value: DriverRecord[]) => void;
}

export function CollaboratorFormModal({
  editCollaborator,
  setEditCollaborator,
  isNew,
  isSaving,
  linkedDrivers,
  allDrivers,
  loadingDrivers,
  handleSave,
  handleLinkDriver,
  handleUnlinkDriver,
  serviceTypes,
  setLinkedDrivers
}: CollaboratorFormModalProps) {
  if (!editCollaborator) return null;

  return (
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

          {!isNew && editCollaborator.id && (
            <div className="border-t border-outline-variant pt-3 mt-1">
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-2">Conductores del proveedor</label>
              {loadingDrivers ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-2 bg-surface-container rounded-lg px-3 py-1.5">
                      <div className="w-3 h-3 bg-surface-container-highest rounded" />
                      <div className="h-3 bg-surface-container-highest rounded w-24" />
                      <div className="h-2 bg-surface-container-highest rounded w-16 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : linkedDrivers.length === 0 ? (
                <p className="text-[11px] text-on-surface-variant py-1">No hay conductores asociados a este proveedor</p>
              ) : (
                <div className="space-y-1 mb-2">
                  {linkedDrivers.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-surface-container rounded-lg px-3 py-1.5 text-[12px]">
                      <div className="flex items-center gap-2">
                        <Truck className="w-3 h-3 text-on-surface-variant" />
                        <span className="text-on-surface font-medium">{d.name}</span>
                        {d.phone && <span className="text-on-surface-variant text-[10px]">{d.phone}</span>}
                      </div>
                      <button onClick={() => handleUnlinkDriver(d.id)}
                        className="text-[10px] text-red-500 hover:text-red-600 font-medium cursor-pointer">
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(() => {
                const linkedIds = new Set(linkedDrivers.map(d => d.id));
                const available = allDrivers.filter(d => !linkedIds.has(d.id));
                if (available.length === 0) return null;
                return (
                  <select
                    value=""
                    onChange={e => { if (e.target.value) handleLinkDriver(e.target.value); }}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">— Asociar conductor —</option>
                    {available.map(d => (
                      <option key={d.id} value={d.id}>{d.name}{d.phone ? ` (${d.phone})` : ''}</option>
                    ))}
                  </select>
                );
              })()}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
          <button onClick={() => { setEditCollaborator(null); setLinkedDrivers([]); }} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={isSaving || !editCollaborator.name?.trim()}
            className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RatesModalProps {
  selectedCollaborator: CollaboratorDTO | null;
  setSelectedCollaborator: (value: CollaboratorDTO | null) => void;
  rates: SupplierRateDTO[];
  loadingRates: boolean;
  editRate: Partial<SupplierRateDTO> | null;
  setEditRate: (value: Partial<SupplierRateDTO> | null) => void;
  isNewRate: boolean;
  setIsNewRate: (value: boolean) => void;
  isSaving: boolean;
  vehicleTypes: string[];
  serviceTypes: string[];
  handleSaveRate: () => void;
  handleDeleteRate: (rateId: string) => void;
  formatCurrency: (amount: number) => string;
}

export function RatesModal({
  selectedCollaborator,
  setSelectedCollaborator,
  rates,
  loadingRates,
  editRate,
  setEditRate,
  isNewRate,
  setIsNewRate,
  isSaving,
  vehicleTypes,
  serviceTypes,
  handleSaveRate,
  handleDeleteRate,
  formatCurrency
}: RatesModalProps) {
  if (!selectedCollaborator) return null;

  return (
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
  );
}
