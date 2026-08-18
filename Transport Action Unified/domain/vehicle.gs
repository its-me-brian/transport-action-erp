// ============================================================================
// VEHICLE.GS — Entidad Vehicle (vehículo)
// ============================================================================

const VehicleRepository = {
  SHEET: SHEETS.Vehicles,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getAvailable() {
    return _find(this.SHEET, row => row.Status === 'Disponible');
  },

  getByCompany(operatingCompany) {
    return _find(this.SHEET, row => row.OperatingCompany === operatingCompany);
  },

  getByPlate(plate) {
    const vehicles = _getAll(this.SHEET);
    return vehicles.find(v => v.Plate === plate);
  },

  getByType(type, operatingCompany) {
    let vehicles = _getAll(this.SHEET);
    if (operatingCompany) {
      vehicles = vehicles.filter(v => v.OperatingCompany === operatingCompany);
    }
    return vehicles.filter(v => v.Type === type && v.Status === 'Disponible');
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      Plate: data.Plate || '',
      Brand: data.Brand || '',
      Model: data.Model || '',
      Type: data.Type || 'Van',
      Ownership: data.Ownership || 'tercero',
      InsuranceExpiry: data.InsuranceExpiry || '',
      InspectionExpiry: data.InspectionExpiry || '',
      Capacity: data.Capacity || 0,
      Status: 'Disponible',
      DriverDefault: data.DriverDefault || '',
      OperatingCompany: data.OperatingCompany || '',
      Notes: data.Notes || '',
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
      plate: entity.Plate,
      brand: entity.Brand,
      model: entity.Model,
      type: entity.Type,
      ownership: entity.Ownership,
      insuranceExpiry: entity.InsuranceExpiry,
      inspectionExpiry: entity.InspectionExpiry,
      capacity: entity.Capacity,
      status: entity.Status,
      driverDefault: entity.DriverDefault,
      operatingCompany: entity.OperatingCompany,
      notes: entity.Notes,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetVehicles() {
  return VehicleRepository.getAll().map(VehicleRepository.toDTO);
}

function apiGetVehicle(id) {
  const entity = VehicleRepository.getById(id);
  if (!entity) throw new NotFoundError('Vehicle', id);
  return VehicleRepository.toDTO(entity);
}

function apiCreateVehicle(data) {
  if (!data.Plate) throw new ValidationError('Plate is required');
  if (VehicleRepository.getByPlate(data.Plate)) {
    throw new BusinessRuleError('Vehicle with this plate already exists', 'VEHICLE_DUPLICATE');
  }
  const entity = VehicleRepository.create(data);
  _dispatchEvent({ type: 'vehicle.created', entity: 'Vehicle', entityId: entity.ID });
  return VehicleRepository.toDTO(entity);
}

function apiUpdateVehicle(id, changes) {
  const entity = VehicleRepository.getById(id);
  if (!entity) throw new NotFoundError('Vehicle', id);
  VehicleRepository.update(id, changes);
  _dispatchEvent({ type: 'vehicle.updated', entity: 'Vehicle', entityId: id, payload: changes });
  return VehicleRepository.toDTO(VehicleRepository.getById(id));
}

function apiDeleteVehicle(id) {
  const entity = VehicleRepository.getById(id);
  if (!entity) throw new NotFoundError('Vehicle', id);
  _delete(VehicleRepository.SHEET, id);
  _dispatchEvent({ type: 'vehicle.deleted', entity: 'Vehicle', entityId: id });
  return { success: true };
}
