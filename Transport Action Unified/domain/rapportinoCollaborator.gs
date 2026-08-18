// ============================================================================
// RAPPORTINOCOLLABORATOR.GS — Rapportino agrupado por colaborador (múltiples drivers)
// ============================================================================

const RapportinoCollaboratorRepository = {
  SHEET: SHEETS.RapportinoCollaborators,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getAllByProject(projectId) {
    return _find(this.SHEET, row => row.ProjectID === projectId);
  },

  getAllByCollaborator(collaboratorId) {
    return _find(this.SHEET, row => row.CollaboratorID === collaboratorId);
  },

  getBorradorByProjectCollaborator(projectId, collaboratorId, periodStart, periodEnd, periodType) {
    const items = _find(this.SHEET, row =>
      row.ProjectID === projectId &&
      row.CollaboratorID === collaboratorId &&
      row.PeriodType === (periodType || 'weekly') &&
      row.PeriodStart === periodStart &&
      row.PeriodEnd === periodEnd &&
      row.Status === 'Borrador'
    );
    return items.length > 0 ? items[0] : null;
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      ProjectID: data.ProjectID || '',
      CollaboratorID: data.CollaboratorID || '',
      PeriodType: data.PeriodType || 'weekly',
      PeriodStart: data.PeriodStart || '',
      PeriodEnd: data.PeriodEnd || '',
      Status: 'Borrador',
      Notes: data.Notes || '',
      CreatedBy: _getActiveUser(),
      CreatedAt: now,
      UpdatedAt: now,
      SentAt: '',
      AcceptedAt: '',
      PaidAt: ''
    });
  },

  update(id, changes) {
    changes.UpdatedAt = new Date().toISOString();
    return _update(this.SHEET, id, changes);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      projectId: entity.ProjectID,
      collaboratorId: entity.CollaboratorID,
      periodType: entity.PeriodType,
      periodStart: entity.PeriodStart,
      periodEnd: entity.PeriodEnd,
      status: entity.Status,
      notes: entity.Notes,
      createdBy: entity.CreatedBy,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt,
      sentAt: entity.SentAt,
      acceptedAt: entity.AcceptedAt,
      paidAt: entity.PaidAt
    };
  }
};

// ============================================================================
// RAPPORTINOCOLLABORATOR ITEMS
// ============================================================================

const RapportinoCollaboratorItemRepository = {
  SHEET: SHEETS.RapportinoCollaboratorItems,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByRapportinoCollaborator(rapportinoId) {
    return _find(this.SHEET, row => row.RapportinoCollaboratorID === rapportinoId);
  },

  getByService(serviceId) {
    return _find(this.SHEET, row => row.ServiceID === serviceId);
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      RapportinoCollaboratorID: data.RapportinoCollaboratorID || '',
      ServiceID: data.ServiceID || '',
      DriverID: data.DriverID || '',
      Amount: parseFloat(data.Amount) || 0,
      LockedAmount: 0,
      CreatedAt: now
    });
  },

  update(id, changes) {
    return _update(this.SHEET, id, changes);
  },

  delete(id) {
    return _delete(this.SHEET, id);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      rapportinoCollaboratorId: entity.RapportinoCollaboratorID,
      serviceId: entity.ServiceID,
      driverId: entity.DriverID,
      amount: parseFloat(entity.Amount) || 0,
      lockedAmount: parseFloat(entity.LockedAmount) || 0,
      createdAt: entity.CreatedAt
    };
  }
};

// ============================================================================
// COMMANDS
// ============================================================================

