// ============================================================================
// MIGRATION.GS — Schema versioning and migration runner (docs/14-MIGRATIONS.md)
// ============================================================================

/**
 * Get current schema version from ScriptProperties.
 * @returns {number} Current version (0 if not set)
 */
function _getSchemaVersion() {
  const props = PropertiesService.getScriptProperties();
  return parseInt(props.getProperty('schemaVersion') || '0');
}

/**
 * Set schema version in ScriptProperties.
 * @param {number} version - Version to set
 */
function _setSchemaVersion(version) {
  PropertiesService.getScriptProperties().setProperty('schemaVersion', version.toString());
}

/**
 * Run all pending migrations in order (docs/14-MIGRATIONS.md).
 * Each migration is idempotent — safe to run multiple times.
 * Called on every doGet/doPost (lightweight — skips if already at latest version).
 */
function runMigrations() {
  const currentVersion = _getSchemaVersion();
  
  const migrations = [
    { version: 1, fn: migrate_001_initial_schema },
    { version: 2, fn: migrate_002_add_service_cost_fields },
    { version: 3, fn: migrate_003_driverlinks_auditlog_v2 },
    { version: 4, fn: migrate_004_provider_economy_model },
    { version: 5, fn: migrate_005_project_transport_company },
    { version: 6, fn: migrate_006_infra_tables },
    { version: 7, fn: migrate_007_invoice_items_serviceid },
    { version: 8, fn: migrate_008_soft_delete_all_entities },
    { version: 9, fn: migrate_009_soft_delete_remaining_entities },
    { version: 10, fn: migrate_010_fix_schema_gaps },
  ];

  const pending = migrations
    .filter(m => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) return;

  pending.forEach(m => {
    m.fn();
    _setSchemaVersion(m.version);
    Logger.log('Migration ' + m.version + ' applied');
  });
}

// ============================================================================
// MIGRATION 001 — Initial schema (sets version to 1, no-op if already set)
// ============================================================================

