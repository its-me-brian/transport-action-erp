// ============================================================================
// SERVICECOSTBREAKDOWN.GS — Entidad ServiceCostBreakdown (costos del servicio)
// ============================================================================

const ServiceCostBreakdownRepository = {
  SHEET: SHEETS.ServiceCostBreakdown,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByService(serviceId) {
    return _find(this.SHEET, row => row.ServiceID === serviceId);
  },

  getUnlockedByService(serviceId) {
    const items = this.getByService(serviceId);
    return items.filter(i => i.Locked !== 'true' && i.Locked !== true);
  },

  getLockedByService(serviceId) {
    const items = this.getByService(serviceId);
    return items.filter(i => i.Locked === 'true' || i.Locked === true);
  },

  /**
   * Obtener items por Source:
   * - 'driver_rate': tarifa base del conductor
   * - 'driver_report': extras del reporte (parking, tolls, fuel)
   * - 'manual': ajustes manuales
   */
  getBySource(serviceId, source) {
    const items = this.getByService(serviceId);
    return items.filter(i => i.Source === source);
  },

  create(data) {
    // Source validation: only allowed values
    var VALID_SOURCES = ['driver_rate', 'driver_report', 'adjustment', 'manual'];
    if (data.Source && VALID_SOURCES.indexOf(data.Source) === -1) {
      throw new ValidationError('Invalid CostBreakdown Source: ' + data.Source + '. Valid: ' + VALID_SOURCES.join(', '));
    }
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      ServiceID: data.ServiceID || '',
      ItemType: data.ItemType || '',
      Description: data.Description || '',
      Amount: parseFloat(data.Amount) || 0,
      DriverID: data.DriverID || '',
      Source: data.Source || 'manual',
      ReferenceLineID: data.ReferenceLineID || '',
      Locked: false,
      CreatedAt: now
    });
  },

  update(id, changes) {
    // Immutability: locked breakdowns cannot be modified (except Locked flag itself)
    var existing = this.getById(id);
    if (existing && (existing.Locked === 'true' || existing.Locked === true)) {
      if (Object.keys(changes).length === 1 && changes.hasOwnProperty('Locked')) {
        // Allow setting Locked (used by validateService)
      } else {
        throw new ImmutableError('ServiceCostBreakdown', id);
      }
    }
    return _update(this.SHEET, id, changes);
  },

  delete(id) {
    return _softDelete(this.SHEET, id);
  },

  calculateTotal(serviceId) {
    const items = this.getByService(serviceId);
    return items.reduce((sum, item) => sum + (parseFloat(item.Amount) || 0), 0);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      serviceId: entity.ServiceID,
      itemType: entity.ItemType,
      description: entity.Description,
      amount: parseFloat(entity.Amount) || 0,
      driverId: entity.DriverID,
      source: entity.Source,
      referenceLineId: entity.ReferenceLineID,
      locked: entity.Locked === 'true' || entity.Locked === true,
      createdAt: entity.CreatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetCostBreakdowns(serviceId) {
  if (serviceId) {
    return ServiceCostBreakdownRepository.getByService(serviceId)
      .map(ServiceCostBreakdownRepository.toDTO);
  }
  return ServiceCostBreakdownRepository.getAll()
    .map(ServiceCostBreakdownRepository.toDTO);
}

function apiCreateCostBreakdown(data) {
  if (!data.ServiceID) throw new ValidationError('ServiceID is required');
  if (!data.ItemType) throw new ValidationError('ItemType is required');
  if (data.Amount === undefined || data.Amount === null) throw new ValidationError('Amount is required');

  const service = ServiceRepository.getById(data.ServiceID);
  if (!service) throw new NotFoundError('Service', data.ServiceID);
  if (service.OperationalStatus === 'Validado') {
    throw new BusinessRuleError('Cannot add breakdown to validated service', 'SERVICE_VALIDATED');
  }

  const entity = ServiceCostBreakdownRepository.create(data);
  return ServiceCostBreakdownRepository.toDTO(entity);
}

function apiUpdateCostBreakdown(id, changes) {
  const entity = ServiceCostBreakdownRepository.getById(id);
  if (!entity) throw new NotFoundError('CostBreakdown', id);
  if (entity.Locked === 'true' || entity.Locked === true) {
    throw new BusinessRuleError('Cannot modify locked breakdown', 'BREAKDOWN_LOCKED');
  }
  ServiceCostBreakdownRepository.update(id, changes);
  return ServiceCostBreakdownRepository.toDTO(ServiceCostBreakdownRepository.getById(id));
}

function apiDeleteCostBreakdown(id) {
  const entity = ServiceCostBreakdownRepository.getById(id);
  if (!entity) throw new NotFoundError('CostBreakdown', id);
  if (entity.Locked === 'true' || entity.Locked === true) {
    throw new BusinessRuleError('Cannot delete locked breakdown', 'BREAKDOWN_LOCKED');
  }
  ServiceCostBreakdownRepository.delete(id);
  return { success: true };
}
