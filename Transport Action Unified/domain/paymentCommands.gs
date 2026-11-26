// ============================================================================
// PAYMENTCOMMANDS.GS — Comandos de Payment
// ============================================================================

const PaymentCommands = {
  /**
   * Edit payment (only while Registrado)
   * Allows modifying: Amount, PaymentMethod, PaymentDate, Reference, Notes
   * Does NOT allow modifying: Status, InvoiceID, ClientID
   */
  edit(paymentId, changes) {
    return _withLock(() => {
      const payment = PaymentRepository.getById(paymentId);
      if (!payment) throw new NotFoundError('Payment', paymentId);
      if (payment.Status !== 'Registrado') {
        throw new BusinessRuleError(
          'Can only edit payments in Registrado status. Current: ' + payment.Status,
          'P005'
        );
      }

      // Only allow certain fields to be edited
      const allowedFields = ['Amount', 'PaymentMethod', 'PaymentDate', 'Reference', 'Notes'];
      const filteredChanges = {};
      for (var field of allowedFields) {
        if (changes[field] !== undefined) {
          filteredChanges[field] = changes[field];
        }
      }

      // Validate amount if being changed
      if (filteredChanges.Amount !== undefined) {
        if (filteredChanges.Amount <= 0) {
          throw new ValidationError('Payment amount must be > 0');
        }
        // Check overpayment
        const saldo = InvoiceRepository.getSaldo(payment.InvoiceID);
        if (_moneyExceeds(filteredChanges.Amount, saldo)) {
          throw new BusinessRuleError(
            'Payment amount ' + filteredChanges.Amount + ' exceeds outstanding balance ' + saldo,
            'P004'
          );
        }
      }

      if (Object.keys(filteredChanges).length === 0) {
        return { success: true, message: 'No changes to apply' };
      }

      PaymentRepository.update(paymentId, filteredChanges);

      _dispatchEvent({
        type: 'payment.edited',
        entity: 'Payment',
        entityId: paymentId,
        payload: { changes: filteredChanges }
      });

      return PaymentRepository.toDTO(PaymentRepository.getById(paymentId));
    });
  },

  /**
   * Registrar pago
   * Precondiciones:
   * - InvoiceID válido
   * - Invoice.Status ∈ {Emitida, Enviada, PagoParcial, Vencida}
   * - Amount > 0
   */
  register(invoiceId, paymentData) {
    return _withLock(() => {
      const invoice = InvoiceRepository.getById(invoiceId);
      if (!invoice) throw new NotFoundError('Invoice', invoiceId);
      if (!['Enviada', 'PagoParcial', 'Vencida'].includes(invoice.Status)) {
        throw new BusinessRuleError(
          `Cannot register payment for invoice in status: ${invoice.Status}`,
          'P001'
        );
      }
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new ValidationError('Payment amount must be > 0');
      }
      // P004: Amount ≤ saldo pendiente (comparado en céntimos: sin redondeo
      // el saldo tiene cola binaria y rechaza el pago exacto por 0.0049…)
      const saldo = InvoiceRepository.getSaldo(invoiceId);
      if (_moneyExceeds(paymentData.amount, saldo)) {
        throw new BusinessRuleError(
          `Payment amount ${paymentData.amount} exceeds outstanding balance ${saldo}`,
          'P004'
        );
      }
      if (!paymentData.paymentMethod) {
        throw new ValidationError('Payment method is required');
      }
      if (!paymentData.paymentDate) {
        throw new ValidationError('Payment date is required');
      }

      // Crear pago
      const payment = PaymentRepository.create({
        InvoiceID: invoiceId,
        ClientID: invoice.ClientID,
        Amount: paymentData.amount,
        PaymentMethod: paymentData.paymentMethod,
        PaymentDate: paymentData.paymentDate,
        Reference: paymentData.reference || '',
        Notes: paymentData.notes || ''
      });

      _dispatchEvent({
        type: 'payment.created',
        entity: 'Payment',
        entityId: payment.ID,
        payload: { invoiceId, amount: paymentData.amount }
      });

      return PaymentRepository.toDTO(payment);
    });
  },

  /**
   * Confirmar pago
   * Registrado → Confirmado
   * RECALCULA saldo de Invoice
   */
  confirm(paymentId) {
    return _withLock(() => {
      const payment = PaymentRepository.getById(paymentId);
      if (!payment) throw new NotFoundError('Payment', paymentId);
      _assertValidTransition('Payment', payment.Status, 'Confirmado');

      // INV-003: Verify confirming this payment won't exceed invoice total
      const invoice = InvoiceRepository.getById(payment.InvoiceID);
      if (invoice) {
        const confirmedPayments = PaymentRepository.getConfirmedByInvoice(payment.InvoiceID);
        const currentConfirmed = confirmedPayments.reduce((sum, p) => sum + (parseFloat(p.Amount) || 0), 0);
        const invoiceTotal = parseFloat(invoice.Total) || 0;
        const newTotal = currentConfirmed + (parseFloat(payment.Amount) || 0);
        if (newTotal > invoiceTotal + 0.01) {
          throw new BusinessRuleError(
            `Confirming this payment would exceed invoice total. Current confirmed: ${currentConfirmed}, Payment: ${payment.Amount}, Invoice total: ${invoiceTotal}`,
            'INV003'
          );
        }
      }

      // Confirmar pago
      PaymentRepository.update(paymentId, {
        Status: 'Confirmado',
        ConfirmedAt: new Date().toISOString()
      });

      // Recalcular estado de factura
      this._updateInvoiceStatus(payment.InvoiceID);

      _dispatchEvent({
        type: 'payment.confirmed',
        entity: 'Payment',
        entityId: paymentId,
        payload: { invoiceId: payment.InvoiceID, amount: payment.Amount }
      });

      return PaymentRepository.toDTO(PaymentRepository.getById(paymentId));
    });
  },

  /**
   * Conciliar pago
   * Confirmado → Conciliado
   */
  reconcile(paymentId) {
    return _withLock(() => {
      const payment = PaymentRepository.getById(paymentId);
      if (!payment) throw new NotFoundError('Payment', paymentId);
      _assertValidTransition('Payment', payment.Status, 'Conciliado');

      PaymentRepository.transition(paymentId, {
        Status: 'Conciliado',
        ReconciledAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'payment.reconciled',
        entity: 'Payment',
        entityId: paymentId
      });

      return PaymentRepository.toDTO(PaymentRepository.getById(paymentId));
    });
  },

  /**
   * Anular pago
   * Registrado → Anulado
   * RECALCULA saldo de Invoice
   */
  voidPayment(paymentId, reason) {
    return _withLock(() => {
      const payment = PaymentRepository.getById(paymentId);
      if (!payment) throw new NotFoundError('Payment', paymentId);
      _assertValidTransition('Payment', payment.Status, 'Anulado');
      if (!reason) {
        throw new ValidationError('Void reason is required');
      }

      PaymentRepository.transition(paymentId, {
        Status: 'Anulado',
        VoidedAt: new Date().toISOString(),
        VoidReason: reason
      });

      // Recalcular estado de factura
      this._updateInvoiceStatus(payment.InvoiceID);

      _dispatchEvent({
        type: 'payment.voided',
        entity: 'Payment',
        entityId: paymentId,
        payload: { invoiceId: payment.InvoiceID, amount: payment.Amount, reason }
      });

      return PaymentRepository.toDTO(PaymentRepository.getById(paymentId));
    });
  },

  /**
   * Actualizar estado de factura según pagos
   */
  _updateInvoiceStatus(invoiceId) {
    const invoice = InvoiceRepository.getById(invoiceId);
    if (!invoice) return;

    const saldo = InvoiceRepository.getSaldo(invoiceId);
    const total = parseFloat(invoice.Total) || 0;
    const previousStatus = invoice.Status;

    if (saldo <= 0 && previousStatus !== 'Pagada') {
      // Pagada — validate transition
      _assertValidTransition('Invoice', previousStatus, 'Pagada');
      InvoiceRepository.update(invoiceId, { Status: 'Pagada' });
      _dispatchEvent({
        type: 'invoice.paid',
        entity: 'Invoice',
        entityId: invoiceId,
        payload: { total }
      });
    } else if (saldo > 0 && saldo < total && previousStatus !== 'PagoParcial') {
      // Pago parcial — validate transition
      _assertValidTransition('Invoice', previousStatus, 'PagoParcial');
      InvoiceRepository.update(invoiceId, { Status: 'PagoParcial' });
      _dispatchEvent({
        type: 'invoice.partial_payment',
        entity: 'Invoice',
        entityId: invoiceId,
        payload: { saldo, total }
      });
    }
    // Si saldo == total, no cambia (se mantiene Enviada/Vencida)
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiRegisterPayment(invoiceId, paymentData) {
  return PaymentCommands.register(invoiceId, paymentData);
}

function apiEditPayment(paymentId, changes) {
  return PaymentCommands.edit(paymentId, changes);
}

function apiConfirmPayment(paymentId) {
  return PaymentCommands.confirm(paymentId);
}

function apiReconcilePayment(paymentId) {
  return PaymentCommands.reconcile(paymentId);
}

function apiVoidPayment(paymentId, reason) {
  return PaymentCommands.voidPayment(paymentId, reason);
}

/**
 * EDGE003: Check for duplicate payment warning.
 * Returns { warning: boolean, message?: string }
 *
 * Las fechas NO se comparan con ===: Apps Script guarda 'YYYY-MM-DD' en la
 * celda y Google Sheets lo devuelve como Date, así que `p.PaymentDate ===
 * paymentDate` nunca era true y el detector de duplicados estaba muerto.
 * También se normaliza el monto, que llega como string por la query string.
 */
function _paymentDuplicateDateKey(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value === null || value === undefined ? '' : value).trim().slice(0, 10);
}

function apiCheckDuplicatePayment(invoiceId, amount, paymentDate, reference) {
  const payments = PaymentRepository.getAllByInvoice(invoiceId);
  const targetAmount = parseFloat(amount) || 0;
  const targetDate = _paymentDuplicateDateKey(paymentDate);
  const targetReference = String(reference === null || reference === undefined ? '' : reference).trim();

  const duplicate = payments.find(p => {
    if (p.Status === 'Anulado') return false;
    const sameAmount = Math.abs((parseFloat(p.Amount) || 0) - targetAmount) < 0.01;
    const sameDate = _paymentDuplicateDateKey(p.PaymentDate) === targetDate;
    const sameReference = String(p.Reference === null || p.Reference === undefined ? '' : p.Reference).trim() === targetReference;
    return sameAmount && sameDate && sameReference;
  });

  if (duplicate) {
    return {
      warning: true,
      message: 'Este pago ya fue registrado. ¿Confirmar?',
      duplicateId: duplicate.ID
    };
  }
  return { warning: false };
}
