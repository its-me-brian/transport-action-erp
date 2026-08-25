import React from 'react';
import { History, Route, CheckCircle } from 'lucide-react';
import { Service, calculateServiceCosts } from '../types';

interface QuickStatsSectionProps {
  totalHours: number;
  services: Service[];
  generatedListCount: number;
}

export default function QuickStatsSection({
  totalHours,
  services,
  generatedListCount
}: QuickStatsSectionProps) {
  const totalValidatedCost = services
    .filter(s => s.operationalStatus === 'Validado')
    .reduce((sum, s) => sum + calculateServiceCosts(s).totalCost, 0);

  return (
    <section id="reports-bento-dashboard" className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="bg-primary/5 p-3 rounded-lg border border-primary/15 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-primary">
          <History className="w-4 h-4" />
          <h4 className="text-[11px] font-medium uppercase tracking-wide">Total Hours</h4>
        </div>
        <p className="text-[20px] font-bold text-primary leading-none">
          {totalHours.toFixed(1)} hrs
        </p>
        <p className="text-[11px] text-on-surface-variant">
          {services.filter(s => s.status === 'Completed').length} completed services
        </p>
      </div>

      <div className="bg-secondary/5 p-3 rounded-lg border border-secondary/15 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-secondary">
          <Route className="w-4 h-4" />
          <h4 className="text-[11px] font-medium uppercase tracking-wide">Total Cost</h4>
        </div>
        <p className="text-[20px] font-bold text-secondary leading-none">
          € {totalValidatedCost.toFixed(2)}
        </p>
        <p className="text-[11px] text-on-surface-variant">
          All validated services
        </p>
      </div>

      <div className="bg-surface-dim p-3 rounded-lg border border-outline-variant flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-on-surface">
          <CheckCircle className="w-4 h-4 text-primary" />
          <h4 className="text-[11px] font-medium uppercase tracking-wide">Generated</h4>
        </div>
        <p className="text-[20px] font-bold text-on-surface leading-none">
          {generatedListCount}
        </p>
        <p className="text-[11px] text-on-surface-variant">
          rapportinos this session
        </p>
      </div>
    </section>
  );
}
