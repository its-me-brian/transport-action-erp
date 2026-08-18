// ============================================================================
// SEQUENCE.GS — Generación de IDs secuenciales con concurrencia
// ============================================================================

/**
 * Genera un ID secuencial con formato: {Prefix}-{OperatingCompany}-{Year}-{Sequential}
 * Ejemplo: INV-TA-2026-00045
 *
 * Usa LockService para garantizar unicidad en concurrencia.
 *
 * @param {string} prefix - Prefijo de la entidad (SVC, INV, PAY, etc.)
 * @param {string} operatingCompany - Código de empresa (TA, MM)
 * @returns {string} ID generado
 */
function _generateId(prefix, operatingCompany) {
  return _withLock(() => {
    const sheet = getSheet(SHEETS.Sequence);
    const year = new Date().getFullYear();
    const data = sheet.getDataRange().getValues();

    // Buscar secuencia existente
    let rowNum = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === prefix && data[i][1] === operatingCompany && data[i][2] === year) {
        rowNum = i + 1; // +1 porque las filas de Sheets son 1-indexed
        break;
      }
    }

    let nextNum;
    if (rowNum > 0) {
      // Secuencia existe → incrementar
      nextNum = data[rowNum - 1][3] + 1;
      sheet.getRange(rowNum, 4).setValue(nextNum);
    } else {
      // Secuencia nueva → crear
      nextNum = 1;
      sheet.appendRow([prefix, operatingCompany, year, nextNum]);
    }

    const numStr = String(nextNum).padStart(ID_PAD_LENGTH, '0');
    return `${prefix}-${operatingCompany}-${year}-${numStr}`;
  });
}

/**
 * Inicializa la hoja Sequence con datos de ejemplo.
 */
function _setupSequence() {
  const sheet = getSheet(SHEETS.Sequence);
  sheet.clear();

  // Headers
  sheet.getRange(1, 1, 1, 4).setValues([['Entity', 'OperatingCompany', 'Year', 'Next']]);

  // Formato
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#4CAF50').setFontColor('white');
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 80);
  sheet.setColumnWidth(4, 80);

  // Datos iniciales
  const year = new Date().getFullYear();
  const initialData = [
    ['SVC', 'TA', year, 0],
    ['SVC', 'MM', year, 0],
    ['INV', 'TA', year, 0],
    ['INV', 'MM', year, 0],
    ['PRJ', 'TA', year, 0],
    ['PRJ', 'MM', year, 0],
    ['DRV', 'TA', year, 0],
    ['DRV', 'MM', year, 0],
    ['VEH', 'TA', year, 0],
    ['VEH', 'MM', year, 0],
    ['CLI', 'TA', year, 0],
    ['CLI', 'MM', year, 0],
    ['EXP', 'TA', year, 0],
    ['EXP', 'MM', year, 0]
  ];

  if (initialData.length > 0) {
    sheet.getRange(2, 1, initialData.length, 4).setValues(initialData);
  }
}
