import React from 'react';
import { DriverRecord } from '../services/api';

interface BulkAssignDriverModalProps {
  show: boolean;
  onClose: () => void;
  selectedCount: number;
  drivers: DriverRecord[];
  bulkAssignDriverId: string;
  onAssignDriverChange: (id: string) => void;
  onAssign: () => void;
  isAssigning: boolean;
}

export default function BulkAssignDriverModal({
  show,
  onClose,
  selectedCount,
  drivers,
  bulkAssignDriverId,
  onAssignDriverChange,
  onAssign,
  isAssigning,
}: BulkAssignDriverModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4 p-0" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-xl border border-outline-variant w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-[16px] font-semibold text-on-surface">Assign Driver to {selectedCount} Service(s)</h3>
          <p className="text-[12px] text-on-surface-variant mt-1">Select a driver to assign to all selected services</p>
        </div>
        <div className="px-5 pb-4">
          <select value={bulkAssignDriverId} onChange={e => onAssignDriverChange(e.target.value)}
            className="w-full bg-surface-dim border border-outline-variant rounded-lg px-3 py-2.5 text-[14px] text-on-surface focus:outline-none focus:border-primary">
            <option value="">— Select Driver —</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.name}{d.phone ? ` (${d.phone})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-outline-variant">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors">
            Cancel
          </button>
          <button onClick={onAssign} disabled={!bulkAssignDriverId || isAssigning}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
            {isAssigning ? 'Assigning...' : 'Assign Driver'}
          </button>
        </div>
      </div>
    </div>
  );
}