function migrate_001_initial_schema() {
  // Initial schema — all sheets are created by setup.gs.
  // This migration adds the VehiclePreferred column to Drivers sheet.
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  const sh = ss.getSheetByName('Drivers');
  if (!sh) {
    Logger.log('Migration 001: Drivers sheet not found, skipping');
    return;
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const headerMap = {};
  headers.forEach((h, i) => { headerMap[h] = i + 1; });

  if (!headerMap['VehiclePreferred']) {
    const insertPos = headerMap['IBAN'] ? headerMap['IBAN'] + 1 : sh.getLastColumn() + 1;
    sh.insertColumnAfter(insertPos > 1 ? insertPos - 1 : sh.getLastColumn());
    sh.getRange(1, insertPos).setValue('VehiclePreferred').setFontWeight('bold').setBackground('#2E7D32').setFontColor('#fff');
    Logger.log('Migration 001: Added VehiclePreferred column to Drivers');
  } else {
    Logger.log('Migration 001: VehiclePreferred column already exists');
  }
}

// ============================================================================
// MIGRATION 004 — Provider economy model (Collaborator, SupplierRate, dual economy)
// Adds new columns to existing sheets and creates new sheets if missing.
// Idempotent — safe to run multiple times.
// ============================================================================

function migrate_004_provider_economy_model() {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);

  // Helper: get header map
  function _headerMap(sh) {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const map = {};
    headers.forEach((h, i) => { map[h] = i + 1; });
    return map;
  }

  // Helper: add column after an existing one if missing
  function _ensureColumn(sh, headerMap, colName, after, color) {
    if (headerMap[colName]) return false;
    const afterCol = headerMap[after] || sh.getLastColumn();
    sh.insertColumnAfter(afterCol);
    sh.getRange(1, afterCol + 1)
      .setValue(colName)
      .setFontWeight('bold')
      .setBackground(color || '#455A64')
      .setFontColor('#fff');
    Logger.log('Migration 004: Added ' + colName + ' column to ' + sh.getName());
    return true;
  }

  // --- Drivers: add CollaboratorID after Type ---
  const shDrivers = ss.getSheetByName('Drivers');
  if (shDrivers) {
    const hm = _headerMap(shDrivers);
    _ensureColumn(shDrivers, hm, 'CollaboratorID', 'Type', '#2E7D32');
    // Shift phone number formats if CollaboratorID inserted (col D). Columns now shift right automatically.
  } else {
    Logger.log('Migration 004: Drivers sheet not found, skipping');
  }

  // --- Services: add provider/economy fields ---
  const shServices = ss.getSheetByName('Services');
  if (shServices) {
    const hm = _headerMap(shServices);
    const svcCols = [
      { name: 'ProviderType', after: 'DiariaType' },
      { name: 'ProviderID', after: 'ProviderType' },
      { name: 'ServiceType', after: 'ProviderID' },
      { name: 'SourceType', after: 'ServiceType' },
      { name: 'SourceReference', after: 'SourceType' },
      { name: 'VehicleType', after: 'SourceReference' },
    ];
    svcCols.forEach(c => _ensureColumn(shServices, hm, c.name, c.after, '#E65100'));
  } else {
    Logger.log('Migration 004: Services sheet not found, skipping');
  }

  // --- RateCards: add ServiceType ---
  const shRateCards = ss.getSheetByName('RateCards');
  if (shRateCards) {
    const hm = _headerMap(shRateCards);
    _ensureColumn(shRateCards, hm, 'ServiceType', 'VehicleType', '#E65100');
  } else {
    Logger.log('Migration 004: RateCards sheet not found, skipping');
  }

  // --- Create new sheets if missing ---
  function _ensureSheet(sheetName, headers, color) {
    let sh = ss.getSheetByName(sheetName);
    if (sh) return sh;
    sh = ss.insertSheet(sheetName);
    sh.setTabColor(color || '#455A64');
    sh.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground(color || '#455A64')
      .setFontColor('#fff');
    Logger.log('Migration 004: Created sheet ' + sheetName);
    return sh;
  }

  _ensureSheet('Collaborators', ['ID', 'Name', 'VAT', 'Address', 'Phone', 'Email', 'PaymentTerms', 'Active', 'Notes', 'OperatingCompany', 'CreatedAt', 'UpdatedAt'], '#4A148C');
  _ensureSheet('SupplierRates', ['ID', 'SupplierType', 'SupplierID', 'ProjectID', 'ServiceType', 'VehicleType', 'BaseRate', 'IncludedKm', 'IncludedHours', 'ExtraKmRate', 'ExtraHourRate', 'DiariaPiena', 'DiariaMezza', 'NightExtra', 'HolidayExtra', 'WaitHourRate', 'ValidFrom', 'ValidTo', 'Active', 'OperatingCompany', 'CreatedAt', 'UpdatedAt'], '#7B1FA2');
  _ensureSheet('Reconciliation', ['ID', 'ServiceID', 'ProjectID', 'ProductionStartTime', 'ProductionEndTime', 'ProductionKm', 'ProductionDiaria', 'ProductionFestivo', 'ProductionNotturno', 'DriverStartTime', 'DriverEndTime', 'DriverKm', 'DriverDiaria', 'DriverFestivo', 'DriverNotturno', 'FinalStartTime', 'FinalEndTime', 'FinalKm', 'FinalDiaria', 'FinalFestivo', 'FinalNotturno', 'Status', 'ResolvedBy', 'ResolvedAt', 'ResolutionNotes', 'CreatedAt', 'UpdatedAt'], '#880E4F');
  _ensureSheet('RapportinoCollaborators', ['ID', 'ProjectID', 'CollaboratorID', 'PeriodType', 'PeriodStart', 'PeriodEnd', 'Status', 'Notes', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'SentAt', 'AcceptedAt', 'PaidAt'], '#6A1B9A');
  _ensureSheet('RapportinoCollaboratorItems', ['ID', 'RapportinoCollaboratorID', 'ServiceID', 'DriverID', 'Amount', 'LockedAmount', 'CreatedAt'], '#8E24AA');
}

