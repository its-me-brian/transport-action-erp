// ============================================================================
// EXCELPARSER.GS — Parseo de archivos Excel de Transport List
// ============================================================================

/**
 * Extrae una URL de Google Maps de un texto de celda.
 * Detecta: maps.app.goo.gl, goo.gl/maps, google.com/maps
 * @param {string} cellText - Texto de la celda
 * @returns {string} URL de Maps o ''
 */
function extractMapsUrl(cellText) {
  if (!cellText) return '';
  const urlMatch = cellText.match(/https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps?|google\.com\/maps)\S*/gi);
  return urlMatch ? urlMatch[0] : '';
}

/**
 * Limpia el texto de una celda removiendo URLs de Google Maps.
 * @param {string} cellText - Texto de la celda
 * @returns {string} Texto limpio sin URLs
 */
function cleanCellText(cellText) {
  if (!cellText) return '';
  return cellText.replace(/https?:\/\/\S*/gi, '').trim();
}

/**
 * Check if a row is truly empty (all columns, not just mapped ones).
 * Used to detect separator rows between driver blocks that may have data in unmapped columns.
 * @param {Array} row - Row array from getValues()
 * @returns {boolean} true if all cells are empty/whitespace
 */
function _isRowTrulyEmpty(row) {
  if (!row || !row.length) return true;
  for (let c = 0; c < row.length; c++) {
    const val = _cellToStr(row[c]);
    if (val && val.trim() !== '') return false;
  }
  return true;
}

/**
 * Parsea la fecha del header del Transport List.
 * Formatos soportados:
 *   "Transport List 5 Tuesday July 21th"
 *   "Prep. Transport List Tuesday July 21th"
 *   "Tuesday July 21th"
 * @param {string} headerText - Texto del header
 * @returns {string} ISO date string
 */
function parseTransportListDate(headerText) {
  if (!headerText) return new Date().toISOString();
  
  // Pattern: DayName MonthName DayNumber (with ordinal suffix)
  const dateMatch = headerText.match(
    /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i
  );
  
  if (dateMatch) {
    const monthName = dateMatch[2];
    const day = parseInt(dateMatch[3]);
    // Parse month — use a reference year to get the month index
    const monthIdx = new Date(Date.parse(monthName + ' 1, 2026')).getMonth();
    if (!isNaN(monthIdx)) {
      const year = new Date().getFullYear();
      const d = new Date(year, monthIdx, day);
      return d.toISOString();
    }
  }
  
  // Fallback: try to extract from filename patterns like MM_DD
  return new Date().toISOString();
}

/**
 * Parsea un archivo Excel de Transport List subido al Drive.
 * Formato esperado (Dolce_Italy):
 *   Row 1: Company/Production name
 *   Row 2: "Prep. Transport List [Day] [Date]"
 *   Row 3: empty
 *   Row 4: Headers (VEHICLE | DRIVER | TIME | , | PASSENGERS | FROM | TO)
 *   Row 5: empty
 *   Row 6+: Data (puede span multiple rows por servicio)
 * 
 * @param {string} fileId - ID del archivo en Google Drive
 * @param {number} importSeq - Secuencia de importación
 * @returns {Object} Resultado con servicios parseados
 */
function parseTransportListExcel(fileId, importSeq) {
  try {
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    
    // Convertir Excel a Google Sheets temporal
    const blob = file.getBlob();
    const tempFile = DriveApp.createFile(blob);
    
    // Para archivos .xlsx, necesitamos importarlos
    let ss;
    try {
      ss = SpreadsheetApp.open(tempFile);
    } catch (e) {
      // Si no se puede abrir directamente, intentar con Drive API
      tempFile.setTrashed(true);
      return { error: 'No se pudo leer el archivo. Asegurate de que sea .xlsx o .xls' };
    }
    
    const ws = ss.getSheets()[0];
    const allData = ws.getDataRange().getValues();
    
    // Limpiar archivo temporal
    tempFile.setTrashed(true);
    
    // Parsear datos
    const servicios = _parseTransportListRows(allData, fileName, importSeq || 1);
    
    return servicios;
    
  } catch (e) {
    Logger.log('Error parseTransportListExcel: ' + e.message);
    return { error: e.message };
  }
}

/**
 * Parsea las filas del Excel de Transport List.
 * Cada servicio puede ocupar 1-4 filas:
 *   Fila principal: vehicle, driver, time, passenger1, from, to
 *   Sub-filas: phone, additional passengers, "Then" for second pickup
 */
