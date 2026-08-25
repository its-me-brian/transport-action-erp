import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Driver, ScreenId, getDriverAvatar } from '../types';
import { getDrivers, createDriver, updateDriver, deleteDriver, cleanupDrivers, DriverRecord, getSupplierRates, createSupplierRate, updateSupplierRate, deleteSupplierRate, SupplierRateDTO, getVehicleTypes, getServiceTypes, getCollaborators } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import DriverCard from './DriverCard';
import DriverEditModal from './DriverEditModal';
import DriverAddModal from './DriverAddModal';
import DriverDeleteConfirm from './DriverDeleteConfirm';
import SupplierRatesModal from './SupplierRatesModal';

interface DriverPanelScreenProps {
  drivers: Driver[];
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export type SortField = 'name' | 'status' | 'vehicle' | 'lastUsed';
export type SortDir = 'asc' | 'desc';

export interface EditModalDriver {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  vehiclePreferred: string;
  notes: string;
  status: 'Disponible' | 'Asignado' | 'Inactivo';
  type: string;
  collaboratorId: string;
  driverOwnership: string;
  email: string;
  iban: string;
  licenseType: string;
  licenseExpiry: string;
  operatingCompany: string;
  lastImportDate: string;
}

export default function DriverPanelScreen({ drivers: propDrivers, onNavigate }: DriverPanelScreenProps) {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'All' | 'Disponible' | 'Asignado' | 'Inactivo'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbDrivers, setDbDrivers] = useState<DriverRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Edit modal
  const [editDriver, setEditDriver] = useState<EditModalDriver | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Collaborators list for dropdown
  const [collaborators, setCollaborators] = useState<{ id: string; name: string }[]>([]);

