/**
 * infrastructure/whatsapp.gs
 * 
 * WhatsApp message parsing functions for driver reports.
 * Migrated from: Transport Action All/src/types.ts (lines 434-688)
 * 
 * These functions parse free-text messages sent by drivers via WhatsApp
 * to extract service data (times, km, diaria, etc.).
 * 
 * WHY NEEDED: Drivers commonly report via WhatsApp in Italy. Without this,
 * manual data entry is required for every service, with high error risk.
 */

// ============================================================================
// MAIN PARSING FUNCTIONS
// ============================================================================

/**
 * Parse WhatsApp text from drivers to extract rapportino data.
 * 
 * Typical formats:
 * - "8:30 - 21:30 | 73km | Van Disposal"
 * - "Inizio 8:30 Fine 21:30 km 73"
 * - "8.30/21.30 73km van"
 * - "08:30-21:30 | km: 73 | diaria"
 * 
 * @param {string} text - Raw WhatsApp message
 * @returns {Object} Parsed service data
 */
function parseWhatsAppText(text) {
  if (!text) return {};
  
  var result = {};
  var lower = text.toLowerCase();
  
  // Extract time range: "8:30 - 21:30" or "8.30/21.30" or "8:30-21:30"
  var timeRangeMatch = text.match(/(\d{1,2}[.:]\d{2})\s*[-–/]\s*(\d{1,2}[.:]\d{2})/);
  if (timeRangeMatch) {
    result.startTime = _formatSingleTime(timeRangeMatch[1]);
    result.endTime = _formatSingleTime(timeRangeMatch[2]);
  }
  
  // Extract single time if no range: "Inizio 8:30"
  if (!result.startTime) {
    var startMatch = text.match(/(?:inizio|start|in)[:\s]*(\d{1,2}[.:]\d{2})/i);
    if (startMatch) result.startTime = _formatSingleTime(startMatch[1]);
  }
  if (!result.endTime) {
    var endMatch = text.match(/(?:fine|end|out)[:\s]*(\d{1,2}[.:]\d{2})/i);
    if (endMatch) result.endTime = _formatSingleTime(endMatch[1]);
  }
  
  // Extract kilometers: "73km" or "km 73" or "73 km"
  var kmMatch = text.match(/(\d+(?:[.,]\d+)?)\s*km/i) || text.match(/km[:\s]*(\d+(?:[.,]\d+)?)/i);
  if (kmMatch) result.km = parseFloat(kmMatch[1].replace(',', '.'));
  
  // Extract overtime: "overtime 1.5h" or "straordinario 1.5"
  var otMatch = text.match(/(?:overtime|straordinario|ot)[:\s]*(\d+(?:[.,]\d+)?)/i);
  if (otMatch) result.overtimeHours = parseFloat(otMatch[1].replace(',', '.'));
  
  // Detect diaria (meal allowance)
  result.hasDiaria = /diaria|pranzo|lunch|meal/i.test(text);
  
  // Detect festivo (holiday)
  result.isFestivo = /festivo|holiday|sunday|domenica|sabato|saturday/i.test(text);
  
  // Detect night shift
  result.isNotturno = /notturno|night|nott/i.test(text);
  
  // Extract vehicle type
  var vehicleMatch = text.match(/(?:van|car|transfer|disposal|minivan|bus|suv)/i);
  if (vehicleMatch) result.vehicleType = vehicleMatch[0];
  
  // Extract route description (text between pipes or after vehicle type)
  var routeMatch = text.match(/\|\s*(.+?)\s*\|/) || text.match(/(?:van|car|transfer|disposal)\s+(.+)/i);
  if (routeMatch) result.routeDescription = routeMatch[1].trim();
  
  return result;
}

/**
 * Parse a single driver report from WhatsApp text.
 * Extracts driver name, date, times, km, diaria type.
 *
 * @param {string} text - Single driver report text
 * @returns {Object|null} Parsed report or null if invalid
 */
