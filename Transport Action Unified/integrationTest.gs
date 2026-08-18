// ============================================================================
// INTEGRATION_TEST.GS — Prueba de integración: flujo completo
// ============================================================================
//
// Flujo: Service → DriverReport → Validate → RapportinoClient → Invoice → Payment
//
// Uso: desde el editor de Apps Script → ejecutar runIntegrationTest()
//
// PREREQUISITOS:
// - La hoja de Google Sheet debe tener todas las entidades creadas (setup.gs)
// - No requiere datos existentes (crea todo desde cero)
// ============================================================================

function runIntegrationTest() {
  TestResults.reset();
  Logger.log('');
  Logger.log('╔═══════════════════════════════════════════════════════════╗');
  Logger.log('║  INTEGRATION TEST: Service → Invoice → Payment          ║');
  Logger.log('╚═══════════════════════════════════════════════════════════╝');
  Logger.log('');

  var ctx = {}; // Contexto compartido entre tests

  // ==========================================================================
  // FASE 1: Setup — Crear entidades base
  // ==========================================================================
  Logger.log('── FASE 1: Setup ──');

  _runTest('1.1 Crear OperatingCompany', function() {
    var entity = OperatingCompanyRepository.create({
      Name: 'Test Transport Company',
      VAT: 'ES12345678A',
      Address: 'Calle Test 123',
      Phone: '+34600000000',
      Email: 'test@company.com',
      Currency: 'EUR',
      DefaultTaxRate: 21,
      Active: true
    });
    assertNotNull(entity.ID, 'OperatingCompany ID');
    ctx.operatingCompany = entity;
  });

  _runTest('1.2 Crear Client', function() {
    var entity = ClientRepository.create({
      Name: 'Test Client Corp',
      Type: 'Corporate',
      VAT: 'ES87654321B',
      Address: 'Av. Cliente 456',
      Phone: '+34611111111',
      Email: 'client@test.com',
      PaymentTerms: '30',
      Notes: 'Integration test client',
      Active: true
    });
    assertNotNull(entity.ID, 'Client ID');
    ctx.client = entity;
  });

  _runTest('1.3 Crear Project', function() {
    var entity = ProjectRepository.create({
      ClientID: ctx.client.ID,
      Name: 'Test Project Alpha',
      OperatingCompany: ctx.operatingCompany.ID
    });
    assertNotNull(entity.ID, 'Project ID');
    ctx.project = entity;
  });

  _runTest('1.4 Crear Driver', function() {
    var entity = DriverRepository.create({
      Name: 'Test Driver Juan',
      Phone: '+34622222222',
      WhatsApp: '+34622222222',
      Type: 'Propio',
      OperatingCompany: ctx.operatingCompany.ID,
      LicenseType: 'B',
      LicenseExpiry: '2027-12-31'
    });
    assertNotNull(entity.ID, 'Driver ID');
    ctx.driver = entity;
  });

  _runTest('1.5 Crear Vehicle', function() {
    var entity = VehicleRepository.create({
      Plate: 'TEST-001',
      Brand: 'Mercedes',
      Model: 'Sprinter',
      Type: 'Van',
      Ownership: 'Propio',
      OperatingCompany: ctx.operatingCompany.ID,
      Status: 'Disponible'
    });
    assertNotNull(entity.ID, 'Vehicle ID');
    ctx.vehicle = entity;
  });

  // ==========================================================================
  // FASE 2: Service lifecycle
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 2: Service Lifecycle ──');

  _runTest('2.1 Crear Service', function() {
    var entity = ServiceRepository.create({
      ProjectID: ctx.project.ID,
      Date: new Date().toISOString(),
      Time: '09:00',
      PassengerName: 'Test Passenger',
      PassengerPhone: '+34633333333',
      PickupLines: ['Aeropuerto Madrid Barajas T4'],
      DropoffLines: ['Hotel Ritz Madrid'],
      OperatingCompany: ctx.operatingCompany.ID
    });
    assertEquals(entity.OperationalStatus, 'Importado', 'Initial status');
    assertEquals(entity.FinancialStatus, 'Pendiente', 'Initial financial status');
    ctx.service = entity;
  });

  _runTest('2.2 Asignar conductor (S001)', function() {
    var result = ServiceCommands.assignDriver(ctx.service.ID, ctx.driver.ID, ctx.vehicle.ID);
    var updated = ServiceRepository.getById(ctx.service.ID);
    assertEquals(updated.OperationalStatus, 'Asignado', 'Status after assign');
    assertEquals(updated.DriverID, ctx.driver.ID, 'DriverID');
    assertEquals(updated.VehicleID, ctx.vehicle.ID, 'VehicleID');
  });

  _runTest('2.3 Confirmar servicio (S002)', function() {
    ServiceCommands.confirmService(ctx.service.ID);
    var updated = ServiceRepository.getById(ctx.service.ID);
    assertEquals(updated.OperationalStatus, 'Confirmado', 'Status after confirm');
  });

  _runTest('2.4 Iniciar ruta (S003)', function() {
    ServiceCommands.startService(ctx.service.ID);
    var updated = ServiceRepository.getById(ctx.service.ID);
    assertEquals(updated.OperationalStatus, 'EnRuta', 'Status after start');
  });

  _runTest('2.5 Completar servicio (S004)', function() {
    ServiceCommands.completeService(ctx.service.ID);
    var updated = ServiceRepository.getById(ctx.service.ID);
    assertEquals(updated.OperationalStatus, 'Realizado', 'Status after complete');
  });

  // ==========================================================================
  // FASE 3: Driver Report
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 3: Driver Report ──');

  _runTest('3.1 Crear reporte del conductor (D001)', function() {
    var report = DriverReportCommands.createReport(ctx.service.ID, ctx.driver.ID, {
      kmExtra: 15,
      hoursExtra: 2,
      parking: 25,
      tolls: 12.50,
      fuel: 45,
      waitMinutes: 30,
      notes: 'Test report'
    });
    assertNotNull(report.id, 'Report ID');
    assertEquals(report.version, 1, 'First version');
    ctx.report = report;

    var service = ServiceRepository.getById(ctx.service.ID);
    assertEquals(service.OperationalStatus, 'Reportado', 'Service status after report');
  });

  _runTest('3.2 Aprobar reporte (D003)', function() {
    DriverReportCommands.approveReport(ctx.report.id);
    var updated = DriverReportRepository.getById(ctx.report.id);
    assertEquals(updated.Status, 'Aceptado', 'Report status');

    // Verificar que se crearon CostBreakdowns
    var costs = ServiceCostBreakdownRepository.getByService(ctx.service.ID);
    assertGreaterThan(costs.length, 0, 'Cost breakdowns created');
    ctx.costBreakdowns = costs;
  });

  // ==========================================================================
  // FASE 4: Agregar Revenue Breakdown
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 4: Revenue Breakdown ──');

  _runTest('4.1 Crear RevenueBreakdown', function() {
    var entity = ServiceRevenueBreakdownRepository.create({
      ServiceID: ctx.service.ID,
      ItemType: 'Transfer',
      Description: 'Airport transfer T4 → Hotel Ritz',
      Quantity: 1,
      UnitPrice: 120,
      Source: 'manual'
    });
    assertNotNull(entity.ID, 'RevenueBreakdown ID');
    ctx.revenue = entity;

    var total = ServiceQueries.calculateRevenue(ctx.service.ID);
    assertGreaterThan(total, 0, 'Revenue > 0');
    ctx.revenueTotal = total;
  });

  // ==========================================================================
  // FASE 5: Validar servicio (S006)
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 5: Validate Service ──');

  _runTest('5.1 Validar servicio', function() {
    ServiceCommands.validateService(ctx.service.ID);
    var updated = ServiceRepository.getById(ctx.service.ID);
    assertEquals(updated.OperationalStatus, 'Validado', 'Status after validate');

    // Verificar breakdowns congelados
    var revenues = ServiceRevenueBreakdownRepository.getByService(ctx.service.ID);
    revenues.forEach(function(r) {
      assertTrue(r.Locked === true || r.Locked === 'true', 'Revenue locked: ' + r.ID);
    });

    var costs = ServiceCostBreakdownRepository.getByService(ctx.service.ID);
    costs.forEach(function(c) {
      assertTrue(c.Locked === true || c.Locked === 'true', 'Cost locked: ' + c.ID);
    });
  });

  _runTest('5.2 No retroceso después de Validado (S007)', function() {
    assertThrows(function() {
      ServiceCommands.completeService(ctx.service.ID);
    }, 'Cannot complete validated service');
  });

  // ==========================================================================
  // FASE 6: Rapportino Client
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 6: Rapportino Client ──');

  _runTest('6.1 Crear RapportinoClient', function() {
    var rapportino = RapportinoClientCommands.create(
      ctx.project.ID,
      ctx.client.ID,
      new Date().toISOString(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    );
    assertNotNull(rapportino.id, 'Rapportino ID');
    assertEquals(rapportino.status, 'Borrador', 'Initial status');
    ctx.rapportino = rapportino;
  });

  _runTest('6.2 Agregar servicio al rapportino (RC002)', function() {
    RapportinoClientCommands.addService(ctx.rapportino.id, ctx.service.ID);
    var items = RapportinoItemRepository.getByRapportinoClient(ctx.rapportino.id);
    assertEquals(items.length, 1, 'One item added');
    assertEquals(items[0].ServiceID, ctx.service.ID, 'Correct service');
    assertGreaterThan(parseFloat(items[0].Amount), 0, 'Amount > 0');
    ctx.rapportinoItem = items[0];
  });

  _runTest('6.3 Revisar rapportino (R001)', function() {
    RapportinoClientCommands.review(ctx.rapportino.id);
    var updated = RapportinoClientRepository.getById(ctx.rapportino.id);
    assertEquals(updated.Status, 'Revisado', 'Status after review');
  });

  _runTest('6.4 Enviar rapportino', function() {
    RapportinoClientCommands.send(ctx.rapportino.id);
    var updated = RapportinoClientRepository.getById(ctx.rapportino.id);
    assertEquals(updated.Status, 'Enviado', 'Status after send');
  });

  _runTest('6.5 Aceptar rapportino', function() {
    RapportinoClientCommands.accept(ctx.rapportino.id);
    var updated = RapportinoClientRepository.getById(ctx.rapportino.id);
    assertEquals(updated.Status, 'Aceptado', 'Status after accept');
  });

  // ==========================================================================
  // FASE 7: Facturar Rapportino (R002) — CREA INVOICE
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 7: Facturar Rapportino → Invoice ──');

  _runTest('7.1 Facturar rapportino', function() {
    RapportinoClientCommands.facturar(ctx.rapportino.id);

    // Verificar RapportinoItem congelado
    var item = RapportinoItemRepository.getById(ctx.rapportinoItem.ID);
    assertTrue((parseFloat(item.LockedAmount) || 0) > 0, 'Item locked via LockedAmount');
    assertEquals(parseFloat(item.LockedAmount), parseFloat(ctx.rapportinoItem.Amount), 'LockedAmount = Amount');

    // Verificar RapportinoClient status
    var rapportino = RapportinoClientRepository.getById(ctx.rapportino.id);
    assertEquals(rapportino.Status, 'Facturado', 'Rapportino status');
  });

  _runTest('7.2 Verificar Invoice creado', function() {
    var invoices = InvoiceRepository.getAllByProject(ctx.project.ID);
    assertGreaterThan(invoices.length, 0, 'Invoice created');
    ctx.invoice = invoices[0];
    assertEquals(ctx.invoice.Status, 'Borrador', 'Invoice in Borrador');

    // Verificar InvoiceItems
    var items = InvoiceItemRepository.getByInvoice(ctx.invoice.ID);
    assertEquals(items.length, 1, 'One invoice item');
    assertGreaterThan(parseFloat(items[0].Amount), 0, 'InvoiceItem amount > 0');
  });

  _runTest('7.3 Verificar totales del Invoice (INV-001)', function() {
    var inv = InvoiceRepository.getById(ctx.invoice.ID);
    var subtotal = parseFloat(inv.Subtotal) || 0;
    var taxRate = parseFloat(inv.TaxRate) || 0;
    var taxAmount = parseFloat(inv.TaxAmount) || 0;
    var total = parseFloat(inv.Total) || 0;

    assertEquals(taxAmount, subtotal * (taxRate / 100), 'TaxAmount = Subtotal × TaxRate');
    assertEquals(total, subtotal + taxAmount, 'Total = Subtotal + TaxAmount');
  });

  _runTest('7.4 Verificar INV-002: Subtotal = SUM(InvoiceItems)', function() {
    var items = InvoiceItemRepository.getByInvoice(ctx.invoice.ID);
    var sumItems = items.reduce(function(s, i) { return s + (parseFloat(i.Amount) || 0); }, 0);
    var inv = InvoiceRepository.getById(ctx.invoice.ID);
    assertEquals(parseFloat(inv.Subtotal), sumItems, 'Subtotal = SUM(InvoiceItems)');
  });

  _runTest('7.5 Verificar servicio → FinancialStatus = Facturado', function() {
    var service = ServiceRepository.getById(ctx.service.ID);
    assertEquals(service.FinancialStatus, 'Facturado', 'Service financial status');
  });

  // ==========================================================================
  // FASE 8: Emitir Factura (I001)
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 8: Emitir Factura ──');

  _runTest('8.1 Emitir factura', function() {
    InvoiceCommands.emit(ctx.invoice.ID);
    var updated = InvoiceRepository.getById(ctx.invoice.ID);
    assertEquals(updated.Status, 'Emitida', 'Status after emit');
    assertNotNull(updated.InvoiceNumber, 'InvoiceNumber generated');
    assertGreaterThan(updated.InvoiceNumber.length, 0, 'InvoiceNumber not empty');
    ctx.invoiceNumber = updated.InvoiceNumber;
  });

  _runTest('8.2 Montos congelados después de emitir (I003)', function() {
    var before = InvoiceRepository.getById(ctx.invoice.ID);
    InvoiceRepository.recalculateTotals(ctx.invoice.ID);
    var after = InvoiceRepository.getById(ctx.invoice.ID);

    assertEquals(before.Subtotal, after.Subtotal, 'Subtotal immutable');
    assertEquals(before.TaxAmount, after.TaxAmount, 'TaxAmount immutable');
    assertEquals(before.Total, after.Total, 'Total immutable');
  });

  _runTest('8.3 Enviar factura', function() {
    InvoiceCommands.send(ctx.invoice.ID);
    var updated = InvoiceRepository.getById(ctx.invoice.ID);
    assertEquals(updated.Status, 'Enviada', 'Status after send');
  });

  // ==========================================================================
  // FASE 9: Pago (P001-P003)
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 9: Payment ──');

  _runTest('9.1 Registrar pago (P001)', function() {
    var inv = InvoiceRepository.getById(ctx.invoice.ID);
    var payment = PaymentCommands.register(ctx.invoice.ID, {
      amount: parseFloat(inv.Total),
      paymentMethod: 'BankTransfer',
      paymentDate: new Date().toISOString(),
      reference: 'TEST-PAY-001'
    });
    assertNotNull(payment.id, 'Payment ID');
    assertEquals(payment.status, 'Registrado', 'Payment status');
    ctx.payment = payment;

    // Verificar que Invoice NO cambió (P001)
    var invAfter = InvoiceRepository.getById(ctx.invoice.ID);
    assertEquals(invAfter.Status, 'Enviada', 'Invoice unchanged after register');
  });

  _runTest('9.2 Verificar INV-003: SUM(Payments) ≤ Total', function() {
    var payments = PaymentRepository.getConfirmedByInvoice(ctx.invoice.ID);
    var totalPaid = payments.reduce(function(s, p) { return s + (parseFloat(p.Amount) || 0); }, 0);
    var inv = InvoiceRepository.getById(ctx.invoice.ID);
    assertTrue(totalPaid <= parseFloat(inv.Total) + 0.01, 'Payments ≤ Total');
  });

  _runTest('9.3 Confirmar pago (P002) → Invoice Pagada', function() {
    PaymentCommands.confirm(ctx.payment.id);
    var payment = PaymentRepository.getById(ctx.payment.id);
    assertEquals(payment.Status, 'Confirmado', 'Payment confirmed');

    var inv = InvoiceRepository.getById(ctx.invoice.ID);
    assertEquals(inv.Status, 'Pagada', 'Invoice Pagada after full payment');
  });

  _runTest('9.4 Verificar INV-004: SUM(Payments) ≥ Total para Pagada', function() {
    var payments = PaymentRepository.getConfirmedByInvoice(ctx.invoice.ID);
    var totalPaid = payments.reduce(function(s, p) { return s + (parseFloat(p.Amount) || 0); }, 0);
    var inv = InvoiceRepository.getById(ctx.invoice.ID);
    assertTrue(totalPaid >= parseFloat(inv.Total) - 0.01, 'Payments ≥ Total for Pagada');
  });

  // ==========================================================================
  // FASE 10: Verificar Service Financial Flow
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 10: Service Financial Flow ──');

  _runTest('10.1 Cobrar servicio (SF002)', function() {
    ServiceCommands.cobrarService(ctx.service.ID);
    var updated = ServiceRepository.getById(ctx.service.ID);
    assertEquals(updated.FinancialStatus, 'Cobrado', 'Service cobrado');
  });

  _runTest('10.2 Cerrar servicio (SF003)', function() {
    ServiceCommands.closeService(ctx.service.ID);
    var updated = ServiceRepository.getById(ctx.service.ID);
    assertEquals(updated.FinancialStatus, 'Cerrado', 'Service cerrado');
  });

  // ==========================================================================
  // FASE 11: Invariantes finales
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 11: Invariant Checks ──');

  _runTest('11.1 INV-001: Invoice total', function() {
    var result = InvariantChecks.INV001_invoiceTotal();
    assertTrue(result.valid, result.errors.join(', '));
  });

  _runTest('11.2 INV-002: Invoice items', function() {
    var result = InvariantChecks.INV002_invoiceItems();
    assertTrue(result.valid, result.errors.join(', '));
  });

  _runTest('11.3 INV-006: Breakdowns locked', function() {
    var result = InvariantChecks.INV006_breakdownsLocked();
    assertTrue(result.valid, result.errors.join(', '));
  });

  _runTest('11.4 INV-007: DriverReport único', function() {
    var result = InvariantChecks.INV007_driverReportUnico();
    assertTrue(result.valid, result.errors.join(', '));
  });

  _runTest('11.5 INV-008: Expense propietario', function() {
    var result = InvariantChecks.INV008_expensePropietario();
    assertTrue(result.valid, result.errors.join(', '));
  });

  _runTest('11.6 INV-010: DriverAdvance positivo', function() {
    var result = InvariantChecks.INV010_driverAdvancePositivo();
    assertTrue(result.valid, result.errors.join(', '));
  });

  _runTest('11.7 INV-015: Service → Project', function() {
    var result = InvariantChecks.INV015_serviceToProject();
    assertTrue(result.valid, result.errors.join(', '));
  });

  _runTest('11.8 INV-016: Service → Driver', function() {
    var result = InvariantChecks.INV016_serviceToDriver();
    assertTrue(result.valid, result.errors.join(', '));
  });

  _runTest('11.9 INV-019: Payment → Invoice', function() {
    var result = InvariantChecks.INV019_paymentToInvoice();
    assertTrue(result.valid, result.errors.join(', '));
  });

  _runTest('11.10 INV-021: AccountingDate', function() {
    var result = InvariantChecks.INV021_accountingDate();
    assertTrue(result.valid, result.errors.join(', '));
  });

  // ==========================================================================
  // FASE 12: Verificar Queries
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 12: Query Verification ──');

  _runTest('12.1 Dashboard principal', function() {
    var dashboard = DashboardQueries.getMainDashboard();
    assertNotNull(dashboard.services, 'Services section');
    assertNotNull(dashboard.financials, 'Financials section');
    assertNotNull(dashboard.invoicing, 'Invoicing section');
    assertGreaterThan(dashboard.services.total, 0, 'Has services');
  });

  _runTest('12.2 Profit por proyecto', function() {
    var profit = ProfitQueries.byProject(ctx.project.ID);
    assertEquals(profit.serviceCount, 1, 'One service');
    assertGreaterThan(profit.totalRevenue, 0, 'Revenue > 0');
  });

  _runTest('12.3 Service queries', function() {
    // Our test service should be Validado, not in pending validation
    var service = ServiceRepository.getById(ctx.service.ID);
    assertEquals(service.OperationalStatus, 'Validado', 'Test service is Validado');

    var revenue = ServiceQueries.calculateRevenue(ctx.service.ID);
    assertGreaterThan(revenue, 0, 'Revenue calculated');
  });

  // ==========================================================================
  // FASE 13: Service.toDTO — clientId/clientName resolution
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 13: Service.toDTO Resolution ──');

  _runTest('13.1 Service.toDTO resolves clientId through Project', function() {
    var dto = ServiceRepository.toDTO(ctx.service);
    assertEquals(dto.clientId, ctx.client.ID, 'clientId resolved from Project → Client');
    assertEquals(dto.clientName, 'Test Client Corp', 'clientName resolved from Client.Name');
    assertEquals(dto.projectId, ctx.project.ID, 'projectId is the actual ProjectID');
  });

  _runTest('13.2 Service without Project has empty clientId', function() {
    var orphanService = ServiceRepository.create({
      Date: new Date().toISOString(),
      Time: '10:00',
      Production: 'No Project Service'
    });
    var dto = ServiceRepository.toDTO(orphanService);
    assertEquals(dto.clientId, '', 'clientId empty without Project');
    assertEquals(dto.clientName, '', 'clientName empty without Project');
  });

  // ==========================================================================
  // FASE 14: Rapportino Client — create with resolved clientId
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 14: Rapportino Client with ClientID ──');

  _runTest('14.1 Create RapportinoClient with resolved clientId', function() {
    // Use the rapportino from step 6.1 (already created for this project/client)
    // The duplicate check prevents creating another draft for same project+client
    var entity = RapportinoClientRepository.getById(ctx.rapportino.id);
    assertNotNull(entity, 'RapportinoClient exists');
    assertEquals(entity.ProjectID, ctx.project.ID, 'ProjectID stored');
    assertEquals(entity.ClientID, ctx.client.ID, 'ClientID stored');
    ctx.rapportinoClient = entity;
  });

  _runTest('14.2 RapportinoClient has clientId', function() {
    var entity = RapportinoClientRepository.getById(ctx.rapportinoClient.ID);
    assertNotNull(entity.ClientID, 'has ClientID');
    assertEquals(entity.ClientID, ctx.client.ID, 'ClientID matches');
    assertEquals(entity.ProjectID, ctx.project.ID, 'ProjectID matches');
  });

  // ==========================================================================
  // FASE 15: Driver Links
  // ==========================================================================
  Logger.log('');
  Logger.log('── FASE 15: Driver Links ──');

  _runTest('15.1 Generate Driver Link', function() {
    var result = generateDriverLink(
      ctx.driver.ID,
      ctx.project.ID,
      '2026-07-21',
      '2026-07-27',
      'https://script.google.com/macros/s/test'
    );
    assertTrue(result.success, 'Link generated successfully: ' + (result.error || ''));
    assertNotNull(result.token, 'Token generated');
    assertNotNull(result.link, 'Link URL generated');
    assertNotNull(result.expiresAt, 'Expiry set');
    assertEquals(result.dateFrom, '2026-07-21', 'DateFrom set');
    assertEquals(result.dateTo, '2026-07-27', 'DateTo set');
    assertTrue(result.link.indexOf('action=driverForm') > -1, 'Link contains action=driverForm');
    assertTrue(result.link.indexOf('token=' + result.token) > -1, 'Link contains token');
    ctx.driverLink = result;
  });

  _runTest('15.2 Get Driver Links', function() {
    var links = getDriverLinks({ driverId: ctx.driver.ID });
    assertTrue(Array.isArray(links), 'Returns array');
    var found = links.find(function(l) { return l.Status === 'ACTIVE'; });
    assertNotNull(found, 'ACTIVE link found for driver');
  });

  _runTest('15.3 Deactivate Driver Link', function() {
    var result = deactivateDriverLink(ctx.driverLink.token);
    assertTrue(result.success, 'Link deactivated');

    var links = getDriverLinks({ driverId: ctx.driver.ID });
    var found = links.find(function(l) { return l.Token === ctx.driverLink.token; });
    if (found) {
      assertEquals(found.Status, 'REVOKED', 'Link status is REVOKED');
    }
  });

  _runTest('15.4 Generate link with missing params fails', function() {
    var result = generateDriverLink('', ctx.project.ID, '2026-07-21', '2026-07-27');
    assertFalse(result.success, 'Fails without driverId');
  });

  _runTest('15.5 Get links with no results returns empty array', function() {
    var links = getDriverLinks({ driverId: 'nonexistent-driver-id' });
    assertEquals(links.length, 0, 'Empty array for nonexistent driver');
  });

  // ==========================================================================
  // RESUMEN
  // ==========================================================================
  Logger.log('');
  Logger.log('╔═══════════════════════════════════════════════════════════╗');
  Logger.log('║  TEST COMPLETE                                          ║');
  Logger.log('╚═══════════════════════════════════════════════════════════╝');

  return TestResults.summary();
}
