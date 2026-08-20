// ============================================================================
// MIGRATION.GS — Funciones de migración para agregar columnas a sheets existentes
// ============================================================================

/**
 * Asegura que una hoja tenga todas las columnas requeridas.
 * Agrega columnas faltantes al final de la hoja (sin afectar datos existentes).
 * 
 * @param {string} sheetName - Nombre de la hoja
 * @param {string[]} requiredColumns - Array de nombres de columnas requeridas
 * @returns {Object} { added: string[], existing: string[] }
 */
function ensureSheetColumns(sheetName, requiredColumns) {
  const sheet = getSheet(sheetName);
  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existingSet = new Set(existingHeaders.map(h => String(h).trim()));
  
  const added = [];
  const existing = [];
  
  for (const col of requiredColumns) {
    if (existingSet.has(col)) {
      existing.push(col);
    } else {
      // Agregar al final
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(col);
      added.push(col);
      Logger.log('[MIGRATION] Added column "' + col + '" to sheet "' + sheetName + '"');
    }
  }
  
  return { added, existing };
}

/**
 * Migra todas las hojas del sistema con sus columnas requeridas.
 * Llamar una vez después de deploy para asegurar que sheets tengan las columnas nuevas.
 * @returns {Object} Resumen de migraciones
 */
function migrateAllSheets() {
  const results = {};
  
  // Drivers — columnas requeridas (incluye nuevas de Módulo 1)
  results.Drivers = ensureSheetColumns(SHEETS.Drivers, [
    'ID', 'Name', 'Type', 'DriverOwnership', 'CollaboratorID',
    'Phone', 'WhatsApp', 'Email', 'IBAN', 'VehiclePreferred',
    'LicenseType', 'LicenseExpiry', 'Status', 'OperatingCompany',
    'Notes', 'Source', 'LastImportDate', 'LastUsed', 'TotalRides',
    'CreatedAt', 'UpdatedAt'
  ]);
  
  // Services — columnas requeridas (incluye nuevas de Módulo 1)
  results.Services = ensureSheetColumns(SHEETS.Services, [
    'ID', 'ProjectID', 'TransportListID', 'Date', 'Time',
    'Production', 'Section', 'PassengerName', 'PassengerRole',
    'PassengerPhone', 'PassengerDepartment',
    'PickupLines', 'DropoffLines', 'FlightInfo',
    'PickupMapsUrl', 'DropoffMapsUrl',
    'OriginalTransportDate', 'PassengersList',
    'Notes', 'DriverID', 'VehicleID',
    'OperationalStatus', 'FinancialStatus',
    'EstimatedRevenue', 'EstimatedCost', 'OperatingCompany',
    'Normalized', 'StartTime', 'EndTime', 'KmTotal',
    'HasDiaria', 'IsFestivo', 'IsNotturno', 'DiariaType',
    'ProviderType', 'ProviderID', 'ServiceType',
    'SourceType', 'SourceReference', 'VehicleType',
    'CreatedAt', 'UpdatedAt'
  ]);
  
  return results;
}
