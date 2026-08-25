import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Check } from 'lucide-react';
import { Service } from '../types';

interface BulkActionsToolbarProps {
  selectedServiceIds: Set<string>;
  services: Service[];
  onClearSelection: () => void;
  onBulkWorkflow: (action: string) => void;
  onOpenBulkAssignDriver: () => void;
  isBulkCompleting: boolean;
}

export default function BulkActionsToolbar({
  selectedServiceIds,
  services,
  onClearSelection,
  onBulkWorkflow,
  onOpenBulkAssignDriver,
  isBulkCompleting,
}: BulkActionsToolbarProps) {
  const allSvcs = [...services];
  const selected = Array.from(selectedServiceIds)
    .map(id => allSvcs.find(s => s.id === id))
    .filter(Boolean) as Service[];

  const stages = [
    {
      action: 'assign',
      label: 'Assign Driver',
      color: 'bg-blue-500 hover:bg-blue-600',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      count: selected.filter(s => s.operationalStatus === 'Importado' && !s.driverId).length,
    },
    {
      action: 'confirm',
      label: 'Confirm',
      color: 'bg-cyan-500 hover:bg-cyan-600',
      icon: <Check className="w-3.5 h-3.5" />,
      count: selected.filter(s => s.operationalStatus === 'Asignado').length,
    },
    {
      action: 'start',
      label: 'Start Route',
      color: 'bg-blue-600 hover:bg-blue-700',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      count: selected.filter(s => s.operationalStatus === 'Confirmado').length,
    },
    {
      action: 'complete',
      label: 'Complete',
      color: 'bg-green-600 hover:bg-green-700',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      count: selected.filter(s => s.operationalStatus === 'EnRuta').length,
    },
    {
      action: 'report',
      label: 'Report',
      color: 'bg-amber-500 hover:bg-amber-600',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      count: selected.filter(s => s.operationalStatus === 'Realizado').length,
    },
    {
      action: 'review',
      label: 'Review',
      color: 'bg-amber-600 hover:bg-amber-700',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      count: selected.filter(s => s.operationalStatus === 'Reportado').length,
    },
    {
      action: 'validate',
      label: 'Validate',
      color: 'bg-green-700 hover:bg-green-800',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      count: selected.filter(s => s.operationalStatus === 'Revision').length,
    },
  ];

  const visibleStages = stages.filter(s => s.count > 0);

  return (
    <AnimatePresence>
      {selectedServiceIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2.5 shadow-lg max-w-[90vw] overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-medium text-on-surface whitespace-nowrap">
                {selectedServiceIds.size} selected
              </span>
            </div>
            
            <div className="w-px h-6 bg-outline-variant shrink-0" />
            
            <button onClick={onClearSelection}
              className="text-[11px] text-on-surface-variant font-medium hover:underline shrink-0">
              Clear
            </button>
            
            <div className="w-px h-6 bg-outline-variant shrink-0" />

            {visibleStages.map(stage => (
              <button key={stage.action}
                onClick={() => {
                  if (stage.action === 'assign') { onOpenBulkAssignDriver(); return; }
                  onBulkWorkflow(stage.action);
                }}
                disabled={isBulkCompleting}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-on-primary text-[11px] font-medium rounded-lg transition-colors disabled:opacity-50 shrink-0 ${stage.color}`}>
                {stage.icon}
                {stage.label}
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{stage.count}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
