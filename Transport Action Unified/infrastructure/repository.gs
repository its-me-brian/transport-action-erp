// ============================================================================
// REPOSITORY.GS — CRUD genérico para Google Sheets
// ============================================================================

// ============================================================================
// BASE REPOSITORY — Funciones genéricas
// ============================================================================

/**
 * Obtiene todas las filas de una hoja como array de objetos.
 * La primera fila son los headers.
 * Excluye registros soft-deleted (DeletedAt set).
 */
function _getAll(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const deletedAtCol = headers.indexOf('DeletedAt');

  return data.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  }).filter(obj => {
    // Exclude soft-deleted records
    if (deletedAtCol >= 0 && obj.DeletedAt) return false;
    return true;
  });
}

/**
 * Obtiene una fila por ID (columna A).
 * Excluye registros soft-deleted.
 */
function _getById(sheetName, id) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idCol = headers.indexOf('ID');
  if (idCol === -1) return null;

  const deletedAtCol = headers.indexOf('DeletedAt');
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      // Skip soft-deleted
      if (deletedAtCol >= 0 && data[i][deletedAtCol]) return null;
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
  const deletedAtCol = headers.indexOf('DeletedAt');

  const toObj = (row) => {
    const obj = {};
    headers.forEach((header, j) => { obj[header] = row[j]; });
    return obj;
  };

  const isNotDeleted = (row) => {
    if (deletedAtCol >= 0 && row[deletedAtCol]) return false;
    return true;
  };

  // Callback pattern: (row) => boolean
  if (typeof filter === 'function') {
    return data.filter(row => isNotDeleted(row) && filter(toObj(row))).map(toObj);
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
  }).filter(row => {
    // Exclude soft-deleted records
    if (deletedAtCol >= 0 && row[deletedAtCol]) return false;
    return true;
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
 * Soft delete: marca un registro como eliminado sin borrarlo.
 * Los queries automáticos lo excluyen.
 */
function _softDelete(sheetName, id) {
  return _update(sheetName, id, { DeletedAt: new Date().toISOString() });
}

/**
 * Dependency check: verifica si una entidad tiene dependientes antes de borrar.
 * Retorna { canDelete: boolean, dependencies: Array<{sheet, count}> }
 */
function _checkDependencies(entityType, entityId) {
  const dependencies = [];
  
  // Map entity type to its ID prefix and the sheets that reference it
  const _DEP_MAP = {
    'Driver': {
      idPrefix: 'DRV',
      references: [
        { sheet: 'Services', field: 'DriverID' },
        { sheet: 'DriverReports', field: 'DriverID' },
        { sheet: 'DriverAdvances', field: 'DriverID' },
        { sheet: 'RapportinoDrivers', field: 'DriverID' },
        { sheet: 'SupplierRates', field: 'SupplierID', condition: row => row.SupplierType === 'internal_driver' },
        { sheet: 'DriverLinks', field: 'DriverID' },
        { sheet: 'DriverLinkResponses', field: 'DriverID' }
      ]
    },
    'Client': {
      idPrefix: 'CLI',
      references: [
        { sheet: 'Projects', field: 'ClientID' },
        { sheet: 'RateCards', field: 'ClientID' },
        { sheet: 'RapportinoClients', field: 'ClientID' }
      ]
    },
    'Project': {
      idPrefix: 'PRJ',
      references: [
        { sheet: 'Services', field: 'ProjectID' },
        { sheet: 'RateCards', field: 'ProjectID' },
        { sheet: 'RapportinoClients', field: 'ProjectID' },
        { sheet: 'RapportinoDrivers', field: 'ProjectID' },
        { sheet: 'RapportinoCollaborators', field: 'ProjectID' },
        { sheet: 'SupplierRates', field: 'ProjectID' }
      ]
    },
    'Collaborator': {
      idPrefix: 'COL',
      references: [
        { sheet: 'Drivers', field: 'CollaboratorID' },
        { sheet: 'SupplierRates', field: 'SupplierID', condition: row => row.SupplierType === 'collaborator' },
        { sheet: 'RapportinoCollaborators', field: 'CollaboratorID' }
      ]
    },
    'Vehicle': {
      idPrefix: 'VEH',
      references: [
        { sheet: 'Services', field: 'VehicleID' }
      ]
    }
  };
  
  const config = _DEP_MAP[entityType];
  if (!config) return { canDelete: true, dependencies: [] };
  
  for (const ref of config.references) {
    try {
      let rows = _find(ref.sheet, { [ref.field]: entityId });
      if (ref.condition) {
        rows = rows.filter(ref.condition);
      }
      if (rows.length > 0) {
        dependencies.push({ sheet: ref.sheet, count: rows.length });
      }
    } catch (e) {
      // Sheet might not exist — skip
    }
  }
  
  return {
    canDelete: dependencies.length === 0,
    dependencies
  };
}

/**
 * Safe delete: verifica dependencias y hace soft delete.
 * Retorna { success, deleted, dependencies? }
 */
function _safeDelete(entityType, entityId) {
  const check = _checkDependencies(entityType, entityId);
  
  if (!check.canDelete) {
    return {
      success: false,
      deleted: false,
      dependencies: check.dependencies,
      error: 'Cannot delete: ' + check.dependencies.map(d => d.sheet + ' (' + d.count + ')').join(', ')
    };
  }
  
  // Find the sheet name for this entity type
  const sheetMap = {
    'Driver': 'Drivers',
    'Client': 'Clients',
    'Project': 'Projects',
    'Collaborator': 'Collaborators',
    'Vehicle': 'Vehicles'
  };
  
  const sheetName = sheetMap[entityType];
  if (!sheetName) return { success: false, error: 'Unknown entity type: ' + entityType };
  
  _softDelete(sheetName, entityId);
  return { success: true, deleted: true };
}

/**
 * Elimina una fila por ID (PHYSICAL — only for audit/temp data).
 * For normal entities, use _safeDelete or _softDelete instead.
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
