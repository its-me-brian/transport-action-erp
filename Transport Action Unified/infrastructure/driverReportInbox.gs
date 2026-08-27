// ============================================================================
// DRIVERREPORTINBOX.GS — Capa unificada de captura de reportes (FASE 15C)
// ============================================================================
// Captura reportes desde 3 canales: WhatsApp, DriverLink, Backoffice
// Pipeline: CAPTURED -> NORMALIZED -> PENDING_REVIEW -> ACCEPTED | REJECTED | LOCKED
//
// Cada reporte en inbox tiene:
// - Source: identifica el origen (whatsapp, driverlink, backoffice)
// - Channel: canal especifico dentro del source
// - RawData: datos crudos capturados
// - NormalizedData: datos normalizados despues del parser
// - CorrelationID: ID para trazabilidad cruzada entre sistemas

// ============================================================================
// CAPTURE — Unified entry point from all channels
// ============================================================================

/**
 * Captura un reporte en el inbox desde cualquier canal.
 * Estado inicial: CAPTURED.
 *
 * @param {string} source - Origen: 'whatsapp' | 'driverlink' | 'backoffice'
 * @param {string} channel - Canal especifico: 'web_form' | 'api' | 'manual' | 'parser'
 * @param {string} driverId - ID del conductor
 * @param {string} projectId - ID del proyecto
 * @param {string} serviceDate - Fecha del servicio (YYYY-MM-DD)
 * @param {Object} rawData - Datos crudos capturados
 * @returns {Object} { success, inboxId, correlationId }
 */
