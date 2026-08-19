// ============================================================================
// LOCK.GS — Sistema de locking unificado para GAS
// ============================================================================
//
// ARQUITECTURA:
//   executeWithLock(fn, operationName, timeoutMs)  ← implementación base
//   _withLock(fn, operationName?)                  ← wrapper retrocompatible
//
// Los 62 lugares existentes llaman _withLock(() => { ... }).
// _withLock internamente delega a executeWithLock, obteniendo
// automáticamente: logging, timeout configurable, manejo robusto de errores.
//
// Para código NUEVO, usar executeWithLock directamente con un operationName
// descriptivo (ej. "Crear servicio S-123").
//
// REGLA: Toda escritura a Sheets DEBE pasar por executeWithLock o _withLock.
// ============================================================================

/**
 * Implementación base de locking con logging y timeout configurable.
 * Esta es la función interna para TODO el locking del sistema.
 *
 * @param {Function} callback      - Función a ejecutar dentro del lock
 * @param {string}   operationName - Nombre descriptivo para logs (ej. "Crear servicio")
 * @param {number}   [timeoutMs]   - Timeout en ms (default: 10000)
 * @returns {*}                    - Valor retornado por callback
 * @throws {ConcurrencyError}      - Si no puede adquirir el lock (HTTP 409)
 */
function executeWithLock(callback, operationName, timeoutMs) {
  if (typeof callback !== 'function') {
    throw new Error('executeWithLock: callback debe ser una función');
  }

  var opName = operationName || 'operación_desconocida';
  var timeout = typeof timeoutMs === 'number' ? timeoutMs : 10000;
  var lock = LockService.getScriptLock();
  var startTime = Date.now();

  Logger.log('[LOCK] Adquiriendo: "' + opName + '" (timeout: ' + timeout + 'ms)');

  try {
    lock.waitLock(timeout);
    var waitTime = Date.now() - startTime;
    Logger.log('[LOCK] Adquirido en ' + waitTime + 'ms: "' + opName + '"');

    var result = callback();

    var elapsed = Date.now() - startTime;
    Logger.log('[LOCK] Completado en ' + elapsed + 'ms: "' + opName + '"');

    return result;
  } catch (e) {
    var elapsed = Date.now() - startTime;

    // Timeout de LockService → ConcurrencyError (HTTP 409 via _serializeError)
    if (e.message && e.message.includes('Cannot acquire lock')) {
      Logger.log('[LOCK] TIMEOUT ' + elapsed + 'ms: "' + opName + '"');
      throw new ConcurrencyError(
        'No se pudo adquirir lock en ' + timeout + 'ms. ' +
        'El recurso está siendo modificado por otro usuario. ' +
        'Operación: ' + opName
      );
    }

    Logger.log('[LOCK] ERROR ' + elapsed + 'ms: "' + opName + '" — ' + e.message);
    throw e;
  } finally {
    try {
      lock.releaseLock();
      Logger.log('[LOCK] Liberado: "' + opName + '"');
    } catch (releaseError) {
      Logger.log('[LOCK] WARNING: No se pudo liberar lock para "' + opName + '": ' + releaseError.message);
    }
  }
}

/**
 * Wrapper retrocompatible con los 62 lugares existentes.
 * Internamente delega a executeWithLock.
 *
 * Los 62 llamadas existentes son: _withLock(() => { ... })
 * El segundo parámetro operationName es opcional (default: 'operación_anónima').
 *
 * @param {Function} callback        - Función a ejecutar
 * @param {string}   [operationName] - Nombre para logs (opcional)
 * @returns {*}                      - Valor retornado por callback
 */
function _withLock(callback, operationName) {
  return executeWithLock(callback, operationName || 'operación_anónima');
}
