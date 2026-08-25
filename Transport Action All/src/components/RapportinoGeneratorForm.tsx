import React from 'react';
import { 
  FileSpreadsheet, 
  Building2, 
  Users, 
  Calendar, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { Service, formatTimeDisplay } from '../types';
import { CollaboratorDTO } from '../services/api';

type RapportinoType = 'production' | 'driver' | 'collaborator' | 'weekly' | 'daily';

interface BackendCosts {
  baseCost: number;
  overtimeHours: number;
  overtimeCost: number;
  kmDriven: number;
  kmCost: number;
  notturnoHours: number;
  notturnoCost: number;
  festivo: number;
  diaria: number;
  total: number;
  vehicleType: string;
  hoursWorked: number;
}

interface RapportinoGeneratorFormProps {
  rapportinoType: RapportinoType;
  onRapportinoTypeChange: (type: RapportinoType) => void;
  selectedProduction: string;
  onSelectedProductionChange: (v: string) => void;
  selectedDriver: string;
  onSelectedDriverChange: (v: string) => void;
  selectedCollaborator: string;
  onSelectedCollaboratorChange: (v: string) => void;
  collaboratorsList: CollaboratorDTO[];
  driverSearchQuery: string;
  onDriverSearchQueryChange: (v: string) => void;
  showDriverDropdown: boolean;
  onShowDriverDropdownChange: (v: boolean) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  periodType: string;
  onPeriodTypeChange: (v: string) => void;
  rapportinoName: string;
  onRapportinoNameChange: (v: string) => void;
  filteredServices: Service[];
  getSelectedServices: () => Service[];
  selectedServiceIds: Set<string>;
  onToggleServiceSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  isGenerating: boolean;
  generationError: string;
  onGenerate: () => void;
  calcBackendCosts: (svc: Service) => BackendCosts;
  buildServiceDescription: (svc: Service) => string;
  productions: string[];
  driverNames: string[];
}

export default function RapportinoGeneratorForm({
  rapportinoType,
  onRapportinoTypeChange,
  selectedProduction,
  onSelectedProductionChange,
  selectedDriver,
  onSelectedDriverChange,
  selectedCollaborator,
  onSelectedCollaboratorChange,
  collaboratorsList,
  driverSearchQuery,
  onDriverSearchQueryChange,
  showDriverDropdown,
  onShowDriverDropdownChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  periodType,
  onPeriodTypeChange,
  rapportinoName,
  onRapportinoNameChange,
  filteredServices,
  getSelectedServices,
  selectedServiceIds,
  onToggleServiceSelection,
  onToggleSelectAll,
  isGenerating,
  generationError,
  onGenerate,
  calcBackendCosts,
  buildServiceDescription,
  productions,
  driverNames
}: RapportinoGeneratorFormProps) {
  const selectedServices = getSelectedServices();

  return (
    <section id="rapportino-generator" className="bg-surface-container-low rounded-xl border border-outline-variant p-4 space-y-4">
      <div className="flex items-center gap-2 text-on-surface">
        <FileSpreadsheet className="w-5 h-5 text-primary" />
        <h2 className="text-[14px] font-semibold">Generate Rapportino</h2>
      </div>

      {/* Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { value: 'production', label: 'By Production', icon: Building2 },
          { value: 'driver', label: 'By Driver', icon: Users },
          { value: 'collaborator', label: 'By Collaborator', icon: Users },
          { value: 'weekly', label: 'Weekly Summary', icon: Calendar },
          { value: 'daily', label: 'Daily Summary', icon: FileSpreadsheet }
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onRapportinoTypeChange(value as RapportinoType)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors ${
              rapportinoType === value
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-dim'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Filters based on type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {rapportinoType === 'production' && (
          <div className="space-y-0.5">
            <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Production</label>
            <select
              value={selectedProduction}
              onChange={e => onSelectedProductionChange(e.target.value)}
              className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
            >
              <option value="">All Productions</option>
              {productions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {rapportinoType === 'driver' && (
          <div className="space-y-0.5 relative">
            <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Driver</label>
            <div className="relative">
              <input
                type="text"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                data-driver-search="true"
                value={selectedDriver || (driverSearchQuery || '')}
                onChange={e => {
                  const val = e.target.value;
                  onDriverSearchQueryChange(val);
                  onSelectedDriverChange('');
                  onShowDriverDropdownChange(true);
                }}
                onInput={e => {
                  const val = (e.target as HTMLInputElement).value;
                  onDriverSearchQueryChange(val);
                  onSelectedDriverChange('');
                  onShowDriverDropdownChange(true);
                }}
                onFocus={() => onShowDriverDropdownChange(true)}
                placeholder="Search drivers..."
                className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
              />
              {showDriverDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                  <button
                    onClick={() => {
                      onSelectedDriverChange('');
                      onDriverSearchQueryChange('');
                      onShowDriverDropdownChange(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[12px] hover:bg-surface-dim transition-colors text-on-surface"
                  >
                    All Drivers
                  </button>
                  {driverNames
                    .filter(d => !driverSearchQuery || d.toLowerCase().includes(driverSearchQuery.toLowerCase()))
                    .map(d => (
                      <button
                        key={d}
                        onClick={() => {
                          onSelectedDriverChange(d);
                          onDriverSearchQueryChange('');
                          onShowDriverDropdownChange(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[12px] hover:bg-surface-dim transition-colors ${
                          selectedDriver === d ? 'bg-primary/10 text-primary font-medium' : 'text-on-surface'
                        }`}
                      >
                        {d}
                      </button>
                    ))
                  }
                  {driverNames.filter(d => !driverSearchQuery || d.toLowerCase().includes(driverSearchQuery.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-[12px] text-on-surface-variant">No drivers found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {rapportinoType === 'collaborator' && (
          <div className="space-y-0.5">
            <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Collaborator</label>
            <select
              value={selectedCollaborator}
              onChange={e => onSelectedCollaboratorChange(e.target.value)}
              className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
            >
              <option value="">All Collaborators</option>
              {collaboratorsList.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-0.5">
          <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
            className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
          />
        </div>

        <div className="space-y-0.5">
          <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => onDateToChange(e.target.value)}
            className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
          />
        </div>

        <div className="space-y-0.5">
          <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Period Type</label>
          <select
            value={periodType}
            onChange={e => onPeriodTypeChange(e.target.value)}
            className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3 cursor-pointer"
          >
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
      </div>

      {/* Rapportino Name */}
      <div className="space-y-0.5">
        <label className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wide">Rapportino Name (optional)</label>
        <input
          type="text"
          value={rapportinoName}
          onChange={e => onRapportinoNameChange(e.target.value)}
          placeholder={rapportinoType === 'production' ? selectedProduction || 'Production Name' : rapportinoType === 'driver' ? selectedDriver || 'Driver Name' : 'Rapportino Name'}
          className="w-full h-9 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary text-[12px] text-on-surface outline-none px-3"
        />
      </div>

      {/* Rapportino Preview */}
      {filteredServices.length > 0 && (
        <div className="mt-4 p-4 bg-surface-dim rounded-xl border border-outline-variant">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-on-surface flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Preview ({selectedServices.length} of {filteredServices.length} selected)
            </h3>
            <span className="text-[12px] text-on-surface-variant">
              Total: <span className="font-semibold text-primary">€ {selectedServices.reduce((sum, s) => sum + calcBackendCosts(s).total, 0).toFixed(2)}</span>
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#388E3C] text-white">
                  <th className="px-1 py-1.5 text-center font-medium w-[30px]">
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.size === filteredServices.length && filteredServices.length > 0}
                      onChange={onToggleSelectAll}
                      className="rounded border-white"
                    />
                  </th>
                  <th className="px-1.5 py-1.5 text-left font-medium">DATE</th>
                  <th className="px-1.5 py-1.5 text-left font-medium">START-END</th>
                  <th className="px-1.5 py-1.5 text-left font-medium">VAN/CAR</th>
                  <th className="px-1.5 py-1.5 text-left font-medium max-w-[180px]">SERVICE</th>
                  <th className="px-1.5 py-1.5 text-left font-medium">CLIENT</th>
                  <th className="px-1.5 py-1.5 text-left font-medium">DRIVER</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">BASE</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">OT H</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">OT €</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">KM</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">KM €</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">FEST</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">NOT H</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">NOT €</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">DIARIA</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {filteredServices.map((svc) => {
                  const c = calcBackendCosts(svc);
                  const startEnd = (svc.startTime && svc.endTime) 
                    ? `${formatTimeDisplay(svc.startTime)} - ${formatTimeDisplay(svc.endTime)}` 
                    : svc.time ? formatTimeDisplay(svc.time) : '—';
                  return (
                    <tr key={svc.id} className={`hover:bg-surface-container-lowest ${selectedServiceIds.has(svc.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-1 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={selectedServiceIds.has(svc.id)}
                          onChange={() => onToggleServiceSelection(svc.id)}
                        />
                      </td>
                      <td className="px-1.5 py-1">{svc.date}</td>
                      <td className="px-1.5 py-1 font-medium">{startEnd}</td>
                      <td className="px-1.5 py-1">{c.vehicleType}</td>
                      <td className="px-1.5 py-1 truncate max-w-[180px]">{buildServiceDescription(svc)}</td>
                      <td className="px-1.5 py-1 truncate max-w-[120px]">{svc.passengers || '—'}</td>
                      <td className="px-1.5 py-1 font-medium">{svc.driverName || '—'}</td>
                      <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">€ {c.baseCost.toFixed(2)}</td>
                      <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">{c.overtimeHours > 0 ? c.overtimeHours.toFixed(1) : ''}</td>
                      <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">{c.overtimeCost > 0 ? `€ ${c.overtimeCost.toFixed(2)}` : ''}</td>
                      <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">{c.kmDriven > 0 ? c.kmDriven : ''}</td>
                      <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">{c.kmCost > 0 ? `€ ${c.kmCost.toFixed(2)}` : ''}</td>
                      <td className="px-1.5 py-1 text-right bg-[#F8BBD0]">{c.festivo > 0 ? `€ ${c.festivo.toFixed(2)}` : ''}</td>
                      <td className="px-1.5 py-1 text-right bg-[#F8BBD0]">{c.notturnoHours > 0 ? c.notturnoHours.toFixed(1) : ''}</td>
                      <td className="px-1.5 py-1 text-right bg-[#F8BBD0]">{c.notturnoCost > 0 ? `€ ${c.notturnoCost.toFixed(2)}` : ''}</td>
                      <td className="px-1.5 py-1 text-right bg-[#FFF9C4]">{c.diaria > 0 ? `€ ${c.diaria.toFixed(2)}` : ''}</td>
                      <td className="px-1.5 py-1 text-right font-semibold bg-amber-50">€ {c.total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 font-semibold text-[11px]">
                  <td colSpan={7} className="px-1.5 py-1.5">TOTAL ({selectedServices.length} services)</td>
                  <td className="px-1.5 py-1.5 text-right">€ {selectedServices.reduce((a, s) => a + calcBackendCosts(s).baseCost, 0).toFixed(2)}</td>
                  <td className="px-1.5 py-1.5 text-right">{selectedServices.reduce((a, s) => a + calcBackendCosts(s).overtimeHours, 0).toFixed(1)}</td>
                  <td className="px-1.5 py-1.5 text-right">€ {selectedServices.reduce((a, s) => a + calcBackendCosts(s).overtimeCost, 0).toFixed(2)}</td>
                  <td className="px-1.5 py-1.5 text-right">{selectedServices.reduce((a, s) => a + calcBackendCosts(s).kmDriven, 0)}</td>
                  <td className="px-1.5 py-1.5 text-right">€ {selectedServices.reduce((a, s) => a + calcBackendCosts(s).kmCost, 0).toFixed(2)}</td>
                  <td className="px-1.5 py-1.5 text-right">€ {selectedServices.reduce((a, s) => a + calcBackendCosts(s).festivo, 0).toFixed(2)}</td>
                  <td className="px-1.5 py-1.5 text-right">{selectedServices.reduce((a, s) => a + calcBackendCosts(s).notturnoHours, 0).toFixed(1)}</td>
                  <td className="px-1.5 py-1.5 text-right">€ {selectedServices.reduce((a, s) => a + calcBackendCosts(s).notturnoCost, 0).toFixed(2)}</td>
                  <td className="px-1.5 py-1.5 text-right">€ {selectedServices.reduce((a, s) => a + calcBackendCosts(s).diaria, 0).toFixed(2)}</td>
                  <td className="px-1.5 py-1.5 text-right text-primary font-bold">€ {selectedServices.reduce((a, s) => a + calcBackendCosts(s).total, 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Preview & Generate */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-outline-variant/50">
        <div className="flex items-center gap-4 text-[12px]">
          <span className="text-on-surface-variant">
            <span className="font-semibold text-on-surface">{selectedServices.length}</span> services selected
          </span>
          <span className="text-on-surface-variant">
            Total: <span className="font-semibold text-primary">€ {selectedServices.reduce((sum, s) => sum + calcBackendCosts(s).total, 0).toFixed(2)}</span>
          </span>
        </div>

        <button
          id="generar-rapportino-btn"
          onClick={onGenerate}
          disabled={isGenerating || selectedServices.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4" />
              Generate Rapportino
            </>
          )}
        </button>
      </div>

      {generationError && (
        <div className="flex items-center gap-2 text-red-600 text-[12px] bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {generationError}
        </div>
      )}
    </section>
  );
}
