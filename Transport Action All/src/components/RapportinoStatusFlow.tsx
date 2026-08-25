import React from 'react';
import { CheckCircle } from 'lucide-react';

export const PERIOD_TYPE_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  custom: 'Personalizado'
};

interface StatusFlowProps {
  statuses: string[];
  currentStatus: string;
  statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }>;
}

export default function StatusFlow({ statuses, currentStatus, statusConfig }: StatusFlowProps) {
  const currentIndex = statuses.indexOf(currentStatus);

  return (
    <div className="flex items-center w-full py-3">
      {statuses.map((status, index) => {
        const config = statusConfig[status] || statusConfig.Borrador;
        const Icon = config.icon;
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={status}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500
                  ${isCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : ''}
                  ${isCurrent ? `${config.bg} ${config.color} ring-2 ring-offset-1 ring-current shadow-lg animate-pulse` : ''}
                  ${index > currentIndex ? 'bg-surface-dim text-outline border border-outline-variant/50' : ''}
                `}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[9px] font-medium whitespace-nowrap transition-colors duration-300 ${
                  isCurrent ? 'text-on-surface' : isCompleted ? 'text-emerald-600' : 'text-outline'
                }`}
              >
                {status}
              </span>
            </div>

            {index < statuses.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 relative overflow-hidden rounded-full bg-surface-dim">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                    index < currentIndex
                      ? 'bg-emerald-500 w-full'
                      : index === currentIndex
                      ? 'bg-gradient-to-r from-emerald-500 to-outline-variant/30 animate-[shimmer_2s_ease-in-out_infinite]'
                      : 'w-0'
                  }`}
                />
                {index === currentIndex && (
                  <div className="absolute inset-y-0 left-0 w-full">
                    <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-[travel_2s_ease-in-out_infinite]" />
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