// ============================================================================
// MIGRATION 005 — Add TransportCompany to Projects sheet
// ============================================================================

function migrate_005_project_transport_company() {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  const sh = ss.getSheetByName('Projects');
  if (!sh) {
    Logger.log('Migration 005: Projects sheet not found, skipping');
    return;
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const headerMap = {};
  headers.forEach((h, i) => { headerMap[h] = i + 1; });

  if (!headerMap['TransportCompany']) {
    // Insert after Name (column C) to match new schema order
    const afterCol = headerMap['Name'] || 3;
    sh.insertColumnAfter(afterCol);
    sh.getRange(1, afterCol + 1).setValue('TransportCompany').setFontWeight('bold').setBackground('#1B5E20').setFontColor('#fff');
    Logger.log('Migration 005: Added TransportCompany column to Projects');
  } else {
    Logger.log('Migration 005: TransportCompany column already exists');
  }
}

// ============================================================================
// END MIGRATION.GS
// ============================================================================

// ============================================================================
// MIGRATION 006 — Infrastructure tables (DriverLinkEvents, DriverReportInbox, Presence)
// ============================================================================

function migrate_006_infra_tables() {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);

  function _ensureSheet(sheetName, headers, color) {
    let sh = ss.getSheetByName(sheetName);
    if (sh) return sh;
    sh = ss.insertSheet(sheetName);
    sh.setTabColor(color || '#455A64');
    sh.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground(color || '#455A64')
      .setFontColor('#fff');
    Logger.log('Migration 006: Created sheet ' + sheetName);
    return sh;
  }

  // DriverLinks + DriverLinkResponses — REQUIRED for driver link system.
  // Without headers, appendRow writes to row 1 and getDriverLinkByToken
  // treats row 0 as headers, skipping the only data row → "Link no valido".
  // Also handles the case where sheets exist but were created without headers
  // (e.g., by getSheet() auto-creating before migrations existed).
  var DL_HEADERS = ['Token', 'DriverID', 'ProjectID', 'DateFrom', 'DateTo', 'Status', 'FieldsSchema', 'CreatedAt', 'ExpiresAt'];
  var DLR_HEADERS = ['ID', 'Token', 'DriverID', 'ProjectID', 'ServiceID', 'DataServizio', 'TipoServizio', 'OrarioInizio', 'OrarioFine', 'Descrizione', 'Clienti', 'Targa', 'KmTotali', 'Diaria', 'Note', 'SubmittedAt'];

  function _ensureSheetWithHeaders(sheetName, headers, color) {
    let sh = ss.getSheetByName(sheetName);
    if (!sh) {
      sh = ss.insertSheet(sheetName);
      sh.setTabColor(color || '#455A64');
      sh.getRange(1, 1, 1, headers.length)
        .setValues([headers])
        .setFontWeight('bold')
        .setBackground(color || '#455A64')
        .setFontColor('#fff');
      Logger.log('Migration 006: Created sheet ' + sheetName + ' with headers');
      return sh;
    }
    // Sheet exists — check if it has the expected header row
    var lastCol = sh.getLastColumn();
    var firstRow = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    var hasExpectedHeader = firstRow.indexOf(headers[0]) !== -1;
    if (!hasExpectedHeader && sh.getLastRow() === 0) {
      // Sheet exists but is completely empty — add headers
      sh.getRange(1, 1, 1, headers.length)
        .setValues([headers])
        .setFontWeight('bold')
        .setBackground(color || '#455A64')
        .setFontColor('#fff');
      Logger.log('Migration 006: Added headers to empty sheet ' + sheetName);
    } else if (!hasExpectedHeader && sh.getLastRow() > 0) {
      // Sheet has data but no headers — insert header row at top
      sh.insertRowBefore(1);
      sh.getRange(1, 1, 1, headers.length)
        .setValues([headers])
        .setFontWeight('bold')
        .setBackground(color || '#455A64')
        .setFontColor('#fff');
      Logger.log('Migration 006: Inserted header row into existing sheet ' + sheetName);
    }
    return sh;
  }

  _ensureSheetWithHeaders('DriverLinks', DL_HEADERS, '#FF6F00');
  _ensureSheetWithHeaders('DriverLinkResponses', DLR_HEADERS, '#E65100');
  _ensureSheet('DriverLinkEvents', ['ID', 'Token', 'EventType', 'Metadata', 'CreatedAt'], '#004D40');
  _ensureSheet('DriverReportInbox', ['ID', 'Source', 'Channel', 'DriverID', 'DriverName', 'ServiceDate', 'StartTime', 'EndTime', 'KmTotal', 'KmExtra', 'HoursExtra', 'Diaria', 'IsFestivo', 'IsNotturno', 'Parking', 'Tolls', 'Fuel', 'Notes', 'Status', 'NormalizedData', 'ServiceID', 'CorrelationID', 'ReviewedBy', 'ReviewedAt', 'RejectionReason', 'CreatedAt', 'UpdatedAt'], '#BF360C');
  _ensureSheet('Presence', ['UserID', 'SessionID', 'DisplayName', 'Role', 'LastSeen', 'UserAgent', 'IPAddress', 'IsActive'], '#37474F');

  // --- Ensure core entity sheets exist (for pre-existing installations) ---
  _ensureSheet('Users', ['ID', 'Username', 'Email', 'Phone', 'Password', 'Role', 'Status', 'DriverID', 'CreatedAt', 'UpdatedAt'], '#1565C0');
  _ensureSheet('OperatingCompany', ['ID', 'Name', 'Address', 'Phone', 'Email', 'VAT', 'IBAN', 'Status', 'Notes', 'CreatedAt', 'UpdatedAt'], '#00695C');
}

