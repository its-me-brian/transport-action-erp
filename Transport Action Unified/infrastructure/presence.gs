// ============================================================================
// PRESENCE.GS — Heartbeat-based active users tracking (FASE 15E)
// ============================================================================
// Usa Google Sheets como store (NO CacheService que se pierde entre invocaciones).
// Cada usuario activo mantiene su presencia con heartbeat periodico.
// Un usuario se considera activo si su LastSeen fue hace menos de 90 segundos.
// Frontend should send heartbeat every 25 seconds.

var PRESENCE_TIMEOUT_MS = 90 * 1000;       // 90 seconds — user considered offline after this
var PRESENCE_CLEANUP_MS = 3 * 60 * 1000;   // 3 minutes — cleanup stale entries

// ============================================================================
// HEARTBEAT — Update last seen timestamp
// ============================================================================

/**
 * Actualiza el heartbeat del usuario activo.
 * Llamar desde el frontend cada 25 segundos.
 * Soporta múltiples sesiones por usuario (una por browser tab).
 *
 * @param {string} token - Session token
 * @param {string} userAgent - User agent del browser
 * @param {string} sessionId - ID único de la sesión (generado por el frontend)
 * @param {string} ipAddress - IP del cliente (opcional)
 * @returns {Object} { success, sessionId }
 */
function updatePresence(token, userAgent, sessionId, ipAddress) {
  try {
    var user = _getUserFromToken(token);
    if (!user || user.active !== 'approved') {
      return { success: false, error: 'Invalid session' };
    }

    var now = new Date();
    var sh = getSheet(SHEETS.Presence);
    var data = sh.getDataRange().getValues();
    var headers = data[0];

    // Use provided sessionId or generate one
    var sid = sessionId || ('SES-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6));

    // Find existing presence for this user + session
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(user.id) && String(data[i][1]) === String(sid)) {
        // Update existing session
        sh.getRange(i + 1, headers.indexOf('LastSeen') + 1).setValue(now.toISOString());
        sh.getRange(i + 1, headers.indexOf('UserAgent') + 1).setValue(userAgent || '');
        sh.getRange(i + 1, headers.indexOf('IPAddress') + 1).setValue(ipAddress || '');
        return { success: true, sessionId: sid };
      }
    }

    // Create new presence record for this session
    sh.appendRow([
      user.id,
      sid,
      user.email,
      user.role,
      now.toISOString(),
      userAgent || '',
      ipAddress || '',
      true
    ]);

    return { success: true, sessionId: sid };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// QUERY — Get active users
// ============================================================================

/**
 * Obtiene la lista de usuarios activos (con heartbeat reciente).
 *
 * @param {number} [timeoutMs] - Timeout en ms (default: 90s)
 * @returns {Array} Lista de usuarios activos
 */
function getActiveUsers(timeoutMs) {
  try {
    var timeout = timeoutMs || PRESENCE_TIMEOUT_MS;
    var cutoff = new Date(Date.now() - timeout);

    var sh = getSheet(SHEETS.Presence);
    var lastRow = sh.getLastRow();
    if (lastRow <= 1) return [];

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var data = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
    var lastSeenCol = headers.indexOf('LastSeen');

    var activeUsers = [];
    var staleRows = [];

    for (var i = 0; i < data.length; i++) {
      var lastSeen = new Date(data[i][lastSeenCol]);
      if (lastSeen >= cutoff) {
        var user = {};
        headers.forEach(function(h, j) { user[h] = data[i][j]; });
        activeUsers.push(user);
      } else {
        // Track stale rows for cleanup
        staleRows.push(i + 2); // +2 for 1-indexed + header
      }
    }

    // Cleanup stale entries (in background)
    if (staleRows.length > 0) {
      _cleanupStalePresence(staleRows);
    }

    return activeUsers;

  } catch (e) {
    Logger.log('getActiveUsers error: ' + e.message);
    return [];
  }
}

/**
 * Obtiene el conteo de usuarios activos.
 */
function getActiveUserCount() {
  return getActiveUsers().length;
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Elimina registros de presencia stale.
 */
function _cleanupStalePresence(rows) {
  try {
    var sh = getSheet(SHEETS.Presence);
    // Delete from bottom to top to avoid index shifting
    for (var i = rows.length - 1; i >= 0; i--) {
      sh.deleteRow(rows[i]);
    }
  } catch (e) {
    Logger.log('Presence cleanup error: ' + e.message);
  }
}

/**
 * Fuerza limpieza de todos los registros stale.
 * Puede ejecutarse como trigger periodico.
 */
function cleanupAllPresence() {
  try {
    var sh = getSheet(SHEETS.Presence);
    var lastRow = sh.getLastRow();
    if (lastRow <= 1) return;

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var data = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
    var lastSeenCol = headers.indexOf('LastSeen');
    var cutoff = new Date(Date.now() - PRESENCE_CLEANUP_MS);

    var staleRows = [];
    for (var i = 0; i < data.length; i++) {
      var lastSeen = new Date(data[i][lastSeenCol]);
      if (lastSeen < cutoff) {
        staleRows.push(i + 2);
      }
    }

    _cleanupStalePresence(staleRows);
    return { success: true, cleaned: staleRows.length };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// API — For frontend
// ============================================================================

/**
 * API: Heartbeat endpoint (frontend calls periodically).
 */
function apiHeartbeat(token, userAgent, sessionId, ipAddress) {
  return updatePresence(token, userAgent, sessionId, ipAddress);
}

/**
 * API: Get active users list.
 */
function apiGetActiveUsers(timeoutMs) {
  return getActiveUsers(timeoutMs);
}
