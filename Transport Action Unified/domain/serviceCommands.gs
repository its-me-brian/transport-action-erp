// ============================================================================
// SERVICECOMMANDS.GS — Comandos de Service (transiciones de estado)
// ============================================================================

const ServiceCommands = {
  /**
   * EDGE002: Verificar que el servicio no tenga rapportinos facturados (LockedAmount > 0)
   */
  _assertNotInvoiced(serviceId) {
    const items = RapportinoItemRepository.getByService(serviceId);
    const locked = items.filter(i => (parseFloat(i.LockedAmount) || 0) > 0);
    if (locked.length > 0) {
      throw new BusinessRuleError(
        'Servicio con rapportinos facturados. No se puede modificar.',
        'EDGE002'
      );
    }
  },

  /**
   * S001: Asignar conductor a servicio
   * OperationalStatus: Importado → Asignado
   */
  assignDriver(serviceId, driverId, vehicleId) {
    return _withLock(() => {
      // 1. Precondiciones
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      this._assertNotInvoiced(serviceId);
      _assertValidTransition('ServiceOperational', service.OperationalStatus, 'Asignado');

      const driver = DriverRepository.getById(driverId);
      if (!driver) throw new NotFoundError('Driver', driverId);

      // INV-009: Check driver not already assigned to another active service
      const activeStatuses = ['Asignado', 'Confirmado', 'EnRuta', 'Realizado', 'Reportado'];
      const existingAssignment = ServiceRepository.getAll().find(
        s => s.DriverID === driverId && activeStatuses.includes(s.OperationalStatus) && s.ID !== serviceId
      );
      if (existingAssignment) {
        throw new BusinessRuleError(`Driver ${driverId} is already assigned to service ${existingAssignment.ID}`, 'S010');
      }

      // Vehicle is optional — can be set later
      let resolvedVehicleId = vehicleId || service.VehicleID || '';
      if (resolvedVehicleId) {
        const vehicle = VehicleRepository.getById(resolvedVehicleId);
        if (!vehicle) throw new NotFoundError('Vehicle', resolvedVehicleId);
      }

      // Determine provider based on driver's collaborator assignment
      let providerType = 'internal_driver';
      let providerId = driverId;
      if (driver.CollaboratorID) {
        providerType = 'collaborator';
        providerId = driver.CollaboratorID;
      }

      // 2. Modificar estado
      ServiceRepository.update(serviceId, {
        DriverID: driverId,
        VehicleID: resolvedVehicleId,
        OperationalStatus: 'Asignado',
        ProviderType: providerType,
        ProviderID: providerId
      });

      // 3. Side effects
      DriverRepository.update(driverId, { Status: 'Asignado' });

      // 4. Evento
      _dispatchEvent({
        type: 'service.assigned',
        entity: 'Service',
        entityId: serviceId,
        payload: { driverId, vehicleId: resolvedVehicleId }
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * S002: Confirmar servicio
   * OperationalStatus: Asignado → Confirmado
   */
  confirmService(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      this._assertNotInvoiced(serviceId);
      _assertValidTransition('ServiceOperational', service.OperationalStatus, 'Confirmado');

      ServiceRepository.update(serviceId, {
        OperationalStatus: 'Confirmado'
      });

      _dispatchEvent({
        type: 'service.confirmed',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * S003: Iniciar ruta
   * OperationalStatus: Confirmado → EnRuta
   */
  startService(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      this._assertNotInvoiced(serviceId);
      _assertValidTransition('ServiceOperational', service.OperationalStatus, 'EnRuta');

      ServiceRepository.update(serviceId, {
        OperationalStatus: 'EnRuta'
      });

      _dispatchEvent({
        type: 'service.started',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * S004: Completar servicio
   * OperationalStatus: EnRuta → Realizado
   */
  completeService(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      this._assertNotInvoiced(serviceId);
      _assertValidTransition('ServiceOperational', service.OperationalStatus, 'Realizado');

      ServiceRepository.update(serviceId, {
        OperationalStatus: 'Realizado'
      });

      // Restore driver status to Disponible if no other active service
      if (service.DriverID) {
        const activeStatuses = ['Asignado', 'Confirmado', 'EnRuta', 'Realizado', 'Reportado'];
        const otherActive = ServiceRepository.getAll().find(
          s => s.DriverID === service.DriverID && activeStatuses.includes(s.OperationalStatus) && s.ID !== serviceId
        );
        if (!otherActive) {
          DriverRepository.update(service.DriverID, { Status: 'Disponible' });
        }
      }

      _dispatchEvent({
        type: 'service.completed',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * S005a: Reportar servicio (conductor reporta que terminó)
   * OperationalStatus: Realizado → Reportado
   */
  reportService(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      this._assertNotInvoiced(serviceId);
      _assertValidTransition('ServiceOperational', service.OperationalStatus, 'Reportado');

      ServiceRepository.update(serviceId, {
        OperationalStatus: 'Reportado'
      });

      _dispatchEvent({
        type: 'service.reported',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * S008: Cancelar servicio
   * OperationalStatus: Importado/Asignado/Confirmado/EnRuta → Cancelado
   * Solo permitido antes de que el servicio sea Realizado
   */
  cancelService(serviceId, reason) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      this._assertNotInvoiced(serviceId);
      _assertValidTransition('ServiceOperational', service.OperationalStatus, 'Cancelado');

      if (!reason || reason.trim() === '') {
        throw new ValidationError('Cancellation reason is required', 'S008');
      }

      ServiceRepository.update(serviceId, {
        OperationalStatus: 'Cancelado',
        Notes: (service.Notes || '') + '\n[Cancelled] ' + reason
      });

      // Restore driver status to Disponible if no other active service
      if (service.DriverID) {
        const activeStatuses = ['Asignado', 'Confirmado', 'EnRuta', 'Realizado', 'Reportado'];
        const otherActive = ServiceRepository.getAll().find(
          s => s.DriverID === service.DriverID && activeStatuses.includes(s.OperationalStatus) && s.ID !== serviceId
        );
        if (!otherActive) {
          DriverRepository.update(service.DriverID, { Status: 'Disponible' });
        }
      }

      _dispatchEvent({
        type: 'service.cancelled',
        entity: 'Service',
        entityId: serviceId,
        metadata: { reason: reason, previousStatus: service.OperationalStatus }
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * S005: Validar servicio (reporte aceptado → servicio validado)
   * OperationalStatus: Reportado → Validado
   * FREEZE: Congela todos los breakdowns
   */
  validateService(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      _assertValidTransition('ServiceOperational', service.OperationalStatus, 'Validado');
      this._assertNotInvoiced(serviceId);

      // Validar que existe DriverReport aceptado
      const reports = DriverReportRepository.getByService(serviceId);
      const acceptedReport = reports.find(r => r.Status === 'Aceptado');
      if (!acceptedReport) {
        throw new BusinessRuleError(
          'Cannot validate service without an accepted DriverReport',
          'S006'
        );
      }

      // Validar campos obligatorios
      if (!service.DriverID) {
        throw new BusinessRuleError('Service must have a Driver assigned', 'S006');
      }
      // §37: VehicleID is NOT required — services can be created without one

      // Validar breakdowns
      const revenueItems = ServiceRevenueBreakdownRepository.getUnlockedByService(serviceId);
      const costItems = ServiceCostBreakdownRepository.getUnlockedByService(serviceId);
      if (revenueItems.length === 0) {
        throw new BusinessRuleError('Service must have at least 1 RevenueBreakdown', 'S006');
      }
      if (costItems.length === 0) {
        throw new BusinessRuleError('Service must have at least 1 CostBreakdown', 'S006');
      }

      // 1. Congelar breakdowns
      const allRevenue = ServiceRevenueBreakdownRepository.getByService(serviceId);
      const allCost = ServiceCostBreakdownRepository.getByService(serviceId);

      allRevenue.forEach(item => {
        ServiceRevenueBreakdownRepository.update(item.ID, { Locked: true });
      });

      allCost.forEach(item => {
        ServiceCostBreakdownRepository.update(item.ID, { Locked: true });
      });

      // 2. Actualizar servicio
      ServiceRepository.update(serviceId, {
        OperationalStatus: 'Validado'
      });

      // 3. Evento
      _dispatchEvent({
        type: 'service.validated',
        entity: 'Service',
        entityId: serviceId,
        payload: {
          revenueTotal: ServiceRevenueBreakdownRepository.calculateTotal(serviceId),
          costTotal: ServiceCostBreakdownRepository.calculateTotal(serviceId)
        }
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * SF001: Facturar servicio
   * FinancialStatus: Aprobado | Facturable → Facturado
   * Solo si OperationalStatus = Validado
   */
  facturarService(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      if (service.OperationalStatus !== 'Validado') {
        throw new BusinessRuleError(
          'Service must be validated before invoicing',
          'SF001'
        );
      }
      if (service.FinancialStatus !== 'Facturable') {
        throw new BusinessRuleError(
          'Service must be in Facturable status before invoicing (current: ' + service.FinancialStatus + '). Use approveFinancial → markFacturable first.',
          'SF001'
        );
      }
      _assertValidTransition('ServiceFinancial', service.FinancialStatus, 'Facturado');

      ServiceRepository.update(serviceId, {
        FinancialStatus: 'Facturado'
      });

      _dispatchEvent({
        type: 'service.facturado',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * SF002: Cobrar servicio
   * FinancialStatus: Facturado → Cobrado
   */
  cobrarService(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      _assertValidTransition('ServiceFinancial', service.FinancialStatus, 'Cobrado');

      ServiceRepository.update(serviceId, {
        FinancialStatus: 'Cobrado'
      });

      _dispatchEvent({
        type: 'service.cobrado',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * SF003: Cerrar servicio
   * FinancialStatus: Cobrado → Cerrado
   */
  closeService(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      _assertValidTransition('ServiceFinancial', service.FinancialStatus, 'Cerrado');

      ServiceRepository.update(serviceId, {
        FinancialStatus: 'Cerrado'
      });

      _dispatchEvent({
        type: 'service.closed',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * SF003b: Cerrar comercialmente servicio
   * FinancialStatus: Cerrado → CerradoComercial (terminal)
   * Indica que el servicio está cerrado y revisado comercialmente
   */
  cerrarComercialmente(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      _assertValidTransition('ServiceFinancial', service.FinancialStatus, 'CerradoComercial');

      ServiceRepository.update(serviceId, {
        FinancialStatus: 'CerradoComercial'
      });

      _dispatchEvent({
        type: 'service.cerrado_comercialmente',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * Ajustar revenue post-validación (docs/10-COMMANDS.md).
   * Precondición: OperationalStatus=Validado.
   * Efecto: Nueva línea en ServiceRevenueBreakdown con Source=adjustment.
   */
  adjustRevenue(serviceId, adjustment) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      if (service.OperationalStatus !== 'Validado') {
        throw new BusinessRuleError(
          'Service must be validated to adjust revenue. Current: ' + service.OperationalStatus,
          'S009'
        );
      }

      var item = {
        ServiceID: serviceId,
        ItemType: adjustment.itemType || 'adjustment',
        Description: adjustment.description || 'Revenue adjustment',
        Quantity: adjustment.quantity || 1,
        UnitPrice: adjustment.unitPrice || adjustment.amount || 0,
        Total: (adjustment.quantity || 1) * (adjustment.unitPrice || adjustment.amount || 0),
        RateCardID: adjustment.rateCardId || '',
        Source: 'adjustment',
        ReferenceLineID: adjustment.referenceLineId || '',
        Locked: false,
        CreatedAt: new Date().toISOString()
      };

      // Validate ReferenceLineID if provided
      if (item.ReferenceLineID) {
        var refLine = ServiceRevenueBreakdownRepository.getById(item.ReferenceLineID);
        if (!refLine) {
          throw new NotFoundError('RevenueBreakdown', item.ReferenceLineID);
        }
        if (refLine.ServiceID !== serviceId) {
          throw new BusinessRuleError('ReferenceLineID does not belong to this service', 'S009');
        }
      }

      var created = ServiceRevenueBreakdownRepository.create(item);

      _dispatchEvent({
        type: 'service.revenue_adjusted',
        entity: 'Service',
        entityId: serviceId,
        payload: { adjustmentId: created.ID, amount: item.Total }
      });

      return ServiceRevenueBreakdownRepository.toDTO(created);
    });
  },

  /**
   * Ajustar cost post-validación (docs/10-COMMANDS.md).
   * Precondición: OperationalStatus=Validado.
   * Efecto: Nueva línea en ServiceCostBreakdown con Source=adjustment.
   */
  adjustCost(serviceId, adjustment) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      if (service.OperationalStatus !== 'Validado') {
        throw new BusinessRuleError(
          'Service must be validated to adjust cost. Current: ' + service.OperationalStatus,
          'S010'
        );
      }

      var item = {
        ServiceID: serviceId,
        ItemType: adjustment.itemType || 'adjustment',
        Description: adjustment.description || 'Cost adjustment',
        Amount: adjustment.amount || 0,
        DriverID: adjustment.driverId || '',
        Source: 'adjustment',
        ReferenceLineID: adjustment.referenceLineId || '',
        Locked: false,
        CreatedAt: new Date().toISOString()
      };

      // Validate ReferenceLineID if provided
      if (item.ReferenceLineID) {
        var refCostLine = ServiceCostBreakdownRepository.getById(item.ReferenceLineID);
        if (!refCostLine) {
          throw new NotFoundError('CostBreakdown', item.ReferenceLineID);
        }
        if (refCostLine.ServiceID !== serviceId) {
          throw new BusinessRuleError('ReferenceLineID does not belong to this service', 'S010');
        }
      }

      var created = ServiceCostBreakdownRepository.create(item);

      _dispatchEvent({
        type: 'service.cost_adjusted',
        entity: 'Service',
        entityId: serviceId,
        payload: { adjustmentId: created.ID, amount: item.Amount }
      });

      return ServiceCostBreakdownRepository.toDTO(created);
    });
  },

  /**
   * SF003.5: Confirmar actuals del servicio (post-reconciliation)
   * FinancialStatus: Confrontacion → ActualsConfirmados
   * Se ejecuta después de que Reconciliation resuelve las diferencias
   */
  confirmActuals(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      _assertValidTransition('ServiceFinancial', service.FinancialStatus, 'ActualsConfirmados');

      ServiceRepository.update(serviceId, {
        FinancialStatus: 'ActualsConfirmados'
      });

      _dispatchEvent({
        type: 'service.actuals_confirmed',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * SF004: Aprobar financials del servicio
   * FinancialStatus: ActualsConfirmados → Aprobado
   * Solo accounting puede aprobar
   */
  approveFinancial(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      _assertValidTransition('ServiceFinancial', service.FinancialStatus, 'Aprobado');

      ServiceRepository.update(serviceId, {
        FinancialStatus: 'Aprobado'
      });

      _dispatchEvent({
        type: 'service.financial_approved',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * SF006: Mover servicio a Confrontacion
   * FinancialStatus: Calculado → Confrontacion
   * Se ejecuta cuando hay diferencias entre producción y conductor
   */
  moveToConfrontacion(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      _assertValidTransition('ServiceFinancial', service.FinancialStatus, 'Confrontacion');

      ServiceRepository.update(serviceId, {
        FinancialStatus: 'Confrontacion'
      });

      _dispatchEvent({
        type: 'service.moved_to_confrontacion',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * SF007: Mover servicio a Calculado
   * FinancialStatus: Pendiente → Calculado
   * Se ejecuta cuando se confirman los datos económicos iniciales
   */
  calculateService(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      _assertValidTransition('ServiceFinancial', service.FinancialStatus, 'Calculado');

      ServiceRepository.update(serviceId, {
        FinancialStatus: 'Calculado'
      });

      _dispatchEvent({
        type: 'service.calculated',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * S006: Mover servicio a Revision (conductor reporta diferencias)
   * OperationalStatus: Reportado → Revision
   */
  moveToRevision(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      _assertValidTransition('ServiceOperational', service.OperationalStatus, 'Revision');

      ServiceRepository.update(serviceId, {
        OperationalStatus: 'Revision'
      });

      _dispatchEvent({
        type: 'service.moved_to_revision',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  },

  /**
   * SF005: Marcar servicio como facturable
   * FinancialStatus: Aprobado → Facturable
   */
  markFacturable(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      _assertValidTransition('ServiceFinancial', service.FinancialStatus, 'Facturable');

      ServiceRepository.update(serviceId, {
        FinancialStatus: 'Facturable'
      });

      _dispatchEvent({
        type: 'service.marked_facturable',
        entity: 'Service',
        entityId: serviceId
      });

      return ServiceRepository.toDTO(ServiceRepository.getById(serviceId));
    });
  }
};

// ============================================================================
// API endpoints — Commands
// ============================================================================

function apiAssignDriver(serviceId, driverId, vehicleId) {
  return ServiceCommands.assignDriver(serviceId, driverId, vehicleId);
}

function apiConfirmService(serviceId) {
  return ServiceCommands.confirmService(serviceId);
}

function apiStartService(serviceId) {
  return ServiceCommands.startService(serviceId);
}

function apiCompleteService(serviceId) {
  return ServiceCommands.completeService(serviceId);
}

function apiReportService(serviceId) {
  return ServiceCommands.reportService(serviceId);
}

function apiValidateService(serviceId) {
  return ServiceCommands.validateService(serviceId);
}

function apiFacturarService(serviceId) {
  return ServiceCommands.facturarService(serviceId);
}

function apiCobrarService(serviceId) {
  return ServiceCommands.cobrarService(serviceId);
}

function apiCloseService(serviceId) {
  return ServiceCommands.closeService(serviceId);
}

function apiCerrarComercialmente(serviceId) {
  return ServiceCommands.cerrarComercialmente(serviceId);
}

function apiAdjustRevenue(serviceId, adjustment) {
  return ServiceCommands.adjustRevenue(serviceId, adjustment);
}

function apiAdjustCost(serviceId, adjustment) {
  return ServiceCommands.adjustCost(serviceId, adjustment);
}

function apiConfirmActuals(serviceId) {
  return ServiceCommands.confirmActuals(serviceId);
}

function apiApproveFinancial(serviceId) {
  return ServiceCommands.approveFinancial(serviceId);
}

function apiMarkFacturable(serviceId) {
  return ServiceCommands.markFacturable(serviceId);
}

function apiCalculateService(serviceId) {
  return ServiceCommands.calculateService(serviceId);
}

function apiMoveToConfrontacion(serviceId) {
  return ServiceCommands.moveToConfrontacion(serviceId);
}

function apiMoveToRevision(serviceId) {
  return ServiceCommands.moveToRevision(serviceId);
}
