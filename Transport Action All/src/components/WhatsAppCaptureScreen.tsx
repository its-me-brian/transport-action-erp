import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Check, AlertTriangle, Loader2, User, Edit3 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import {
  parseWhatsApp, captureWhatsAppReports,
  WhatsAppParsedReport, getProjects, getDrivers
} from '../services/api';

interface Props {
  onNavigate: (screen: string) => void;
}

type Step = 'paste' | 'review' | 'done';

export default function WhatsAppCaptureScreen({ onNavigate: _onNavigate }: Props) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>('paste');
  const [messageText, setMessageText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Parsed results
  const [reports, setReports] = useState<WhatsAppParsedReport[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<{ id: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState('');

  // Projects list
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadProjects();
    loadDrivers();
  }, []);

  const loadProjects = async () => {
    try {
      const result = await getProjects();
      if (Array.isArray(result)) {
        setProjects(result.map(p => ({ id: p.id, name: p.name || p.id })));
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadDrivers = async () => {
    try {
      const result = await getDrivers();
      if (Array.isArray(result)) {
        setAvailableDrivers(result.map((d: any) => ({ id: d.ID || d.id, name: d.Name || d.name || d.ID })));
      }
    } catch (err) {
      console.error('Failed to load drivers:', err);
    }
  };

  // Step 1: Parse the message
  const handleParse = async () => {
    if (!messageText.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseWhatsApp(messageText);
      if (result.success && result.reports && result.reports.length > 0) {
        setReports(result.reports);
        if (result.drivers) setAvailableDrivers(result.drivers);
        setStep('review');
        showToast(`${result.reportCount} report(s) parsed successfully`, 'success');
      } else {
        showToast(result.error || 'Could not parse any reports', 'error');
      }
    } catch (err) {
      console.error('Parse failed:', err);
      showToast('Error parsing message', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Step 2: Update a single report field
  const updateReport = (index: number, field: keyof WhatsAppParsedReport, value: any) => {
    setReports(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  // Step 3: Capture all reports into inbox
  const handleCapture = async () => {
    if (!selectedProject) {
      showToast('Select a project first', 'error');
      return;
    }
    setIsCapturing(true);
    try {
      const result = await captureWhatsAppReports(reports, selectedProject);
      if (result.success) {
        showToast(`${result.captured}/${result.total} reports captured to inbox`, 'success');
        setStep('done');
      } else {
        // Show per-report errors
        const errors = result.results.filter(r => !r.success);
        if (errors.length > 0) {
          showToast(`${errors.length} reports failed: ${errors[0].error}`, 'error');
        }
        if (result.captured > 0) {
          showToast(`${result.captured}/${result.total} captured (some failed)`, 'success');
          setStep('done');
        }
      }
    } catch (err) {
      console.error('Capture failed:', err);
      showToast('Error capturing reports', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  // Reset to start over
  const handleReset = () => {
    setStep('paste');
    setMessageText('');
    setReports([]);
    setSelectedProject('');
  };

  const getStatusLabel = (r: WhatsAppParsedReport) => {
    if (r.matchedDriverId) return { text: 'Matched', color: 'text-green-600 bg-green-50' };
    return { text: 'No driver', color: 'text-amber-600 bg-amber-50' };
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-green-600" />
          WhatsApp Capture
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Paste a driver's WhatsApp message, parse it, and capture to inbox
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${step === 'paste' ? 'bg-primary text-primary-foreground font-semibold' : step === 'review' || step === 'done' ? 'bg-green-100 text-green-800' : 'bg-surface-container text-on-surface-variant'}`}>
          <span>1. Paste</span>
        </div>
        <div className="text-on-surface-variant">→</div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${step === 'review' ? 'bg-primary text-primary-foreground font-semibold' : step === 'done' ? 'bg-green-100 text-green-800' : 'bg-surface-container text-on-surface-variant'}`}>
          <span>2. Review</span>
        </div>
        <div className="text-on-surface-variant">→</div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${step === 'done' ? 'bg-green-100 text-green-800 font-semibold' : 'bg-surface-container text-on-surface-variant'}`}>
          <span>3. Captured</span>
        </div>
      </div>

      {/* ============================================================================
          STEP 1: Paste message
          ============================================================================ */}
      {step === 'paste' && (
        <div className="bg-surface rounded-xl border border-outline-variant p-6">
          <label className="block text-sm font-semibold text-on-surface mb-2">
            Paste WhatsApp message
          </label>
          <textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            className="w-full h-48 px-4 py-3 border border-outline-variant rounded-xl text-sm font-mono resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder={`Example formats:\n\n8:30 - 21:30 | 73km | Dispo\n\nInizio 8:30 Fine 21:30 km 73 diaria piena\n\n7/7/26 Isidoro dragone\nInizio 8:00\nFine 20:00\nKm totali 120\nDiaria piena`}
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-on-surface-variant">
              {messageText.length > 0 ? `${messageText.length} characters` : 'Supports single or multiple reports'}
            </span>
            <button
              onClick={handleParse}
              disabled={!messageText.trim() || isParsing}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-semibold"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Parse Message
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================================
          STEP 2: Review parsed reports
          ============================================================================ */}
      {step === 'review' && (
        <div>
          {/* Project selector */}
          <div className="bg-surface rounded-xl border border-outline-variant p-4 mb-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-on-surface">Project:</label>
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="flex-1 px-3 py-2 border border-outline-variant rounded-lg text-sm"
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <span className="text-xs text-on-surface-variant">
                {reports.length} report(s) parsed
              </span>
            </div>
          </div>

          {/* Parsed reports */}
          <div className="space-y-3">
            {reports.map((report, idx) => {
              const status = getStatusLabel(report);
              return (
                <div key={idx} className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
                  {/* Report header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-container">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-on-surface-variant" />
                      <span className="font-semibold text-sm">{report.driverName || 'Unknown'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant">{report.dateParsed || report.date || '—'}</span>
                  </div>

                  {/* Editable fields */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* Driver select */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1">Driver</label>
                        <select
                          value={report.matchedDriverId || ''}
                          onChange={e => updateReport(idx, 'matchedDriverId', e.target.value)}
                          className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                        >
                          <option value="">Select driver...</option>
                          {availableDrivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      {/* Date */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1">Date</label>
                        <input
                          type="date"
                          value={report.dateParsed || ''}
                          onChange={e => updateReport(idx, 'dateParsed', e.target.value)}
                          className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                        />
                      </div>
                      {/* Start time */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1">Start Time</label>
                        <input
                          type="time"
                          value={report.startTime || ''}
                          onChange={e => updateReport(idx, 'startTime', e.target.value)}
                          className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                        />
                      </div>
                      {/* End time */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1">End Time</label>
                        <input
                          type="time"
                          value={report.endTime || ''}
                          onChange={e => updateReport(idx, 'endTime', e.target.value)}
                          className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                        />
                      </div>
                      {/* KM */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1">KM Total</label>
                        <input
                          type="number"
                          value={report.kmTotal || 0}
                          onChange={e => updateReport(idx, 'kmTotal', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                          min={0}
                        />
                      </div>
                      {/* Diaria */}
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1">Diaria</label>
                        <select
                          value={report.diariaType || 'none'}
                          onChange={e => updateReport(idx, 'diariaType', e.target.value)}
                          className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm"
                        >
                          <option value="none">Nessuna</option>
                          <option value="piena">Piena</option>
                          <option value="mezza">Mezza</option>
                        </select>
                      </div>
                    </div>

                    {/* Raw text preview */}
                    <details className="mt-2">
                      <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface">
                        Raw message text
                      </summary>
                      <pre className="mt-2 p-2 bg-surface-container rounded text-xs overflow-x-auto max-h-24">
                        {report.rawText}
                      </pre>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCapture}
              disabled={!selectedProject || isCapturing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 font-semibold text-sm"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Capture to Inbox ({reports.length} reports)
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={isCapturing}
              className="px-6 py-3 border border-outline-variant rounded-xl text-sm font-medium hover:bg-surface-container-low transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* ============================================================================
          STEP 3: Done
          ============================================================================ */}
      {step === 'done' && (
        <div className="bg-surface rounded-xl border border-outline-variant p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-on-surface mb-2">Reports Captured!</h2>
          <p className="text-sm text-on-surface-variant mb-6">
            {reports.length} report(s) have been captured to the inbox.
            Go to the Inbox tab to review and approve them.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => _onNavigate('inbox')}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors font-semibold text-sm"
            >
              Go to Inbox
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors"
            >
              Capture More
            </button>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 p-4 bg-surface-container rounded-xl text-xs text-on-surface-variant">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Supported formats:</strong> The parser handles common Italian driver message formats
            like "8:30 - 21:30 | 73km | Dispo" or "Inizio 8:30 Fine 21:30 km 73 diaria piena".
            Multi-message WhatsApp chat exports are also supported.
          </div>
        </div>
      </div>
    </div>
  );
}