function _parseTransportListRows(allData, fileName, importSeq) {
  const servicios = [];
  let production = '';
  let projectName = '';
  let transportCompany = '';
  let dateStr = '';
  const allValues = []; // {value, row, col} — header scan results for debug
  
  // Detectar production, project name, transport company y fecha de las primeras filas
  if (allData.length > 0 && allData[0][0]) {
    production = String(allData[0][0]).trim(); // e.g. "WANDERING IN ROME PRODUCTIONS LLC"
  }
  
  // Row 0-1: scan for project name and transport company
  // Merged cells may put value in any column of the merge range
  // Strategy: collect ALL non-empty values from rows 0-1, classify them
  if (allData.length > 0) {
    
    // Scan rows 0 and 1 (header area)
    for (let r = 0; r < Math.min(2, allData.length); r++) {
      const row = allData[r];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (!val) continue;
        // Skip production (already read from A1)
        if (r === 0 && c === 0) continue;
        // Skip headers/dates
        if (val.indexOf('Transport List') > -1 || val.indexOf('Prep.') > -1) continue;
        if (val === production) continue;
        allValues.push({ value: val, row: r, col: c });
      }
    }
    
    // Classify: transport company has SRL/LTD/SPA/INC/LLC
    // Project name is the other short value
    for (const item of allValues) {
      const isTransportCo = item.value.match(/\b(SRL|LTD|SPA|INC|LLC)\b/i);
      if (isTransportCo && !transportCompany) {
        transportCompany = item.value;
      } else if (!isTransportCo && !projectName && item.value.length <= 40 && !item.value.match(/\+\d/)) {
        projectName = item.value;
      }
    }
  }
  if (allData.length > 1 && allData[1][0]) {
    dateStr = String(allData[1][0]).replace('Prep. Transport List ', '').replace('Transport List ', '').trim();
    // Strip leading transport list number (e.g. "5 TuesdayJuly 21th" → "TuesdayJuly 21th")
    dateStr = dateStr.replace(/^\d+\s*/, '').trim();
  }
  
  // If no projectName from header (e.g. it's an image), extract from filename
  // Filename format: "DOLCE_Italy_Transport List_07_07.xlsx"
  if (!projectName && fileName) {
    const nameMatch = fileName.match(/^([A-Za-z]+)/);
    if (nameMatch && nameMatch[1].length >= 2) {
      projectName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
    }
  }
  
  // If no date from header, try to extract from filename
  // Filename format: "DOLCE_Italy_Transport List_07_07.xlsx" or "Transport List 5 TuesdayJuly 21th"
  if (!dateStr && fileName) {
    // Try MM_DD pattern from filename
    const mmddMatch = fileName.match(/(\d{2})_(\d{2})/);
    if (mmddMatch) {
      const month = parseInt(mmddMatch[1]);
      const day = parseInt(mmddMatch[2]);
      const year = new Date().getFullYear();
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const d = new Date(year, month - 1, day);
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        dateStr = dayNames[d.getDay()] + ' ' + monthNames[d.getMonth()] + ' ' + d.getDate() + 'th';
      }
    }
  }
  
  let i = 0;
  let servicioIdx = 0;
  let currentSection = ''; // Track current city section (ROMA, PUGLIA, etc.)
  let footerContacts = []; // Track footer contact rows
  
  // Buscar la fila de headers — detecta múltiples formatos
  let headerRow = -1;
  let colMap = {}; // Dynamic column mapping
  
  for (let r = 0; r < Math.min(10, allData.length); r++) {
    for (let c = 0; c < allData[r].length; c++) {
      const val = String(allData[r][c] || '').toUpperCase().trim();
      // Detect header row by known header names
      if (val === 'VEHICLE' || val === 'VEICOLO' || val === 'TIPO' || val === 'TYPE' || 
          val === 'AUTO' || val === 'VEHICLE TYPE' || val === 'VEHICLE_TYPE') {
        headerRow = r;
        break;
      }
    }
    if (headerRow >= 0) break;
  }
  
  if (headerRow < 0) {
    return { error: 'No se encontraron headers (VEHICLE, TIPO, etc.)', servicios: [], production: production, dateStr: dateStr };
  }
  
  // Build dynamic column map from header row
  const headerCells = allData[headerRow];
  for (let c = 0; c < headerCells.length; c++) {
    const h = String(headerCells[c] || '').toUpperCase().trim();
    if (h === 'VEHICLE' || h === 'VEICOLO' || h === 'TIPO' || h === 'TYPE' || h === 'AUTO' || h === 'VEHICLE TYPE') {
      colMap.vehicle = c;
    } else if (h === 'DRIVER' || h === 'CONDUCTOR' || h === 'DRIVER NAME') {
      colMap.driver = c;
    } else if (h === 'TIME' || h === 'HORA' || h === 'ORARIO') {
      colMap.time = c;
    } else if (h === 'PASSENGERS' || h === 'PASAJEROS' || h === 'PAX' || h === 'PASSENGER') {
      colMap.passengers = c;
    } else if (h === 'FROM' || h === 'ORIGEN' || h === 'PICKUP' || h === 'PICKUP LOCATION') {
      colMap.from = c;
    } else if (h === 'TO' || h === 'DESTINO' || h === 'DROPOFF' || h === 'DROPOFF LOCATION') {
      colMap.to = c;
    } else if (h === 'SERVICIO' || h === 'SERVICE' || h === 'SERVICE TYPE') {
      colMap.servicio = c;
    } else if (h === 'FLIGHT' || h === 'VUELO' || h === 'FLIGHT INFO') {
      colMap.flightInfo = c;
    } else if (h === 'SECTION' || h === 'SECCION' || h === 'SEZIONE') {
      colMap.section = c;
    }
  }
  
  // Fallback: if no vehicle column detected, use default mapping
  if (colMap.vehicle === undefined) {
    colMap = { vehicle: 0, driver: 1, time: 2, passengers: 4, from: 5, to: 6 };
  }
  
  // Parsear desde headerRow + 1
  i = headerRow + 1;
  
  // Helper: check if a row is truly empty (all columns, not just mapped ones)
  function _isRowTrulyEmpty(row) {
    if (!row || !row.length) return true;
    for (let c = 0; c < row.length; c++) {
      const val = _cellToStr(row[c]);
      if (val && val.trim() !== '') return false;
    }
    return true;
  }

  // Track vehicle/driver for next service that shares the same vehicle
  let lastVehicle = '';
  let lastVehicleType = '';
  let lastDriver = '';
  let lastDriverPhone = '';
  let lastServiceType = 'Dispo';
  let lastIsProduction = false;
  let lastServiceHadVehicle = false;  // true if last saved service had a vehicle
  const parsingLog = [];  // DEBUG: track every row processed
  
  while (i < allData.length) {
    const row = allData[i];
    const vehicleCell = _cellToStr(row[colMap.vehicle]);
    const driverCell = colMap.driver !== undefined ? _cellToStr(row[colMap.driver]) : '';
    const timeCell = colMap.time !== undefined ? _cellToStr(row[colMap.time]) : '';
    const passengerCell = colMap.passengers !== undefined ? _cellToStr(row[colMap.passengers]) : '';
    const fromCell = colMap.from !== undefined ? _cellToStr(row[colMap.from]) : '';
    const toCell = colMap.to !== undefined ? _cellToStr(row[colMap.to]) : '';
    const servicioCell = colMap.servicio !== undefined ? _cellToStr(row[colMap.servicio]) : '';
    const flightCell = colMap.flightInfo !== undefined ? _cellToStr(row[colMap.flightInfo]) : '';
    const sectionCell = colMap.section !== undefined ? _cellToStr(row[colMap.section]) : '';
    
    // DEBUG: log each row processed in main loop
    parsingLog.push({
      row: i,
      vehicle: vehicleCell,
      driver: driverCell,
      time: timeCell,
      passengers: passengerCell,
      from: fromCell,
      to: toCell,
      lastVehicle: lastVehicle,
      lastDriver: lastDriver,
      phase: 'main'
    });
    
    // Si la fila está vacía, saltar
    const allEmpty = !vehicleCell && !driverCell && !timeCell && !passengerCell && !fromCell && !toCell && !servicioCell;
    if (allEmpty) {
      i++;
      continue;
    }
    
    // Si es header repetido, saltar
    const headerNames = ['VEHICLE', 'VEICOLO', 'TIPO', 'TYPE', 'DRIVER', 'TIME', 'PASSENGERS', 'FROM', 'TO', 'SERVICIO', 'SERVICE'];
    if (headerNames.some(h => vehicleCell.toUpperCase() === h)) {
      i++;
      continue;
    }
    
    // Detectar si es una fila de sección
    const sectionNames = ['ROMA', 'PUGLIA', 'ARRIVALS&DEPARTURES', 'ARRIVALS & DEPARTURES', 'MILAN', 'NAPLES', 'LONDON', 'NAPOLI', 'TORINO', 'FIRENZE', 'BARCELONA', 'MADRID'];
    const isSection = sectionNames.some(s => vehicleCell.toUpperCase().indexOf(s) > -1) && !driverCell && !timeCell;
    
    if (isSection) {
      currentSection = vehicleCell.trim();
      i++;
      continue;
    }
    
    // Use section from column if available
    if (sectionCell) {
      currentSection = sectionCell;
    }
    
    // Detectar filas de contactos/emails al final del Excel
    const allCells = [vehicleCell, driverCell, timeCell, passengerCell, fromCell, toCell];
    const hasEmail = allCells.some(c => c.indexOf('@') > -1);
    const hasPhone = allCells.some(c => c.match(/\+\d{8,}/));
    const isContactRow = hasEmail || (hasPhone && !timeCell && !passengerCell);
    
    if (isContactRow) {
      // Save contact for footer display ONLY — do NOT save to Drivers sheet
      const contactInfo = _extractContactInfo(allCells);
      footerContacts.push({
        name: contactInfo.name || driverCell,
        role: contactInfo.role || '',
        phone: contactInfo.phone || '',
        email: contactInfo.email || ''
      });
      i++;
      continue;
    }
    
    
    // Guard: if no vehicle AND no time, this is an orphaned sub-row (phone, passenger, etc.)
    // Not a real service — skip it
    if (!vehicleCell && !timeCell) {
      parsingLog.push({ row: i, action: 'SKIP_ORPHAN', vehicle: vehicleCell, driver: driverCell });
      i++;
      continue;
    }
    
    // Esta fila parece ser el inicio de un servicio
    // Classify service type from VEHICLE column (e.g. "Disposal Van", "Transfer Airport Van")
    // or from "Servicio" column if present
    let serviceType = 'Dispo'; // default
    let vehicleType = 'Van';   // default
    let isProduction = false;

    // Parse from VEHICLE column: "Disposal Van" → service=Dispo, vehicle=Van
    //                          "Production Van2" → service=Production, isProduction=true
    //                          "Transfer Airport Van" → service=Transfer Airport, vehicle=Van
    if (vehicleCell) {
      const lowerVehicle = vehicleCell.toLowerCase();
      
      // Detect production vehicles — include them but flag as production
      if (lowerVehicle.indexOf('production') > -1 || lowerVehicle.indexOf('prod ') > -1) {
        isProduction = true;
        serviceType = 'Production';
      }
      
      // Extract vehicle type
      if (lowerVehicle.indexOf('van') > -1) {
        vehicleType = 'Van';
      } else if (lowerVehicle.indexOf('car') > -1 || lowerVehicle.indexOf('sedan') > -1) {
        vehicleType = 'Car';
      } else if (lowerVehicle.indexOf('walking') > -1) {
        vehicleType = 'Walking';
      }
      
      // Extract service type from vehicle cell
      if (lowerVehicle.indexOf('walking') > -1) {
        serviceType = 'Walking';
      } else if (lowerVehicle.indexOf('transfer airport') > -1) {
        serviceType = 'Transfer Airport';
      } else if (lowerVehicle.indexOf('transfer city') > -1) {
        serviceType = 'Transfer City';
      } else if (lowerVehicle.indexOf('transfer') > -1) {
        serviceType = 'Transfer Airport'; // default transfer = airport
      } else if (lowerVehicle.indexOf('disposal') > -1 || lowerVehicle.indexOf('dispo') > -1) {
        serviceType = 'Dispo';
      }
    }
    
    // Override from "Servicio" column if present (some transport lists have it)
    if (servicioCell) {
      const lowerServicio = servicioCell.toLowerCase();
      if (lowerServicio.indexOf('transfer airport') > -1) {
        serviceType = 'Transfer Airport';
      } else if (lowerServicio.indexOf('transfer city') > -1) {
        serviceType = 'Transfer City';
      } else if (lowerServicio.indexOf('transfer') > -1) {
        serviceType = 'Transfer Airport';
      } else if (lowerServicio.indexOf('disposal') > -1 || lowerServicio.indexOf('dispo') > -1) {
        serviceType = 'Dispo';
      }
    }
    
    let servicio = {
      vehicle: vehicleCell,
      vehicleType: vehicleType,
      driver: driverCell,
      driverPhone: '',
      time: timeCell,
      passengers: [],
      passengerRoles: [],
      pickupLines: fromCell ? [fromCell] : [],
      dropoffLines: toCell ? [toCell] : [],
      flightInfo: flightCell || '',
      notes: '',
      section: currentSection,
      servicio: servicioCell,
      serviceType: serviceType,
      isProduction: isProduction,
      hasThenPickup: false
    };
    
      // Inherit vehicle/driver from previous service if this row has no vehicle/driver
      // (same vehicle, different time/passengers — e.g., second dispo of the day)
      if (!vehicleCell && !driverCell && timeCell) {
        servicio.vehicle = lastVehicle;
        servicio.vehicleType = lastVehicleType;
        servicio.driver = lastDriver;
        servicio.driverPhone = lastDriverPhone;
        servicio.serviceType = lastServiceType;
        servicio.isProduction = lastIsProduction;
        servicio.notes = 'Same vehicle as previous service';
        parsingLog.push({ row: i, action: 'INHERITED', vehicle: lastVehicle, driver: lastDriver, phone: lastDriverPhone });
      } else {
        parsingLog.push({ row: i, action: 'NO_INHERIT', reason: 'vehicle=' + vehicleCell + ' driver=' + driverCell + ' time=' + timeCell });
      }
    
    // Extract Google Maps URLs from ALL columns (including unmapped H, I, etc.)
    const mapsUrlRegex = /https?:\/\/(maps\.app\.goo\.gl|goo\.gl|google\.com\/maps)[^\s]*/i;
    const mappedIndices = new Set([colMap.vehicle, colMap.driver, colMap.time, colMap.passengers, colMap.from, colMap.to, colMap.servicio, colMap.flightInfo, colMap.section].filter(v => v !== undefined));
    for (let c = 0; c < row.length; c++) {
      if (mappedIndices.has(c)) continue;
      const cellStr = _cellToStr(row[c]);
      const urlMatch = cellStr.match(mapsUrlRegex);
      if (urlMatch) {
        servicio.notes = servicio.notes ? servicio.notes + ' | maps:' + urlMatch[0] : 'maps:' + urlMatch[0];
      }
    }
    
    // Procesar pasajero principal
    if (passengerCell) {
      const parsed = _parsePassengerLine(passengerCell);
      servicio.passengers.push(parsed.name);
      servicio.passengerRoles.push(parsed.role);
    }
    
    // Mirar las sub-filas siguientes
    let j = i + 1;
    while (j < allData.length) {
      const subRow = allData[j];
      const sub0 = colMap.vehicle !== undefined ? _cellToStr(subRow[colMap.vehicle]) : '';
      const sub1 = colMap.driver !== undefined ? _cellToStr(subRow[colMap.driver]) : '';
      const sub2 = colMap.time !== undefined ? _cellToStr(subRow[colMap.time]) : '';
      const sub4 = colMap.passengers !== undefined ? _cellToStr(subRow[colMap.passengers]) : '';
      const sub5 = colMap.from !== undefined ? _cellToStr(subRow[colMap.from]) : '';
      const sub6 = colMap.to !== undefined ? _cellToStr(subRow[colMap.to]) : '';
      
      // Detectar si es inicio de nuevo servicio
      // Case 1: full row (vehicle + driver + time)
      const isNewService = (sub0 && sub1 && sub2 && !sub0.startsWith('+') && 
                           sub0.toUpperCase() !== 'THEN' && sectionNames.every(s => sub0.toUpperCase().indexOf(s) === -1));
      
      // Case 2: sub-row has a vehicle name DIFFERENT from current service
      // (e.g., "walking distance" or "Showrunner Van" appearing under a different vehicle)
      // This catches services that have a vehicle but no time/driver yet
      const isDifferentVehicle = sub0 && !sub0.startsWith('+') && 
                                sub0.toUpperCase() !== 'THEN' && 
                                sectionNames.every(s => sub0.toUpperCase().indexOf(s) === -1) &&
                                sub0.toUpperCase() !== servicio.vehicle.toUpperCase();
      
      // Detectar "Then" (segundo pickup del mismo vehículo) — check vehicle, time, AND from/to columns
      if (sub0.toUpperCase() === 'THEN' || sub2.toUpperCase() === 'THEN' ||
          sub5.toUpperCase() === 'THEN' || sub6.toUpperCase() === 'THEN') {
        servicio.hasThenPickup = true;
        
        servicios.push(_buildServiceRecord(servicio, production, dateStr, fileName, servicioIdx, importSeq));
        servicioIdx++;
        
        servicio = {
          vehicle: vehicleCell,
          vehicleType: servicio.vehicleType,
          driver: driverCell,
          driverPhone: servicio.driverPhone,
          time: sub2 || sub0 === 'THEN' ? (colMap.time !== undefined ? _cellToStr(subRow[colMap.time]) : '') : servicio.time,
          passengers: [],
          passengerRoles: [],
          pickupLines: [],
          dropoffLines: [],
          flightInfo: servicio.flightInfo,
          notes: 'Then (same day)',
          section: currentSection,
          servicio: servicio.servicio,
          serviceType: servicio.serviceType,
          isProduction: servicio.isProduction || false,
          hasThenPickup: false
        };
        j++;
        continue;
      }
      
      // Detectar teléfono — only when sub0 is empty (no vehicle in sub-row)
      // If sub0 has a vehicle name, it's a new service, not a phone sub-row
      if (!sub0 && sub1.startsWith('+')) {
        servicio.driverPhone = sub1.startsWith('+') ? sub1 : sub0;
        // Si en la misma fila hay datos de pasajero
        if (sub4) {
          const parsed = _parsePassengerLine(sub4);
          servicio.passengers.push(parsed.name);
          servicio.passengerRoles.push(parsed.role);
          if (sub5) servicio.pickupLines.push(sub5);
          if (sub6) servicio.dropoffLines.push(sub6);
        }
        j++;
        continue;
      }

      // Nuevo servicio: tiene hora pero sin vehículo/conductor
      // (mismo vehículo del servicio anterior, distinto horario/pasajeros/FROM-TO)
      // Matches: time+passengers, time+FROM/TO, or time only — all without vehicle/driver
      // BUT: if the next non-empty row has the same time with vehicle+driver, this is a sub-row artifact
      if (sub2 && !sub0 && !sub1 && (sub4 || sub5 || sub6)) {
        let wouldDuplicate = false;
        for (let k = j + 1; k < allData.length; k++) {
          const nextRow = allData[k];
          if (_isRowTrulyEmpty(nextRow)) continue;
          const nextV = colMap.vehicle !== undefined ? _cellToStr(nextRow[colMap.vehicle]) : '';
          const nextD = colMap.driver !== undefined ? _cellToStr(nextRow[colMap.driver]) : '';
          const nextT = colMap.time !== undefined ? _cellToStr(nextRow[colMap.time]) : '';
          if (nextV && nextD && nextT === sub2) {
            wouldDuplicate = true;
          }
          break;
        }
        if (wouldDuplicate) {
          parsingLog.push({ row: j, action: 'SUB_SKIP_DUPLICATE', fromRow: i, time: sub2 });
          j++;
          continue;
        }
        parsingLog.push({ row: j, action: 'SUB_BREAK_NEW_SVC', fromRow: i, time: sub2, passengers: sub4 });
        break;
      }

      // Sub-fila con pasajero adicional (sin hora, sin vehículo)
      if (sub4 && !sub0 && !sub2) {
        const parsed = _parsePassengerLine(sub4);
        servicio.passengers.push(parsed.name);
        servicio.passengerRoles.push(parsed.role);
        if (sub5) servicio.pickupLines.push(sub5);
        if (sub6) servicio.dropoffLines.push(sub6);
        j++;
        continue;
      }
      
      // NEW: Sub-fila con nombre de vehículo DIFERENTE al actual → es un nuevo servicio
      // (e.g., walking distance, Showrunner Van, etc. — even without time/driver)
      if (isDifferentVehicle) {
        parsingLog.push({ row: j, action: 'SUB_BREAK_DIFF_VEHICLE', fromRow: i, vehicle: sub0, driver: sub1 });
        break;
      }
      
      // Sub-fila con FROM/TO adicional
      if (sub5 || sub6) {
        if (sub5) servicio.pickupLines.push(sub5);
        if (sub6) servicio.dropoffLines.push(sub6);
        j++;
        continue;
      }
      
      // Sub-fila con Roma (ciudad)
      if (sub0 === 'Roma' || sub0 === 'Rome') {
        j++;
        continue;
      }
      
      // Sub-fila con información de vuelo
      if (sub4 && String(sub4).toLowerCase().indexOf('flight') > -1) {
        servicio.flightInfo = sub4;
        j++;
        continue;
      }
      
      // Sub-fila vacía o no reconocida → fin del servicio
      // Use truly empty check (all columns) to catch separator rows with data in unmapped columns
      if (_isRowTrulyEmpty(subRow)) {
        parsingLog.push({ row: j, action: 'SUB_BREAK_EMPTY', fromRow: i });
        break;
      }
      
      // Si tiene vehículo y conductor, es un nuevo servicio
      if (sub0 && sub1 && sub2) {
        parsingLog.push({ row: j, action: 'SUB_BREAK_VDT', fromRow: i, vehicle: sub0, driver: sub1 });
        break;
      }
      
      j++;
    }
    
    // Guardar servicio
    servicios.push(_buildServiceRecord(servicio, production, dateStr, fileName, servicioIdx, importSeq));
    servicioIdx++;
    
    // Track vehicle/driver for next service that shares the same vehicle
    // KEY LOGIC:
    //   - Has vehicle + driver → both update (same driver continues)
    //   - Has vehicle + NO driver → update vehicle BUT clear driver (new block, needs manual assignment)
    //   - Has NO vehicle + NO driver + has time → inherit both (same vehicle, different time slot)
    if (servicio.vehicle) {
      lastVehicle = servicio.vehicle;
      lastVehicleType = servicio.vehicleType;
      lastServiceType = servicio.serviceType;
      lastIsProduction = servicio.isProduction || false;
      if (servicio.driver) {
        lastDriver = servicio.driver;
        lastDriverPhone = servicio.driverPhone;
      } else {
        // Vehicle but no driver = new block. Clear so next inheritor doesn't get stale name
        lastDriver = '';
        lastDriverPhone = '';
      }
    }
    lastServiceHadVehicle = !!servicio.vehicle;
    
    parsingLog.push({ row: i, action: 'SAVED', vehicle: servicio.vehicle, driver: servicio.driver, phone: servicio.driverPhone, lastVehicle: lastVehicle, lastDriver: lastDriver });
    
    i = j;
  }
  
  // Extract and save unique drivers from services to Drivers sheet
  // SKIP drivers from Production vehicles (they belong to the production company, not the agency)
  const savedDrivers = new Set();
  for (let d = 0; d < servicios.length; d++) {
    const svc = servicios[d];
    // Skip Production vehicles — don't register their drivers
    if (svc.isProduction) continue;
    
    if (svc.driver && !savedDrivers.has(svc.driver)) {
      savedDrivers.add(svc.driver);
      _saveDriverToSheet(svc.driver, svc.driverPhone || '', 'transport_list_' + production);
    }
  }
  
  return {
    servicios: servicios,
    production: production,
    projectName: projectName,
    transportCompany: transportCompany,
    dateStr: dateStr,
    footerContacts: footerContacts,
    totalServices: servicios.length,
    _debug: {
      headerScan: allValues || [],
      production: production,
      projectName: projectName,
      transportCompany: transportCompany,
      dateStr: dateStr,
      row0: allData.length > 0 ? allData[0].map((c,i) => ({ col: i, value: String(c||'').trim() })) : [],
      row1: allData.length > 1 ? allData[1].map((c,i) => ({ col: i, value: String(c||'').trim() })) : [],
      totalRows: allData.length,
      colMap: colMap,
      parsingLog: parsingLog
    }
  };
}

