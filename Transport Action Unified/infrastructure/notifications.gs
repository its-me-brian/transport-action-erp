/**
 * infrastructure/notifications.gs
 * 
 * Email builders for transport notifications.
 * Migrated from: Code_old.gs (lines 6212-6431)
 * 
 * Features:
 * - Email builders for transport lists and agency requests
 * - Excel attachment generation
 */

// ============================================================================
// EMAIL BUILDERS
// ============================================================================

/**
 * Send transport list email with Excel attachment.
 * @param {Array} recipients - Array of email addresses
 * @param {string} subject - Email subject
 * @param {Array} services - Array of service objects
 * @param {string} dateStr - Date string for display
 * @param {string} production - Production name
 * @returns {Object} { success, sentTo }
 */
function sendTransportListEmail(recipients, subject, services, dateStr, production) {
  try {
    if (!recipients || recipients.length === 0) {
      return { error: 'No hay destinatarios' };
    }

    var body = 'Transport List — ' + (production || '') + ' — ' + (dateStr || 'Hoy') + '\n\n';
    body += 'Total de servicios: ' + services.length + '\n\n';

    var byDriver = {};
    services.forEach(function(s) {
      var driver = s.driver || 'Sin conductor';
      if (!byDriver[driver]) byDriver[driver] = [];
      byDriver[driver].push(s);
    });

    Object.keys(byDriver).sort().forEach(function(driver) {
      body += '━━━━━━━━━━━━━━━━\n';
      body += 'Conductor: ' + driver + '\n';

      byDriver[driver].forEach(function(s, i) {
        body += '  ' + (i + 1) + '. ' + (s.time || '') + ' | ' + (s.vehicle || '') + '\n';
        if (s.passengers) body += '     Pasajero: ' + s.passengers + '\n';
        if (s.from || s.to) body += '     Ruta: ' + (s.from || '?') + ' → ' + (s.to || '?') + '\n';
      });
      body += '\n';
    });

    body += '\nEnviado desde Transport Action';

    var excelResult = exportTransportListExcel(services, 'Transport_List_' + (dateStr || 'today'));
    var attachments = [];

    if (excelResult.success && excelResult.excelDownloadUrl) {
      try {
        var excelResponse = UrlFetchApp.fetch(excelResult.excelDownloadUrl, {
          headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
        });
        attachments.push(excelResponse.getBlob().setName('Transport_List.xlsx'));
      } catch (e) {
        Logger.log('Error adjuntando Excel: ' + e.message);
      }
    }

    var sent = [];
    for (var i = 0; i < recipients.length; i++) {
      GmailApp.sendEmail(recipients[i], subject || 'Transport List — ' + (dateStr || 'Hoy'), body, {
        attachments: attachments.length > 0 ? attachments : undefined,
        name: 'Transport Action'
      });
      sent.push(recipients[i]);
    }

    return { success: true, sentTo: sent };

  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Send services to agency via email.
 * @param {Array} recipients - Array of email addresses
 * @param {string} agencyName - Agency name
 * @param {Array} services - Array of service objects
 * @param {string} dateStr - Date string for display
 * @param {string} notes - Additional notes
 * @returns {Object} { success, sentTo }
 */
function sendServicesToAgency(recipients, agencyName, services, dateStr, notes) {
  try {
    if (!recipients || recipients.length === 0) {
      return { error: 'No hay destinatarios' };
    }
    if (!services || services.length === 0) {
      return { error: 'No hay servicios para enviar' };
    }

    var subject = 'Servicios de Transporte — ' + (agencyName || 'Agencia') + ' — ' + (dateStr || 'Hoy');

    var body = 'Estimados,\n\n';
    body += 'Les solicitamos los siguientes servicios de transporte:\n\n';
    body += 'Agencia: ' + (agencyName || 'N/A') + '\n';
    body += 'Fecha: ' + (dateStr || 'Hoy') + '\n';
    body += 'Servicios: ' + services.length + '\n\n';

    services.forEach(function(s, i) {
      body += (i + 1) + '. Hora: ' + (s.time || 'N/A') + '\n';
      body += '   Vehículo: ' + (s.vehicle || 'N/A') + '\n';
      body += '   Pasajero: ' + (s.passengers || 'N/A') + '\n';
      body += '   Origen: ' + (s.from || 'N/A') + '\n';
      body += '   Destino: ' + (s.to || 'N/A') + '\n';
      if (s.notes) body += '   Notas: ' + s.notes + '\n';
      body += '\n';
    });

    if (notes) {
      body += 'Notas adicionales: ' + notes + '\n\n';
    }

    body += 'Por favor confirmar disponibilidad y tarifas.\n\n';
    body += 'Saludos,\nTransport Action';

    var excelResult = exportTransportListExcel(services, 'Servicios_' + (agencyName || 'Agencia'));
    var attachments = [];

    if (excelResult.success && excelResult.excelDownloadUrl) {
      try {
        var excelResponse = UrlFetchApp.fetch(excelResult.excelDownloadUrl, {
          headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
        });
        attachments.push(excelResponse.getBlob().setName('Servicios.xlsx'));
      } catch (e) {
        Logger.log('Error adjuntando Excel: ' + e.message);
      }
    }

    var sent = [];
    for (var i = 0; i < recipients.length; i++) {
      GmailApp.sendEmail(recipients[i], subject, body, {
        attachments: attachments.length > 0 ? attachments : undefined,
        name: 'Transport Action'
      });
      sent.push(recipients[i]);
    }

    _dispatchEvent({
      type: 'notification.sent',
      entity: 'Service',
      entityId: agencyName,
      payload: {
        serviceCount: services.length,
        recipients: sent.join(', ')
      }
    });

    return { success: true, sentTo: sent };

  } catch (e) {
    return { error: e.message };
  }
}
