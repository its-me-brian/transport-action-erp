import React, { useState, useRef } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { TransportService } from '../services/api';

// --- OperatingCompanyCell: inline dropdown for TA/MM ---
interface OperatingCompanyCellProps {
  service: TransportService;
  onUpdate: (serviceId: string, operatingCompany: string) => void;
}

export const OperatingCompanyCell = React.memo(function OperatingCompanyCell({ service, onUpdate }: OperatingCompanyCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const current = service.operatingCompany || '';
  const isEmpty = !current || current.trim() === '';

  const options = [
    { id: 'TA', name: 'Transport Action', color: 'text-blue-600' },
    { id: 'MM', name: 'Movie Motion', color: 'text-purple-600' },
  ];

  const handleSelect = (id: string) => {
    onUpdate(service.id, id);
    setIsOpen(false);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`group flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded hover:bg-primary/5 ${
          isEmpty ? 'text-red-500 italic' :
          current === 'TA' ? 'text-blue-600 font-medium' :
          current === 'MM' ? 'text-purple-600 font-medium' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-[11px]">{isEmpty ? '(vacío)' : current}</span>
        <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />
      </div>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg min-w-[160px] py-1">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-dim transition-colors cursor-pointer flex items-center gap-2 ${
                current === opt.id ? 'bg-primary/10 font-medium' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${opt.id === 'TA' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
              <span className={opt.color}>{opt.name}</span>
              {current === opt.id && <Check className="w-3 h-3 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// --- VehicleTypeCell: inline dropdown for Van/Car ---
interface VehicleTypeCellProps {
  service: TransportService;
  onUpdate: (serviceId: string, vehicleType: string) => void;
}

export const VehicleTypeCell = React.memo(function VehicleTypeCell({ service, onUpdate }: VehicleTypeCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const current = service.vehicleType || '';
  const isEmpty = !current || current.trim() === '';

  const options = [
    { id: 'Van', name: 'Van' },
    { id: 'Car', name: 'Car' },
    { id: 'Walking', name: 'Walking' },
  ];

  const handleSelect = (id: string) => {
    onUpdate(service.id, id);
    setIsOpen(false);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`group flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded hover:bg-primary/5 ${isEmpty ? 'text-red-500 italic' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-[11px]">{isEmpty ? '(vacío)' : current}</span>
        <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />
      </div>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg min-w-[120px] py-1">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-dim transition-colors cursor-pointer flex items-center gap-2 ${
                current === opt.id ? 'bg-primary/10 font-medium' : ''
              }`}
            >
              <span>{opt.name}</span>
              {current === opt.id && <Check className="w-3 h-3 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// --- ServiceTypeCell: inline dropdown for Dispo/Transfer Airport/Transfer City ---
interface ServiceTypeCellProps {
  service: TransportService;
  onUpdate: (serviceId: string, serviceType: string) => void;
}

export const ServiceTypeCell = React.memo(function ServiceTypeCell({ service, onUpdate }: ServiceTypeCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const current = service.serviceType || '';
  const isConfirmed = service.serviceTypeConfirmed;
  const isEmpty = !current || current.trim() === '';

  const options = [
    { id: 'Dispo', name: 'Dispo' },
    { id: 'Transfer Airport', name: 'Transfer Airport' },
    { id: 'Transfer City', name: 'Transfer City' },
  ];

  const handleSelect = (id: string) => {
    onUpdate(service.id, id);
    setIsOpen(false);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const bgClass = isEmpty ? 'text-red-500 italic' :
    !isConfirmed ? 'bg-red-50 border border-red-200 text-red-700' :
    current === 'Transfer Airport' ? 'bg-blue-50 text-blue-700' :
    current === 'Transfer City' ? 'bg-blue-50 text-blue-700' :
    current === 'Dispo' ? 'bg-amber-50 text-amber-700 border border-amber-300' :
    'bg-surface-dim text-on-surface-variant';

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`group flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded hover:bg-primary/5 ${bgClass}`}
        onClick={() => setIsOpen(!isOpen)}
        title={!isConfirmed ? 'Service type intuited — click to confirm' : ''}
      >
        <span className="truncate text-[11px] font-medium">{isEmpty ? '(vacío)' : current}</span>
        {!isConfirmed && !isEmpty && <span className="text-[9px] ml-0.5" title="Unconfirmed">⚠</span>}
        <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />
      </div>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg min-w-[160px] py-1">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-dim transition-colors cursor-pointer flex items-center gap-2 ${
                current === opt.id ? 'bg-primary/10 font-medium' : ''
              }`}
            >
              <span>{opt.name}</span>
              {current === opt.id && <Check className="w-3 h-3 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