// ============================================================================
// MIGRATION 002 — Add cost fields to Services sheet
// ============================================================================

function migrate_002_add_service_cost_fields() {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);

  // --- Services sheet ---
  const shServices = ss.getSheetByName('Services');
  if (shServices) {
    const headers = shServices.getRange(1, 1, 1, shServices.getLastColumn()).getValues()[0];
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i + 1; });

    const newServiceColumns = [
      { name: 'StartTime', after: 'Notes' },
      { name: 'EndTime', after: 'StartTime' },
      { name: 'KmTotal', after: 'EndTime' },
      { name: 'HasDiaria', after: 'KmTotal' },
      { name: 'IsFestivo', after: 'HasDiaria' },
      { name: 'IsNotturno', after: 'IsFestivo' },
      { name: 'DiariaType', after: 'IsNotturno' }
    ];

    newServiceColumns.forEach(col => {
      if (!headerMap[col.name]) {
        const afterCol = headerMap[col.after] || shServices.getLastColumn();
        shServices.insertColumnAfter(afterCol);
        shServices.getRange(1, afterCol + 1).setValue(col.name).setFontWeight('bold').setBackground('#1565C0').setFontColor('#fff');
        Logger.log('Migration 002: Added ' + col.name + ' column to Services');
      }
    });
  } else {
    Logger.log('Migration 002: Services sheet not found, skipping');
  }

  // --- DriverReports sheet ---
  const shReports = ss.getSheetByName('DriverReports');
  if (shReports) {
    const headers = shReports.getRange(1, 1, 1, shReports.getLastColumn()).getValues()[0];
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i + 1; });

    const newReportColumns = [
      { name: 'StartTime', after: 'PreviousReportID' },
      { name: 'EndTime', after: 'StartTime' },
      { name: 'KmTotal', after: 'EndTime' },
      { name: 'HasDiaria', after: 'KmTotal' },
      { name: 'IsFestivo', after: 'HasDiaria' },
      { name: 'IsNotturno', after: 'IsFestivo' },
      { name: 'DiariaType', after: 'IsNotturno' }
    ];

    newReportColumns.forEach(col => {
      if (!headerMap[col.name]) {
        const afterCol = headerMap[col.after] || shReports.getLastColumn();
        shReports.insertColumnAfter(afterCol);
        shReports.getRange(1, afterCol + 1).setValue(col.name).setFontWeight('bold').setBackground('#1565C0').setFontColor('#fff');
        Logger.log('Migration 002: Added ' + col.name + ' column to DriverReports');
      }
    });
  } else {
    Logger.log('Migration 002: DriverReports sheet not found, skipping');
  }
}

