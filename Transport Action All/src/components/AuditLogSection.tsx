import React from 'react';
import { History } from 'lucide-react';
import { AuditEntry } from '../services/api';

interface AuditLogSectionProps {
  auditLogs: AuditEntry[];
  isLoadingLogs: boolean;
  logFilter: string;
  onLogFilterChange: (v: string) => void;
  filteredLogs: AuditEntry[];
}

export default function AuditLogSection({
  auditLogs,
  isLoadingLogs,
  logFilter,
  onLogFilterChange,
  filteredLogs
}: AuditLogSectionProps) {
  return (
    <section id="audit-log-section" className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h3 className="text-[14px] font-semibold text-on-surface">Audit Log</h3>
        </div>
        <input
          type="text"
          value={logFilter}
          onChange={(e) => onLogFilterChange(e.target.value)}
          placeholder="Filter logs..."
          aria-label="Filter logs"
          className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-[12px] focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-48"
        />
      </div>
      
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
        {isLoadingLogs ? (
          <div className="overflow-hidden">
            <table className="w-full text-[11px]">
              <thead className="bg-surface-dim">
                <tr className="border-b border-outline-variant">
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Time</th>
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">User</th>
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Action</th>
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Entity</th>
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Details</th>
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="border-b border-outline-variant/50 animate-pulse">
                    <td className="px-3 py-2"><div className="h-3 bg-surface-container-highest rounded w-16" /></td>
                    <td className="px-3 py-2"><div className="h-3 bg-surface-container-highest rounded w-14" /></td>
                    <td className="px-3 py-2"><div className="h-3 bg-surface-container-highest rounded w-20" /></td>
                    <td className="px-3 py-2"><div className="h-3 bg-surface-container-highest rounded w-16" /></td>
                    <td className="px-3 py-2"><div className="h-3 bg-surface-container-highest rounded w-24" /></td>
                    <td className="px-3 py-2"><div className="h-3 bg-surface-container-highest rounded w-20" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-[13px]">
            {logFilter ? 'No matching logs found' : 'No audit logs yet'}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-surface-dim">
                <tr className="border-b border-outline-variant">
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Time</th>
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">User</th>
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Action</th>
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Entity</th>
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Details</th>
                  <th className="text-left px-3 py-2 font-medium text-on-surface-variant">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => (
                  <tr key={i} className="border-b border-outline-variant/50 hover:bg-surface-dim/50">
                    <td className="px-3 py-1.5 text-on-surface-variant whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="font-medium text-on-surface">{log.user || '-'}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        (log.action || '').includes('DELETE') ? 'bg-red-50 text-red-700' :
                        (log.action || '').includes('APPROVE') ? 'bg-green-50 text-green-700' :
                        (log.action || '').includes('REJECT') ? 'bg-orange-50 text-orange-700' :
                        (log.action || '').includes('LOGIN') ? 'bg-blue-50 text-blue-700' :
                        (log.action || '').includes('REGISTER') ? 'bg-purple-50 text-purple-700' :
                        'bg-surface-container text-on-surface-variant'
                      }`}>
                        {log.action || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-on-surface-variant">
                      {log.entity}{log.entityId ? ` #${log.entityId}` : ''}
                    </td>
                    <td className="px-3 py-1.5 text-on-surface-variant">
                      {log.field && (
                        <span>
                          {log.field}: <span className="line-through text-red-500">{log.oldValue}</span> → <span className="text-green-600">{log.newValue}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-on-surface-variant max-w-[200px] truncate">
                      {log.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[10px] text-on-surface-variant">
        Showing {filteredLogs.length} of {auditLogs.length} entries
      </p>
    </section>
  );
}
