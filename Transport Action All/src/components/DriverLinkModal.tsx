import React from 'react';
import { X, Loader2, AlertCircle, Check, Copy } from 'lucide-react';
import { RapportinoDriverDTO, DriverLinkDTO } from '../services/api';

interface DriverLinkModalProps {
  open: boolean;
  rapportino: RapportinoDriverDTO | null;
  loading: boolean;
  link: DriverLinkDTO | null;
  error: string;
  copied: boolean;
  onClose: () => void;
  onCopyLink: (url: string) => void;
  formatDate: (d: string) => string;
}

export default function DriverLinkModal({
  open,
  rapportino,
  loading,
  link,
  error,
  copied,
  onClose,
  onCopyLink,
  formatDate
}: DriverLinkModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-on-surface">
              Link para Conductor
            </h3>
            <p className="text-[11px] text-on-surface-variant">
              {rapportino?.driverId} — {rapportino?.projectId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-[12px] text-on-surface-variant">Generando link...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <AlertCircle className="w-6 h-6 text-error" />
              <span className="text-[12px] text-error">{error}</span>
            </div>
          ) : link ? (
            <div className="space-y-4">
              <div className="bg-surface-container rounded-lg p-3">
                <span className="text-[10px] text-on-surface-variant uppercase">Link</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={link.link || ''}
                    className="flex-1 text-[12px] text-on-surface bg-transparent border border-outline-variant rounded px-2 py-1.5 font-mono"
                  />
                  <button
                    onClick={() => onCopyLink(link.link || '')}
                    className="p-2 hover:bg-surface-container rounded transition-colors cursor-pointer"
                    title="Copiar link"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-on-surface-variant" />
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Token</span>
                  <p className="font-mono text-on-surface">{link.token}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase text-[10px]">Expira</span>
                  <p className="text-on-surface">{formatDate(link.expiresAt)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
