// ============================================================================
// LOCKSERVICE.GS — Wrapper de LockService para concurrencia
// ============================================================================

/**
 * Ejecuta una función dentro de un lock de ScriptLock.
 * Si no puede adquirir el lock en LOCK_TIMEOUT ms, lanza ConcurrencyError.
 *
 * Uso:
 *   _withLock(() => {
 *     // código que requiere exclusión
 *   });
 */
function _withLock(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_TIMEOUT);
    return fn();
  } catch (e) {
    if (e.message && e.message.includes('Cannot acquire lock')) {
      throw new ConcurrencyError('No se pudo adquirir lock. El recurso está siendo modificado por otro usuario.');
    }
    throw e;
  } finally {
    lock.releaseLock();
  }
}
