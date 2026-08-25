import React, { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { X, Save, Trash2, MessageSquare } from 'lucide-react';
import {
  Service, formatTimeDisplay, getServiceStatusColor, mapServiceDTOToService
} from '../types';
import WhatsAppParser from './WhatsAppParser';
import { updateServiceField, assignDriver } from '../services/api';
import type { DriverRecord } from '../services/api';
import {
  BasicInfoSection, RouteSection, RapportinoSection,
  CostsSection, FlagsSection, CostChangeWarningDialog
} from './EditServiceSections';

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
              <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-surface-dim min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex flex-col gap-2 px-4 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0">

            <BasicInfoSection
              editForm={editForm}
              setEditForm={setEditForm}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              vehicleTypes={vehicleTypes}
              dbDrivers={dbDrivers}
              service={service}
              handleCostChange={handleCostChange}
            />

            <RouteSection
              editForm={editForm}
              setEditForm={setEditForm}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              vehicleTypes={vehicleTypes}
              dbDrivers={dbDrivers}
              service={service}
              handleCostChange={handleCostChange}
            />

            <RapportinoSection
              editForm={editForm}
              setEditForm={setEditForm}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              vehicleTypes={vehicleTypes}
              dbDrivers={dbDrivers}
              service={service}
              handleCostChange={handleCostChange}
            />

            <CostsSection
              editForm={editForm}
              setEditForm={setEditForm}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              vehicleTypes={vehicleTypes}
              dbDrivers={dbDrivers}
              service={service}
              handleCostChange={handleCostChange}
            />

            <FlagsSection
              editForm={editForm}
              setEditForm={setEditForm}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              vehicleTypes={vehicleTypes}
              dbDrivers={dbDrivers}
              service={service}
              handleCostChange={handleCostChange}
            />

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

      <CostChangeWarningDialog
        costChangeWarning={costChangeWarning}
        setCostChangeWarning={setCostChangeWarning}
        confirmCostChange={confirmCostChange}
        service={service}
      />
    </>
  );
}
