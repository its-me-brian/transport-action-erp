import React from 'react';
import { Sliders, ChevronRight, Plus, X } from 'lucide-react';

interface PricingReferenceSectionProps {
  serviceTypes: string[];
  onServiceTypesChange: (types: string[]) => void;
  newServiceType: string;
  onNewServiceTypeChange: (v: string) => void;
  vehicleTypes: string[];
  onVehicleTypesChange: (types: string[]) => void;
  newVehicleType: string;
  onNewVehicleTypeChange: (v: string) => void;
  onNavigate: (screen: string) => void;
}

export default function PricingReferenceSection({
  serviceTypes, onServiceTypesChange, newServiceType, onNewServiceTypeChange,
  vehicleTypes, onVehicleTypesChange, newVehicleType, onNewVehicleTypeChange,
  onNavigate
}: PricingReferenceSectionProps) {
  return (
    <section id="pricing-reference-section" className="space-y-2">
      <div className="flex items-center gap-2">
        <Sliders className="w-4 h-4 text-primary" />
        <h3 className="text-[14px] font-semibold text-on-surface">Pricing Reference</h3>
      </div>
      <p className="text-[11px] text-on-surface-variant">Service types and vehicle types used across the system. Configure rates in Rate Cards (revenue) and Provider Rates (cost).</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Service Types */}
        <div className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant">
          <h5 className="text-[13px] font-semibold text-on-surface mb-3">Service Types</h5>
          <div className="space-y-1.5 mb-3">
            {serviceTypes.map((st, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">{st}</span>
                <button
                  onClick={() => onServiceTypesChange(serviceTypes.filter((_, idx) => idx !== i))}
                  className="text-on-surface-variant hover:text-red-500 transition-colors cursor-pointer"
                ><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newServiceType}
              onChange={e => onNewServiceTypeChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newServiceType.trim()) {
                  onServiceTypesChange([...serviceTypes, newServiceType.trim()]);
                  onNewServiceTypeChange('');
                }
              }}
              placeholder="New type..."
              className="flex-1 bg-surface-dim border border-outline-variant rounded px-2 py-1 text-[11px] text-on-surface focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                if (newServiceType.trim()) {
                  onServiceTypesChange([...serviceTypes, newServiceType.trim()]);
                  onNewServiceTypeChange('');
                }
              }}
              className="px-2 py-1 bg-primary/10 text-primary rounded text-[11px] font-medium hover:bg-primary/20 transition-colors cursor-pointer"
            ><Plus className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Vehicle Types */}
        <div className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant">
          <h5 className="text-[13px] font-semibold text-on-surface mb-3">Vehicle Types</h5>
          <div className="space-y-1.5 mb-3">
            {vehicleTypes.map((vt, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary text-[10px] font-medium rounded">{vt}</span>
                <button
                  onClick={() => onVehicleTypesChange(vehicleTypes.filter((_, idx) => idx !== i))}
                  className="text-on-surface-variant hover:text-red-500 transition-colors cursor-pointer"
                ><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newVehicleType}
              onChange={e => onNewVehicleTypeChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newVehicleType.trim()) {
                  onVehicleTypesChange([...vehicleTypes, newVehicleType.trim()]);
                  onNewVehicleTypeChange('');
                }
              }}
              placeholder="New type..."
              className="flex-1 bg-surface-dim border border-outline-variant rounded px-2 py-1 text-[11px] text-on-surface focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                if (newVehicleType.trim()) {
                  onVehicleTypesChange([...vehicleTypes, newVehicleType.trim()]);
                  onNewVehicleTypeChange('');
                }
              }}
              className="px-2 py-1 bg-secondary/10 text-secondary rounded text-[11px] font-medium hover:bg-secondary/20 transition-colors cursor-pointer"
            ><Plus className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant">
          <h5 className="text-[13px] font-semibold text-on-surface mb-3">Configure Rates</h5>
          <div className="space-y-2">
            <button
              onClick={() => onNavigate('rate_cards')}
              className="w-full flex items-center justify-between p-2 bg-surface-dim/30 rounded-lg hover:bg-surface-dim/60 transition-colors text-left cursor-pointer"
            >
              <div>
                <p className="text-[12px] font-medium text-on-surface">Rate Cards</p>
                <p className="text-[10px] text-on-surface-variant">Client revenue pricing</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
            </button>
            <button
              onClick={() => onNavigate('providers')}
              className="w-full flex items-center justify-between p-2 bg-surface-dim/30 rounded-lg hover:bg-surface-dim/60 transition-colors text-left cursor-pointer"
            >
              <div>
                <p className="text-[12px] font-medium text-on-surface">Provider Rates</p>
                <p className="text-[10px] text-on-surface-variant">Supplier & driver costs</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
