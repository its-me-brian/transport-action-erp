import React from 'react';
import { FileText, FileSpreadsheet, Download, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface ExportResult {
  type: 'pdf' | 'excel';
  url?: string;
  downloadUrl?: string;
  fileName?: string;
}

interface TransportListExportResultModalProps {
  result: ExportResult | null;
  onClose: () => void;
}

export default function TransportListExportResultModal({
  result,
  onClose,
}: TransportListExportResultModalProps) {
  const { showToast } = useToast();
  if (!result) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <h3 className="font-semibold text-on-surface flex items-center gap-2">
            {result.type === 'pdf' ? (
              <><FileText className="w-4 h-4 text-primary" /> PDF Generado</>
            ) : (
              <><FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel Exportado</>
            )}
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 flex flex-col items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            result.type === 'pdf' ? 'bg-primary/10' : 'bg-emerald-100'
          }`}>
            {result.type === 'pdf' ? (
              <FileText className="w-7 h-7 text-primary" />
            ) : (
              <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            )}
          </div>
          <div className="text-center">
            <p className="text-[13px] font-medium text-on-surface">
              {result.type === 'pdf' ? 'PDF descargado correctamente' : 'Archivo generado con éxito'}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5 truncate max-w-[250px]">{result.fileName}</p>
          </div>
          {result.type === 'excel' && (
            <div className="flex flex-col gap-2 w-full">
              {result.downloadUrl && (
                <a
                  href={result.downloadUrl}
                  download
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors text-center"
                >
                  <Download className="w-4 h-4" />
                  Descargar archivo
                </a>
              )}
              <button
                onClick={() => {
                  const url = result.downloadUrl || result.url;
                  if (url) {
                    navigator.clipboard.writeText(url).then(() => {
                      showToast('Link copiado al portapapeles', 'success');
                    });
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-medium border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
              >
                Copiar link
              </button>
            </div>
          )}
        </div>
        <div className="flex justify-end px-4 py-3 border-t border-outline-variant">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
