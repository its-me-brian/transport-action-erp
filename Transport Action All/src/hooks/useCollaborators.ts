import { useState, useEffect } from 'react';
import {
  CollaboratorDTO,
  getCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  getSupplierRates,
  SupplierRateDTO,
  createSupplierRate,
  updateSupplierRate,
  deleteSupplierRate,
  getVehicleTypes,
  getServiceTypes,
  getDriversByCollaborator,
  updateDriver,
  getDrivers,
  DriverRecord
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export function useCollaborators() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [collaborators, setCollaborators] = useState<CollaboratorDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit modal
  const [editCollaborator, setEditCollaborator] = useState<Partial<CollaboratorDTO> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Rate detail modal
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorDTO | null>(null);
  const [rates, setRates] = useState<SupplierRateDTO[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [editRate, setEditRate] = useState<Partial<SupplierRateDTO> | null>(null);
  const [isNewRate, setIsNewRate] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Vehicle Types & Service Types (admin-configurable)
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  // Linked Drivers for current collaborator being edited
  const [linkedDrivers, setLinkedDrivers] = useState<DriverRecord[]>([]);
  const [allDrivers, setAllDrivers] = useState<DriverRecord[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  useEffect(() => {
    loadCollaborators();
    getVehicleTypes().then(vt => setVehicleTypes(vt)).catch(() => {});
    getServiceTypes().then(st => setServiceTypes(st)).catch(() => {});
    getDrivers().then(list => {
      setAllDrivers(Array.isArray(list) ? list : []);
    }).catch(err => {
      console.error('[CollaboratorScreen] Failed to load drivers:', err);
    });
  }, []);

  const loadLinkedDrivers = async (collaboratorId: string) => {
    setLoadingDrivers(true);
    try {
      console.log('[CollaboratorScreen] loadLinkedDrivers called with collaboratorId:', collaboratorId);
      const result = await getDriversByCollaborator(collaboratorId);
      console.log('[CollaboratorScreen] loadLinkedDrivers result:', result);
      setLinkedDrivers(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('[CollaboratorScreen] Error loading linked drivers:', err);
      showToast('Error al cargar conductores vinculados', 'error');
    } finally {
      setLoadingDrivers(false);
    }
  };

  const loadCollaborators = async () => {
    setIsLoading(true);
    try {
      const result = await getCollaborators();
      if (Array.isArray(result)) {
        setCollaborators(result);
      }
    } catch (err) {
      console.error('Error loading collaborators:', err);
      showToast('Error al cargar colaboradores', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRates = async (collaboratorId: string) => {
    setLoadingRates(true);
    try {
      const result = await getSupplierRates({ supplierType: 'collaborator', supplierId: collaboratorId });
      if (Array.isArray(result)) {
        setRates(result);
      }
    } catch (err) {
      console.error('Error loading rates:', err);
      showToast('Error al cargar tarifas', 'error');
    } finally {
      setLoadingRates(false);
    }
  };

  const handleLinkDriver = async (driverId: string) => {
    if (!editCollaborator?.id) return;
    try {
      console.log('[CollaboratorScreen] handleLinkDriver: driverId=', driverId, 'collaboratorId=', editCollaborator.id);
      const result = await updateDriver(driverId, { collaboratorId: editCollaborator.id });
      console.log('[CollaboratorScreen] updateDriver result:', result);
      if (result.error) {
        showToast('Error: ' + result.error, 'error');
        return;
      }
      showToast('Conductor asociado', 'success');
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadLinkedDrivers(editCollaborator.id);
    } catch (err) {
      console.error('[CollaboratorScreen] Error linking driver:', err);
      showToast('Error al asociar conductor', 'error');
    }
  };

  const handleUnlinkDriver = async (driverId: string) => {
    if (!editCollaborator?.id) return;
    try {
      const result = await updateDriver(driverId, { collaboratorId: '' });
      if (result.error) {
        showToast('Error: ' + result.error, 'error');
        return;
      }
      showToast('Conductor desasociado', 'success');
      await loadLinkedDrivers(editCollaborator.id);
    } catch (err) {
      console.error('[CollaboratorScreen] Error unlinking driver:', err);
      showToast('Error al desasociar conductor', 'error');
    }
  };

  const filtered = collaborators.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) ||
             c.vat.toLowerCase().includes(q) ||
             c.id.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSave = async () => {
    if (!editCollaborator?.name?.trim()) {
      showToast('Name is required', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      if (isNew) {
        const result = await createCollaborator({
          name: editCollaborator.name!.trim(),
          vat: editCollaborator.vat || '',
          address: editCollaborator.address || '',
          phone: editCollaborator.phone || '',
          email: editCollaborator.email || '',
          paymentTerms: editCollaborator.paymentTerms || 30,
          notes: editCollaborator.notes || '',
          active: editCollaborator.active !== false,
          operatingCompany: editCollaborator.operatingCompany || ''
        });
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      } else {
        const result = await updateCollaborator(editCollaborator.id!, editCollaborator);
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      }
      setEditCollaborator(null);
      setLinkedDrivers([]);
      await loadCollaborators();
    } catch (err) {
      showToast('Error: ' + (err.message || err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteCollaborator(id);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      setDeleteConfirm(null);
      await loadCollaborators();
    } catch (err) {
      showToast('Error: ' + (err.message || err), 'error');
    }
  };

  const handleOpenRates = async (collaborator: CollaboratorDTO) => {
    setSelectedCollaborator(collaborator);
    await loadRates(collaborator.id);
  };

  const handleSaveRate = async () => {
    if (!editRate) return;
    setIsSaving(true);
    try {
      if (isNewRate) {
        const result = await createSupplierRate({
          supplierType: 'collaborator',
          supplierId: selectedCollaborator!.id,
          projectId: editRate.projectId || '',
          serviceType: editRate.serviceType || 'Dispo',
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
          operatingCompany: editRate.operatingCompany || ''
        });
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      } else {
        const result = await updateSupplierRate(editRate.id!, editRate);
        if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      }
      setEditRate(null);
      await loadRates(selectedCollaborator!.id);
    } catch (err) {
      showToast('Error: ' + (err.message || err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    try {
      const result = await deleteSupplierRate(rateId);
      if (result.error) { showToast('Error: ' + result.error, 'error'); return; }
      await loadRates(selectedCollaborator!.id);
    } catch (err) {
      showToast('Error: ' + (err.message || err), 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return {
    collaborators,
    isLoading,
    searchQuery,
    setSearchQuery,
    editCollaborator,
    setEditCollaborator,
    isSaving,
    isNew,
    setIsNew,
    selectedCollaborator,
    setSelectedCollaborator,
    rates,
    loadingRates,
    editRate,
    setEditRate,
    isNewRate,
    setIsNewRate,
    deleteConfirm,
    setDeleteConfirm,
    vehicleTypes,
    serviceTypes,
    linkedDrivers,
    allDrivers,
    loadingDrivers,
    filtered,
    handleSave,
    handleDelete,
    handleOpenRates,
    handleSaveRate,
    handleDeleteRate,
    handleLinkDriver,
    handleUnlinkDriver,
    loadLinkedDrivers,
    setLinkedDrivers,
    formatCurrency
  };
}