  // Add driver modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', notes: '' });
  const [addSaving, setAddSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // SupplierRate modal for internal drivers
  const [showRatesModal, setShowRatesModal] = useState<EditModalDriver | null>(null);
  const [driverRates, setDriverRates] = useState<SupplierRateDTO[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [editRate, setEditRate] = useState<Partial<SupplierRateDTO> | null>(null);
  const [isNewRate, setIsNewRate] = useState(false);

  // Vehicle Types & Service Types (admin-configurable)
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const handleCleanup = async () => {
    if (!confirm('Remove non-driver entries (roles, titles, departments) from the database?')) return;
    try {
      const result = await cleanupDrivers();
      if (result.removed > 0) {
        showToast(`Removed ${result.removed} entries`, 'success');
        loadDrivers();
      } else {
        showToast('No entries to clean', 'warning');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // Load drivers from API
  const loadDrivers = () => {
    setIsLoading(true);
    getDrivers()
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setDbDrivers(arr);
      })
      .catch(err => {
        console.error('[DriverPanel] getDrivers failed:', err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadDrivers();
    getVehicleTypes().then(vt => setVehicleTypes(vt)).catch(() => {});
    getServiceTypes().then(st => setServiceTypes(st)).catch(() => {});
    // Load collaborators for the dropdown
    getCollaborators({ active: true }).then(list => {
      console.log('[DriverPanel] Collaborators loaded:', list);
      setCollaborators(Array.isArray(list) ? list.map(c => ({ id: c.id, name: c.name })) : []);
    }).catch(err => {
      console.error('[DriverPanel] Failed to load collaborators:', err);
    });
  }, []);

  // Map DB drivers to the format the UI expects, with deduplication
  const mappedDbDrivers: Driver[] = (() => {
    // Pass 1: dedup by ID (same ID = same physical row in Sheets)
    const byId = new Map<string, Driver>();
    dbDrivers.forEach(d => {
      const name = (d.name || '').trim();
      if (!name) return;
      const id = (d.id || '').trim();
      const existing = id ? byId.get(id) : undefined;
      if (existing) {
        // Keep the one with more data
        if (!existing.vehicle && d.vehiclePreferred) existing.vehicle = d.vehiclePreferred;
        if (!existing.currentLocation && d.notes) existing.currentLocation = d.notes;
        return;
      }
      byId.set(id || `new-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, {
        id: id || `new-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        name,
        avatar: getDriverAvatar(name),
        status: (d.status || 'Disponible') as 'Disponible' | 'Asignado' | 'Inactivo',
        vehicle: d.vehiclePreferred || '',
        nextShift: d.lastUsed || '—',
        currentLocation: d.notes || '',
      });
    });
    // Pass 2: dedup by normalized name (different IDs, same name)
    const byName = new Map<string, Driver>();
    for (const dr of byId.values()) {
      const key = dr.name.toLowerCase().replace(/\s+/g, ' ').replace(/['']/g, "'").trim();
      const existing = byName.get(key);
      if (existing) {
        if (!existing.vehicle && dr.vehicle) existing.vehicle = dr.vehicle;
        continue;
      }
      byName.set(key, dr);
    }
    return Array.from(byName.values());
  })();

  // Use DB drivers as the primary source — propDrivers is always [] from App.tsx
  const allDrivers: Driver[] = mappedDbDrivers.length > 0 ? mappedDbDrivers : propDrivers;

  // Sort + Filter
  const filteredDrivers = allDrivers
    .filter(dr => {
      const driverName = (dr.name || '').toLowerCase();
      const driverStatus = dr.status || 'Disponible';
      if (statusFilter !== 'All' && driverStatus !== statusFilter) return false;
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return driverName.includes(q) || (dr.vehicle || '').toLowerCase().includes(q) || (dr.id || '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name': return (a.name || '').localeCompare(b.name || '') * dir;
        case 'status': return (a.status || '').localeCompare(b.status || '') * dir;
        case 'vehicle': return (a.vehicle || '').localeCompare(b.vehicle || '') * dir;
        case 'lastUsed': return (a.nextShift || '').localeCompare(b.nextShift || '') * dir;
        default: return 0;
      }
    });

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Save edit
  const saveEdit = async () => {
    if (!editDriver) return;
    setEditSaving(true);
    try {
      const result = await updateDriver(editDriver.id, {
        name: editDriver.name,
        phone: editDriver.phone,
        whatsapp: editDriver.whatsapp,
        vehiclePreferred: editDriver.vehiclePreferred,
        notes: editDriver.notes,
        status: editDriver.status,
        type: editDriver.type,
        collaboratorId: editDriver.collaboratorId,
        driverOwnership: editDriver.driverOwnership,
        email: editDriver.email,
        iban: editDriver.iban,
        licenseType: editDriver.licenseType,
        licenseExpiry: editDriver.licenseExpiry,
        operatingCompany: editDriver.operatingCompany,
      });
      if (result.error) {
        showToast('Error: ' + result.error, 'error');
      } else {
        loadDrivers();
      }
    } catch (e: any) {
      showToast('Error: ' + (e.message || 'Unknown'), 'error');
    } finally {
      setEditSaving(false);
      setEditDriver(null);
    }
  };

  // SupplierRate functions for internal drivers
  const loadDriverRates = async (driverId: string) => {
    setLoadingRates(true);
    try {
      const result = await getSupplierRates({ supplierType: 'internal_driver', supplierId: driverId });
      if (Array.isArray(result)) {
        setDriverRates(result);
      }
    } catch (err) {
      console.error('Error loading rates:', err);
      showToast('Error loading rates', 'error');
    } finally {
      setLoadingRates(false);
    }
  };

  const handleSaveRate = async () => {
    if (!editRate || !showRatesModal) return;
    try {
      if (isNewRate) {
        const result = await createSupplierRate({
          supplierType: 'internal_driver',
          supplierId: showRatesModal.id,
          projectId: editRate.projectId || 'GLOBAL',
          serviceType: editRate.serviceType || 'disposal',
          vehicleType: editRate.vehicleType || 'Van',
          baseRate: editRate.baseRate || 0,
          includedKm: editRate.includedKm || 0,
          includedHours: editRate.includedHours || 0,
          extraKmRate: editRate.extraKmRate || 0,
          extraHourRate: editRate.extraHourRate || 0,
          diariaPiena: editRate.diariaPiena || 0,
          diariaMezza: editRate.diariaMezza || 0,
          nightExtra: editRate.nightExtra || 0,
          holidayExtra: editRate.holidayExtra || 0,
          waitHourRate: editRate.waitHourRate || 0,
          validFrom: editRate.validFrom || '',
          validTo: editRate.validTo || '',
          operatingCompany: editRate.operatingCompany || '',
        });
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      } else {
        const result = await updateSupplierRate(editRate.id!, editRate);
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      }
      setEditRate(null);
      await loadDriverRates(showRatesModal.id);
    } catch (err: any) {
      showToast('Error: ' + (err.message || err), 'error');
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    try {
      const result = await deleteSupplierRate(rateId);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      if (showRatesModal) await loadDriverRates(showRatesModal.id);
    } catch (err: any) {
      showToast('Error: ' + (err.message || err), 'error');
    }
  };

  // Add new driver
  const saveNewDriver = async () => {
    if (!newDriver.name.trim()) {
      showToast('Name is required', 'warning');
      return;
    }
    setAddSaving(true);
    try {
      const result = await createDriver(newDriver.name, newDriver.phone, newDriver.notes);
      if (result.error) {
        showToast('Error: ' + result.error, 'error');
      } else {
        setNewDriver({ name: '', phone: '', notes: '' });
        loadDrivers();
      }
    } catch (e: any) {
      showToast('Error: ' + (e.message || 'Unknown'), 'error');
    } finally {
      setAddSaving(false);
      setShowAddModal(false);
    }
  };

  // Delete driver
  const handleDelete = async (id: string) => {
    try {
      const result = await deleteDriver(id);
      if (result.error) {
        showToast('Error: ' + result.error, 'error');
      } else {
        setDeleteConfirm(null);
        loadDrivers();
      }
    } catch (e: any) {
      showToast('Error: ' + (e.message || 'Unknown'), 'error');
    }
  };

  // Find DB record by ID for edit modal
  const findDbRecord = (id: string): DriverRecord | undefined => dbDrivers.find(d => d.id === id);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition-colors cursor-pointer ${
        sortField === field ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
      }`}
    >
      {label}
      {sortField === field ? (
        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );

  return (
    <div id="driver-management-screen" className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      
      {/* Top Header/Action Bar */}
      <header id="driver-header-actions" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Driver Management</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            id="driver-panel-import-btn"
            onClick={() => onNavigate('transport_list', 'push')}
            className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          
          <button 
            id="driver-panel-add-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Driver</span>
          </button>
        </div>
      </header>

      {/* Filter, Search, and Sort Bar */}
      <div id="driver-filters-bar" className="flex flex-col gap-2 px-3 py-2 bg-surface-dim border border-outline-variant rounded-lg">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input 
              type="text" 
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              data-driver-search="true"
              placeholder="Search drivers, vehicles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary outline-none text-on-surface"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Disponible' | 'Asignado' | 'Inactivo')}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface text-[12px] font-medium rounded-lg px-2 py-1.5 focus:border-primary outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Disponible">Disponible</option>
              <option value="Asignado">Asignado</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wide mr-1">Sort:</span>
          <SortButton field="name" label="Name" />
          <SortButton field="status" label="Status" />
          <SortButton field="vehicle" label="Vehicle" />
          <SortButton field="lastUsed" label="Last Used" />
          <button
            onClick={handleCleanup}
            className="ml-auto text-[10px] text-on-surface-variant hover:text-red-500 cursor-pointer underline"
          >
            Clean junk entries
          </button>
        </div>
      </div>

      {/* Driver Grid Deck */}
      <div id="drivers-deck" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5 items-center">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-4 bg-surface-container-highest rounded w-28 animate-pulse" />
                      <div className="h-2.5 bg-surface-container-highest rounded w-20 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-5 bg-surface-container-highest rounded w-16 animate-pulse" />
                </div>
                <div className="flex gap-3">
                  <div className="h-2.5 bg-surface-container-highest rounded w-24 animate-pulse" />
                  <div className="h-2.5 bg-surface-container-highest rounded w-16 animate-pulse" />
                </div>
              </div>
            ))}
          </>
        ) : filteredDrivers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Users className="w-10 h-10 text-outline" />
            <span className="text-[13px] text-on-surface-variant">
              {searchQuery ? 'No drivers match your search' : 'No drivers in database. Import a Transport List to populate.'}
            </span>
          </div>
        ) : filteredDrivers.map((dr) => {
          const dbRec = findDbRecord(dr.id);
          return (
            <DriverCard
              key={dr.id}
              driver={dr}
              dbRec={dbRec}
              onEdit={(driver, dbRec) => {
                setEditDriver({
                  id: driver.id,
                  name: driver.name,
                  phone: dbRec?.phone || '',
                  whatsapp: dbRec?.whatsapp || '',
                  vehiclePreferred: dbRec?.vehiclePreferred || driver.vehicle,
                  notes: dbRec?.notes || '',
                  status: driver.status || 'Disponible',
                  type: dbRec?.type || 'interno',
                  collaboratorId: dbRec?.collaboratorId || '',
                  driverOwnership: dbRec?.driverOwnership || 'own',
                  email: dbRec?.email || '',
                  iban: dbRec?.iban || '',
                  licenseType: dbRec?.licenseType || '',
                  licenseExpiry: dbRec?.licenseExpiry || '',
                  operatingCompany: dbRec?.operatingCompany || '',
                  lastImportDate: dbRec?.lastImportDate || '',
                });
              }}
              onDelete={(id) => setDeleteConfirm(id)}
              onWhatsApp={(phone) => {
                const clean = phone.replace(/[^0-9+]/g, '');
                if (clean) window.open(`https://wa.me/${clean.replace(/^\+/, '')}`, '_blank');
              }}
            />
          );
        })}
      </div>

      {/* Modals */}
      {editDriver && (
        <DriverEditModal
          driver={editDriver}
          onClose={() => setEditDriver(null)}
          onSave={saveEdit}
          saving={editSaving}
          collaborators={collaborators}
          onOpenRates={() => { setShowRatesModal(editDriver); loadDriverRates(editDriver.id); }}
          onChange={(d) => setEditDriver(d)}
        />
      )}

      {showAddModal && (
        <DriverAddModal
          onClose={() => setShowAddModal(false)}
          onSave={saveNewDriver}
          saving={addSaving}
          newDriver={newDriver}
          onChange={setNewDriver}
        />
      )}

      {deleteConfirm && (
        <DriverDeleteConfirm
          driverName={allDrivers.find(d => d.id === deleteConfirm)?.name || ''}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
        />
      )}

      {showRatesModal && (
        <SupplierRatesModal
          driverName={showRatesModal.name}
          onClose={() => { setShowRatesModal(null); setEditRate(null); }}
          loading={loadingRates}
          rates={driverRates}
          editRate={editRate}
          isNewRate={isNewRate}
          onEditRate={(r) => setEditRate(r)}
          onSetIsNewRate={setIsNewRate}
          onSaveRate={handleSaveRate}
          onDeleteRate={handleDeleteRate}
          onCancelEdit={() => setEditRate(null)}
          serviceTypes={serviceTypes}
          vehicleTypes={vehicleTypes}
        />
      )}
    </div>
  );
}
