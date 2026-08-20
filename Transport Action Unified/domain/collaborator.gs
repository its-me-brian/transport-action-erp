// ============================================================================
// COLLABORATOR.GS — Entidad Collaborator (colaborador/empresa proveedora)
// ============================================================================

const CollaboratorRepository = {
  SHEET: SHEETS.Collaborators,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByName(name) {
    const collaborators = _getAll(this.SHEET);
    return collaborators.find(c => c.Name === name);
  },

  getActive() {
    return _find(this.SHEET, row => row.Active === 'true' || row.Active === true);
  },

  getByCompany(operatingCompany) {
    return _find(this.SHEET, row => row.OperatingCompany === operatingCompany);
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      Name: data.Name || '',
      VAT: data.VAT || '',
      Address: data.Address || '',
      Phone: data.Phone || '',
      Email: data.Email || '',
      PaymentTerms: data.PaymentTerms || 30,
      Active: true,
      Notes: data.Notes || '',
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
      name: entity.Name,
      vat: entity.VAT,
      address: entity.Address,
      phone: entity.Phone,
      email: entity.Email,
      paymentTerms: parseInt(entity.PaymentTerms) || 30,
      active: entity.Active === 'true' || entity.Active === true,
      notes: entity.Notes,
      operatingCompany: entity.OperatingCompany,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetCollaborators(filters) {
  let collaborators = CollaboratorRepository.getAll();
  if (filters) {
    if (filters.active !== undefined) {
      // Normalize filters.active: query params arrive as strings ("true"/"false"),
      // but booleans also come through as actual booleans from GAS post body.
      var activeFilter = filters.active === 'true' || filters.active === true;
      collaborators = collaborators.filter(c => {
        var isActive = c.Active === 'true' || c.Active === true;
        return isActive === activeFilter;
      });
    }
    if (filters.operatingCompany) {
      collaborators = collaborators.filter(c => c.OperatingCompany === filters.operatingCompany);
    }
  }
  return collaborators.map(CollaboratorRepository.toDTO);
}

function apiGetCollaborator(id) {
  const entity = CollaboratorRepository.getById(id);
  if (!entity) throw new NotFoundError('Collaborator', id);
  return CollaboratorRepository.toDTO(entity);
}

function apiCreateCollaborator(data) {
  if (!data.Name) throw new ValidationError('Name is required');
  const entity = CollaboratorRepository.create(data);
  _dispatchEvent({ type: 'collaborator.created', entity: 'Collaborator', entityId: entity.ID });
  return CollaboratorRepository.toDTO(entity);
}

function apiUpdateCollaborator(id, changes) {
  const entity = CollaboratorRepository.getById(id);
  if (!entity) throw new NotFoundError('Collaborator', id);
  CollaboratorRepository.update(id, changes);
  _dispatchEvent({ type: 'collaborator.updated', entity: 'Collaborator', entityId: id, payload: changes });
  return CollaboratorRepository.toDTO(CollaboratorRepository.getById(id));
}

function apiDeleteCollaborator(id) {
  const entity = CollaboratorRepository.getById(id);
  if (!entity) throw new NotFoundError('Collaborator', id);
  const result = _safeDelete('Collaborator', id);
  if (!result.success) {
    return { success: false, error: result.error, dependencies: result.dependencies };
  }
  _dispatchEvent({ type: 'collaborator.deleted', entity: 'Collaborator', entityId: id });
  return { success: true };
}