// ============================================================================
// OPERATINGCOMPANY.GS — Entidad OperatingCompany
// ============================================================================

const OperatingCompanyRepository = {
  SHEET: SHEETS.OperatingCompany,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getActive() {
    return _find(this.SHEET, row => row.Active === 'true' || row.Active === true);
  },

  getDefaults() {
    return {
      ID: '',
      Name: '',
      VAT: '',
      Address: '',
      Phone: '',
      Email: '',
      Currency: 'EUR',
      DefaultTaxRate: 21,
      Active: true,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
  },

  create(data) {
    const defaults = this.getDefaults();
    return _create(this.SHEET, { ...defaults, ...data });
  },

  update(id, changes) {
    return _update(this.SHEET, id, changes);
  },

  toDTO(entity) {
    return {
      id: entity.ID || '',
      name: entity.Name || '',
      vat: entity.VAT || '',
      address: entity.Address || '',
      phone: entity.Phone || '',
      email: entity.Email || '',
      currency: entity.Currency || 'EUR',
      defaultTaxRate: parseFloat(entity.DefaultTaxRate) || 21,
      active: entity.Active === 'true' || entity.Active === true,
      createdAt: entity.CreatedAt || '',
      updatedAt: entity.UpdatedAt || ''
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetOperatingCompanies() {
  return OperatingCompanyRepository.getAll().map(OperatingCompanyRepository.toDTO);
}

function apiGetOperatingCompany(id) {
  const entity = OperatingCompanyRepository.getById(id);
  if (!entity) throw new NotFoundError('OperatingCompany', id);
  return OperatingCompanyRepository.toDTO(entity);
}

function apiUpdateOperatingCompany(id, data) {
  const entity = OperatingCompanyRepository.getById(id);
  if (!entity) throw new NotFoundError('OperatingCompany', id);
  
  const changes = {};
  if (data.name !== undefined) changes.Name = data.name;
  if (data.vat !== undefined) changes.VAT = data.vat;
  if (data.address !== undefined) changes.Address = data.address;
  if (data.phone !== undefined) changes.Phone = data.phone;
  if (data.email !== undefined) changes.Email = data.email;
  if (data.currency !== undefined) changes.Currency = data.currency;
  if (data.defaultTaxRate !== undefined) changes.DefaultTaxRate = data.defaultTaxRate;
  if (data.active !== undefined) changes.Active = data.active;
  
  OperatingCompanyRepository.update(id, changes);
  _dispatchEvent({ type: 'operating_company.updated', entity: 'OperatingCompany', entityId: id, payload: changes });
  return OperatingCompanyRepository.toDTO(OperatingCompanyRepository.getById(id));
}


