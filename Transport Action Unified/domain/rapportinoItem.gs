// ============================================================================
// RAPPORTINOITEM.GS — Entidad RapportinoItem (línea dentro de un rapportino)
// ============================================================================

const RapportinoItemRepository = {
  SHEET: SHEETS.RapportinoItems,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByRapportinoClient(rapportinoId) {
    return _find(this.SHEET, row => row.RapportinoClientID === rapportinoId);
  },

  getByService(serviceId) {
    return _find(this.SHEET, row => row.ServiceID === serviceId);
  },

  create(data) {
    const now = new Date().toISOString();
    const amount = parseFloat(data.Amount) || 0;
    return _create(this.SHEET, {
      ID: '',
      RapportinoClientID: data.RapportinoClientID || '',
      ServiceID: data.ServiceID || '',
      Amount: amount,
      LockedAmount: 0,
      CreatedAt: now
    });
  },

  update(id, changes) {
    // Immutability: items with LockedAmount > 0 cannot be modified
    var existing = this.getById(id);
    if (existing && (parseFloat(existing.LockedAmount) || 0) > 0) {
      throw new ImmutableError('RapportinoItem', id);
    }
    return _update(this.SHEET, id, changes);
  },

  delete(id) {
    return _delete(this.SHEET, id);
  },

  calculateTotal(rapportinoId, field) {
    const items = this.getByRapportinoClient(rapportinoId);
    return items.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      rapportinoClientId: entity.RapportinoClientID,
      serviceId: entity.ServiceID,
      amount: parseFloat(entity.Amount) || 0,
      lockedAmount: parseFloat(entity.LockedAmount) || 0,
      locked: (parseFloat(entity.LockedAmount) || 0) > 0,
      createdAt: entity.CreatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetRapportinoItems(rapportinoClientId) {
  if (rapportinoClientId) {
    return RapportinoItemRepository.getByRapportinoClient(rapportinoClientId)
      .map(RapportinoItemRepository.toDTO);
  }
  return RapportinoItemRepository.getAll()
    .map(RapportinoItemRepository.toDTO);
}
