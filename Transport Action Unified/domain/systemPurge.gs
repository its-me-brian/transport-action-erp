/**
 * domain/systemPurge.gs
 *
 * Limpieza de datos de PRUEBA por etiqueta (por ejemplo la batería E2E).
 *
 * POR QUÉ EXISTE:
 *   Los comandos de borrado del dominio son conservadores a propósito
 *   (deleteService solo acepta Importado/Asignado, deleteClient corta si hay
 *   proyectos, etc.). Eso está bien para el uso diario y es exactamente lo que
 *   impide limpiar fixtures de test que quedaron en estados finales: Validado,
 *   Realizado, Facturado. Este módulo barre por ETIQUETA, no por comando.
 *
 * SEGURIDAD:
 *   - Solo admin ('system.backup', el mismo permiso que exportar el snapshot).
 *   - Borra únicamente filas que CONTENGAN la etiqueta, más las filas que
 *     referencian por ID a algún borrado (cascada). Nunca borra filas ajenas.
 *   - Sin `confirm` igual a la etiqueta, es un SIMULACRO: informa qué borraría.
 *   - `Users` queda afuera salvo `includeUsers: true`, y jamás toca 'admin'.
 *
 * USO DESDE NODE: scripts/e2e/purge.mjs
 */

/** Nunca se borran estas cuentas, ni con includeUsers. */
var PURGE_PROTECTED_USERS = ['admin'];

/** Techo de filas por corrida: evita un timeout de 6 min de Apps Script. */
var PURGE_MAX_ROWS = 4000;

/**
 * Columna de ID de una hoja, por cabecera. Devuelve -1 si no la encuentra.
 * Cubre `ID` (Services, Invoices, ...) y `User_ID` (Users).
 */
function _purgeIdColumn(headers, sheetName) {
  var normalized = function(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  };
  var exact = ['id', 'userid'];
  var singular = sheetName.charAt(sheetName.length - 1) === 's'
    ? normalized(sheetName.slice(0, -1) + '_ID')
    : null;

  for (var i = 0; i < headers.length; i++) {
    var h = normalized(headers[i]);
    if (exact.indexOf(h) !== -1) return i;
    if (singular && h === singular + 'id') return i;
  }
  // Segundo intento: cualquier cabecera que termine en ID.
  for (var j = 0; j < headers.length; j++) {
    var hj = normalized(headers[j]);
    if (hj.slice(-2) === 'id' && hj.length > 2) return j;
  }
  return -1;
}

/** true si la fila contiene la etiqueta en alguna celda de texto. */
function _purgeRowHasTag(row, tag) {
  for (var i = 0; i < row.length; i++) {
    var cell = row[i];
    if (cell === null || cell === undefined) continue;
    if (typeof cell === 'string' && cell.indexOf(tag) !== -1) return true;
  }
  return false;
}

/** true si la fila referencia alguno de los IDs borrados. */
function _purgeRowReferences(row, deletedIds) {
  if (deletedIds.size === 0) return false;
  for (var i = 0; i < row.length; i++) {
    var cell = row[i];
    if (typeof cell !== 'string') continue;
    if (deletedIds.has(cell.trim())) return true;
  }
  return false;
}

/** Borra filas (números 1-based) agrupando rangos contiguos. */
function _purgeDeleteRows(sheet, rowNumbers) {
  var sorted = rowNumbers.slice().sort(function(a, b) { return b - a; });
  var i = 0;
  while (i < sorted.length) {
    var end = sorted[i];
    var j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] - 1) j++;
    var start = sorted[j];
    sheet.deleteRows(start, end - start + 1);
    i = j + 1;
  }
}

/**
 * Barre los datos de prueba que contienen `tag`.
 *
 * @param {string} token - Sesión admin
 * @param {Object} options - { tag, confirm?, dryRun?, includeUsers? }
 * @returns {Object} { success, dryRun, tag, deleted, bySheet, idCount, passes, truncated }
 */
