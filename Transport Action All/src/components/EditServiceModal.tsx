import React, { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import {
  X, Save, Trash2, MessageSquare,
  ChevronDown, ChevronUp, MapPin, DollarSign, Flag, AlertTriangle
} from 'lucide-react';
import {
  Service, formatTimeDisplay, getServiceStatusColor, mapServiceDTOToService
} from '../types';
import WhatsAppParser from './WhatsAppParser';
import { updateServiceField, assignDriver } from '../services/api';
import type { DriverRecord } from '../services/api';

interface EditServiceModalProps {
  service: Service | null;
  onClose: () => void;
  onSave: (serviceId: string, updates: Partial<Service>) => void;
  onDelete: (service: Service) => void;
  dbDrivers: DriverRecord[];
  vehicleTypes: string[];
  parametros: {
    transfer: Record<string, number>;
    dispo: Record<string, { precioBase: number; horasBase: number; kmBase: number; extraHora: number; extraKM: number }>;
  } | null;
}

export default function EditServiceModal({
  service, onClose, onSave, onDelete, dbDrivers, vehicleTypes, parametros,
}: EditServiceModalProps) {
  const { showToast } = useToast();
  const [showWhatsAppParser, setShowWhatsAppParser] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    basic: false, route: false, rapportino: true, costs: true, flags: true,
  });
  const [costChangeWarning, setCostChangeWarning] = useState<{
    field: string; label: string; value: string;
  } | null>(null);

  // Initialize form from service
  const preFillCosts = useCallback((): Partial<Service> => {
    if (!service || !parametros) return {};
    const vt = (service.vehicleType || '').toUpperCase();
    const isDispo = vt.includes('DISPO');
    const isTransfer = vt.includes('TRANSFER');

    if (isDispo && parametros.dispo) {
      const dispoKey = Object.keys(parametros.dispo).find(k => vt.includes(k.replace('DISPO', '').trim())) || Object.keys(parametros.dispo)[0];
      const dispo = dispoKey ? parametros.dispo[dispoKey] : null;
      if (dispo) {
        return { baseCost: dispo.precioBase, kmCost: dispo.extraKM, overtimeCost: dispo.extraHora };
      }
    } else if (isTransfer && parametros.transfer) {
      const transferKey = Object.keys(parametros.transfer).find(k => vt.includes(k.replace('TRANSFER', '').replace('AEROPUERTO', '').replace('CITY', '').trim())) || Object.keys(parametros.transfer)[0];
      if (transferKey) {
        return { baseCost: parametros.transfer[transferKey] };
      }
    }
    return {};
  }, [service, parametros]);

  const [editForm, setEditForm] = useState<Partial<Service>>(() => {
    if (!service) return {};
    const preFilled = preFillCosts();
    return {
      title: service.title, time: service.time, status: service.status,
      driverName: service.driverName, driverPhone: service.driverPhone || '',
      passengers: service.passengers || '', project: service.project,
      company: service.company, clientName: service.clientName || '',
      vehicleType: service.vehicleType || '', vehiclePlate: service.vehiclePlate || '',
      location: service.location, from: service.from || '', to: service.to || '',
      flightInfo: service.flightInfo || '', routeDescription: service.routeDescription || '',
      startTime: service.startTime || '', endTime: service.endTime || '',
      km: service.km, overtimeBefore: service.overtimeBefore,
      overtimeAfter: service.overtimeAfter, overtimeHours: service.overtimeHours,
      baseCost: service.baseCost ?? preFilled.baseCost,
      overtimeCost: service.overtimeCost ?? preFilled.overtimeCost,
      kmCost: service.kmCost ?? preFilled.kmCost,
      diariaCost: service.diariaCost, notturnoCost: service.notturnoCost,
      totalCost: service.totalCost,
      isFestivo: service.isFestivo || false, isNotturno: service.isNotturno || false,
      hasDiaria: service.hasDiaria || false,
      po: service.po || '', notes: service.notes || '',
      cancelReason: service.cancelReason || '',
      movements: service.movements || [],
      _costsFromParametros: {
        baseCost: service.baseCost == null && preFilled.baseCost != null,
        overtimeCost: service.overtimeCost == null && preFilled.overtimeCost != null,
        kmCost: service.kmCost == null && preFilled.kmCost != null,
      },
    };
  });

  if (!service) return null;

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSave = async () => {
    if (!service) return;
    try {
      const fieldMap: Record<string, { field: string; mapper?: (value: any) => any }> = {
        from: { field: 'PickupLines', mapper: (v: string) => v ? [v] : [] },
        to: { field: 'DropoffLines', mapper: (v: string) => v ? [v] : [] },
        time: { field: 'Time' },
        passengers: { field: 'PassengerName' },
        notes: { field: 'Notes' },
        flightInfo: { field: 'FlightInfo' },
        startTime: { field: 'StartTime' },
        endTime: { field: 'EndTime' },
        km: { field: 'KmTotal', mapper: (v: string) => parseFloat(v) || 0 },
        diariaType: { field: 'DiariaType' },
        vehicleType: { field: 'VehicleType' },
        movements: { field: 'Movements', mapper: (v: any[]) => JSON.stringify(v || []) },
      };

      if (editForm.driverName) {
        const driver = dbDrivers.find(d => d.name === editForm.driverName);
        if (driver) {
          try {
            const assignResult = await assignDriver(service.id, driver.id, driver.vehiclePreferred || '');
            if (assignResult?.error) {
              console.error('Failed to assign driver:', assignResult.error);
            }
          } catch (err) {
            console.error('Failed to assign driver:', err);
          }
        }
      }

      const promises: Promise<any>[] = [];
      const failedFields: string[] = [];

      for (const [dashField, value] of Object.entries(editForm)) {
        if (value === undefined || dashField === 'driverName') continue;
        const mapping = fieldMap[dashField];
        if (!mapping) continue;
        const entityValue = mapping.mapper ? mapping.mapper(value) : value;
        promises.push(
          updateServiceField(service.id, mapping.field, entityValue).then(result => {
            if (result.error) {
              failedFields.push(mapping.field);
              console.error(`Failed to update ${mapping.field}: ${result.error}`);
            }
          }).catch(err => {
            failedFields.push(mapping.field);
            console.error(`Failed to update ${mapping.field}:`, err);
          })
        );
      }

      await Promise.all(promises);

      if (failedFields.length > 0) {
        showToast('Some fields could not be saved: ' + failedFields.join(', '), 'warning');
      } else {
        onSave(service.id, editForm);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save edit:', error);
      showToast('Failed to save changes. Please try again.', 'error');
    }
  };

  const handleCostChange = (field: string, value: string) => {
    const costsFromParam = editForm._costsFromParametros;
    if (costsFromParam && costsFromParam[field]) {
      const labels: Record<string, string> = { baseCost: 'Base Cost', overtimeCost: 'Overtime Cost', kmCost: 'KM Cost' };
      setCostChangeWarning({ field, label: labels[field] || field, value });
      return;
    }
    setEditForm(prev => ({ ...prev, [field]: parseFloat(value) || undefined }));
  };

  const confirmCostChange = () => {
    if (!costChangeWarning) return;
    setEditForm(prev => ({
      ...prev,
      [costChangeWarning.field]: parseFloat(costChangeWarning.value) || undefined,
      _costsFromParametros: {
        ...(prev._costsFromParametros || {}),
        [costChangeWarning.field]: false,
      },
    }));
    setCostChangeWarning(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4 p-0" onClick={onClose}>
        <div
          className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-xl border border-outline-variant w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header - fixed */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-outline-variant shrink-0">
            <h2 className="text-[16px] sm:text-[18px] font-semibold text-on-surface">Edit Service</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWhatsAppParser(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 text-[11px] sm:text-[12px] font-medium hover:bg-green-100 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-dim min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex flex-col gap-2 px-4 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0">

            {/* === SECTION: Basic Info === */}
            <button
              onClick={() => toggleSection('basic')}
              className="flex items-center justify-between py-2 text-[13px] font-semibold text-on-surface uppercase tracking-wide"
            >
              <span>Basic Info</span>
              {collapsedSections.basic ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {!collapsedSections.basic && (
              <div className="flex flex-col gap-3 pb-3 border-b border-outline-variant/30">
                {/* Vehicle / Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase">Vehicle / Title</label>
                  <input type="text" value={editForm.title || ''} onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
                {/* Vehicle Type + Plate */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Vehicle Type</label>
                    <select value={editForm.vehicleType || ''} onChange={e => setEditForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary">
                      <option value="">—</option>
                      {vehicleTypes.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Plate</label>
                    <input type="text" value={editForm.vehiclePlate || ''} onChange={e => setEditForm(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="AB 123 CD" />
                  </div>
                </div>
                {/* Time */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase">Scheduled Time</label>
                  <input type="text" value={formatTimeDisplay(editForm.time || '')} onChange={e => setEditForm(prev => ({ ...prev, time: e.target.value }))}
                    className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="08:00 or 08:00 - 17:00" />
                </div>
                {/* Status — read-only */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase">Status</label>
                  {(() => {
                    const statusColor = getServiceStatusColor(service);
                    return (
                      <div className="flex items-center gap-2 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColor.hex }} />
                        <span className="text-[14px] text-on-surface font-medium">{statusColor.label}</span>
                        <span className="text-[11px] text-on-surface-variant ml-auto">via workflow commands</span>
                      </div>
                    );
                  })()}
                </div>
                {/* Driver */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase">Driver</label>
                  <div className="flex gap-2">
                    <select value={editForm.driverName || ''} onChange={e => {
                      const name = e.target.value;
                      const matched = dbDrivers.find(d => d.name === name);
                      setEditForm(prev => ({
                        ...prev,
                        driverName: name,
                        driverPhone: matched?.phone || prev.driverPhone || '',
                      }));
                    }}
                      className="flex-1 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary">
                      <option value="">— Select —</option>
                      <option value="Unassigned">⚠ Unassigned</option>
                      {dbDrivers.length > 0 && <option disabled>─────────</option>}
                      {dbDrivers.map(d => (
                        <option key={d.id} value={d.name}>{d.name}{d.phone ? ` (${d.phone})` : ''}</option>
                      ))}
                      {dbDrivers.length === 0 && (
                        <>
                          <option disabled>No DB drivers — typing below</option>
                        </>
                      )}
                    </select>
                    <input type="text" value={editForm.driverName || ''} onChange={e => setEditForm(prev => ({ ...prev, driverName: e.target.value }))}
                      className="flex-1 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="Or type..." />
                  </div>
                </div>
                {/* Driver Phone */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase">Driver Phone</label>
                  <input type="text" value={editForm.driverPhone || ''} onChange={e => setEditForm(prev => ({ ...prev, driverPhone: e.target.value }))}
                    className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="+39 ..." />
                </div>
                {/* Client + Project */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Client</label>
                    <input type="text" value={editForm.clientName || ''} onChange={e => setEditForm(prev => ({ ...prev, clientName: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Project</label>
                    <input type="text" value={editForm.project || ''} onChange={e => setEditForm(prev => ({ ...prev, project: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                  </div>
                </div>
                {/* Passengers */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase">Passengers</label>
                  <input type="text" value={editForm.passengers || ''} onChange={e => setEditForm(prev => ({ ...prev, passengers: e.target.value }))}
                    className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
              </div>
            )}

            {/* === SECTION: Route === */}
            <button onClick={() => toggleSection('route')} className="flex items-center justify-between py-2 text-[13px] font-semibold text-on-surface uppercase tracking-wide">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Route {editForm.movements && editForm.movements.length > 1 && (
                  <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
                    {editForm.movements.length} routes
                  </span>
                )}
              </span>
              {collapsedSections.route ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {!collapsedSections.route && (
              <div className="flex flex-col gap-3 pb-3 border-b border-outline-variant/30">
                {editForm.movements && editForm.movements.length > 1 ? (
                  editForm.movements.map((m, idx) => (
                    <div key={idx} className={`flex flex-col gap-2 p-3 rounded-lg border border-outline-variant/40 bg-surface-dim/50 ${idx > 0 ? 'mt-1' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                          Route {idx + 1}
                        </span>
                        <span className="text-[11px] font-medium text-on-surface-variant">
                          {formatTimeDisplay(m.time)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium text-on-surface-variant uppercase">Time</label>
                        <input type="text" value={m.time || ''} onChange={e => {
                          const newMovements = [...editForm.movements!];
                          newMovements[idx] = { ...newMovements[idx], time: e.target.value };
                          setEditForm(prev => ({ ...prev, movements: newMovements }));
                        }}
                          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="08:00" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium text-on-surface-variant uppercase">Passengers</label>
                        <input type="text" value={m.passengers?.map(p => p.name).join('; ') || ''} onChange={e => {
                          const names = e.target.value.split(';').map(n => n.trim()).filter(Boolean);
                          const newPassengers = names.map(name => ({ name, role: '' }));
                          const newMovements = [...editForm.movements!];
                          newMovements[idx] = { ...newMovements[idx], passengers: newPassengers };
                          setEditForm(prev => ({ ...prev, movements: newMovements }));
                        }}
                          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:border-primary" placeholder="Name1; Name2" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium text-on-surface-variant uppercase">From (Pickup)</label>
                        <input type="text" value={m.pickupLines?.[0] || ''} onChange={e => {
                          const newMovements = [...editForm.movements!];
                          newMovements[idx] = { ...newMovements[idx], pickupLines: [e.target.value] };
                          setEditForm(prev => ({ ...prev, movements: newMovements }));
                        }}
                          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium text-on-surface-variant uppercase">To (Destination)</label>
                        <input type="text" value={m.dropoffLines?.[0] || ''} onChange={e => {
                          const newMovements = [...editForm.movements!];
                          newMovements[idx] = { ...newMovements[idx], dropoffLines: [e.target.value] };
                          setEditForm(prev => ({ ...prev, movements: newMovements }));
                        }}
                          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:border-primary" />
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">From (Pickup)</label>
                      <input type="text" value={editForm.from || ''} onChange={e => setEditForm(prev => ({ ...prev, from: e.target.value }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">To (Destination)</label>
                      <div className="flex gap-2">
                        <input type="text" value={editForm.to || ''} onChange={e => setEditForm(prev => ({ ...prev, to: e.target.value }))}
                          className="flex-1 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                        {editForm.notes?.startsWith('maps:') && (
                          <a href={editForm.notes.replace('maps:', '')} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center px-3 py-2 rounded-lg bg-primary/10 text-primary text-[12px] font-medium hover:bg-primary/20 transition-colors shrink-0">
                            Maps
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Route Description</label>
                      <input type="text" value={editForm.routeDescription || ''} onChange={e => setEditForm(prev => ({ ...prev, routeDescription: e.target.value }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="DA HOTEL NH..." />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-on-surface-variant uppercase">Flight Info</label>
                      <input type="text" value={editForm.flightInfo || ''} onChange={e => setEditForm(prev => ({ ...prev, flightInfo: e.target.value }))}
                        className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="Flight n. BA538" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* === SECTION: Rapportino (Driver Report) === */}
            <button onClick={() => toggleSection('rapportino')} className="flex items-center justify-between py-2 text-[13px] font-semibold text-on-surface uppercase tracking-wide">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Rapportino
              </span>
              {collapsedSections.rapportino ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {!collapsedSections.rapportino && (
              <div className="flex flex-col gap-3 pb-3 border-b border-outline-variant/30">
                <p className="text-[11px] text-on-surface-variant -mt-1">Actual times reported by driver (via WhatsApp or manually)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Actual Start</label>
                    <input type="text" value={editForm.startTime || ''} onChange={e => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="08:30" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Actual End</label>
                    <input type="text" value={editForm.endTime || ''} onChange={e => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="21:30" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Min Before</label>
                    <input type="number" value={editForm.overtimeBefore || ''} onChange={e => setEditForm(prev => ({ ...prev, overtimeBefore: parseInt(e.target.value) || undefined }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Min After</label>
                    <input type="number" value={editForm.overtimeAfter || ''} onChange={e => setEditForm(prev => ({ ...prev, overtimeAfter: parseInt(e.target.value) || undefined }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">KM</label>
                    <input type="number" value={editForm.km || ''} onChange={e => setEditForm(prev => ({ ...prev, km: parseFloat(e.target.value) || undefined }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase">Overtime Hours</label>
                  <input type="number" step="0.5" value={editForm.overtimeHours || ''} onChange={e => setEditForm(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || undefined }))}
                    className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0" />
                </div>
              </div>
            )}

            {/* === SECTION: Costs === */}
            <button onClick={() => toggleSection('costs')} className="flex items-center justify-between py-2 text-[13px] font-semibold text-on-surface uppercase tracking-wide">
              <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" /> Costs</span>
              {collapsedSections.costs ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {!collapsedSections.costs && (
              <div className="flex flex-col gap-3 pb-3 border-b border-outline-variant/30">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase flex items-center gap-1">
                      Base Cost (€)
                      {editForm._costsFromParametros?.baseCost && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded font-normal">Production</span>
                      )}
                    </label>
                    <input type="number" step="0.01" value={editForm.baseCost ?? ''} onChange={e => handleCostChange('baseCost', e.target.value)}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase flex items-center gap-1">
                      Overtime Cost (€)
                      {editForm._costsFromParametros?.overtimeCost && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded font-normal">Production</span>
                      )}
                    </label>
                    <input type="number" step="0.01" value={editForm.overtimeCost ?? ''} onChange={e => handleCostChange('overtimeCost', e.target.value)}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase flex items-center gap-1">
                      KM Cost (€)
                      {editForm._costsFromParametros?.kmCost && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded font-normal">Production</span>
                      )}
                    </label>
                    <input type="number" step="0.01" value={editForm.kmCost ?? ''} onChange={e => handleCostChange('kmCost', e.target.value)}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Diaria (€)</label>
                    <input type="number" step="0.01" value={editForm.diariaCost || ''} onChange={e => setEditForm(prev => ({ ...prev, diariaCost: parseFloat(e.target.value) || undefined }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Notturno Cost (€)</label>
                    <input type="number" step="0.01" value={editForm.notturnoCost || ''} onChange={e => setEditForm(prev => ({ ...prev, notturnoCost: parseFloat(e.target.value) || undefined }))}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" placeholder="0.00" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase font-bold">Total (€)</label>
                    <input type="number" step="0.01" value={editForm.totalCost || ''} onChange={e => setEditForm(prev => ({ ...prev, totalCost: parseFloat(e.target.value) || undefined }))}
                      className="bg-surface-dim border-2 border-primary rounded-lg px-3 py-2 text-[14px] text-on-surface font-bold focus:outline-none focus:border-primary" placeholder="0.00" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase">PO / Reference</label>
                  <input type="text" value={editForm.po || ''} onChange={e => setEditForm(prev => ({ ...prev, po: e.target.value }))}
                    className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary" />
                </div>
              </div>
            )}

            {/* === SECTION: Flags === */}
            <button onClick={() => toggleSection('flags')} className="flex items-center justify-between py-2 text-[13px] font-semibold text-on-surface uppercase tracking-wide">
              <span className="flex items-center gap-2"><Flag className="w-4 h-4 text-purple-500" /> Flags & Costs</span>
              {collapsedSections.flags ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {!collapsedSections.flags && (
              <div className="flex flex-col gap-3 pb-3">
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-on-surface-variant italic">
                    Flags (Festivo, Notturno, HoursExtra) are set via DriverReport submission.
                  </p>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Diaria (Meal Allowance)</label>
                    <select
                      value={editForm.diariaType || 'none'}
                      onChange={e => {
                        const type = e.target.value as 'piena' | 'mezza' | 'none';
                        const pienaCost = editForm._costsFromParametros?.diariaPiena || 50;
                        const mezzaCost = editForm._costsFromParametros?.diariaMezza || 35;
                        const cost = type === 'piena' ? pienaCost : type === 'mezza' ? mezzaCost : 0;
                        setEditForm(prev => ({
                          ...prev,
                          diariaType: type,
                          hasDiaria: type !== 'none',
                          diariaCost: cost,
                        }));
                      }}
                      className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                    >
                      <option value="none">Nessuna (€0)</option>
                      <option value="mezza">Mezza</option>
                      <option value="piena">Piena</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase">Km Over (Extra km beyond included)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={editForm.kmOver ?? ''}
                        onChange={e => {
                          const kmOver = parseInt(e.target.value) || 0;
                          const kmRate = editForm.kmCost || 1.50;
                          setEditForm(prev => ({
                            ...prev,
                            kmOver,
                            kmOverCost: kmOver * kmRate,
                          }));
                        }}
                        className="w-24 bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                        placeholder="0"
                      />
                      <span className="text-[12px] text-on-surface-variant">km</span>
                      {editForm.kmOver && editForm.kmOver > 0 && (
                        <span className="text-[12px] text-amber-600 font-medium">
                          +€{(editForm.kmOver * (editForm.kmCost || 1.50)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface rounded-lg p-3 border border-outline-variant">
                    <p className="text-[11px] font-medium text-on-surface-variant uppercase mb-2">Cost Summary</p>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Base:</span>
                        <span className="font-medium">€{(editForm.baseCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Km Over:</span>
                        <span className="font-medium text-amber-600">€{(editForm.kmOverCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Diaria:</span>
                        <span className="font-medium text-green-600">€{(editForm.diariaCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Notturno:</span>
                        <span className="font-medium text-purple-600">€{(editForm.notturnoCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="col-span-2 flex justify-between pt-2 border-t border-outline-variant">
                        <span className="font-semibold text-on-surface">TOTAL:</span>
                        <span className="font-bold text-primary text-[15px]">
                          €{((editForm.baseCost || 0) + (editForm.kmOverCost || 0) + (editForm.diariaCost || 0) + (editForm.notturnoCost || 0) + (editForm.isFestivo ? (editForm.baseCost || 0) * 0.5 : 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase">Notes</label>
                  <textarea value={editForm.notes?.startsWith('maps:') ? '' : (editForm.notes || '')} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-surface-dim border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary resize-none" rows={2} />
                </div>
              </div>
            )}

          </div>

          {/* Footer - fixed */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-outline-variant shrink-0">
            <button onClick={() => { onClose(); onDelete(service); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[13px] font-medium hover:bg-red-100 transition-colors min-h-[44px]">
              <Trash2 className="w-4 h-4" />
              Delete Service
            </button>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors min-h-[44px]">
                Close
              </button>
              <button onClick={handleSave}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-hover transition-colors min-h-[44px]">
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Parser Modal */}
      {showWhatsAppParser && service && (
        <WhatsAppParser
          onApply={(data) => setEditForm(prev => ({ ...prev, ...data }))}
          onClose={() => setShowWhatsAppParser(false)}
          service={service}
        />
      )}

      {/* Cost Change Warning Dialog */}
      {costChangeWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setCostChangeWarning(null)}>
          <div
            className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant w-full max-w-md flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-6 pt-5 pb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-on-surface">Production Parameter</h3>
                <p className="text-[12px] text-on-surface-variant">This value is configured for the entire production</p>
              </div>
            </div>
            <div className="px-6 py-3">
              <p className="text-[13px] text-on-surface leading-relaxed">
                These are the preconfigured parameters for <strong>ALL production</strong> —
                <span className="font-semibold text-primary"> {service.project || 'this production'}</span>.
              </p>
              <p className="text-[13px] text-on-surface mt-2">
                Do you still want to modify <strong>{costChangeWarning.label}</strong>?
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant">
              <button
                onClick={() => setCostChangeWarning(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:bg-surface-dim transition-colors"
              >
                Keep Original
              </button>
              <button
                onClick={confirmCostChange}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-[13px] font-medium hover:bg-amber-600 transition-colors"
              >
                Yes, Modify
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
