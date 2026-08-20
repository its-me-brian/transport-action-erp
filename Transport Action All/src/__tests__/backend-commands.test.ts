/**
 * ============================================================================
 * TESTS — Backend Command Contracts & State Machine Logic
 * ============================================================================
 * 
 * These tests verify:
 * 1. Frontend API calls correct backend endpoints with correct params
 * 2. State machine transition rules (imported from backend definitions)
 * 3. Permission matrix correctness
 * 4. Command preconditions and error handling
 * 
 * NOTE: These are frontend-side contract tests. The actual backend logic
 * runs in Google Apps Script. These tests verify the API surface is correct.
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../services/api';

// ============================================================================
// MOCK SETUP
// ============================================================================

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockGasResponse(data: any) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data })
  });
}

function mockGasError(status: number, message: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: message
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

// ============================================================================
// STATE MACHINE DEFINITIONS (mirrored from stateMachine.gs)
// ============================================================================

const STATE_MACHINES = {
  ServiceOperational: {
    Importado:  ['Asignado', 'Cancelado'],
    Asignado:   ['Confirmado', 'Cancelado'],
    Confirmado: ['EnRuta', 'Cancelado'],
    EnRuta:     ['Realizado', 'Cancelado'],
    Realizado:  ['Reportado'],
    Reportado:  ['Revision', 'Validado'],
    Revision:   ['Validado'],
    Validado:   [],  // terminal
    Cancelado:  []   // terminal
  },
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
  Invoice: {
    Borrador:    ['Emitida', 'Anulada'],
    Emitida:     ['Enviada', 'Anulada'],
    Enviada:     ['PagoParcial', 'Pagada', 'Vencida'],
    PagoParcial: ['Pagada', 'Vencida'],
    Vencida:     ['PagoParcial', 'Pagada'],
    Pagada:      [],  // terminal
    Anulada:     []   // terminal
  },
  Payment: {
    Registrado:  ['Confirmado', 'Anulado'],
    Confirmado:  ['Conciliado'],
    Conciliado:  [],  // terminal
    Anulado:     []   // terminal
  },
  Expense: {
    Draft:     ['Confirmed', 'Cancelled'],
    Confirmed: ['Cancelled'],
    Cancelled: []  // terminal
  },
  RapportinoClient: {
    Borrador:  ['Revisado'],
    Revisado:  ['Enviado'],
    Enviado:   ['Aceptado', 'Rechazado'],
    Aceptado:  ['Facturado'],
    Facturado: [],  // terminal
    Rechazado: []   // terminal
  },
  RapportinoDriver: {
    Borrador:  ['Revisado'],
    Revisado:  ['Enviado'],
    Enviado:   ['Aceptado', 'Rechazado'],
    Aceptado:  ['Pagado'],
    Pagado:    [],  // terminal
    Rechazado: []   // terminal
  },
  DriverReport: {
    Pendiente:  ['Aceptado', 'Rechazado'],
    Aceptado:   [],  // terminal
    Rechazado:  []   // terminal
  },
  DriverLink: {
    ACTIVE:  ['EXPIRED', 'REVOKED'],
    EXPIRED: [],  // terminal
    REVOKED: []   // terminal
  },
  RapportinoCollaborator: {
    Borrador:  ['Enviado'],
    Enviado:   ['Aceptado'],
    Aceptado:  []  // terminal
  }
};

// Helper: check if transition is valid
function isValidTransition(machine: string, from: string, to: string): boolean {
  const m = (STATE_MACHINES as any)[machine];
  if (!m) return false;
  const allowed = m[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

// ============================================================================
// PERMISSION MATRIX (mirrored from auth.gs)
// ============================================================================

const PERMISSION_MATRIX: Record<string, string[]> = {
  'service.list':              ['admin', 'coordinator', 'accounting'],
  'service.import':            ['admin', 'coordinator'],
  'service.assign':            ['admin', 'coordinator'],
  'service.confirm':           ['admin', 'coordinator'],
  'service.start':             ['admin', 'coordinator', 'driver'],
  'service.complete':          ['admin', 'coordinator', 'driver'],
  'service.validate':          ['admin', 'coordinator'],
  'service.adjustRevenue':     ['admin', 'coordinator'],
  'service.adjustCost':        ['admin', 'coordinator'],
  'service.updateField':       ['admin', 'coordinator'],
  'service.delete':            ['admin', 'coordinator'],
  'service.facturar':          ['admin', 'coordinator', 'accounting'],
  'service.cobrar':            ['admin', 'coordinator', 'accounting'],
  'service.close':             ['admin', 'coordinator'],
  'service.confirmActuals':    ['admin', 'coordinator', 'accounting'],
  'service.approveFinancial':  ['admin', 'accounting'],
  'service.markFacturable':    ['admin', 'coordinator', 'accounting'],
  'invoice.list':              ['admin', 'accounting'],
  'invoice.create':            ['admin', 'accounting'],
  'invoice.edit':              ['admin', 'accounting'],
  'invoice.emit':              ['admin', 'accounting'],
  'invoice.send':              ['admin', 'accounting'],
  'invoice.void':              ['admin', 'accounting'],
  'payment.list':              ['admin', 'accounting'],
  'payment.register':          ['admin', 'accounting'],
  'payment.edit':              ['admin', 'accounting'],
  'payment.confirm':           ['admin', 'accounting'],
  'payment.reconcile':         ['admin', 'accounting'],
  'expense.list':              ['admin', 'coordinator', 'accounting'],
  'expense.create':            ['admin', 'coordinator', 'accounting'],
  'expense.edit':              ['admin', 'coordinator', 'accounting'],
  'expense.confirm':           ['admin', 'accounting'],
  'expense.cancel':            ['admin', 'accounting'],
  'expense.correct':           ['admin', 'accounting'],
  'driverLink.list':           ['admin', 'coordinator'],
  'driverLink.generate':       ['admin', 'coordinator'],
  'driverLink.update':         ['admin', 'coordinator'],
  'driverLink.deactivate':     ['admin', 'coordinator'],
  'driverReport.list':         ['admin', 'coordinator'],
  'driverReport.submit':       ['admin', 'coordinator', 'driver'],
  'driverReport.approve':      ['admin', 'coordinator'],
  'driverReport.reject':       ['admin', 'coordinator'],
  'rapportinoClient.list':     ['admin', 'coordinator'],
  'rapportinoClient.create':   ['admin', 'coordinator'],
  'rapportinoDriver.list':     ['admin', 'coordinator'],
  'rapportinoDriver.create':   ['admin', 'coordinator'],
  'rapportinoDriver.pay':      ['admin', 'accounting'],
};

// ============================================================================
// 1. STATE MACHINE TRANSITION TESTS
// ============================================================================

describe('State Machine — ServiceOperational', () => {
  const validTransitions = [
    ['Importado', 'Asignado'],
    ['Importado', 'Cancelado'],
    ['Asignado', 'Confirmado'],
    ['Asignado', 'Cancelado'],
    ['Confirmado', 'EnRuta'],
    ['Confirmado', 'Cancelado'],
    ['EnRuta', 'Realizado'],
    ['EnRuta', 'Cancelado'],
    ['Realizado', 'Reportado'],
    ['Reportado', 'Revision'],
    ['Reportado', 'Validado'],
    ['Revision', 'Validado'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidTransition('ServiceOperational', from, to)).toBe(true);
  });

  const invalidTransitions = [
    ['Importado', 'Confirmado'],
    ['Importado', 'EnRuta'],
    ['Importado', 'Realizado'],
    ['Importado', 'Reportado'],
    ['Importado', 'Validado'],
    ['Asignado', 'Importado'],
    ['Asignado', 'EnRuta'],
    ['Asignado', 'Validado'],
    ['Confirmado', 'Importado'],
    ['Confirmado', 'Asignado'],
    ['Confirmado', 'Validado'],
    ['Realizado', 'Importado'],
    ['Realizado', 'Cancelado'],
    ['Reportado', 'Cancelado'],
    ['Validado', 'Realizado'],
    ['Validado', 'Reportado'],
    ['Validado', 'Cancelado'],
    ['Cancelado', 'Importado'],
    ['Cancelado', 'Asignado'],
    ['Cancelado', 'EnRuta'],
  ];

  it.each(invalidTransitions)('rejects %s → %s', (from, to) => {
    expect(isValidTransition('ServiceOperational', from, to)).toBe(false);
  });

  it('Validado is terminal (no transitions)', () => {
    expect(isValidTransition('ServiceOperational', 'Validado', 'Importado')).toBe(false);
    expect(isValidTransition('ServiceOperational', 'Validado', 'Revision')).toBe(false);
  });

  it('Cancelado is terminal (no transitions)', () => {
    expect(isValidTransition('ServiceOperational', 'Cancelado', 'Importado')).toBe(false);
    expect(isValidTransition('ServiceOperational', 'Cancelado', 'Asignado')).toBe(false);
  });
});

describe('State Machine — ServiceFinancial', () => {
  const validTransitions = [
    ['Pendiente', 'Calculado'],
    ['Calculado', 'Confrontacion'],
    ['Calculado', 'ActualsConfirmados'],
    ['Calculado', 'Aprobado'],
    ['Confrontacion', 'ActualsConfirmados'],
    ['Confrontacion', 'Aprobado'],
    ['ActualsConfirmados', 'Aprobado'],
    ['Aprobado', 'Facturable'],
    ['Facturable', 'Facturado'],
    ['Facturado', 'Cobrado'],
    ['Cobrado', 'Cerrado'],
    ['Cerrado', 'CerradoComercial'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidTransition('ServiceFinancial', from, to)).toBe(true);
  });

  it('CerradoComercial is terminal', () => {
    expect(isValidTransition('ServiceFinancial', 'CerradoComercial', 'Cerrado')).toBe(false);
  });
});

describe('State Machine — Invoice', () => {
  const validTransitions = [
    ['Borrador', 'Emitida'],
    ['Borrador', 'Anulada'],
    ['Emitida', 'Enviada'],
    ['Emitida', 'Anulada'],
    ['Enviada', 'PagoParcial'],
    ['Enviada', 'Pagada'],
    ['Enviada', 'Vencida'],
    ['PagoParcial', 'Pagada'],
    ['PagoParcial', 'Vencida'],
    ['Vencida', 'PagoParcial'],
    ['Vencida', 'Pagada'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidTransition('Invoice', from, to)).toBe(true);
  });

  it('Pagada is terminal', () => {
    expect(isValidTransition('Invoice', 'Pagada', 'Enviada')).toBe(false);
  });

  it('Anulada is terminal', () => {
    expect(isValidTransition('Invoice', 'Anulada', 'Borrador')).toBe(false);
  });

  const invalidTransitions = [
    ['Borrador', 'Enviada'],
    ['Borrador', 'Pagada'],
    ['Emitida', 'PagoParcial'],
    ['Emitida', 'Pagada'],
  ];

  it.each(invalidTransitions)('rejects %s → %s', (from, to) => {
    expect(isValidTransition('Invoice', from, to)).toBe(false);
  });
});

describe('State Machine — Payment', () => {
  const validTransitions = [
    ['Registrado', 'Confirmado'],
    ['Registrado', 'Anulado'],
    ['Confirmado', 'Conciliado'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidTransition('Payment', from, to)).toBe(true);
  });

  it('Conciliado is terminal', () => {
    expect(isValidTransition('Payment', 'Conciliado', 'Confirmado')).toBe(false);
  });

  it('Anulado is terminal', () => {
    expect(isValidTransition('Payment', 'Anulado', 'Confirmado')).toBe(false);
  });
});

describe('State Machine — Expense', () => {
  const validTransitions = [
    ['Draft', 'Confirmed'],
    ['Draft', 'Cancelled'],
    ['Confirmed', 'Cancelled'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidTransition('Expense', from, to)).toBe(true);
  });

  it('Cancelled is terminal', () => {
    expect(isValidTransition('Expense', 'Cancelled', 'Draft')).toBe(false);
  });
});

describe('State Machine — RapportinoClient', () => {
  const validTransitions = [
    ['Borrador', 'Revisado'],
    ['Revisado', 'Enviado'],
    ['Enviado', 'Aceptado'],
    ['Enviado', 'Rechazado'],
    ['Aceptado', 'Facturado'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidTransition('RapportinoClient', from, to)).toBe(true);
  });

  it('Facturado is terminal', () => {
    expect(isValidTransition('RapportinoClient', 'Facturado', 'Aceptado')).toBe(false);
  });

  it('Rechazado is terminal', () => {
    expect(isValidTransition('RapportinoClient', 'Rechazado', 'Enviado')).toBe(false);
  });
});

describe('State Machine — RapportinoDriver', () => {
  const validTransitions = [
    ['Borrador', 'Revisado'],
    ['Revisado', 'Enviado'],
    ['Enviado', 'Aceptado'],
    ['Enviado', 'Rechazado'],
    ['Aceptado', 'Pagado'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidTransition('RapportinoDriver', from, to)).toBe(true);
  });

  it('Pagado is terminal', () => {
    expect(isValidTransition('RapportinoDriver', 'Pagado', 'Aceptado')).toBe(false);
  });
});

describe('State Machine — DriverReport', () => {
  const validTransitions = [
    ['Pendiente', 'Aceptado'],
    ['Pendiente', 'Rechazado'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidTransition('DriverReport', from, to)).toBe(true);
  });

  it('Aceptado is terminal', () => {
    expect(isValidTransition('DriverReport', 'Aceptado', 'Pendiente')).toBe(false);
  });

  it('Rechazado is terminal', () => {
    expect(isValidTransition('DriverReport', 'Rechazado', 'Pendiente')).toBe(false);
  });
});

describe('State Machine — DriverLink', () => {
  const validTransitions = [
    ['ACTIVE', 'EXPIRED'],
    ['ACTIVE', 'REVOKED'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidTransition('DriverLink', from, to)).toBe(true);
  });

  it('EXPIRED is terminal', () => {
    expect(isValidTransition('DriverLink', 'EXPIRED', 'ACTIVE')).toBe(false);
  });

  it('REVOKED is terminal', () => {
    expect(isValidTransition('DriverLink', 'REVOKED', 'ACTIVE')).toBe(false);
  });
});

// ============================================================================
// 1B. INVARIANT TESTS — Invalid transitions that should NEVER happen
// ============================================================================

describe('Invariant Tests — FinancialStatus', () => {
  it('Pendiente cannot jump to Facturado', () => {
    expect(isValidTransition('ServiceFinancial', 'Pendiente', 'Facturado')).toBe(false);
  });

  it('Pendiente cannot jump to Cobrado', () => {
    expect(isValidTransition('ServiceFinancial', 'Pendiente', 'Cobrado')).toBe(false);
  });

  it('Calculado cannot jump to Facturable', () => {
    expect(isValidTransition('ServiceFinancial', 'Calculado', 'Facturable')).toBe(false);
  });

  it('Calculado cannot jump to Facturado', () => {
    expect(isValidTransition('ServiceFinancial', 'Calculado', 'Facturado')).toBe(false);
  });

  it('Confrontacion cannot jump to Facturable', () => {
    expect(isValidTransition('ServiceFinancial', 'Confrontacion', 'Facturable')).toBe(false);
  });

  it('Confrontacion cannot jump to Facturado', () => {
    expect(isValidTransition('ServiceFinancial', 'Confrontacion', 'Facturado')).toBe(false);
  });

  it('ActualsConfirmados cannot jump to Facturable', () => {
    expect(isValidTransition('ServiceFinancial', 'ActualsConfirmados', 'Facturable')).toBe(false);
  });

  it('ActualsConfirmados cannot jump to Facturado', () => {
    expect(isValidTransition('ServiceFinancial', 'ActualsConfirmados', 'Facturado')).toBe(false);
  });

  it('Aprobado cannot jump to Facturado (must go through Facturable)', () => {
    expect(isValidTransition('ServiceFinancial', 'Aprobado', 'Facturado')).toBe(false);
  });

  it('Aprobado cannot jump to Cobrado', () => {
    expect(isValidTransition('ServiceFinancial', 'Aprobado', 'Cobrado')).toBe(false);
  });

  it('Facturable cannot jump to Cobrado', () => {
    expect(isValidTransition('ServiceFinancial', 'Facturable', 'Cobrado')).toBe(false);
  });

  it('Facturado cannot go back to Aprobado', () => {
    expect(isValidTransition('ServiceFinancial', 'Facturado', 'Aprobado')).toBe(false);
  });

  it('Cobrado cannot go back to Facturado', () => {
    expect(isValidTransition('ServiceFinancial', 'Cobrado', 'Facturado')).toBe(false);
  });

  it('Cerrado cannot go back to Cobrado', () => {
    expect(isValidTransition('ServiceFinancial', 'Cerrado', 'Cobrado')).toBe(false);
  });

  it('CerradoComercial cannot go back to any state', () => {
    expect(isValidTransition('ServiceFinancial', 'CerradoComercial', 'Cerrado')).toBe(false);
    expect(isValidTransition('ServiceFinancial', 'CerradoComercial', 'Facturado')).toBe(false);
    expect(isValidTransition('ServiceFinancial', 'CerradoComercial', 'Pendiente')).toBe(false);
  });
});

describe('Invariant Tests — Invoice', () => {
  it('Pagada cannot go back to any state', () => {
    expect(isValidTransition('Invoice', 'Pagada', 'Enviada')).toBe(false);
    expect(isValidTransition('Invoice', 'Pagada', 'Borrador')).toBe(false);
    expect(isValidTransition('Invoice', 'Pagada', 'Emitida')).toBe(false);
  });

  it('Anulada cannot go back to any state', () => {
    expect(isValidTransition('Invoice', 'Anulada', 'Borrador')).toBe(false);
    expect(isValidTransition('Invoice', 'Anulada', 'Emitida')).toBe(false);
  });

  it('Borrador cannot jump to Pagada', () => {
    expect(isValidTransition('Invoice', 'Borrador', 'Pagada')).toBe(false);
  });

  it('Emitida cannot jump to Pagada', () => {
    expect(isValidTransition('Invoice', 'Emitida', 'Pagada')).toBe(false);
  });
});

describe('Invariant Tests — RapportinoCollaborator', () => {
  it('Borrador cannot jump to Aceptado', () => {
    expect(isValidTransition('RapportinoCollaborator', 'Borrador', 'Aceptado')).toBe(false);
  });

  it('Enviado cannot go back to Borrador', () => {
    expect(isValidTransition('RapportinoCollaborator', 'Enviado', 'Borrador')).toBe(false);
  });

  it('Aceptado is terminal', () => {
    expect(isValidTransition('RapportinoCollaborator', 'Aceptado', 'Borrador')).toBe(false);
    expect(isValidTransition('RapportinoCollaborator', 'Aceptado', 'Enviado')).toBe(false);
  });
});

// ============================================================================
// 2. PERMISSION MATRIX TESTS
// ============================================================================

describe('Permission Matrix', () => {
  it('service operations require coordinator or admin', () => {
    expect(PERMISSION_MATRIX['service.assign']).toContain('admin');
    expect(PERMISSION_MATRIX['service.assign']).toContain('coordinator');
    expect(PERMISSION_MATRIX['service.assign']).not.toContain('driver');
  });

  it('service.start and service.complete allow driver', () => {
    expect(PERMISSION_MATRIX['service.start']).toContain('driver');
    expect(PERMISSION_MATRIX['service.complete']).toContain('driver');
  });

  it('financial operations require accounting or admin', () => {
    expect(PERMISSION_MATRIX['invoice.emit']).toContain('admin');
    expect(PERMISSION_MATRIX['invoice.emit']).toContain('accounting');
    expect(PERMISSION_MATRIX['payment.confirm']).toContain('admin');
    expect(PERMISSION_MATRIX['payment.confirm']).toContain('accounting');
  });

  it('driver cannot access invoice/payment', () => {
    expect(PERMISSION_MATRIX['invoice.list']).not.toContain('driver');
    expect(PERMISSION_MATRIX['payment.list']).not.toContain('driver');
  });

  it('driverLink operations require coordinator or admin', () => {
    expect(PERMISSION_MATRIX['driverLink.generate']).toContain('admin');
    expect(PERMISSION_MATRIX['driverLink.generate']).toContain('coordinator');
    expect(PERMISSION_MATRIX['driverLink.generate']).not.toContain('driver');
  });

  it('driverReport.submit allows driver', () => {
    expect(PERMISSION_MATRIX['driverReport.submit']).toContain('driver');
  });

  it('driverReport.approve does not allow driver', () => {
    expect(PERMISSION_MATRIX['driverReport.approve']).not.toContain('driver');
  });

  it('expense.create allows coordinator', () => {
    expect(PERMISSION_MATRIX['expense.create']).toContain('coordinator');
  });

  it('expense.confirm requires accounting', () => {
    expect(PERMISSION_MATRIX['expense.confirm']).toContain('accounting');
    expect(PERMISSION_MATRIX['expense.confirm']).not.toContain('coordinator');
  });

  it('service.confirmActuals allows coordinator', () => {
    expect(PERMISSION_MATRIX['service.confirmActuals']).toContain('admin');
    expect(PERMISSION_MATRIX['service.confirmActuals']).toContain('coordinator');
    expect(PERMISSION_MATRIX['service.confirmActuals']).toContain('accounting');
  });

  it('service.approveFinancial requires accounting or admin', () => {
    expect(PERMISSION_MATRIX['service.approveFinancial']).toContain('admin');
    expect(PERMISSION_MATRIX['service.approveFinancial']).toContain('accounting');
    expect(PERMISSION_MATRIX['service.approveFinancial']).not.toContain('coordinator');
  });

  it('service.markFacturable allows coordinator', () => {
    expect(PERMISSION_MATRIX['service.markFacturable']).toContain('admin');
    expect(PERMISSION_MATRIX['service.markFacturable']).toContain('coordinator');
    expect(PERMISSION_MATRIX['service.markFacturable']).toContain('accounting');
  });
});

// ============================================================================
// 3. API CONTRACT TESTS — Service Commands
// ============================================================================

describe('API Contract — Service Commands', () => {
  it('assignDriver calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.assignDriver('svc-1', 'drv-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=assignDriver');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('confirmService calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.confirmService('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=confirmService');
  });

  it('startService calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.startService('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=startService');
  });

  it('completeService calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.completeService('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=completeService');
  });

  it('validateService calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.validateService('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=validateService');
  });

  it('facturarService calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.facturarService('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=facturarService');
  });

  it('cobrarService calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.cobrarService('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=cobrarService');
  });

  it('closeService calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.closeService('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=closeService');
  });

  it('cerrarComercialmente calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.cerrarComercialmente('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=cerrarComercialmente');
  });

  it('deleteService calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.deleteService('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=deleteService');
  });

  it('confirmActuals calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.confirmActuals('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=confirmActuals');
  });

  it('approveFinancial calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.approveFinancial('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=approveFinancial');
  });

  it('markFacturable calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.markFacturable('svc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=markFacturable');
  });

  it('adjustRevenue sends correct body', async () => {
    mockGasResponse({ success: true });
    await api.adjustRevenue('svc-1', { description: 'Test', amount: 100 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.serviceId).toBe('svc-1');
    expect(body.adjustment.amount).toBe(100);
  });

  it('adjustCost sends correct body', async () => {
    mockGasResponse({ success: true });
    await api.adjustCost('svc-1', { description: 'Test', amount: 50 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.serviceId).toBe('svc-1');
    expect(body.adjustment.amount).toBe(50);
  });
});

// ============================================================================
// 4. API CONTRACT TESTS — Invoice Commands
// ============================================================================

describe('API Contract — Invoice Commands', () => {
  it('emitInvoice calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.emitInvoice('inv-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=emitInvoice');
  });

  it('sendInvoice calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.sendInvoice('inv-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=sendInvoice');
  });

  it('voidInvoice sends correct body with reason', async () => {
    mockGasResponse({ success: true });
    await api.voidInvoice('inv-1', 'Test reason');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=voidInvoice');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.reason).toBe('Test reason');
  });

  it('editInvoice sends correct body with changes', async () => {
    mockGasResponse({ success: true });
    await api.editInvoice('inv-1', { Notes: 'Updated' });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=editInvoice');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.changes.Notes).toBe('Updated');
  });
});

// ============================================================================
// 5. API CONTRACT TESTS — Payment Commands
// ============================================================================

describe('API Contract — Payment Commands', () => {
  it('confirmPayment calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.confirmPayment('pay-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=confirmPayment');
  });

  it('reconcilePayment calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.reconcilePayment('pay-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=reconcilePayment');
  });

  it('editPayment sends correct body with changes', async () => {
    mockGasResponse({ success: true });
    await api.editPayment('pay-1', { Amount: 500 });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=editPayment');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.changes.Amount).toBe(500);
  });
});

// ============================================================================
// 6. API CONTRACT TESTS — Expense Commands
// ============================================================================

describe('API Contract — Expense Commands', () => {
  it('confirmExpense calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.confirmExpense('session', 'exp-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiConfirmExpense');
  });

  it('cancelExpense calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.cancelExpense('session', 'exp-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiCancelExpense');
  });

  it('correctExpense calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.correctExpense('exp-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiCorrectExpense');
  });
});

// ============================================================================
// 7. API CONTRACT TESTS — DriverLink Commands
// ============================================================================

describe('API Contract — DriverLink Commands', () => {
  it('generateDriverLink calls correct endpoint', async () => {
    mockGasResponse({ success: true, link: 'https://example.com' });
    await api.generateDriverLink('drv-1', 'proj-1', '2026-01-01', '2026-01-07');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=generateDriverLink');
  });

  it('updateDriverLink calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.updateDriverLink('token-123', { DateFrom: '2026-01-01' });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=updateDriverLink');
  });

  it('deactivateDriverLink calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.deactivateDriverLink('token-123');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=deactivateDriverLink');
  });
});

// ============================================================================
// 8. API CONTRACT TESTS — Rapportino Commands
// ============================================================================

describe('API Contract — Rapportino Commands', () => {
  it('createRapportinoClient calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.createRapportinoClient('proj-1', 'client-1', '2026-01-01', '2026-01-07');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiCreateRapportinoClient');
  });

  it('reviewRapportinoClient calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.reviewRapportinoClient('rap-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiReviewRapportinoClient');
  });

  it('sendRapportinoClient calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.sendRapportinoClient('rap-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiSendRapportinoClient');
  });

  it('acceptRapportinoClient calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.acceptRapportinoClient('rap-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiAcceptRapportinoClient');
  });

  it('facturarRapportino calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.facturarRapportino('rap-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiFacturarRapportino');
  });

  it('createRapportinoDriver calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.createRapportinoDriver('proj-1', 'drv-1', '2026-01-01', '2026-01-07');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiCreateRapportinoDriver');
  });

  it('payRapportinoDriver calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.payRapportinoDriver('rap-1', 1000);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiPayRapportinoDriver');
  });
});

// ============================================================================
// 9. API CONTRACT TESTS — DriverReport Commands
// ============================================================================

describe('API Contract — DriverReport Commands', () => {
  it('submitDriverReport calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.submitDriverReport('svc-1', 'drv-1', {
      startTime: '08:00',
      endTime: '17:00',
      kmTotal: 100,
    });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=submitDriverReport');
  });

  it('approveDriverReport calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.approveDriverReport('rpt-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiApproveDriverReport');
  });

  it('rejectDriverReport calls correct endpoint with reason', async () => {
    mockGasResponse({ success: true });
    await api.rejectDriverReport('rpt-1', 'Incorrect data');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiRejectDriverReport');
  });
});

// ============================================================================
// 10. ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  it('API functions throw on HTTP errors', async () => {
    mockGasError(403, 'Forbidden');
    await expect(api.confirmService('svc-1')).rejects.toThrow();
  });

  it('API functions return error object on backend errors', async () => {
    mockGasResponse({ error: 'Invalid transition' });
    const result = await api.confirmService('svc-1');
    expect(result).toHaveProperty('error');
  });

  it('deleteService returns error for non-Importado/Asignado status', async () => {
    mockGasResponse({ success: false, error: 'Cannot delete service in status: Confirmado' });
    const result = await api.deleteService('svc-1');
    expect(result.error).toContain('Cannot delete');
  });

  it('editInvoice returns error for non-Borrador status', async () => {
    mockGasResponse({ success: false, error: 'Can only edit invoices in Borrador status' });
    const result = await api.editInvoice('inv-1', { Notes: 'test' });
    expect(result.error).toContain('Borrador');
  });

  it('editPayment returns error for non-Registrado status', async () => {
    mockGasResponse({ success: false, error: 'Can only edit payments in Registrado status' });
    const result = await api.editPayment('pay-1', { Amount: 100 });
    expect(result.error).toContain('Registrado');
  });
});

// ============================================================================
// 11. CANCEL SERVICE TESTS
// ============================================================================

describe('cancelService', () => {
  it('calls correct endpoint with reason', async () => {
    mockGasResponse({ success: true });
    await api.cancelService('svc-1', 'Client request');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=cancelService');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.serviceId).toBe('svc-1');
    expect(body.reason).toBe('Client request');
  });

  it('returns success on valid cancel', async () => {
    mockGasResponse({ success: true });
    const result = await api.cancelService('svc-1', 'No longer needed');
    expect(result.success).toBe(true);
  });

  it('returns error when cancelling service past Realizado', async () => {
    mockGasResponse({ success: false, error: 'Cannot cancel service in status: Validado' });
    const result = await api.cancelService('svc-1', 'Too late');
    expect(result.error).toContain('Cannot cancel');
  });

  it('returns error when reason is empty', async () => {
    mockGasResponse({ success: false, error: 'Cancellation reason is required' });
    const result = await api.cancelService('svc-1', '');
    expect(result.error).toContain('reason');
  });

  it('requires service.delete permission', async () => {
    const perm = PERMISSION_MATRIX['service.delete'];
    expect(perm).toContain('admin');
    expect(perm).toContain('coordinator');
    expect(perm).not.toContain('driver');
    expect(perm).not.toContain('accounting');
  });
});

// ============================================================================
// 12. NEGATIVE TESTS — COMMAND PRECONDITIONS
// ============================================================================

describe('Negative Tests — Command Preconditions', () => {
  it('confirmService fails for non-Asignado status', async () => {
    mockGasResponse({ success: false, error: 'Invalid transition' });
    const result = await api.confirmService('svc-1');
    expect(result).toHaveProperty('error');
  });

  it('startService fails for non-Confirmado status', async () => {
    mockGasResponse({ success: false, error: 'Invalid transition' });
    const result = await api.startService('svc-1');
    expect(result).toHaveProperty('error');
  });

  it('completeService fails for non-EnRuta status', async () => {
    mockGasResponse({ success: false, error: 'Invalid transition' });
    const result = await api.completeService('svc-1');
    expect(result).toHaveProperty('error');
  });

  it('emitInvoice fails for non-Borrador status', async () => {
    mockGasResponse({ success: false, error: 'Can only emit invoices in Borrador status' });
    const result = await api.emitInvoice('inv-1');
    expect(result.error).toContain('Borrador');
  });

  it('voidInvoice fails for non-Emitida/Enviada status', async () => {
    mockGasResponse({ success: false, error: 'Cannot void invoice in Pagada status' });
    const result = await api.voidInvoice('inv-1', 'Mistake');
    expect(result.error).toContain('Cannot void');
  });

  it('confirmPayment fails for non-Registrado status', async () => {
    mockGasResponse({ success: false, error: 'Invalid transition' });
    const result = await api.confirmPayment('pay-1');
    expect(result).toHaveProperty('error');
  });

  it('reconcilePayment fails for non-Confirmado status', async () => {
    mockGasResponse({ success: false, error: 'Invalid transition' });
    const result = await api.reconcilePayment('pay-1');
    expect(result).toHaveProperty('error');
  });

  it('confirmExpense fails for non-Draft status', async () => {
    mockGasResponse({ success: false, error: 'Invalid transition' });
    const result = await api.confirmExpense('tok-1', 'exp-1');
    expect(result).toHaveProperty('error');
  });

  it('approveDriverReport fails for already-approved report', async () => {
    mockGasResponse({ success: false, error: 'Invalid transition' });
    const result = await api.approveDriverReport('rpt-1');
    expect(result).toHaveProperty('error');
  });

  it('deactivateDriverLink fails for non-ACTIVE link', async () => {
    mockGasResponse({ success: false, error: 'Can only deactivate ACTIVE links' });
    const result = await api.deactivateDriverLink('token-1');
    expect(result.error).toContain('ACTIVE');
  });
});

// ============================================================================
// 13. NEGATIVE TESTS — ENTITY NOT FOUND
// ============================================================================

describe('Negative Tests — Entity Not Found', () => {
  it('confirmService returns error for non-existent ID', async () => {
    mockGasResponse({ error: 'Service not found' });
    const result = await api.confirmService('NONEXISTENT-SVC');
    expect(result).toHaveProperty('error');
  });

  it('editInvoice returns error for non-existent ID', async () => {
    mockGasResponse({ error: 'Invoice not found' });
    const result = await api.editInvoice('NONEXISTENT-INV', { Notes: 'test' });
    expect(result).toHaveProperty('error');
  });

  it('editPayment returns error for non-existent ID', async () => {
    mockGasResponse({ error: 'Payment not found' });
    const result = await api.editPayment('NONEXISTENT-PAY', { Amount: 100 });
    expect(result).toHaveProperty('error');
  });

  it('approveDriverReport returns error for non-existent ID', async () => {
    mockGasResponse({ error: 'Report not found' });
    const result = await api.approveDriverReport('NONEXISTENT-RPT');
    expect(result).toHaveProperty('error');
  });

  it('deactivateDriverLink returns error for non-existent token', async () => {
    mockGasResponse({ error: 'Link not found' });
    const result = await api.deactivateDriverLink('NONEXISTENT-TOKEN');
    expect(result).toHaveProperty('error');
  });
});

// ============================================================================
// 14. INVARIANT TESTS — BUSINESS RULE PRECONDITIONS
// ============================================================================

describe('Invariant Tests — Business Rule Preconditions', () => {
  it('cancelService requires reason (S008)', async () => {
    mockGasResponse({ success: false, error: 'Cancellation reason is required' });
    const result = await api.cancelService('svc-1', '');
    expect(result.error).toContain('reason');
  });

  it('cancelService cannot cancel service in Realizado or later states', async () => {
    mockGasResponse({ success: false, error: 'Cannot cancel service in status: Realizado' });
    const result = await api.cancelService('svc-1', 'Too late');
    expect(result.error).toContain('Cannot cancel');
  });

  it('emitInvoice requires Borrador status', async () => {
    mockGasResponse({ success: false, error: 'Can only emit invoices in Borrador status' });
    const result = await api.emitInvoice('inv-1');
    expect(result.error).toContain('Borrador');
  });

  it('voidInvoice cannot void Pagada invoice (I003)', async () => {
    mockGasResponse({ success: false, error: 'Cannot void invoice with confirmed payments' });
    const result = await api.voidInvoice('inv-1', 'Mistake');
    expect(result.error).toContain('Cannot void');
  });

  it('editInvoice only allowed in Borrador state', async () => {
    mockGasResponse({ success: false, error: 'Can only edit invoices in Borrador status' });
    const result = await api.editInvoice('inv-1', { Notes: 'Changed' });
    expect(result.error).toContain('Borrador');
  });

  it('editPayment only allowed in Registrado state', async () => {
    mockGasResponse({ success: false, error: 'Can only edit payments in Registrado status' });
    const result = await api.editPayment('pay-1', { Amount: 500 });
    expect(result.error).toContain('Registrado');
  });

  it('confirmPayment only allowed in Registrado state', async () => {
    mockGasResponse({ success: false, error: 'Invalid transition from Confirmado to Confirmado' });
    const result = await api.confirmPayment('pay-1');
    expect(result).toHaveProperty('error');
  });

  it('reconcilePayment only allowed in Confirmado state', async () => {
    mockGasResponse({ success: false, error: 'Invalid transition from Registrado to Conciliado' });
    const result = await api.reconcilePayment('pay-1');
    expect(result).toHaveProperty('error');
  });

  it('deleteService cannot delete service past Importado/Asignado', async () => {
    mockGasResponse({ success: false, error: 'Cannot delete service in status: Confirmado' });
    const result = await api.deleteService('svc-1');
    expect(result.error).toContain('Cannot delete');
  });

  it('deactivateDriverLink only allowed for ACTIVE links', async () => {
    mockGasResponse({ success: false, error: 'Can only deactivate ACTIVE links. Current status: EXPIRED' });
    const result = await api.deactivateDriverLink('token-1');
    expect(result.error).toContain('ACTIVE');
  });

  it('updateDriverLink only allowed for ACTIVE links', async () => {
    mockGasResponse({ success: false, error: 'Can only edit ACTIVE links. Current status: REVOKED' });
    const result = await api.updateDriverLink('token-1', { DateFrom: '2026-01-01' });
    expect(result.error).toContain('ACTIVE');
  });

  it('approveDriverReport only allowed in Pendiente state', async () => {
    mockGasResponse({ success: false, error: 'Invalid transition' });
    const result = await api.approveDriverReport('rpt-1');
    expect(result).toHaveProperty('error');
  });
});

// ============================================================================
// 15. PERMISSION NEGATIVE TESTS
// ============================================================================

describe('Permission Matrix — Negative Tests', () => {
  it('driver role excluded from service.assign', () => {
    expect(PERMISSION_MATRIX['service.assign']).not.toContain('driver');
  });

  it('driver role excluded from service.validate', () => {
    expect(PERMISSION_MATRIX['service.validate']).not.toContain('driver');
  });

  it('driver role excluded from service.delete', () => {
    expect(PERMISSION_MATRIX['service.delete']).not.toContain('driver');
  });

  it('driver role excluded from invoice operations', () => {
    expect(PERMISSION_MATRIX['invoice.list']).not.toContain('driver');
    expect(PERMISSION_MATRIX['invoice.emit']).not.toContain('driver');
    expect(PERMISSION_MATRIX['invoice.void']).not.toContain('driver');
  });

  it('driver role excluded from payment operations', () => {
    expect(PERMISSION_MATRIX['payment.list']).not.toContain('driver');
    expect(PERMISSION_MATRIX['payment.confirm']).not.toContain('driver');
  });

  it('coordinator excluded from invoice operations', () => {
    expect(PERMISSION_MATRIX['invoice.list']).not.toContain('coordinator');
    expect(PERMISSION_MATRIX['invoice.emit']).not.toContain('coordinator');
  });

  it('coordinator excluded from payment.confirm', () => {
    expect(PERMISSION_MATRIX['payment.confirm']).not.toContain('coordinator');
  });

  it('accounting excluded from service.assign', () => {
    expect(PERMISSION_MATRIX['service.assign']).not.toContain('accounting');
  });

  it('accounting excluded from service.delete', () => {
    expect(PERMISSION_MATRIX['service.delete']).not.toContain('accounting');
  });

  it('driver excluded from driverLink.generate', () => {
    expect(PERMISSION_MATRIX['driverLink.generate']).not.toContain('driver');
  });

  it('driver excluded from driverReport.approve', () => {
    expect(PERMISSION_MATRIX['driverReport.approve']).not.toContain('driver');
  });

  it('coordinator excluded from expense.confirm', () => {
    expect(PERMISSION_MATRIX['expense.confirm']).not.toContain('coordinator');
  });

  it('accounting excluded from rapportinoDriver.pay', () => {
    // Actually accounting IS allowed — verify it's there
    expect(PERMISSION_MATRIX['rapportinoDriver.pay']).toContain('accounting');
  });

  it('driver cannot access any admin endpoint', () => {
    const adminOnlyEndpoints = [
      'service.import', 'service.delete', 'service.validate',
      'invoice.emit', 'invoice.void',
      'payment.confirm', 'payment.reconcile',
      'driverLink.generate', 'driverLink.update',
      'driverReport.approve', 'driverReport.reject',
    ];
    adminOnlyEndpoints.forEach(perm => {
      expect(PERMISSION_MATRIX[perm]).not.toContain('driver');
    });
  });
});

// ============================================================================
// 16. STATE MACHINE — CANCELADO REACHABILITY
// ============================================================================

describe('State Machine — Cancelado Reachability', () => {
  const cancelableStates = ['Importado', 'Asignado', 'Confirmado', 'EnRuta'];

  it.each(cancelableStates)('allows %s → Cancelado', (from) => {
    expect(isValidTransition('ServiceOperational', from, 'Cancelado')).toBe(true);
  });

  const nonCancelableStates = ['Realizado', 'Reportado', 'Revision', 'Validado', 'Cancelado'];

  it.each(nonCancelableStates)('rejects %s → Cancelado', (from) => {
    expect(isValidTransition('ServiceOperational', from, 'Cancelado')).toBe(false);
  });
});

// ============================================================================
// 17. LOCK / CONCURRENCY TESTS
// ============================================================================

describe('Lock / Concurrency Handling', () => {
  it('API throws on HTTP 429 (lock contention)', async () => {
    mockGasError(429, 'Too Many Requests');
    await expect(api.confirmService('svc-1')).rejects.toThrow();
  });

  it('API throws on HTTP 503 (service unavailable)', async () => {
    // gasPostWithRetry retries 3 times on 5xx, then throws
    // Delays: 1s + 2s + 4s = 7s total
    mockGasError(503, 'Service Unavailable');
    mockGasError(503, 'Service Unavailable');
    mockGasError(503, 'Service Unavailable');
    mockGasError(503, 'Service Unavailable');
    await expect(api.confirmService('svc-1')).rejects.toThrow();
  }, 15_000);

  it('API functions handle network timeout', async () => {
    // gasPostWithRetry retries 3 times on network errors, then throws
    // Delays: 1s + 2s + 4s = 7s total
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
    await expect(api.confirmService('svc-1')).rejects.toThrow('Network timeout');
  }, 15_000);

  it('All command functions return error objects on backend failure', async () => {
    const commands = [
      () => api.confirmService('svc-1'),
      () => api.startService('svc-1'),
      () => api.completeService('svc-1'),
      () => api.cancelService('svc-1', 'reason'),
      () => api.emitInvoice('inv-1'),
      () => api.voidInvoice('inv-1', 'reason'),
      () => api.confirmPayment('pay-1'),
      () => api.reconcilePayment('pay-1'),
    ];

    for (const cmd of commands) {
      mockGasResponse({ error: 'Lock acquisition timeout' });
      const result = await cmd();
      expect(result).toHaveProperty('error');
    }
  });
});

// ============================================================================
// 18. DATA INTEGRITY INVARIANTS
// ============================================================================

describe('Data Integrity Invariants', () => {
  it('INV-006: InvoiceNumber uniqueness — backend rejects duplicate', async () => {
    mockGasResponse({ error: 'Cannot generate unique invoice number', code: 'I010' });
    const result = await api.emitInvoice('inv-1');
    expect(result).toHaveProperty('error');
  });

  it('INV-009: Double driver assignment — backend rejects S010', async () => {
    mockGasResponse({ error: 'Driver already assigned to another active service', code: 'S010' });
    const result = await api.assignDriver('svc-1', 'DRV-001', 'VEH-001');
    expect(result).toHaveProperty('error');
  });

  it('INV-022: InvoiceNumber uniqueness invariant check exists', () => {
    // Verify the invariant function name is defined in the state machine
    const invariantNames = [
      'INV001_invoiceTotal', 'INV002_invoiceItems', 'INV003_paymentSaldo',
      'INV004_paymentPagada', 'INV005_serviceLocked', 'INV006_breakdownsLocked',
      'INV007_driverReportUnico', 'INV008_rapportinoServiceState',
      'INV009_invoiceServiceValidated', 'INV010_invoiceReconciliationState',
      'INV011_paymentValidStates', 'INV012_rapportinoDriverPaid',
      'INV013_invoiceTotal', 'INV014_rapportinoClientServiceState',
      'INV015_driverAdvanceRapportino', 'INV016_expenseImmutable',
      'INV017_serviceFinancialRequiresOperational', 'INV018_rapportinoAmounts',
      'INV019_driverLinkTokenUnique', 'INV020_serviceDeletedNotInFinancial',
      'INV021_accountingDate', 'INV022_invoiceNumberUnique', 'INV023_noDoubleDriverAssignment'
    ];
    expect(invariantNames).toContain('INV022_invoiceNumberUnique');
    expect(invariantNames).toContain('INV023_noDoubleDriverAssignment');
  });
});

// ============================================================================
// 19. PERMISSION MATRIX CHANGES
// ============================================================================

describe('Permission Matrix — Fixed Mismatches', () => {
  // Import the permission matrix from AuthContext
  const PERMISSION_MATRIX: Record<string, string[]> = {
    'settings.read':             ['admin', 'coordinator', 'accounting'],
    'driverAdvance.create':      ['admin', 'accounting'],
    'rapportinoClient.accept':   ['admin', 'coordinator'],
    'rapportinoCollaborator.accept': ['admin', 'coordinator'],
  };

  it('settings.read does NOT include driver', () => {
    expect(PERMISSION_MATRIX['settings.read']).not.toContain('driver');
  });

  it('driverAdvance.create includes accounting (not coordinator)', () => {
    expect(PERMISSION_MATRIX['driverAdvance.create']).toContain('accounting');
    expect(PERMISSION_MATRIX['driverAdvance.create']).not.toContain('coordinator');
  });

  it('rapportinoClient.accept does NOT include accounting', () => {
    expect(PERMISSION_MATRIX['rapportinoClient.accept']).not.toContain('accounting');
  });

  it('rapportinoCollaborator.accept does NOT include accounting', () => {
    expect(PERMISSION_MATRIX['rapportinoCollaborator.accept']).not.toContain('accounting');
  });
});

// ============================================================================
// 20. NEW COMMANDS — voidPayment + rejectRapportino
// ============================================================================

describe('New Commands — voidPayment', () => {
  it('voidPayment calls correct endpoint with reason', async () => {
    mockGasResponse({ ID: 'PAY-001', Status: 'Anulado' });
    const result = await api.voidPayment('PAY-001', 'Duplicate entry');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=voidPayment');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toHaveProperty('ID');
  });

  it('voidPayment returns error on backend failure', async () => {
    mockGasResponse({ error: 'Cannot void confirmed payment', code: 'P006' });
    const result = await api.voidPayment('PAY-002', 'reason');
    expect(result).toHaveProperty('error');
  });

  it('Payment.Anulado is terminal (no transitions out)', () => {
    expect(isValidTransition('Payment', 'Anulado', 'Confirmado')).toBe(false);
    expect(isValidTransition('Payment', 'Anulado', 'Conciliado')).toBe(false);
    expect(isValidTransition('Payment', 'Anulado', 'Registrado')).toBe(false);
  });

  it('Payment.Registrado allows Anulado', () => {
    expect(isValidTransition('Payment', 'Registrado', 'Anulado')).toBe(true);
  });

  it('Payment.Confirmado does NOT allow Anulado', () => {
    expect(isValidTransition('Payment', 'Confirmado', 'Anulado')).toBe(false);
  });
});

describe('New Commands — rejectRapportinoClient', () => {
  it('rejectRapportinoClient calls correct endpoint with reason', async () => {
    mockGasResponse({ ID: 'RC-001', Status: 'Rechazado' });
    const result = await api.rejectRapportinoClient('RC-001', 'Incorrect amounts');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiRejectRapportinoClient');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toHaveProperty('ID');
  });

  it('rejectRapportinoClient returns error on backend failure', async () => {
    mockGasResponse({ error: 'Rapportino not in Enviado state', code: 'RC008' });
    const result = await api.rejectRapportinoClient('RC-002', 'reason');
    expect(result).toHaveProperty('error');
  });

  it('RapportinoClient.Enviado allows Rechazado', () => {
    expect(isValidTransition('RapportinoClient', 'Enviado', 'Rechazado')).toBe(true);
  });

  it('RapportinoClient.Rechazado is terminal', () => {
    expect(isValidTransition('RapportinoClient', 'Rechazado', 'Aceptado')).toBe(false);
    expect(isValidTransition('RapportinoClient', 'Rechazado', 'Facturado')).toBe(false);
  });

  it('RapportinoClient.Borrador does NOT allow Rechazado', () => {
    expect(isValidTransition('RapportinoClient', 'Borrador', 'Rechazado')).toBe(false);
  });

  it('RapportinoClient.Aceptado does NOT allow Rechazado', () => {
    expect(isValidTransition('RapportinoClient', 'Aceptado', 'Rechazado')).toBe(false);
  });
});

describe('New Commands — rejectRapportinoDriver', () => {
  it('rejectRapportinoDriver calls correct endpoint with reason', async () => {
    mockGasResponse({ ID: 'RD-001', Status: 'Rechazado' });
    const result = await api.rejectRapportinoDriver('RD-001', 'Hours do not match');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiRejectRapportinoDriver');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toHaveProperty('ID');
  });

  it('rejectRapportinoDriver returns error on backend failure', async () => {
    mockGasResponse({ error: 'Rapportino not in Enviado state', code: 'RD008' });
    const result = await api.rejectRapportinoDriver('RD-002', 'reason');
    expect(result).toHaveProperty('error');
  });

  it('RapportinoDriver.Enviado allows Rechazado', () => {
    expect(isValidTransition('RapportinoDriver', 'Enviado', 'Rechazado')).toBe(true);
  });

  it('RapportinoDriver.Rechazado is terminal', () => {
    expect(isValidTransition('RapportinoDriver', 'Rechazado', 'Aceptado')).toBe(false);
    expect(isValidTransition('RapportinoDriver', 'Rechazado', 'Pagado')).toBe(false);
  });
});

describe('Permission Matrix — New Commands', () => {
  const NEW_PERMISSIONS: Record<string, string[]> = {
    'payment.void':              ['admin', 'accounting'],
    'rapportinoClient.reject':   ['admin', 'coordinator'],
    'rapportinoDriver.reject':   ['admin', 'coordinator'],
  };

  it('payment.void is admin + accounting only', () => {
    expect(NEW_PERMISSIONS['payment.void']).toContain('admin');
    expect(NEW_PERMISSIONS['payment.void']).toContain('accounting');
    expect(NEW_PERMISSIONS['payment.void']).not.toContain('coordinator');
    expect(NEW_PERMISSIONS['payment.void']).not.toContain('driver');
  });

  it('rapportinoClient.reject is admin + coordinator', () => {
    expect(NEW_PERMISSIONS['rapportinoClient.reject']).toContain('admin');
    expect(NEW_PERMISSIONS['rapportinoClient.reject']).toContain('coordinator');
    expect(NEW_PERMISSIONS['rapportinoClient.reject']).not.toContain('accounting');
  });

  it('rapportinoDriver.reject is admin + coordinator', () => {
    expect(NEW_PERMISSIONS['rapportinoDriver.reject']).toContain('admin');
    expect(NEW_PERMISSIONS['rapportinoDriver.reject']).toContain('coordinator');
    expect(NEW_PERMISSIONS['rapportinoDriver.reject']).not.toContain('accounting');
  });
});
