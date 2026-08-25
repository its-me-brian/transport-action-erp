import React from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Service, formatTimeDisplay } from '../types';

interface ParsedReport {
  driverName: string;
  dateParsed?: string;
  date?: string;
  start?: string;
  end?: string;
  kmTotal?: number;
  kmOver?: number;
  diariaType?: string;
}

interface WhatsAppParserSectionProps {
  whatsappText: string;
  onWhatsappTextChange: (text: string) => void;
  parsedReports: ParsedReport[];
  showSection: boolean;
  onToggleSection: (show: boolean) => void;
  matchedServices: Map<number, Service[]>;
  onParse: () => void;
  onApplyToService: (reportIdx: number, service: Service) => void;
  applyingReport: number | null;
}

export default function WhatsAppParserSection({
  whatsappText,
  onWhatsappTextChange,
  parsedReports,
  showSection,
  onToggleSection,
  matchedServices,
  onParse,
  onApplyToService,
  applyingReport
}: WhatsAppParserSectionProps) {
  return (
    <section className="bg-surface-container-low rounded-xl border border-outline-variant">
      <button 
        onClick={() => onToggleSection(!showSection)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <span className="text-[14px] font-semibold text-on-surface">WhatsApp Driver Reports</span>
          {parsedReports.length > 0 && (
            <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {parsedReports.length} parsed
            </span>
          )}
        </div>
        {showSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {showSection && (
        <div className="px-4 pb-4 space-y-3 border-t border-outline-variant">
          <p className="text-[12px] text-on-surface-variant pt-3">
            Paste driver WhatsApp reports. The system will search for matching services by date and driver name.
          </p>
          
          <textarea
            value={whatsappText}
            onChange={e => onWhatsappTextChange(e.target.value)}
            className="w-full bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none font-mono"
            rows={5}
            placeholder={`Example:
Isidoro dragone
22/7/26
Inizio 8:30
Fine 18:30
Km tot 488
Km over 388
Diaria piena`}
          />
          
          <button
            onClick={onParse}
            disabled={!whatsappText.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-[13px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Parse & Match Services
          </button>

          {parsedReports.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-on-surface-variant">
                Found {parsedReports.length} report{parsedReports.length > 1 ? 's' : ''}:
              </p>
              
              {parsedReports.map((report, idx) => {
                const matches = matchedServices.get(idx) || [];
                const diariaLabel = report.diariaType === 'piena' ? 'Piena' : 
                                   report.diariaType === 'mezza' ? 'Mezza' : 'None';
                
                return (
                  <div key={idx} className="bg-surface-dim rounded-lg p-3 border border-outline-variant">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[14px] font-medium text-on-surface">{report.driverName}</span>
                        <span className="text-[12px] text-on-surface-variant ml-2">{report.dateParsed || report.date}</span>
                      </div>
                      {matches.length > 0 && (
                        <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                          {matches.length} match{matches.length > 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] mb-2">
                      <div><span className="text-on-surface-variant">Inizio:</span> <span className="font-medium">{report.start || '—'}</span></div>
                      <div><span className="text-on-surface-variant">Fine:</span> <span className="font-medium">{report.end || '—'}</span></div>
                      <div><span className="text-on-surface-variant">Km:</span> <span className="font-medium">{report.kmTotal}</span></div>
                      <div><span className="text-on-surface-variant">Km Over:</span> <span className="font-medium text-amber-600">{report.kmOver}</span></div>
                      <div><span className="text-on-surface-variant">Diaria:</span> <span className="font-medium">{diariaLabel}</span></div>
                    </div>
                    
                    {matches.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-outline-variant/50">
                        <p className="text-[11px] text-on-surface-variant font-medium">Matching services:</p>
                        {matches.map(service => (
                          <div key={service.id} className="bg-surface rounded-lg px-3 py-2 border border-outline-variant/30">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-bold text-primary">{formatTimeDisplay(service.time)}</span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  service.status === 'Completed' ? 'bg-primary/10 text-primary'
                                  : service.status === 'In Transit' ? 'bg-secondary-container text-on-secondary-container'
                                  : service.status === 'In Progress' ? 'bg-amber-100 text-amber-800'
                                  : 'bg-surface-container text-on-surface-variant'
                                }`}>{service.status}</span>
                              </div>
                              <button
                                onClick={() => onApplyToService(idx, service)}
                                disabled={applyingReport === idx}
                                className="text-[11px] bg-primary text-on-primary px-2.5 py-1 rounded hover:bg-primary-hover transition-colors disabled:opacity-50 shrink-0"
                              >
                                {applyingReport === idx ? '...' : 'Apply'}
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-on-surface mb-0.5">
                              <span className="font-medium">{service.driverName || 'Unassigned'}</span>
                              <span className="text-on-surface-variant">·</span>
                              <span className="text-on-surface-variant">{service.vehicleType || '—'}</span>
                              {service.vehiclePlate && (
                                <>
                                  <span className="text-on-surface-variant">·</span>
                                  <span className="text-on-surface-variant">{service.vehiclePlate}</span>
                                </>
                              )}
                            </div>
                            <div className="text-[11px] text-on-surface-variant truncate">
                              {service.from || '—'} → {service.to || '—'}
                            </div>
                            {service.passengers && service.passengers.length > 0 && (
                              <div className="text-[10px] text-on-surface-variant mt-0.5 truncate">
                                👤 {service.passengers}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {matches.length === 0 && (
                      <p className="text-[11px] text-amber-600 pt-2 border-t border-outline-variant/50">
                        ⚠ No matching services found for this date/driver
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
