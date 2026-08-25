import React from 'react';
import { Mail, Send, X, Loader2 } from 'lucide-react';

interface TransportListEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  recipients: string;
  subject: string;
  dateStr: string;
  selectedCount: number;
  isSending: boolean;
  onRecipientsChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
}

export default function TransportListEmailModal({
  isOpen,
  onClose,
  onSend,
  recipients,
  subject,
  dateStr,
  selectedCount,
  isSending,
  onRecipientsChange,
  onSubjectChange,
}: TransportListEmailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <h3 className="font-semibold text-on-surface flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Send Transport List by Email
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
              Recipients (comma separated)
            </label>
            <input
              type="text"
              value={recipients}
              onChange={(e) => onRecipientsChange(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder={`Transport List — ${dateStr || 'Today'}`}
              className="w-full px-3 py-2 text-[13px] border border-outline-variant rounded-lg bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="text-[12px] text-on-surface-variant">
            {selectedCount} servicios serán incluidos como adjunto Excel
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-outline-variant">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] font-medium border border-outline-variant rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={isSending || !recipients.trim()}
            className="px-3 py-1.5 text-[12px] font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
}