function parseDriverReport(text) {
  if (!text || text.trim().length < 10) return null;

  // Extract date - try multiple patterns
  var dateRaw = '';
  var dateParsed = '';
  var dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dateMatch) {
    dateRaw = dateMatch[0];
    var day = dateMatch[1].padStart(2, '0');
    var month = dateMatch[2].padStart(2, '0');
    var year = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3];
    dateParsed = year + '-' + month + '-' + day;
  }

  // Extract driver name - try multiple patterns
  var driverName = '';
  
  // Pattern 1: Name on same line as date "7/7/26Isidoro dragone"
  var nameAfterDate = text.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*([A-Za-z][A-Za-z\s]+?)(?:\n|$)/);
  if (nameAfterDate) {
    driverName = nameAfterDate[1].trim();
  }
  
  // Pattern 2: Name on separate line, typical "First Last"
  if (!driverName) {
    var nameMatch = text.match(/^([A-Z][a-z]+\s+[a-z]+(?:\s+[a-z]+)*)/m);
    if (nameMatch && !nameMatch[1].match(/^(inizio|fine|km|diaria)/i)) {
      driverName = nameMatch[1].trim();
    }
  }
  
  // Pattern 3: ALL CAPS name "EMANUELE ROCCHINI"
  if (!driverName) {
    var capsName = text.match(/^([A-Z]{2,}\s+[A-Z]{2,})/m);
    if (capsName) {
      // Convert to Title Case
      driverName = capsName[1].toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    }
  }
  
  // Pattern 4: Name with company in parentheses "Michele Bartolucci (Amadio)"
  if (!driverName) {
    var nameWithParen = text.match(/([A-Z][a-z]+\s+[a-z]+(?:\s+\([A-Za-z]+\))?)/);
    if (nameWithParen && !nameWithParen[1].match(/^(inizio|fine|km|diaria)/i)) {
      driverName = nameWithParen[1].trim();
    }
  }
  
  // Pattern 5: Fallback - first line cleaned
  if (!driverName) {
    var firstLine = text.split('\n')[0].trim();
    driverName = firstLine.replace(/[\d\/\-.:]/g, '').replace(/\s+/g, ' ').trim();
  }
  
  // Extract start time - multiple patterns
  var startTime = '';
  var startMatch = text.match(/inizio\s*(?:dispo\w*\s*)?(?:ore\s*)?[:\s]*(\d{1,2}[.:,]\d{2})/i) ||
                   text.match(/inizio\s+(\d{1,2}[.:,]\d{2})/i) ||
                   text.match(/start\s*[:\s]*(\d{1,2}[.:,]\d{2})/i) ||
                   text.match(/in\s*[:\s]*(\d{1,2}[.:,]\d{2})/i);
  if (startMatch) startTime = _formatSingleTime(startMatch[1]);
  
  // Extract end time - multiple patterns
  var endTime = '';
  var endMatch = text.match(/fine\s*(?:dispo\w*\s*)?(?:ore\s*)?[:\s]*(\d{1,2}[.:,]\d{2})/i) ||
                 text.match(/fine\s+(\d{1,2}[.:,]\d{2})/i) ||
                 text.match(/end\s*[:\s]*(\d{1,2}[.:,]\d{2})/i) ||
                 text.match(/out\s*[:\s]*(\d{1,2}[.:,]\d{2})/i);
  if (endMatch) endTime = _formatSingleTime(endMatch[1]);
  
  // Extract km total - multiple patterns
  var kmTotal = 0;
  var kmTotMatch = text.match(/km\s*tot(?:ali)?\s*[:\s]*(\d+)/i) ||
                   text.match(/km\s+totali\s+(\d+)/i) ||
                   text.match(/(\d+)\s*km\s*tot/i) ||
                   text.match(/totale\s*km\.?\s*(\d+)/i);
  if (kmTotMatch) kmTotal = parseInt(kmTotMatch[1]);
  
  // If just "km XXX" found (no tot/over), take it as total
  if (kmTotal === 0) {
    var kmSimple = text.match(/\bkm\s+(\d+)/i);
    if (kmSimple) kmTotal = parseInt(kmSimple[1]);
  }
  
  // Extract km over (extra km) - multiple patterns
  var kmOver = 0;
  var kmOverMatch = text.match(/km\s*over\s*[:\s]*(\d+)/i) ||
                    text.match(/over\s*[:\s]*(\d+)/i) ||
                    text.match(/\(?\s*(\d+)\s*km\s*over\s*\)?/i) ||
                    text.match(/\(?\s*over\s+(\d+)\s*\)?/i);
  if (kmOverMatch) kmOver = parseInt(kmOverMatch[1]);
  
  // Extract diaria type - very flexible
  var diariaType = 'none';
  if (/\+?\s*diaria\s+piena|diaria\s+completa|full\s*meal/i.test(text)) {
    diariaType = 'piena';
  } else if (/\+?\s*diaria\s+mezza|half\s*meal/i.test(text)) {
    diariaType = 'mezza';
  } else if (/diaria/i.test(text)) {
    diariaType = 'piena'; // Default to piena if just "diaria" mentioned
  }
  
  // NOTE: kmOver is NOT calculated here.
  // The actual included km comes from the RateCard matched to the service.
  // ServiceEconomics.calculateRevenueBreakdown() handles: extraKm = kmTotal - rateCard.IncludedKm
  // This avoids hardcoding a threshold that varies per client/contract.
  
  // Validate minimum required fields
  if (!driverName || (!startTime && !endTime)) {
    return null;
  }
  
  return {
    driverName: driverName,
    date: dateRaw,
    dateParsed: dateParsed,
    startTime: startTime,
    endTime: endTime,
    kmTotal: kmTotal,
    kmOver: kmOver,
    diariaType: diariaType,
    rawText: text
  };
}