function captureReport(source, channel, driverId, projectId, serviceDate, rawData) {
  try {
    if (!source || !driverId || !projectId || !serviceDate) {
      return { success: false, error: 'source, driverId, projectId, and serviceDate are required' };
    }

    var correlationId = 'COR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    var id = 'DRI-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    var now = new Date().toISOString();

    _create(SHEETS.DriverReportInbox, {
      ID: id,
      Source: source,
      Channel: channel || 'unknown',
      DriverID: driverId,
      DriverName: rawData.driverName || '',
      ServiceDate: serviceDate,
      StartTime: rawData.startTime || '',
      EndTime: rawData.endTime || '',
      KmTotal: rawData.kmTotal || 0,
      KmExtra: rawData.kmExtra || 0,
      HoursExtra: rawData.hoursExtra || 0,
      Diaria: rawData.diariaType || '',
      IsFestivo: rawData.isFestivo || false,
      IsNotturno: rawData.isNotturno || false,
      Parking: rawData.parking || 0,
      Tolls: rawData.tolls || 0,
      Fuel: rawData.fuel || 0,
      Notes: rawData.notes || '',
      Status: 'CAPTURED',
      NormalizedData: '',
      ServiceID: rawData.serviceId || rawData.selectedServiceId || '',
      ProjectID: projectId,
      CorrelationID: correlationId,
      ReviewedBy: '',
      ReviewedAt: '',
      RejectionReason: '',
      CreatedAt: now,
      UpdatedAt: now
    });

    _dispatchEvent({
      type: 'inbox.captured',
      entity: 'DriverReportInbox',
      entityId: id,
      payload: { source: source, channel: channel, correlationId: correlationId }
    });

    return { success: true, inboxId: id, correlationId: correlationId };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// NORMALIZE — Transform raw data to standard format
// ============================================================================

/**
 * Normaliza los datos crudos de un reporte en el inbox.
 * Transicion: CAPTURED -> NORMALIZED.
 *
 * @param {string} inboxId - ID del inbox item
 * @param {Object} normalizedData - Datos normalizados
 * @returns {Object} { success }
 */
function normalizeReport(inboxId, normalizedData) {
  return _withLock(() => {
    try {
      var item = _getById(SHEETS.DriverReportInbox, inboxId);
      if (!item) {
        return { success: false, error: 'Inbox item not found' };
      }
      if (item.Status !== 'CAPTURED') {
        return { success: false, error: 'Can only normalize items in CAPTURED status' };
      }

      _assertValidTransition('DriverReportInbox', 'CAPTURED', 'NORMALIZED');

      _update(SHEETS.DriverReportInbox, inboxId, {
        NormalizedData: JSON.stringify(normalizedData),
        Status: 'NORMALIZED',
        UpdatedAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'inbox.normalized',
        entity: 'DriverReportInbox',
        entityId: inboxId,
        payload: { correlationId: item.CorrelationID }
      });

      return { success: true };

    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// ============================================================================
// REVIEW — Accept, reject, or lock
// ============================================================================

/**
 * Acepta un reporte del inbox. Transicion: PENDING_REVIEW -> ACCEPTED.
 */
function acceptReport(inboxId, reviewedBy) {
  return _withLock(() => {
    try {
      var item = _getById(SHEETS.DriverReportInbox, inboxId);
      if (!item) return { success: false, error: 'Inbox item not found' };
      if (item.Status !== 'PENDING_REVIEW') {
        return { success: false, error: 'Can only accept items in PENDING_REVIEW status' };
      }

      _assertValidTransition('DriverReportInbox', 'PENDING_REVIEW', 'ACCEPTED');

      // Parse normalized data and create DriverReport (Issue #12)
      // Read serviceId from ServiceID column first, then fall back to NormalizedData
      var normSource = JSON.parse(item.NormalizedData || '{}');
      var serviceId = item.ServiceID || normSource.serviceId || '';

      if (!serviceId) {
        return { success: false, error: 'No ServiceID found on inbox item. Cannot create DriverReport.' };
      }
      if (!item.DriverID) {
        return { success: false, error: 'No DriverID on inbox item. Cannot create DriverReport.' };
      }

      // Choose the right create function based on service status
      var service = ServiceRepository.getById(serviceId);
      var serviceStatus = service ? service.OperationalStatus : '';

      // §12: Auto-advance lifecycle STOPPED — driver's report ≠ service completion
      // Coordinator must manually advance the service lifecycle via Dashboard

      // §34: Read from NormalizedData JSON (normSource) as PRIMARY source.
      // Sheet columns (item.*) may be empty for auto-advance pipeline.
      var reportData = {
        source: item.Source || '',
        startTime: normSource.startTime || item.StartTime || '',
        endTime: normSource.endTime || item.EndTime || '',
        kmTotal: normSource.kmTotal || parseFloat(item.KmTotal) || 0,
        hasDiaria: normSource.hasDiaria || false,
        isFestivo: normSource.isFestivo || item.IsFestivo || false,
        isNotturno: normSource.isNotturno || item.IsNotturno || false,
        diariaType: normSource.diariaType || item.Diaria || 'none',
        kmExtra: normSource.kmExtra || parseFloat(item.KmExtra) || 0,
        hoursExtra: normSource.hoursExtra || parseFloat(item.HoursExtra) || 0,
        parking: normSource.parking || parseFloat(item.Parking) || 0,
        tolls: normSource.tolls || parseFloat(item.Tolls) || 0,
        fuel: normSource.fuel || parseFloat(item.Fuel) || 0,
        waitMinutes: normSource.waitMinutes || 0,
        notes: normSource.notes || item.Notes || ''
      };
      var created;
      try {
        if (serviceStatus === 'Realizado') {
          // Normal flow: createReport transitions Realizado → Reportado
          created = DriverReportCommands.createReport(serviceId, item.DriverID, reportData);
        } else {
          // Service already in Reportado/Revision: link report without changing service status
          created = DriverReportCommands.createReportForReportedService(serviceId, item.DriverID, reportData);
        }
      } catch (createErr) {
        // §33: If DriverReport creation fails, REJECT the inbox item so it doesn't stay stuck
        var errMsg = '[acceptReport] DriverReport creation failed for service ' + serviceId + ': ' + createErr.message;
        Logger.log(errMsg);
        _update(SHEETS.DriverReportInbox, inboxId, {
          Status: 'REJECTED',
          ReviewedBy: reviewedBy || _getActiveUser(),
          ReviewedAt: new Date().toISOString(),
          RejectionReason: createErr.message,
          UpdatedAt: new Date().toISOString()
        });
        _dispatchEvent({
          type: 'inbox.rejected',
          entity: 'DriverReportInbox',
          entityId: inboxId,
          payload: { correlationId: item.CorrelationID, reason: createErr.message }
        });
        return { success: false, error: createErr.message };
      }
      var reportId = created ? created.ID : null;

      // §33: Approval is a SEPARATE step — acceptReport only creates DriverReport in Pendiente
      // Coordinator must manually approve via approveDriverReport()
      // Coordinator must manually advance service to Revision via Dashboard
      if (reportId) {
        Logger.log('[acceptReport] Created report ' + reportId + ' in Pendiente status for service ' + serviceId);
      }

      _update(SHEETS.DriverReportInbox, inboxId, {
        Status: 'ACCEPTED',
        ReviewedBy: reviewedBy || _getActiveUser(),
        ReviewedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'inbox.accepted',
        entity: 'DriverReportInbox',
        entityId: inboxId,
        payload: { correlationId: item.CorrelationID, reportId: reportId }
      });

      return { success: true, reportId: reportId };

    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

/**
 * Rechaza un reporte del inbox. Transicion: PENDING_REVIEW -> REJECTED.
 */
function rejectReport(inboxId, reason, reviewedBy) {
  return _withLock(() => {
    try {
      var item = _getById(SHEETS.DriverReportInbox, inboxId);
      if (!item) return { success: false, error: 'Inbox item not found' };
      if (item.Status !== 'PENDING_REVIEW') {
        return { success: false, error: 'Can only reject items in PENDING_REVIEW status' };
      }

      _assertValidTransition('DriverReportInbox', 'PENDING_REVIEW', 'REJECTED');

      _update(SHEETS.DriverReportInbox, inboxId, {
        Status: 'REJECTED',
        ReviewedBy: reviewedBy || _getActiveUser(),
        ReviewedAt: new Date().toISOString(),
        RejectionReason: reason || '',
        UpdatedAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'inbox.rejected',
        entity: 'DriverReportInbox',
        entityId: inboxId,
        payload: { correlationId: item.CorrelationID, reason: reason }
      });

      return { success: true };

    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

/**
 * Bloquea un reporte del inbox. Transicion: PENDING_REVIEW -> LOCKED.
 */
function lockReport(inboxId) {
  return _withLock(() => {
    try {
      var item = _getById(SHEETS.DriverReportInbox, inboxId);
      if (!item) return { success: false, error: 'Inbox item not found' };
      if (item.Status !== 'PENDING_REVIEW') {
        return { success: false, error: 'Can only lock items in PENDING_REVIEW status' };
      }

      _assertValidTransition('DriverReportInbox', 'PENDING_REVIEW', 'LOCKED');

      _update(SHEETS.DriverReportInbox, inboxId, {
        Status: 'LOCKED',
        UpdatedAt: new Date().toISOString()
      });

      _dispatchEvent({
        type: 'inbox.locked',
        entity: 'DriverReportInbox',
        entityId: inboxId,
        payload: { correlationId: item.CorrelationID }
      });

      return { success: true };

    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

// ============================================================================
// QUERY
// ============================================================================

/**
 * Lista items del inbox con filtros opcionales.
 */
function getInboxItems(filters) {
  try {
    var items = _getAll(SHEETS.DriverReportInbox);

    if (filters) {
      if (filters.source) items = items.filter(function(i) { return i.Source === filters.source; });
      if (filters.channel) items = items.filter(function(i) { return i.Channel === filters.channel; });
      if (filters.driverId) items = items.filter(function(i) { return i.DriverID === filters.driverId; });
      if (filters.projectId) items = items.filter(function(i) { return i.ProjectID === filters.projectId; });
      if (filters.status) items = items.filter(function(i) { return i.Status === filters.status; });
      if (filters.correlationId) items = items.filter(function(i) { return i.CorrelationID === filters.correlationId; });
      if (filters.serviceId) {
        var svcId = filters.serviceId;
        items = items.filter(function(i) {
          return i.ServiceID === svcId;
        });
      }
    }

    // Sort by CreatedAt descending
    items.sort(function(a, b) {
      return new Date(b.CreatedAt) - new Date(a.CreatedAt);
    });

    return items;

  } catch (e) {
    Logger.log('getInboxItems error: ' + e.message);
    return [];
  }
}

/**
 * Obtiene un item del inbox por ID.
 */
function getInboxItem(inboxId) {
  return _getById(SHEETS.DriverReportInbox, inboxId);
}

// ============================================================================
// SUBMIT TO REVIEW — NORMALIZED -> PENDING_REVIEW
// ============================================================================

/**
 * Envía un reporte normalizado a revisión del coordinador.
 * Transicion: NORMALIZED -> PENDING_REVIEW.
 *
 * @param {string} inboxId - ID del inbox item
 * @returns {Object} { success }
 */
function submitToReview(inboxId) {
  try {
    var item = _getById(SHEETS.DriverReportInbox, inboxId);
    if (!item) {
      return { success: false, error: 'Inbox item not found' };
    }
    if (item.Status !== 'NORMALIZED') {
      return { success: false, error: 'Can only submit NORMALIZED items for review' };
    }

    _assertValidTransition('DriverReportInbox', 'NORMALIZED', 'PENDING_REVIEW');

    _update(SHEETS.DriverReportInbox, inboxId, {
      Status: 'PENDING_REVIEW',
      UpdatedAt: new Date().toISOString()
    });

    _dispatchEvent({
      type: 'inbox.pending_review',
      entity: 'DriverReportInbox',
      entityId: inboxId,
      payload: { correlationId: item.CorrelationID, driverId: item.DriverID }
    });

    return { success: true };

  } catch (e) {
    return { success: false, error: e.message };
  }
}
