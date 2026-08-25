import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Plus, Loader2 } from 'lucide-react';
import { createDriverOnTheFly } from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface CreateDriverModalProps {
  isOpen: boolean;
  driverName: string;
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
  company: 'Transport Action' | 'Movie Motion';
}

export function CreateDriverModal({ isOpen, driverName, onClose, onCreated, company }: CreateDriverModalProps) {
  const { showToast } = useToast();
  const [phone, setPhone] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!driverName.trim()) return;
    if (!phone.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }

    setIsCreating(true);
    const result = await createDriverOnTheFly({
      name: driverName.trim(),
      phone: phone.trim(),
      operatingCompany: company,
    });
    setIsCreating(false);

    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    if (result.id) {
      onCreated(result.id, result.name || driverName.trim());
      setPhone('');
    }
  };

  const handleClose = () => {
    setPhone('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-sm mx-4 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 shrink-0">
              <h3 className="text-[14px] font-semibold text-on-surface">Create New Driver</h3>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded hover:bg-surface-container transition-colors"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              <p className="text-[12px] text-on-surface-variant">
                Driver: <strong className="text-on-surface">{driverName}</strong>
              </p>

              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end px-5 py-4 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-on-surface bg-surface-dim hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !phone.trim()}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-on-primary bg-primary hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Create Driver
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
