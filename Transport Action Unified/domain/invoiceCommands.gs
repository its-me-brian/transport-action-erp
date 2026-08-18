// ============================================================================
// INVOICECOMMANDS.GS — Comandos de Invoice
// ============================================================================

const InvoiceCommands = {
  /**
   * Edit invoice (only while Borrador)
   * Allows modifying: ClientID, ProjectID, DueDate, Notes
   * Does NOT allow modifying: Status, InvoiceNumber, Total (those are calculated)
   */
  edit(invoiceId, changes) {
    return _withLock(() => {
      const invoice = InvoiceRepository.getById(invoiceId);
      if (!invoice) throw new NotFoundError('Invoice', invoiceId);
      if (invoice.Status !== 'Borrador') {
        throw new BusinessRuleError(
          'Can only edit invoices in Borrador status. Current: ' + invoice.Status,
          'I004'
        );
      }

      // Only allow certain fields to be edited
      const allowedFields = ['ClientID', 'ProjectID', 'DueDate', 'Notes'];
      const filteredChanges = {};
      for (var field of allowedFields) {
        if (changes[field] !== undefined) {
          filteredChanges[field] = changes[field];
        }
      }

      if (Object.keys(filteredChanges).length === 0) {
        return { success: true, message: 'No changes to apply' };
      }

      InvoiceRepository.update(invoiceId, filteredChanges);

      _dispatchEvent({
        type: 'invoice.edited',
        entity: 'Invoice',
        entityId: invoiceId,
        payload: { changes: filteredChanges }
      });

      return InvoiceRepository.toDTO(InvoiceRepository.getById(invoiceId));
    });
  },

  /**
   * Emitir factura
   * Borrador → Emitida
   * Genera InvoiceNumber: INV-{OperatingCompany}-{Year}-{Sequential}
   */
  emit(invoiceId) {
    return _withLock(() => {
      const invoice = InvoiceRepository.getById(invoiceId);
      if (!invoice) throw new NotFoundError('Invoice', invoiceId);
      _assertValidTransition('Invoice', invoice.Status, 'Emitida');

      // Verificar que tiene items
      const items = InvoiceItemRepository.getByInvoice(invoiceId);
      if (items.length === 0) {
        throw new BusinessRuleError('Invoice must have at least 1 item', 'I001');
      }

      // Obtener OperatingCompany del primer servicio
      const firstItem = items[0];
      const service = ServiceRepository.getById(firstItem.ServiceID);
      const operatingCompany = service ? service.OperatingCompany : 'TA';

      // Generar número de factura con verificación de unicidad
      let invoiceNumber = _generateId('INV', operatingCompany);
      let attempts = 0;
      while (InvoiceRepository.getByInvoiceNumber(invoiceNumber)) {
        attempts++;
        if (attempts > 10) throw new BusinessRuleError('Cannot generate unique invoice number', 'I010');
        invoiceNumber = _generateId('INV', operatingCompany);
      }

      // Calcular fecha de vencimiento (30 días por defecto)
      const now = new Date();
      const dueDate = invoice.DueDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Recalcular totales
      InvoiceRepository.recalculateTotals(invoiceId);

      // Actualizar factura
      InvoiceRepository.update(invoiceId, {
        InvoiceNumber: invoiceNumber,
        Date: now.toISOString(),
        DueDate: dueDate,
        Status: 'Emitida'
      });

      _dispatchEvent({
        type: 'invoice.emitted',
        entity: 'Invoice',
        entityId: invoiceId,
        payload: { invoiceNumber, total: invoice.Total }
      });

      return InvoiceRepository.toDTO(InvoiceRepository.getById(invoiceId));
    });
  },

  /**
   * Enviar factura
   * Emitida → Enviada
   */
  send(invoiceId) {
    return _withLock(() => {
      const invoice = InvoiceRepository.getById(invoiceId);
      if (!invoice) throw new NotFoundError('Invoice', invoiceId);
      _assertValidTransition('Invoice', invoice.Status, 'Enviada');

      InvoiceRepository.update(invoiceId, { Status: 'Enviada' });

      _dispatchEvent({
        type: 'invoice.sent',
        entity: 'Invoice',
        entityId: invoiceId
      });

      return InvoiceRepository.toDTO(InvoiceRepository.getById(invoiceId));
    });
  },

  /**
   * Anular factura
   * Solo si no tiene pagos confirmados
   */
  void(invoiceId, reason) {
    return _withLock(() => {
      const invoice = InvoiceRepository.getById(invoiceId);
      if (!invoice) throw new NotFoundError('Invoice', invoiceId);
      _assertValidTransition('Invoice', invoice.Status, 'Anulada');

      // Verificar que no tenga pagos confirmados
      const payments = PaymentRepository.getConfirmedByInvoice(invoiceId);
      if (payments.length > 0) {
        throw new BusinessRuleError('Cannot void invoice with confirmed payments', 'I003');
      }

      if (!reason) {
        throw new ValidationError('Void reason is required');
      }

      InvoiceRepository.update(invoiceId, {
        Status: 'Anulada',
        VoidReason: reason
      });

      _dispatchEvent({
        type: 'invoice.voided',
        entity: 'Invoice',
        entityId: invoiceId,
        payload: { reason }
      });

      return InvoiceRepository.toDTO(InvoiceRepository.getById(invoiceId));
    });
  },

  /**
   * Verificar facturas vencidas
   * Envia → Vencida si DueDate < hoy
   * PagoParcial → Vencida si DueDate < hoy
   * Se puede llamar desde un trigger programado o manualmente.
   */
  checkOverdue() {
    const now = new Date();
    const invoices = InvoiceRepository.getAll()
      .filter(i => ['Enviada', 'PagoParcial'].includes(i.Status));

    let count = 0;
    invoices.forEach(inv => {
      if (!inv.DueDate) return;
      const dueDate = new Date(inv.DueDate);
      if (dueDate < now) {
        _assertValidTransition('Invoice', inv.Status, 'Vencida');
        InvoiceRepository.update(inv.ID, { Status: 'Vencida' });
        _dispatchEvent({
          type: 'invoice.overdue',
          entity: 'Invoice',
          entityId: inv.ID,
          payload: { dueDate: inv.DueDate, total: inv.Total }
        });
        count++;
      }
    });

    return { checked: invoices.length, overdue: count };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiEditInvoice(invoiceId, changes) {
  return InvoiceCommands.edit(invoiceId, changes);
}

function apiEmitInvoice(invoiceId) {
  return InvoiceCommands.emit(invoiceId);
}

function apiSendInvoice(invoiceId) {
  return InvoiceCommands.send(invoiceId);
}

function apiVoidInvoice(invoiceId, reason) {
  return InvoiceCommands.void(invoiceId, reason);
}
