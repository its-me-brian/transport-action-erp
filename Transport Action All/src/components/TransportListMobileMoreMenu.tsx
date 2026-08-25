import React from 'react';
import {
  Eye, EyeOff, Download, Printer, FileSpreadsheet, MessageSquare,
  Mail, Building2, Trash2, MoreVertical
} from 'lucide-react';

interface TransportListMobileMoreMenuProps {
  showMoreMenu: boolean;
  showRoles: boolean;
  selectedCount: number;
  isExporting: boolean;
  onToggleMenu: () => void;
  onToggleRoles: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  onExportExcel: () => void;
  onWhatsAppGroup: () => void;
  onOpenEmail: () => void;
  onOpenAgency: () => void;
  onRemoveSelected: () => void;
}

export default function TransportListMobileMoreMenu({
  showMoreMenu,
  showRoles,
  selectedCount,
  isExporting,
  onToggleMenu,
  onToggleRoles,
  onExportPdf,
  onPrint,
  onExportExcel,
  onWhatsAppGroup,
  onOpenEmail,
  onOpenAgency,
  onRemoveSelected,
}: TransportListMobileMoreMenuProps) {
  return (
    <div className="md:hidden relative">
      <button
        onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
        className="flex items-center gap-1 text-[12px] px-2 py-1.5 rounded border border-outline-variant text-on-surface-variant hover:border-primary transition-colors cursor-pointer"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {showMoreMenu && (
        <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl z-50 py-1 min-w-[200px]">
          <button
            onClick={() => { onToggleRoles(); onToggleMenu(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer"
          >
            {showRoles ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4" />}
            {showRoles ? 'Hide Roles' : 'Show Roles'}
          </button>
          <button
            onClick={() => { onExportPdf(); onToggleMenu(); }}
            disabled={selectedCount === 0}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={() => { onPrint(); onToggleMenu(); }}
            disabled={selectedCount === 0}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print Preview
          </button>
          <button
            onClick={() => { onExportExcel(); onToggleMenu(); }}
            disabled={selectedCount === 0 || isExporting}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <div className="border-t border-outline-variant my-1"></div>
          <button
            onClick={() => { onWhatsAppGroup(); onToggleMenu(); }}
            disabled={selectedCount === 0}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <MessageSquare className="w-4 h-4" />
            Copy WhatsApp Group
          </button>
          <button
            onClick={() => { onOpenEmail(); onToggleMenu(); }}
            disabled={selectedCount === 0}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-on-surface hover:bg-surface-dim transition-colors cursor-pointer disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            Send Email
          </button>
          <button
            onClick={() => { onOpenAgency(); onToggleMenu(); }}
            disabled={selectedCount === 0}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Building2 className="w-4 h-4" />
            Send to Agency
          </button>
          {selectedCount > 0 && (
            <>
              <div className="border-t border-outline-variant my-1"></div>
              <button
                onClick={() => { onRemoveSelected(); onToggleMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Remove ({selectedCount})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
