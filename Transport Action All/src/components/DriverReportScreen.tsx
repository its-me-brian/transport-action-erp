import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Loader2, CheckCircle, XCircle, Clock, Eye, X } from 'lucide-react';
import { ScreenId } from '../types';
import { getDriverReports, getDriverReport, approveDriverReport, rejectDriverReport, DriverReportDTO } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorUtils';

interface Props { onNavigate: (screen: ScreenId) => void; }

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Pendiente:  { icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50',    label: 'Pendiente' },
  Aceptado:   { icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50',  label: 'Aceptado' },
  Rechazado:  { icon: XCircle,       color: 'text-red-600',     bg: 'bg-red-50',      label: 'Rechazado' },
};
const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

export default function DriverReportScreen({ onNavigate }: Props) {
  const { showToast } = useToast();
  const [reports, setReports] = useState<DriverReportDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewTarget, setViewTarget] = useState<DriverReportDTO | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DriverReportDTO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try { setReports(await getDriverReports()); } finally { setIsLoading(false); }
  };

  const filtered = reports.filter(r => {
    const matchSearch = !searchQuery || r.id.toLowerCase().includes(searchQuery.toLowerCase()) || r.serviceId.toLowerCase().includes(searchQuery.toLowerCase()) || r.driverId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleApprove = async (report: DriverReportDTO) => {
    setIsProcessing(true);
    try {
      const r = await approveDriverReport(report.id);
      if (r.error) { showToast(r.error, 'error'); return; }
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsProcessing(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) { showToast('Reason is required', 'warning'); return; }
    setIsProcessing(true);
    try {
      const r = await rejectDriverReport(rejectTarget.id, rejectReason);
      if (r.error) { showToast(r.error, 'error'); return; }
      await loadData();
    } catch (err) { showToast(getErrorMessage(err), 'error'); } finally { setIsProcessing(false); }
  };

  return (
    <div className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Driver Reports</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">{filtered.length} report{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-2 px-1">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input type="text" placeholder="Search reports..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary text-on-surface" />
        </div>
        <div className="flex gap-1">
          {['All', 'Pendiente', 'Aceptado', 'Rechazado'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${statusFilter === s ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2"><div className="h-5 w-16 bg-surface-dim rounded" /><div className="h-4 w-8 bg-surface-dim rounded" /></div>
                  <div className="flex gap-4"><div className="h-3 w-20 bg-surface-dim rounded" /><div className="h-3 w-16 bg-surface-dim rounded" /><div className="h-3 w-24 bg-surface-dim rounded" /></div>
                </div>
                <div className="flex gap-2"><div className="h-7 w-7 bg-surface-dim rounded" /><div className="h-7 w-7 bg-surface-dim rounded" /></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <ClipboardCheck className="w-10 h-10 text-outline" /><span className="text-[13px] text-on-surface-variant">No reports found</span>
          </div>
        ) : filtered.map(r => {
          const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.Pendiente;
          const Icon = cfg.icon;
          return (
            <div key={r.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.color}`}><Icon className="w-3 h-3" />{cfg.label}</span>
                  <span className="text-[10px] text-on-surface-variant">v{r.version}</span>
                  <span className="text-[10px] text-on-surface-variant">Service: {r.serviceId}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-[11px] text-on-surface-variant">
                  {r.kmExtra > 0 && <span>Km Extra: {r.kmExtra}</span>}
                  {r.hoursExtra > 0 && <span>Hours Extra: {r.hoursExtra}</span>}
                  {r.parking > 0 && <span>Parking: {fmt(r.parking)}</span>}
                  {r.tolls > 0 && <span>Tolls: {fmt(r.tolls)}</span>}
                  {r.fuel > 0 && <span>Fuel: {fmt(r.fuel)}</span>}
                  {r.waitMinutes > 0 && <span>Wait: {r.waitMinutes}min</span>}
                  <span className="font-semibold">Total: {fmt(r.totalExtras)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setViewTarget(r)} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer" title="View"><Eye className="w-3.5 h-3.5" /></button>
                {r.status === 'Pendiente' && (
                  <>
                    <button onClick={() => handleApprove(r)} disabled={isProcessing} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer" title="Approve"><CheckCircle className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setRejectTarget(r)} className="p-1.5 text-red-500 hover:bg-red-50 rounded cursor-pointer" title="Reject"><XCircle className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View Detail Modal */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">Report Detail — {viewTarget.id}</h3>
              <button onClick={() => setViewTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4 space-y-2 text-[13px] overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-2"><span className="text-on-surface-variant">Service:</span><span>{viewTarget.serviceId}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-on-surface-variant">Driver:</span><span>{viewTarget.driverId}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-on-surface-variant">Version:</span><span>v{viewTarget.version}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-on-surface-variant">Status:</span><span>{viewTarget.status}</span></div>
              <hr className="border-outline-variant" />
              {viewTarget.kmExtra > 0 && <div className="grid grid-cols-2 gap-2"><span className="text-on-surface-variant">Km Extra:</span><span>{viewTarget.kmExtra}</span></div>}
              {viewTarget.hoursExtra > 0 && <div className="grid grid-cols-2 gap-2"><span className="text-on-surface-variant">Hours Extra:</span><span>{viewTarget.hoursExtra}</span></div>}
              {viewTarget.parking > 0 && <div className="grid grid-cols-2 gap-2"><span className="text-on-surface-variant">Parking:</span><span>{fmt(viewTarget.parking)}</span></div>}
              {viewTarget.tolls > 0 && <div className="grid grid-cols-2 gap-2"><span className="text-on-surface-variant">Tolls:</span><span>{fmt(viewTarget.tolls)}</span></div>}
              {viewTarget.fuel > 0 && <div className="grid grid-cols-2 gap-2"><span className="text-on-surface-variant">Fuel:</span><span>{fmt(viewTarget.fuel)}</span></div>}
              {viewTarget.waitMinutes > 0 && <div className="grid grid-cols-2 gap-2"><span className="text-on-surface-variant">Wait Minutes:</span><span>{viewTarget.waitMinutes}</span></div>}
              <hr className="border-outline-variant" />
              <div className="grid grid-cols-2 gap-2 font-semibold"><span>Total Extras:</span><span>{fmt(viewTarget.totalExtras)}</span></div>
              {viewTarget.notes && <div className="mt-2"><span className="text-on-surface-variant">Notes:</span><p className="mt-1">{viewTarget.notes}</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-sm shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[15px] font-semibold text-on-surface">Reject Report</h3>
              <button onClick={() => setRejectTarget(null)} className="p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"><X className="w-4 h-4 text-on-surface-variant" /></button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Reason *</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none" rows={3} placeholder="Explain why..." />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button onClick={() => setRejectTarget(null)} className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleReject} disabled={isProcessing || !rejectReason.trim()} className="px-4 py-1.5 bg-red-500 text-white text-[12px] font-medium rounded-lg hover:bg-red-600 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