/**
 * Convierte un valor de celda de Google Sheets a string.
 * Maneja objetos Date de Google Sheets (que aparecen como 'Wed Jul 07...' en vez de '08:15').
 * @param {*} cellValue - Valor de la celda
 * @returns {string} String limpio
 */
function _cellToStr(cellValue) {
  if (cellValue === null || cellValue === undefined) return '';
  if (cellValue instanceof Date) {
    const h = cellValue.getHours();
    const m = cellValue.getMinutes();
    if (cellValue.getFullYear() === 1899 || (h < 24 && cellValue.getDate() === 1)) {
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }
    const day = String(cellValue.getDate()).padStart(2, '0');
    const month = String(cellValue.getMonth() + 1).padStart(2, '0');
    return day + '/' + month + '/' + cellValue.getFullYear();
  }
  return String(cellValue).trim();
}

/**
 * Parsea una línea de pasajero: "Oliver Hermanus (Executive Producer / Director)"
 */
function _parsePassengerLine(line) {
  if (!line) return { name: '', role: '' };
  
  const match = line.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (match) {
    return { name: match[1].trim(), role: match[2].trim() };
  }
  
  return { name: line.trim(), role: '' };
}

/**
 * Extract contact info from a row of cells (for driver database).
 * Looks for patterns like: "Massimiliano Rocchetti [Transportation Manager] +39 339 1050830 massimiliano.rocchetti@gmail.com"
 * Or: "Claudio D'Elia +39 347 7244593"
 */
