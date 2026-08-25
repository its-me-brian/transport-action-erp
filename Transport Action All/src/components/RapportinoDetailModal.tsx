import React from 'react';
import { X, FileText } from 'lucide-react';
import { RapportinoClientDTO, RapportinoDriverDTO, RapportinoCollaboratorDTO } from '../services/api';
import RapportinoStatusFlow, { PERIOD_TYPE_LABELS } from './RapportinoStatusFlow';
import { CLIENT_STATUS_CONFIG, DRIVER_STATUS_CONFIG, COLLABORATOR_STATUS_CONFIG } from './RapportinoCards';

interface RapportinoDetailModalProps {
  viewTarget: RapportinoClientDTO | RapportinoDriverDTO | RapportinoCollaboratorDTO;
  activeTab: 'client' | 'driver' | 'collaborator';
  onClose: () => void;
  formatDate: (d: string) => string;
  formatCurrency: (amount: number) => string;
}

export default function RapportinoDetailModal({
  viewTarget: r,
  activeTab,
  onClose,
  formatDate,
  formatCurrency
}: RapportinoDetailModalProps) {
  const typeLabel = activeTab === 'client' ? 'Cliente' : activeTab === 'driver' ? 'Conductor' : 'Collaboratore';
  const entityLabel = activeTab === 'client' ? (r as RapportinoClientDTO).clientId
    : activeTab === 'driver' ? (r as RapportinoDriverDTO).driverId
    : (r as RapportinoCollaboratorDTO).collaboratorId;

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Rapportino ${r.id}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1a1a2e;font-size:22px}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#1a1a2e;color:white;padding:8px 12px;text-align:left;font-size:12px}td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}.label{color:#6b7280;font-size:10px;text-transform:uppercase}.value{font-weight:500}.footer{margin-top:20px;font-size:11px;color:#9ca3af}@media print{body{padding:0}}</style>
      </head><body>
      <h1>Rapportino ${typeLabel}</h1>
      <p style="color:#6b7280;font-size:13px">ID: ${r.id} | Generato: ${new Date().toLocaleDateString('it-IT')}</p>
      <table><tbody>
      <tr><td class="label">Stato</td><td class="value">${r.status}</td></tr>
      <tr><td class="label">${typeLabel}</td><td class="value">${entityLabel}</td></tr>
      <tr><td class="label">Progetto</td><td class="value">${r.projectId || '—'}</td></tr>
      <tr><td class="label">Periodo</td><td class="value">${formatDate(r.periodStart)} — ${formatDate(r.periodEnd)}</td></tr>
      <tr><td class="label">Importo</td><td class="value">${formatCurrency(r.totalAmount || 0)}</td></tr>
      ${r.notes ? `<tr><td class="label">Note</td><td class="value">${r.notes}</td></tr>` : ''}
      </tbody></table>
      <p class="footer">Transport Action ERP — Rapportino ${typeLabel}</p>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-on-surface">
              Rapportino — {typeLabel}
            </h3>
            <p className="text-[11px] text-on-surface-variant">{r.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Estado</span>
              <p className="font-medium text-on-surface">{r.status}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">{typeLabel}</span>
              <p className="font-medium text-on-surface">{entityLabel}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Proyecto</span>
              <p className="font-medium text-on-surface">{r.projectId || '—'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Tipo de período</span>
              <p className="font-medium text-on-surface">{PERIOD_TYPE_LABELS[r.periodType || 'weekly'] || r.periodType || 'Semanal'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Creado por</span>
              <p className="font-medium text-on-surface">{r.createdBy || '—'}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Período desde</span>
              <p className="font-medium text-on-surface">{formatDate(r.periodStart || r.weekStart)}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Período hasta</span>
              <p className="font-medium text-on-surface">{formatDate(r.periodEnd || r.weekEnd)}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Enviado</span>
              <p className="font-medium text-on-surface">{formatDate(r.sentAt)}</p>
            </div>
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">
                {activeTab === 'client' ? 'Aceptado' : 'Pagado'}
              </span>
              <p className="font-medium text-on-surface">
                {formatDate(activeTab === 'client' ? (r as RapportinoClientDTO).acceptedAt : (r as RapportinoDriverDTO).paidAt || (r as RapportinoCollaboratorDTO).paidAt)}
              </p>
            </div>
          </div>

          <div className="mt-2">
            <span className="text-on-surface-variant uppercase text-[10px]">Flujo de estado</span>
            <RapportinoStatusFlow
              statuses={
                activeTab === 'client'
                  ? ['Borrador', 'Revisado', 'Enviado', 'Aceptado', 'Facturado']
                  : activeTab === 'driver'
                  ? ['Borrador', 'Revisado', 'Enviado', 'Aceptado', 'Pagado']
                  : ['Borrador', 'Enviado', 'Aceptado', 'Pagado']
              }
              currentStatus={r.status || 'Borrador'}
              statusConfig={
                activeTab === 'client'
                  ? CLIENT_STATUS_CONFIG
                  : activeTab === 'driver'
                  ? DRIVER_STATUS_CONFIG
                  : COLLABORATOR_STATUS_CONFIG
              }
            />
          </div>

          {r.notes && (
            <div>
              <span className="text-on-surface-variant uppercase text-[10px]">Notas</span>
              <p className="text-[12px] text-on-surface mt-1">{r.notes}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-on-surface border border-outline-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
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
