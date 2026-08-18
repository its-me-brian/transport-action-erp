// ============================================================================
// EVENTBUS.GS — Dispatcher de eventos central
// ============================================================================

/**
 * Global para rastrear el usuario activo.
 * Se setea en login y se usa como fallback en _dispatchEvent.
 * Session.getActiveUser().getEmail() retorna vacío en GAS web apps.
 */
var ACTIVE_USER = '';

/**
 * Setter para el usuario activo. Llamar en login.
 * @param {string} email - Email del usuario autenticado
 */
function _setActiveUser(email) {
  ACTIVE_USER = email || '';
}

/**
 * Getter para el usuario activo.
 * @returns {string} Email del usuario activo o 'system'
 */
function _getActiveUser() {
  return ACTIVE_USER || 'system';
}

/**
 * Dispatcher central de eventos.
 * Los eventos son NOTIFICACIONES, no acciones.
 * La ACCIÓN está en el Command. El EVENTO informa que ocurrió.
 *
 * @param {Object} event - Evento a despachar
 * @param {string} event.type - Tipo de evento (ej: 'service.validated')
 * @param {string} event.entity - Entidad (ej: 'Service')
 * @param {string} event.entityId - ID de la entidad
 * @param {string} event.user - Usuario que ejecutó la acción
 * @param {string} event.timestamp - ISO timestamp
 * @param {Object} event.payload - Datos adicionales del evento
 */
function _dispatchEvent(event) {
  // Validar estructura básica
  if (!event.type || !event.entity || !event.entityId) {
    Logger.log('EventBus: evento inválido, ignorado', event);
    return;
  }

  // Agregar timestamp si no existe
  if (!event.timestamp) {
    event.timestamp = new Date().toISOString();
  }

  // Agregar usuario si no existe
  // Prioridad: event.user explícito > ACTIVE_USER global > Session > 'system'
  if (!event.user) {
    if (ACTIVE_USER) {
      event.user = ACTIVE_USER;
    } else {
      try {
        var sessionEmail = Session.getActiveUser().getEmail();
        event.user = sessionEmail || 'system';
      } catch (e) {
        event.user = 'system';
      }
    }
  }

  // 1. Audit log (siempre) — v2 con context
  _logAudit(event, event.context || {});

  // 2. Activity feed (siempre)
  _logActivity(event, event.context || {});

  // 3. Listeners específicos por tipo
  const listeners = EVENT_LISTENERS[event.type];
  if (listeners && Array.isArray(listeners)) {
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        Logger.log(`EventBus: error en listener para ${event.type}:`, e);
      }
    });
  }

  Logger.log(`EventBus: ${event.type} dispatched for ${event.entity}:${event.entityId}`);
}

// ============================================================================
// EVENT LISTENERS — Mapa de listeners por tipo de evento
// ============================================================================

const EVENT_LISTENERS = {
  // Operativos
  'service.imported': [],
  'service.assigned': [],
  'service.confirmed': [],
  'service.started': [],
  'service.completed': [],
  'service.validated': [],
  'service.facturado': [],
  'service.cobrado': [],
  'service.closed': [],
  'service.updated': [],
  'service.revenue_adjusted': [],
  'service.cost_adjusted': [],

  // Reportes
  'report.submitted': [],
  'report.approved': [],
  'report.rejected': [],

  // Rapportinos
  'rapportino_client.created': [],
  'rapportino_client.reviewed': [],
  'rapportino_client.sent': [],
  'rapportino_client.accepted': [],
  'rapportino_client.facturado': [],
  'rapportino_driver.created': [],
  'rapportino_driver.reviewed': [],
  'rapportino_driver.sent': [],
  'rapportino_driver.accepted': [],
  'rapportino_driver.pagado': [],
  'rapportino_collaborator.created': [],
  'rapportino_collaborator.sent': [],
  'rapportino_collaborator.accepted': [],
  'rapportino_collaborator.pagado': [],

  // Facturación
  'invoice.created': [],
  'invoice.emitted': [],
  'invoice.edited': [],
  'invoice.sent': [],
  'invoice.partial_payment': [],
  'invoice.paid': [],
  'invoice.overdue': [],
  'invoice.voided': [],

  // Pagos
  'payment.created': [],
  'payment.confirmed': [],
  'payment.reconciled': [],

  // Gastos
  'expense.created': [],
  'expense.confirmed': [],
  'expense.cancelled': [],

  // Entidades
  'vehicle.updated': [],
  'vehicle.deleted': [],
  'contact.updated': [],
  'contact.deleted': [],
  'client.created': [],
  'client.updated': [],
  'client.deleted': [],
  'driver_advance.created': [],
  'driver_advance.deducted': [],
  'supplier_rate.created': [],
  'supplier_rate.updated': [],
  'supplier_rate.deleted': [],
  'ratecard.created': [],
  'ratecard.updated': [],
  'ratecard.deleted': [],
  'driverrate.created': [],
  'driverrate.updated': [],
  'driverrate.deleted': [],
  'operating_company.updated': [],

  // Cambios
  'change.created': [],
  'change.resolved': [],

  // Inbox
  'inbox.submitted': [],
  'inbox.accepted': [],
  'inbox.rejected': [],
  'inbox.expired': [],

  // Reconciliación
  'reconciliation.created': [],
  'reconciliation.resolved': [],

  // Sistema
  'transport_list.imported': [],
  'user.login': [],
  'user.logout': []
};
