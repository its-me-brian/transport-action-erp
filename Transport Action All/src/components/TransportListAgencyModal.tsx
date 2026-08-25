import React from 'react';
import { Building2, Mail, MessageSquare, X, Loader2 } from 'lucide-react';
import { TransportService, passengerDisplay, pickupDisplay, dropoffDisplay, Agency } from '../services/api';

interface TransportListAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencies: Agency[];
  agencyServices: TransportService[];
  selectedAgency: Agency | null;
  agencyNotes: string;
  loadingAgencies: boolean;
  isSending: boolean;
  onAgencyChange: (agency: Agency | null) => void;
  onNotesChange: (v: string) => void;
  onRemoveService: (id: string) => void;
  onSendWhatsApp: () => void;
  onSendEmail: () => void;
}

export default function TransportListAgencyModal({
  isOpen,
  onClose,
  agencies,
  agencyServices,
  selectedAgency,
  agencyNotes,
  loadingAgencies,
  isSending,
  onAgencyChange,
  onNotesChange,
  onRemoveService,
  onSendWhatsApp,
  onSendEmail,
}: TransportListAgencyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <h3 className="font-semibold text-on-surface flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Send Services to Agency
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-on-surface-variant hover:text-on-surface cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Select Agency</label>
            {loadingAgencies ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-9 bg-surface-container-highest rounded-lg" />
                ))}
              </div>
            ) : agencies.length === 0 ? (
              <div className="text-[12px] text-amber-600 py-2">
                No agencies configured. Add them in the Agencies sheet.
              </div>
            ) : (
              <select
                value={selectedAgency?.name || ''}
                onChange={(e) => {
                  const agency = agencies.find(a => a.name === e.target.value);
                  onAgencyChange(agency || null);
                }}
                className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Select an agency...</option>
                {agencies.map(agency => (
                  <option key={agency.name} value={agency.name}>
                    {agency.name} — {agency.contactPerson || agency.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
              Services to send ({agencyServices.length})
            </label>
            <div className="border border-outline-variant rounded-lg max-h-[200px] overflow-y-auto">
              {agencyServices.length === 0 ? (
                <div className="text-[12px] text-on-surface-variant p-3 text-center">No services selected</div>
              ) : (
                agencyServices.map((service) => (
                  <div key={service.id} className="px-3 py-2 border-b border-outline-variant/50 last:border-0 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{service.time} — {service.vehicle}</span>
                      <button
                        onClick={() => onRemoveService(service.id)}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-on-surface-variant">{passengerDisplay(service.passengers)}</div>
                    <div className="text-on-surface-variant text-[11px]">{pickupDisplay(service.pickupLines)} → {dropoffDisplay(service.dropoffLines)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Notes (optional)</label>
            <textarea
              value={agencyNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Additional notes for the agency..."
              rows={2}
              className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {selectedAgency && agencyServices.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={onSendWhatsApp}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[12px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Send via WhatsApp
              </button>
              <button
                onClick={onSendEmail}
                disabled={isSending}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[12px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Send via Email
              </button>
            </div>
          )}
        </div>
        <div className="flex justify-end px-4 py-3 border-t border-outline-variant">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] font-medium border border-outline-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