function _extractContactInfo(cells) {
  const fullText = cells.join(' ');
  
  // Try to extract name before "[" or before phone
  let name = '';
  let phone = '';
  let role = '';
  
  // Pattern: "Name [Role] +phone email"
  const bracketMatch = fullText.match(/^(.+?)\s*\[(.+?)\]\s*(\+[\d\s]+)/);
  if (bracketMatch) {
    name = bracketMatch[1].trim();
    role = bracketMatch[2].trim();
    phone = bracketMatch[3].replace(/\s/g, '').trim();
    return { name, phone, role };
  }
  
  // Pattern: "Name +phone" (no brackets)
  const phoneMatch = fullText.match(/^(.+?)\s+(\+[\d\s]{8,})/);
  if (phoneMatch) {
    name = phoneMatch[1].trim();
    phone = phoneMatch[2].replace(/\s/g, '').trim();
    // Clean name - remove anything after email
    if (name.indexOf('@') > -1) name = name.substring(0, name.indexOf('@')).trim();
    return { name, phone, role };
  }
  
  // Pattern: just name (no phone)
  if (fullText && fullText.indexOf('@') === -1 && fullText.length > 3) {
    name = fullText.replace(/\s+/g, ' ').trim();
    // Truncate at common delimiters
    const delimiters = ['[', '+', '@'];
    for (const d of delimiters) {
      const idx = name.indexOf(d);
      if (idx > 0) name = name.substring(0, idx).trim();
    }
    if (name.length > 2) return { name, phone: '', role: '' };
  }
  
  return { name: '', phone: '', role: '' };
}