// ============================================================================
// MIGRATION 003 — DriverLinks v2 (DateFrom/DateTo/FieldsSchema) + AuditLog v2
// ============================================================================

function migrate_003_driverlinks_auditlog_v2() {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);

  // --- DriverLinks: add DateFrom, DateTo, FieldsSchema; migrate Date -> DateFrom ---
  const shDL = ss.getSheetByName('DriverLinks');
  if (shDL) {
    const headers = shDL.getRange(1, 1, 1, shDL.getLastColumn()).getValues()[0];
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i + 1; });

    // If old schema has 'Date' column, rename it to 'DateFrom' and add 'DateTo' + 'FieldsSchema'
    if (headerMap['Date'] && !headerMap['DateFrom']) {
      // Rename 'Date' -> 'DateFrom'
      shDL.getRange(1, headerMap['Date']).setValue('DateFrom');
      Logger.log('Migration 003: Renamed DriverLinks.Date -> DateFrom');

      // Add 'DateTo' after DateFrom
      shDL.insertColumnAfter(headerMap['DateFrom']);
      shDL.getRange(1, headerMap['DateFrom'] + 1).setValue('DateTo').setFontWeight('bold').setBackground('#FF6F00').setFontColor('#fff');
      Logger.log('Migration 003: Added DateTo column to DriverLinks');

      // Add 'FieldsSchema' after DateTo
      shDL.insertColumnAfter(headerMap['DateFrom'] + 1);
      shDL.getRange(1, headerMap['DateFrom'] + 2).setValue('FieldsSchema').setFontWeight('bold').setBackground('#FF6F00').setFontColor('#fff');
      Logger.log('Migration 003: Added FieldsSchema column to DriverLinks');
    } else if (!headerMap['DateFrom']) {
      // No 'Date' column at all — add DateFrom, DateTo, FieldsSchema after ProjectID
      const afterCol = headerMap['ProjectID'] || headerMap['DriverID'] || 2;
      shDL.insertColumns(afterCol + 1, 3);
      shDL.getRange(1, afterCol + 1).setValue('DateFrom').setFontWeight('bold').setBackground('#FF6F00').setFontColor('#fff');
      shDL.getRange(1, afterCol + 2).setValue('DateTo').setFontWeight('bold').setBackground('#FF6F00').setFontColor('#fff');
      shDL.getRange(1, afterCol + 3).setValue('FieldsSchema').setFontWeight('bold').setBackground('#FF6F00').setFontColor('#fff');
      Logger.log('Migration 003: Added DateFrom/DateTo/FieldsSchema to DriverLinks');
    } else {
      Logger.log('Migration 003: DriverLinks already has DateFrom column');
    }
  } else {
    Logger.log('Migration 003: DriverLinks sheet not found, skipping');
  }

  // --- AuditLog: add Source, Channel, CorrelationID ---
  const shAL = ss.getSheetByName('AuditLog');
  if (shAL) {
    const headers = shAL.getRange(1, 1, 1, shAL.getLastColumn()).getValues()[0];
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i + 1; });

    const auditNewCols = [
      { name: 'Source', after: 'User' },
      { name: 'Channel', after: 'Source' },
      { name: 'CorrelationID', after: 'Channel' },
    ];

    auditNewCols.forEach(col => {
      if (!headerMap[col.name]) {
        const afterCol = headerMap[col.after] || shAL.getLastColumn();
        shAL.insertColumnAfter(afterCol);
        shAL.getRange(1, afterCol + 1).setValue(col.name).setFontWeight('bold').setBackground('#B71C1C').setFontColor('#fff');
        Logger.log('Migration 003: Added ' + col.name + ' column to AuditLog');
      }
    });
  } else {
    Logger.log('Migration 003: AuditLog sheet not found, skipping');
  }
}

