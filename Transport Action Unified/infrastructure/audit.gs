// ============================================================================
// AUDIT.GS v2 — AuditLog append-only con Source/Channel/CorrelationID (FASE 15D)
// ============================================================================
// Append-only: NUNCA se actualiza ni elimina un registro de audit.
// Cada registro es inmutable una vez escrito.

// ============================================================================
// AUDIT LOG — Registro detallado de cambios (v2)
// ============================================================================

/**
 * Registra un evento en AuditLog (v2 con Source/Channel/CorrelationID).
 * APPEND-ONLY: cada registro es inmutable una vez escrito.
 *
 * @param {Object} event - Evento despachado
 * @param {Object} [context] - Contexto adicional: { source, channel, correlationId }
 */
function _logAudit(event, context) {
  try {
    var ctx = context || {};

    _create(SHEETS.AuditLog, {
      ID: _generateAuditId(),
      Timestamp: event.timestamp,
      EntityType: event.entity,
      EntityID: event.entityId,
      Action: event.type,
      Field: event.payload?.field || '',
      OldValue: event.payload?.oldValue || '',
      NewValue: event.payload?.newValue || '',
      User: event.user,
      Source: ctx.source || '',
      Channel: ctx.channel || '',
      CorrelationID: ctx.correlationId || ''
    });
  } catch (e) {
    Logger.log('AuditLog: error al registrar', e);
  }
}

/**
 * Genera un ID unico para AuditLog.
 * Usa timestamp + random para evitar colisiones.
 */
function _generateAuditId() {
  return 'AUD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

/**
 * APPEND-ONLY enforcement: lanza error si se intenta modificar o eliminar.
 * Llamar antes de cualquier operacion de update/delete en AuditLog.
 */
function _assertAuditAppendOnly() {
  throw new BusinessRuleError(
    'AuditLog is append-only. Records cannot be modified or deleted.',
    'AUDIT_APPEND_ONLY'
  );
}

// ============================================================================
// ACTIVITY FEED — Feed de actividad legible
// ============================================================================

/**
 * Registra una actividad en ActivityFeed.
 * Llamado por _dispatchEvent().
 *
 * @param {Object} event - Evento despachado
 */
function _logActivity(event, context) {
  try {
    _create(SHEETS.ActivityFeed, {
      ID: _generateActivityId(),
      Timestamp: event.timestamp,
      EventType: event.type,
      EntityType: event.entity,
      EntityID: event.entityId,
      Description: _buildActivityDescription(event),
      User: event.user,
      Metadata: event.payload ? JSON.stringify(event.payload) : ''
    });
  } catch (e) {
    Logger.log('ActivityFeed: error al registrar', e);
  }
}

/**
 * Construye una descripción legible del evento.
 */
function _buildActivityDescription(event) {
  const descriptions = {
    // Operativos
    'service.imported': `Servicios importados (${event.entityId})`,
    'service.assigned': `Conductor asignado a servicio ${event.entityId}`,
    'service.confirmed': `Servicio ${event.entityId} confirmado`,
    'service.started': `Servicio ${event.entityId} iniciado`,
    'service.completed': `Servicio ${event.entityId} completado`,
    'service.validated': `Servicio ${event.entityId} validado`,
    'service.facturado': `Servicio ${event.entityId} facturado`,
    'service.cobrado': `Servicio ${event.entityId} cobrado`,
    'service.closed': `Servicio ${event.entityId} cerrado`,

    // Reportes
    'report.submitted': `Reporte enviado para servicio ${event.entityId}`,
    'report.approved': `Reporte aprobado para servicio ${event.entityId}`,
    'report.rejected': `Reporte rechazado para servicio ${event.entityId}`,

    // Rapportinos
    'rapportino_client.created': `Rapportino cliente ${event.entityId} creado`,
    'rapportino_client.reviewed': `Rapportino cliente ${event.entityId} revisado`,
    'rapportino_client.sent': `Rapportino cliente ${event.entityId} enviado`,
    'rapportino_client.accepted': `Rapportino cliente ${event.entityId} aceptado`,
    'rapportino_client.facturado': `Rapportino cliente ${event.entityId} facturado`,
    'rapportino_driver.created': `Rapportino conductor ${event.entityId} creado`,
    'rapportino_driver.reviewed': `Rapportino conductor ${event.entityId} revisado`,
    'rapportino_driver.sent': `Rapportino conductor ${event.entityId} enviado`,
    'rapportino_driver.accepted': `Rapportino conductor ${event.entityId} aceptado`,
    'rapportino_driver.pagado': `Rapportino conductor ${event.entityId} pagado`,

    // Facturación
    'invoice.created': `Factura ${event.entityId} creada`,
    'invoice.emitted': `Factura ${event.entityId} emitida`,
    'invoice.edited': `Factura ${event.entityId} editada`,
    'invoice.sent': `Factura ${event.entityId} enviada`,
    'invoice.partial_payment': `Pago parcial registrado para factura ${event.entityId}`,
    'invoice.paid': `Factura ${event.entityId} pagada`,
    'invoice.overdue': `Factura ${event.entityId} vencida`,
    'invoice.voided': `Factura ${event.entityId} anulada`,

    // Pagos
    'payment.created': `Pago ${event.entityId} registrado`,
    'payment.confirmed': `Pago ${event.entityId} confirmado`,
    'payment.reconciled': `Pago ${event.entityId} conciliado`,

    // Gastos
    'expense.created': `Gasto ${event.entityId} creado`,
    'expense.confirmed': `Gasto ${event.entityId} confirmado`,
    'expense.cancelled': `Gasto ${event.entityId} cancelado`,

    // Cambios
    'change.created': `Cambio ${event.entityId} registrado`,
    'change.resolved': `Cambio ${event.entityId} resuelto`,

    // Sistema
    'transport_list.imported': `Lista de transporte importada (${event.entityId})`,
    'user.login': `Usuario ${event.user} inició sesión`,
    'user.logout': `Usuario ${event.user} cerró sesión`
  };

  return descriptions[event.type] || `${event.type} en ${event.entity}:${event.entityId}`;
}

/**
 * Genera un ID único para ActivityFeed.
 */
function _generateActivityId() {
  return 'ACT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

// ============================================================================
// API ENDPOINTS — Para el frontend
// ============================================================================

/**
 * API: Obtener activity feed reciente.
 */
function apiGetActivityFeed(limit) {
  const activities = _getAll(SHEETS.ActivityFeed);
  // Ordenar por timestamp descendente
  activities.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  return activities.slice(0, limit || 50);
}

/**
 * API: Obtener audit log reciente.
 */
function apiGetAuditLog(limit) {
  const logs = _getAll(SHEETS.AuditLog);
  logs.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  return logs.slice(0, limit || 100);
}
