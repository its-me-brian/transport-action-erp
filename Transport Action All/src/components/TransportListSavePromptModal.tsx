import React from 'react';
import { Save, RefreshCw } from 'lucide-react';

interface TransportListSavePromptModalProps {
  isOpen: boolean;
  selectedCount: number;
  onSave: () => void;
  onDismiss: () => void;
}

export default function TransportListSavePromptModal({
  isOpen,
  selectedCount,
  onSave,
  onDismiss,
}: TransportListSavePromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-sm">
        <div className="p-5 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Save className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-semibold text-on-surface text-[15px] mb-1">¿Guardar transport?</h3>
          <p className="text-[12px] text-on-surface-variant leading-relaxed">
            ¿Querés registrar estos <strong>{selectedCount} servicios</strong> en el sheet para usarlos en Calendar, Rapportinos e History?
          </p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onSave}
            className="flex-1 px-3 py-2.5 text-[13px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 inline mr-1.5" />
            Guardar en Sheet
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 px-3 py-2 text-[12px] font-medium border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
          >
            No, gracias
          </button>
        </div>
      </div>
    </div>
  );
}