/**
 * Parse multiple driver reports from a WhatsApp chat export.
 * Each report is typically a separate message from the same number.
 * 
 * @param {string} text - Full WhatsApp chat export
 * @returns {Array} Array of parsed DriverReports
 */
function parseMultipleDriverReports(text) {
  // Split by message timestamps or empty lines
  var messages = text.split(/\[\d{1,2}:\d{2},\s*\d{1,2}\/\d{1,2}\/\d{4}\]\s*\+?\d+/g)
    .filter(function(m) { return m.trim().length > 10; });
  
  if (messages.length === 0) {
    // Try splitting by double newlines
    var parts = text.split(/\n\n+/);
    return parts.map(function(p) { return parseDriverReport(p); }).filter(function(r) { return r !== null; });
  }
  
  return messages.map(function(m) { return parseDriverReport(m); }).filter(function(r) { return r !== null; });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format single time string to HH:MM format.
 * Handles: "8.30" → "08:30", "8,30" → "08:30", "8:30" → "08:30"
 * 
 * @param {string} timeStr - Raw time string
 * @returns {string} Formatted time "HH:MM"
 */
function _formatSingleTime(timeStr) {
  if (!timeStr) return '';
  
  // Replace comma or dot with colon
  var normalized = timeStr.replace(/[.,]/, ':');
  
  // Split by colon
  var parts = normalized.split(':');
  if (parts.length !== 2) return normalized;
  
  var hours = parseInt(parts[0]);
  var minutes = parseInt(parts[1]);
  
  // Validate
  if (isNaN(hours) || isNaN(minutes)) return normalized;
  if (hours < 0 || hours > 23) return normalized;
  if (minutes < 0 || minutes > 59) return normalized;
  
  // Pad with leading zeros
  return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
}

/**
 * Calculate diaria cost based on type.
 * 
 * @param {string} type - 'piena' | 'mezza' | 'none'
 * @returns {number} Cost in euros
 */
function getDiariaCost(type) {
  switch (type) {
    case 'piena': return 50;
    case 'mezza': return 35;
    case 'none': return 0;
    default: return 0;
  }
}

/**
 * Calculate km over cost (extra km beyond included limit).
 * Typically €1.50 per extra km.
 * 
 * @param {number} kmOver - Extra kilometers
 * @param {number} rate - Cost per km (default 1.50)
 * @returns {number} Cost in euros
 */
function getKmOverCost(kmOver, rate) {
  rate = rate || 1.50;
  return kmOver * rate;
}

// ============================================================================
// WHATSAPP MESSAGE BUILDERS
// ============================================================================

/**
 * Build WhatsApp message for a single driver with their services.
 * @param {string} driverName - Driver name
 * @param {Array} services - Array of service objects
 * @param {string} dateStr - Date string for display
 * @returns {string} Formatted WhatsApp message
 */
function buildDriverWhatsAppMessage(driverName, services, dateStr) {
  var msg = 'Buongiorno ' + driverName + '!\n';
  msg += 'Ecco i tuoi servizi per ' + (dateStr || 'oggi') + ':\n\n';

  services.forEach(function(s, i) {
    msg += (i + 1) + '. ' + (s.time || '') + '\n';
    if (s.passengers) msg += '   Pasajero: ' + s.passengers + '\n';
    if (s.from || s.to) msg += '   Ruta: ' + (s.from || '?') + ' → ' + (s.to || '?') + '\n';
    if (s.vehicle) msg += '   Vehículo: ' + s.vehicle + '\n';
    if (s.notes) msg += '   Notas: ' + s.notes + '\n';
    msg += '\n';
  });

  msg += 'Per favore confermare ricezione. Grazie!';
  return msg;
}

/**
 * Build group WhatsApp message with all services for the day.
 * @param {Array} services - Array of service objects
 * @param {string} dateStr - Date string for display
 * @param {string} production - Production name
 * @returns {string} Formatted WhatsApp message
 */
function buildGroupWhatsAppMessage(services, dateStr, production) {
  var msg = 'Transport List — ' + (production || '') + ' — ' + (dateStr || 'Hoy') + '\n\n';
  msg += 'Total de servicios: ' + services.length + '\n\n';

  var byDriver = {};
  services.forEach(function(s) {
    var driver = s.driver || 'Sin conductor';
    if (!byDriver[driver]) byDriver[driver] = [];
    byDriver[driver].push(s);
  });

  Object.keys(byDriver).sort().forEach(function(driver) {
    msg += '━━━━━━━━━━━━━━━━\n';
    msg += 'Conductor: ' + driver + '\n';

    byDriver[driver].forEach(function(s, i) {
      msg += '  ' + (i + 1) + '. ' + (s.time || '') + ' | ' + (s.vehicle || '') + '\n';
      if (s.passengers) msg += '     Pasajero: ' + s.passengers + '\n';
      if (s.from || s.to) msg += '     Ruta: ' + (s.from || '?') + ' → ' + (s.to || '?') + '\n';
    });
    msg += '\n';
  });

  msg += 'Buon lavoro a tutti!';
  return msg;
}

/**
 * Build WhatsApp message for agency request.
 * @param {Array} services - Array of service objects
 * @param {string} agencyName - Agency name
 * @param {string} dateStr - Date string for display
 * @returns {string} Formatted WhatsApp message
 */
function buildAgencyWhatsAppMessage(services, agencyName, dateStr) {
  var msg = 'Servicios de Transporte — ' + (agencyName || 'Agencia') + '\n';
  msg += 'Fecha: ' + (dateStr || 'Hoy') + '\n';
  msg += 'Servicios: ' + services.length + '\n\n';

  services.forEach(function(s, i) {
    msg += (i + 1) + '. Hora: ' + (s.time || 'N/A') + '\n';
    msg += '   Vehículo: ' + (s.vehicle || 'N/A') + '\n';
    msg += '   Pasajero: ' + (s.passengers || 'N/A') + '\n';
    msg += '   Origen: ' + (s.from || 'N/A') + '\n';
    msg += '   Destino: ' + (s.to || 'N/A') + '\n';
    if (s.notes) msg += '   Notas: ' + s.notes + '\n';
    msg += '\n';
  });

  msg += 'Per favore confermare disponibilità e tariffe.\n';
  msg += 'Grazie, Transport Action';
  return msg;
}

// ============================================================================
// WHATSAPP CAPTURE — Parse text and capture into inbox
// ============================================================================

/**
 * Parse WhatsApp text and return structured results for preview.
 * Does NOT capture yet — just parses and returns for coordinator review.
 *
 * @param {string} text - Raw WhatsApp message text
 * @returns {Array} Array of parsed report objects
 */
function parseWhatsAppForCapture(text) {
  try {
    if (!text || text.trim().length < 5) {
      return { success: false, error: 'Message too short to parse' };
    }

    // Try multi-report first (chat export format)
    var reports = parseMultipleDriverReports(text);

    // If multi-report returns nothing, try single report
    if (!reports || reports.length === 0) {
      var single = parseDriverReport(text);
      if (single) {
        reports = [single];
      }
    }

    if (!reports || reports.length === 0) {
      return { success: false, error: 'Could not parse any reports from the message. Check the format.' };
    }

    // Enrich with available drivers for matching
    var drivers = [];
    try {
      var allDrivers = DriverRepository.getAll();
      drivers = allDrivers.map(function(d) {
        return { id: d.ID, name: d.Name || d.ID };
      });
    } catch (e) {}

    // Try auto-match driver by name
    reports.forEach(function(r) {
      r.matchedDriverId = '';
      r.serviceCandidates = [];
      if (r.driverName && drivers.length > 0) {
        var lowerName = r.driverName.toLowerCase().trim();
        var match = drivers.find(function(d) {
          return (d.name || '').toLowerCase().trim() === lowerName ||
                 (d.id || '').toLowerCase().trim() === lowerName;
        });
        // Fuzzy: check if driver name contains the parsed name
        if (!match) {
          match = drivers.find(function(d) {
            var dn = (d.name || '').toLowerCase();
            return dn.indexOf(lowerName) !== -1 || lowerName.indexOf(dn) !== -1;
          });
        }
        if (match) r.matchedDriverId = match.id;

        // Search for matching services by driver
        if (match) {
          try {
            var allServices = ServiceRepository.getAll();
            var driverServices = allServices.filter(function(s) {
              return s.DriverID === match.id;
            });
            // Filter by date if available
            if (r.dateParsed) {
              var serviceDate = new Date(r.dateParsed);
              driverServices = driverServices.filter(function(s) {
                if (!s.Date) return false;
                var sd = new Date(s.Date);
                return sd.toDateString() === serviceDate.toDateString();
              });
            }
            // Filter to reportable statuses
            var REPORTABLE = ['Importado', 'Asignado', 'Confirmado', 'EnRuta', 'Realizado', 'Reportado', 'Revision'];
            r.serviceCandidates = driverServices
              .filter(function(s) { return REPORTABLE.indexOf(s.OperationalStatus) !== -1; })
              .map(function(s) {
                return {
                  id: s.ID,
                  time: s.Time || '',
                  production: s.Production || '',
                  section: s.Section || '',
                  passengerName: s.PassengerName || '',
                  status: s.OperationalStatus || '',
                  route: s.Route || ''
                };
              });
          } catch (e) {}
        }
      }
    });

    return {
      success: true,
      reports: reports,
      drivers: drivers,
      reportCount: reports.length
    };

  } catch (e) {
    return { success: false, error: 'Parse error: ' + e.message };
  }
}

/**
 * Capture parsed WhatsApp reports into the inbox.
 * Called after coordinator reviews and confirms the parsed data.
 *
 * @param {Array} reports - Array of parsed report objects (with edits from coordinator)
 * @param {string} projectId - Project ID to associate
 * @returns {Object} { success, captured: number, results: [...] }
 */
function captureWhatsAppReports(reports, projectId) {
  try {
    if (!reports || !reports.length) {
      return { success: false, error: 'No reports to capture' };
    }
    if (!projectId) {
      return { success: false, error: 'Project ID is required' };
    }

    var results = [];
    var captured = 0;

    reports.forEach(function(r) {
      try {
        var driverId = r.matchedDriverId || r.driverId || '';
        var serviceDate = r.dateParsed || r.date || new Date().toISOString().split('T')[0];

        // Build rawData matching the DriverLink format for consistency
        // serviceId can come from parsed report or from coordinator selection
        var rawData = {
          serviceId: r.serviceId || r.selectedServiceId || '',
          startTime: r.startTime || '',
          endTime: r.endTime || '',
          kmTotal: r.kmTotal || 0,
          hasDiaria: r.diariaType === 'piena' || r.diariaType === 'mezza',
          isFestivo: r.isFestivo || false,
          isNotturno: r.isNotturno || false,
          diariaType: r.diariaType || 'none',
          kmExtra: r.kmOver || 0,
          hoursExtra: r.overtimeHours || 0,
          parking: r.parking || 0,
          tolls: r.tolls || 0,
          fuel: r.fuel || 0,
          waitMinutes: r.waitMinutes || 0,
          notes: r.notes || r.rawText || ''
        };

        if (driverId) {
          var inboxResult = captureReport(
            'whatsapp', 'manual',
            driverId, projectId,
            serviceDate, rawData
          );
          results.push({
            success: inboxResult.success,
            inboxId: inboxResult.inboxId || null,
            driverName: r.driverName || driverId,
            error: inboxResult.error || null
          });
          if (inboxResult.success) captured++;
        } else {
          results.push({
            success: false,
            driverName: r.driverName || 'Unknown',
            error: 'No driver matched — assign manually'
          });
        }
      } catch (e) {
        results.push({
          success: false,
          driverName: r.driverName || 'Unknown',
          error: e.message
        });
      }
    });

    return {
      success: captured > 0,
      captured: captured,
      total: reports.length,
      results: results
    };

  } catch (e) {
    return { success: false, error: e.message };
  }
}
