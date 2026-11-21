/**
 * domain/systemBackup.gs
 *
 * Backup lógico de la base de datos (Google Sheet) para pre-v1.
 *
 * POR QUÉ NO DriveApp:
 *   Copiar el archivo con DriveApp agregaría el scope de Drive al proyecto.
 *   Un scope nuevo deja el Web App sin autorizar hasta que el dueño vuelva a
 *   dar consentimiento en el editor — eso rompe TODOS los endpoints, no solo
 *   el backup. El snapshot se hace leyendo la hoja con SpreadsheetApp, que ya
 *   está autorizado, y devolviendo las filas por la API.
 *
 * El respaldo "fiel" (fórmulas, formatos, validaciones) sigue siendo
 * Archivo → Hacer una copia en Google Sheets. Este snapshot cubre los DATOS.
 *
 * Columnas sensibles (Users: Password_Hash, Salt, Token, Token_Expiry) se
 * reemplazan por '[redacted]' antes de salir del servidor.
 */

/** Columnas (0-based) que nunca salen del servidor en un snapshot. */
var BACKUP_REDACTED_COLUMNS = {
  Users: [2, 3, 11, 12]
};

/** Tope de celdas por snapshot: evita respuestas gigantes y timeouts. */
var BACKUP_MAX_CELLS = 400000;

/**
 * Devuelve una copia de la fila con las columnas sensibles enmascaradas.
 * @param {string} sheetName
 * @param {Array} row
 * @returns {Array}
 */
function _backupRedactRow(sheetName, row) {
  var cols = BACKUP_REDACTED_COLUMNS[sheetName];
  if (!cols) return row;

  var out = row.slice();
  for (var i = 0; i < cols.length; i++) {
    var idx = cols[i];
    if (idx < out.length && out[idx] !== '' && out[idx] !== null && out[idx] !== undefined) {
      out[idx] = '[redacted]';
    }
  }
  return out;
}

/**
 * Snapshot completo de la base: todas las hojas, todas las filas.
 * Solo admin. Devuelve los datos listos para guardar como JSON.
 *
 * @param {string} token - Session token (admin)
 * @param {Object} [options] - { maxCells?: number, includeSheets?: string }
 * @returns {Object} { success, generatedAt, spreadsheetId, sheets, counts, truncated }
 */
function sbExportSnapshot(token, options) {
  try {
    var permErr = _requirePermissionAction(token, 'system.backup');
    if (permErr) return permErr;

    var actor = _getUserFromToken(token);
    if (!actor) return { error: 'Invalid session' };

    options = options || {};
    var maxCells = Number(options.maxCells) > 0 ? Number(options.maxCells) : BACKUP_MAX_CELLS;
    var only = null;
    if (options.includeSheets) {
      only = String(options.includeSheets).split(',').map(function(s) {
        return s.trim();
      });
    }

    var ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
    var all = ss.getSheets();
    var sheets = [];
    var counts = {};
    var truncated = [];
    var totalCells = 0;
    var totalRows = 0;

    for (var i = 0; i < all.length; i++) {
      var sh = all[i];
      var name = sh.getName();
      if (only && only.indexOf(name) === -1) continue;

      var lastRow = sh.getLastRow();
      var lastCol = sh.getLastColumn();

      if (lastRow === 0 || lastCol === 0) {
        sheets.push({ name: name, columns: 0, rows: 0, values: [] });
        counts[name] = 0;
        continue;
      }

      var values = sh.getRange(1, 1, lastRow, lastCol).getValues();

      // Recorte por presupuesto de celdas: siempre conservamos la cabecera.
      if (totalCells + lastRow * lastCol > maxCells) {
        var allowed = maxCells - totalCells;
        var keep = Math.floor(allowed / lastCol);
        if (keep < 1) keep = 1;
        if (keep < values.length) {
          truncated.push(name);
          values = values.slice(0, keep);
        }
      }

      for (var r = 0; r < values.length; r++) {
        values[r] = _backupRedactRow(name, values[r]);
      }

      totalCells += values.length * lastCol;
      totalRows += Math.max(0, values.length - 1);

      sheets.push({
        name: name,
        columns: lastCol,
        rows: Math.max(0, values.length - 1),
        values: values
      });
      counts[name] = Math.max(0, values.length - 1);
    }

    var generatedAt = new Date().toISOString();

    _dispatchEvent({
      type: 'system.backupExported',
      entity: 'System',
      entityId: 'snapshot',
      payload: {
        requestedBy: actor.username,
        sheetCount: sheets.length,
        rowCount: totalRows,
        truncated: truncated
      }
    });

    return {
      success: true,
      generatedAt: generatedAt,
      spreadsheetId: CONFIG.DB_SHEET_ID,
      timeZone: ss.getSpreadsheetTimeZone(),
      sheetCount: sheets.length,
      rowCount: totalRows,
      truncated: truncated,
      counts: counts,
      sheets: sheets
    };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Resumen liviano: cantidad de filas por hoja, sin traer los datos.
 * Sirve para verificar un backup contra la base viva.
 *
 * @param {string} token - Session token (admin)
 * @returns {Object} { success, generatedAt, counts, totalRows }
 */
function sbSnapshotSummary(token) {
  try {
    var permErr = _requirePermissionAction(token, 'system.backup');
    if (permErr) return permErr;

    var ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
    var all = ss.getSheets();
    var counts = {};
    var totalRows = 0;

    for (var i = 0; i < all.length; i++) {
      var name = all[i].getName();
      var rows = Math.max(0, all[i].getLastRow() - 1);
      counts[name] = rows;
      totalRows += rows;
    }

    return {
      success: true,
      generatedAt: new Date().toISOString(),
      spreadsheetId: CONFIG.DB_SHEET_ID,
      sheetCount: all.length,
      totalRows: totalRows,
      counts: counts
    };
  } catch (e) {
    return { error: e.message };
  }
}
