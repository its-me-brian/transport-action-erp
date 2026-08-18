// ============================================================================
// DRIVERREPORTCOMPARE.GS — Comparación Transport List vs Driver Report
// ============================================================================
// Migrated from: Code_old.gs
// Docs: docs/09_MIGRATION_WHatsapp_DRIVERLINKS.md (sections 3.2-3.3)
//
// Compara lo que dice la transport list contra lo que el conductor reportó
// para detectar discrepancias.

// ============================================================================
// COMPARE TRANSPORT VS DRIVER LINK
// ============================================================================

/**
 * Compara un servicio de la transport list contra el reporte del conductor.
 * Docs: section 3.2 — compareTransportVsDriverLink(transportService, driverLinkService)
 *
 * @param {Object} transportService - Servicio de la transport list
 * @param {Object} driverLinkService - Servicio reportado por el conductor
 * @returns {Array} Lista de discrepancias encontradas
 */
function compareTransportVsDriverLink(transportService, driverLinkService) {
  var discrepancies = [];

  // Field mappings: { fieldName, transportKey, driverKey, type }
  var fieldMaps = [
    { field: 'Hora Inicio', transportKey: 'timeStart', driverKey: 'orarioInizio', type: 'time' },
    { field: 'Hora Fin', transportKey: 'timeEnd', driverKey: 'orarioFine', type: 'time' },
    { field: 'Targa', transportKey: 'vehiclePlate', driverKey: 'targa', type: 'text' },
    { field: 'KM', transportKey: 'kmDriven', driverKey: 'kmTotali', type: 'numeric' },
    { field: 'Tipo Servicio', transportKey: 'service', driverKey: 'tipoServizio', type: 'text' },
    { field: 'Diaria', transportKey: 'diaria', driverKey: 'diaria', type: 'text' }
  ];

  fieldMaps.forEach(function(mapping) {
    var transportVal = transportService[mapping.transportKey];
    var driverVal = driverLinkService[mapping.driverKey];

    // Normalize undefined/null to empty
    if (transportVal === undefined || transportVal === null) transportVal = '';
    if (driverVal === undefined || driverVal === null) driverVal = '';

    var isDifferent = false;

    if (mapping.type === 'numeric') {
      var tNum = parseFloat(transportVal) || 0;
      var dNum = parseFloat(driverVal) || 0;
      if (tNum !== dNum) {
        isDifferent = true;
        discrepancies.push({
          field: mapping.field,
          transportValue: tNum,
          driverValue: dNum,
          difference: dNum - tNum,
          type: 'numeric'
        });
      }
    } else {
      // Text/time comparison (normalized)
      var tStr = String(transportVal).trim().toLowerCase();
      var dStr = String(driverVal).trim().toLowerCase();
      if (tStr !== dStr) {
        isDifferent = true;
        discrepancies.push({
          field: mapping.field,
          transportValue: String(transportVal).trim(),
          driverValue: String(driverVal).trim(),
          type: 'text'
        });
      }
    }
  });

  return discrepancies;
}

// ============================================================================
// FIND MATCHING TRANSPORT SERVICE
// ============================================================================

/**
 * Busca qué servicio de la transport list coincide con el reporte del conductor.
 * Docs: section 3.2 — findMatchingTransportService(driverLinkService, transportServices)
 *
 * Matching priority:
 * 1. Exact match: date + time + production
 * 2. Multiple match: date + production (multiple time slots)
 * 3. Date + driver: date + production + driverName (dispo scenarios)
 * 4. No match: { match: null, type: 'none' }
 *
 * @param {Object} driverLinkService - Servicio reportado por el conductor
 * @param {Array} transportServices - Lista de servicios de la transport list
 * @returns {Object} { match, type, alternatives }
 */
function findMatchingTransportService(driverLinkService, transportServices) {
  if (!driverLinkService || !transportServices || !transportServices.length) {
    return { match: null, type: 'none', alternatives: [] };
  }

  var dlDate = driverLinkService.dataServizio || '';
  var dlTime = driverLinkService.orarioInizio || '';
  var dlProject = driverLinkService.clienti || '';

  // Helper: normalize date for comparison
  function normalizeDate(d) {
    if (!d) return '';
    // Handle DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
    var parts = d.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) return parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
      if (parts[0].length === 4) return parts[0] + '-' + parts[1].padStart(2, '0') + '-' + parts[2].padStart(2, '0');
    }
    return d;
  }

  var normDlDate = normalizeDate(dlDate);

  // Priority 1: Exact match (date + time + production)
  var exactMatches = transportServices.filter(function(ts) {
    var tsDate = normalizeDate(ts.date || ts.dateStr || '');
    var tsTime = (ts.timeStart || ts.time || '').substring(0, 5);
    var tsProject = ts.production || '';
    return tsDate === normDlDate && tsTime === dlTime && tsProject === dlProject;
  });

  if (exactMatches.length === 1) {
    return { match: exactMatches[0], type: 'exact', alternatives: [] };
  }

  // Priority 2: Date + production match
  var dateProjectMatches = transportServices.filter(function(ts) {
    var tsDate = normalizeDate(ts.date || ts.dateStr || '');
    var tsProject = ts.production || '';
    return tsDate === normDlDate && tsProject === dlProject;
  });

  if (dateProjectMatches.length === 1) {
    return { match: dateProjectMatches[0], type: 'date_project', alternatives: [] };
  }

  if (dateProjectMatches.length > 1) {
    return { match: dateProjectMatches[0], type: 'date_project', alternatives: dateProjectMatches.slice(1) };
  }

  // Priority 3: Date only (for dispo scenarios)
  var dateMatches = transportServices.filter(function(ts) {
    var tsDate = normalizeDate(ts.date || ts.dateStr || '');
    return tsDate === normDlDate;
  });

  if (dateMatches.length === 1) {
    return { match: dateMatches[0], type: 'date_only', alternatives: [] };
  }

  if (dateMatches.length > 1) {
    return { match: dateMatches[0], type: 'date_only', alternatives: dateMatches.slice(1) };
  }

  // Priority 4: No match
  return { match: null, type: 'none', alternatives: [] };
}
