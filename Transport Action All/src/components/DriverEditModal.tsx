import React from 'react';
import { X, Save, Loader2, DollarSign } from 'lucide-react';
import { getDriverAvatar } from '../types';
import { EditModalDriver } from './DriverPanelScreen';

interface DriverEditModalProps {
  driver: EditModalDriver;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  collaborators: { id: string; name: string }[];
  onOpenRates: () => void;
  onChange: (driver: EditModalDriver) => void;
}

export default function DriverEditModal({ driver, onClose, onSave, saving, collaborators, onOpenRates, onChange }: DriverEditModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container">
              <img className="w-full h-full object-cover" src={getDriverAvatar(driver.name)} alt="" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-on-surface">Edit Driver</h3>
              <p className="text-[11px] text-on-surface-variant">{driver.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Name</label>
            <input
              type="text"
              value={driver.name}
              onChange={(e) => onChange({ ...driver, name: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Phone</label>
              <input
                type="text"
                value={driver.phone}
                onChange={(e) => onChange({ ...driver, phone: e.target.value })}
                placeholder="+39 ..."
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">WhatsApp</label>
              <input
                type="text"
                value={driver.whatsapp}
                onChange={(e) => onChange({ ...driver, whatsapp: e.target.value })}
                placeholder="+39 ..."
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Preferred Vehicle</label>
            <input
              type="text"
              value={driver.vehiclePreferred}
              onChange={(e) => onChange({ ...driver, vehiclePreferred: e.target.value })}
              placeholder="e.g. Van"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={driver.notes}
              onChange={(e) => onChange({ ...driver, notes: e.target.value })}
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Status</label>
            <select
              value={driver.status}
              onChange={(e) => onChange({ ...driver, status: e.target.value as EditModalDriver['status'] })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="Disponible">Disponible</option>
              <option value="Asignado">Asignado</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Type</label>
              <select
                value={driver.type}
                onChange={(e) => onChange({ ...driver, type: e.target.value, collaboratorId: e.target.value === 'interno' ? '' : driver.collaboratorId })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="interno">Interno (Propio)</option>
                <option value="colaborador">Colaborador</option>
              </select>
            </div>
            {driver.type === 'colaborador' && (
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Collaborator / Provider</label>
                <select
                  value={driver.collaboratorId}
                  onChange={(e) => onChange({ ...driver, collaboratorId: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">— Select collaborator —</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {driver.type !== 'colaborador' && (
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Operating Company</label>
                <select
                  value={driver.operatingCompany}
                  onChange={(e) => onChange({ ...driver, operatingCompany: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">—</option>
                  <option value="Transport Action">Transport Action</option>
                  <option value="Movie Motion">Movie Motion</option>
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Driver Ownership</label>
              <select
                value={driver.driverOwnership}
                onChange={(e) => onChange({ ...driver, driverOwnership: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="own">Propio (Own)</option>
                <option value="rented">Alquilado (Rented)</option>
                <option value="partner">Socio (Partner)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Last Import Date</label>
              <input
                type="text"
                value={driver.lastImportDate ? new Date(driver.lastImportDate).toLocaleDateString() : '—'}
                readOnly
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface-variant cursor-not-allowed"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Email</label>
              <input
                type="email"
                value={driver.email}
                onChange={(e) => onChange({ ...driver, email: e.target.value })}
                placeholder="driver@email.com"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">IBAN</label>
              <input
                type="text"
                value={driver.iban}
                onChange={(e) => onChange({ ...driver, iban: e.target.value })}
                placeholder="IT60 X054 2811 1010 0000 0123 456"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">License Type</label>
              <input
                type="text"
                value={driver.licenseType}
                onChange={(e) => onChange({ ...driver, licenseType: e.target.value })}
                placeholder="e.g. B, C, D"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">License Expiry</label>
              <input
                type="date"
                value={driver.licenseExpiry}
                onChange={(e) => onChange({ ...driver, licenseExpiry: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant shrink-0">
          <button
            onClick={onOpenRates}
            className="px-4 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" /> Supplier Rates
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
