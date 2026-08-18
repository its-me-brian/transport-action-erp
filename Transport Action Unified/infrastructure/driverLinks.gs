// ============================================================================
// DRIVERLINKS.GS v2 — Sistema de links para conductores (FASE 15A)
// ============================================================================
// Docs: docs/09_MIGRATION_WHatsapp_DRIVERLINKS.md (sections 3.2-3.3)
//
// CAMBIOS v2 (FASE 15A):
// - DateFrom/DateTo (rango semanal, no un solo dia)
// - FieldsSchema (JSON configurable por link)
// - Estados: ACTIVE -> EXPIRED | REVOKED (state machine centralizada)
// - DriverLinkEvents para trazabilidad completa
// - LockService en submit

// ============================================================================
// HTML ESCAPE — Prevent XSS in public driver form
// ============================================================================

function _escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format ISO date string to Italian locale (DD/MM/YYYY).
 * Handles both ISO strings and Date objects.
 */
function _formatDateIT(dateVal) {
  if (!dateVal) return '';
  try {
    var d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    return day + '/' + month + '/' + year;
  } catch (e) {
    return String(dateVal);
  }
}

// ============================================================================
// DEFAULT FIELD SCHEMA
// ============================================================================

var DEFAULT_FIELDS_SCHEMA = [
  { key: 'orarioInizio',     label: 'Ora Inizio',          type: 'time',     required: true },
  { key: 'orarioFine',       label: 'Ora Fine',            type: 'time',     required: true },
  { key: 'kmTotali',         label: 'KM Totali',           type: 'number',   required: true, min: 0 },
  { key: 'diaria',           label: 'Diaria',              type: 'select',   required: false, options: ['nessuna', 'piena', 'mezza'], defaultVal: 'nessuna' },
  { key: 'note',             label: 'Note',                type: 'textarea', required: false }
];

// ============================================================================
// GET SERVICES BY DRIVER AND DATE RANGE
// ============================================================================

function _getServicesByDriverAndDateRange(driverId, projectId, dateFrom, dateTo) {
  try {
    var services = ServiceRepository.getAllByDriver(driverId);
    if (projectId) {
      return services.filter(function(s) {
        return s.Date >= dateFrom && s.Date <= dateTo && s.OperationalStatus !== 'Validado' && s.ProjectID === projectId;
      });
    }
    return services.filter(function(s) {
      return s.Date >= dateFrom && s.Date <= dateTo && s.OperationalStatus !== 'Validado';
    });
  } catch (e) {
    return [];
  }
}

// ============================================================================
// GENERATE LINK (v2 - DateFrom/DateTo + FieldsSchema)
// ============================================================================

