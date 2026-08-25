import React from 'react';
import {
  Eye, EyeOff, Download, Printer, FileSpreadsheet, MessageSquare,
  Mail, Building2, Trash2, ChevronDown, Users, Loader2,
  LayoutList, ListTree
} from 'lucide-react';
import { TransportService } from '../services/api';

interface TransportListDesktopActionsProps {
  showRoles: boolean;
  viewMode: 'flat' | 'grouped';
  selectedCount: number;
  isExporting: boolean;
  showExportMenu: boolean;
  showWhatsAppMenu: boolean;
  services: TransportService[];
  selectedRows: Set<string>;
  onToggleRoles: () => void;
  onToggleViewMode: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  onExportExcel: () => void;
  onToggleExportMenu: () => void;
  onToggleWhatsAppMenu: () => void;
  onWhatsAppDriver: (driver: string) => void;
  onWhatsAppGroup: () => void;
  onOpenEmail: () => void;
  onOpenAgency: () => void;
  onRemoveSelected: () => void;
}

export default function TransportListDesktopActions({
  showRoles,
  viewMode,
  selectedCount,
  isExporting,
  showExportMenu,
  showWhatsAppMenu,
  services,
  selectedRows,
  onToggleRoles,
  onToggleViewMode,
  onExpandAll,
  onCollapseAll,
  onExportPdf,
  onPrint,
  onExportExcel,
  onToggleExportMenu,
  onToggleWhatsAppMenu,
  onWhatsAppDriver,
  onWhatsAppGroup,
  onOpenEmail,
  onOpenAgency,
  onRemoveSelected,
}: TransportListDesktopActionsProps) {
  const drivers = [...new Set(services.filter(s => selectedRows.has(s.id)).map(s => s.driver).filter(Boolean))];

  return (
    <div className="hidden md:flex items-center gap-2 flex-wrap">
      <button
        onClick={onToggleRoles}
        className={`flex items-center gap-1 text-[12px] px-2 py-1 rounded border transition-colors cursor-pointer ${
          showRoles
            ? 'bg-primary/10 border-primary text-primary'
            : 'border-outline-variant text-on-surface-variant hover:border-primary'
        }`}
      >
        {showRoles ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        Roles
      </button>

      <button
        onClick={onToggleViewMode}
        className={`flex items-center gap-1 text-[12px] px-2 py-1 rounded border transition-colors cursor-pointer ${
          viewMode === 'grouped'
            ? 'bg-primary/10 border-primary text-primary'
            : 'border-outline-variant text-on-surface-variant hover:border-primary'
        }`}
        title={viewMode === 'grouped' ? 'Vista agrupada (movements como sub-filas)' : 'Vista plana (una fila por servicio)'}
      >
        {viewMode === 'grouped' ? <ListTree className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
        {viewMode === 'grouped' ? 'Agrupada' : 'Plana'}
      </button>
      {viewMode === 'grouped' && (
        <>
          <button onClick={onExpandAll} className="text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer" title="Expand all">
            Expand
          </button>
          <button onClick={onCollapseAll} className="text-[11px] text-primary hover:text-primary-hover font-medium cursor-pointer" title="Collapse all">
            Collapse
          </button>
        </>
      )}

      <button
        onClick={onExportPdf}
        disabled={selectedCount === 0}
        className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-3.5 h-3.5" />
        PDF
      </button>

      <button
        onClick={onPrint}
        disabled={selectedCount === 0}
        className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Printer className="w-3.5 h-3.5" />
        Print
      </button>

      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExportMenu(); }}
          disabled={selectedCount === 0 || isExporting}
          className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
          {isExporting ? 'Exporting...' : 'Excel'}
          {!isExporting && <ChevronDown className="w-3 h-3" />}
        </button>
        {showExportMenu && (
          <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-50 py-1 min-w-[180px]">
            <button
              onClick={onExportExcel}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export as Excel
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWhatsAppMenu(); }}
          disabled={selectedCount === 0}
          className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          WhatsApp
          <ChevronDown className="w-3 h-3" />
        </button>
        {showWhatsAppMenu && (
          <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-50 py-1 min-w-[200px]">
            {drivers.map((driver: string) => (
              <button
                key={driver}
                onClick={() => onWhatsAppDriver(driver)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                Send to {driver}
              </button>
            ))}
            {drivers.length > 0 && <div className="border-t border-outline-variant my-1"></div>}
            <button
              onClick={onWhatsAppGroup}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Copy for Group
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onOpenEmail}
        disabled={selectedCount === 0}
        className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Mail className="w-3.5 h-3.5" />
        Email
      </button>

      <button
        onClick={onOpenAgency}
        disabled={selectedCount === 0}
        className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Building2 className="w-3.5 h-3.5" />
        Agency
      </button>

      {selectedCount > 0 && (
        <button
          onClick={onRemoveSelected}
          className="flex items-center gap-1 text-[12px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove ({selectedCount})
        </button>
      )}
    </div>
  );
}
