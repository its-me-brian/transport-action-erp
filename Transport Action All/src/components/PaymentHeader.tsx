import React from 'react';
import { Plus, Download, FileText } from 'lucide-react';
import { formatCurrency } from './paymentsShared';

interface PaymentHeaderProps {
  filteredCount: number;
  totalAmount: number;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onOpenAddModal: () => void;
}

export default function PaymentHeader({ filteredCount, totalAmount, onExportExcel, onExportPDF, onOpenAddModal }: PaymentHeaderProps) {
  return (
    <header id="payments-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
      <div>
        <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Payments</h2>
        <p className="text-[12px] text-on-surface-variant mt-0.5">
          {filteredCount} payment{filteredCount !== 1 ? 's' : ''} — Total: {formatCurrency(totalAmount)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onExportExcel}
          className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Excel</span>
        </button>
        <button
          onClick={onExportPDF}
          className="flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PDF</span>
        </button>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Record Payment</span>
        </button>
      </div>
    </header>
  );
}
