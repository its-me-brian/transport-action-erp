import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ParserDebugPanelProps {
  parsingLog: any[];
  serviceSummary: any[];
  showDebug: boolean;
  onToggleDebug: () => void;
}

export default function ParserDebugPanel({
  parsingLog,
  serviceSummary,
  showDebug,
  onToggleDebug,
}: ParserDebugPanelProps) {
  if (parsingLog.length === 0) return null;

  return (
    <div className="rounded-lg border border-outline-variant overflow-hidden">
      <button
        onClick={onToggleDebug}
        className="w-full px-3 py-2 text-[11px] font-medium text-on-surface-variant hover:bg-surface-dim flex items-center justify-between cursor-pointer"
      >
        <span>Debug Parser Log ({parsingLog.length} entries)</span>
        {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {showDebug && (
        <div className="px-3 pb-3 max-h-[400px] overflow-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="text-left text-on-surface-variant border-b border-outline-variant">
                <th className="px-1 py-0.5">Row</th>
                <th className="px-1 py-0.5">Action</th>
                <th className="px-1 py-0.5">Vehicle</th>
                <th className="px-1 py-0.5">Driver</th>
                <th className="px-1 py-0.5">Time</th>
                <th className="px-1 py-0.5">Last Vehicle</th>
                <th className="px-1 py-0.5">Last Driver</th>
                <th className="px-1 py-0.5">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {parsingLog.map((entry: any, idx: number) => (
                <tr key={idx} className={
                  entry.action === 'INHERITED' ? 'bg-emerald-50' :
                  entry.action === 'SAVED' && !entry.vehicle ? 'bg-red-50' :
                  entry.action === 'SAVED' ? 'bg-surface-dim/30' :
                  entry.action?.startsWith('SUB_BREAK') ? 'bg-amber-50' :
                  entry.action === 'NO_INHERIT' ? 'bg-yellow-50' :
                  ''
                }>
                  <td className="px-1 py-0.5 font-mono">{entry.row}</td>
                  <td className="px-1 py-0.5 font-medium">{entry.action}</td>
                  <td className="px-1 py-0.5">{entry.vehicle || '—'}</td>
                  <td className="px-1 py-0.5">{entry.driver || '—'}</td>
                  <td className="px-1 py-0.5">{entry.time || '—'}</td>
                  <td className="px-1 py-0.5">{entry.lastVehicle || '—'}</td>
                  <td className="px-1 py-0.5">{entry.lastDriver || '—'}</td>
                  <td className="px-1 py-0.5 max-w-[200px] truncate">{entry.detail || entry.reason || entry.fromRow !== undefined ? `from:${entry.fromRow}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {serviceSummary.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-on-surface mb-1">Service Summary (final parser output):</div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="text-left text-on-surface-variant border-b border-outline-variant">
                    <th className="px-1 py-0.5">#</th>
                    <th className="px-1 py-0.5">Vehicle</th>
                    <th className="px-1 py-0.5">Driver</th>
                    <th className="px-1 py-0.5">Phone</th>
                    <th className="px-1 py-0.5">Time</th>
                    <th className="px-1 py-0.5">Passengers</th>
                    <th className="px-1 py-0.5">Section</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {serviceSummary.map((s: any) => (
                    <tr key={s.idx} className={!s.driver && s.vehicle ? 'bg-amber-50' : ''}>
                      <td className="px-1 py-0.5 font-mono">{s.idx + 1}</td>
                      <td className="px-1 py-0.5">{s.vehicle || '—'}</td>
                      <td className="px-1 py-0.5 font-medium">{s.driver || '(empty)'}</td>
                      <td className="px-1 py-0.5">{s.driverPhone || '—'}</td>
                      <td className="px-1 py-0.5">{s.time || '—'}</td>
                      <td className="px-1 py-0.5 max-w-[200px] truncate">{s.passengers || '—'}</td>
                      <td className="px-1 py-0.5">{s.section || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
