import React from 'react';
import { Printer, X } from 'lucide-react';
import { TransportService, Passenger, passengerRolesDisplay } from '../../services/api';
import { PrintService } from './PrintService';
import { PrintHeader } from './PrintHeader';
import { PrintFooter } from './PrintFooter';
import { getSectionStyle } from './sectionStyles';

interface PrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  services: TransportService[];
  selectedIds: Set<string>;
  // Metadata
  production: string;
  projectName: string;
  transportCompany: string;
  dateStr: string;
  footerContacts: { name: string; role: string; phone: string; email: string }[];
}

export function PrintPreview({
  isOpen,
  onClose,
  onPrint,
  services,
  selectedIds,
  production,
  projectName,
  transportCompany,
  dateStr,
  footerContacts
}: PrintPreviewProps) {
  if (!isOpen) return null;

  const selected = services.filter(s => selectedIds.has(s.id));

  // Group by section
  const sectionMap = new Map<string, TransportService[]>();
  const noSection: TransportService[] = [];
  for (const svc of selected) {
    const sec = svc.section || '';
    if (!sec) {
      noSection.push(svc);
    } else {
      if (!sectionMap.has(sec)) sectionMap.set(sec, []);
      sectionMap.get(sec)!.push(svc);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex flex-col">
      {/* Toolbar — hidden in print */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-outline-variant print:hidden">
        <div className="flex items-center gap-3">
          <Printer className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-on-surface text-[14px]">Print Preview</h3>
            <p className="text-on-surface-variant text-[11px]">
              {selected.length} services · Choose "Save as PDF" in print dialog
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Print content — this is what gets printed */}
      <div className="flex-1 overflow-y-auto bg-gray-200 p-4">
        <div id="print-area" className="bg-white mx-auto shadow-lg" style={{ maxWidth: '1100px' }}>
          {/* Header: Production | Project Name | Transport Company */}
          <PrintHeader
            production={production}
            projectName={projectName}
            transportCompany={transportCompany}
            dateStr={dateStr}
          />

          {/* Services — CSS grid, not HTML table */}
          <div className="print-services-grid" style={{
            display: 'grid',
            gridTemplateColumns: '11% 16% 6% 27% 20% 20%',
            border: '2px solid #000',
            marginTop: '4px'
          }}>
            {/* Column headers */}
            <div className="print-col-header" style={{ background: '#1a1a2e', color: '#fff', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', padding: '6px 8px', border: '1px solid #000' }}>Vehicle</div>
            <div className="print-col-header" style={{ background: '#1a1a2e', color: '#fff', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', padding: '6px 8px', border: '1px solid #000' }}>Driver</div>
            <div className="print-col-header" style={{ background: '#1a1a2e', color: '#fff', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', padding: '6px 8px', border: '1px solid #000' }}>Time</div>
            <div className="print-col-header" style={{ background: '#1a1a2e', color: '#fff', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', padding: '6px 8px', border: '1px solid #000' }}>Passengers</div>
            <div className="print-col-header" style={{ background: '#1a1a2e', color: '#fff', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', padding: '6px 8px', border: '1px solid #000' }}>From</div>
            <div className="print-col-header" style={{ background: '#1a1a2e', color: '#fff', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', padding: '6px 8px', border: '1px solid #000' }}>To</div>

            {/* Section groups */}
            {sectionMap.size > 0 && Array.from(sectionMap.entries()).map(([secName, secServices]) => (
              <React.Fragment key={`section-${secName}`}>
                {/* Section separator — full width */}
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '4px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    border: '1px solid #000',
                    ...getSectionStyle(secName)
                  }}
                >
                  {secName}
                </div>
                {/* Services in this section */}
                {secServices.map(svc => (
                  <PrintService key={svc.id} service={svc} />
                ))}
              </React.Fragment>
            ))}

            {/* Services without section */}
            {noSection.map(svc => (
              <PrintService key={svc.id} service={svc} />
            ))}
          </div>

          {/* Footer: Arrivals & Departures + Contacts */}
          <PrintFooter contacts={footerContacts} />
        </div>
      </div>
    </div>
  );
}
