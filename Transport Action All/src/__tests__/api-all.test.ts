/**
 * ============================================================================
 * TEST COMPREHENSIVO — TODAS las funciones de api.ts
 * ============================================================================
 * 
 * Agrupadas por dominio:
 * A. Transport Services (CRUD + lifecycle)
 * B. Drivers (CRUD)
 * C. Operating Companies (CRUD)
 * D. Clients (CRUD)
 * E. Projects (CRUD + lifecycle)
 * F. Contacts (CRUD)
 * G. Vehicles (CRUD)
 * H. Rate Cards (CRUD)
 * I. Driver Rates (CRUD)
 * J. Rapportino Client (lifecycle)
 * K. Rapportino Driver (lifecycle)
 * L. Invoice (lifecycle)
 * M. Payment (lifecycle)
 * N. Expense (CRUD)
 * O. Driver Advance (CRUD)
 * P. Driver Reports (CRUD)
 * Q. Driver Links (generate, get, deactivate)
 * R. Changes (CRUD)
 * S. Auth (login, session)
 * T. Activity Feed
 * U. Audit Log
 * V. Dashboard
 * W. WhatsApp Messages
 * X. Excel Import/Export
 * Y. Utility Functions (normalizeTransportService, etc.)
 * 
 * Ejecutar: npm test -- src/__tests__/api-all.test.ts
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../services/api';

// ============================================================================
// MOCK SETUP
// ============================================================================

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

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
  mockFetch.mockReset(); // Clear mockResolvedValueOnce queue to prevent leaks between tests
  localStorageMock.clear();
});

// ============================================================================
// A. TRANSPORT SERVICES
// ============================================================================
describe('A. Transport Services', () => {
  it('getServices fetches all services', async () => {
    mockGasResponse([]);
    const result = await api.getServices();
    expect(Array.isArray(result)).toBe(true);
  });

  it('getServices with filters', async () => {
    mockGasResponse([]);
    await api.getServices({ projectId: 'PRJ-001', status: 'Validado' });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('action=apiGetServices');
  });

  it('updateServiceField updates a field', async () => {
    mockGasResponse({ success: true });
    const result = await api.updateServiceField('SVC-001', 'Notes', 'Test note');
    expect(result.success).toBe(true);
  });

  it('getServicesByTransportListId fetches services', async () => {
    mockGasResponse([]);
    const result = await api.getServicesByTransportListId('TL-001');
    expect(Array.isArray(result)).toBe(true);
  });
});

// ============================================================================
// B. DRIVERS
// ============================================================================
describe('B. Drivers', () => {
  it('getDrivers fetches all drivers', async () => {
    mockGasResponse([]);
    const result = await api.getDrivers();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createDriver creates a driver', async () => {
    mockGasResponse({ success: true, id: 'DRV-001' });
    const result = await api.createDriver('Marco', '+34600000000', 'Test');
    expect(result.success).toBe(true);
    expect(result.id).toBe('DRV-001');
  });

  it('updateDriver updates fields', async () => {
    mockGasResponse({ success: true });
    const result = await api.updateDriver('DRV-001', { name: 'Marco Updated' });
    expect(result.success).toBe(true);
  });

  it('deleteDriver deletes a driver', async () => {
    mockGasResponse({ success: true });
    const result = await api.deleteDriver('DRV-001');
    expect(result.success).toBe(true);
  });

  it('cleanupDrivers removes non-drivers', async () => {
    mockGasResponse({ removed: 3 });
    const result = await api.cleanupDrivers();
    expect(result.removed).toBe(3);
  });
});

// ============================================================================
// C. OPERATING COMPANIES
// ============================================================================
describe('C. Operating Companies', () => {
  it('getOperatingCompanies fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getOperatingCompanies();
    expect(Array.isArray(result)).toBe(true);
  });

  it('updateOperatingCompany updates', async () => {
    mockGasResponse({ success: true });
    const result = await api.updateOperatingCompany('OC-001', { name: 'Updated' });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// D. CLIENTS
// ============================================================================
describe('D. Clients', () => {
  it('getClients fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getClients();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createClient creates', async () => {
    mockGasResponse({ success: true, id: 'CLI-001' });
    const result = await api.createClient({ name: 'Test Client' });
    expect(result.success).toBe(true);
  });

  it('updateClient updates', async () => {
    mockGasResponse({ success: true });
    const result = await api.updateClient('CLI-001', { name: 'Updated' });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// E. PROJECTS
// ============================================================================
describe('E. Projects', () => {
  it('getProjects fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getProjects();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createProject creates', async () => {
    mockGasResponse({ success: true, id: 'PRJ-001' });
    const result = await api.createProject('token', {
      name: 'Test', clientId: 'CLI-001', transportCompany: 'TC', operatingCompany: 'OC',
      coordinator: 'Coord', status: 'Attivo', dateFrom: '2026-07-01', dateTo: '2026-07-31', notes: ''
    });
    expect(result.success).toBe(true);
  });

  it('updateProject updates', async () => {
    mockGasResponse({ success: true });
    const result = await api.updateProject('token', { id: 'PRJ-001', name: 'Updated' });
    expect(result.success).toBe(true);
  });

  it('deleteProject deletes', async () => {
    mockGasResponse({ success: true });
    const result = await api.deleteProject('token', 'PRJ-001');
    expect(result.success).toBe(true);
  });

  it('archiveProject archives', async () => {
    mockGasResponse({ success: true, project: { id: 'PRJ-001', status: 'Archiviato' } });
    const result = await api.archiveProject('token', 'PRJ-001');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// F. CONTACTS
// ============================================================================
describe('F. Contacts', () => {
  it('getContacts fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getContacts();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createContact creates', async () => {
    mockGasResponse({ success: true, id: 'CON-001' });
    const result = await api.createContact({
      clientId: 'CLI-001', name: 'John', role: 'Producer',
      phone: '+34600000000', email: 'john@test.com'
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// G. VEHICLES
// ============================================================================
describe('G. Vehicles', () => {
  it('getVehicles fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getVehicles();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createVehicle creates', async () => {
    mockGasResponse({ success: true, id: 'VEH-001' });
    const result = await api.createVehicle({
      plate: 'TEST-001', brand: 'Mercedes', model: 'Sprinter',
      type: 'Van', operatingCompany: 'OC-001'
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// H. RATE CARDS
// ============================================================================
describe('H. Rate Cards', () => {
  it('getRateCards fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getRateCards();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createRateCard creates', async () => {
    mockGasResponse({ success: true, id: 'RC-001' });
    const result = await api.createRateCard({
      clientId: 'CLI-001', name: 'Standard Rate',
      vehicleType: 'Van', basePrice: 100
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// I. DRIVER RATES
// ============================================================================
describe('I. Driver Rates', () => {
  it('getDriverRates fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getDriverRates();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createDriverRate creates', async () => {
    mockGasResponse({ success: true, id: 'DR-001' });
    const result = await api.createDriverRate({
      driverId: 'DRV-001', vehicleType: 'Van',
      transferRate: 150, halfDayRate: 100, fullDayRate: 180, nightExtra: 20, holidayExtra: 30, waitHourRate: 25
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// J. RAPPORTINO CLIENT
// ============================================================================
describe('J. Rapportino Client', () => {
  it('getRapportinoClients fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getRapportinoClients();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createRapportinoClient creates', async () => {
    mockGasResponse({ id: 'RPC-001', status: 'Borrador' });
    const result = await api.createRapportinoClient('PRJ-001', 'CLI-001', '2026-07-21', '2026-07-27');
    expect(result.id).toBe('RPC-001');
    expect(result.status).toBe('Borrador');
  });

  it('reviewRapportinoClient reviews', async () => {
    mockGasResponse({ id: 'RPC-001', status: 'Revisado' });
    const result = await api.reviewRapportinoClient('RPC-001');
    expect(result.status).toBe('Revisado');
  });

  it('sendRapportinoClient sends', async () => {
    mockGasResponse({ id: 'RPC-001', status: 'Enviado' });
    const result = await api.sendRapportinoClient('RPC-001');
    expect(result.status).toBe('Enviado');
  });

  it('acceptRapportinoClient accepts', async () => {
    mockGasResponse({ id: 'RPC-001', status: 'Aceptado' });
    const result = await api.acceptRapportinoClient('RPC-001');
    expect(result.status).toBe('Aceptado');
  });

  it('facturarRapportino invoices', async () => {
    mockGasResponse({ id: 'RPC-001', status: 'Facturado' });
    const result = await api.facturarRapportino('RPC-001');
    expect(result.status).toBe('Facturado');
  });

  it('addServiceToRapportino adds service', async () => {
    mockGasResponse({ success: true });
    const result = await api.addServiceToRapportino('RPC-001', 'SVC-001');
    expect(result.success).toBe(true);
  });

  it('removeServiceFromRapportino removes service', async () => {
    mockGasResponse({ success: true });
    const result = await api.removeServiceFromRapportino('RPC-001', 'SVC-001');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// K. RAPPORTINO DRIVER
// ============================================================================
describe('K. Rapportino Driver', () => {
  it('getRapportinoDrivers fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getRapportinoDrivers();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createRapportinoDriver creates', async () => {
    mockGasResponse({ id: 'RPD-001', status: 'Borrador' });
    const result = await api.createRapportinoDriver('PRJ-001', 'DRV-001', '2026-07-21', '2026-07-27');
    expect(result.id).toBe('RPD-001');
  });

  it('reviewRapportinoDriver reviews', async () => {
    mockGasResponse({ id: 'RPD-001', status: 'Revisado' });
    const result = await api.reviewRapportinoDriver('RPD-001');
    expect(result.status).toBe('Revisado');
  });

  it('sendRapportinoDriver sends', async () => {
    mockGasResponse({ id: 'RPD-001', status: 'Enviado' });
    const result = await api.sendRapportinoDriver('RPD-001');
    expect(result.status).toBe('Enviado');
  });

  it('acceptRapportinoDriver accepts', async () => {
    mockGasResponse({ id: 'RPD-001', status: 'Aceptado' });
    const result = await api.acceptRapportinoDriver('RPD-001');
    expect(result.status).toBe('Aceptado');
  });

  it('payRapportinoDriver pays', async () => {
    mockGasResponse({ id: 'RPD-001', status: 'Pagado' });
    const result = await api.payRapportinoDriver('RPD-001', 1500);
    expect(result.status).toBe('Pagado');
  });
});

// ============================================================================
// L. INVOICE
// ============================================================================
describe('L. Invoice', () => {
  it('getInvoices fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getInvoices();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createInvoice creates', async () => {
    mockGasResponse({ id: 'INV-001', status: 'Borrador' });
    const result = await api.createInvoice({
      projectId: 'PRJ-001', clientId: 'CLI-001',
      dueDate: '2026-08-15', notes: 'Test invoice'
    });
    expect(result.id).toBe('INV-001');
  });

  it('sendInvoice sends', async () => {
    mockGasResponse({ id: 'INV-001', status: 'Enviada' });
    const result = await api.sendInvoice('INV-001');
    expect(result.status).toBe('Enviada');
  });

  it('voidInvoice voids', async () => {
    mockGasResponse({ id: 'INV-001', status: 'Anulada' });
    const result = await api.voidInvoice('INV-001', 'Test void');
    expect(result.status).toBe('Anulada');
  });
});

// ============================================================================
// M. PAYMENT
// ============================================================================
describe('M. Payment', () => {
  it('getPayments fetches all', async () => {
    mockGasResponse({ success: true, payments: [] });
    const result = await api.getPayments();
    expect(Array.isArray(result)).toBe(true);
  });

  it('registerPayment registers', async () => {
    mockGasResponse({ success: true, id: 'PAY-001' });
    const result = await api.registerPayment('INV-001', {
      amount: 1500, paymentMethod: 'bank_transfer',
      paymentDate: '2026-07-22', reference: 'REF-001'
    });
    expect(result.success).toBe(true);
  });

  it('confirmPayment confirms', async () => {
    mockGasResponse({ success: true });
    const result = await api.confirmPayment('PAY-001');
    expect(result.success).toBe(true);
  });

  it('reconcilePayment reconciles', async () => {
    mockGasResponse({ success: true });
    const result = await api.reconcilePayment('PAY-001');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// N. EXPENSE
// ============================================================================
describe('N. Expense', () => {
  it('getExpenses fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getExpenses();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createExpense creates', async () => {
    mockGasResponse({ success: true, id: 'EXP-001' });
    const result = await api.createExpense('token', {
      ownerType: 'driver', ownerId: 'DRV-001', category: 'fuel',
      description: 'Fuel', amount: 50, expenseDate: '2026-07-22'
    });
    expect(result.success).toBe(true);
  });

  it('confirmExpense confirms', async () => {
    mockGasResponse({ success: true });
    const result = await api.confirmExpense('token', 'EXP-001');
    expect(result.success).toBe(true);
  });

  it('correctExpense corrects', async () => {
    mockGasResponse({ success: true, id: 'EXP-002' });
    const result = await api.correctExpense('EXP-001');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// O. DRIVER ADVANCE
// ============================================================================
describe('O. Driver Advance', () => {
  it('getDriverAdvances fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getDriverAdvances();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createDriverAdvance creates', async () => {
    mockGasResponse({ success: true, id: 'DA-001' });
    const result = await api.createDriverAdvance({
      driverId: 'DRV-001', amount: 200, projectId: 'PRJ-001', notes: 'Advance'
    });
    expect(result.success).toBe(true);
  });

  it('updateDriverAdvance updates', async () => {
    mockGasResponse({ success: true });
    const result = await api.updateDriverAdvance('DA-001', { amount: 250 });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// P. DRIVER REPORTS
// ============================================================================
describe('P. Driver Reports', () => {
  it('getDriverReports fetches all', async () => {
    mockGasResponse([]);
    const result = await api.getDriverReports();
    expect(Array.isArray(result)).toBe(true);
  });

  // createDriverReport does not exist as a standalone API function in api.ts
  // Driver reports are created via the backend directly

  it('approveDriverReport approves', async () => {
    mockGasResponse({ success: true });
    const result = await api.approveDriverReport('DRR-001');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Q. DRIVER LINKS
// ============================================================================
describe('Q. Driver Links', () => {
  it('generateDriverLink generates', async () => {
    mockGasResponse({
      token: 'dl-ta-abc',
      driverId: 'DRV-001', projectId: 'PRJ-001', date: '2026-07-22',
      status: 'ACTIVE', createdAt: '2026-07-22T00:00:00Z', expiresAt: '2026-07-23T00:00:00Z',
      link: 'https://example.com?token=dl-ta-abc'
    });
    const result = await api.generateDriverLink('DRV-001', 'PRJ-001', '2026-07-22', '2026-07-28');
    expect(result.token).toBe('dl-ta-abc');
  });

  it('getDriverLinks fetches', async () => {
    mockGasResponse([]);
    const result = await api.getDriverLinks();
    expect(Array.isArray(result)).toBe(true);
  });

  it('deactivateDriverLink deactivates', async () => {
    mockGasResponse({ success: true });
    const result = await api.deactivateDriverLink('token');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// R. CHANGES
// ============================================================================
describe('R. Changes', () => {
  it('getChanges fetches all', async () => {
    mockGasResponse({ success: true, changes: [] });
    const result = await api.getChanges();
    expect(result.success).toBe(true);
  });

  it('createChange creates', async () => {
    mockGasResponse({ success: true, id: 'CHG-001' });
    const result = await api.createChange({
      entityType: 'Service', entityId: 'SVC-001',
      type: 'modification', description: 'Test change'
    });
    expect(result.success).toBe(true);
  });

  it('resolveChange resolves', async () => {
    mockGasResponse({ success: true, change: { id: 'CHG-001', status: 'Resolved' } });
    const result = await api.resolveChange('CHG-001');
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// S. AUTH
// ============================================================================
describe('S. Auth', () => {
  it('loginUser logs in', async () => {
    mockGasResponse({ success: true, token: 'test-token', user: { username: 'admin', role: 'admin' } });
    const result = await api.loginUser('admin', 'password');
    expect(result.success).toBe(true);
    expect(result.token).toBe('test-token');
  });

  it('logoutUser logs out', async () => {
    mockGasResponse({ success: true });
    const result = await api.logoutUser('test-token');
    expect(result.success).toBe(true);
  });

  it('validateSession validates', async () => {
    mockGasResponse({ valid: true, user: { username: 'admin', role: 'admin' } });
    const result = await api.validateSession('test-token');
    expect(result.valid).toBe(true);
  });

  it('getUsers fetches all', async () => {
    mockGasResponse({ success: true, users: [] });
    const result = await api.getUsers('test-token');
    expect(result.success).toBe(true);
  });

  it('createUser creates', async () => {
    mockGasResponse({ success: true });
    const result = await api.createUser('test-token', {
      username: 'newuser', email: 'new@test.com',
      password: 'pass123', role: 'driver'
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// T. ACTIVITY FEED
// ============================================================================
describe('T. Activity Feed', () => {
  it('getActivityFeed fetches', async () => {
    mockGasResponse([]);
    const result = await api.getActivityFeed();
    expect(Array.isArray(result)).toBe(true);
  });

  it('getActivityFeed with limit', async () => {
    mockGasResponse([]);
    await api.getActivityFeed(10);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('limit=10');
  });
});

// ============================================================================
// U. AUDIT LOG
// ============================================================================
describe('U. Audit Log', () => {
  it('getAuditLog fetches', async () => {
    mockGasResponse([]);
    const result = await api.getAuditLog();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ============================================================================
// V. DASHBOARD
// ============================================================================
// Dashboard: getDashboard does not exist as a standalone function in api.ts
// Dashboard data is composed from other API calls

// ============================================================================
// W. WHATSAPP MESSAGES
// ============================================================================
describe('W. WhatsApp Messages', () => {
  it('buildDriverWhatsAppMessage builds message', () => {
    const msg = api.buildDriverWhatsAppMessage(
      'Marco',
      [{ id: '1', date: '2026-07-22', production: 'Movie Motion', vehicle: 'Van', driver: 'Marco', driverPhone: '', time: '09:00', from: 'Airport', to: 'Hotel', passengers: [], pickupLines: [], dropoffLines: [], flightInfo: '', notes: '', status: '', normalized: '', importId: '' }],
      'Jul 22'
    );
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe('string');
    expect(msg).toContain('Marco');
  });

  it('buildGroupWhatsAppMessage builds message', () => {
    const msg = api.buildGroupWhatsAppMessage(
      [{ id: '1', date: '2026-07-22', production: 'Movie Motion', vehicle: 'Van', driver: 'Marco', driverPhone: '', time: '09:00', from: 'Airport', to: 'Hotel', passengers: [], pickupLines: [], dropoffLines: [], flightInfo: '', notes: '', status: '', normalized: '', importId: '' }],
      'Jul 22',
      'Movie Motion'
    );
    expect(msg).toBeTruthy();
  });
});

// ============================================================================
// X. EXCEL IMPORT/EXPORT
// ============================================================================
describe('X. Excel Import/Export', () => {
  it('importTransportListWithProject imports', async () => {
    mockGasResponse({ success: true, importId: 'IMP-001' });
    const result = await api.importTransportListWithProject({
      services: [], importId: 'IMP-001', production: 'Movie Motion',
      projectName: 'Movie Motion', operatingCompany: 'TA'
    });
    expect(result.success).toBe(true);
  });

  it('autoDetectImportTargets detects', async () => {
    mockGasResponse({ client: { name: 'Movie Motion' }, project: { name: 'Movie Motion' }, clients: [], projects: [] });
    const result = await api.autoDetectImportTargets('Movie Motion');
    expect(result).toBeDefined();
    expect(result.client).toBeDefined();
  });
});

// ============================================================================
// Y. UTILITY FUNCTIONS
// ============================================================================
describe('Y. Utility Functions', () => {
  it('normalizeTransportService normalizes', () => {
    const result = api.normalizeTransportService({
      id: '1', date: '2026-07-22', production: 'Test'
    });
    expect(result.id).toBe('1');
    expect(result.production).toBe('Test');
  });

  it('normalizeTransportServices normalizes array', () => {
    const result = api.normalizeTransportServices([
      { id: '1', date: '2026-07-22' },
      { id: '2', date: '2026-07-23' }
    ]);
    expect(result).toHaveLength(2);
  });

  it('passengerDisplay joins names', () => {
    const result = api.passengerDisplay([
      { name: 'John', role: '' },
      { name: 'Jane', role: '' }
    ]);
    expect(result).toBe('John; Jane');
  });

  it('passengerRolesDisplay joins roles', () => {
    const result = api.passengerRolesDisplay([
      { name: 'John', role: 'Producer' },
      { name: 'Jane', role: 'Director' }
    ]);
    expect(result).toBe('Producer; Director');
  });

  it('hasPassengerRole checks roles', () => {
    expect(api.hasPassengerRole([{ name: 'John', role: 'Producer' }])).toBe(true);
    expect(api.hasPassengerRole([{ name: 'John', role: '' }])).toBe(false);
  });

  it('pickupDisplay joins lines', () => {
    expect(api.pickupDisplay(['A', 'B'])).toBe('A\nB');
  });

  it('dropoffDisplay joins lines', () => {
    expect(api.dropoffDisplay(['X', 'Y'])).toBe('X\nY');
  });
});

// ============================================================================
// Z. ERROR HANDLING
// ============================================================================
describe('Z. Error Handling', () => {
  it('throws on HTTP error', async () => {
    mockGasError(500, 'Internal Server Error');
    await expect(api.getServices()).rejects.toThrow('HTTP 500');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));
    await expect(api.getServices()).rejects.toThrow('Network failure');
  });
});
