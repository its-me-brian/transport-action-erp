import React from 'react';
import { Check, X, Lock, Send } from 'lucide-react';
import { InboxItem } from './ReportInboxScreen';

const getSourceBadge = (source: string) => {
  switch (source) {
    case 'whatsapp': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">WhatsApp</span>;
    case 'driverlink': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Driver Link</span>;
    case 'backoffice': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Backoffice</span>;
    default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100">{source}</span>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'CAPTURED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Captured</span>;
    case 'NORMALIZED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Normalized</span>;
    case 'PENDING_REVIEW': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Review</span>;
    case 'ACCEPTED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Accepted</span>;
    case 'REJECTED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
    case 'LOCKED': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Locked</span>;
    default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100">{status}</span>;
  }
};

interface InboxDetailsModalProps {
  item: InboxItem;
  rejectReason: string;
  onRejectReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmitToReview: (id: string) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onLock: (id: string) => void;
  isSaving: boolean;
  isReviewable: boolean;
  isPendingReview: boolean;
  canReview: boolean;
  driverName: (id: string, item?: InboxItem) => string;
  projectName: (id: string, item?: InboxItem) => string;
  formatDisplayDate: (d: string) => string;
}

export default function InboxDetailsModal({
  item, rejectReason, onRejectReasonChange, onClose,
  onSubmitToReview, onAccept, onReject, onLock,
  isSaving, isReviewable, isPendingReview, canReview,
  driverName, projectName, formatDisplayDate,
}: InboxDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-outline-variant shrink-0">
          <h2 className="text-base sm:text-lg font-bold">Report Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-2 text-sm mb-4 pb-4 border-b border-outline-variant overflow-y-auto flex-1 min-h-0">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Source</span>
            {getSourceBadge(item.Source)}
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Channel</span>
            <span>{item.Channel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Driver</span>
            <span className="font-medium">{driverName(item.DriverID, item)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Project</span>
            <span>{projectName(item.ProjectID, item)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Date</span>
            <span>{formatDisplayDate(item.ServiceDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Status</span>
            {getStatusBadge(item.Status)}
          </div>
        </div>

        {item.Status === 'NORMALIZED' && item.NormalizedData && (
          <div className="mb-4 px-4 sm:px-6">
            <div className="text-sm font-semibold text-on-surface mb-2">Normalized Data</div>
            <pre className="p-2 bg-surface-container rounded text-xs overflow-x-auto">
              {JSON.stringify(JSON.parse(item.NormalizedData), null, 2)}
            </pre>
          </div>
        )}

        {item.RawData && (
          <div className="mb-4 px-4 sm:px-6">
            <div className="text-sm font-semibold text-on-surface mb-2">Raw Data</div>
            <pre className="p-2 bg-surface-container rounded text-xs overflow-x-auto">
              {JSON.stringify(JSON.parse(item.RawData), null, 2)}
            </pre>
          </div>
        )}

        {item.RejectionReason && (
          <div className="text-sm mb-4 px-4 sm:px-6">
            <span className="font-semibold">Rejection Reason:</span> {item.RejectionReason}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-outline-variant shrink-0 px-4 sm:px-6 py-4">
          {isReviewable && canReview && (
            <button
              onClick={() => onSubmitToReview(item.ID)}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSaving ? 'Sending...' : 'Submit to Review'}
            </button>
          )}

          {isPendingReview && canReview && (
            <>
              <input
                type="text"
                value={rejectReason}
                onChange={e => onRejectReasonChange(e.target.value)}
                placeholder="Rejection reason..."
                className="flex-1 px-3 py-2 border border-outline-variant rounded-lg text-sm"
              />
              <button
                onClick={() => onReject(item.ID)}
                disabled={!rejectReason || isSaving}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => onLock(item.ID)}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
              </button>
              <button
                onClick={() => onAccept(item.ID)}
                disabled={isSaving}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
            </>
          )}

          {!isReviewable && !isPendingReview && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
