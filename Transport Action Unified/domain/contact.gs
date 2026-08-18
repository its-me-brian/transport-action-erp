// ============================================================================
// CONTACT.GS — Entidad Contact (contactos de un Client)
// ============================================================================

const ContactRepository = {
  SHEET: SHEETS.Contacts,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByClient(clientId) {
    return _find(this.SHEET, row => row.ClientID === clientId);
  },

  getPrimaryByClient(clientId) {
    const contacts = this.getByClient(clientId);
    return contacts.find(c => c.IsPrimary === 'true' || c.IsPrimary === true) || contacts[0];
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      ClientID: data.ClientID || '',
      Name: data.Name || '',
      Role: data.Role || '',
      Phone: data.Phone || '',
      Email: data.Email || '',
      WhatsApp: data.WhatsApp || '',
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
      clientId: entity.ClientID,
      name: entity.Name,
      role: entity.Role,
      phone: entity.Phone,
      email: entity.Email,
      whatsapp: entity.WhatsApp,
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

function apiGetContacts(clientId) {
  if (clientId) {
    return ContactRepository.getByClient(clientId).map(ContactRepository.toDTO);
  }
  return ContactRepository.getAll().map(ContactRepository.toDTO);
}

function apiCreateContact(data) {
  if (!data.ClientID) throw new ValidationError('ClientID is required');
  if (!data.Name) throw new ValidationError('Name is required');
  const entity = ContactRepository.create(data);
  _dispatchEvent({ type: 'contact.created', entity: 'Contact', entityId: entity.ID });
  return ContactRepository.toDTO(entity);
}

function apiUpdateContact(id, changes) {
  const existing = ContactRepository.getById(id);
  if (!existing) throw new NotFoundError('Contact', id);
  ContactRepository.update(id, changes);
  _dispatchEvent({ type: 'contact.updated', entity: 'Contact', entityId: id, payload: changes });
  return ContactRepository.toDTO(ContactRepository.getById(id));
}

function apiDeleteContact(id) {
  const entity = ContactRepository.getById(id);
  if (!entity) throw new NotFoundError('Contact', id);
  _delete(ContactRepository.SHEET, id);
  _dispatchEvent({ type: 'contact.deleted', entity: 'Contact', entityId: id });
  return { success: true };
}
