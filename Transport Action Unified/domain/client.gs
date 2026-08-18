// ============================================================================
// CLIENT.GS — Entidad Client (quien paga)
// ============================================================================

const ClientRepository = {
  SHEET: SHEETS.Clients,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getActive() {
    return _find(this.SHEET, row => row.Active === 'true' || row.Active === true);
  },

  getByName(name) {
    const clients = _getAll(this.SHEET);
    return clients.find(c => c.Name === name);
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      Name: data.Name || '',
      Type: data.Type || 'direct',
      VAT: data.VAT || '',
      Address: data.Address || '',
      Phone: data.Phone || '',
      Email: data.Email || '',
      PaymentTerms: data.PaymentTerms || 30,
      Notes: data.Notes || '',
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
      name: entity.Name,
      type: entity.Type,
      vat: entity.VAT,
      address: entity.Address,
      phone: entity.Phone,
      email: entity.Email,
      paymentTerms: entity.PaymentTerms,
      notes: entity.Notes,
      active: entity.Active === 'true' || entity.Active === true,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetClients() {
  return ClientRepository.getAll().map(ClientRepository.toDTO);
}

function apiGetClient(id) {
  const entity = ClientRepository.getById(id);
  if (!entity) throw new NotFoundError('Client', id);
  return ClientRepository.toDTO(entity);
}

function apiCreateClient(data) {
  // Validaciones
  if (!data.Name) throw new ValidationError('Name is required');
  if (ClientRepository.getByName(data.Name)) {
    throw new BusinessRuleError('Client with this name already exists', 'CLIENT_DUPLICATE');
  }
  const entity = ClientRepository.create(data);
  _dispatchEvent({ type: 'client.created', entity: 'Client', entityId: entity.ID });
  return ClientRepository.toDTO(entity);
}

function apiUpdateClient(id, changes) {
  const entity = ClientRepository.getById(id);
  if (!entity) throw new NotFoundError('Client', id);
  ClientRepository.update(id, changes);
  _dispatchEvent({ type: 'client.updated', entity: 'Client', entityId: id, payload: changes });
  return ClientRepository.toDTO(ClientRepository.getById(id));
}

function apiDeleteClient(id) {
  const entity = ClientRepository.getById(id);
  if (!entity) throw new NotFoundError('Client', id);
  _delete(ClientRepository.SHEET, id);
  _dispatchEvent({ type: 'client.deleted', entity: 'Client', entityId: id });
  return { success: true };
}
