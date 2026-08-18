// ============================================================================
// SUPPLIERRATE.GS — Entidad SupplierRate (tarifa de proveedor: conductor interno o colaborador)
// ============================================================================

const SupplierRateRepository = {
  SHEET: SHEETS.SupplierRates,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getBySupplier(supplierType, supplierId) {
    return _find(this.SHEET, row =>
      row.SupplierType === supplierType && row.SupplierID === supplierId
    );
  },

  getBySupplierAndProject(supplierType, supplierId, projectId) {
    const rates = this.getBySupplier(supplierType, supplierId);
    return rates.find(r => r.ProjectID === projectId) ||
           rates.find(r => r.ProjectID === 'GLOBAL');
  },

  getByProject(projectId) {
    return _find(this.SHEET, row => row.ProjectID === projectId);
  },

  getActive() {
    return _find(this.SHEET, row => row.Active === 'true' || row.Active === true);
  },

  getByCriteria(supplierType, supplierId, projectId, serviceType, vehicleType) {
    const rates = this.getBySupplier(supplierType, supplierId);
    return rates.find(r =>
      (r.ProjectID === projectId || r.ProjectID === 'GLOBAL') &&
      r.ServiceType === serviceType &&
      r.VehicleType === vehicleType &&
      (r.Active === 'true' || r.Active === true) &&
      (!r.ValidFrom || new Date(r.ValidFrom) <= new Date()) &&
      (!r.ValidTo || new Date(r.ValidTo) >= new Date())
    );
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      SupplierType: data.SupplierType || '',
      SupplierID: data.SupplierID || '',
      ProjectID: data.ProjectID || '',
      ServiceType: data.ServiceType || 'Disposizione',
      VehicleType: data.VehicleType || 'Van',
      BaseRate: parseFloat(data.BaseRate) || 0,
      IncludedKm: parseFloat(data.IncludedKm) || 0,
      IncludedHours: parseFloat(data.IncludedHours) || 0,
      ExtraKmRate: parseFloat(data.ExtraKmRate) || 0,
      ExtraHourRate: parseFloat(data.ExtraHourRate) || 0,
      DiariaPiena: parseFloat(data.DiariaPiena) || 0,
      DiariaMezza: parseFloat(data.DiariaMezza) || 0,
      NightExtra: parseFloat(data.NightExtra) || 0,
      HolidayExtra: parseFloat(data.HolidayExtra) || 0,
      WaitHourRate: parseFloat(data.WaitHourRate) || 0,
      ValidFrom: data.ValidFrom || '',
      ValidTo: data.ValidTo || '',
      Active: true,
      OperatingCompany: data.OperatingCompany || '',
      CreatedAt: now,
      UpdatedAt: now
    });
  },

  update(id, changes) {
    changes.UpdatedAt = new Date().toISOString();
    return _update(this.SHEET, id, changes);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      supplierType: entity.SupplierType,
      supplierId: entity.SupplierID,
      projectId: entity.ProjectID,
      serviceType: entity.ServiceType,
      vehicleType: entity.VehicleType,
      baseRate: parseFloat(entity.BaseRate) || 0,
      includedKm: parseFloat(entity.IncludedKm) || 0,
      includedHours: parseFloat(entity.IncludedHours) || 0,
      extraKmRate: parseFloat(entity.ExtraKmRate) || 0,
      extraHourRate: parseFloat(entity.ExtraHourRate) || 0,
      diariaPiena: parseFloat(entity.DiariaPiena) || 0,
      diariaMezza: parseFloat(entity.DiariaMezza) || 0,
      nightExtra: parseFloat(entity.NightExtra) || 0,
      holidayExtra: parseFloat(entity.HolidayExtra) || 0,
      waitHourRate: parseFloat(entity.WaitHourRate) || 0,
      validFrom: entity.ValidFrom,
      validTo: entity.ValidTo,
      active: entity.Active === 'true' || entity.Active === true,
      operatingCompany: entity.OperatingCompany,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetSupplierRates(filters) {
  let rates = SupplierRateRepository.getAll();
  if (filters) {
    if (filters.supplierType) rates = rates.filter(r => r.SupplierType === filters.supplierType);
    if (filters.supplierId) rates = rates.filter(r => r.SupplierID === filters.supplierId);
    if (filters.projectId) rates = rates.filter(r => r.ProjectID === filters.projectId);
    if (filters.serviceType) rates = rates.filter(r => r.ServiceType === filters.serviceType);
    if (filters.vehicleType) rates = rates.filter(r => r.VehicleType === filters.vehicleType);
    if (filters.active !== undefined) {
      rates = rates.filter(r => (r.Active === 'true' || r.Active === true) === filters.active);
    }
  }
  return rates.map(SupplierRateRepository.toDTO);
}

function apiGetSupplierRate(id) {
  const entity = SupplierRateRepository.getById(id);
  if (!entity) throw new NotFoundError('SupplierRate', id);
  return SupplierRateRepository.toDTO(entity);
}

function apiCreateSupplierRate(data) {
  if (!data.SupplierType) throw new ValidationError('SupplierType is required');
  if (!data.SupplierID) throw new ValidationError('SupplierID is required');
  if (!data.ProjectID) throw new ValidationError('ProjectID is required');
  if (!data.ServiceType) throw new ValidationError('ServiceType is required');
  if (!data.VehicleType) throw new ValidationError('VehicleType is required');
  if (data.BaseRate === undefined && data.BaseRate !== 0) throw new ValidationError('BaseRate is required');

  const entity = SupplierRateRepository.create(data);
  _dispatchEvent({ type: 'supplier_rate.created', entity: 'SupplierRate', entityId: entity.ID });
  return SupplierRateRepository.toDTO(entity);
}

function apiUpdateSupplierRate(id, changes) {
  const entity = SupplierRateRepository.getById(id);
  if (!entity) throw new NotFoundError('SupplierRate', id);
  SupplierRateRepository.update(id, changes);
  return SupplierRateRepository.toDTO(SupplierRateRepository.getById(id));
}

function apiDeleteSupplierRate(id) {
  const entity = SupplierRateRepository.getById(id);
  if (!entity) throw new NotFoundError('SupplierRate', id);
  _delete(SupplierRateRepository.SHEET, id);
  _dispatchEvent({ type: 'supplier_rate.deleted', entity: 'SupplierRate', entityId: id });
  return { success: true };
}