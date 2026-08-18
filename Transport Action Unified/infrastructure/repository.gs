// ============================================================================
// REPOSITORY.GS — CRUD genérico para Google Sheets
// ============================================================================

// ============================================================================
// BASE REPOSITORY — Funciones genéricas
// ============================================================================

/**
 * Obtiene todas las filas de una hoja como array de objetos.
 * La primera fila son los headers.
 */
function _getAll(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  return data.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

/**
 * Obtiene una fila por ID (columna A).
 */
function _getById(sheetName, id) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idCol = headers.indexOf('ID');
  if (idCol === -1) return null;

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      const obj = {};
      headers.forEach((header, j) => {
        obj[header] = data[i][j];
      });
      return obj;
    }
  }
  return null;
}

/**
 * Busca filas usando un filtro.
 * Acepta:
 *   - Callback:  _find('Services', row => row.ProjectID === 'PRJ-001')
 *   - Objeto:    _find('Services', { ProjectID: 'PRJ-001' })
 */
function _find(sheetName, filter) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  const toObj = (row) => {
    const obj = {};
    headers.forEach((header, j) => { obj[header] = row[j]; });
    return obj;
  };

  // Callback pattern: (row) => boolean
  if (typeof filter === 'function') {
    return data.filter(row => filter(toObj(row))).map(toObj);
  }

  // Object pattern: { fieldName: value }
  const filterCols = {};
  for (const [key, val] of Object.entries(filter)) {
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      filterCols[colIdx] = val;
    }
  }

  return data.filter(row => {
    return Object.entries(filterCols).every(([colIdx, val]) => {
      return String(row[colIdx]) === String(val);
    });
  }).map(toObj);
}

/**
 * Mapa de prefijos de ID por nombre de hoja.
 * Se usa para auto-generar IDs cuando data.ID está vacío.
 */
const _SHEET_PREFIXES = {
  'OperatingCompany': 'OC',
  'Clients': 'CLI',
  'Contacts': 'CON',
  'Projects': 'PRJ',
  'Drivers': 'DRV',
  'Vehicles': 'VEH',
  'DriverRates': 'DR',
  'DriverAdvances': 'DA',
  'RateCards': 'RC',
  'TransportLists': 'TL',
  'Services': 'SVC',
  'ServiceRevenueBreakdown': 'SRB',
  'ServiceCostBreakdown': 'SCB',
  'DriverReports': 'DRR',
  'RapportinoClients': 'RPC',
  'RapportinoItems': 'RPI',
  'RapportinoDrivers': 'RPD',
  'Invoices': 'INV',
  'InvoiceItems': 'INVI',
  'Payments': 'PAY',
  'Expenses': 'EXP',
  'Changes': 'CHG',
  'Documents': 'DOC',
  'AuditLog': 'AUD',
  'ActivityFeed': 'AF',
  'Settings': 'SET',
  'Collaborators': 'COL',
  'SupplierRates': 'SR',
  'RapportinoCollaborators': 'RCO',
  'RapportinoCollaboratorItems': 'RCOI',
  'Reconciliation': 'REC',
  'DriverLinks': 'DL',
  'DriverLinkResponses': 'DLR',
  'DriverLinkEvents': 'DLE',
  'DriverReportInbox': 'DRI',
  'Presence': 'PRE',
  'Users': 'USR'
};

/**
 * Crea una nueva fila. Retorna el objeto creado con el ID.
 * Auto-genera ID si data.ID está vacío o no definido.
 */
function _create(sheetName, data) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Auto-generar ID si está vacío
  if (!data.ID) {
    const prefix = _SHEET_PREFIXES[sheetName] || 'ID';
    data.ID = _generateId(prefix, DEFAULTS.ActiveCompany);
  }

  const row = headers.map(header => {
    if (data[header] !== undefined) {
      // Serializar arrays/objetos a JSON
      const val = data[header];
      if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
        return JSON.stringify(val);
      }
      return val;
    }
    return '';
  });

  sheet.appendRow(row);
  return data;
}

/**
 * Actualiza una fila existente por ID.
 */
function _update(sheetName, id, changes) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idCol = headers.indexOf('ID');
  if (idCol === -1) return false;

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      // Actualizar solo los campos que cambiaron
      for (const [key, val] of Object.entries(changes)) {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          // Serializar arrays/objetos a JSON
          const value = (Array.isArray(val) || (typeof val === 'object' && val !== null))
            ? JSON.stringify(val)
            : val;
          sheet.getRange(i + 2, colIdx + 1).setValue(value);
        }
      }
      return true;
    }
  }
  return false;
}

/**
 * Elimina una fila por ID.
 */
function _delete(sheetName, id) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idCol = headers.indexOf('ID');
  if (idCol === -1) return false;

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 2); // +2 porque: 1-indexed + header
      return true;
    }
  }
  return false;
}
