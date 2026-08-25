import React from 'react';
import { X, Save, Loader2, Plus } from 'lucide-react';
import { SupplierRateDTO } from '../services/api';

interface SupplierRatesModalProps {
  driverName: string;
  onClose: () => void;
  loading: boolean;
  rates: SupplierRateDTO[];
  editRate: Partial<SupplierRateDTO> | null;
  isNewRate: boolean;
  onEditRate: (rate: Partial<SupplierRateDTO>) => void;
  onSetIsNewRate: (v: boolean) => void;
  onSaveRate: () => void;
  onDeleteRate: (rateId: string) => void;
  onCancelEdit: () => void;
  serviceTypes: string[];
  vehicleTypes: string[];
}

export default function SupplierRatesModal({
  driverName, onClose, loading, rates, editRate, isNewRate,
  onEditRate, onSetIsNewRate, onSaveRate, onDeleteRate, onCancelEdit,
  serviceTypes, vehicleTypes
}: SupplierRatesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-on-surface">Supplier Rates — {driverName}</h3>
            <p className="text-[11px] text-on-surface-variant">Internal driver pricing</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <>
              {rates.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {rates.map(rate => (
                    <div key={rate.id} className="bg-surface-container-low border border-outline-variant rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-on-surface">{rate.serviceType}</span>
                          <span className="text-[11px] text-on-surface-variant bg-surface-dim px-1.5 py-0.5 rounded">{rate.vehicleType}</span>
                          {rate.projectId && rate.projectId !== 'GLOBAL' && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{rate.projectId}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { onEditRate(rate); onSetIsNewRate(false); }} className="text-[11px] text-primary hover:underline cursor-pointer">Edit</button>
                          <button onClick={() => onDeleteRate(rate.id)} className="text-[11px] text-red-500 hover:underline cursor-pointer ml-2">Delete</button>
                        </div>
                      </div>
                      <div className="text-[12px] text-on-surface-variant">
                        Base: €{rate.baseRate} | Km: €{rate.extraKmRate}/km | Hour: €{rate.extraHourRate}/h | Night: €{rate.nightExtra} | Holiday: €{rate.holidayExtra}
                      </div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">
                        Diaria Piena: €{rate.diariaPiena} | Mezza: €{rate.diariaMezza} | Included: {rate.includedKm}km / {rate.includedHours}h
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-on-surface-variant mb-4">No rates configured for this driver.</p>
              )}

              {editRate ? (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                  <h4 className="text-[13px] font-semibold text-on-surface">{isNewRate ? 'New Rate' : 'Edit Rate'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-on-surface-variant uppercase block mb-1">Service Type</label>
                      <select value={editRate.serviceType || 'Dispo'} onChange={e => onEditRate({ ...editRate, serviceType: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]">
                        {serviceTypes.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-on-surface-variant uppercase block mb-1">Vehicle Type</label>
                      <select value={editRate.vehicleType || 'Van'} onChange={e => onEditRate({ ...editRate, vehicleType: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]">
                        {vehicleTypes.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-on-surface-variant uppercase block mb-1">Project</label>
                      <input type="text" value={editRate.projectId || ''} onChange={e => onEditRate({ ...editRate, projectId: e.target.value || 'GLOBAL' })} placeholder="GLOBAL" className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Base Rate (€)</label><input type="number" step="0.01" value={editRate.baseRate || ''} onChange={e => onEditRate({ ...editRate, baseRate: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Included Km</label><input type="number" value={editRate.includedKm || ''} onChange={e => onEditRate({ ...editRate, includedKm: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Included Hours</label><input type="number" step="0.5" value={editRate.includedHours || ''} onChange={e => onEditRate({ ...editRate, includedHours: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Extra Km (€)</label><input type="number" step="0.01" value={editRate.extraKmRate || ''} onChange={e => onEditRate({ ...editRate, extraKmRate: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Extra Hour (€)</label><input type="number" step="0.01" value={editRate.extraHourRate || ''} onChange={e => onEditRate({ ...editRate, extraHourRate: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Night (€)</label><input type="number" step="0.01" value={editRate.nightExtra || ''} onChange={e => onEditRate({ ...editRate, nightExtra: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Holiday (€)</label><input type="number" step="0.01" value={editRate.holidayExtra || ''} onChange={e => onEditRate({ ...editRate, holidayExtra: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Diaria Piena (€)</label><input type="number" step="0.01" value={editRate.diariaPiena || ''} onChange={e => onEditRate({ ...editRate, diariaPiena: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Diaria Mezza (€)</label><input type="number" step="0.01" value={editRate.diariaMezza || ''} onChange={e => onEditRate({ ...editRate, diariaMezza: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button onClick={onCancelEdit} className="px-3 py-1 text-[12px] text-on-surface-variant hover:bg-surface-container rounded cursor-pointer">Cancel</button>
                    <button onClick={onSaveRate} className="px-3 py-1 bg-primary text-on-primary text-[12px] font-medium rounded hover:bg-primary-hover flex items-center gap-1 cursor-pointer"><Save className="w-3 h-3" /> Save Rate</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { onEditRate({ serviceType: 'Dispo', vehicleType: 'Van', projectId: 'GLOBAL', baseRate: 0, includedKm: 0, includedHours: 0, extraKmRate: 0, extraHourRate: 0, diariaPiena: 0, diariaMezza: 0, nightExtra: 0, holidayExtra: 0, waitHourRate: 0 }); onSetIsNewRate(true); }} className="w-full py-2 border border-dashed border-outline-variant rounded-lg text-[12px] text-primary font-medium hover:bg-primary/5 transition-colors cursor-pointer">
                  + Add Supplier Rate
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
