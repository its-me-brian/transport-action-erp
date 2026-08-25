import React, { useState } from 'react';
import {
  ChevronRight, Phone, User, Calendar,
  CheckCircle, Clock, AlertCircle, Link2, FileText,
  ArrowLeftRight, Car
} from 'lucide-react';
import { Service, ScreenId, formatTimeDisplay, parseDateKeyToDate } from '../types';
import { RelatedData } from '../hooks/useRelatedData';
import { getServiceStatusColor } from '../utils/statusColors';

// ============================================================================
// TAB: OVERVIEW
// ============================================================================

export function OverviewTab({ service }: { service: Service }) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dateObj = parseDateKeyToDate(service.date);
  const displayDate = dateObj ? `${dayNames[dateObj.getDay()]}, ${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}` : service.date;

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Date & Time */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-on-surface-variant" />
          <span className="text-[13px] text-on-surface">{displayDate}</span>
        </div>
        {service.startTime && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-on-surface-variant" />
            <span className="text-[13px] text-on-surface">{formatTimeDisplay(service.startTime)}</span>
            {service.endTime && (
              <span className="text-[12px] text-on-surface-variant">→ {formatTimeDisplay(service.endTime)}</span>
            )}
          </div>
        )}
      </div>

      {/* Route */}
      {(service.from || service.to) && (
        <div className="space-y-2">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Route</span>
          {service.from && (
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
              <span className="text-[13px] text-on-surface">{service.from}</span>
            </div>
          )}
          {service.to && (
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <span className="text-[13px] text-on-surface">{service.to}</span>
            </div>
          )}
        </div>
      )}

      {/* Passengers */}
      {service.passengers && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Passengers</span>
          <div className="text-[13px] text-on-surface">{service.passengers}</div>
        </div>
      )}

      {/* Vehicle & Service Type */}
      <div className="flex gap-4">
        {service.vehicleType && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Vehicle</span>
            <div className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-on-surface-variant" />
              <span className="text-[13px] text-on-surface">{service.vehicleType}</span>
            </div>
          </div>
        )}
        {service.serviceType && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Type</span>
            <div className="text-[13px] text-on-surface">{service.serviceType}</div>
          </div>
        )}
      </div>

      {/* Flight Info */}
      {service.flightInfo && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Flight</span>
          <div className="text-[13px] text-on-surface">{service.flightInfo}</div>
        </div>
      )}

      {/* Notes */}
      {service.notes && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Notes</span>
          <div className="text-[13px] text-on-surface-variant whitespace-pre-wrap">{service.notes}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: MOVEMENTS
// ============================================================================

export function MovementsTab({ service }: { service: Service }) {
  const movements = service.movements || [];
  const statusColor = getServiceStatusColor(service);

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
          Schedules {movements.length > 0 && `(${movements.length})`}
        </span>
      </div>

      {movements.length > 0 ? (
        <div className="relative">
          {movements.length > 1 && (
            <div className="absolute left-[5px] top-[7px] bottom-[7px] w-px bg-outline-variant/50" />
          )}
          {movements.map((m, idx) => {
            const pax = m.passengers?.map((p: any) => p.name).join(', ') || '';
            const from = m.pickupLines?.[0] || '';
            const to = m.dropoffLines?.[0] || '';
            const isLast = idx === movements.length - 1;
            return (
              <div key={idx} className={`flex gap-3 items-start ${!isLast ? 'pb-4' : ''}`}>
                <div className="relative z-10 shrink-0 mt-[5px]">
                  <div className="w-[11px] h-[11px] rounded-full border-2 border-surface-container-lowest" style={{ backgroundColor: statusColor.hex }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-on-surface tabular-nums">{formatTimeDisplay(m.time)}</span>
                    {from && <span className="text-[10px] font-medium text-primary/70 bg-primary/5 px-1.5 py-px rounded">Pickup</span>}
                    {to && !from && <span className="text-[10px] font-medium text-on-surface-variant/60 bg-surface-container px-1.5 py-px rounded">Drop-off</span>}
                  </div>
                  {(from || to) && (
                    <div className="text-[12px] text-on-surface mt-0.5 truncate">{from || to}</div>
                  )}
                  {from && to && (
                    <div className="text-[11px] text-on-surface-variant/60 mt-0.5">↓</div>
                  )}
                  {from && to && (
                    <>
                      <div className="text-[12px] text-on-surface mt-0.5 truncate">{to}</div>
                      <span className="text-[10px] font-medium text-on-surface-variant/60 bg-surface-container px-1.5 py-px rounded inline-block mt-0.5">Drop-off</span>
                    </>
                  )}
                  {pax && <div className="text-[11px] text-on-surface-variant mt-1 truncate">{pax}</div>}
                </div>
                <ChevronRight className="w-4 h-4 text-on-surface-variant/30 shrink-0 mt-[5px]" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[12px] text-on-surface-variant/50 py-4 text-center">No schedule data</div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: DRIVER
// ============================================================================

export function DriverTab({ service }: { service: Service }) {
  return (
    <div className="px-5 py-4 space-y-4">
      {service.driverName && service.driverName !== 'Unassigned' ? (
        <>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-[18px] font-bold text-primary">
              {service.driverName?.charAt(0) || '?'}
            </div>
            <div>
              <div className="text-[15px] font-semibold text-on-surface">{service.driverName}</div>
              {service.driverPhone && (
                <a href={`tel:${service.driverPhone}`} className="text-[13px] text-primary hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {service.driverPhone}
                </a>
              )}
            </div>
          </div>
          {service.vehiclePlate && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Vehicle Plate</span>
              <div className="text-[13px] text-on-surface font-mono">{service.vehiclePlate}</div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <User className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No driver assigned</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: DRIVER LINK
// ============================================================================

export function DriverLinkTab({ service, driverLink, onNavigate }: {
  service: Service;
  driverLink: any | null;
  onNavigate?: (screen: ScreenId) => void;
}) {
  return (
    <div className="px-5 py-4 space-y-4">
      {driverLink ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-on-surface">Driver Link</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              driverLink.active !== false ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {driverLink.active !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="text-[12px] text-on-surface-variant">
            Link token: {driverLink.linkToken || '—'}
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('driver_links')}
              className="text-[12px] text-primary hover:underline"
            >
              View all Driver Links →
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <Link2 className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No Driver Link for this service</div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('driver_links')}
              className="mt-2 text-[12px] text-primary hover:underline"
            >
              Create Driver Link →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: DRIVER REPORT
// ============================================================================

export function DriverReportTab({ service, driverReport, onNavigate }: {
  service: Service;
  driverReport: any | null;
  onNavigate?: (screen: ScreenId) => void;
}) {
  return (
    <div className="px-5 py-4 space-y-4">
      {driverReport ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-on-surface">Driver Report</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              driverReport.status === 'Aceptado' || driverReport.Status === 'Aceptado'
                ? 'bg-green-100 text-green-700'
                : driverReport.status === 'Pendiente' || driverReport.Status === 'Pendiente'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
            }`}>
              {driverReport.status || driverReport.Status || 'Unknown'}
            </span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('driver_reports')}
              className="text-[12px] text-primary hover:underline"
            >
              View all Reports →
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <CheckCircle className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No report submitted yet</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: WHATSAPP
// ============================================================================

export function WhatsAppTab({ service }: { service: Service }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    // TODO: Implement WhatsApp send via backend
    setTimeout(() => {
      setSending(false);
      setMessage('');
    }, 1000);
  };

  return (
    <div className="px-5 py-4 space-y-4">
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Send WhatsApp</span>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="w-full h-24 px-3 py-2 text-[13px] bg-surface-container rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="w-full py-2 bg-green-600 text-white text-[13px] font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Sending...' : 'Send via WhatsApp'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: RECONCILIATION
// ============================================================================

export function ReconciliationTab({ service, reconciliation, onNavigate }: {
  service: Service;
  reconciliation: any | null;
  onNavigate?: (screen: ScreenId) => void;
}) {
  return (
    <div className="px-5 py-4 space-y-4">
      {reconciliation ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-on-surface">Reconciliation</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completed</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('reconciliation')}
              className="text-[12px] text-primary hover:underline"
            >
              View Reconciliation →
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <ArrowLeftRight className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
          <div className="text-[13px] text-on-surface-variant">No reconciliation yet</div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('reconciliation')}
              className="mt-2 text-[12px] text-primary hover:underline"
            >
              Create Reconciliation →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: RAPPORTINO
// ============================================================================

export function RapportinoTab({ service, onNavigate }: {
  service: Service;
  onNavigate?: (screen: ScreenId) => void;
}) {
  return (
    <div className="px-5 py-4 space-y-4">
      <div className="text-center py-8">
        <FileText className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
        <div className="text-[13px] text-on-surface-variant">Add this service to a Rapportino</div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('rapportinos')}
            className="mt-2 text-[12px] text-primary hover:underline"
          >
            Open Rapportinos →
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: HISTORY
// ============================================================================

export function HistoryTab({ service }: { service: Service }) {
  return (
    <div className="px-5 py-4 space-y-4">
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
        <div className="text-[13px] text-on-surface-variant">Service history and audit trail</div>
        <div className="text-[11px] text-on-surface-variant/60 mt-1">Coming soon</div>
      </div>
    </div>
  );
}
