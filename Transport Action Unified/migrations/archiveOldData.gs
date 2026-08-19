// ============================================================================
// ARCHIVEOLDDATA.GS — Archivado de datos históricos
// ============================================================================
//
// Resolución de brecha: Escalabilidad
// Google Sheets tiene un límite de ~10 millones de celdas por hoja.
// A medida que el ERP acumula servicios, las queries se vuelven lentas.
// Archivar servicios completados/facturados de más de 365 días
// mantiene la hoja activa liviana y las queries rápidas.
//
// Este script:
// 1. Identifica servicios con estado 'Completado' o 'Facturado' + fecha > 365 días
// 2. Crea la hoja 'Services_Archive' si no existe
// 3. Copia esas filas al archivo
// 4. Elimina las filas originales de la hoja activa
//
// SEGURIDAD: Este script NO borra datos permanentemente —
// los mueve a una hoja separada que podeés consultar cuando necesites.
// ============================================================================

/**
 * Archiva servicios completados/facturados con más de 365 días.
 *
 * @param {number} [daysThreshold=365] - Días de antigüedad para archivar
 * @returns {{ archived: number, errors: string[] }} - Resumen de la operación
 *
 * @example
 *   const result = archiveOldServices();
 *   Logger.log('Archivados: ' + result.archived);
 */
function archiveOldServices(daysThreshold) {
  const threshold = typeof daysThreshold === 'number' ? daysThreshold : 365;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - threshold);

  const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  const sourceSheet = ss.getSheetByName(SHEETS.Services);

  if (!sourceSheet) {
    return { archived: 0, errors: ['Hoja Services no encontrada'] };
  }

  // ── PASO 1: Leer headers y datos ──
  const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const dateCol = headers.indexOf('Date');
  const statusCol = headers.indexOf('Status');
  const idCol = headers.indexOf('ID');

  if (dateCol === -1 || statusCol === -1) {
    return { archived: 0, errors: ['Columnas Date o Status no encontradas'] };
  }

  const lastRow = sourceSheet.getLastRow();
  if (lastRow <= 1) {
    return { archived: 0, errors: [] }; // Hoja vacía
  }

  const allData = sourceSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  // ── PASO 2: Identificar filas a archivar ──
  const rowsToArchive = [];
  const rowsToKeep = [];

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const status = String(row[statusCol] || '').trim();
    const dateStr = row[dateCol];

    const isTerminalStatus = ['Completado', 'Facturado'].includes(status);
    let isOldEnough = false;

    if (dateStr) {
      const rowDate = new Date(dateStr);
      isOldEnough = rowDate < cutoffDate;
    }

    if (isTerminalStatus && isOldEnough) {
      rowsToArchive.push(row);
    } else {
      rowsToKeep.push(row);
    }
  }

  if (rowsToArchive.length === 0) {
    return { archived: 0, errors: [] };
  }

  // ── PASO 3: Crear hoja de archivo si no existe ──
  let archiveSheet = ss.getSheetByName('Services_Archive');
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet('Services_Archive');
    archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Formato header
    archiveSheet.getRange(1, 1, 1, headers.length)
      .setBackground('#f3f4f6')
      .setFontWeight('bold');
  }

  // ── PASO 4: Copiar filas al archivo ──
  if (rowsToArchive.length > 0) {
    const archiveLastRow = archiveSheet.getLastRow();
    archiveSheet.getRange(
      archiveLastRow + 1, 1,
      rowsToArchive.length, headers.length
    ).setValues(rowsToArchive);
  }

  // ── PASO 5: Eliminar filas de la hoja activa (de abajo hacia arriba) ──
  // Primero necesitamos encontrar los índices originales de las filas a archivar
  const sourceIds = new Set(rowsToArchive.map(r => String(r[idCol])));
  const rowsToDelete = []; // índices 0-based en allData

  for (let i = 0; i < allData.length; i++) {
    if (sourceIds.has(String(allData[i][idCol]))) {
      rowsToDelete.push(i);
    }
  }

  // Eliminar de abajo hacia arriba para no desafinar índices
  rowsToDelete.sort((a, b) => b - a);
  for (const idx of rowsToDelete) {
    sourceSheet.deleteRow(idx + 2); // +2 porque la fila 1 es header y data empieza en fila 2
  }

  Logger.log('[ARCHIVE] Servicios archivados: ' + rowsToArchive.length);

  return { archived: rowsToArchive.length, errors: [] };
}


// ============================================================================
// TRIGGER — Ejecutar automáticamente cada mes
// ============================================================================
//
// Para configurar un trigger mensual:
//
// 1. En el editor de GAS, ir a ⚙ Triggers (icono de reloj en el menú lateral)
// 2. Click "+ Add Trigger"
// 3. Configurar:
//    - Función a ejecutar: archiveOldServices
//    - Fuente del evento: Temporizador
//    - Tipo de temporizador: Mes a mes (primer día del mes)
//    - Hora del día: 02:00 - 03:00 (hora de menor tráfico)
//    - Zona horaria: Europe/Rome (la del proyecto)
//
// NOTA: El trigger corre como el usuario que lo creó.
// Asegurate de que ese usuario tiene acceso de escritura al Sheet.
//
// PARA DESHABILITAR EL TRIGGER:
//   Ir a Triggers → click en el trigger → eliminar
//
// PARA PROBAR MANUALMENTE:
//   Ejecutar archiveOldServices() desde el editor de GAS
//   O llamar con un threshold bajo: archiveOldServices(30) → archiva >30 días