function generateDriverLink(driverId, projectId, dateFrom, dateTo, baseUrl, fieldsSchema, linkDurationDays) {
  try {
    if (!driverId || !projectId || !dateFrom || !dateTo) {
      return { success: false, error: 'driverId, projectId, dateFrom, and dateTo are required' };
    }

    if (dateFrom > dateTo) {
      return { success: false, error: 'dateFrom must be before or equal to dateTo' };
    }

    var token = _generateId('DL', 'TA').replace('DL-TA-', '').replace(/-/g, '');

    var now = new Date();
    var durationDays = (linkDurationDays !== undefined && linkDurationDays !== null && linkDurationDays >= 0)
      ? parseInt(linkDurationDays, 10)
      : 1;
    var expiresAt = new Date(new Date(dateTo).getTime() + durationDays * 24 * 60 * 60 * 1000);

    var schema = fieldsSchema || DEFAULT_FIELDS_SCHEMA;

    var linkData = {
      Token: token,
      DriverID: driverId,
      ProjectID: projectId,
      DateFrom: dateFrom,
      DateTo: dateTo,
      Status: 'ACTIVE',
      FieldsSchema: JSON.stringify(schema),
      CreatedAt: now.toISOString(),
      ExpiresAt: expiresAt.toISOString()
    };

    var sh = getSheet(SHEETS.DriverLinks);
    sh.appendRow([
      linkData.Token,
      linkData.DriverID,
      linkData.ProjectID,
      linkData.DateFrom,
      linkData.DateTo,
      linkData.Status,
      linkData.FieldsSchema,
      linkData.CreatedAt,
      linkData.ExpiresAt
    ]);

    _logLinkEvent(token, 'CREATED', {
      driverId: driverId,
      projectId: projectId,
      dateFrom: dateFrom,
      dateTo: dateTo
    });

    var link = (baseUrl || SpreadsheetApp.getService().getUrl()) +
      '?action=driverForm&token=' + token;

    return {
      success: true,
      token: token,
      link: link,
      expiresAt: expiresAt.toISOString(),
      dateFrom: dateFrom,
      dateTo: dateTo,
      fieldsSchema: schema
    };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// SERVE DRIVER FORM (v2 - dynamic fields from schema)
// ============================================================================

function _serveDriverForm(token) {
  var linkData = getDriverLinkByToken(token);
  if (!linkData) {
    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Link non valido</title>' +
      '<style>' +
      '*{margin:0;padding:0;box-sizing:border-box}' +
      'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fafafa;color:#1a1a2e}' +
      '.card{background:#fff;border-radius:20px;padding:56px 40px;max-width:400px;width:90%;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.06)}' +
      '.icon{width:72px;height:72px;margin:0 auto 24px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center}' +
      '.icon svg{width:36px;height:36px;color:#ef4444}' +
      'h2{font-size:22px;font-weight:700;margin-bottom:10px;color:#1a1a2e;letter-spacing:-.4px}' +
      'p{color:#6b7280;font-size:15px;line-height:1.6}' +
      '</style></head><body>' +
      '<div class="card">' +
      '<div class="icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg></div>' +
      '<h2>Link non valido</h2>' +
      '<p>Il link e scaduto o non e valido.<br>Chiedi un nuovo link al coordinatore.</p>' +
      '</div></body></html>'
    );
  }

  _logLinkEvent(token, 'ACCESSED');

  var services = _getServicesByDriverAndDateRange(linkData.DriverID, linkData.ProjectID, linkData.DateFrom, linkData.DateTo);

  if (!services || services.length === 0) {
    services = [{
      ID: '', Time: '', Production: '', Section: '',
      PassengerName: '', PassengerRole: '',
      PickupLines: '[]', DropoffLines: '[]', VehicleID: ''
    }];
  }

  var fieldsSchema = DEFAULT_FIELDS_SCHEMA;
  try {
    if (linkData.FieldsSchema) {
      fieldsSchema = JSON.parse(linkData.FieldsSchema);
    }
  } catch (e) {}

  var serviceCardsHtml = '';
  services.forEach(function(svc, index) {
    var pickupLines = [];
    var dropoffLines = [];
    try { pickupLines = JSON.parse(svc.PickupLines || '[]'); } catch(e) {}
    try { dropoffLines = JSON.parse(svc.DropoffLines || '[]'); } catch(e) {}

    var passengerInfo = svc.PassengerName || '';
    if (svc.PassengerRole) passengerInfo += ' (' + svc.PassengerRole + ')';

    // Format service date
    var svcDate = '';
    if (svc.Date) {
      try {
        var d = new Date(svc.Date);
        if (!isNaN(d.getTime())) {
          svcDate = _formatDateIT(d);
        }
      } catch(e) {}
    }

    serviceCardsHtml +=
      '<div class="svc" id="svc-' + index + '" data-date="' + _escapeHtml(svc.Date || '') + '">' +
      '<div class="svc-hd">' +
      '<input type="checkbox" name="selectedServices" value="' + index + '" onchange="toggleServiceFields(' + index + ')">' +
      '<span class="svc-time">' + _escapeHtml(svc.Time || '—') + '</span>' +
      '<span class="svc-prod">' + _escapeHtml(svc.Production || '—') + '</span>' +
      (svcDate ? '<span class="svc-date">' + _escapeHtml(svcDate) + '</span>' : '') +
      '</div>' +
      '<div class="svc-det">' +
      (svc.Section ? '<div><b>Sezione:</b> ' + _escapeHtml(svc.Section) + '</div>' : '') +
      (passengerInfo ? '<div><b>Passeggero:</b> ' + _escapeHtml(passengerInfo) + '</div>' : '') +
      (pickupLines.length > 0 ? '<div><b>Da:</b> ' + _escapeHtml(pickupLines.join(', ')) + '</div>' : '') +
      (dropoffLines.length > 0 ? '<div><b>A:</b> ' + _escapeHtml(dropoffLines.join(', ')) + '</div>' : '') +
      '</div>' +
      '<div class="svc-fields" id="svc-fields-' + index + '" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb">' +
      '<div class="svc-fields-grid">' +
      '<div class="fg"><label>Ora Inizio *</label><input type="time" id="f-orarioInizio-' + index + '" required></div>' +
      '<div class="fg"><label>Ora Fine *</label><input type="time" id="f-orarioFine-' + index + '" required></div>' +
      '<div class="fg"><label>KM Totali *</label><input type="number" id="f-kmTotali-' + index + '" min="0" required></div>' +
      '<div class="fg"><label>Diaria</label><select id="f-diaria-' + index + '"><option value="nessuna">Nessuna</option><option value="piena">Piena</option><option value="mezza">Mezza</option></select></div>' +
      '<div class="fg svc-notes"><label>Note</label><textarea id="f-note-' + index + '" placeholder="Note aggiuntive..."></textarea></div>' +
      '</div></div>' +
      '<input type="hidden" id="serviceId-' + index + '" value="' + _escapeHtml(svc.ID || '') + '">' +
      '</div>';
  });

  // Format dates for Italian display
  var dateFrom = _formatDateIT(linkData.DateFrom);
  var dateTo = _formatDateIT(linkData.DateTo);
  var dateRangeInfo = dateFrom;
  if (dateFrom !== dateTo) {
    dateRangeInfo = dateFrom + ' — ' + dateTo;
  }

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Rapportino Transport</title>' +
    '<style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,sans-serif;max-width:600px;margin:0 auto;padding:20px 16px;background:#fafafa;color:#1a1a2e;-webkit-font-smoothing:antialiased;line-height:1.5}' +
    '.hd{background:#1a1a2e;color:#fff;padding:32px 24px;border-radius:16px;margin-bottom:28px;text-align:center}' +
    '.hd h1{font-size:20px;font-weight:700;letter-spacing:-.4px;margin-bottom:8px}' +
    '.hd .meta{font-size:13px;opacity:.65;font-weight:400}' +
    '.sec{font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;margin:28px 0 14px 0;padding-bottom:8px;border-bottom:1px solid #e5e7eb}' +
    '.svc{background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px;cursor:pointer;transition:all .12s ease}' +
    '.svc:hover{border-color:#c7d2fe;box-shadow:0 2px 8px rgba(0,0,0,.04)}' +
    '.svc:has(input:checked){border-color:#4f46e5;background:#fafafe;box-shadow:0 0 0 3px rgba(79,70,229,.08)}' +
    '.svc:has(input:checked) .svc-time{background:#4f46e5}' +
    '.svc-hd{display:flex;align-items:center;gap:10px}' +
    '.svc-hd input[type=checkbox]{width:16px;height:16px;accent-color:#4f46e5;flex-shrink:0}' +
    '.svc-time{background:#374151;color:#fff;padding:3px 10px;border-radius:6px;font-weight:700;font-size:13px;transition:background .12s ease}' +
    '.svc-prod{font-weight:700;font-size:14px;color:#1a1a2e}' +
    '.svc-det{font-size:13px;color:#6b7280;line-height:1.6;margin-top:8px;padding-left:26px}' +
    '.svc-det b{color:#374151;font-weight:600}' +
    '.svc-date{margin-left:auto;font-size:12px;color:#6b7280;background:#f3f4f6;padding:2px 8px;border-radius:4px;white-space:nowrap}' +
    '.fg{margin-bottom:18px}' +
    '.fg label{display:block;margin-bottom:5px;font-weight:600;font-size:13px;color:#374151}' +
    '.req{color:#ef4444}' +
    'input,select,textarea{width:100%;padding:10px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:15px;font-family:inherit;color:#1a1a2e;background:#fff;transition:border-color .12s,box-shadow .12s}' +
    'input:focus,select:focus,textarea:focus{outline:none;border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.1)}' +
    'textarea{height:80px;resize:vertical}' +
    'select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%239ca3af\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}' +
    '.btn{width:100%;padding:14px;background:#1a1a2e;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer;transition:all .12s ease;margin-top:8px}' +
    '.btn:hover{background:#2d2d4a;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.12)}' +
    '.btn:active{transform:translateY(0)}' +
    '.btn:disabled{background:#9ca3af;cursor:not-allowed;transform:none;box-shadow:none}' +
    '.ok{background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:12px;padding:36px 24px;text-align:center}' +
    '.ok h3{margin-bottom:6px;color:#059669;font-size:20px;font-weight:700}' +
    '.ok p{color:#6b7280;font-size:15px}' +
    '@media(max-width:480px){body{padding:12px 10px}.hd{padding:24px 16px}.hd h1{font-size:18px}}' +
    '</style></head><body>' +
    '<div class="hd"><h1>Rapportino Transport</h1>' +
    '<div class="meta">' + _escapeHtml(dateRangeInfo) + ' · ' + _escapeHtml(linkData.DriverID) + '</div></div>' +
    '<form id="driverForm" onsubmit="return submitForm()">' +
    '<div class="sec">Seleziona il servizio</div>' +
    serviceCardsHtml +
    '<button type="submit" class="btn" id="submitBtn">Invia Rapportino</button>' +
    '</form>' +
    '<div id="successMsg" class="ok" style="display:none">' +
    '<h3>Rapportino inviato!</h3><p>Grazie per la collaborazione.</p></div>' +
    '<script>' +
    'var TOKEN="' + token + '";' +
    'var SERVICES=' + JSON.stringify(services) + ';' +
    'function toggleServiceFields(idx){' +
    '  var box=document.getElementById("svc-fields-"+idx);' +
    '  if(!box)return;' +
    '  var cb=document.querySelector("input[name=selectedServices][value=\\""+idx+"\\"]");' +
    '  box.style.display=cb&&cb.checked?"block":"none";' +
    '}' +
    'function submitForm(){' +
    '  var btn=document.getElementById("submitBtn");' +
    '  btn.disabled=true;' +
    '  btn.textContent="Invio in corso...";' +
    '  var checked=document.querySelectorAll("input[name=selectedServices]:checked");' +
    '  if(!checked.length){alert("Seleziona almeno un servizio");btn.disabled=false;btn.textContent="Invia Rapportino";return false;}' +
    '  var allData=[];' +
    '  checked.forEach(function(cb){' +
    '    var idx=parseInt(cb.value,10);' +
    '    var svc=SERVICES[idx];' +
    '    var d={serviceId:svc?svc.ID:"",dataServizio:svc?svc.Date||"":""};' +
    '    var prefix="f-";' +
    '    ["orarioInizio","orarioFine","kmTotali","diaria","note"].forEach(function(k){' +
    '      var el=document.getElementById(prefix+k+"-"+idx);' +
    '      if(!el)return;' +
    '      d[k]=el.type==="number"?parseFloat(el.value)||0:el.value;' +
    '    });' +
    '    allData.push(d);' +
    '  });' +
    '  google.script.run' +
    '    .withSuccessHandler(function(){document.getElementById("driverForm").style.display="none";document.getElementById("successMsg").style.display="block"})' +
    '    .withFailureHandler(function(e){alert("Errore: "+e.message);btn.disabled=false;btn.textContent="Invia Rapportino"})' +
    '    .submitDriverLinkResponse(TOKEN,allData);' +
    '  return false;' +
    '}' +
    '</script></body></html>';

  return HtmlService.createHtmlOutput(html).setTitle('Rapportino Transport');
}

// ============================================================================
// SUBMIT RESPONSE (v2 - with lock + events)
// ============================================================================

function submitDriverLinkResponse(token, services) {
  try {
    if (!token || !services || !services.length) {
      return { success: false, error: 'Token and services are required' };
    }

    var linkData = getDriverLinkByToken(token);
    if (!linkData) {
      return { success: false, error: 'Token expired or invalid' };
    }

    var count = 0;
    var results = [];

    _withLock(function() {
      // Reload inside lock
      var currentLinkData = getDriverLinkByToken(token);
      if (!currentLinkData) {
        throw new Error('Token expired or invalid');
      }

      var sh = getSheet(SHEETS.DriverLinkResponses);

      services.forEach(function(svc) {
        var responseId = _generateId('DLR', 'TA');
        sh.appendRow([
          responseId,                              // ID
          token,                                   // Token
          linkData.DriverID,                       // DriverID
          linkData.ProjectID,                      // ProjectID
          svc.serviceId || '',                     // ServiceID
          svc.dataServizio || '',                  // DataServizio
          svc.tipoServizio || 'TRANSFER',          // TipoServizio
          svc.orarioInizio || '',                  // OrarioInizio
          svc.orarioFine || '',                    // OrarioFine
          svc.descrizione || '',                   // Descrizione
          svc.clienti || '',                       // Clienti
          svc.targa || '',                         // Targa
          svc.kmTotali || 0,                       // KmTotali
          svc.diaria || 'nessuna',                 // Diaria
          svc.note || '',                          // Note
          new Date().toISOString()                 // SubmittedAt
        ]);
        count++;

        if (svc.serviceId) {
          try {
            var service = ServiceRepository.getById(svc.serviceId);
            if (service && service.OperationalStatus !== 'Validado') {
              // Route through ServiceCommands to respect state machine
              var status = service.OperationalStatus;
              if (status === 'EnRuta') {
                ServiceCommands.completeService(svc.serviceId);
              } else if (status === 'Confirmado') {
                ServiceCommands.startService(svc.serviceId);
                ServiceCommands.completeService(svc.serviceId);
              } else if (status === 'Asignado') {
                ServiceCommands.confirmService(svc.serviceId);
                ServiceCommands.startService(svc.serviceId);
                ServiceCommands.completeService(svc.serviceId);
              }
              // Importado: cannot complete — driver not assigned
            }

              // Route through Inbox for unified traceability (Issue #11)
              var rawData = {
                serviceId: svc.serviceId,
                startTime: svc.orarioInizio || '',
                endTime: svc.orarioFine || '',
                kmTotal: svc.kmTotali || 0,
                hasDiaria: svc.diaria === 'piena' || svc.diaria === 'mezza',
                isFestivo: false,
                isNotturno: false,
                diariaType: svc.diaria || 'none',
                kmExtra: svc.kmExtra || 0,
                hoursExtra: svc.hoursExtra || 0,
                parking: svc.parking || 0,
                tolls: svc.tolls || 0,
                fuel: svc.fuel || 0,
                waitMinutes: svc.waitMinutes || 0,
                notes: svc.note || ''
              };

              var inboxResult = captureReport(
                'driverlink', 'web_form',
                linkData.DriverID, linkData.ProjectID,
                svc.dataServizio || new Date().toISOString().split('T')[0],
                rawData
              );
              results.push({ serviceId: svc.serviceId, inboxId: inboxResult.inboxId || null });
            }
          } catch (e) {
            Logger.log('Error processing service ' + svc.serviceId + ': ' + e.message);
          }
        }
      });

      // NOTE: Link stays ACTIVE after submit — driver can submit multiple times
      // within the DateFrom-DateTo range. Link auto-expires via getDriverLinkByToken
      // when ExpiresAt is reached.
    });

    _logLinkEvent(token, 'SUBMITTED', { serviceCount: count, results: results });

    _notifyDriverSubmission(token, services);

    return { success: true, serviceCount: count, results: results };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// QUERY FUNCTIONS (v2 - DateFrom/DateTo aware)
// ============================================================================

function getDriverLinkByToken(token) {
  try {
    var sh = getSheet(SHEETS.DriverLinks);
    var data = sh.getDataRange().getValues();
    var headers = data[0];

    // Guard: sheet has no header row (was auto-created without headers)
    if (!headers || headers.length === 0 || data.length < 2) {
      Logger.log('getDriverLinkByToken: DriverLinks sheet is empty or has no headers. data.length=' + data.length);
      return null;
    }

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(token)) {
        var row = {};
        headers.forEach(function(h, j) { row[h] = data[i][j]; });

        // Check status (v2: ACTIVE only)
        if (row.Status !== 'ACTIVE') {
          Logger.log('getDriverLinkByToken: token found but Status=' + row.Status);
          return null;
        }
        // Check expiration
        if (row.ExpiresAt && new Date(row.ExpiresAt) < new Date()) {
          // Auto-transition to EXPIRED
          _updateLinkStatus(token, 'EXPIRED');
          _logLinkEvent(token, 'EXPIRED');
          Logger.log('getDriverLinkByToken: token expired. ExpiresAt=' + row.ExpiresAt);
          return null;
        }
        return row;
      }
    }
    Logger.log('getDriverLinkByToken: token not found. totalRows=' + (data.length - 1));
    return null;

  } catch (e) {
    Logger.log('getDriverLinkByToken ERROR: ' + e.message);
    return null;
  }
}

