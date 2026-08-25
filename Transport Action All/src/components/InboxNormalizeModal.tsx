import React from 'react';
import { Send, Edit3, X } from 'lucide-react';
import { NormalizedFields } from './ReportInboxScreen';

const getSourceBadge = (source: string) => {
  switch (source) {
    case 'whatsapp': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">WhatsApp</span>;
    case 'driverlink': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Driver Link</span>;
    case 'backoffice': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Backoffice</span>;
    default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100">{source}</span>;
  }
};

interface ServiceRef {
  id: string;
  time: string;
  production: string;
  section: string;
  passengerName: string;
  passengerRole: string;
  vehicleId: string;
  operationalStatus: string;
  driverId: string;
  date: string;
}

interface InboxItem {
  ID: string;
  Source: string;
  Channel: string;
  DriverID: string;
  ProjectID: string;
  ServiceDate: string;
  RawData: string;
  NormalizedData: string;
  Status: string;
  CorrelationID: string;
  ReviewedBy: string;
  ReviewedAt: string;
  RejectionReason: string;
  CreatedAt: string;
  UpdatedAt: string;
}

interface InboxNormalizeModalProps {
  item: InboxItem;
  normForm: NormalizedFields;
  onNormFormChange: (form: NormalizedFields) => void;
  serviceRef: ServiceRef | null;
  matchingServices: any[];
  isSearchingServices: boolean;
  onClose: () => void;
  onQuickApprove: (id: string) => void;
  onNormalize: (id: string) => void;
  isSaving: boolean;
  canNormalize: boolean;
  driverName: (id: string, item?: InboxItem) => string;
  projectName: (id: string, item?: InboxItem) => string;
  formatDisplayDate: (d: string) => string;
  getFieldDiff: (driverValue: string | number, refValue: string | number | undefined) => boolean;
  getRawData: (item: InboxItem) => any;
}

export default function InboxNormalizeModal({
  item, normForm, onNormFormChange, serviceRef, matchingServices, isSearchingServices,
  onClose, onQuickApprove, onNormalize, isSaving, canNormalize,
  driverName, projectName, formatDisplayDate, getFieldDiff, getRawData,
}: InboxNormalizeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-outline-variant shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-on-surface">Review Driver Submission</h2>
            <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5 truncate">
              Compare driver input with transport list reference
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 hover:bg-surface-container rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-3 bg-surface-container flex flex-wrap gap-2 sm:gap-4 text-xs shrink-0">
          <div><span className="text-on-surface-variant">Source:</span> {getSourceBadge(item.Source)}</div>
          <div><span className="text-on-surface-variant">Driver:</span> <strong>{driverName(item.DriverID, item)}</strong></div>
          <div className="hidden sm:block"><span className="text-on-surface-variant">Project:</span> {projectName(item.ProjectID, item)}</div>
          <div><span className="text-on-surface-variant">Date:</span> {formatDisplayDate(item.ServiceDate)}</div>
        </div>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0">
          {(serviceRef || getRawData(item).production) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">
                Transport List Reference
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {serviceRef?.time && (
                  <div>
                    <span className="text-blue-600">Time:</span>{' '}
                    <strong className="font-mono">{serviceRef.time}</strong>
                  </div>
                )}
                <div>
                  <span className="text-blue-600">Production:</span>{' '}
                  {serviceRef?.production || getRawData(item).production || '—'}
                </div>
                {(serviceRef?.section || getRawData(item).section) && (
                  <div>
                    <span className="text-blue-600">Section:</span>{' '}
                    {serviceRef?.section || getRawData(item).section}
                  </div>
                )}
                {(serviceRef?.passengerName || getRawData(item).passengerName) && (
                  <div>
                    <span className="text-blue-600">Passenger:</span>{' '}
                    {serviceRef?.passengerName || getRawData(item).passengerName}
                    {serviceRef?.passengerRole && ` (${serviceRef.passengerRole})`}
                  </div>
                )}
                {serviceRef?.operationalStatus && (
                  <div>
                    <span className="text-blue-600">Status:</span> {serviceRef.operationalStatus}
                  </div>
                )}
                {(serviceRef?.vehicleId || getRawData(item).vehicleId) && (
                  <div>
                    <span className="text-blue-600">Vehicle:</span>{' '}
                    {serviceRef?.vehicleId || getRawData(item).vehicleId}
                  </div>
                )}
              </div>
            </div>
          )}

          {item.Source === 'whatsapp' && !serviceRef && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">
                Select Service (Required)
              </div>
              {isSearchingServices ? (
                <p className="text-xs text-amber-600">Searching for matching services...</p>
              ) : matchingServices.length > 0 ? (
                <select
                  value={normForm.serviceId}
                  onChange={e => onNormFormChange({ ...normForm, serviceId: e.target.value })}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white"
                >
                  <option value="">— Select a service —</option>
                  {matchingServices.map((s: any) => {
                    const dateLabel = s.date ? new Date(s.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '?';
                    const st = s.operationalStatus || s.status || '';
                    return (
                      <option key={s.id} value={s.id}>
                        {dateLabel} | {s.time || '—'} | {st} | {s.production || 'No production'} | {s.passengerName || 'No passenger'}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <p className="text-xs text-amber-600">No services found for this driver.</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-2">
              Driver Input (editable)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">
                  Start Time
                  {serviceRef?.time && getFieldDiff(normForm.startTime, serviceRef.time) && (
                    <span className="ml-1 text-amber-600"> diff</span>
                  )}
                </label>
                <input
                  type="time"
                  value={normForm.startTime}
                  onChange={e => onNormFormChange({ ...normForm, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">End Time</label>
                <input
                  type="time"
                  value={normForm.endTime}
                  onChange={e => onNormFormChange({ ...normForm, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">KM Total</label>
                <input
                  type="number"
                  value={normForm.kmTotal}
                  onChange={e => onNormFormChange({ ...normForm, kmTotal: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">KM Over</label>
                <input
                  type="number"
                  value={normForm.kmOver}
                  onChange={e => onNormFormChange({ ...normForm, kmOver: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                  min={0}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-on-surface-variant mb-1">Diaria</label>
              <select
                value={normForm.diariaType}
                onChange={e => onNormFormChange({ ...normForm, diariaType: e.target.value as NormalizedFields['diariaType'] })}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
              >
                <option value="none">Nessuna</option>
                <option value="piena">Piena</option>
                <option value="mezza">Mezza</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-on-surface-variant mb-1">Notes</label>
              <textarea
                value={normForm.notes}
                onChange={e => onNormFormChange({ ...normForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm resize-none"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          {item.RawData && (
            <details className="mt-3">
              <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface font-medium">
                Raw data from driver submission
              </summary>
              <pre className="mt-2 p-3 bg-surface-container rounded-lg text-xs overflow-x-auto max-h-32 font-mono">
                {JSON.stringify(getRawData(item), null, 2)}
              </pre>
            </details>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-outline-variant flex flex-col sm:flex-row gap-3 shrink-0">
          {canNormalize && (
            <>
              <button
                onClick={() => onQuickApprove(item.ID)}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-semibold"
              >
                <Send className="w-4 h-4" />
                {isSaving ? 'Processing...' : 'Normalize & Send'}
              </button>
              <button
                onClick={() => onNormalize(item.ID)}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                <Edit3 className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Normalize Only'}
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
