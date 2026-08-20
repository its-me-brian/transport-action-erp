// ============================================================================
// INVOICEITEM.GS — Entidad InvoiceItem (línea de factura)
// ============================================================================

const InvoiceItemRepository = {
  SHEET: SHEETS.InvoiceItems,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByInvoice(invoiceId) {
    return _find(this.SHEET, row => row.InvoiceID === invoiceId);
  },

  getByRapportinoClient(rapportinoClientId) {
    return _find(this.SHEET, row => row.RapportinoClientID === rapportinoClientId);
  },

  create(data) {
    const now = new Date().toISOString();
    const amount = parseFloat(data.Amount) || 0;
    return _create(this.SHEET, {
      ID: '',
      InvoiceID: data.InvoiceID || '',
      RapportinoClientID: data.RapportinoClientID || '',
      ServiceID: data.ServiceID || '',
      Amount: amount,
      CreatedAt: now
    });
  },

  update(id, changes) {
    return _update(this.SHEET, id, changes);
  },

  delete(id) {
    return _softDelete(this.SHEET, id);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      invoiceId: entity.InvoiceID,
      rapportinoClientId: entity.RapportinoClientID,
      serviceId: entity.ServiceID || '',
      amount: parseFloat(entity.Amount) || 0,
      createdAt: entity.CreatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetInvoiceItems(invoiceId) {
  if (invoiceId) {
    return InvoiceItemRepository.getByInvoice(invoiceId).map(InvoiceItemRepository.toDTO);
  }
  return InvoiceItemRepository.getAll().map(InvoiceItemRepository.toDTO);
}
