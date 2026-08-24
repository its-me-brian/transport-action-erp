import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Service } from '../types';
import { deleteService, cancelService } from '../services/api';

interface DeleteCancelModalProps {
  service: Service | null;
  mode: 'delete' | 'cancel';
  onClose: () => void;
  onConfirm: (serviceId: string, mode: 'delete' | 'cancel') => void;
}

export default function DeleteCancelModal({ service, mode, onClose, onConfirm }: DeleteCancelModalProps) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!service) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const serviceId = service.backendId || service.id;
      if (mode === 'cancel') {
        if (!reason.trim()) return;
        const result = await cancelService(serviceId, reason.trim());
        if (result.error) {
          showToast('Error cancelling service: ' + result.error, 'error');
          return;
        }
        onConfirm(service.id, 'cancel');
      } else {
        const result = await deleteService(serviceId, reason.trim() || undefined);
        if (result.error) {
          showToast('Error deleting service: ' + result.error, 'error');
          return;
        }
        onConfirm(service.id, 'delete');
      }
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
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-[18px] font-semibold text-on-surface">
              {mode === 'cancel' ? 'Cancel Service' : 'Delete Service'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-dim">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-4">
          <p className="text-[13px] text-on-surface-variant">
            {mode === 'cancel'
              ? 'This will cancel the service and set its status to Cancelado. The service will remain in history but will no longer appear in active workflows.'
              : 'Only services in <strong>Importado</strong> or <strong>Asignado</strong> status can be deleted. Once confirmed, services must go through the full lifecycle.'}
          </p>
          <div className="bg-surface-dim rounded-lg p-3 text-[13px] text-on-surface">
            <p><strong>{service.title}</strong></p>
            <p className="text-on-surface-variant">{service.time} · {service.driverName}</p>
            <p className="text-on-surface-variant text-[11px] mt-1">Status: {service.status}</p>
          </div>

          {mode === 'cancel' && (
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-red-600">
                Reason for cancellation <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-red-400 resize-none"
                rows={3}
                placeholder="Why is this service being cancelled?"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={mode === 'cancel' && !reason.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'cancel' ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            {mode === 'cancel' ? 'Cancel Service' : 'Delete Service'}
          </button>
        </div>
      </div>
    </div>
  );
}