// ============================================================================
// MIGRATION 007 — Add ServiceID to InvoiceItems
// ============================================================================

function migrate_007_invoice_items_serviceid() {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  const sh = ss.getSheetByName('InvoiceItems');
  if (!sh) {
    Logger.log('Migration 007: InvoiceItems sheet not found, skipping');
    return;
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const headerMap = {};
  headers.forEach((h, i) => { headerMap[h] = i + 1; });

  // Add ServiceID column if missing
  if (!headerMap['ServiceID']) {
    const afterCol = headerMap['RapportinoClientID'] || headerMap['InvoiceID'] || sh.getLastColumn();
    sh.insertColumnAfter(afterCol);
    sh.getRange(1, afterCol + 1).setValue('ServiceID').setFontWeight('bold').setBackground('#00838F').setFontColor('#fff');
    Logger.log('Migration 007: Added ServiceID column to InvoiceItems');
    
    // Try to populate ServiceID from RapportinoClientID -> RapportinoItem -> ServiceID
    if (headerMap['RapportinoClientID']) {
      const rapportinoItems = getSheet('RapportinoItems');
      if (rapportinoItems) {
        const rData = rapportinoItems.getDataRange().getValues();
        const rHeaders = rData[0];
        const rRapportinoCol = rHeaders.indexOf('RapportinoClientID');
        const rServiceCol = rHeaders.indexOf('ServiceID');
        
        if (rRapportinoCol !== -1 && rServiceCol !== -1) {
          const data = sh.getDataRange().getValues();
          let populated = 0;
          
          for (let i = 1; i < data.length; i++) {
            const rapportinoClientId = data[i][headerMap['RapportinoClientID'] - 1];
            if (!rapportinoClientId) continue;
            
            // Find RapportinoItem with this RapportinoClientID
            for (let j = 1; j < rData.length; j++) {
              if (String(rData[j][rRapportinoCol]) === String(rapportinoClientId)) {
                const serviceId = rData[j][rServiceCol];
                if (serviceId) {
                  sh.getRange(i + 1, afterCol + 1).setValue(serviceId);
                  populated++;
                }
                break;
              }
            }
          }
          Logger.log('Migration 007: Populated ServiceID for ' + populated + ' InvoiceItems');
        }
      }
    }
  } else {
    Logger.log('Migration 007: ServiceID column already exists');
  }
}

// ============================================================================
// MIGRATION 008 — Add DeletedAt column to all entities for soft delete
// Converts physical deletes to soft deletes across the entire data model.
// Idempotent — safe to run multiple times.
// ============================================================================

function migrate_008_soft_delete_all_entities() {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);

  function _headerMap(sh) {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const map = {};
    headers.forEach((h, i) => { map[h] = i + 1; });
    return map;
  }

  function _ensureColumn(sh, headerMap, colName, after, color) {
    if (headerMap[colName]) return false;
    const afterCol = headerMap[after] || sh.getLastColumn();
    sh.insertColumnAfter(afterCol);
    sh.getRange(1, afterCol + 1)
      .setValue(colName)
      .setFontWeight('bold')
      .setBackground(color || '#455A64')
      .setFontColor('#fff');
    Logger.log('Migration 008: Added ' + colName + ' column to ' + sh.getName());
    return true;
  }

  // Sheets that need DeletedAt for soft delete
  const sheetsToAddDeletedAt = [
    { name: 'Services', after: 'UpdatedAt', color: '#FF6F00' },
    { name: 'RateCards', after: 'UpdatedAt', color: '#E65100' },
    { name: 'Contacts', after: 'UpdatedAt', color: '#1565C0' },
    { name: 'Changes', after: 'UpdatedAt', color: '#E65100' },
    { name: 'Documents', after: 'CreatedAt', color: '#455A64' },
    { name: 'DriverRates', after: 'UpdatedAt', color: '#004D40' },
    { name: 'SupplierRates', after: 'UpdatedAt', color: '#7B1FA2' },
    { name: 'ServiceRevenueBreakdown', after: 'CreatedAt', color: '#1B5E20' },
    { name: 'ServiceCostBreakdown', after: 'CreatedAt', color: '#B71C1C' },
    { name: 'RapportinoItems', after: 'CreatedAt', color: '#6A1B9A' },
    { name: 'RapportinoCollaborators', after: 'UpdatedAt', color: '#6A1B9A' },
    { name: 'RapportinoCollaboratorItems', after: 'CreatedAt', color: '#8E24AA' },
    { name: 'InvoiceItems', after: 'CreatedAt', color: '#00838F' },
    { name: 'Users', after: 'UpdatedAt', color: '#D32F2F' },
  ];

  for (const config of sheetsToAddDeletedAt) {
    const sh = ss.getSheetByName(config.name);
    if (!sh) {
      Logger.log('Migration 008: ' + config.name + ' sheet not found, skipping');
      continue;
    }
    const hm = _headerMap(sh);
    _ensureColumn(sh, hm, 'DeletedAt', config.after, config.color);
  }
}