/**
 * Saves a driver to the Drivers sheet if not already present.
 * Updates phone if the driver exists but has no phone.
 * Uses header-based mapping (resilient to column order changes).
 */
function _saveDriverToSheet(name, phone, source) {
  try {
    if (!name || name.length < 2) return; // Skip empty/short names
    
    // Reject obviously non-driver names (roles, titles, departments)
    const rejectPatterns = /^(ad's|assistant|as per|transport|coordinator|manager|captain|dept|department|office|ops|operations)/i;
    if (rejectPatterns.test(name.trim())) return;
    
    const ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
    const sh = ss.getSheetByName(SHEETS.Drivers);
    if (!sh) return;
    
    const cleanName = name.trim();
    const cleanPhone = phone ? phone.replace(/^'/, '').trim() : ''; // Strip leading apostrophe
    
    // Normalize name for comparison: lowercase, collapse spaces, remove extra chars
    const normalize = (s) => s.toLowerCase().replace(/\s+/g, ' ').replace(/['']/g, "'").trim();
    const normalizedName = normalize(cleanName);
    
    // Read headers for header-based mapping
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const headerMap = {};
    headers.forEach((h, i) => { headerMap[h] = i; });
    
    // Check if driver already exists by normalized name
    const lastRow = sh.getLastRow();
    if (lastRow >= 2) {
      const nameCol = headerMap['Name'];
      if (nameCol !== undefined) {
        const names = sh.getRange(2, nameCol + 1, lastRow - 1, 1).getValues();
        for (let r = 0; r < names.length; r++) {
          if (normalize(String(names[r][0])) === normalizedName) {
            // Update phone if empty and new phone available
            const phoneCol = headerMap['Phone'];
            if (phoneCol !== undefined) {
              const existingPhone = String(sh.getRange(r + 2, phoneCol + 1).getValue()).replace(/^'/, '').trim();
              if (!existingPhone && cleanPhone) {
                const phoneFormatted = cleanPhone.startsWith('+') ? "'" + cleanPhone : cleanPhone;
                sh.getRange(r + 2, phoneCol + 1).setValue(phoneFormatted); // Phone
                const whatsappCol = headerMap['WhatsApp'];
                if (whatsappCol !== undefined) {
                  sh.getRange(r + 2, whatsappCol + 1).setValue(phoneFormatted); // WhatsApp
                }
              }
            }
            return; // Already exists
          }
        }
      }
    }
    
    // New driver — build row using header-based mapping
    const now = new Date();
    const id = 'DRV-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
    const isoNow = now.toISOString();
    let phoneFormatted = cleanPhone || '';
    if (phoneFormatted.startsWith('+')) {
      phoneFormatted = "'" + phoneFormatted;
    }
    
    // Build data object — _create will map to correct columns
    const data = {
      ID: id,
      Name: cleanName,
      Type: 'interno',
      DriverOwnership: 'own',
      CollaboratorID: '',
      Phone: phoneFormatted,
      WhatsApp: phoneFormatted,
      Email: '',
      IBAN: '',
      VehiclePreferred: '',
      LicenseType: '',
      LicenseExpiry: '',
      Status: 'Disponible',
      OperatingCompany: '',
      Notes: '',
      Source: source || 'import',
      LastImportDate: isoNow,
      LastUsed: '',
      TotalRides: 0,
      CreatedAt: isoNow,
      UpdatedAt: isoNow
    };
    
    // Build row array matching header order
    const row = headers.map(header => {
      const val = data[header];
      if (val !== undefined) {
        if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
          return JSON.stringify(val);
        }
        return val;
      }
      return '';
    });
    
    sh.appendRow(row);
  } catch (e) {
    Logger.log('Error saving driver: ' + e.message);
  }
}

/**
 * Construye el registro de servicio normalizado
 */
function _buildServiceRecord(serv, production, dateStr, fileName, idx, importSeq) {
  // Parse actual date from dateStr to use as the service date
  let actualDate = new Date();
  if (dateStr) {
    // dateStr format: "Tuesday July 07th" or "July 07th" etc.
    // Strip day name and ordinal suffixes (st, nd, rd, th) before parsing
    let cleaned = dateStr.replace(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*/i, '').trim();
    cleaned = cleaned.replace(/(\d+)(st|nd|rd|th)/i, '$1').trim();
    const year = new Date().getFullYear();
    const parsed = new Date(cleaned + ' ' + year);
    if (!isNaN(parsed.getTime())) {
      actualDate = parsed;
    } else {
      // Fallback: try DD/MM/YYYY pattern
      const m = cleaned.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (m) {
        const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const monthIdx = monthNames.indexOf(m[2].toLowerCase());
        if (monthIdx >= 0) {
          actualDate = new Date(parseInt(m[3]), monthIdx, parseInt(m[1]));
        }
      }
    }
  }
  
  // Use actual service date in the ID, not today's date
  const datePart = Utilities.formatDate(actualDate, Session.getScriptTimeZone(), 'yyyyMMdd');
  const id = 'TL-' + datePart + '-' + String(importSeq).padStart(2, '0') + String(idx + 1).padStart(3, '0');
  
  // Extract Google Maps URLs from pickup/dropoff text
  const toRaw = String(serv.to || '');
  const fromRaw = String(serv.from || '');
  const pickupMapsUrl = extractMapsUrl(fromRaw) || extractMapsUrl(serv.pickupLines && serv.pickupLines[0] ? String(serv.pickupLines[0]) : '');
  const dropoffMapsUrl = extractMapsUrl(toRaw) || extractMapsUrl(serv.dropoffLines && serv.dropoffLines[0] ? String(serv.dropoffLines[0]) : '');
  
  // Also check unmapped columns for Maps URLs (existing behavior)
  const mapsUrlRegex = /https?:\/\/(maps\.app\.goo\.gl|goo\.gl|google\.com\/maps)[^\s]*/i;
  let extraMapsUrl = '';
  // (unmapped column scanning happens in the main loop — we pass it via serv.notes)
  
  // Clean destination: remove URL part
  const toClean = cleanCellText(toRaw);
  const fromClean = cleanCellText(fromRaw);
  
  // Build notes with extra maps URL if present (from unmapped columns)
  let notes = serv.notes || '';
  
  // Build passengers list (semicolon-separated)
  const passengersList = serv.passengers
    ? serv.passengers.filter(Boolean).join('; ')
    : '';
  
  // Fix phone: prepend ' to prevent Google Sheets #ERROR on + prefix
  let phone = serv.driverPhone || '';
  if (phone.startsWith('+')) {
    phone = "'" + phone;
  }
  
  // Build rich passengers array (don't concatenate into string)
  const passengers = [];
  for (let p = 0; p < serv.passengers.length; p++) {
    passengers.push({
      name: serv.passengers[p] || '',
      role: serv.passengerRoles[p] || ''
    });
  }
  
  // Original transport date from header
  let originalTransportDate = '';
  if (dateStr) {
    originalTransportDate = parseTransportListDate(dateStr);
  }
  
  return {
    id: id,
    vehicle: serv.vehicle,
    vehicleType: serv.vehicleType || 'Van',
    driver: serv.driver,
    driverPhone: phone,
    time: serv.time,
    passengers: passengers,
    pickupLines: serv.pickupLines || [],
    dropoffLines: serv.dropoffLines || [],
    from: fromClean || (serv.pickupLines && serv.pickupLines[0]) || '',
    to: toClean || (serv.dropoffLines && serv.dropoffLines[0]) || '',
    pickupMapsUrl: pickupMapsUrl,
    dropoffMapsUrl: dropoffMapsUrl,
    flightInfo: serv.flightInfo,
    passengersList: passengersList,
    notes: notes,
    production: production,
    date: actualDate,
    originalTransportDate: originalTransportDate,
    dateStr: dateStr,
    fileName: fileName,
    section: serv.section || '',
    servicio: serv.servicio || '',
    serviceType: serv.serviceType || 'Dispo',
    isProduction: serv.isProduction || false,
    hasThenPickup: serv.hasThenPickup || false
  };
}
