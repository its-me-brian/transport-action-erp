// ============================================================================
// RECONCILIATION.GS — Entidad Reconciliation (confrontación producción ↔ conductor)
// ============================================================================

const ReconciliationRepository = {
  SHEET: SHEETS.Reconciliation,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByService(serviceId) {
    const items = _find(this.SHEET, row => row.ServiceID === serviceId);
    return items.length > 0 ? items[0] : null; // Solo una reconciliation por servicio
  },

  getByProject(projectId) {
    return _find(this.SHEET, row => row.ProjectID === projectId);
  },

  getPending(company) {
    let items = _find(this.SHEET, row => row.Status === 'Pendiente' || row.Status === 'EnProceso');
    if (company) {
      // Filtrar por company a través del service
      const services = ServiceRepository.getByCompany(company);
      const serviceIds = services.map(s => s.ID);
      items = items.filter(r => serviceIds.includes(r.ServiceID));
    }
    return items;
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      ServiceID: data.ServiceID || '',
      ProjectID: data.ProjectID || '',
      // Valores reportados por producción
      ProductionStartTime: data.ProductionStartTime || '',
      ProductionEndTime: data.ProductionEndTime || '',
      ProductionKm: data.ProductionKm || 0,
      ProductionDiaria: data.ProductionDiaria || 'none',
      ProductionFestivo: data.ProductionFestivo || false,
      ProductionNotturno: data.ProductionNotturno || false,
      // Valores reportados por conductor/proveedor
      DriverStartTime: data.DriverStartTime || '',
      DriverEndTime: data.DriverEndTime || '',
      DriverKm: data.DriverKm || 0,
      DriverDiaria: data.DriverDiaria || 'none',
      DriverFestivo: data.DriverFestivo || false,
      DriverNotturno: data.DriverNotturno || false,
      // Valores finales aceptados (tras confrontación)
      FinalStartTime: data.FinalStartTime || '',
      FinalEndTime: data.FinalEndTime || '',
      FinalKm: data.FinalKm || 0,
      FinalDiaria: data.FinalDiaria || 'none',
      FinalFestivo: data.FinalFestivo || false,
      FinalNotturno: data.FinalNotturno || false,
      // Metadatos
      Status: 'Pendiente', // Pendiente, EnProceso, Resuelto
      ResolvedBy: data.ResolvedBy || '',
      ResolvedAt: '',
      ResolutionNotes: data.ResolutionNotes || '',
      CreatedAt: now,
      UpdatedAt: now
    });
  },

  update(id, changes) {
    changes.UpdatedAt = new Date().toISOString();
    if (changes.Status === 'Resuelto' && !changes.ResolvedAt) {
      changes.ResolvedAt = new Date().toISOString();
      changes.ResolvedBy = changes.ResolvedBy || _getActiveUser() || 'system';
    }
    return _update(this.SHEET, id, changes);
  },

  resolve(id, resolution, resolvedBy) {
    return this.update(id, {
      Status: 'Resuelto',
      FinalStartTime: resolution.FinalStartTime || '',
      FinalEndTime: resolution.FinalEndTime || '',
      FinalKm: resolution.FinalKm || 0,
      FinalDiaria: _normalizeDiariaType(resolution.FinalDiaria),
      FinalFestivo: resolution.FinalFestivo || false,
      FinalNotturno: resolution.FinalNotturno || false,
      ResolvedBy: resolvedBy || _getActiveUser() || 'system',
      ResolutionNotes: resolution.Notes || ''
    });
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      serviceId: entity.ServiceID,
      projectId: entity.ProjectID,
      production: {
        startTime: _normalizeTimeToHHMM(entity.ProductionStartTime),
        endTime: _normalizeTimeToHHMM(entity.ProductionEndTime),
        km: parseFloat(entity.ProductionKm) || 0,
        diaria: _normalizeDiariaType(entity.ProductionDiaria),
        festivo: entity.ProductionFestivo === 'true' || entity.ProductionFestivo === true,
        notturno: entity.ProductionNotturno === 'true' || entity.ProductionNotturno === true
      },
      driver: {
        startTime: _normalizeTimeToHHMM(entity.DriverStartTime),
        endTime: _normalizeTimeToHHMM(entity.DriverEndTime),
        km: parseFloat(entity.DriverKm) || 0,
        diaria: _normalizeDiariaType(entity.DriverDiaria),
        festivo: entity.DriverFestivo === 'true' || entity.DriverFestivo === true,
        notturno: entity.DriverNotturno === 'true' || entity.DriverNotturno === true
      },
      final: {
        startTime: _normalizeTimeToHHMM(entity.FinalStartTime),
        endTime: _normalizeTimeToHHMM(entity.FinalEndTime),
        km: parseFloat(entity.FinalKm) || 0,
        diaria: _normalizeDiariaType(entity.FinalDiaria),
        festivo: entity.FinalFestivo === 'true' || entity.FinalFestivo === true,
        notturno: entity.FinalNotturno === 'true' || entity.FinalNotturno === true
      },
      status: entity.Status,
      resolvedBy: entity.ResolvedBy,
      resolvedAt: entity.ResolvedAt,
      resolutionNotes: entity.ResolutionNotes,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// RECONCILIATION COMMANDS
// ============================================================================

const ReconciliationCommands = {
  /**
   * Crear/actualizar reconciliation para un servicio
   * Se llama cuando se aprueba un DriverReport y hay datos de producción
   */
  createOrUpdate(serviceId) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);

    // Production data: always from TransportList planned data (service.Time)
    // StartTime/EndTime/KmTotal on Service are set ONLY by reconciliation resolution
    // (not by DriverReport approval) to avoid self-comparison
    const productionData = {
      ProductionStartTime: service.Time || '',
      ProductionEndTime: '',
      ProductionKm: 0,
      ProductionDiaria: _normalizeDiariaType(service.DiariaType),
      ProductionFestivo: service.IsFestivo === 'true' || service.IsFestivo === true,
      ProductionNotturno: service.IsNotturno === 'true' || service.IsNotturno === true
    };

    // Obtener datos del conductor (DriverReport aprobado)
    const driverReport = DriverReportRepository.getActiveByService(serviceId);
    let driverData = {
      DriverStartTime: '',
      DriverEndTime: '',
      DriverKm: 0,
      DriverDiaria: 'none',
      DriverFestivo: false,
      DriverNotturno: false
    };

    if (driverReport) {
      driverData = {
        DriverStartTime: driverReport.StartTime || '',
        DriverEndTime: driverReport.EndTime || '',
        DriverKm: parseFloat(driverReport.KmTotal) || 0,
        DriverDiaria: driverReport.DiariaType || 'none',
        DriverFestivo: driverReport.IsFestivo === 'true' || driverReport.IsFestivo === true,
        DriverNotturno: driverReport.IsNotturno === 'true' || driverReport.IsNotturno === true
      };
    }

    // Verificar si ya existe reconciliation
    let reconciliation = ReconciliationRepository.getByService(serviceId);
    const data = {
      ServiceID: serviceId,
      ProjectID: service.ProjectID,
      ...productionData,
      ...driverData
    };

    if (reconciliation) {
      // Actualizar solo campos de producción/conductor (no final/resolved)
      ReconciliationRepository.update(reconciliation.ID, data);
      return ReconciliationRepository.toDTO(ReconciliationRepository.getById(reconciliation.ID));
    } else {
      reconciliation = ReconciliationRepository.create(data);
      _dispatchEvent({
        type: 'reconciliation.created',
        entity: 'Reconciliation',
        entityId: reconciliation.ID,
        payload: { serviceId }
      });
      return ReconciliationRepository.toDTO(reconciliation);
    }
    });
  },

  /**
   * Resolver confrontation - el coordinador decide valores finales
   */
  resolve(reconciliationId, resolution) {
    return _withLock(() => {
      const reconciliation = ReconciliationRepository.getById(reconciliationId);
      if (!reconciliation) throw new NotFoundError('Reconciliation', reconciliationId);

      const resolved = ReconciliationRepository.resolve(reconciliationId, resolution, _getActiveUser());

      // Actualizar Service con valores finales
      const service = ServiceRepository.getById(reconciliation.ServiceID);
      if (service) {
        const updates = {};
        if (resolution.FinalStartTime) updates.StartTime = resolution.FinalStartTime;
        if (resolution.FinalEndTime) updates.EndTime = resolution.FinalEndTime;
        if (resolution.FinalKm) updates.KmTotal = resolution.FinalKm;
        if (resolution.FinalDiaria) updates.DiariaType = _normalizeDiariaType(resolution.FinalDiaria);
        if (resolution.FinalFestivo !== undefined) updates.IsFestivo = resolution.FinalFestivo;
        if (resolution.FinalNotturno !== undefined) updates.IsNotturno = resolution.FinalNotturno;

        // Recalcular economics con valores finales
        const finalDriverReport = {
          startTime: resolution.FinalStartTime,
          endTime: resolution.FinalEndTime,
          kmTotal: parseFloat(resolution.FinalKm) || 0,
          hasDiaria: resolution.FinalDiaria !== 'none',
          isFestivo: resolution.FinalFestivo || false,
          isNotturno: resolution.FinalNotturno || false,
          diariaType: resolution.FinalDiaria || 'none'
        };

        try {
          // Recalcular ambos breakdowns
          ServiceEconomics.applyRevenueBreakdown(service.ID, finalDriverReport);
          ServiceEconomics.applyCostBreakdown(service.ID, finalDriverReport);
        } catch (e) {
          Logger.log('Recalc error on resolve: ' + e.message);
        }

        // Apply non-status field updates first
        if (Object.keys(updates).length > 0) {
          ServiceRepository.update(service.ID, updates);
        }
        
        // Use ServiceCommands for state transitions (validation + lock + events)
        // OperationalStatus: Revision → Validado (freeze breakdowns)
        try {
          ServiceCommands.validateService(service.ID);
        } catch (e) {
          Logger.log('[resolve] validateService skipped: ' + e.message + ' (service may not be in Revision state)');
        }
        
        // FinancialStatus: Confrontacion → ActualsConfirmados
        if (service.FinancialStatus === 'Confrontacion') {
          try {
            ServiceCommands.confirmActuals(service.ID);
          } catch (e) {
            Logger.log('[resolve] confirmActuals skipped: ' + e.message);
          }
        }
      }

      _dispatchEvent({
        type: 'reconciliation.resolved',
        entity: 'Reconciliation',
        entityId: reconciliationId,
        payload: { serviceId: reconciliation.ServiceID }
      });

      return ReconciliationRepository.toDTO(ReconciliationRepository.getById(reconciliationId));
    });
  },

  /**
   * Auto-resolver reconciliation — always resolves when driverData is provided (from approveReport),
   * or falls back to matching logic when called without driverData.
   */
  autoResolveIfMatch(serviceId, driverData) {
    const reconciliation = ReconciliationRepository.getByService(serviceId);
    if (!reconciliation || reconciliation.Status === 'Resuelto') return null;

    // If driverData is provided (from approveReport), ALWAYS resolve with driver values as final
    if (driverData) {
      return this.resolve(reconciliation.ID, {
        FinalStartTime: driverData.startTime || reconciliation.DriverStartTime,
        FinalEndTime: driverData.endTime || reconciliation.DriverEndTime,
        FinalKm: driverData.kmTotal !== undefined ? driverData.kmTotal : reconciliation.DriverKm,
        FinalDiaria: driverData.diariaType || reconciliation.DriverDiaria || 'none',
        FinalFestivo: driverData.isFestivo !== undefined ? driverData.isFestivo : reconciliation.DriverFestivo,
        FinalNotturno: driverData.isNotturno !== undefined ? driverData.isNotturno : reconciliation.DriverNotturno,
        Notes: 'Auto-resolved: driver data loaded'
      });
    }

    // Fallback: match production vs driver values (when called without driverData)
    function _normTime(t) {
      if (!t) return '';
      var str = String(t).trim();
      var m = str.match(/(\d{1,2})[.:,](\d{1,2})/);
      if (m) return (m[1].length === 1 ? '0' : '') + m[1] + ':' + (m[2].length === 1 ? '0' : '') + m[2];
      var h = str.match(/^(\d{1,2})$/);
      if (h) return (h[1].length === 1 ? '0' : '') + h[1] + ':00';
      return str;
    }
    
    const match = 
      _normTime(reconciliation.ProductionStartTime) === _normTime(reconciliation.DriverStartTime) &&
      _normTime(reconciliation.ProductionEndTime) === _normTime(reconciliation.DriverEndTime) &&
      parseFloat(reconciliation.ProductionKm) === parseFloat(reconciliation.DriverKm) &&
      reconciliation.ProductionDiaria === reconciliation.DriverDiaria &&
      reconciliation.ProductionFestivo === reconciliation.DriverFestivo &&
      reconciliation.ProductionNotturno === reconciliation.DriverNotturno;

    if (match) {
      return this.resolve(reconciliation.ID, {
        FinalStartTime: reconciliation.ProductionStartTime,
        FinalEndTime: reconciliation.ProductionEndTime,
        FinalKm: reconciliation.ProductionKm,
        FinalDiaria: reconciliation.ProductionDiaria,
        FinalFestivo: reconciliation.ProductionFestivo,
        FinalNotturno: reconciliation.ProductionNotturno,
        Notes: 'Auto-resolved: perfect match'
      });
    }

    return null;
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetReconciliations(filters) {
  let items = ReconciliationRepository.getAll();
  if (filters) {
    if (filters.projectId) items = items.filter(r => r.ProjectID === filters.projectId);
    if (filters.serviceId) items = items.filter(r => r.ServiceID === filters.serviceId);
    if (filters.status) items = items.filter(r => r.Status === filters.status);
    if (filters.company) {
      const services = ServiceRepository.getByCompany(filters.company);
      const serviceIds = services.map(s => s.ID);
      items = items.filter(r => serviceIds.includes(r.ServiceID));
    }
  }
  return items.map(ReconciliationRepository.toDTO);
}

function apiGetReconciliation(id) {
  const entity = ReconciliationRepository.getById(id);
  if (!entity) throw new NotFoundError('Reconciliation', id);
  return ReconciliationRepository.toDTO(entity);
}

function apiGetReconciliationByService(serviceId) {
  const entity = ReconciliationRepository.getByService(serviceId);
  return entity ? ReconciliationRepository.toDTO(entity) : null;
}

function apiCreateOrUpdateReconciliation(serviceId) {
  return ReconciliationCommands.createOrUpdate(serviceId);
}

function apiResolveReconciliation(reconciliationId, resolution) {
  return ReconciliationCommands.resolve(reconciliationId, resolution);
}

function apiAutoResolveReconciliation(serviceId) {
  return ReconciliationCommands.autoResolveIfMatch(serviceId);
}

function apiCreateReconciliation(serviceId) {
  return ReconciliationCommands.createOrUpdate(serviceId);
}

function apiGetPendingReconciliations(company) {
  return ReconciliationRepository.getPending(company).map(ReconciliationRepository.toDTO);
}