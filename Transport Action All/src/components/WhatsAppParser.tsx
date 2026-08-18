import React, { useState, useCallback } from 'react';
import { MessageSquare, Sparkles, X, Check, AlertCircle } from 'lucide-react';
import { 
  parseDriverReport, 
  parseMultipleDriverReports, 
  DriverReport, 
  Service,
  formatTimeDisplay,
  getDiariaCost,
  getKmOverCost
} from '../types';

interface WhatsAppParserProps {
  onApply: (data: Partial<Service>) => void;
  onClose: () => void;
}

export default function WhatsAppParser({ onApply, onClose }: WhatsAppParserProps) {
  const [text, setText] = useState('');
  const [reports, setReports] = useState<DriverReport[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<DriverReport>>({});

  const handleParse = useCallback(() => {
    // Try parsing as multiple reports first
    let parsed = parseMultipleDriverReports(text);
    
    // If only one found, try single parse
    if (parsed.length === 0) {
      const single = parseDriverReport(text);
      if (single) parsed = [single];
    }
    
    setReports(parsed);
    if (parsed.length > 0) setEditingIndex(0);
  }, [text]);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...reports[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editForm) {
      const updated = [...reports];
      updated[editingIndex] = { ...reports[editingIndex], ...editForm };
      setReports(updated);
      setEditingIndex(null);
      setEditForm({});
    }
  };

  const handleApply = (report: DriverReport) => {
    // Map DriverReport to Service fields
    const serviceData: Partial<Service> = {
      driverName: report.driverName,
      date: report.dateParsed || '',
      startTime: report.start,
      endTime: report.end,
      km: report.kmTotal,
      kmOver: report.kmOver,
      diariaType: report.diariaType,
      hasDiaria: report.diariaType !== 'none',
      diariaCost: getDiariaCost(report.diariaType),
      kmOverCost: getKmOverCost(report.kmOver),
    };
    onApply(serviceData);
    onClose();
  };

  const getDiariaLabel = (type: string) => {
    switch (type) {
      case 'piena': return { text: 'Diaria Piena', color: 'bg-green-100 text-green-700' };
      case 'mezza': return { text: 'Diaria Mezza', color: 'bg-amber-100 text-amber-700' };
      default: return { text: 'Sin Diaria', color: 'bg-gray-100 text-gray-500' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div 
        className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant w-full max-w-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-[18px] font-semibold text-on-surface">Driver Report Parser</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-dim">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 px-6 py-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-[13px] text-on-surface-variant">
            Paste driver WhatsApp reports. Supports single or multiple reports:
          </p>
          
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none font-mono"
            rows={6}
            placeholder={`Examples:

Simple format:
Isidoro dragone
22/7/26
Inizio 8:30
Fine 18:30
Km tot 488
Km over 388
Diaria piena

WhatsApp export:
[17:23, 23/7/2026] +39 380 138 8757: Isidoro dragone
22/7/26
Inizio 8:30
Fine 18:30
Km tot 488
Km over 388
Diaria piena`}
          />
          
          <button
            onClick={handleParse}
            disabled={!text.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-[13px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Parse Report{text.includes('\n') && text.split('\n').length > 3 ? 's' : ''}
          </button>

          {/* Parsed results */}
          {reports.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[12px] font-medium text-on-surface-variant uppercase">
                Found {reports.length} report{reports.length > 1 ? 's' : ''}:
              </p>
              
              {reports.map((report, idx) => {
                const diaria = getDiariaLabel(report.diariaType);
                const isEditing = editingIndex === idx;
                
                return (
                  <div 
                    key={idx} 
                    className={`bg-surface-dim rounded-lg p-3 border ${
                      isEditing ? 'border-primary' : 'border-outline-variant'
                    }`}
                  >
                    {isEditing ? (
                      /* Edit mode */
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] font-medium text-on-surface">{report.driverName}</span>
                          <span className="text-[11px] text-on-surface-variant">{report.dateParsed || report.date}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-on-surface-variant">Inizio</label>
                            <input
                              type="text"
                              value={editForm.startTime || ''}
                              onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}
                              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-[13px]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-on-surface-variant">Fine</label>
                            <input
                              type="text"
                              value={editForm.endTime || ''}
                              onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-[13px]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-on-surface-variant">Km Total</label>
                            <input
                              type="number"
                              value={editForm.kmTotal || 0}
                              onChange={e => setEditForm({ ...editForm, kmTotal: parseInt(e.target.value) || 0 })}
                              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-[13px]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-on-surface-variant">Km Over</label>
                            <input
                              type="number"
                              value={editForm.kmOver || 0}
                              onChange={e => setEditForm({ ...editForm, kmOver: parseInt(e.target.value) || 0 })}
                              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-[13px]"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-[11px] text-on-surface-variant">Diaria</label>
                          <select
                            value={editForm.diariaType || 'none'}
                            onChange={e => setEditForm({ 
                              ...editForm, 
                              diariaType: e.target.value as 'piena' | 'mezza' | 'none' 
                            })}
                            className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-[13px]"
                          >
                            <option value="none">Nessuna</option>
                            <option value="mezza">Mezza</option>
                            <option value="piena">Piena</option>
                          </select>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setEditingIndex(null); setEditForm({}); }}
                            className="px-3 py-1 text-[12px] text-on-surface-variant hover:bg-surface rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 text-[12px] bg-primary text-on-primary rounded flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[14px] font-medium text-on-surface">{report.driverName}</span>
                            <span className="text-[12px] text-on-surface-variant ml-2">{report.dateParsed || report.date}</span>
                          </div>
                          <button
                            onClick={() => handleEdit(idx)}
                            className="text-[11px] text-primary hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Inizio:</span>
                            <span className="font-medium">{formatTimeDisplay(report.start)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Fine:</span>
                            <span className="font-medium">{formatTimeDisplay(report.end)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Km Total:</span>
                            <span className="font-medium">{report.kmTotal} km</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Km Over:</span>
                            <span className="font-medium text-amber-600">{report.kmOver} km</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded ${diaria.color}`}>
                            {diaria.text}
                          </span>
                          {report.kmOver > 0 && (
                            <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                              +€{getKmOverCost(report.kmOver).toFixed(2)} extra km
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleApply(report)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors"
                          >
                            <Check className="w-3 h-3" /> Apply to Service
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {reports.length === 0 && text && (
            <div className="flex items-center gap-2 text-[13px] text-amber-600 bg-amber-50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Could not parse driver report. Check format and try again.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
