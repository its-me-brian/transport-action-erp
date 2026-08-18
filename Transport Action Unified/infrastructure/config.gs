// ============================================================================
// CONFIG.GS — Helpers y configuración
// ============================================================================
// Constantes (DB_SHEET_ID, SHEETS, etc.) están en _constants.gs (se carga primero)

// Helper para obtener hoja
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}
