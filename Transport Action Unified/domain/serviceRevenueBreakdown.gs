// ============================================================================
// SERVICEREVENUEBREAKDOWN.GS — Entidad ServiceRevenueBreakdown (ingresos del servicio)
// ============================================================================

const ServiceRevenueBreakdownRepository = {
  SHEET: SHEETS.ServiceRevenueBreakdown,

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

  create(data) {
    // Source validation: only allowed values
    var VALID_SOURCES = ['rate_card', 'driver_rate', 'driver_report', 'adjustment', 'manual', 'imported'];
    if (data.Source && VALID_SOURCES.indexOf(data.Source) === -1) {
      throw new ValidationError('Invalid RevenueBreakdown Source: ' + data.Source + '. Valid: ' + VALID_SOURCES.join(', '));
    }
    const now = new Date().toISOString();
    const quantity = parseFloat(data.Quantity) || 1;
    const unitPrice = parseFloat(data.UnitPrice) || 0;
    return _create(this.SHEET, {
      ID: '',
      ServiceID: data.ServiceID || '',
      ItemType: data.ItemType || '',
      Description: data.Description || '',
      Quantity: quantity,
      UnitPrice: unitPrice,
      Total: quantity * unitPrice,
      RateCardID: data.RateCardID || '',
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
        throw new ImmutableError('ServiceRevenueBreakdown', id);
      }
    }
    // Recalculate Total if Quantity or UnitPrice changed
    if (changes.Quantity !== undefined || changes.UnitPrice !== undefined) {
      const item = existing || this.getById(id);
      if (item) {
        const qty = parseFloat(changes.Quantity !== undefined ? changes.Quantity : item.Quantity);
        const price = parseFloat(changes.UnitPrice !== undefined ? changes.UnitPrice : item.UnitPrice);
        changes.Total = qty * price;
      }
    }
    return _update(this.SHEET, id, changes);
  },

  delete(id) {
    return _softDelete(this.SHEET, id);
  },

  calculateTotal(serviceId) {
    const items = this.getByService(serviceId);
    return items.reduce((sum, item) => sum + (parseFloat(item.Total) || 0), 0);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      serviceId: entity.ServiceID,
      itemType: entity.ItemType,
      description: entity.Description,
      quantity: parseFloat(entity.Quantity) || 0,
      unitPrice: parseFloat(entity.UnitPrice) || 0,
      total: parseFloat(entity.Total) || 0,
      rateCardId: entity.RateCardID,
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

function apiGetRevenueBreakdowns(serviceId) {
  if (serviceId) {
    return ServiceRevenueBreakdownRepository.getByService(serviceId)
      .map(ServiceRevenueBreakdownRepository.toDTO);
  }
  return ServiceRevenueBreakdownRepository.getAll()
    .map(ServiceRevenueBreakdownRepository.toDTO);
}

function apiCreateRevenueBreakdown(data) {
  if (!data.ServiceID) throw new ValidationError('ServiceID is required');
  if (!data.ItemType) throw new ValidationError('ItemType is required');
  if (!data.UnitPrice && data.UnitPrice !== 0) throw new ValidationError('UnitPrice is required');

  const service = ServiceRepository.getById(data.ServiceID);
  if (!service) throw new NotFoundError('Service', data.ServiceID);
  if (service.OperationalStatus === 'Validado') {
    throw new BusinessRuleError('Cannot add breakdown to validated service', 'SERVICE_VALIDATED');
  }

  const entity = ServiceRevenueBreakdownRepository.create(data);
  return ServiceRevenueBreakdownRepository.toDTO(entity);
}

function apiUpdateRevenueBreakdown(id, changes) {
  const entity = ServiceRevenueBreakdownRepository.getById(id);
  if (!entity) throw new NotFoundError('RevenueBreakdown', id);
  if (entity.Locked === 'true' || entity.Locked === true) {
    throw new BusinessRuleError('Cannot modify locked breakdown', 'BREAKDOWN_LOCKED');
  }
  ServiceRevenueBreakdownRepository.update(id, changes);
  return ServiceRevenueBreakdownRepository.toDTO(ServiceRevenueBreakdownRepository.getById(id));
}

function apiDeleteRevenueBreakdown(id) {
  const entity = ServiceRevenueBreakdownRepository.getById(id);
  if (!entity) throw new NotFoundError('RevenueBreakdown', id);
  if (entity.Locked === 'true' || entity.Locked === true) {
    throw new BusinessRuleError('Cannot delete locked breakdown', 'BREAKDOWN_LOCKED');
  }
  ServiceRevenueBreakdownRepository.delete(id);
  return { success: true };
}
