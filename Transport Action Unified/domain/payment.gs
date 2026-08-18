// ============================================================================
// PAYMENT.GS — Entidad Payment (pago — entidad interna de Invoice)
// ============================================================================

const PaymentRepository = {
  SHEET: SHEETS.Payments,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getAllByInvoice(invoiceId) {
    return _find(this.SHEET, row => row.InvoiceID === invoiceId);
  },

  /**
   * Obtener pagos confirmados de una factura (los que afectan saldo)
   */
  getConfirmedByInvoice(invoiceId) {
    const payments = this.getAllByInvoice(invoiceId);
    return payments.filter(p => p.Status === 'Confirmado' || p.Status === 'Conciliado');
  },

  getAllByClient(clientId) {
    return _find(this.SHEET, row => row.ClientID === clientId);
  },

  getAllByStatus(status) {
    return _find(this.SHEET, row => row.Status === status);
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      InvoiceID: data.InvoiceID || '',
      ClientID: data.ClientID || '',
      Amount: parseFloat(data.Amount) || 0,
      PaymentMethod: data.PaymentMethod || '',
      PaymentDate: data.PaymentDate || '',
      Reference: data.Reference || '',
      Notes: data.Notes || '',
      Status: 'Registrado',
      CreatedBy: _getActiveUser(),
      CreatedAt: now,
      ConfirmedAt: '',
      ReconciledAt: '',
      // Cash tracking fields
      CashReceivedBy: data.CashReceivedBy || '',
      CashDate: data.CashDate || '',
      CashReference: data.CashReference || ''
    });
  },

  update(id, changes) {
    // P005: Payment.Status ∈ {Confirmado, Conciliado} → ningún campo se modifica
    var existing = this.getById(id);
    if (existing && (existing.Status === 'Confirmado' || existing.Status === 'Conciliado' || existing.Status === 'Anulado')) {
      throw new ImmutableError('Payment', id);
    }
    return _update(this.SHEET, id, changes);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      invoiceId: entity.InvoiceID,
      clientId: entity.ClientID,
      amount: parseFloat(entity.Amount) || 0,
      paymentMethod: entity.PaymentMethod,
      paymentDate: entity.PaymentDate,
      reference: entity.Reference,
      notes: entity.Notes,
      status: entity.Status,
      createdBy: entity.CreatedBy,
      createdAt: entity.CreatedAt,
      confirmedAt: entity.ConfirmedAt,
      reconciledAt: entity.ReconciledAt,
      // Cash tracking
      cashReceivedBy: entity.CashReceivedBy || '',
      cashDate: entity.CashDate || '',
      cashReference: entity.CashReference || ''
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetPayments(filters) {
  let payments = PaymentRepository.getAll();
  if (filters) {
    if (filters.invoiceId) payments = payments.filter(p => p.InvoiceID === filters.invoiceId);
    if (filters.clientId) payments = payments.filter(p => p.ClientID === filters.clientId);
    if (filters.status) payments = payments.filter(p => p.Status === filters.status);
    if (filters.dateFrom) payments = payments.filter(p => p.PaymentDate && p.PaymentDate >= filters.dateFrom);
    if (filters.dateTo) payments = payments.filter(p => p.PaymentDate && p.PaymentDate <= filters.dateTo);
  }
  return payments.map(PaymentRepository.toDTO);
}

function apiGetPayment(id) {
  const entity = PaymentRepository.getById(id);
  if (!entity) throw new NotFoundError('Payment', id);
  return PaymentRepository.toDTO(entity);
}
