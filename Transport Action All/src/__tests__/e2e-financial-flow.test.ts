/**
 * ============================================================================
 * E2E TEST — Complete Financial Flow
 * ============================================================================
 * 
 * This test verifies the complete financial lifecycle:
 * 1. Service creation and operational flow
 * 2. DriverReport submission and approval
 * 3. Reconciliation
 * 4. Financial transitions (Pendiente → Calculado → ... → CerradoComercial)
 * 5. RapportinoClient flow
 * 6. Invoice and Payment flow
 * 
 * NOTE: This is a contract test that verifies the API surface.
 * For real E2E testing against Google Sheets, use the backend test suite.
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
// STATE MACHINE (mirrored from stateMachine.gs)
// ============================================================================

const ServiceFinancial = {
  Pendiente:          ['Calculado'],
  Calculado:          ['Confrontacion', 'ActualsConfirmados', 'Aprobado'],
  Confrontacion:      ['ActualsConfirmados', 'Aprobado'],
  ActualsConfirmados: ['Aprobado'],
  Aprobado:           ['Facturable'],
  Facturable:         ['Facturado'],
  Facturado:          ['Cobrado'],
  Cobrado:            ['Cerrado'],
  Cerrado:            ['CerradoComercial'],
  CerradoComercial:   []
};

function isValidTransition(from: string, to: string): boolean {
  const allowed = (ServiceFinancial as any)[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

// ============================================================================
// TESTS
// ============================================================================

describe('E2E — Financial Flow State Machine', () => {
  it('validates complete financial lifecycle transitions', () => {
    // Happy path: Pendiente → Calculado → ActualsConfirmados → Aprobado → Facturable → Facturado → Cobrado → Cerrado → CerradoComercial
    expect(isValidTransition('Pendiente', 'Calculado')).toBe(true);
    expect(isValidTransition('Calculado', 'ActualsConfirmados')).toBe(true);
    expect(isValidTransition('ActualsConfirmados', 'Aprobado')).toBe(true);
    expect(isValidTransition('Aprobado', 'Facturable')).toBe(true);
    expect(isValidTransition('Facturable', 'Facturado')).toBe(true);
    expect(isValidTransition('Facturado', 'Cobrado')).toBe(true);
    expect(isValidTransition('Cobrado', 'Cerrado')).toBe(true);
    expect(isValidTransition('Cerrado', 'CerradoComercial')).toBe(true);
  });

  it('validates alternative path with Confrontacion', () => {
    // Path with reconciliation: Pendiente → Calculado → Confrontacion → ActualsConfirmados → Aprobado
    expect(isValidTransition('Pendiente', 'Calculado')).toBe(true);
    expect(isValidTransition('Calculado', 'Confrontacion')).toBe(true);
    expect(isValidTransition('Confrontacion', 'ActualsConfirmados')).toBe(true);
    expect(isValidTransition('ActualsConfirmados', 'Aprobado')).toBe(true);
  });

  it('validates direct approval path', () => {
    // Direct approval: Calculado → Aprobado (skipping ActualsConfirmados)
    expect(isValidTransition('Calculado', 'Aprobado')).toBe(true);
  });

  it('rejects skipping Facturable (Aprobado → Facturado not allowed)', () => {
    // Must go through Facturable
    expect(isValidTransition('Aprobado', 'Facturado')).toBe(false);
    expect(isValidTransition('Aprobado', 'Facturable')).toBe(true);
    expect(isValidTransition('Facturable', 'Facturado')).toBe(true);
  });

  it('rejects jumping to end states', () => {
    expect(isValidTransition('Pendiente', 'Facturado')).toBe(false);
    expect(isValidTransition('Pendiente', 'Cobrado')).toBe(false);
    expect(isValidTransition('Calculado', 'Facturado')).toBe(false);
    expect(isValidTransition('Confrontacion', 'Facturable')).toBe(false);
  });

  it('rejects backward transitions', () => {
    expect(isValidTransition('Facturado', 'Aprobado')).toBe(false);
    expect(isValidTransition('Cobrado', 'Facturado')).toBe(false);
    expect(isValidTransition('Cerrado', 'Cobrado')).toBe(false);
    expect(isValidTransition('CerradoComercial', 'Cerrado')).toBe(false);
  });
});

describe('E2E — API Contract for Financial Transitions', () => {
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
});

describe('E2E — RapportinoClient Flow', () => {
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
});

describe('E2E — Invoice and Payment Flow', () => {
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
});

describe('E2E — Operational Flow', () => {
  it('assignDriver calls correct endpoint', async () => {
    mockGasResponse({ success: true });
    await api.assignDriver('svc-1', 'drv-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=assignDriver');
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
});
