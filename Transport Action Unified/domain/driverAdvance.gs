// ============================================================================
// DRIVERADVANCE.GS — Entidad DriverAdvance (anticipo al conductor)
// ============================================================================

const DriverAdvanceRepository = {
  SHEET: SHEETS.DriverAdvances,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByDriver(driverId) {
    return _find(this.SHEET, row => row.DriverID === driverId);
  },

  getByService(serviceId) {
    return _find(this.SHEET, row => row.ServiceID === serviceId);
  },

  getUnpaid() {
    return _find(this.SHEET, row => row.Status === 'Pendiente');
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      DriverID: data.DriverID || '',
      ProjectID: data.ProjectID || '',
      ServiceID: data.ServiceID || '',
      Amount: data.Amount || 0,
      RemainingAmount: data.RemainingAmount || data.Amount || 0,
      Date: data.Date || now,
      Status: 'Pendiente',
      DeductedIn: data.DeductedIn || '',
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
      driverId: entity.DriverID,
      projectId: entity.ProjectID,
      serviceId: entity.ServiceID,
      amount: entity.Amount,
      remainingAmount: entity.RemainingAmount,
      date: entity.Date,
      status: entity.Status,
      deductedIn: entity.DeductedIn,
      notes: entity.Notes,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetDriverAdvances(filters) {
  let advances = DriverAdvanceRepository.getAll();
  if (filters) {
    if (filters.driverId) advances = DriverAdvanceRepository.getByDriver(filters.driverId);
    if (filters.status) advances = advances.filter(a => a.Status === filters.status);
  }
  return advances.map(DriverAdvanceRepository.toDTO);
}

function apiGetDriverAdvance(id) {
  const entity = DriverAdvanceRepository.getById(id);
  if (!entity) throw new NotFoundError('DriverAdvance', id);
  return DriverAdvanceRepository.toDTO(entity);
}

function apiCreateDriverAdvance(data) {
  if (!data.DriverID) throw new ValidationError('DriverID is required');
  if (!data.Amount || data.Amount <= 0) throw new ValidationError('Amount must be > 0');

  const entity = DriverAdvanceRepository.create(data);
  _dispatchEvent({
    type: 'driver_advance.created',
    entity: 'DriverAdvance',
    entityId: entity.ID,
    payload: { driverId: data.DriverID, amount: data.Amount }
  });
  return DriverAdvanceRepository.toDTO(entity);
}

function apiUpdateDriverAdvance(id, changes) {
  const entity = DriverAdvanceRepository.getById(id);
  if (!entity) throw new NotFoundError('DriverAdvance', id);
  DriverAdvanceRepository.update(id, changes);
  _dispatchEvent({
    type: 'driver_advance.updated',
    entity: 'DriverAdvance',
    entityId: id,
    payload: changes
  });
  return DriverAdvanceRepository.toDTO(DriverAdvanceRepository.getById(id));
}

/**
 * EDGE004: Check if driver has pending advances.
 * Returns { warning: boolean, message?: string, totalPending?: number }
 */
function apiCheckDriverPendingAdvances(driverId) {
  const advances = DriverAdvanceRepository.getByDriver(driverId);
  const pending = advances.filter(a => a.Status === 'Pendiente');
  const totalPending = pending.reduce((sum, a) => sum + (parseFloat(a.RemainingAmount) || 0), 0);
  if (totalPending > 0) {
    return {
      warning: true,
      message: 'Conductor tiene anticipos pendientes de descuento: €' + totalPending.toFixed(2),
      totalPending: totalPending,
      count: pending.length
    };
  }
  return { warning: false };
}
