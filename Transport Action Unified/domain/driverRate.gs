// ============================================================================
// DRIVERRATE.GS — Entidad DriverRate (tarifa del conductor por proyecto)
// ============================================================================

const DriverRateRepository = {
  SHEET: SHEETS.DriverRates,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByDriver(driverId) {
    return _find(this.SHEET, row => row.DriverID === driverId);
  },

  getByDriverAndProject(driverId, projectId) {
    const rates = this.getByDriver(driverId);
    return rates.find(r => r.ProjectID === projectId) ||
           rates.find(r => r.ProjectID === 'GLOBAL');
  },

  getActive() {
    return _find(this.SHEET, row => row.Active === true);
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      DriverID: data.DriverID || '',
      VehicleType: data.VehicleType || 'Transfer',
      TransferRate: data.TransferRate || 0,
      HalfDayRate: data.HalfDayRate || 0,
      FullDayRate: data.FullDayRate || 0,
      NightExtra: data.NightExtra || 0,
      HolidayExtra: data.HolidayExtra || 0,
      WaitHourRate: data.WaitHourRate || 0,
      Active: true,
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
      driverId: entity.DriverID,
      vehicleType: entity.VehicleType,
      transferRate: entity.TransferRate,
      halfDayRate: entity.HalfDayRate,
      fullDayRate: entity.FullDayRate,
      nightExtra: entity.NightExtra,
      holidayExtra: entity.HolidayExtra,
      waitHourRate: entity.WaitHourRate,
      active: entity.Active === 'true' || entity.Active === true,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetDriverRates(driverId) {
  if (driverId) {
    return DriverRateRepository.getByDriver(driverId).map(DriverRateRepository.toDTO);
  }
  return DriverRateRepository.getAll().map(DriverRateRepository.toDTO);
}

function apiCreateDriverRate(data) {
  if (!data.DriverID) throw new ValidationError('DriverID is required');
  if (!data.TransferRate && !data.HalfDayRate && !data.FullDayRate) throw new ValidationError('At least one rate (TransferRate, HalfDayRate, or FullDayRate) is required');
  const entity = DriverRateRepository.create(data);
  return DriverRateRepository.toDTO(entity);
}

function apiUpdateDriverRate(id, changes) {
  const entity = DriverRateRepository.getById(id);
  if (!entity) throw new NotFoundError('DriverRate', id);
  DriverRateRepository.update(id, changes);
  return DriverRateRepository.toDTO(DriverRateRepository.getById(id));
}

function apiDeleteDriverRate(id) {
  const entity = DriverRateRepository.getById(id);
  if (!entity) throw new NotFoundError('DriverRate', id);
  _delete(DriverRateRepository.SHEET, id);
  _dispatchEvent({ type: 'driverrate.deleted', entity: 'DriverRate', entityId: id });
  return { success: true };
}
