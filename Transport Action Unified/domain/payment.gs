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
      Amount: _roundMoney(data.Amount),
      PaymentMethod: data.PaymentMethod || '',
      PaymentDate: data.PaymentDate || '',
      Reference: data.Reference || '',
      Notes: data.Notes || '',
      Status: 'Registrado',
      CreatedBy: _getActiveUser(),
      CreatedAt: now,
      ConfirmedAt: '',
      ReconciledAt: '',
      VoidedAt: '',
      VoidReason: '',
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

  /**
   * Cambio de ESTADO de un pago (Registrado→Confirmado→Conciliado, o →Anulado).
   *
   * `update()` es intocable a propósito: un pago confirmado no se edita. Pero
   * la máquina de estados SÍ necesita mover Status, y hasta ahora reconcile() y
   * voidPayment() pasaban por update() → ImmutableError. O sea: un pago
   * confirmado no se podía conciliar ni anular nunca.
   *
   * Acá se autoriza SOLO el movimiento de columnas de estado; cualquier intento
   * de tocar un dato (Amount, InvoiceID, PaymentDate…) sigue bloqueado.
   */
  transition(id, changes) {
    var ALLOWED = ['Status', 'ConfirmedAt', 'ReconciledAt', 'VoidedAt', 'VoidReason', 'UpdatedAt'];
    var forbidden = Object.keys(changes).filter(function(key) {
      return ALLOWED.indexOf(key) === -1;
    });
    if (forbidden.length > 0) {
      throw new ValidationError('Payment.transition only moves status, got: ' + forbidden.join(', '));
    }

    var existing = PaymentRepository.getById(id);
    if (!existing) throw new NotFoundError('Payment', id);
    if (changes.Status) {
      _assertValidTransition('Payment', existing.Status, changes.Status);
    }

    changes.UpdatedAt = new Date().toISOString();
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