// ============================================================================
// MIGRATION 009 — Add DeletedAt to remaining entity sheets (soft delete)
// Migration 008 missed Drivers, Collaborators, Vehicles, Projects, Clients.
// These entities use _safeDelete -> _softDelete, which needs DeletedAt column.
// ============================================================================

function migrate_009_soft_delete_remaining_entities() {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);

  function _headerMap(sh) {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const map = {};
    headers.forEach((h, i) => { map[h] = i + 1; });
    return map;
  }

  function _ensureColumn(sh, headerMap, colName, after, color) {
    if (headerMap[colName]) return false;
    const afterCol = headerMap[after] || sh.getLastColumn();
    sh.insertColumnAfter(afterCol);
    sh.getRange(1, afterCol + 1)
      .setValue(colName)
      .setFontWeight('bold')
      .setBackground(color || '#455A64')
      .setFontColor('#fff');
    Logger.log('Migration 009: Added ' + colName + ' column to ' + sh.getName());
    return true;
  }

  // These 5 entities use _safeDelete -> _softDelete but Migration 008 missed them
  const sheetsToAddDeletedAt = [
    { name: 'Drivers', after: 'UpdatedAt', color: '#4CAF50' },
    { name: 'Collaborators', after: 'UpdatedAt', color: '#4A148C' },
    { name: 'Vehicles', after: 'UpdatedAt', color: '#006064' },
    { name: 'Projects', after: 'UpdatedAt', color: '#1B5E20' },
    { name: 'Clients', after: 'UpdatedAt', color: '#0D47A1' },
  ];

  for (const config of sheetsToAddDeletedAt) {
    const sh = ss.getSheetByName(config.name);
    if (!sh) {
      Logger.log('Migration 009: ' + config.name + ' sheet not found, skipping');
      continue;
    }
    const hm = _headerMap(sh);
    _ensureColumn(sh, hm, 'DeletedAt', config.after, config.color);
  }
}

// ============================================================================
// MIGRATION 010 — Fix schema gaps from audit
// Adds missing columns that backend writes but setup.gs didn't define.
// ============================================================================

