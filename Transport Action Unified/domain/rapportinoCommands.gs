// ============================================================================
// RAPPORTINOCOMMANDS.GS — Comandos de Rapportinos (Client + Driver)
// ============================================================================

// ============================================================================
// RAPPORTINO CLIENT COMMANDS
// ============================================================================

const RapportinoClientCommands = {
  /**
   * Crear rapportino cliente
   * Precondiciones:
   * - No existe rapportino en Borrador para mismo Project+Client+Week
   */
  create(projectId, clientId, weekStart, weekEnd, periodType) {
    return _withLock(() => {
      // EDGE005: No se pueden crear rapportinos en proyecto archivado
      var project = ProjectRepository.getById(projectId);
      if (project && project.Status === 'Archiviato') {
        throw new BusinessRuleError('Cannot create rapportinos in archived project', 'EDGE005');
      }

      periodType = periodType || 'weekly';
      if (ENUMS.RapportinoPeriodType.indexOf(periodType) === -1) {
        throw new BusinessRuleError('Invalid period type: ' + periodType, 'RC001');
      }
      if (!weekStart || !weekEnd) {
        throw new BusinessRuleError('PeriodStart and PeriodEnd are required', 'RC001');
      }

      // Verificar que no exista borrador duplicado
      const existing = RapportinoClientRepository.getBorradorByProjectClient(
        projectId, clientId, weekStart, weekEnd, periodType
      );
      if (existing) {
        throw new BusinessRuleError(
          'A draft rapportino already exists for this project/client/period',
          'RC001'
        );
      }

      const rapportino = RapportinoClientRepository.create({
        ProjectID: projectId,
        ClientID: clientId,
        PeriodType: periodType,
        PeriodStart: weekStart,
        PeriodEnd: weekEnd,
        WeekStart: weekStart,
        WeekEnd: weekEnd
      });

      _dispatchEvent({
        type: 'rapportino_client.created',
        entity: 'RapportinoClient',
        entityId: rapportino.ID
      });

      return RapportinoClientRepository.toDTO(rapportino);
    });
  },

  /**
   * Agregar servicio al rapportino
   * Precondiciones:
   * - Rapportino en Borrador
   * - Service.OperationalStatus = Validado
   * - Service.FinancialStatus = Pendiente
   * - No está ya en este rapportino
   */
  addService(rapportinoId, serviceId) {
    return _withLock(() => {
      const rapportino = RapportinoClientRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoClient', rapportinoId);
      if (rapportino.Status !== 'Borrador') {
        throw new BusinessRuleError('Can only add services to draft rapportinos', 'RC002');
      }

      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      if (service.OperationalStatus !== 'Validado') {
        throw new BusinessRuleError('Service must be validated to add to rapportino', 'RC002');
      }
      if (['Aprobado', 'Facturable', 'Pendiente', 'ActualsConfirmados'].indexOf(service.FinancialStatus) === -1) {
        throw new BusinessRuleError('Service must have pending/approved financial status', 'RC002');
      }

      // Verificar que no esté ya en este rapportino
      const existingItems = RapportinoItemRepository.getByRapportinoClient(rapportinoId);
      if (existingItems.some(i => i.ServiceID === serviceId)) {
        throw new BusinessRuleError('Service is already in this rapportino', 'RC002');
      }

      // Verificar que no esté en otro rapportino activo
      const allItems = RapportinoItemRepository.getByService(serviceId);
      const otherRapportinos = allItems.filter(i =>
        i.RapportinoClientID && i.RapportinoClientID !== rapportinoId
      );
      if (otherRapportinos.length > 0) {
        throw new BusinessRuleError('Service is already assigned to another rapportino', 'RC002');
      }

      // Obtener revenue del servicio
      const revenueItems = ServiceRevenueBreakdownRepository.getByService(serviceId);
      if (revenueItems.length === 0) {
        throw new BusinessRuleError('Service has no revenue breakdown — cannot add to rapportino', 'RC002');
      }
      const hasUnlockedAutomatic = revenueItems.some(i =>
        (i.Source === 'rate_card' || i.Source === 'imported') &&
        (i.Locked !== 'true' && i.Locked !== true)
      );
      if (hasUnlockedAutomatic) {
        throw new BusinessRuleError('Service has unlocked automatic breakdown items — validate service first', 'RC002');
      }
      const totalAmount = revenueItems.reduce((sum, item) => sum + (parseFloat(item.Total) || 0), 0);

      // Crear item
      RapportinoItemRepository.create({
        RapportinoClientID: rapportinoId,
        ServiceID: serviceId,
        Amount: totalAmount
      });

      // Actualizar totales del rapportino
      this._recalculateTotals(rapportinoId);

      _dispatchEvent({
        type: 'rapportino_client.service_added',
        entity: 'RapportinoClient',
        entityId: rapportinoId,
        payload: { serviceId, amount: totalAmount }
      });

      return RapportinoClientRepository.toDTO(RapportinoClientRepository.getById(rapportinoId));
    });
  },

  /**
   * Remover servicio del rapportino
   * Precondiciones:
   * - Rapportino en Borrador
   * - Item no está locked
   */
  removeService(rapportinoId, serviceId) {
    return _withLock(() => {
      const rapportino = RapportinoClientRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoClient', rapportinoId);
      if (rapportino.Status !== 'Borrador') {
        throw new BusinessRuleError('Can only remove services from draft rapportinos', 'RC003');
      }

      const items = RapportinoItemRepository.getByRapportinoClient(rapportinoId);
      const item = items.find(i => i.ServiceID === serviceId);
      if (!item) throw new BusinessRuleError('Service not found in this rapportino', 'RC003');
      if ((parseFloat(item.LockedAmount) || 0) > 0) {
        throw new BusinessRuleError('Cannot remove locked item', 'RC003');
      }

      RapportinoItemRepository.delete(item.ID);
      this._recalculateTotals(rapportinoId);

      return RapportinoClientRepository.toDTO(RapportinoClientRepository.getById(rapportinoId));
    });
  },

  /**
   * Revisar rapportino
   * Borrador → Revisado
   */
  review(rapportinoId) {
    return _withLock(() => {
      const rapportino = RapportinoClientRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoClient', rapportinoId);
      _assertValidTransition('RapportinoClient', rapportino.Status, 'Revisado');
      const items = RapportinoItemRepository.getByRapportinoClient(rapportinoId);
      if (items.length === 0) {
        throw new BusinessRuleError('Cannot review empty rapportino', 'RC004');
      }

      RapportinoClientRepository.update(rapportinoId, { Status: 'Revisado' });

      _dispatchEvent({
        type: 'rapportino_client.reviewed',
        entity: 'RapportinoClient',
        entityId: rapportinoId
      });

      return RapportinoClientRepository.toDTO(RapportinoClientRepository.getById(rapportinoId));
    });
  },

  /**
   * Enviar rapportino
   * Revisado → Enviado
   */
  send(rapportinoId) {
    return _withLock(() => {
      const rapportino = RapportinoClientRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoClient', rapportinoId);
      _assertValidTransition('RapportinoClient', rapportino.Status, 'Enviado');

      RapportinoClientRepository.update(rapportinoId, {
        Status: 'Enviado',
        SentAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'rapportino_client.sent',
        entity: 'RapportinoClient',
        entityId: rapportinoId
      });

      return RapportinoClientRepository.toDTO(RapportinoClientRepository.getById(rapportinoId));
    });
  },

  /**
   * Aceptar rapportino
   * Enviado → Aceptado
   */
  accept(rapportinoId) {
    return _withLock(() => {
      const rapportino = RapportinoClientRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoClient', rapportinoId);
      _assertValidTransition('RapportinoClient', rapportino.Status, 'Aceptado');

      RapportinoClientRepository.update(rapportinoId, {
        Status: 'Aceptado',
        AcceptedAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'rapportino_client.accepted',
        entity: 'RapportinoClient',
        entityId: rapportinoId
      });

      return RapportinoClientRepository.toDTO(RapportinoClientRepository.getById(rapportinoId));
    });
  },

  /**
   * Rechazar rapportino cliente
   * Enviado → Rechazado
   */
  reject(rapportinoId, reason) {
    return _withLock(() => {
      const rapportino = RapportinoClientRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoClient', rapportinoId);
      _assertValidTransition('RapportinoClient', rapportino.Status, 'Rechazado');
      if (!reason) {
        throw new ValidationError('Rejection reason is required');
      }

      RapportinoClientRepository.update(rapportinoId, {
        Status: 'Rechazado',
        RejectedAt: new Date().toISOString(),
        RejectedReason: reason
      });

      _dispatchEvent({
        type: 'rapportino_client.rejected',
        entity: 'RapportinoClient',
        entityId: rapportinoId,
        payload: { reason }
      });

      return RapportinoClientRepository.toDTO(RapportinoClientRepository.getById(rapportinoId));
    });
  },

  /**
   * Verificar si un rapportino puede facturarse (Ready to Invoice gate)
   * Precondiciones:
   * - Todos los servicios del rapportino en OperationalStatus = 'Validado'
   * - Todos los servicios del rapportino en FinancialStatus = 'Aprobado' o 'Facturable'
   * - No hay reconciliation pendiente en los servicios
   * - Production rapportino aceptado
   * - Supplier side (Driver/Collaborator rapportino) aceptado
   */
  canFacturar(rapportinoId) {
    const rapportino = RapportinoClientRepository.getById(rapportinoId);
    if (!rapportino) throw new NotFoundError('RapportinoClient', rapportinoId);

    const items = RapportinoItemRepository.getByRapportinoClient(rapportinoId);
    const errors = [];

    items.forEach(item => {
      if (item.ServiceID) {
        const service = ServiceRepository.getById(item.ServiceID);
        if (service) {
          if (service.OperationalStatus !== 'Validado') {
            errors.push('Service ' + service.ID + ' not Validado (current: ' + service.OperationalStatus + ')');
          }
          if (service.FinancialStatus !== 'Facturable') {
            errors.push('Service ' + service.ID + ' not in Facturable status (current: ' + service.FinancialStatus + '). Must be Aprobado → Facturable first.');
          }
          // Verificar reconciliation pendiente
          const reconciliation = ReconciliationRepository.getByService(service.ID);
          if (reconciliation && reconciliation.Status !== 'Resuelto') {
            errors.push('Service ' + service.ID + ' has unresolved reconciliation');
          }
        }
      }
    });

    // Verificar rapportino de producción aceptado (este mismo)
    if (rapportino.Status !== 'Aceptado') {
      errors.push('Production rapportino not accepted');
    }

    // Verificar rapportini de proveedores (Driver/Collaborator) aceptados
    const project = ProjectRepository.getById(rapportino.ProjectID);
    if (project) {
      const periodStart = rapportino.PeriodStart || rapportino.WeekStart;
      const periodEnd = rapportino.PeriodEnd || rapportino.WeekEnd;

      const services = ServiceRepository.getAllByProject(rapportino.ProjectID)
        .filter(s => {
          if (!s.Date) return false;
          const d = new Date(s.Date);
          return d >= new Date(periodStart) && d <= new Date(periodEnd);
        });
      
      const driverIds = [...new Set(services.map(s => s.DriverID).filter(Boolean))];
      driverIds.forEach(driverId => {
        const driver = DriverRepository.getById(driverId);
        const isCollaborator = driver && driver.CollaboratorID;

        var accepted = false;
        if (isCollaborator) {
          // Check RapportinoCollaborator for collaborator drivers (Issue #14)
          const collabRapportinos = RapportinoCollaboratorRepository.getAllByCollaborator(driver.CollaboratorID)
            .filter(r => r.ProjectID === rapportino.ProjectID &&
              r.PeriodStart === periodStart &&
              r.PeriodEnd === periodEnd);
          accepted = collabRapportinos.some(r => r.Status === 'Aceptado' || r.Status === 'Pagado');
        } else {
          // Check RapportinoDriver for internal drivers
          const driverRapportinos = RapportinoDriverRepository.getAllByDriver(driverId)
            .filter(r => r.ProjectID === rapportino.ProjectID &&
              (r.PeriodStart || r.WeekStart) === periodStart &&
              (r.PeriodEnd || r.WeekEnd) === periodEnd);
          accepted = driverRapportinos.some(r => r.Status === 'Aceptado' || r.Status === 'Pagado');
        }

        if (!accepted && driverIds.length > 0) {
          errors.push('Driver ' + (driver ? driver.Name : driverId) + ' rapportino not accepted');
        }
      });
    }

    return {
      canFacturar: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Facturar rapportino
   * Aceptado → Facturado
   * FREEZE: lockea items + crea InvoiceItems + crea/actualiza Invoice
   * VALIDA: Ready to Invoice gate
   */
  facturar(rapportinoId) {
    return _withLock(() => {
      // 1. Verificar Ready to Invoice gate
      const gate = this.canFacturar(rapportinoId);
      if (!gate.canFacturar) {
        throw new BusinessRuleError(
          'Cannot invoice: ' + gate.errors.join('; '),
          'RC007_GATE'
        );
      }

      const rapportino = RapportinoClientRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoClient', rapportinoId);
      if (rapportino.Status !== 'Aceptado') {
        throw new BusinessRuleError('Rapportino must be in Aceptado state', 'RC007');
      }

      // 2. Congelar ítems
      const items = RapportinoItemRepository.getByRapportinoClient(rapportinoId);
      if (items.length === 0) {
        throw new BusinessRuleError('Rapportino must have at least 1 item to facturar', 'RC007');
      }

      items.forEach(item => {
        RapportinoItemRepository.update(item.ID, {
          LockedAmount: item.Amount
        });
      });

      // 3. Buscar o crear Invoice en Borrador para Project+Client
      let invoice = InvoiceRepository.getBorradorByProjectClient(
        rapportino.ProjectID, rapportino.ClientID
      );

      if (!invoice) {
        invoice = InvoiceRepository.create({
          ProjectID: rapportino.ProjectID,
          ClientID: rapportino.ClientID
        });
      }

      // 4. Crear InvoiceItems (1 por RapportinoItem)
      items.forEach(item => {
        InvoiceItemRepository.create({
          InvoiceID: invoice.ID,
          RapportinoClientID: rapportinoId,
          ServiceID: item.ServiceID || '',
          Amount: item.Amount
        });
      });

      // 5. Recalcular totales del Invoice
      InvoiceRepository.recalculateTotals(invoice.ID);

      // 6. Actualizar estado del rapportino
      RapportinoClientRepository.update(rapportinoId, { Status: 'Facturado' });

      // 7. Actualizar FinancialStatus de cada servicio → "Facturado"
      // Use the facturarService command for proper state machine + lock handling
      // Errors propagate — caller sees which service failed
      items.forEach(item => {
        if (item.ServiceID) {
          ServiceCommands.facturarService(item.ServiceID);
        }
      });

      _dispatchEvent({
        type: 'rapportino_client.facturado',
        entity: 'RapportinoClient',
        entityId: rapportinoId,
        payload: { invoiceId: invoice.ID, itemCount: items.length }
      });

      return RapportinoClientRepository.toDTO(RapportinoClientRepository.getById(rapportinoId));
    });
  },

  /**
   * Recalcular totales del rapportino
   */
  _recalculateTotals(rapportinoId) {
    // Total and ServiceCount are not entity fields per docs
    // Totals are calculated from RapportinoItems when needed
  }
};

// ============================================================================
// RAPPORTINO DRIVER COMMANDS
// ============================================================================

const RapportinoDriverCommands = {
  /**
   * Crear rapportino conductor
   * Precondiciones:
   * - ProjectID y DriverID deben existir como IDs (no nombres)
   * - No existe borrador para mismo Project+Driver+Week
   * - WeekStart <= WeekEnd
   */
  create(projectId, driverId, weekStart, weekEnd, periodType) {
    return _withLock(() => {
      // Validate IDs exist (reject names)
      if (!projectId || projectId.length > 20 || projectId.includes(' ')) {
        throw new BusinessRuleError('Invalid ProjectID — must be a valid ID, not a name', 'RD006');
      }
      if (!driverId || driverId.length > 20 || driverId.includes(' ')) {
        throw new BusinessRuleError('Invalid DriverID — must be a valid ID, not a name', 'RD006');
      }

      var project = ProjectRepository.getById(projectId);
      if (!project) throw new NotFoundError('Project', projectId);
      if (project.Status === 'Archiviato') {
        throw new BusinessRuleError('Cannot create rapportinos in archived project', 'EDGE005');
      }

      var driver = DriverRepository.getById(driverId);
      if (!driver) throw new NotFoundError('Driver', driverId);

      // Collaborator drivers must use RapportinoCollaborator, not RapportinoDriver
      if (driver.CollaboratorID) {
        throw new BusinessRuleError('Driver belongs to a collaborator. Use RapportinoCollaborator instead.', 'RD006');
      }

      periodType = periodType || 'weekly';
      if (ENUMS.RapportinoPeriodType.indexOf(periodType) === -1) {
        throw new BusinessRuleError('Invalid period type: ' + periodType, 'RD001');
      }

      // Validate week range
      if (!weekStart || !weekEnd) {
        throw new BusinessRuleError('WeekStart and WeekEnd are required', 'RD007');
      }
      if (new Date(weekStart) > new Date(weekEnd)) {
        throw new BusinessRuleError('WeekStart must be before WeekEnd', 'RD007');
      }

      // Check duplicate for same week
      const existing = RapportinoDriverRepository.getBorradorByProjectDriver(
        projectId, driverId, weekStart, weekEnd, periodType
      );
      if (existing) {
        throw new BusinessRuleError(
          'A draft rapportino already exists for this project/driver/period',
          'RD001'
        );
      }

      const rapportino = RapportinoDriverRepository.create({
        ProjectID: projectId,
        DriverID: driverId,
        PeriodType: periodType,
        PeriodStart: weekStart,
        PeriodEnd: weekEnd,
        WeekStart: weekStart,
        WeekEnd: weekEnd
      });

      _dispatchEvent({
        type: 'rapportino_driver.created',
        entity: 'RapportinoDriver',
        entityId: rapportino.ID
      });

      return RapportinoDriverRepository.toDTO(rapportino);
    });
  },

  /**
   * Revisar rapportino conductor
   * Borrador → Revisado
   * Precondicion: al menos 1 servicio asignado en el periodo
   */
  review(rapportinoId) {
    return _withLock(() => {
      const rapportino = RapportinoDriverRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoDriver', rapportinoId);
      _assertValidTransition('RapportinoDriver', rapportino.Status, 'Revisado');

      // Verify at least 1 service exists for this driver in the period
      const services = ServiceRepository.getAllByDriver(rapportino.DriverID)
        .filter(s => {
          if (!s.Date) return false;
          const d = new Date(s.Date);
          return d >= new Date(rapportino.WeekStart) && d <= new Date(rapportino.WeekEnd);
        });
      if (services.length === 0) {
        throw new BusinessRuleError('Cannot review rapportino with no services in the period', 'RD008');
      }

      RapportinoDriverRepository.update(rapportinoId, { Status: 'Revisado' });

      _dispatchEvent({
        type: 'rapportino_driver.reviewed',
        entity: 'RapportinoDriver',
        entityId: rapportinoId
      });

      return RapportinoDriverRepository.toDTO(RapportinoDriverRepository.getById(rapportinoId));
    });
  },

  /**
   * Enviar rapportino conductor
   * Revisado → Enviado
   */
  send(rapportinoId) {
    return _withLock(() => {
      const rapportino = RapportinoDriverRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoDriver', rapportinoId);
      _assertValidTransition('RapportinoDriver', rapportino.Status, 'Enviado');

      RapportinoDriverRepository.update(rapportinoId, {
        Status: 'Enviado',
        SentAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'rapportino_driver.sent',
        entity: 'RapportinoDriver',
        entityId: rapportinoId
      });

      return RapportinoDriverRepository.toDTO(RapportinoDriverRepository.getById(rapportinoId));
    });
  },

  /**
   * Aceptar rapportino conductor
   * Enviado → Aceptado
   */
  accept(rapportinoId) {
    return _withLock(() => {
      const rapportino = RapportinoDriverRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoDriver', rapportinoId);
      _assertValidTransition('RapportinoDriver', rapportino.Status, 'Aceptado');

      RapportinoDriverRepository.update(rapportinoId, { Status: 'Aceptado' });

      _dispatchEvent({
        type: 'rapportino_driver.accepted',
        entity: 'RapportinoDriver',
        entityId: rapportinoId
      });

      return RapportinoDriverRepository.toDTO(RapportinoDriverRepository.getById(rapportinoId));
    });
  },

  /**
   * Rechazar rapportino conductor
   * Enviado → Rechazado
   */
  reject(rapportinoId, reason) {
    return _withLock(() => {
      const rapportino = RapportinoDriverRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoDriver', rapportinoId);
      _assertValidTransition('RapportinoDriver', rapportino.Status, 'Rechazado');
      if (!reason) {
        throw new ValidationError('Rejection reason is required');
      }

      RapportinoDriverRepository.update(rapportinoId, {
        Status: 'Rechazado',
        RejectedAt: new Date().toISOString(),
        RejectedReason: reason
      });

      _dispatchEvent({
        type: 'rapportino_driver.rejected',
        entity: 'RapportinoDriver',
        entityId: rapportinoId,
        payload: { reason }
      });

      return RapportinoDriverRepository.toDTO(RapportinoDriverRepository.getById(rapportinoId));
    });
  },

  /**
   * Pagar rapportino conductor (conductor propio)
   * Aceptado → Pagado
   * Crea DriverAdvances
   * Usa SupplierRate (internal_driver) para calcular coste real
   */
  pay(rapportinoId, amount) {
    return _withLock(() => {
      const rapportino = RapportinoDriverRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoDriver', rapportinoId);
      _assertValidTransition('RapportinoDriver', rapportino.Status, 'Pagado');

      // Verify driver is internal_driver (not collaborator) — collaborators must use RapportinoCollaborator
      const driver = DriverRepository.getById(rapportino.DriverID);
      if (driver && driver.CollaboratorID) {
        throw new BusinessRuleError('Driver belongs to a collaborator. Use RapportinoCollaborator instead.', 'RD006');
      }

      // Use PeriodStart/PeriodEnd (canonical), fallback to WeekStart/WeekEnd
      const periodStart = rapportino.PeriodStart || rapportino.WeekStart;
      const periodEnd = rapportino.PeriodEnd || rapportino.WeekEnd;

      // Obtener servicios del conductor en el período
      const services = ServiceRepository.getAllByDriver(rapportino.DriverID)
        .filter(s => {
          if (!s.Date) return false;
          const d = new Date(s.Date);
          return d >= new Date(periodStart) && d <= new Date(periodEnd);
        });

      // Calcular coste usando SupplierRate (internal_driver) para cada servicio
      let total = 0;
      services.forEach(service => {
        const activeReport = DriverReportRepository.getActiveByService(service.ID);
        if (activeReport) {
          const driverReportData = {
            startTime: activeReport.StartTime,
            endTime: activeReport.EndTime,
            kmTotal: parseFloat(activeReport.KmTotal) || 0,
            hasDiaria: activeReport.HasDiaria === 'true' || activeReport.HasDiaria === true,
            isFestivo: activeReport.IsFestivo === 'true' || activeReport.IsFestivo === true,
            isNotturno: activeReport.IsNotturno === 'true' || activeReport.IsNotturno === true,
            diariaType: activeReport.DiariaType || 'none',
            parking: parseFloat(activeReport.Parking) || 0,
            tolls: parseFloat(activeReport.Tolls) || 0,
            fuel: parseFloat(activeReport.Fuel) || 0,
            waitMinutes: parseFloat(activeReport.WaitMinutes) || 0
          };
          try {
            const economics = ServiceEconomics.calculateEconomics(service.ID, driverReportData);
            total += economics.cost.total;
          } catch (e) {
            Logger.log('Cost calc error for service ' + service.ID + ': ' + e.message);
          }
        }
      });

      const paymentAmount = amount || total;

      // Crear DriverAdvance
      DriverAdvanceRepository.create({
        DriverID: rapportino.DriverID,
        ProjectID: rapportino.ProjectID,
        Amount: paymentAmount,
        Notes: `Rapportino ${rapportinoId} payment`
      });

      // Actualizar estado
      RapportinoDriverRepository.update(rapportinoId, { Status: 'Pagado', PaidAt: new Date().toISOString() });

      _dispatchEvent({
        type: 'rapportino_driver.pagado',
        entity: 'RapportinoDriver',
        entityId: rapportinoId,
        payload: { amount: paymentAmount }
      });

      return RapportinoDriverRepository.toDTO(RapportinoDriverRepository.getById(rapportinoId));
    });
  }
};

// ============================================================================
// API endpoints
// ============================================================================

// Rapportino Client
function apiGetRapportinoClients(filters) {
  let items = RapportinoClientRepository.getAll();
  if (filters) {
    if (filters.projectId) items = items.filter(i => i.ProjectID === filters.projectId);
    if (filters.clientId) items = items.filter(i => i.ClientID === filters.clientId);
    if (filters.status) items = items.filter(i => i.Status === filters.status);
    // Date range filter: period must overlap with filter range
    if (filters.dateFrom) items = items.filter(i => !i.PeriodEnd || i.PeriodEnd >= filters.dateFrom);
    if (filters.dateTo) items = items.filter(i => !i.PeriodStart || i.PeriodStart <= filters.dateTo);
  }
  return items.map(RapportinoClientRepository.toDTO);
}

function apiCreateRapportinoClient(projectId, clientId, weekStart, weekEnd, periodType) {
  return RapportinoClientCommands.create(projectId, clientId, weekStart, weekEnd, periodType);
}

function apiAddServiceToRapportino(rapportinoId, serviceId) {
  return RapportinoClientCommands.addService(rapportinoId, serviceId);
}

function apiRemoveServiceFromRapportino(rapportinoId, serviceId) {
  return RapportinoClientCommands.removeService(rapportinoId, serviceId);
}

function apiReviewRapportinoClient(rapportinoId) {
  return RapportinoClientCommands.review(rapportinoId);
}

function apiSendRapportinoClient(rapportinoId) {
  return RapportinoClientCommands.send(rapportinoId);
}

function apiAcceptRapportinoClient(rapportinoId) {
  return RapportinoClientCommands.accept(rapportinoId);
}

function apiRejectRapportinoClient(rapportinoId, reason) {
  return RapportinoClientCommands.reject(rapportinoId, reason);
}

function apiFacturarRapportino(rapportinoId) {
  return RapportinoClientCommands.facturar(rapportinoId);
}

// Rapportino Driver
function apiGetRapportinoDrivers(filters) {
  let items = RapportinoDriverRepository.getAll();
  if (filters) {
    if (filters.projectId) items = items.filter(i => i.ProjectID === filters.projectId);
    if (filters.driverId) items = items.filter(i => i.DriverID === filters.driverId);
    if (filters.status) items = items.filter(i => i.Status === filters.status);
    // Date range filter: period must overlap with filter range
    if (filters.dateFrom) items = items.filter(i => !i.PeriodEnd || i.PeriodEnd >= filters.dateFrom);
    if (filters.dateTo) items = items.filter(i => !i.PeriodStart || i.PeriodStart <= filters.dateTo);
  }
  return items.map(RapportinoDriverRepository.toDTO);
}

function apiCreateRapportinoDriver(projectId, driverId, weekStart, weekEnd, periodType) {
  return RapportinoDriverCommands.create(projectId, driverId, weekStart, weekEnd, periodType);
}

function apiReviewRapportinoDriver(rapportinoId) {
  return RapportinoDriverCommands.review(rapportinoId);
}

function apiSendRapportinoDriver(rapportinoId) {
  return RapportinoDriverCommands.send(rapportinoId);
}

function apiAcceptRapportinoDriver(rapportinoId) {
  return RapportinoDriverCommands.accept(rapportinoId);
}

function apiRejectRapportinoDriver(rapportinoId, reason) {
  return RapportinoDriverCommands.reject(rapportinoId, reason);
}

function apiPayRapportinoDriver(rapportinoId, amount) {
  return RapportinoDriverCommands.pay(rapportinoId, amount);
}
