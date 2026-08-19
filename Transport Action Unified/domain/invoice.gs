// ============================================================================
// INVOICE.GS — Entidad Invoice (factura)
// ============================================================================

const InvoiceRepository = {
  SHEET: SHEETS.Invoices,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getAllByClient(clientId) {
    return _find(this.SHEET, row => row.ClientID === clientId);
  },

  getAllByProject(projectId) {
    return _find(this.SHEET, row => row.ProjectID === projectId);
  },

  getBorradorByProjectClient(projectId, clientId) {
    const items = _find(this.SHEET, row =>
      row.ProjectID === projectId &&
      row.ClientID === clientId &&
      row.Status === 'Borrador'
    );
    return items.length > 0 ? items[0] : null;
  },

  getAllByStatus(status) {
    return _find(this.SHEET, row => row.Status === status);
  },

  getByInvoiceNumber(invoiceNumber) {
    const invoices = _getAll(this.SHEET);
    return invoices.find(i => i.InvoiceNumber === invoiceNumber);
  },

  create(data) {
    const now = new Date().toISOString();
    const settings = SettingsRepository.getAll();
    return _create(this.SHEET, {
      ID: '',
      InvoiceNumber: '',
      ProjectID: data.ProjectID || '',
      ClientID: data.ClientID || '',
      Date: '',
      DueDate: data.DueDate || '',
      Subtotal: 0,
      TaxRate: parseFloat(settings.IVA) || 21,
      TaxAmount: 0,
      Total: 0,
      Currency: settings.Currency || 'EUR',
      Status: 'Borrador',
      Notes: data.Notes || '',
      VoidReason: '',
      CreatedBy: _getActiveUser(),
      CreatedAt: now,
      UpdatedAt: now
    });
  },

  update(id, changes) {
    // I003: After emit, financial snapshot is immutable
    var IMMUTABLE_AFTER_EMIT = ['Subtotal', 'TaxRate', 'TaxAmount', 'Total', 'InvoiceNumber'];
    var existing = this.getById(id);
    if (existing && existing.Status !== 'Borrador') {
      var forbidden = IMMUTABLE_AFTER_EMIT.filter(function(field) {
        return changes[field] !== undefined && changes[field] !== existing[field];
      });
      if (forbidden.length > 0) {
        throw new ImmutableError('Invoice', id);
      }
    }
    changes.UpdatedAt = new Date().toISOString();
    return _update(this.SHEET, id, changes);
  },

  /**
   * Recalcular totales desde InvoiceItems
   */
  recalculateTotals(invoiceId) {
    const items = InvoiceItemRepository.getByInvoice(invoiceId);
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.Amount) || 0), 0);
    const invoice = this.getById(invoiceId);
    const taxRate = parseFloat(invoice.TaxRate) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    this.update(invoiceId, {
      Subtotal: subtotal,
      TaxAmount: taxAmount,
      Total: subtotal + taxAmount
    });
  },

  /**
   * Obtener saldo pendiente de una factura
   */
  getSaldo(invoiceId) {
    const invoice = this.getById(invoiceId);
    if (!invoice) return 0;
    const payments = PaymentRepository.getConfirmedByInvoice(invoiceId);
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.Amount) || 0), 0);
    return (parseFloat(invoice.Total) || 0) - totalPaid;
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      invoiceNumber: entity.InvoiceNumber,
      projectId: entity.ProjectID,
      clientId: entity.ClientID,
      date: entity.Date,
      dueDate: entity.DueDate,
      subtotal: parseFloat(entity.Subtotal) || 0,
      taxRate: parseFloat(entity.TaxRate) || 0,
      taxAmount: parseFloat(entity.TaxAmount) || 0,
      total: parseFloat(entity.Total) || 0,
      currency: entity.Currency,
      status: entity.Status,
      notes: entity.Notes,
      voidReason: entity.VoidReason,
      createdBy: entity.CreatedBy,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetInvoices(filters) {
  let invoices = InvoiceRepository.getAll();
  if (filters) {
    if (filters.clientId) invoices = invoices.filter(i => i.ClientID === filters.clientId);
    if (filters.projectId) invoices = invoices.filter(i => i.ProjectID === filters.projectId);
    if (filters.status) invoices = invoices.filter(i => i.Status === filters.status);
    if (filters.dateFrom) invoices = invoices.filter(i => !i.Date || i.Date >= filters.dateFrom);
    if (filters.dateTo) invoices = invoices.filter(i => !i.Date || i.Date <= filters.dateTo);
    // Driver filter: requires joining through InvoiceItems -> Service -> Driver
    if (filters.driverId) {
      const invoiceIds = new Set();
      InvoiceItemRepository.getAll().forEach(item => {
        if (item.ServiceID) {
          const service = ServiceRepository.getById(item.ServiceID);
          if (service && service.DriverID === filters.driverId) {
            invoiceIds.add(item.InvoiceID);
          }
        }
      });
      invoices = invoices.filter(i => invoiceIds.has(i.ID));
    }
  }
  return invoices.map(InvoiceRepository.toDTO);
}

function apiGetInvoice(id) {
  const entity = InvoiceRepository.getById(id);
  if (!entity) throw new NotFoundError('Invoice', id);
  return InvoiceRepository.toDTO(entity);
}

function apiCreateInvoice(data) {
  if (!data.ProjectID) throw new ValidationError('ProjectID is required');
  if (!data.ClientID) throw new ValidationError('ClientID is required');

  // Validación de integridad referencial
  if (!validateForeignId(SHEETS.Clients, data.ClientID)) {
    throw new ValidationError('REFERENTIAL_INTEGRITY: El cliente no existe: ' + data.ClientID);
  }
  if (!validateForeignId(SHEETS.Projects, data.ProjectID)) {
    throw new ValidationError('REFERENTIAL_INTEGRITY: El proyecto no existe: ' + data.ProjectID);
  }

  const entity = InvoiceRepository.create(data);
  _dispatchEvent({ type: 'invoice.created', entity: 'Invoice', entityId: entity.ID });
  return InvoiceRepository.toDTO(entity);
}
