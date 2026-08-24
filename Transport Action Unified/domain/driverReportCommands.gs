// ============================================================================
// DRIVERREPORTCOMMANDS.GS — Comandos de DriverReport
// ============================================================================

const DriverReportCommands = {
  /**
   * Crear reporte del conductor
   * Precondiciones:
   * - ServiceID válido
   * - DriverID válido
   * - Service.OperationalStatus = 'Realizado'
   * - No existe reporte activo (no locked) para este servicio
   */
  createReport(serviceId, driverId, reportData) {
    return _withLock(() => {
      // 1. Validar servicio (reload inside lock)
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      if (service.OperationalStatus !== 'Realizado') {
        throw new BusinessRuleError(
          `Service must be in 'Realizado' state to submit report. Current: ${service.OperationalStatus}`,
          'DR001'
        );
      }
      if (service.DriverID !== driverId) {
        throw new BusinessRuleError(
          'DriverID does not match service assigned driver',
          'DR001'
        );
      }

      // 2. Verificar que no existe reporte activo
      const existingActive = DriverReportRepository.getActiveByService(serviceId);
      if (existingActive) {
        throw new BusinessRuleError(
          'A report already exists for this service. Submit or reject it first.',
          'DR001'
        );
      }

      // 3. Obtener versión y reporte anterior
      const version = DriverReportRepository.getNextVersion(serviceId);
      const allReports = DriverReportRepository.getAllByVersion(serviceId);
      const previousReport = allReports.length > 0 ? allReports[allReports.length - 1] : null;

      // 4. Crear reporte - GUARDAR DATOS REALES (no calculados)
      const report = DriverReportRepository.create({
        ServiceID: serviceId,
        DriverID: driverId,
        Version: version,
        PreviousReportID: previousReport ? previousReport.ID : '',
        // Datos reales del conductor (actuals)
        StartTime: reportData.startTime || '',
        EndTime: reportData.endTime || '',
        KmTotal: parseFloat(reportData.kmTotal) || 0,
        HasDiaria: reportData.hasDiaria || false,
        IsFestivo: reportData.isFestivo || false,
        IsNotturno: reportData.isNotturno || false,
        DiariaType: reportData.diariaType || 'none',
        // Extras directos (parking, tolls, fuel, wait) - NO kmExtra/hoursExtra calculados
        Parking: parseFloat(reportData.parking) || 0,
        Tolls: parseFloat(reportData.tolls) || 0,
        Fuel: parseFloat(reportData.fuel) || 0,
        WaitMinutes: parseFloat(reportData.waitMinutes) || 0,
        Notes: reportData.notes || ''
      });

      // 5. Actualizar servicio via state machine validation
      _assertValidTransition('ServiceOperational', service.OperationalStatus, 'Reportado');
      ServiceRepository.update(serviceId, {
        OperationalStatus: 'Reportado'
      });

      // 6. Evento
      _dispatchEvent({
        type: 'report.submitted',
        entity: 'DriverReport',
        entityId: report.ID,
        payload: { serviceId, driverId, version }
      });

      return DriverReportRepository.toDTO(report);
    });
  },

  /**
   * Crear reporte para servicio que YA fue reportado (Reportado/Revision) pero no tiene DriverReport.
   * Usado cuando el reporte se recibe por WhatsApp/Backoffice después de que el servicio ya fue avanzado.
   * No cambia el estado del servicio — ya está en Reportado o Revision.
   */
  createReportForReportedService(serviceId, driverId, reportData) {
    return _withLock(() => {
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);
      // Allow services in Realizado, Reportado, or Revision
      const ALLOWED = ['Realizado', 'Reportado', 'Revision'];
      if (!ALLOWED.includes(service.OperationalStatus)) {
        throw new BusinessRuleError(
          `Service must be in Realizado/Reportado/Revision state. Current: ${service.OperationalStatus}`,
          'DR001'
        );
      }
      if (service.DriverID !== driverId) {
        throw new BusinessRuleError(
          'DriverID does not match service assigned driver',
          'DR001'
        );
      }

      // Check no active report exists
      const existingActive = DriverReportRepository.getActiveByService(serviceId);
      if (existingActive) {
        throw new BusinessRuleError(
          'A report already exists for this service. Submit or reject it first.',
          'DR001'
        );
      }

      const version = DriverReportRepository.getNextVersion(serviceId);
      const allReports = DriverReportRepository.getAllByVersion(serviceId);
      const previousReport = allReports.length > 0 ? allReports[allReports.length - 1] : null;

      const report = DriverReportRepository.create({
        ServiceID: serviceId,
        DriverID: driverId,
        Version: version,
        PreviousReportID: previousReport ? previousReport.ID : '',
        StartTime: reportData.startTime || '',
        EndTime: reportData.endTime || '',
        KmTotal: parseFloat(reportData.kmTotal) || 0,
        HasDiaria: reportData.hasDiaria || false,
        IsFestivo: reportData.isFestivo || false,
        IsNotturno: reportData.isNotturno || false,
        DiariaType: reportData.diariaType || 'none',
        Parking: parseFloat(reportData.parking) || 0,
        Tolls: parseFloat(reportData.tolls) || 0,
        Fuel: parseFloat(reportData.fuel) || 0,
        WaitMinutes: parseFloat(reportData.waitMinutes) || 0,
        Notes: reportData.notes || ''
      });

      // If service is in Realizado, advance to Reportado
      if (service.OperationalStatus === 'Realizado') {
        _assertValidTransition('ServiceOperational', 'Realizado', 'Reportado');
        ServiceRepository.update(serviceId, { OperationalStatus: 'Reportado' });
      }
      // If already Reportado or Revision, leave as-is — report is now linked

      _dispatchEvent({
        type: 'report.submitted',
        entity: 'DriverReport',
        entityId: report.ID,
        payload: { serviceId, driverId, version }
      });

      return DriverReportRepository.toDTO(report);
    });
  },

  /**
   * Aprobar reporte
   * Precondiciones:
   * - ReportStatus = 'Pendiente'
   * - Locked = false
   */
  approveReport(reportId) {
    return _withLock(() => {
      const report = DriverReportRepository.getById(reportId);
      if (!report) throw new NotFoundError('DriverReport', reportId);
      if (report.Status !== 'Pendiente') {
        throw new BusinessRuleError(
          `Report must be in 'Pendiente' state to approve. Current: ${report.Status}`,
          'DR002'
        );
      }
      if (report.Locked === 'true' || report.Locked === true) {
        throw new BusinessRuleError('Report is already locked', 'DR002');
      }

      const serviceId = report.ServiceID;
      const driverId = report.DriverID;
      const service = ServiceRepository.getById(serviceId);
      if (!service) throw new NotFoundError('Service', serviceId);

      // 1. Preparar driverReport object para cálculos económicos
      const driverReportData = {
        startTime: report.StartTime,
        endTime: report.EndTime,
        kmTotal: parseFloat(report.KmTotal) || 0,
        hasDiaria: report.HasDiaria === 'true' || report.HasDiaria === true,
        isFestivo: report.IsFestivo === 'true' || report.IsFestivo === true,
        isNotturno: report.IsNotturno === 'true' || report.IsNotturno === true,
        diariaType: report.DiariaType || 'none',
        parking: parseFloat(report.Parking) || 0,
        tolls: parseFloat(report.Tolls) || 0,
        fuel: parseFloat(report.Fuel) || 0,
        waitMinutes: parseFloat(report.WaitMinutes) || 0
      };

      // 2. CALCULAR REVENUE BREAKDOWN — abort on failure (atomic)
      ServiceEconomics.applyRevenueBreakdown(serviceId, driverReportData);

      // 3. CALCULAR COST BREAKDOWN — abort on failure (atomic)
      ServiceEconomics.applyCostBreakdown(serviceId, driverReportData);

      // 4. CREAR/ACTUALIZAR RECONCILIATION — abort on failure (atomic)
      let reconciliation = ReconciliationCommands.createOrUpdate(serviceId);

      // 5. AUTO-RESOLVER si producción y conductor coinciden
      const autoResolved = ReconciliationCommands.autoResolveIfMatch(serviceId);
      if (autoResolved) {
        reconciliation = autoResolved;
      }

      // 6. Lockear reportes anteriores del mismo servicio
      const allReports = DriverReportRepository.getAllByVersion(serviceId);
      allReports.forEach(r => {
        if (r.ID !== reportId && (r.Locked !== 'true' && r.Locked !== true)) {
          DriverReportRepository.update(r.ID, { Locked: true });
        }
      });

      // 7. Actualizar Service via ServiceCommands (state machine + lock + events)
      const resolved = reconciliation && reconciliation.Status === 'Resuelto';

      // 7a. Financial transitions via ServiceCommands
      if (service.FinancialStatus === 'Pendiente') {
        ServiceCommands.calculateService(serviceId); // Pendiente → Calculado
      }
      if (resolved) {
        ServiceCommands.confirmActuals(serviceId); // Calculado/Confrontacion → ActualsConfirmados
      } else {
        ServiceCommands.moveToConfrontacion(serviceId); // Calculado → Confrontacion
      }

      // 7b. Operational transitions via ServiceCommands
      if (resolved) {
        ServiceCommands.validateService(serviceId); // Reportado → Validado + freeze breakdowns
      } else {
        ServiceCommands.moveToRevision(serviceId); // Reportado → Revision
      }

      // 8. Actualizar reporte — COMMITTED LAST (after all dependents succeed)
      DriverReportRepository.update(reportId, {
        Status: 'Aceptado',
        ApprovedBy: _getActiveUser() || 'system',
        ApprovedDate: new Date().toISOString(),
        Locked: true
      });

      // 9. Evento
      _dispatchEvent({
        type: 'report.approved',
        entity: 'DriverReport',
        entityId: reportId,
        payload: { serviceId, driverId }
      });

      return DriverReportRepository.toDTO(DriverReportRepository.getById(reportId));
    });
  },

  /**
   * Rechazar reporte
   * Precondiciones:
   * - ReportStatus = 'Pendiente'
   * - Locked = false
   */
  rejectReport(reportId, reason) {
    return _withLock(() => {
      const report = DriverReportRepository.getById(reportId);
      if (!report) throw new NotFoundError('DriverReport', reportId);
      if (report.Status !== 'Pendiente') {
        throw new BusinessRuleError(
          `Report must be in 'Pendiente' state to reject. Current: ${report.Status}`,
          'DR003'
        );
      }
      if (!reason) {
        throw new ValidationError('Rejection reason is required');
      }

      // 1. Actualizar reporte
      DriverReportRepository.update(reportId, {
        Status: 'Rechazado',
        RejectedReason: reason,
        Locked: true
      });

      // 2. Evento
      _dispatchEvent({
        type: 'report.rejected',
        entity: 'DriverReport',
        entityId: reportId,
        payload: { serviceId: report.ServiceID, reason }
      });

      return DriverReportRepository.toDTO(DriverReportRepository.getById(reportId));
    });
  }
};

// ============================================================================
// API endpoints — Commands
// ============================================================================

function apiCreateDriverReport(serviceId, driverId, reportData) {
  return DriverReportCommands.createReport(serviceId, driverId, reportData);
}

function apiApproveDriverReport(reportId) {
  return DriverReportCommands.approveReport(reportId);
}

function apiRejectDriverReport(reportId, reason) {
  return DriverReportCommands.rejectReport(reportId, reason);
}

/**
 * Link an orphaned DriverReport to a service.
 * Used when a report was created without a serviceId (e.g., old WhatsApp captures).
 */
function apiLinkReportToService(reportId, serviceId) {
  return _withLock(() => {
    var report = DriverReportRepository.getById(reportId);
    if (!report) return { success: false, error: 'Report not found' };
    var service = ServiceRepository.getById(serviceId);
    if (!service) return { success: false, error: 'Service not found' };
    DriverReportRepository.update(reportId, { ServiceID: serviceId });
    return { success: true, reportId: reportId, serviceId: serviceId };
  });
}

// NOTE: apiGetDriverReports is defined in driverReport.gs (canonical definition)