function sbPurgeTestData(token, options) {
  try {
    var permErr = _requirePermissionAction(token, 'system.backup');
    if (permErr) return permErr;

    var actor = _getUserFromToken(token);
    if (!actor) return { error: 'Invalid session' };

    options = options || {};
    var tag = String(options.tag || '').trim();
    if (tag.length < 4) return { error: 'tag is required (min 4 characters)' };
    if (!/^[A-Za-z0-9._-]+$/.test(tag)) {
      return { error: 'tag may only contain letters, numbers and . _ -' };
    }

    var includeUsers = options.includeUsers === true;
    var dryRun = options.dryRun === true || String(options.confirm || '') !== tag;

    var ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
    var sheets = ss.getSheets();

    // Estado en memoria por hoja: filas (sin cabecera) y filas a borrar.
    var state = sheets.map(function(sheet) {
      var name = sheet.getName();
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow < 2 || lastCol < 1) {
        return { sheet: sheet, name: name, rows: [], idCol: -1, pending: [] };
      }
      var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      return {
        sheet: sheet,
        name: name,
        rows: values.slice(1),
        idCol: _purgeIdColumn(values[0], name),
        pending: []
      };
    });

    // ── Pasada 1: filas con la etiqueta ──────────────────────────────────
    var bySheet = {};
    var deletedIds = new Set();
    var total = 0;
    var truncated = false;

    for (var s = 0; s < state.length; s++) {
      var st = state[s];
      if (!st.rows.length) continue;
      var isUsers = st.name === 'Users';
      if (isUsers && !includeUsers) continue;

      var hits = [];
      for (var r = 0; r < st.rows.length; r++) {
        var row = st.rows[r];
        if (!_purgeRowHasTag(row, tag)) continue;
        if (isUsers && PURGE_PROTECTED_USERS.indexOf(String(row[1] || '').trim()) !== -1) continue;
        hits.push(r + 2); // 1-based, +1 por la cabecera
        if (st.idCol !== -1) {
          var id = String(row[st.idCol] || '').trim();
          if (id) deletedIds.add(id);
        }
      }
      if (!hits.length) continue;
      if (total + hits.length > PURGE_MAX_ROWS) {
        truncated = true;
        hits = hits.slice(0, Math.max(0, PURGE_MAX_ROWS - total));
      }
      st.pending = hits;
      total += hits.length;
      bySheet[st.name] = hits.length;
    }

    // ── Pasada 2..N: filas que referencian IDs borrados (cascada) ────────
    var passes = 1;
    while (deletedIds.size > 0 && passes < 8 && !truncated) {
      passes++;
      var grew = false;
      for (var k = 0; k < state.length; k++) {
        var cur = state[k];
        if (!cur.rows.length || cur.pending.length) continue;
        if (cur.name === 'Users' && !includeUsers) continue;

        var refs = [];
        for (var q = 0; q < cur.rows.length; q++) {
          if (!_purgeRowReferences(cur.rows[q], deletedIds)) continue;
          refs.push(q + 2);
          if (cur.idCol !== -1) {
            var rid = String(cur.rows[q][cur.idCol] || '').trim();
            if (rid) deletedIds.add(rid);
          }
        }
        if (!refs.length) continue;
        if (total + refs.length > PURGE_MAX_ROWS) {
          truncated = true;
          refs = refs.slice(0, Math.max(0, PURGE_MAX_ROWS - total));
        }
        cur.pending = refs;
        total += refs.length;
        bySheet[cur.name] = (bySheet[cur.name] || 0) + refs.length;
        grew = true;
      }
      if (!grew) break;
    }

    if (!dryRun && total > 0) {
      // Los IDs ya están en memoria, así que el orden de borrado es indiferente.
      for (var d = 0; d < state.length; d++) {
        if (!state[d].pending.length) continue;
        _purgeDeleteRows(state[d].sheet, state[d].pending);
      }

      _dispatchEvent({
        type: 'system.testDataPurged',
        entity: 'System',
        entityId: tag,
        payload: {
          requestedBy: actor.username,
          tag: tag,
          rows: total,
          bySheet: bySheet
        }
      });
    }

    return {
      success: true,
      dryRun: dryRun,
      tag: tag,
      deleted: total,
      bySheet: bySheet,
      idCount: deletedIds.size,
      passes: passes,
      truncated: truncated
    };
  } catch (e) {
    return { error: e.message || String(e) };
  }
}
