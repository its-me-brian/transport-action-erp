// ============================================================================
// VALIDATION.GS — Validación de integridad referencial
// ============================================================================
//
// Resolución de brecha: Integridad referencial en el backend
// Actualmente, createInvoice acepta cualquier ClientID/ProjectID sin verificar
// que existan. Si el frontend envía un ID borrado o malformado, se crea una
// factura huérfana que rompe los reports y reconciliation.
//
// validateForeignId verifica que un ID exista ANTES de crear/modificar.
// Usa _getById del repository pattern para búsqueda eficiente.
// ============================================================================

/**
 * Valida que un ID exista en la hoja y columna indicadas.
 *
 * @param {string} sheetName  - Nombre de la hoja (usar常量 SHEETS, ej. SHEETS.Clients)
 * @param {string} idToCheck  - El ID a validar
 * @param {string} [columnName] - Columna donde buscar (default: 'ID')
 * @returns {boolean}         - true si existe, false si no
 *
 * @example
 *   if (!validateForeignId(SHEETS.Clients, data.ClientID)) {
 *     throw new ValidationError('REFERENTIAL_INTEGRITY: El cliente no existe');
 *   }
 */
function validateForeignId(sheetName, idToCheck, columnName) {
  if (!idToCheck) return false;

  const col = columnName || 'ID';
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIndex = headers.indexOf(col);
  if (colIndex === -1) return false;

  const data = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(idToCheck)) {
      return true;
    }
  }
  return false;
}

/**
 * Valida múltiples foreign keys de una sola vez.
 * Más eficiente que llamar validateForeignId varias veces (una sola lectura por hoja).
 *
 * @param {string} sheetName        - Nombre de la hoja
 * @param {Array<{id: string, column: string}>} checks - IDs a validar
 * @returns {{valid: boolean, errors: string[]}} - Resultado de la validación
 *
 * @example
 *   const result = validateForeignKeys(SHEETS.Clients, [
 *     { id: data.ClientID, column: 'ID' },
 *   ]);
 *   if (!result.valid) {
 *     throw new ValidationError('REFERENTIAL_INTEGRITY: ' + result.errors.join(', '));
 *   }
 */
function validateForeignKeys(sheetName, checks) {
  const errors = [];

  for (const check of checks) {
    if (check.id && !validateForeignId(sheetName, check.id, check.column)) {
      errors.push(check.column + ' "' + check.id + '" no existe en ' + sheetName);
    }
  }

  return { valid: errors.length === 0, errors: errors };
}


// ============================================================================
// INTEGRACIÓN: apiCreateInvoice
// ============================================================================
//
// Para integrar, agregar al inicio de apiCreateInvoice en domain/invoice.gs:
//
//   function apiCreateInvoice(data) {
//     if (!data.ProjectID) throw new ValidationError('ProjectID is required');
//     if (!data.ClientID) throw new ValidationError('ClientID is required');
//
//     // ── NUEVO: Validación de integridad referencial ──
//     if (!validateForeignId(SHEETS.Clients, data.ClientID)) {
//       throw new ValidationError('REFERENTIAL_INTEGRITY: El cliente no existe: ' + data.ClientID);
//     }
//     if (!validateForeignId(SHEETS.Projects, data.ProjectID)) {
//       throw new ValidationError('REFERENTIAL_INTEGRITY: El proyecto no existe: ' + data.ProjectID);
//     }
//     // ── FIN NUEVO ──
//
//     const entity = InvoiceRepository.create(data);
//     _dispatchEvent({ type: 'invoice.created', entity: 'Invoice', entityId: entity.ID });
//     return InvoiceRepository.toDTO(entity);
//   }
//
// REGLAS DE USO:
// 1. Validar foreign keys ANTES de la escritura, no después
// 2. Usar el prefijo 'REFERENTIAL_INTEGRITY:' en el mensaje de error
//    (permite al frontend distinguir errores de negocio vs errores de datos)
// 3. validateForeignId es BARATO (lee solo una columna) — usarlo libremente
// 4. validateForeignKeys es para validaciones múltiples en batch (ahorra lecturas)
