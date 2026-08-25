import React from 'react';
import { X, AlertCircle, Trash2 } from 'lucide-react';

interface DriverDeleteConfirmProps {
  driverName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DriverDeleteConfirm({ driverName, onClose, onConfirm }: DriverDeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-sm shadow-xl p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-on-surface">Delete Driver</h3>
            <p className="text-[12px] text-on-surface-variant">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-[13px] text-on-surface mb-4 overflow-y-auto flex-1 min-h-0">
          Are you sure you want to delete <strong>{driverName}</strong>?
        </p>
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 bg-red-500 text-white text-[12px] font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