const RapportinoCollaboratorCommands = {
  /**
   * Crear rapportino colaborador
   * Precondiciones:
   * - ProjectID y CollaboratorID válidos
   * - No existe borrador para mismo Project+Collaborator+Period
   */
  create(projectId, collaboratorId, periodStart, periodEnd, periodType) {
    return _withLock(() => {
      var project = ProjectRepository.getById(projectId);
      if (!project) throw new NotFoundError('Project', projectId);
      if (project.Status === 'Archiviato') {
        throw new BusinessRuleError('Cannot create rapportinos in archived project', 'EDGE005');
      }

      var collaborator = CollaboratorRepository.getById(collaboratorId);
      if (!collaborator) throw new NotFoundError('Collaborator', collaboratorId);

      periodType = periodType || 'weekly';
      if (ENUMS.RapportinoPeriodType.indexOf(periodType) === -1) {
        throw new BusinessRuleError('Invalid period type: ' + periodType, 'RC010');
      }
      if (!periodStart || !periodEnd) {
        throw new BusinessRuleError('PeriodStart and PeriodEnd are required', 'RC011');
      }
      if (new Date(periodStart) > new Date(periodEnd)) {
        throw new BusinessRuleError('PeriodStart must be before PeriodEnd', 'RC011');
      }

      const existing = RapportinoCollaboratorRepository.getBorradorByProjectCollaborator(
        projectId, collaboratorId, periodStart, periodEnd, periodType
      );
      if (existing) {
        throw new BusinessRuleError(
          'A draft rapportino already exists for this project/collaborator/period',
          'RC010'
        );
      }

      const rapportino = RapportinoCollaboratorRepository.create({
        ProjectID: projectId,
        CollaboratorID: collaboratorId,
        PeriodType: periodType,
        PeriodStart: periodStart,
        PeriodEnd: periodEnd
      });

      _dispatchEvent({
        type: 'rapportino_collaborator.created',
        entity: 'RapportinoCollaborator',
        entityId: rapportino.ID
      });

      return RapportinoCollaboratorRepository.toDTO(rapportino);
    });
  },

  /**
   * Agregar servicio al rapportino de colaborador
   * Calcula el coste desde ServiceCostBreakdown (lado proveedor)
   */
  addService(rapportinoId, serviceId) {
    return _withLock(() => {
      const rapportino = RapportinoCollaboratorRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoCollaborator', rapportinoId);
      if (rapportino.Status !== 'Borrador') {
        throw new BusinessRuleError('Can only add services to draft rapportinos', 'RC012');
      }

      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      if (service.OperationalStatus !== 'Validado') {
        throw new BusinessRuleError('Service must be validated to add to rapportino', 'RC012');
      }

      // Verificar que el servicio pertenece a un driver del colaborador
      const collaboratorDrivers = DriverRepository.getAll()
        .filter(d => d.CollaboratorID === rapportino.CollaboratorID);
      const collaboratorDriverIds = collaboratorDrivers.map(d => d.ID);
      if (collaboratorDriverIds.indexOf(service.DriverID) === -1) {
        throw new BusinessRuleError('Service driver is not part of this collaborator', 'RC012');
      }

      // Verificar duplicados
      const existingItems = RapportinoCollaboratorItemRepository.getByRapportinoCollaborator(rapportinoId);
      if (existingItems.some(i => i.ServiceID === serviceId)) {
        throw new BusinessRuleError('Service is already in this rapportino', 'RC012');
      }
      const otherRapportinos = RapportinoCollaboratorItemRepository.getByService(serviceId)
        .filter(i => i.RapportinoCollaboratorID !== rapportinoId);
      if (otherRapportinos.length > 0) {
        throw new BusinessRuleError('Service is already assigned to another rapportino', 'RC012');
      }

      // Coste desde ServiceCostBreakdown (lado proveedor)
      const costItems = ServiceCostBreakdownRepository.getByService(serviceId);
      if (costItems.length === 0) {
        throw new BusinessRuleError('Service has no cost breakdown — cannot add to rapportino', 'RC012');
      }
      const hasUnlockedAutomatic = costItems.some(i =>
        (i.Source === 'driver_rate' || i.Source === 'driver_report') &&
        (i.Locked !== 'true' && i.Locked !== true)
      );
      if (hasUnlockedAutomatic) {
        throw new BusinessRuleError('Service has unlocked automatic cost items — validate service first', 'RC012');
      }
      const totalCost = costItems.reduce((sum, item) => sum + (parseFloat(item.Amount) || 0), 0);

      RapportinoCollaboratorItemRepository.create({
        RapportinoCollaboratorID: rapportinoId,
        ServiceID: serviceId,
        DriverID: service.DriverID,
        Amount: totalCost
      });

      return RapportinoCollaboratorRepository.toDTO(
        RapportinoCollaboratorRepository.getById(rapportinoId)
      );
    });
  },

  /**
   * Enviar rapportino colaborador (Revisado → Enviado)
   */
  send(rapportinoId) {
    return _withLock(() => {
      const rapportino = RapportinoCollaboratorRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoCollaborator', rapportinoId);
      _assertValidTransition('RapportinoCollaborator', rapportino.Status, 'Enviado');
      const items = RapportinoCollaboratorItemRepository.getByRapportinoCollaborator(rapportinoId);
      if (items.length === 0) {
        throw new BusinessRuleError('Cannot send empty rapportino', 'RC013');
      }

      RapportinoCollaboratorRepository.update(rapportinoId, {
        Status: 'Enviado',
        SentAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'rapportino_collaborator.sent',
        entity: 'RapportinoCollaborator',
        entityId: rapportinoId
      });

      return RapportinoCollaboratorRepository.toDTO(
        RapportinoCollaboratorRepository.getById(rapportinoId)
      );
    });
  },

  /**
   * Aceptar rapportino colaborador (Enviado → Aceptado)
   */
  accept(rapportinoId) {
    return _withLock(() => {
      const rapportino = RapportinoCollaboratorRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoCollaborator', rapportinoId);
      _assertValidTransition('RapportinoCollaborator', rapportino.Status, 'Aceptado');

      RapportinoCollaboratorRepository.update(rapportinoId, {
        Status: 'Aceptado',
        AcceptedAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'rapportino_collaborator.accepted',
        entity: 'RapportinoCollaborator',
        entityId: rapportinoId
      });

      return RapportinoCollaboratorRepository.toDTO(
        RapportinoCollaboratorRepository.getById(rapportinoId)
      );
    });
  },

  /**
   * Pagar rapportino colaborador (Aceptado → Pagado)
   * Crea DriverAdvance para cada driver del colaborador en el período
   * Crea Payment record para trazabilidad del pago al collaborator
   */
  pay(rapportinoId, amount, paymentData) {
    return _withLock(() => {
      const rapportino = RapportinoCollaboratorRepository.getById(rapportinoId);
      if (!rapportino) throw new NotFoundError('RapportinoCollaborator', rapportinoId);
      _assertValidTransition('RapportinoCollaborator', rapportino.Status, 'Pagado');

      const items = RapportinoCollaboratorItemRepository.getByRapportinoCollaborator(rapportinoId);
      const total = items.reduce((sum, item) => sum + (parseFloat(item.Amount) || 0), 0);
      const paymentAmount = amount || total;

      // Agrupar por driver y crear DriverAdvances
      const byDriver = {};
      items.forEach(item => {
        if (!item.DriverID) return;
        byDriver[item.DriverID] = (byDriver[item.DriverID] || 0) + (parseFloat(item.Amount) || 0);
      });

      Object.keys(byDriver).forEach(driverId => {
        DriverAdvanceRepository.create({
          DriverID: driverId,
          ProjectID: rapportino.ProjectID,
          Amount: byDriver[driverId],
          Notes: `Rapportino colaborador ${rapportinoId} payment`
        });
      });

      // Create Payment record for collaborator payment tracking
      var collaborator = CollaboratorRepository.getById(rapportino.CollaboratorID);
      var paymentMethod = (paymentData && paymentData.PaymentMethod) || 'transfer';
      var paymentRecord = PaymentRepository.create({
        InvoiceID: '',
        ClientID: '',
        Amount: paymentAmount,
        PaymentMethod: paymentMethod,
        PaymentDate: (paymentData && paymentData.PaymentDate) || new Date().toISOString(),
        Reference: 'RapportinoCollab-' + rapportinoId,
        Notes: 'Payment to collaborator ' + (collaborator ? collaborator.Name : rapportino.CollaboratorID) + ' — ' + rapportino.PeriodStart + ' to ' + rapportino.PeriodEnd,
        CashReceivedBy: (paymentData && paymentData.CashReceivedBy) || '',
        CashDate: (paymentData && paymentData.CashDate) || '',
        CashReference: (paymentData && paymentData.CashReference) || ''
      });

      RapportinoCollaboratorRepository.update(rapportinoId, {
        Status: 'Pagado',
        PaidAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'rapportino_collaborator.pagado',
        entity: 'RapportinoCollaborator',
        entityId: rapportinoId,
        payload: { amount: paymentAmount, paymentId: paymentRecord.ID }
      });

      return RapportinoCollaboratorRepository.toDTO(
        RapportinoCollaboratorRepository.getById(rapportinoId)
      );
    });
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetRapportinoCollaborators(filters) {
  let items = RapportinoCollaboratorRepository.getAll();
  if (filters) {
    if (filters.projectId) items = items.filter(i => i.ProjectID === filters.projectId);
    if (filters.collaboratorId) items = items.filter(i => i.CollaboratorID === filters.collaboratorId);
    if (filters.status) items = items.filter(i => i.Status === filters.status);
    // Date range filter: period must overlap with filter range
    if (filters.dateFrom) items = items.filter(i => !i.PeriodEnd || i.PeriodEnd >= filters.dateFrom);
    if (filters.dateTo) items = items.filter(i => !i.PeriodStart || i.PeriodStart <= filters.dateTo);
  }
  return items.map(RapportinoCollaboratorRepository.toDTO);
}

function apiGetRapportinoCollaborator(id) {
  const entity = RapportinoCollaboratorRepository.getById(id);
  if (!entity) throw new NotFoundError('RapportinoCollaborator', id);
  return RapportinoCollaboratorRepository.toDTO(entity);
}

function apiGetRapportinoCollaboratorItems(rapportinoId) {
  return RapportinoCollaboratorItemRepository.getByRapportinoCollaborator(rapportinoId)
    .map(RapportinoCollaboratorItemRepository.toDTO);
}

function apiCreateRapportinoCollaborator(projectId, collaboratorId, periodStart, periodEnd, periodType) {
  return RapportinoCollaboratorCommands.create(projectId, collaboratorId, periodStart, periodEnd, periodType);
}

function apiAddServiceToRapportinoCollaborator(rapportinoId, serviceId) {
  return RapportinoCollaboratorCommands.addService(rapportinoId, serviceId);
}

function apiSendRapportinoCollaborator(rapportinoId) {
  return RapportinoCollaboratorCommands.send(rapportinoId);
}

function apiAcceptRapportinoCollaborator(rapportinoId) {
  return RapportinoCollaboratorCommands.accept(rapportinoId);
}

function apiPayRapportinoCollaborator(rapportinoId, amount, paymentData) {
  return RapportinoCollaboratorCommands.pay(rapportinoId, amount, paymentData);
}