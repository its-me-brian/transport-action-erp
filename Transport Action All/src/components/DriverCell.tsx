import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { TransportService, DriverRecord } from '../services/api';

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

export interface DriverCellProps {
  service: TransportService;
  dbDrivers: DriverRecord[];
  onUpdate: (serviceId: string, driver: string, driverPhone: string) => void;
}

const DriverCell = React.memo(function DriverCell({ service, dbDrivers, onUpdate }: DriverCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [phone, setPhone] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const currentValue = service.driver || '';
  const isEmpty = !currentValue || currentValue.trim() === '';

  const getLastName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : name.toLowerCase();
  };

  const sorted = [...dbDrivers].sort((a, b) => {
    const lastA = getLastName(a.name);
    const lastB = getLastName(b.name);
    if (lastA !== lastB) return lastA.localeCompare(lastB);
    return a.name.localeCompare(b.name);
  });

  const q = search.toLowerCase().trim();
  const filteredDrivers = q
    ? sorted.filter(d => d.name.toLowerCase().includes(q))
    : sorted;

  const isExistingDriver = dbDrivers.some(d => d.name === search.trim());
  const showCreateOption = search.trim().length > 0 && !isExistingDriver;

  const handleSelect = (name: string) => {
    const matched = dbDrivers.find(d => d.name === name);
    if (matched) {
      const driverPhone = matched.phone || service.driverPhone || '';
      setPhone(driverPhone);
      onUpdate(service.id, name, driverPhone);
    } else {
      onUpdate(service.id, name, phone || service.driverPhone || '');
    }
    setIsOpen(false);
    setSearch('');
    setPhone('');
  };

  const handleCreateAndAssign = async () => {
    const name = search.trim();
    if (!name) return;
    onUpdate(service.id, name, phone || '');
    setIsOpen(false);
    setSearch('');
    setPhone('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
      setPhone('');
    }
    if (e.key === 'Enter' && filteredDrivers.length > 0 && !showCreateOption) {
      e.preventDefault();
      handleSelect(filteredDrivers[0].name);
    }
  };

  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`group flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded hover:bg-primary/5 ${isEmpty ? 'text-red-500 italic' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{isEmpty ? '(vacío)' : currentValue}</span>
        <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0" />
      </div>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg min-w-[180px] sm:min-w-[220px] max-h-[280px] flex flex-col">
          <div className="px-2 pt-2 pb-1 border-b border-outline-variant/50">
            <input
              ref={searchInputRef}
              type="text"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-driver-search="true"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              onKeyDown={handleKeyDown}
              placeholder="Search driver by name..."
              className="w-full px-2 py-1.5 text-[12px] border border-outline-variant rounded bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50"
            />
          </div>
          <div className="overflow-y-auto flex-1 py-0.5">
            {search.trim() && showCreateOption && (
              <div className="px-2 py-1.5 border-b border-outline-variant/30">
                <div className="text-[11px] text-on-surface-variant mb-1">Phone for new driver:</div>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+39..."
                  className="w-full px-2 py-1 text-[11px] border border-outline-variant rounded bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleCreateAndAssign}
                  className="w-full mt-1 text-left px-2 py-1 text-[11px] bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded transition-colors cursor-pointer"
                >
                  Create &quot;{search.trim()}&quot; {phone ? `(${phone})` : ''}
                </button>
              </div>
            )}
            {search.trim() && !showCreateOption && (
              <button
                onClick={() => { handleSelect(search.trim()); setIsOpen(false); setSearch(''); setPhone(''); }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-primary/5 transition-colors cursor-pointer border-b border-outline-variant/30"
              >
                <span className="text-primary font-medium">Use &quot;{search.trim()}&quot;</span>
              </button>
            )}
            <button
              onClick={() => { handleSelect(''); setIsOpen(false); setSearch(''); setPhone(''); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-on-surface-variant hover:bg-surface-dim transition-colors cursor-pointer"
            >
              — Unassigned —
            </button>
            {filteredDrivers.length > 0 && <div className="border-t border-outline-variant/30 my-0.5" />}
            {filteredDrivers.map(d => (
              <button
                key={d.id}
                onClick={() => handleSelect(d.name)}
                className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-dim transition-colors cursor-pointer ${
                  currentValue === d.name ? 'bg-primary/10 text-primary font-medium' : 'text-on-surface'
                }`}
              >
                <span className="font-medium">{d.name}</span>
                {d.phone && <span className="text-on-surface-variant ml-1">{d.phone}</span>}
              </button>
            ))}
            {filteredDrivers.length === 0 && search.trim() && !showCreateOption && (
              <div className="px-3 py-1.5 text-[11px] text-on-surface-variant italic text-center border-t border-outline-variant/30">
                No drivers match
              </div>
            )}
            {dbDrivers.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-on-surface-variant italic text-center">
                No drivers in DB yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default DriverCell;