function getDriverLinks(filters) {
  try {
    var sh = getSheet(SHEETS.DriverLinks);
    var data = sh.getDataRange().getValues();
    if (data.length < 2) return [];

    var headers = data[0];
    var hasHeaders = headers && (headers.indexOf('Token') !== -1 || headers.indexOf('DriverID') !== -1);
    var results = [];

    for (var i = 1; i < data.length; i++) {
      var row = {};
      if (hasHeaders) {
        headers.forEach(function(h, j) { row[h] = data[i][j]; });
      } else {
        row.Token = data[i][0];
        row.DriverID = data[i][1];
        row.ProjectID = data[i][2];
        row.DateFrom = data[i][3];
        row.DateTo = data[i][4];
        row.Status = data[i][5];
        row.FieldsSchema = data[i][6];
        row.CreatedAt = data[i][7];
        row.ExpiresAt = data[i][8];
      }

      // Apply filters
      if (filters) {
        if (filters.driverId && row.DriverID !== filters.driverId) continue;
        if (filters.projectId && row.ProjectID !== filters.projectId) continue;
        if (filters.status && row.Status !== filters.status) continue;
        // Overlap logic: link must overlap with filter period
        if (filters.startDate && row.DateTo < filters.startDate) continue;
        if (filters.endDate && row.DateFrom > filters.endDate) continue;
      }

      results.push(row);
    }

    return results;

  } catch (e) {
    Logger.log('getDriverLinks error: ' + e.message);
    return [];
  }
}

