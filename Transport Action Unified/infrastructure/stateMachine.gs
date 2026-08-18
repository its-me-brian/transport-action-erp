// ============================================================================
// STATEMACHINE.GS — Motor centralizado de transiciones de estado
// ============================================================================
//
// Cada entidad con estados tiene una definición de transiciones válidas.
// _assertValidTransition() rechaza cualquier transición no documentada.
//
// Fuente de verdad: docs/04-STATE_MACHINES.md
// ============================================================================

const STATE_MACHINES = {
  // ==========================================================================
  // Service.OperationalStatus
  // Importado → Asignado → Confirmado → EnRuta → Realizado → Reportado → Revision → Validado
  // ==========================================================================
  ServiceOperational: {
    Importado:  ['Asignado', 'Cancelado'],
    Asignado:   ['Confirmado', 'Cancelado'],
    Confirmado: ['EnRuta', 'Cancelado'],
    EnRuta:     ['Realizado', 'Cancelado'],
    Realizado:  ['Reportado'],
    Reportado:  ['Revision', 'Validado'],
    Revision:   ['Validado'],
    Validado:   [],  // terminal
    Cancelado:  []   // terminal — service cancelled before completion
  },

  // ==========================================================================
  // Service.FinancialStatus
  // Pendiente → Calculado → Confrontacion → ActualsConfirmados → Aprobado → Facturable → Facturado → Cobrado → Cerrado → CerradoComercial
  // ==========================================================================
  ServiceFinancial: {
    Pendiente:          ['Calculado'],
    Calculado:          ['Confrontacion', 'ActualsConfirmados', 'Aprobado'],
    Confrontacion:      ['ActualsConfirmados', 'Aprobado'],
    ActualsConfirmados: ['Aprobado'],
    Aprobado:           ['Facturable'],
    Facturable:         ['Facturado'],
    Facturado:          ['Cobrado'],
    Cobrado:            ['Cerrado'],
    Cerrado:            ['CerradoComercial'],
    CerradoComercial:   []  // terminal
  },

  // ==========================================================================
  // Invoice.Status
  // Borrador → Emitida → Enviada → PagoParcial | Pagada | Vencida
  // PagoParcial → Pagada | Vencida
  // Vencida → PagoParcial | Pagada
  // Pagada → (terminal), Anulada → (terminal)
  // ==========================================================================
  Invoice: {
    Borrador:    ['Emitida', 'Anulada'],
    Emitida:     ['Enviada', 'Anulada'],
    Enviada:     ['PagoParcial', 'Pagada', 'Vencida'],
    PagoParcial: ['Pagada', 'Vencida'],
    Vencida:     ['PagoParcial', 'Pagada'],
    Pagada:      [],  // terminal
    Anulada:     []   // terminal
  },

  // ==========================================================================
  // Payment.Status
  // Registrado → Confirmado → Conciliado
  // Registrado → Anulado
  // ==========================================================================
  Payment: {
    Registrado:  ['Confirmado', 'Anulado'],
    Confirmado:  ['Conciliado'],
    Conciliado:  [],  // terminal
    Anulado:     []   // terminal
  },

  // ==========================================================================
  // RapportinoClient.Status
  // Borrador → Revisado → Enviado → Aceptado → Facturado
  // Enviado → Rechazado
  // ==========================================================================
  RapportinoClient: {
    Borrador:  ['Revisado'],
    Revisado:  ['Enviado'],
    Enviado:   ['Aceptado', 'Rechazado'],
    Aceptado:  ['Facturado'],
    Facturado: [],  // terminal
    Rechazado: []   // terminal
  },

  // ==========================================================================
  // RapportinoDriver.Status
  // Borrador → Revisado → Enviado → Aceptado → Pagado
  // Enviado → Rechazado
  // ==========================================================================
  RapportinoDriver: {
    Borrador:  ['Revisado'],
    Revisado:  ['Enviado'],
    Enviado:   ['Aceptado', 'Rechazado'],
    Aceptado:  ['Pagado'],
    Pagado:    [],  // terminal
    Rechazado: []   // terminal
  },

  // ==========================================================================
  // DriverReport.Status
  // Pendiente → Aceptado | Rechazado
  // ==========================================================================
  DriverReport: {
    Pendiente:  ['Aceptado', 'Rechazado'],
    Aceptado:   [],  // terminal
    Rechazado:  []   // terminal
  },

  // ==========================================================================
  // RapportinoCollaborator.Status
  // Borrador → Enviado → Aceptado → Pagado
  // ==========================================================================
  RapportinoCollaborator: {
    Borrador:  ['Enviado'],
    Enviado:   ['Aceptado'],
    Aceptado:  ['Pagado'],
    Pagado:    []  // terminal
  },

  // ==========================================================================
  // Expense.Status
  // Draft → Confirmed | Cancelled
  // Confirmed → Cancelled
  // ==========================================================================
  Expense: {
    Draft:     ['Confirmed', 'Cancelled'],
    Confirmed: ['Cancelled'],
    Cancelled: []  // terminal
  },

  // ==========================================================================
  // DriverLink.Status (FASE 15A)
  // ACTIVE → EXPIRED | REVOKED
  // ==========================================================================
  DriverLink: {
    ACTIVE:  ['EXPIRED', 'REVOKED'],
    EXPIRED: [],  // terminal
    REVOKED: []   // terminal
  },

  // ==========================================================================
  // DriverReportInbox.Status (FASE 15C)
  // CAPTURED → NORMALIZED → PENDING_REVIEW → ACCEPTED | REJECTED | LOCKED
  // ==========================================================================
  DriverReportInbox: {
    CAPTURED:       ['NORMALIZED'],
    NORMALIZED:     ['PENDING_REVIEW'],
    PENDING_REVIEW: ['ACCEPTED', 'REJECTED', 'LOCKED'],
    ACCEPTED:       [],  // terminal
    REJECTED:       [],  // terminal
    LOCKED:         []   // terminal
  }
};

/**
 * Assert that a state transition is valid.
 * Throws BusinessRuleError if transition is not allowed.
 *
 * @param {string} machineName - Key in STATE_MACHINES (e.g. 'ServiceOperational')
 * @param {string} from - Current state
 * @param {string} to - Target state
 */
function _assertValidTransition(machineName, from, to) {
  var machine = STATE_MACHINES[machineName];
  if (!machine) {
    throw new BusinessRuleError('Unknown state machine: ' + machineName, 'STATE_MACHINE');
  }

  var allowed = machine[from];
  if (allowed === undefined) {
    throw new BusinessRuleError(
      'Unknown state "' + from + '" in ' + machineName,
      'STATE_MACHINE'
    );
  }

  if (allowed.indexOf(to) === -1) {
    throw new BusinessRuleError(
      'Invalid transition: ' + machineName + ' ' + from + ' → ' + to + '. Allowed: ' + (allowed.length > 0 ? allowed.join(', ') : '(terminal — no transitions)'),
      'INVALID_TRANSITION'
    );
  }
}

/**
 * Check if a transition is valid (non-throwing).
 * @returns {boolean}
 */
function _isValidTransition(machineName, from, to) {
  try {
    _assertValidTransition(machineName, from, to);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get list of allowed transitions from a given state.
 * @returns {string[]}
 */
function _allowedTransitions(machineName, from) {
  var machine = STATE_MACHINES[machineName];
  if (!machine) return [];
  var allowed = machine[from];
  return allowed || [];
}
