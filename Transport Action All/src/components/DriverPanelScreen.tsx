import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  MessageSquare, 
  Mail, 
  MapPin, 
  Clock, 
  AlertCircle, 
  Filter, 
  CheckCircle,
  Truck,
  Loader2,
  X,
  Save,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil
} from 'lucide-react';
import { Driver, ScreenId, getDriverAvatar } from '../types';
import { getDrivers, createDriver, updateDriver, deleteDriver, cleanupDrivers, DriverRecord, getSupplierRates, createSupplierRate, updateSupplierRate, deleteSupplierRate, SupplierRateDTO, getVehicleTypes, getServiceTypes, getCollaborators } from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface DriverPanelScreenProps {
  drivers: Driver[];
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

type SortField = 'name' | 'status' | 'vehicle' | 'lastUsed';
type SortDir = 'asc' | 'desc';

interface EditModalDriver {
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
  
  // Cleanup handler

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
          const isAvailable = dr.status === 'Disponible';
          const isInTransit = dr.status === 'Asignado';
          const isOffDuty = dr.status === 'Inactivo';
          const dbRec = findDbRecord(dr.id);

          return (
            <div 
              key={dr.id} 
              id={`driver-card-${dr.id}`}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col gap-2 hover:bg-surface-dim/30 transition-colors group relative"
            >
              {/* Header: avatar + name + status */}
              <div className="flex justify-between items-start">
                <div className="flex gap-2.5 items-center min-w-0">
                  <div className={`w-10 h-10 rounded-full overflow-hidden bg-surface-container shrink-0 ${
                    isAvailable ? 'ring-2 ring-primary/30' : isInTransit ? 'ring-2 ring-amber-400/30' : ''
                  }`}>
                    <img className="w-full h-full object-cover" src={dr.avatar} alt={dr.name} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-on-surface truncate">{dr.name}</h3>
                    <p className="text-[11px] text-on-surface-variant">{dr.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium gap-1 ${
                    isAvailable 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : isInTransit 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isAvailable ? 'bg-emerald-500 animate-ping' : isInTransit ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                    }`}></span>
                    {dr.status}
                  </span>
                  {/* Edit button */}
                  <button
                    onClick={() => {
                      setEditDriver({
                        id: dr.id,
                        name: dr.name,
                        phone: dbRec?.phone || '',
                        whatsapp: dbRec?.whatsapp || '',
                        vehiclePreferred: dbRec?.vehiclePreferred || dr.vehicle,
                        notes: dbRec?.notes || '',
                        status: dr.status || 'Disponible',
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
                    className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Edit driver"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Info grid */}
              <div className="flex-1 py-1">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wide">Vehicle</span>
                    <span className="font-medium text-on-surface">{dr.vehicle || '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wide">Phone</span>
                    <span className="font-medium text-on-surface truncate">{dbRec?.phone || '—'}</span>
                  </div>
                </div>

                <div className="h-px w-full bg-outline-variant/30 my-2"></div>

                {dbRec?.notes && (
                  <p className="text-[11px] text-on-surface-variant flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-primary shrink-0" /> 
                    <span className="truncate">{dbRec.notes}</span>
                  </p>
                )}
                {!dbRec?.notes && isAvailable && dr.currentLocation && (
                  <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary shrink-0" /> 
                    <span>{dr.currentLocation}</span>
                  </p>
                )}

                {isInTransit && dr.progress !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3 text-amber-500" /> Transit
                      </span>
                      <span>{dr.progress}%</span>
                    </div>
                    <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${dr.progress}%` }}></div>
                    </div>
                  </div>
                )}

                {isOffDuty && dr.restMandated && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" /> Rest mandated
                  </p>
                )}

                {dbRec && (
                  <div className="flex gap-3 mt-1 text-[10px] text-on-surface-variant">
                    <span>Rides: {dbRec.totalRides || 0}</span>
                    {dbRec.source && <span>Source: {dbRec.source}</span>}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 pt-2 border-t border-outline-variant/30">
                <button 
                  onClick={() => {
                    setEditDriver({
                      id: dr.id,
                      name: dr.name,
                      phone: dbRec?.phone || '',
                      whatsapp: dbRec?.whatsapp || '',
                      vehiclePreferred: dbRec?.vehiclePreferred || dr.vehicle,
                      notes: dbRec?.notes || '',
                      status: dr.status || 'Disponible',
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
                  className="flex-1 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-[12px] font-medium rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button 
                  onClick={() => {
                    const phone = (dbRec?.whatsapp || dbRec?.phone || '').replace(/[^0-9+]/g, '');
                    if (phone) {
                      window.open(`https://wa.me/${phone.replace(/^\+/, '')}`, '_blank');
                    }
                  }}
                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded transition-colors cursor-pointer"
                  title="Send WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setDeleteConfirm(dr.id)}
                  className="p-1.5 bg-surface-container hover:bg-red-50 text-on-surface-variant hover:text-red-500 rounded transition-colors cursor-pointer"
                  title="Delete driver"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container">
                  <img className="w-full h-full object-cover" src={getDriverAvatar(editDriver.name)} alt="" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-on-surface">Edit Driver</h3>
                  <p className="text-[11px] text-on-surface-variant">{editDriver.id}</p>
                </div>
              </div>
              <button onClick={() => setEditDriver(null)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            {/* Fields */}
            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Name</label>
                <input
                  type="text"
                  value={editDriver.name}
                  onChange={(e) => setEditDriver({ ...editDriver, name: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editDriver.phone}
                    onChange={(e) => setEditDriver({ ...editDriver, phone: e.target.value })}
                    placeholder="+39 ..."
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editDriver.whatsapp}
                    onChange={(e) => setEditDriver({ ...editDriver, whatsapp: e.target.value })}
                    placeholder="+39 ..."
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Preferred Vehicle</label>
                <input
                  type="text"
                  value={editDriver.vehiclePreferred}
                  onChange={(e) => setEditDriver({ ...editDriver, vehiclePreferred: e.target.value })}
                   placeholder="e.g. Van"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
                <textarea
                  value={editDriver.notes}
                  onChange={(e) => setEditDriver({ ...editDriver, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Status</label>
                <select
                  value={editDriver.status}
                  onChange={(e) => setEditDriver({ ...editDriver, status: e.target.value as EditModalDriver['status'] })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Disponible">Disponible</option>
                  <option value="Asignado">Asignado</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Type</label>
                  <select
                    value={editDriver.type}
                    onChange={(e) => setEditDriver({ ...editDriver, type: e.target.value, collaboratorId: e.target.value === 'interno' ? '' : editDriver.collaboratorId })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="interno">Interno (Propio)</option>
                    <option value="colaborador">Colaborador</option>
                  </select>
                </div>
                {editDriver.type === 'colaborador' && (
                  <div>
                    <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Collaborator / Provider</label>
                    <select
                      value={editDriver.collaboratorId}
                      onChange={(e) => setEditDriver({ ...editDriver, collaboratorId: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="">— Select collaborator —</option>
                      {collaborators.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {editDriver.type !== 'colaborador' && (
                  <div>
                    <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Operating Company</label>
                    <select
                      value={editDriver.operatingCompany}
                      onChange={(e) => setEditDriver({ ...editDriver, operatingCompany: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="">—</option>
                      <option value="Transport Action">Transport Action</option>
                      <option value="Movie Motion">Movie Motion</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Driver Ownership</label>
                  <select
                    value={editDriver.driverOwnership}
                    onChange={(e) => setEditDriver({ ...editDriver, driverOwnership: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="own">Propio (Own)</option>
                    <option value="rented">Alquilado (Rented)</option>
                    <option value="partner">Socio (Partner)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Last Import Date</label>
                  <input
                    type="text"
                    value={editDriver.lastImportDate ? new Date(editDriver.lastImportDate).toLocaleDateString() : '—'}
                    readOnly
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface-variant cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Email</label>
                  <input
                    type="email"
                    value={editDriver.email}
                    onChange={(e) => setEditDriver({ ...editDriver, email: e.target.value })}
                    placeholder="driver@email.com"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">IBAN</label>
                  <input
                    type="text"
                    value={editDriver.iban}
                    onChange={(e) => setEditDriver({ ...editDriver, iban: e.target.value })}
                    placeholder="IT60 X054 2811 1010 0000 0123 456"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">License Type</label>
                  <input
                    type="text"
                    value={editDriver.licenseType}
                    onChange={(e) => setEditDriver({ ...editDriver, licenseType: e.target.value })}
                    placeholder="e.g. B, C, D"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">License Expiry</label>
                  <input
                    type="date"
                    value={editDriver.licenseExpiry}
                    onChange={(e) => setEditDriver({ ...editDriver, licenseExpiry: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant shrink-0">
              <button
                onClick={() => { setShowRatesModal(editDriver); loadDriverRates(editDriver.id); }}
                className="px-4 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
              >
                💰 Supplier Rates
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditDriver(null)}
                  className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD DRIVER MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-[15px] font-semibold text-on-surface">New Driver</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Name *</label>
                <input
                  type="text"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  placeholder="e.g. Marco Rossi"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Phone</label>
                <input
                  type="text"
                  value={newDriver.phone}
                  onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  placeholder="+39 ..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wide block mb-1">Notes</label>
                <textarea
                  value={newDriver.notes}
                  onChange={(e) => setNewDriver({ ...newDriver, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant shrink-0">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveNewDriver}
                disabled={addSaving || !newDriver.name.trim()}
                className="px-4 py-1.5 bg-primary text-on-primary text-[12px] font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {addSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-sm shadow-xl p-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-on-surface">Delete Driver</h3>
                <p className="text-[12px] text-on-surface-variant">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-[13px] text-on-surface mb-4 overflow-y-auto flex-1 min-h-0">
              Are you sure you want to delete <strong>{allDrivers.find(d => d.id === deleteConfirm)?.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-1.5 bg-red-500 text-white text-[12px] font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SUPPLIER RATES MODAL ===== */}
      {showRatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
              <div>
                <h3 className="text-[15px] font-semibold text-on-surface">Supplier Rates — {showRatesModal.name}</h3>
                <p className="text-[11px] text-on-surface-variant">Internal driver pricing</p>
              </div>
              <button onClick={() => { setShowRatesModal(null); setEditRate(null); }} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
              {loadingRates ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : (
                <>
                  {/* Existing rates */}
                  {driverRates.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {driverRates.map(rate => (
                        <div key={rate.id} className="bg-surface-container-low border border-outline-variant rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-semibold text-on-surface">{rate.serviceType}</span>
                              <span className="text-[11px] text-on-surface-variant bg-surface-dim px-1.5 py-0.5 rounded">{rate.vehicleType}</span>
                              {rate.projectId && rate.projectId !== 'GLOBAL' && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{rate.projectId}</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditRate(rate); setIsNewRate(false); }} className="text-[11px] text-primary hover:underline cursor-pointer">Edit</button>
                              <button onClick={() => handleDeleteRate(rate.id)} className="text-[11px] text-red-500 hover:underline cursor-pointer ml-2">Delete</button>
                            </div>
                          </div>
                          <div className="text-[12px] text-on-surface-variant">
                            Base: €{rate.baseRate} | Km: €{rate.extraKmRate}/km | Hour: €{rate.extraHourRate}/h | Night: €{rate.nightExtra} | Holiday: €{rate.holidayExtra}
                          </div>
                          <div className="text-[11px] text-on-surface-variant mt-0.5">
                            Diaria Piena: €{rate.diariaPiena} | Mezza: €{rate.diariaMezza} | Included: {rate.includedKm}km / {rate.includedHours}h
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-on-surface-variant mb-4">No rates configured for this driver.</p>
                  )}

                  {/* Add/Edit rate form */}
                  {editRate ? (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                      <h4 className="text-[13px] font-semibold text-on-surface">{isNewRate ? 'New Rate' : 'Edit Rate'}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-on-surface-variant uppercase block mb-1">Service Type</label>
                          <select value={editRate.serviceType || 'Dispo'} onChange={e => setEditRate({ ...editRate, serviceType: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]">
                            {serviceTypes.map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-on-surface-variant uppercase block mb-1">Vehicle Type</label>
                          <select value={editRate.vehicleType || 'Van'} onChange={e => setEditRate({ ...editRate, vehicleType: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]">
                            {vehicleTypes.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-on-surface-variant uppercase block mb-1">Project</label>
                          <input type="text" value={editRate.projectId || ''} onChange={e => setEditRate({ ...editRate, projectId: e.target.value || 'GLOBAL' })} placeholder="GLOBAL" className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Base Rate (€)</label><input type="number" step="0.01" value={editRate.baseRate || ''} onChange={e => setEditRate({ ...editRate, baseRate: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                        <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Included Km</label><input type="number" value={editRate.includedKm || ''} onChange={e => setEditRate({ ...editRate, includedKm: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                        <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Included Hours</label><input type="number" step="0.5" value={editRate.includedHours || ''} onChange={e => setEditRate({ ...editRate, includedHours: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Extra Km (€)</label><input type="number" step="0.01" value={editRate.extraKmRate || ''} onChange={e => setEditRate({ ...editRate, extraKmRate: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                        <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Extra Hour (€)</label><input type="number" step="0.01" value={editRate.extraHourRate || ''} onChange={e => setEditRate({ ...editRate, extraHourRate: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                        <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Night (€)</label><input type="number" step="0.01" value={editRate.nightExtra || ''} onChange={e => setEditRate({ ...editRate, nightExtra: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                        <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Holiday (€)</label><input type="number" step="0.01" value={editRate.holidayExtra || ''} onChange={e => setEditRate({ ...editRate, holidayExtra: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Diaria Piena (€)</label><input type="number" step="0.01" value={editRate.diariaPiena || ''} onChange={e => setEditRate({ ...editRate, diariaPiena: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                        <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Diaria Mezza (€)</label><input type="number" step="0.01" value={editRate.diariaMezza || ''} onChange={e => setEditRate({ ...editRate, diariaMezza: parseFloat(e.target.value) || 0 })} className="w-full bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 text-[12px]" /></div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button onClick={() => setEditRate(null)} className="px-3 py-1 text-[12px] text-on-surface-variant hover:bg-surface-container rounded cursor-pointer">Cancel</button>
                        <button onClick={handleSaveRate} className="px-3 py-1 bg-primary text-on-primary text-[12px] font-medium rounded hover:bg-primary-hover flex items-center gap-1 cursor-pointer"><Save className="w-3 h-3" /> Save Rate</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setEditRate({ serviceType: 'Dispo', vehicleType: 'Van', projectId: 'GLOBAL', baseRate: 0, includedKm: 0, includedHours: 0, extraKmRate: 0, extraHourRate: 0, diariaPiena: 0, diariaMezza: 0, nightExtra: 0, holidayExtra: 0, waitHourRate: 0 }); setIsNewRate(true); }} className="w-full py-2 border border-dashed border-outline-variant rounded-lg text-[12px] text-primary font-medium hover:bg-primary/5 transition-colors cursor-pointer">
                      + Add Supplier Rate
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
