// ============================================================================
// TRANSPORTLIST.GS — Entidad TransportList (lista de transporte importada)
// ============================================================================

const TransportListRepository = {
  SHEET: SHEETS.TransportLists,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByProject(projectId) {
    return _find(this.SHEET, row => row.ProjectID === projectId);
  },

  getByDateRange(startDate, endDate) {
    const lists = _getAll(this.SHEET);
    return lists.filter(l => {
      const d = new Date(l.ImportDate);
      return d >= new Date(startDate) && d <= new Date(endDate);
    });
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      ProjectID: data.ProjectID || '',
      FileName: data.FileName || '',
      ImportDate: data.ImportDate || now,
      Production: data.Production || '',
      ProjectName: data.ProjectName || '',
      TransportCompany: data.TransportCompany || '',
      TotalServices: data.TotalServices || 0,
      ImportedBy: data.ImportedBy || '',
      Notes: data.Notes || '',
      FileURL: data.FileURL || '',
      CreatedAt: now
    });
  },

  update(id, changes) {
    changes.UpdatedAt = new Date().toISOString();
    return _update(this.SHEET, id, changes);
  },

  toDTO(entity) {
    // Compute date range from services
    let dateRange = '';
    try {
      var services = ServiceRepository.getByTransportList(entity.ID);
      if (services && services.length > 0) {
        var dates = services
          .map(function(s) { return s.Date; })
          .filter(function(d) { return d && d.trim(); })
          .sort();
        if (dates.length > 0) {
          dateRange = dates[0] === dates[dates.length - 1]
            ? dates[0]
            : dates[0] + ' — ' + dates[dates.length - 1];
        }
      }
    } catch (e) {
      // Ignore — use fallback
    }

    // Fallback: extract dateStr from Notes field (stored as "dateStr:Tuesday July 07th")
    if (!dateRange && entity.Notes && entity.Notes.indexOf('dateStr:') === 0) {
      dateRange = entity.Notes.substring(8); // Remove "dateStr:" prefix
    }

    return {
      id: entity.ID,
      projectId: entity.ProjectID,
      fileName: entity.FileName,
      importDate: entity.ImportDate,
      production: entity.Production,
      projectName: entity.ProjectName,
      transportCompany: entity.TransportCompany,
      totalServices: entity.TotalServices,
      importedBy: entity.ImportedBy,
      notes: entity.Notes,
      dateRange: dateRange,
      fileURL: entity.FileURL || '',
      createdAt: entity.CreatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetTransportLists(projectId) {
  if (projectId) {
    return TransportListRepository.getByProject(projectId).map(TransportListRepository.toDTO);
  }
  return TransportListRepository.getAll().map(TransportListRepository.toDTO);
}

function apiGetTransportList(id) {
  const entity = TransportListRepository.getById(id);
  if (!entity) throw new NotFoundError('TransportList', id);
  return TransportListRepository.toDTO(entity);
}

function apiCreateTransportList(data) {
  if (!data.ProjectID) throw new ValidationError('ProjectID is required');
  const entity = TransportListRepository.create(data);
  _dispatchEvent({ type: 'transport_list.imported', entity: 'TransportList', entityId: entity.ID });
  return TransportListRepository.toDTO(entity);
}

// ============================================================================
// TRANSPORT LIST — Upload & Import
// ============================================================================

/**
 * Get or create the "Transport Lists Archive" folder in Google Drive.
 * Stores original Excel files for record-keeping.
 */
function _getOrCreateArchiveFolder() {
  var folderName = 'Transport Lists Archive';
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

/**
 * Get next import sequence number for a given date prefix.
 * Format: IMP-{yyyyMMdd}-{seq:02}
 */
function _getNextImportSeq(datePrefix) {
  var sh = getSheet(SHEETS.TransportLists);
  var data = sh.getDataRange().getValues();
  var maxSeq = 0;
  var prefix = 'IMP-' + datePrefix + '-';
  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][0] || '');
    if (id.indexOf(prefix) === 0) {
      var seq = parseInt(id.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return maxSeq + 1;
}

function uploadTransportListFile(fileData, fileName) {
  try {
    var blob = Utilities.newBlob(
      Utilities.base64Decode(fileData),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName
    );
    
    var folder = DriveApp.getRootFolder();
    var tempFile = folder.createFile(blob);
    tempFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
    var importSeq = _getNextImportSeq(today);
    
    var result = parseTransportListExcel(tempFile.getId(), importSeq);
    
    if (result.error) {
      tempFile.setTrashed(true);
      return result;
    }
    
    // Archive: move to "Transport Lists Archive" folder instead of trashing
    var archiveFolder = _getOrCreateArchiveFolder();
    tempFile.setName(today + '-' + String(importSeq).padStart(2, '0') + '_' + fileName);
    tempFile.moveTo(archiveFolder);
    
    return {
      success: true,
      importId: 'IMP-' + today + '-' + String(importSeq).padStart(2, '0'),
      totalServices: result.totalServices,
      production: result.production,
      projectName: result.projectName || '',
      transportCompany: result.transportCompany || '',
      dateStr: result.dateStr,
      footerContacts: result.footerContacts || [],
      servicios: result.servicios,
      fileName: fileName,
      importDate: new Date().toISOString(),
      fileUrl: tempFile.getUrl(),
      _debug: result._debug || null
    };
    
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================================
// BRIDGE: Create Service entities from imported Transport List
// ============================================================================

/**
 * Creates Service entities from imported Transport List data.
 * Links each service to its TransportListID.
 * Maps Driver_Name → DriverID by fuzzy matching in Drivers sheet.
 * VehicleID stays empty (assigned later or from driver report).
 * OperationalStatus: "Asignado" if driver found, "Importado" if not.
 *
 * @param {Spreadsheet} ss - Active spreadsheet
 * @param {Array} services - Array of imported service records
 * @param {string} importId - Import ID for linking
 * @param {string} projectId - Project ID to link services (optional)
 * @param {string} operatingCompany - OperatingCompany ID (optional)
 * @returns {number} Count of services created
 */
// Normalize any time value to 'HH:mm' string for consistent dedup keys
function _normalizeTime(t) {
  if (!t) return '';
  if (t instanceof Date) {
    return Utilities.formatDate(t, Session.getScriptTimeZone(), 'HH:mm');
  }
  var s = String(t).trim();

  // Handle multi-time strings (e.g., "08.10, 15.30" → "08:10, 15:30")
  if (s.indexOf(',') !== -1) {
    return s.split(',').map(function(part) {
      return _normalizeTime(part.trim());
    }).join(', ');
  }

  // Handle bare numbers (e.g., "8" → "08:00", "9" → "09:00")
  if (/^\d{1,2}$/.test(s)) {
    return (s.length === 1 ? '0' : '') + s + ':00';
  }

  // Handle 'H.mm' or 'HH.mm' format (Google Sheets stores 07.30 as 7.3)
  var mDot = s.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (mDot) {
    var h = mDot[1].length === 1 ? '0' + mDot[1] : mDot[1];
    var min = mDot[2].length === 1 ? mDot[2] + '0' : mDot[2];
    return h + ':' + min;
  }

  // Handle 'H:mm' or 'HH:mm' format (pad leading zero)
  var mColon = s.match(/^(\d{1,2}):(\d{2})$/);
  if (mColon) {
    return (mColon[1].length === 1 ? '0' : '') + mColon[1] + ':' + mColon[2];
  }

  return s;
}

// Normalize any date value to 'yyyy-MM-dd' string for consistent dedup keys
function _normalizeDate(d) {
  if (!d) return '';
  var dateObj;
  if (d instanceof Date) {
    dateObj = d;
  } else {
    var s = String(d).trim();
    // Handle 'dd/MM/yyyy' format
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      dateObj = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
    } else {
      dateObj = new Date(s);
    }
  }
  if (isNaN(dateObj.getTime())) return '';
  return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _createServicesFromImport(ss, services, importId, projectId, operatingCompany, existingKeys) {
  var importLogs = []; // Collect logs to return to frontend

  // EDGE005: No se pueden crear servicios en proyecto archivado
  if (projectId) {
    var project = ProjectRepository.getById(projectId);
    if (project && project.Status === 'Archiviato') {
      throw new BusinessRuleError('Cannot create services in archived project', 'EDGE005');
    }
  }

  var servicesSheet = ss.getSheetByName('Services');
  if (!servicesSheet) {
    Logger.log('Services sheet not found, skipping bridge');
    return 0;
  }
  // Existing deployments predate the Movements column. Add it lazily so a
  // deployment cannot silently discard child movements during import.
  var serviceHeaders = servicesSheet.getRange(1, 1, 1, servicesSheet.getLastColumn()).getValues()[0];
  if (serviceHeaders.indexOf('Movements') === -1) {
    servicesSheet.getRange(1, servicesSheet.getLastColumn() + 1).setValue('Movements');
  }
  
  var driversSheet = ss.getSheetByName('Drivers');
  var driverMap = {}; // name → { id, normalized }
  var driverPhoneMap = {}; // phone → { id, name }
  
  // Build driver lookup map from Drivers sheet (name + phone)
  importLogs.push('driversSheet exists: ' + !!driversSheet + ', rows: ' + (driversSheet ? driversSheet.getLastRow() : 'N/A'));
  if (driversSheet && driversSheet.getLastRow() > 1) {
    var driverData = driversSheet.getRange(2, 1, driversSheet.getLastRow() - 1, 5).getValues();
    for (var d = 0; d < driverData.length; d++) {
      var driverId = String(driverData[d][0] || '').trim();
      var driverName = String(driverData[d][1] || '').trim();
      var driverPhone = String(driverData[d][4] || '').trim(); // column E = Phone (D = CollaboratorID)
      if (driverId && driverName) {
        var norm = driverName.toLowerCase().replace(/\s+/g, ' ').replace(/['']/g, "'").trim();
        if (driverMap[norm] && driverMap[norm] !== driverId) {
          importLogs.push('DRIVER MAP CONFLICT: "' + norm + '" maps to ' + driverMap[norm] + ' but also ' + driverId);
        }
        driverMap[norm] = driverId;
      }
      if (driverId && driverPhone) {
        // Normalize phone to digits-only for consistent matching
        var digitsOnly = driverPhone.replace(/\D/g, '').trim();
        if (digitsOnly) {
          driverPhoneMap[digitsOnly] = { id: driverId, name: driverName };
        }
      }
    }
    importLogs.push('Driver map: ' + Object.keys(driverMap).length + ' drivers, ' + Object.keys(driverPhoneMap).length + ' phones');
    // Show ALL name→id entries
    var mapKeys = Object.keys(driverMap);
    for (var mk = 0; mk < mapKeys.length; mk++) {
      importLogs.push('  driver["' + mapKeys[mk] + '"] = ' + driverMap[mapKeys[mk]]);
    }
    // Detect duplicate IDs (same id mapped from different names)
    var idToNames = {};
    for (var mk2 = 0; mk2 < mapKeys.length; mk2++) {
      var id = driverMap[mapKeys[mk2]];
      if (!idToNames[id]) idToNames[id] = [];
      idToNames[id].push(mapKeys[mk2]);
    }
    var idKeys = Object.keys(idToNames);
    for (var ik = 0; ik < idKeys.length; ik++) {
      if (idToNames[idKeys[ik]].length > 1) {
        importLogs.push('DUPLICATE ID: ' + idKeys[ik] + ' → [' + idToNames[idKeys[ik]].join(', ') + ']');
      }
    }
  } else {
    importLogs.push('WARNING: Drivers sheet not found or empty. driverMap will be empty.');
  }
  
  // Find driver by name (exact match only — partial matching caused wrong driver assignments)
  function findDriverId(name) {
    if (!name || !name.trim()) return '';
    var norm = name.toLowerCase().replace(/\s+/g, ' ').replace(/['']/g, "'").trim();
    // Exact match only
    if (driverMap[norm]) return driverMap[norm];
    return '';
  }
  
  // Find driver by phone number (digits-only exact match)
  function findDriverByPhone(phone) {
    if (!phone || !phone.trim()) return null;
    var digitsOnly = phone.replace(/\D/g, '').trim();
    if (!digitsOnly) return null;
    // Exact match against normalized digits-only keys
    if (driverPhoneMap[digitsOnly]) return driverPhoneMap[digitsOnly];
    // Try with leading country code variations (39 = Italy)
    if (digitsOnly.startsWith('39') && digitsOnly.length > 10) {
      var withoutCC = digitsOnly.substring(2);
      if (driverPhoneMap[withoutCC]) return driverPhoneMap[withoutCC];
    }
    if (!digitsOnly.startsWith('39') && digitsOnly.length >= 10) {
      var withCC = '39' + digitsOnly;
      if (driverPhoneMap[withCC]) return driverPhoneMap[withCC];
    }
    return null;
  }
  
  // Create a new driver in the Drivers sheet
  function createNewDriver(name, phone) {
    var entity = DriverRepository.create({
      Name: name,
      Phone: phone || '',
      Status: 'Disponible',
      OperatingCompany: operatingCompany || 'TA',
      Notes: 'Auto-created from transport import'
    });
    _dispatchEvent({ type: 'driver.created', entity: 'Driver', entityId: entity.ID });
    return entity.ID;
  }
  
  var now = new Date().toISOString();
  var created = 0;
  var skippedProduction = 0;
  var skippedDuplicate = 0;
  
  for (var i = 0; i < services.length; i++) {
    var svc = services[i];
    
    // Skip empty/invalid services
    if (!svc.vehicle && !svc.driver && !svc.time && !svc.passengers) continue;
    
    // === FILTER: Skip Production vehicles (they belong to the production company, not the agency) ===
    var vehicleUpper = String(svc.vehicle || '').toUpperCase();
    if (svc.isProduction || vehicleUpper.indexOf('PRODUCTION') > -1) {
      skippedProduction++;
      continue;
    }
    
    // === DRIVER RESOLUTION: match by name → phone → create new ===
    var driverId = findDriverId(svc.driver);
    var driverMatchType = driverId ? 'name' : '';
    if (!driverId && svc.driverPhone) {
      // Try phone match
      var phoneMatch = findDriverByPhone(svc.driverPhone);
      if (phoneMatch) {
        driverId = phoneMatch.id;
        driverMatchType = 'phone→' + phoneMatch.name;
      }
    }
    if (!driverId && svc.driver && svc.driver.trim()) {
      // Not found by name or phone → create new driver
      driverId = createNewDriver(svc.driver, svc.driverPhone || '');
      driverMatchType = 'created';
    }
    var driverLogMsg = 'Service[' + i + '] "' + (svc.driver || '') + '" → driverId="' + driverId + '" (' + driverMatchType + ') | phone="' + (svc.driverPhone || '') + '"';
    importLogs.push(driverLogMsg);
    Logger.log(driverLogMsg);
    var operationalStatus = driverId ? 'Asignado' : 'Importado';
    
    // Parse date for Service entity (yyyy-MM-dd format for consistent dedup)
    var serviceDate = '';
    if (svc.date) {
      var d = new Date(svc.date);
      if (!isNaN(d.getTime())) {
        serviceDate = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
    }
    if (!serviceDate && svc.dateStr) {
      var cleaned = String(svc.dateStr).replace(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*/i, '').trim();
      cleaned = cleaned.replace(/(\d+)(st|nd|rd|th)/i, '$1').trim();
      var d2 = new Date(cleaned + ' ' + new Date().getFullYear());
      if (!isNaN(d2.getTime())) {
        serviceDate = Utilities.formatDate(d2, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
    }
    
    // Format time
    var timeStr = String(svc.time || '');
    if (svc.time && typeof svc.time === 'object' && svc.time instanceof Date) {
      timeStr = Utilities.formatDate(svc.time, Session.getScriptTimeZone(), 'HH:mm');
    }
    
    // Extract passenger data
    var passengerName = '';
    var passengerRole = '';
    if (Array.isArray(svc.passengers) && svc.passengers.length > 0) {
      passengerName = svc.passengers.map(function(p) {
        return (typeof p === 'object' && p !== null) ? (p.name || '') : String(p || '');
      }).filter(Boolean).join('; ');
      passengerRole = svc.passengers.map(function(p) {
        return (typeof p === 'object' && p !== null) ? (p.role || '') : '';
      }).filter(Boolean).join('; ');
    } else if (typeof svc.passengers === 'string') {
      passengerName = svc.passengers;
      passengerRole = svc.passengerRoles || '';
    }
    
    // Build pickup/dropoff as ARRAYS (not JSON strings)
    // ServiceRepository.create() will do JSON.stringify internally
    var pickupArr = svc.pickupLines || (svc.from ? [svc.from] : []);
    var dropoffArr = svc.dropoffLines || (svc.to ? [svc.to] : []);
    
    // Generate Service ID
    var svcId = 'SVC-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + String(i + 1).padStart(3, '0');
    
    // === CROSS-IMPORT DEDUP: skip if this service already exists ===
    // Key: date + time + passengerName (without driverId to catch re-imports)
    if (existingKeys && existingKeys.size > 0) {
      var dateKey = _normalizeDate(serviceDate);
      var timeKey = _normalizeTime(timeStr);
      var passengerKey = passengerName.trim().toLowerCase();
      var svcKey = dateKey + '|' + timeKey + '|' + passengerKey;
      // Debug: show every key being checked
      importLogs.push('Check[' + i + ']: ' + svcKey + ' | exists=' + existingKeys.has(svcKey));
      if (dateKey && timeKey && existingKeys.has(svcKey)) {
        var dedupSkipMsg = 'Dedup skip: ' + dateKey + ' ' + timeKey + ' ' + passengerKey;
        importLogs.push(dedupSkipMsg);
        Logger.log(dedupSkipMsg);
        skippedDuplicate++;
        continue;
      }
    }
    
    // Create Service entity — pass arrays, NOT JSON strings
    ServiceRepository.create({
      ID: svcId,
      ProjectID: projectId || '',
      TransportListID: importId,
      Date: serviceDate,
      Time: timeStr,
      Production: svc.production || '',
      Section: svc.section || '',
      PassengerName: passengerName,
      PassengerRole: passengerRole,
      PassengerPhone: '',
      PassengerDepartment: '',
      PickupLines: pickupArr,
      DropoffLines: dropoffArr,
      Movements: svc.movements || [],
      FlightInfo: svc.flightInfo || '',
      Notes: svc.notes || '',
      DriverID: driverId,
      VehicleID: '', // Empty — assigned later or from driver report
      OperationalStatus: operationalStatus,
      FinancialStatus: 'Pendiente',
      EstimatedRevenue: '',
      EstimatedCost: '',
      OperatingCompany: operatingCompany || '',
      Normalized: false,
      ServiceType: svc.serviceType || 'Dispo',
      ServiceTypeConfirmed: svc.serviceTypeConfirmed || false,
      IsWalking: svc.isWalking || false,
      VehicleType: svc.vehicleType || 'Van',
      ProviderType: driverId ? 'internal_driver' : '',
      ProviderID: driverId || ''
    });
    
    created++;
  }
  
  var finalMsg = 'Bridge: Created ' + created + ' Service entities, skipped ' + skippedProduction + ' Production, ' + skippedDuplicate + ' Duplicates from import ' + importId + ' (projectId=' + projectId + ')';
  importLogs.push(finalMsg);
  Logger.log(finalMsg);
  return { created: created, skipped: skippedDuplicate, skippedProduction: skippedProduction, importLogs: importLogs };
}

// ============================================================================
// IMPORT WITH PROJECT LINKING
// ============================================================================

/**
 * Import transport list with project linking.
 * Creates/links Client and Project, assigns ProjectID to all Services.
 * 
 * @param {Object} data - Import data
 * @param {Array} data.services - Parsed services from Excel
 * @param {string} data.importId - Import ID
 * @param {string} data.production - Production company name (from Excel)
 * @param {string} data.projectName - Project name (from Excel)
 * @param {string} data.clientId - Client ID (selected or created)
 * @param {string} data.projectId - Project ID (selected or created)
 * @param {string} data.operatingCompany - OperatingCompany ID ("TA" or "MM")
 * @returns {Object} { success, servicesCreated, clientId, projectId }
 */
function apiImportTransportListWithProject(data) {
  var importLogs = []; // Collect logs to return to frontend
  try {
    if (!data.services || data.services.length === 0) {
      return { error: 'No services to import' };
    }

    // === DUPLICATE IMPORT CHECK ===
    // Delta re-import: compare by key fields, only add new services
    var existingServices = [];
    var existingKeys = new Set();
    if (data.importId) {
      existingServices = ServiceRepository.getByTransportList(data.importId);
      if (existingServices && existingServices.length > 0) {
        // Build set of existing service keys for dedup
        for (var e = 0; e < existingServices.length; e++) {
          var ex = existingServices[e];
          var exDate = _normalizeDate(ex.Date);
          var exTime = _normalizeTime(ex.Time);
          var exPassenger = String(ex.PassengerName || '').trim().toLowerCase();
          if (exDate && exTime) {
            existingKeys.add(exDate + '|' + exTime + '|' + exPassenger);
          }
        }
        Logger.log('Delta re-import: found ' + existingServices.length + ' existing services, ' + existingKeys.size + ' unique keys');
      }
    }

    var ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
    
    // === CLIENT RESOLUTION ===
    var clientId = data.clientId || '';
    var clientName = data.production || '';
    
    if (!clientId && clientName) {
      var existingClient = ClientRepository.getByName(clientName);
      if (existingClient) {
        clientId = existingClient.ID;
      } else {
        var newClient = ClientRepository.create({
          Name: clientName,
          Type: 'production',
          PaymentTerms: 30,
          Notes: 'Auto-created from transport import'
        });
        clientId = newClient.ID;
        _dispatchEvent({ type: 'client.created', entity: 'Client', entityId: clientId });
      }
    }
    
    // === PROJECT RESOLUTION ===
    var projectId = data.projectId || '';
    var projectName = data.projectName || data.production || '';
    
    if (!projectId && projectName) {
      var allProjects = ProjectRepository.getAll();
      var existingProject = allProjects.find(function(p) {
        return p.Name === projectName && p.ClientID === clientId;
      });
      
      if (existingProject) {
        projectId = existingProject.ID;
      } else {
        var newProject = ProjectRepository.create({
          Name: projectName,
          ClientID: clientId,
          OperatingCompany: data.operatingCompany || 'TA',
          Status: 'Activo',
          Notes: 'Auto-created from transport import'
        });
        projectId = newProject.ID;
        _dispatchEvent({ type: 'project.created', entity: 'Project', entityId: projectId });
      }
    }
    
    // === CREATE SERVICE ENTITIES DIRECTLY (no legacy sheets) ===
    // Re-build dedup keys by projectId if the importId-based dedup found nothing
    // This handles re-imports where projectId exists but importId differs
    if (existingKeys.size === 0 && projectId) {
      var allExisting = ServiceRepository.getAllByProject(projectId);
      if (allExisting && allExisting.length > 0) {
        for (var e2 = 0; e2 < allExisting.length; e2++) {
          var ex2 = allExisting[e2];
          var ex2Date = _normalizeDate(ex2.Date);
          var ex2Time = _normalizeTime(ex2.Time);
          var ex2Passenger = String(ex2.PassengerName || '').trim().toLowerCase();
          if (ex2Date && ex2Time) {
            existingKeys.add(ex2Date + '|' + ex2Time + '|' + ex2Passenger);
          }
        }
        Logger.log('Cross-import dedup: built ' + existingKeys.size + ' keys from ' + allExisting.length + ' existing services in project ' + projectId);
      }
    }
    Logger.log('Dedup keys total: ' + existingKeys.size + ' (projectId=' + projectId + ')');
    // Debug: show first 5 existing keys
    var keyArr = Array.from(existingKeys);
    for (var dk = 0; dk < Math.min(5, keyArr.length); dk++) {
      importLogs.push('Existing key[' + dk + ']: ' + keyArr[dk]);
    }
    importLogs.push('Dedup: ' + existingKeys.size + ' existing keys in project ' + (projectId || 'none'));
    var importResult = _createServicesFromImport(ss, data.services, data.importId, projectId, data.operatingCompany, existingKeys);
    
    // === CREATE TRANSPORT LIST ENTITY (ERD-aligned) ===
    TransportListRepository.create({
      ProjectID: projectId,
      FileName: data.importId,
      ImportDate: new Date().toISOString(),
      Production: data.production || '',
      ProjectName: projectName,
      TransportCompany: '',
      TotalServices: importResult.created,
      ImportedBy: '',
      Notes: 'dateStr:' + (data.dateStr || ''),
      FileURL: data.fileUrl || ''
    });
    
    _dispatchEvent({
      type: 'transport_list.imported',
      entity: 'TransportList',
      entityId: data.importId,
      payload: { count: importResult.created, clientId: clientId, projectId: projectId }
    });
    
    return {
      success: true,
      servicesCreated: importResult.created,
      servicesSkipped: importResult.skipped,
      clientId: clientId,
      projectId: projectId,
      importId: data.importId,
      importLogs: importLogs.concat(importResult.importLogs || [])
    };
    
  } catch (e) {
    Logger.log('Error in apiImportTransportListWithProject: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Auto-detect Client and Project from production name.
 * Returns suggestions for the import modal.
 * 
 * @param {string} production - Production company name
 * @param {string} projectName - Project name (optional)
 * @returns {Object} { client, project, clients, projects }
 */
function apiAutoDetectImportTargets(production, projectName) {
  try {
    var result = {
      client: null,
      project: null,
      clients: [],
      projects: []
    };
    
    // Search for matching Client
    if (production) {
      var allClients = ClientRepository.getAll();
      var norm = production.toLowerCase().trim();
      
      // Exact match
      var exact = allClients.find(function(c) {
        return c.Name.toLowerCase().trim() === norm;
      });
      
      // Partial match
      var partial = allClients.filter(function(c) {
        var cName = c.Name.toLowerCase().trim();
        return cName.indexOf(norm) > -1 || norm.indexOf(cName) > -1;
      });
      
      result.client = exact ? ClientRepository.toDTO(exact) : null;
      result.clients = (partial.length > 0 ? partial : allClients).map(ClientRepository.toDTO);
    }
    
    // Search for matching Project
    if (projectName || production) {
      var searchName = projectName || production;
      var allProjects = ProjectRepository.getAll();
      var pNorm = searchName.toLowerCase().trim();
      
      var pExact = allProjects.find(function(p) {
        return p.Name.toLowerCase().trim() === pNorm;
      });
      
      var pPartial = allProjects.filter(function(p) {
        var pName = p.Name.toLowerCase().trim();
        return pName.indexOf(pNorm) > -1 || pNorm.indexOf(pName) > -1;
      });
      
      result.project = pExact ? ProjectRepository.toDTO(pExact) : null;
      result.projects = (pPartial.length > 0 ? pPartial : allProjects).map(ProjectRepository.toDTO);
    }
    
    return result;
  } catch (e) {
    return { client: null, project: null, clients: [], projects: [] };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Export transport services to Excel.
 * @param {Array} services - Array of service objects
 * @param {string} fileName - Output file name
 * @returns {Object} { success, excelUrl, excelDownloadUrl, fileId }
 */
function exportTransportListExcel(services, fileName) {
  try {
    if (!services || services.length === 0) {
      return { error: 'No hay servicios para exportar' };
    }

    var ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);

    var existingExcelSheet = ss.getSheetByName('TEMP_EXCEL');
    if (existingExcelSheet) ss.deleteSheet(existingExcelSheet);
    var tempSheet = ss.insertSheet('TEMP_EXCEL');

    var headers = ['Vehicle', 'Driver', 'Phone', 'Time', 'Passengers', 'Roles', 'From', 'To', 'Flight', 'Notes'];
    tempSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    tempSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1a1a2e')
      .setFontColor('#ffffff');

    var rows = services.map(function(s) {
      return [
        s.vehicle || '',
        s.driver || '',
        s.driverPhone || '',
        s.time || '',
        s.passengers || '',
        s.passengerRoles || '',
        s.from || '',
        s.to || '',
        s.flightInfo || '',
        s.notes || ''
      ];
    });

    if (rows.length > 0) {
      tempSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    SpreadsheetApp.flush();
    Utilities.sleep(2000);

    var spreadsheetId = ss.getId();
    var sheetId = tempSheet.getSheetId();

    var url = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId +
      '/export?format=xlsx&gid=' + sheetId;

    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
    });

    var xlsxBlob = response.getBlob().setName(fileName || 'Transport_List.xlsx');

    var folder = getOrCreateTempFolder();
    var xlsxFile = folder.createFile(xlsxBlob);
    xlsxFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    ss.deleteSheet(tempSheet);
    cleanupOldTempFiles(folder);

    return {
      success: true,
      excelUrl: xlsxFile.getUrl(),
      excelDownloadUrl: 'https://drive.google.com/uc?export=download&id=' + xlsxFile.getId(),
      fileId: xlsxFile.getId()
    };

  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Get or create temporary folder in Drive.
 * @returns {Folder} Drive folder
 */
function getOrCreateTempFolder() {
  var folderName = 'TA_Temp_Files';
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

/**
 * Clean up old temporary files (older than 24 hours).
 * @param {Folder} folder - Drive folder
 */
function cleanupOldTempFiles(folder) {
  try {
    var cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      if (file.getDateCreated() < cutoff) {
        file.setTrashed(true);
      }
    }
  } catch (e) {
    Logger.log('Error cleaning temp files: ' + e.message);
  }
}

// ============================================================================
// DUPLICATE CLEANUP — Run from Apps Script editor
// ============================================================================

/**
 * Find and remove duplicate services within a project.
 * Keeps the OLDEST service (first import), removes newer duplicates.
 * Key: date + time + passengerName
 * 
 * @param {string} projectId - Project ID to clean (or '' for all projects)
 * @returns {Object} { removed: number, details: [] }
 */
function cleanupDuplicateServices(projectId) {
  var removed = 0;
  var details = [];
  
  try {
    // Get all services (optionally filtered by project)
    var allServices = projectId 
      ? ServiceRepository.getAllByProject(projectId)
      : ServiceRepository.getAll();
    
    if (!allServices || allServices.length === 0) {
      return { removed: 0, details: ['No services found'] };
    }
    
    // Group by dedup key (date + time + passengerName)
    var groups = {};
    allServices.forEach(function(svc) {
      var dateKey = _normalizeDate(svc.Date);
      var timeKey = _normalizeTime(svc.Time);
      var passengerKey = String(svc.PassengerName || '').trim().toLowerCase();
      var key = dateKey + '|' + timeKey + '|' + passengerKey;
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(svc);
    });
    
    // Find groups with duplicates
    Object.keys(groups).forEach(function(key) {
      var group = groups[key];
      if (group.length <= 1) return;
      
      // Sort by CreatedAt ascending (keep oldest)
      group.sort(function(a, b) {
        return new Date(a.CreatedAt || 0) - new Date(b.CreatedAt || 0);
      });
      
      // Remove all but the first (oldest)
      for (var i = 1; i < group.length; i++) {
        var svc = group[i];
        try {
          _delete(SHEETS.Services, svc.ID);
          removed++;
          details.push('Removed: ' + svc.ID + ' (' + key + ')');
          Logger.log('Cleanup: Removed duplicate ' + svc.ID + ' for key: ' + key);
        } catch (e) {
          details.push('Error removing ' + svc.ID + ': ' + e.message);
          Logger.log('Cleanup error: ' + e.message);
        }
      }
    });
    
    Logger.log('Cleanup complete: removed ' + removed + ' duplicate services');
    return { removed: removed, details: details };
    
  } catch (e) {
    Logger.log('Cleanup error: ' + e.message);
    return { removed: removed, details: details.concat(['Error: ' + e.message]) };
  }
}

/**
 * Preview duplicates without removing them.
 * Safe to run — does NOT delete anything.
 */
function previewDuplicateServices(projectId) {
  var allServices = projectId 
    ? ServiceRepository.getAllByProject(projectId)
    : ServiceRepository.getAll();
  
  var groups = {};
  allServices.forEach(function(svc) {
    var dateKey = _normalizeDate(svc.Date);
    var timeKey = _normalizeTime(svc.Time);
    var passengerKey = String(svc.PassengerName || '').trim().toLowerCase();
    var key = dateKey + '|' + timeKey + '|' + passengerKey;
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(svc);
  });
  
  var duplicates = [];
  Object.keys(groups).forEach(function(key) {
    if (groups[key].length > 1) {
      duplicates.push({
        key: key,
        count: groups[key].length,
        ids: groups[key].map(function(s) { return s.ID; }),
        drivers: groups[key].map(function(s) { return s.DriverID || '(none)'; }),
        passengers: groups[key].map(function(s) { return s.PassengerName || ''; })
      });
    }
  });
  
  Logger.log('Found ' + duplicates.length + ' duplicate groups');
  duplicates.forEach(function(d) {
    Logger.log('  ' + d.key + ': ' + d.count + ' copies — IDs: ' + d.ids.join(', '));
  });
  
  return duplicates;
}