function migrate_010_fix_schema_gaps() {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);

  function _headerMap(sh) {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const map = {};
    headers.forEach((h, i) => { map[h] = i + 1; });
    return map;
  }

  function _ensureColumn(sh, headerMap, colName, after, color) {
    if (headerMap[colName]) return false;
    const afterCol = headerMap[after] || sh.getLastColumn();
    sh.insertColumnAfter(afterCol);
    sh.getRange(1, afterCol + 1)
      .setValue(colName)
      .setFontWeight('bold')
      .setBackground(color || '#455A64')
      .setFontColor('#fff');
    Logger.log('Migration 010: Added ' + colName + ' column to ' + sh.getName());
    return true;
  }

  // --- Drivers: DriverOwnership (after Type), LastImportDate (after Source) ---
  var shDrivers = ss.getSheetByName('Drivers');
  if (shDrivers) {
    var hm = _headerMap(shDrivers);
    _ensureColumn(shDrivers, hm, 'DriverOwnership', 'Type', '#4CAF50');
    hm = _headerMap(shDrivers);
    _ensureColumn(shDrivers, hm, 'LastImportDate', 'Source', '#4CAF50');
  }

  // --- DriverAdvances: ServiceID (after ProjectID), UpdatedAt (after CreatedAt) ---
  var shDA = ss.getSheetByName('DriverAdvances');
  if (shDA) {
    var hm = _headerMap(shDA);
    _ensureColumn(shDA, hm, 'ServiceID', 'ProjectID', '#B71C1C');
    hm = _headerMap(shDA);
    _ensureColumn(shDA, hm, 'UpdatedAt', 'CreatedAt', '#B71C1C');
  }

  // --- TransportLists: FileURL (after Notes) ---
  var shTL = ss.getSheetByName('TransportLists');
  if (shTL) {
    var hm = _headerMap(shTL);
    _ensureColumn(shTL, hm, 'FileURL', 'Notes', '#2196F3');
  }

  // --- Services: OriginalTransportDate, PassengersList (after DropoffMapsUrl) ---
  var shSvc = ss.getSheetByName('Services');
  if (shSvc) {
    var hm = _headerMap(shSvc);
    _ensureColumn(shSvc, hm, 'OriginalTransportDate', 'DropoffMapsUrl', '#FF6F00');
    hm = _headerMap(shSvc);
    _ensureColumn(shSvc, hm, 'PassengersList', 'OriginalTransportDate', '#FF6F00');
  }

  // --- Expenses: Notes (after CreatedBy) ---
  var shExp = ss.getSheetByName('Expenses');
  if (shExp) {
    var hm = _headerMap(shExp);
    _ensureColumn(shExp, hm, 'Notes', 'CreatedBy', '#880E4F');
  }

  // --- Payments: VoidedAt, VoidReason (after ReconciledAt) ---
  var shPay = ss.getSheetByName('Payments');
  if (shPay) {
    var hm = _headerMap(shPay);
    _ensureColumn(shPay, hm, 'VoidedAt', 'ReconciledAt', '#00695C');
    hm = _headerMap(shPay);
    _ensureColumn(shPay, hm, 'VoidReason', 'VoidedAt', '#00695C');
  }

  // --- RapportinoClients: RejectedAt, RejectedReason (after SentAt) ---
  var shRC = ss.getSheetByName('RapportinoClients');
  if (shRC) {
    var hm = _headerMap(shRC);
    _ensureColumn(shRC, hm, 'RejectedAt', 'SentAt', '#4A148C');
    hm = _headerMap(shRC);
    _ensureColumn(shRC, hm, 'RejectedReason', 'RejectedAt', '#4A148C');
  }

  // --- RapportinoDrivers: RejectedAt, RejectedReason (after PaidAt) ---
  var shRD = ss.getSheetByName('RapportinoDrivers');
  if (shRD) {
    var hm = _headerMap(shRD);
    _ensureColumn(shRD, hm, 'RejectedAt', 'PaidAt', '#7B1FA2');
    hm = _headerMap(shRD);
    _ensureColumn(shRD, hm, 'RejectedReason', 'RejectedAt', '#7B1FA2');
  }
}