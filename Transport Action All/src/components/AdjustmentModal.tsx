import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { X, Save, DollarSign } from 'lucide-react';
import { Service } from '../types';
import { adjustRevenue, adjustCost } from '../services/api';

interface AdjustmentModalProps {
  service: Service | null;
  type: 'revenue' | 'cost';
  onClose: () => void;
  onConfirm: (serviceId: string, updates: Partial<Service>) => void;
}

export default function AdjustmentModal({ service, type, onClose, onConfirm }: AdjustmentModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ description: '', amount: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!service) return null;

  const handleConfirm = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    setIsProcessing(true);
    try {
      const serviceId = service.backendId || service.id;
      const adjustment = {
        amount: parseFloat(form.amount),
        description: form.description || `${type} adjustment`,
      };
      const fn = type === 'revenue' ? adjustRevenue : adjustCost;
      const result = await fn(serviceId, adjustment);
      if (result.error) {
        showToast(`Error adjusting ${type}: ${result.error}`, 'error');
        return;
      }
      onConfirm(service.id, { [type === 'revenue' ? 'revenueAdjustments' : 'costAdjustments']: adjustment });
      showToast(`${type === 'revenue' ? 'Revenue' : 'Cost'} adjustment saved`, 'success');
    } catch (err) {
      showToast('Error: ' + ((err as Error).message || 'Unknown error'), 'error');
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant w-full max-w-md flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <DollarSign className={`w-5 h-5 ${type === 'revenue' ? 'text-indigo-500' : 'text-rose-500'}`} />
            <h2 className="text-[18px] font-semibold text-on-surface">
              {type === 'revenue' ? 'Adjust Revenue' : 'Adjust Cost'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-surface-dim">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-4">
          <p className="text-[13px] text-on-surface-variant">
            Add a manual {type} adjustment to this service.
          </p>
          <div className="bg-surface-dim rounded-lg p-3 text-[13px] text-on-surface">
            <p><strong>{service.title}</strong></p>
            <p className="text-on-surface-variant">{service.time} · {service.driverName}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-on-surface-variant">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              placeholder="e.g., Overtime surcharge, Parking refund"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-on-surface-variant">
              Amount <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
              className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!form.amount || parseFloat(form.amount) <= 0 || isProcessing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              type === 'revenue'
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            <Save className="w-4 h-4" />
            {isProcessing ? 'Saving...' : 'Save Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}
