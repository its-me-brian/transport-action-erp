// ============================================================================
// LOCK.GS — Wrapper de bloqueo con logging y timeout configurable
// ============================================================================
//
// Resolución de brecha: Concurrencia en GAS
// Google Apps Script ejecuta múltiples instancias en paralelo cuando
// varios usuarios acceden simultáneamente. Sin lock, dos escrituras
// concurrentes pueden corromper datos (race condition en Sheets).
//
// Diferencia con _withLock() en infrastructure/lockService.gs:
//   - executeWithLock: añade logging detallado + timeout configurable
//   - _withLock: wrapper básico sin logging
//
// Ambos usan LockService.getScriptLock(). Para write operations, USAR SIEMPRE
// executeWithLock o _withLock. NO escribir a Sheets sin lock.
// ============================================================================

/**
 * Ejecuta una función callback dentro de un ScriptLock con logging y timeout.
 *
 * @param {Function} fn           - Callback a ejecutar dentro del lock
 * @param {string}   logMessage   - Mensaje descriptivo para el log (ej. "Crear servicio S-123")
 * @param {number}   [timeoutMs]  - Tiempo máximo de espera para adquirir el lock (default: 10000ms)
 * @returns {*}                   - El valor retornado por fn()
 * @throws {ConcurrencyError}     - Si no puede adquirir el lock en timeoutMs
 *
 * @example
 *   executeWithLock(() => {
 *     const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('Services');
 *     sheet.appendRow([id, date, driver]);
 *   }, 'Crear servicio nuevo');
 */
function executeWithLock(fn, logMessage, timeoutMs) {
  if (typeof fn !== 'function') {
    throw new Error('executeWithLock: fn debe ser una función');
  }

  const timeout = typeof timeoutMs === 'number' ? timeoutMs : 10000;
  const lock = LockService.getScriptLock();
  const startTime = Date.now();

  Logger.log(`[LOCK] Adquiriendo lock: "${logMessage}" (timeout: ${timeout}ms)`);

  try {
    lock.waitLock(timeout);
    const waitTime = Date.now() - startTime;
    Logger.log(`[LOCK] Lock adquirido en ${waitTime}ms: "${logMessage}"`);

    const result = fn();

    const elapsed = Date.now() - startTime;
    Logger.log(`[LOCK] Operación completada en ${elapsed}ms: "${logMessage}"`);

    return result;
  } catch (e) {
    const elapsed = Date.now() - startTime;

    if (e.message && e.message.includes('Cannot acquire lock')) {
      Logger.log(`[LOCK] TIMEOUT tras ${elapsed}ms: "${logMessage}" — No se pudo adquirir lock`);
      throw new ConcurrencyError(
        'No se pudo adquirir lock en ' + timeout + 'ms. ' +
        'El recurso está siendo modificado por otro usuario. ' +
        'Operación: ' + logMessage
      );
    }

    Logger.log(`[LOCK] ERROR tras ${elapsed}ms: "${logMessage}" — ${e.message}`);
    throw e;
  } finally {
    lock.releaseLock();
    Logger.log(`[LOCK] Lock liberado: "${logMessage}"`);
  }
}


// ============================================================================
// EJEMPLOS DE REFACTORIZACIÓN
// ============================================================================

/**
 * EJEMPLO 1: apiCreateService en domain/service.gs
 *
 * ANTES (sin lock — riesgo de race condition):
 *
 *   function apiCreateService(data) {
 *     if (!data.ProjectID) throw new ValidationError('ProjectID is required');
 *     if (!data.Date) throw new ValidationError('Date is required');
 *     const project = ProjectRepository.getById(data.ProjectID);
 *     if (!project) throw new NotFoundError('Project', data.ProjectID);
 *     if (!data.OperatingCompany) {
 *       data.OperatingCompany = project.OperatingCompany;
 *     }
 *     const entity = ServiceRepository.create(data);
 *     _dispatchEvent({ type: 'service.imported', entity: 'Service', entityId: entity.ID });
 *     return ServiceRepository.toDTO(entity);
 *   }
 *
 * DESPUÉS (con executeWithLock):
 *
 *   function apiCreateService(data) {
 *     if (!data.ProjectID) throw new ValidationError('ProjectID is required');
 *     if (!data.Date) throw new ValidationError('Date is required');
 *
 *     const project = ProjectRepository.getById(data.ProjectID);
 *     if (!project) throw new NotFoundError('Project', data.ProjectID);
 *
 *     if (!data.OperatingCompany) {
 *       data.OperatingCompany = project.OperatingCompany;
 *     }
 *
 *     return executeWithLock(() => {
 *       const entity = ServiceRepository.create(data);
 *       _dispatchEvent({ type: 'service.imported', entity: 'Service', entityId: entity.ID });
 *       return ServiceRepository.toDTO(entity);
 *     }, `Crear servicio para proyecto ${data.ProjectID}`);
 *   }
 *
 *
 * EJEMPLO 2: apiCreateDriverReport en domain/driverReportCommands.gs
 *
 * ANTES (sin lock):
 *
 *   function apiCreateDriverReport(serviceId, driverId, reportData) {
 *     // ... validaciones ...
 *     const entity = DriverReportRepository.create(serviceId, driverId, reportData);
 *     return entity;
 *   }
 *
 * DESPUÉS (con executeWithLock):
 *
 *   function apiCreateDriverReport(serviceId, driverId, reportData) {
 *     if (!serviceId) throw new ValidationError('serviceId is required');
 *     if (!driverId) throw new ValidationError('driverId is required');
 *
 *     const service = ServiceRepository.getById(serviceId);
 *     if (!service) throw new NotFoundError('Service', serviceId);
 *
 *     return executeWithLock(() => {
 *       const entity = DriverReportRepository.create(serviceId, driverId, reportData);
 *       _dispatchEvent({ type: 'driverReport.created', entity: 'DriverReport', entityId: entity.ID });
 *       return entity;
 *     }, `Crear reporte de conductor para servicio ${serviceId}`);
 *   }
 *
 * REGLA: Solo envolver en lock la SECCIÓN que escribe a Sheets.
 *         Las validaciones y lecturas previas NO necesitan lock.
 */