function deactivateDriverLink(token) {
  try {
    _updateLinkStatus(token, 'REVOKED');
    _logLinkEvent(token, 'REVOKED');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// UPDATE DRIVER LINK — Edit metadata while ACTIVE
// ============================================================================

function updateDriverLink(token, updates) {
  try {
    if (!token) return { success: false, error: 'Token is required' };

    var sh = getSheet(SHEETS.DriverLinks);
    var data = sh.getDataRange().getValues();
    var headers = data[0];

    // Find the link
    var linkRow = -1;
    var linkData = null;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(token)) {
        linkRow = i + 1; // 1-indexed
        linkData = {};
        for (var j = 0; j < headers.length; j++) {
          linkData[headers[j]] = data[i][j];
        }
        break;
      }
    }

    if (!linkData) return { success: false, error: 'DriverLink not found: ' + token };

    // Only ACTIVE links can be edited
    if (linkData.Status !== 'ACTIVE') {
      return { success: false, error: 'Can only edit ACTIVE links. Current status: ' + linkData.Status };
    }

    // Fields that can be updated (Token is immutable)
    var allowedFields = ['DriverID', 'ProjectID', 'DateFrom', 'DateTo', 'FieldsSchema'];
    var changes = {};
    var oldValues = {};

    allowedFields.forEach(function(field) {
      if (updates[field] !== undefined) {
        oldValues[field] = linkData[field];
        changes[field] = updates[field];
      }
    });

    // Validate DateFrom <= DateTo if either is being changed
    var newDateFrom = changes.DateFrom || linkData.DateFrom;
    var newDateTo = changes.DateTo || linkData.DateTo;
    if (newDateFrom > newDateTo) {
      return { success: false, error: 'DateFrom must be before or equal to DateTo' };
    }

    // Apply changes to the sheet
    for (var field in changes) {
      var colIndex = headers.indexOf(field);
      if (colIndex !== -1) {
        sh.getRange(linkRow, colIndex + 1).setValue(changes[field]);
      }
    }

    // Log event with old/new values
    _logLinkEvent(token, 'UPDATED', {
      oldValues: oldValues,
      newValues: changes,
      fieldsChanged: Object.keys(changes)
    });

    return {
      success: true,
      token: token,
      changes: changes
    };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================================
// LINK EVENT LOGGING (FASE 15B)
// ============================================================================

function _logLinkEvent(token, eventType, metadata) {
  try {
    var sh = getSheet(SHEETS.DriverLinkEvents);
    var id = 'DLE-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    var userAgent = '';
    var ipAddress = '';
    try {
      userAgent = Session.getActiveUser().getUserAgent ? Session.getActiveUser().getUserAgent() : '';
      ipAddress = Session.getActiveUser().getUserIpAddress ? Session.getActiveUser().getUserIpAddress() : '';
    } catch (e) {}

    var metaObj = metadata || {};
    metaObj.user = _getActiveUser();
    metaObj.userAgent = userAgent;
    metaObj.ipAddress = ipAddress;

    sh.appendRow([
      id,                                        // ID
      token,                                     // Token
      eventType,                                 // EventType
      JSON.stringify(metaObj),                    // Metadata
      new Date().toISOString()                   // CreatedAt
    ]);
  } catch (e) {
    Logger.log('DriverLinkEvents: error logging event ' + eventType + ' for token ' + token + ': ' + e.message);
  }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function _updateLinkStatus(token, newStatus) {
  var sh = getSheet(SHEETS.DriverLinks);
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var statusCol = headers.indexOf('Status');
  if (statusCol === -1) statusCol = 5; // fallback

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(token)) {
      var currentStatus = String(data[i][statusCol]);
      _assertValidTransition('DriverLink', currentStatus, newStatus);
      sh.getRange(i + 1, statusCol + 1).setValue(newStatus);
      return;
    }
  }
}

function _notifyDriverSubmission(token, services) {
  try {
    var linkData = getDriverLinkByToken(token);
    if (!linkData) {
      // Link may already be EXPIRED, try raw lookup
      var sh = getSheet(SHEETS.DriverLinks);
      var data = sh.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(token)) {
          var headers = data[0];
          var row = {};
          headers.forEach(function(h, j) { row[h] = data[i][j]; });
          linkData = row;
          break;
        }
      }
    }
    if (!linkData) return;

    var settings = SettingsRepository.getAll();
    var adminEmail = settings.AdminEmail || Session.getActiveUser().getEmail();

    var dateRange = _formatDateIT(linkData.DateFrom);
    if (linkData.DateFrom !== linkData.DateTo) {
      dateRange = _formatDateIT(linkData.DateFrom) + ' — ' + _formatDateIT(linkData.DateTo);
    }

    var subject = 'Rapportino ricevuto — ' + linkData.DriverID + ' — ' + dateRange;
    var body = 'Il conducente ha inviato il suo rapportino:\n\n' +
      'Conducente: ' + linkData.DriverID + '\n' +
      'Data: ' + dateRange + '\n' +
      'Progetto: ' + linkData.ProjectID + '\n' +
      'Servizi: ' + services.length + '\n\n' +
      'Dettagli:\n';

    services.forEach(function(s, i) {
      body += (i + 1) + '. ' + (s.dataServizio || 'N/D') + ' | ' + (s.tipoServizio || 'N/D') +
        ' | ' + (s.orarioInizio || '') + '-' + (s.orarioFine || '') +
        ' | ' + (s.kmTotali || 0) + 'km | Diaria: ' + (s.diaria || 'N/D') + '\n';
    });

    MailApp.sendEmail(adminEmail, subject, body);

  } catch (e) {
    Logger.log('Notification error: ' + e.message);
  }
}

// ============================================================================
// GET DRIVER LINK EVENTS (FASE 15B)
// ============================================================================

function _getDriverLinkEvents(token) {
  try {
    var sh = getSheet(SHEETS.DriverLinkEvents);
    var data = sh.getDataRange().getValues();
    if (data.length < 2) return [];

    var headers = data[0];
    var results = [];

    for (var i = 1; i < data.length; i++) {
      var row = {};
      headers.forEach(function(h, j) { row[h] = data[i][j]; });

      if (token && row.LinkToken !== token) continue;

      results.push(row);
    }

    // Sort by timestamp descending
    results.sort(function(a, b) {
      return new Date(b.Timestamp) - new Date(a.Timestamp);
    });

    return results;

  } catch (e) {
    Logger.log('getDriverLinkEvents error: ' + e.message);
    return [];
  }
}
