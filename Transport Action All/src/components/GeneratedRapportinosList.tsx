import React from 'react';
import { FileSpreadsheet, ChevronRight, ExternalLink } from 'lucide-react';

type DomainStatus = 'Borrador' | 'Revisado' | 'Enviado' | 'Aceptado' | 'Facturado' | 'Pagado';

interface GeneratedRapportino {
  sheetName: string;
  sheetUrl: string;
  rapportinoId: string;
  totalServices: number;
  totalCost: number;
  type: string;
  label: string;
  dateFrom?: string;
  dateTo?: string;
  status: DomainStatus;
}

interface StatusConfig {
  color: string;
  bg: string;
  icon: React.ReactNode;
  nextStatus: DomainStatus | null;
  nextAction?: string;
}

interface GeneratedRapportinosListProps {
  filteredGeneratedList: GeneratedRapportino[];
  STATUS_CONFIG: Record<string, StatusConfig>;
  onAdvanceStatus: (rapportino: GeneratedRapportino) => void;
}

export default function GeneratedRapportinosList({
  filteredGeneratedList,
  STATUS_CONFIG,
  onAdvanceStatus
}: GeneratedRapportinosListProps) {
  if (filteredGeneratedList.length === 0) return null;

  return (
    <section id="generated-rapportinos" className="space-y-2">
      <h3 className="text-[13px] font-semibold text-on-surface">Generated Reports</h3>
      <div className="space-y-2">
        {filteredGeneratedList.map((r, idx) => {
          const statusConfig = STATUS_CONFIG[r.status];
          return (
            <div
              key={r.rapportinoId + idx}
              className="flex items-center justify-between bg-surface-container-low rounded-lg border border-outline-variant px-4 py-3 hover:bg-surface-dim transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-on-surface">{r.label}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {r.totalServices} services · € {r.totalCost.toFixed(2)}
                    {r.dateFrom && r.dateTo && ` · ${r.dateFrom} to ${r.dateTo}`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color} ${statusConfig.bg}`}>
                  {statusConfig.icon}
                  {r.status}
                </span>
                
                {statusConfig.nextStatus && (
                  <button
                    onClick={() => onAdvanceStatus(r)}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-outline-variant text-[10px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                    title={`Mark as ${statusConfig.nextStatus}`}
                  >
                    <ChevronRight className="w-3 h-3" />
                    {statusConfig.nextStatus}
                  </button>
                )}
                
                {r.sheetUrl && (
                  <a
                    href={r.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary text-[11px] font-medium hover:underline"
                  >
                    Open
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
