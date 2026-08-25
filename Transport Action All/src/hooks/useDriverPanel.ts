import { useState, useEffect, useCallback, useMemo } from 'react';
import { Driver, ScreenId, getDriverAvatar } from '../types';
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  cleanupDrivers,
  DriverRecord,
  getSupplierRates,
  createSupplierRate,
  updateSupplierRate,
  deleteSupplierRate,
  SupplierRateDTO,
  getVehicleTypes,
  getServiceTypes,
  getCollaborators,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';

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

interface UseDriverPanelProps {
  drivers: Driver[];
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function useDriverPanel({ drivers: propDrivers, onNavigate }: UseDriverPanelProps) {
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Disponible' | 'Asignado' | 'Inactivo'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbDrivers, setDbDrivers] = useState<DriverRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [editDriver, setEditDriver] = useState<EditModalDriver | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [collaborators, setCollaborators] = useState<{ id: string; name: string }[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', notes: '' });
  const [addSaving, setAddSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [showRatesModal, setShowRatesModal] = useState<EditModalDriver | null>(null);
  const [driverRates, setDriverRates] = useState<SupplierRateDTO[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [editRate, setEditRate] = useState<Partial<SupplierRateDTO> | null>(null);
  const [isNewRate, setIsNewRate] = useState(false);

  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  const loadDrivers = useCallback(() => {
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
  }, []);

  useEffect(() => {
    loadDrivers();
    getVehicleTypes().then(vt => setVehicleTypes(vt)).catch(() => {});
    getServiceTypes().then(st => setServiceTypes(st)).catch(() => {});
    getCollaborators({ active: true }).then(list => {
      console.log('[DriverPanel] Collaborators loaded:', list);
      setCollaborators(Array.isArray(list) ? list.map(c => ({ id: c.id, name: c.name })) : []);
    }).catch(err => {
      console.error('[DriverPanel] Failed to load collaborators:', err);
    });
  }, [loadDrivers]);

  const mappedDbDrivers: Driver[] = useMemo(() => {
    const byId = new Map<string, Driver>();
    dbDrivers.forEach(d => {
      const name = (d.name || '').trim();
      if (!name) return;
      const id = (d.id || '').trim();
      const existing = id ? byId.get(id) : undefined;
      if (existing) {
        if (!existing.vehicle && d.vehiclePreferred) existing.vehicle = d.vehiclePreferred;
        if (!existing.currentLocation && d.notes) existing.currentLocation = d.notes;
        return;
      }
      byId.set(id || `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, {
        id: id || `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        avatar: getDriverAvatar(name),
        status: (d.status || 'Disponible') as 'Disponible' | 'Asignado' | 'Inactivo',
        vehicle: d.vehiclePreferred || '',
        nextShift: d.lastUsed || '—',
        currentLocation: d.notes || '',
      });
    });
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
  }, [dbDrivers]);

  const allDrivers: Driver[] = mappedDbDrivers.length > 0 ? mappedDbDrivers : propDrivers;

  const filteredDrivers = useMemo(() => {
    return allDrivers
      .filter(dr => {
        const driverName = (dr.name || '').toLowerCase();
        const driverStatus = dr.status || 'Disponible';
        if (statusFilter !== 'All' && driverStatus !== statusFilter) return false;
        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (
            driverName.includes(q) ||
            (dr.vehicle || '').toLowerCase().includes(q) ||
            (dr.id || '').toLowerCase().includes(q)
          );
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
  }, [allDrivers, statusFilter, searchQuery, sortField, sortDir]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }, [sortField]);

  const handleCleanup = useCallback(async () => {
    if (!confirm('Remove non-driver entries (roles, titles, departments) from the database?')) return;
    try {
      const result = await cleanupDrivers();
      if (result.removed > 0) {
        showToast(`Removed ${result.removed} entries`, 'success');
        loadDrivers();
      } else {
        showToast('No entries to clean', 'warning');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    }
  }, [loadDrivers, showToast]);

  const saveEdit = useCallback(async () => {
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
  }, [editDriver, loadDrivers, showToast]);

  const loadDriverRates = useCallback(async (driverId: string) => {
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
  }, [showToast]);

  const handleSaveRate = useCallback(async () => {
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
  }, [editRate, showRatesModal, isNewRate, loadDriverRates, showToast]);

  const handleDeleteRate = useCallback(async (rateId: string) => {
    try {
      const result = await deleteSupplierRate(rateId);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      if (showRatesModal) await loadDriverRates(showRatesModal.id);
    } catch (err: any) {
      showToast('Error: ' + (err.message || err), 'error');
    }
  }, [showRatesModal, loadDriverRates, showToast]);

  const saveNewDriver = useCallback(async () => {
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
  }, [newDriver, loadDrivers, showToast]);

  const handleDelete = useCallback(async (id: string) => {
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
  }, [loadDrivers, showToast]);

  const findDbRecord = useCallback((id: string): DriverRecord | undefined => {
    return dbDrivers.find(d => d.id === id);
  }, [dbDrivers]);

  const handleEditDriver = useCallback((driver: Driver, dbRec: DriverRecord | undefined) => {
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
  }, []);

  const handleWhatsApp = useCallback((phone: string) => {
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean) window.open(`https://wa.me/${clean.replace(/^\+/, '')}`, '_blank');
  }, []);

  const openRatesModal = useCallback(() => {
    if (editDriver) {
      setShowRatesModal(editDriver);
      loadDriverRates(editDriver.id);
    }
  }, [editDriver, loadDriverRates]);

  const closeRatesModal = useCallback(() => {
    setShowRatesModal(null);
    setEditRate(null);
  }, []);

  const deleteConfirmDriverName = useMemo(() => {
    return allDrivers.find(d => d.id === deleteConfirm)?.name || '';
  }, [allDrivers, deleteConfirm]);

  return {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    sortField,
    sortDir,
    editDriver,
    setEditDriver,
    editSaving,
    collaborators,
    showAddModal,
    setShowAddModal,
    newDriver,
    setNewDriver,
    addSaving,
    deleteConfirm,
    setDeleteConfirm,
    showRatesModal,
    driverRates,
    loadingRates,
    editRate,
    setEditRate,
    isNewRate,
    setIsNewRate,
    vehicleTypes,
    serviceTypes,
    allDrivers,
    filteredDrivers,
    toggleSort,
    handleCleanup,
    saveEdit,
    loadDriverRates,
    handleSaveRate,
    handleDeleteRate,
    saveNewDriver,
    handleDelete,
    findDbRecord,
    handleEditDriver,
    handleWhatsApp,
    openRatesModal,
    closeRatesModal,
    deleteConfirmDriverName,
    onNavigate,
  };
}
