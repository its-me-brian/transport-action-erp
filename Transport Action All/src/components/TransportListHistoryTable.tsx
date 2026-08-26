import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { formatTimeDisplay } from '../types';
import { Skeleton } from './ui/Skeleton';

interface HistoryEntry {
  id?: string;
  fileName?: string;
  production?: string;
  importDate?: string;
  dateRange?: string;
  totalServices?: number;
  totalDrivers?: number;
  status?: string;
}

interface TransportListHistoryTableProps {
  history: HistoryEntry[];
  loadingHistory: boolean;
  viewingHistory: { entry: HistoryEntry; services: any[] } | null;
  onViewHistory: (entry: HistoryEntry) => void;
  onClosePreview: () => void;
  formatImportDate: (date?: string) => string;
  formatServiceDate: (range?: string) => string;
}

export default function TransportListHistoryTable({
  history,
  loadingHistory,
  viewingHistory,
  onViewHistory,
  onClosePreview,
  formatImportDate,
  formatServiceDate,
}: TransportListHistoryTableProps) {
  return (
    <>
      {/* History — show below upload when on upload step */}
      <div className="mt-6">
        <h3 className="text-[13px] font-semibold text-on-surface mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          Transport History
        </h3>
        {loadingHistory ? (
          <div className="border border-outline-variant rounded-lg overflow-hidden">
            <div className="hidden md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-dim text-on-surface-variant text-[11px] font-medium border-b border-outline-variant">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Production</th>
                    <th className="px-3 py-2">Services</th>
                    <th className="px-3 py-2">Drivers</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map(i => (
                    <tr key={i} className="border-b border-outline-variant/50">
                      <td className="px-3 py-2"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-3 w-28" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-3 w-24" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-3 w-12" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-3 w-12" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant text-[12px] border border-dashed border-outline-variant rounded-lg">
            No transport lists imported yet
          </div>
        ) : (
          <>
            {/* Desktop: table view */}
            <div className="hidden md:block border border-outline-variant rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-dim text-on-surface-variant text-[11px] font-medium border-b border-outline-variant">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Production</th>
                    <th className="px-3 py-2">Services</th>
                    <th className="px-3 py-2">Drivers</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] text-on-surface divide-y divide-outline-variant/50">
                  {history.slice(0, 20).map((entry) => (
                    <tr key={entry.id || entry.fileName} className="hover:bg-surface-dim/50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap text-[11px]">
                        <span className="text-on-surface-variant">Import</span>{' '}
                        <span className="font-medium text-on-surface">{formatImportDate(entry.importDate)}</span>
                        {entry.dateRange && (
                          <>
                            <span className="text-on-surface-variant mx-1">·</span>
                            <span className="text-on-surface-variant">Servicios del</span>{' '}
                            <span className="font-medium text-on-surface">{formatServiceDate(entry.dateRange)}</span>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 truncate max-w-[200px] font-medium">
                        {entry.fileName || '—'}
                      </td>
                      <td className="px-3 py-2 truncate max-w-[150px] text-on-surface-variant">
                        {entry.production || '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {entry.totalServices || 0}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {entry.totalDrivers || 0}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          entry.status === 'registered'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.status || 'parsed'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => onViewHistory(entry)}
                          className="text-primary hover:text-primary/80 text-[11px] font-medium underline cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length > 20 && (
                <div className="px-3 py-2 text-center text-[11px] text-on-surface-variant border-t border-outline-variant">
                  Showing 20 of {history.length} entries
                </div>
              )}
            </div>

            {/* Mobile: card view */}
            <div className="md:hidden space-y-2">
              {history.slice(0, 10).map((entry) => (
                <div
                  key={entry.id || entry.fileName}
                  className="border border-outline-variant rounded-lg p-3 bg-surface-container-lowest active:bg-surface-dim transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-on-surface-variant">
                      <span className="font-medium text-on-surface">{formatImportDate(entry.importDate)}</span>
                      {entry.dateRange && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="text-on-surface-variant">Servicios del</span>{' '}
                          <span className="font-medium">{formatServiceDate(entry.dateRange)}</span>
                        </>
                      )}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      entry.status === 'registered'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {entry.status || 'parsed'}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-on-surface truncate">
                    {entry.production || '—'}
                  </p>
                  <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                    {entry.fileName || '—'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                      <span>{entry.totalServices || 0} services</span>
                      <span>{entry.totalDrivers || 0} drivers</span>
                    </div>
                    <button
                      onClick={() => onViewHistory(entry)}
                      className="text-[12px] font-medium text-primary px-3 py-1 rounded-lg border border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
              {history.length > 10 && (
                <div className="text-center text-[11px] text-on-surface-variant py-2">
                  Showing 10 of {history.length} entries
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* History Preview Overlay */}
      {viewingHistory && (
        <div className="mt-6 border-2 border-primary/30 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-semibold text-on-surface">
                {viewingHistory.entry.production || 'Transport'}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                {viewingHistory.entry.dateRange ? formatServiceDate(viewingHistory.entry.dateRange) : (viewingHistory.entry.importDate ? formatImportDate(viewingHistory.entry.importDate) : '')}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                {viewingHistory.services.length} services
              </span>
            </div>
            <button
              onClick={onClosePreview}
              className="text-on-surface-variant hover:text-on-surface text-[12px] px-2 py-1 rounded hover:bg-surface-dim cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface-dim z-10">
                <tr className="text-[11px] font-medium text-on-surface-variant border-b border-outline-variant">
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Driver</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Passengers</th>
                  <th className="px-3 py-2">From</th>
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2">Section</th>
                </tr>
              </thead>
              <tbody className="text-[12px] divide-y divide-outline-variant/30">
                {viewingHistory.services.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-dim/30">
                    <td className="px-3 py-1.5 font-medium">{s.vehicle || '—'}</td>
                    <td className="px-3 py-1.5">{s.driver || <span className="text-red-500 italic">(vacío)</span>}</td>
                    <td className="px-3 py-1.5">{formatTimeDisplay(s.time || '') || '—'}</td>
                    <td className="px-3 py-1.5">
                      {Array.isArray(s.passengers) && s.passengers.length > 0
                        ? s.passengers.map((p: any) => typeof p === 'string' ? p : p.name).join(', ')
                        : typeof s.passengers === 'string' ? s.passengers : '—'}
                    </td>
                    <td className="px-3 py-1.5 max-w-[200px] truncate">
                      {Array.isArray(s.pickupLines) && s.pickupLines.length > 0
                        ? s.pickupLines.join('; ')
                        : s.from || '—'}
                    </td>
                    <td className="px-3 py-1.5 max-w-[200px] truncate">
                      {Array.isArray(s.dropoffLines) && s.dropoffLines.length > 0
                        ? s.dropoffLines.join('; ')
                        : s.to || '—'}
                    </td>
                    <td className="px-3 py-1.5">{s.section || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
