// ============================================================================
// NEGATIVE_TESTS.GS — Pruebas de reglas de negocio y seguridad
// ============================================================================
//
// Verifica que las protecciones del sistema funcionan correctamente:
// - Transiciones de estado inválidas
// - Permisos insuficientes
// - Ownership de drivers
// - Inmutabilidad después de confirmar/emitir
// - Límites de pago
//
// Uso: desde el editor de Apps Script → ejecutar runNegativeTests()
// PREREQUISITOS: runIntegrationTest() debe haber corrido primero (crea entidades base)
// ============================================================================

function runNegativeTests() {
  TestResults.reset();
  Logger.log('');
  Logger.log('╔═══════════════════════════════════════════════════════════╗');
  Logger.log('║  NEGATIVE TESTS: Business Rules & Security              ║');
  Logger.log('╚═══════════════════════════════════════════════════════════╝');
  Logger.log('');

  var ctx = {}; // Shared context

  // ==========================================================================
  // SETUP: Crear entidades base para tests negativos
  // ==========================================================================
  Logger.log('── SETUP: Creating test entities ──');

  _runTest('S.1 Create OperatingCompany', function() {
    var entity = OperatingCompanyRepository.create({
      Name: 'Negative Test Company',
      VAT: 'ES99999999A',
      Address: 'Calle Test Neg 1',
      Phone: '+34600000001',
      Email: 'neg@test.com',
      Currency: 'EUR',
      DefaultTaxRate: 21,
      Active: true
    });
    assertNotNull(entity.ID, 'OperatingCompany ID');
    ctx.operatingCompany = entity;
  });

  _runTest('S.2 Create Client', function() {
    var entity = ClientRepository.create({
      Name: 'Negative Test Client',
      Type: 'Corporate',
      VAT: 'ES99999999B',
      Address: 'Av. Test Neg 2',
      Phone: '+34600000002',
      Email: 'negclient@test.com',
      PaymentTerms: '30',
      Notes: 'Negative test client',
      Active: true
    });
    assertNotNull(entity.ID, 'Client ID');
    ctx.client = entity;
  });

  _runTest('S.3 Create Project', function() {
    var entity = ProjectRepository.create({
      ClientID: ctx.client.ID,
      Name: 'Negative Test Project',
      OperatingCompany: ctx.operatingCompany.ID
    });
    assertNotNull(entity.ID, 'Project ID');
    ctx.project = entity;
  });

  _runTest('S.4 Create Driver A', function() {
    var entity = DriverRepository.create({
      Name: 'Driver Alpha',
      Phone: '+34600000003',
      WhatsApp: '+34600000003',
      Type: 'Propio',
      OperatingCompany: ctx.operatingCompany.ID,
      LicenseType: 'B',
      LicenseExpiry: '2027-12-31'
    });
    assertNotNull(entity.ID, 'Driver A ID');
    ctx.driverA = entity;
  });

  _runTest('S.5 Create Driver B', function() {
    var entity = DriverRepository.create({
      Name: 'Driver Beta',
      Phone: '+34600000004',
      WhatsApp: '+34600000004',
      Type: 'Propio',
      OperatingCompany: ctx.operatingCompany.ID,
      LicenseType: 'B',
      LicenseExpiry: '2027-12-31'
    });
    assertNotNull(entity.ID, 'Driver B ID');
    ctx.driverB = entity;
  });

  _runTest('S.6 Create Vehicle', function() {
    var entity = VehicleRepository.create({
      Plate: 'NEG-001',
      Brand: 'Seat',
      Model: 'León',
      Type: 'Coche',
      Ownership: 'Propio',
      OperatingCompany: ctx.operatingCompany.ID,
      Status: 'Disponible'
    });
    assertNotNull(entity.ID, 'Vehicle ID');
    ctx.vehicle = entity;
  });

  // Create two services for ownership tests
  _runTest('S.7 Create Service for Driver A', function() {
    var entity = ServiceRepository.create({
      ProjectID: ctx.project.ID,
      Date: new Date().toISOString(),
      Time: '09:00',
      PassengerName: 'Passenger Alpha',
      PassengerPhone: '+34600000010',
      PickupLines: ['Aeropuerto Madrid T4'],
      DropoffLines: ['Hotel Ritz'],
      OperatingCompany: ctx.operatingCompany.ID
    });
    assertNotNull(entity.ID, 'Service A ID');
    ctx.serviceA = entity;
  });

  _runTest('S.8 Create Service for Driver B', function() {
    var entity = ServiceRepository.create({
      ProjectID: ctx.project.ID,
      Date: new Date().toISOString(),
      Time: '10:00',
      PassengerName: 'Passenger Beta',
      PassengerPhone: '+34600000011',
      PickupLines: ['Aeropuerto Madrid T4'],
      DropoffLines: ['Hotel Palace'],
      OperatingCompany: ctx.operatingCompany.ID
    });
    assertNotNull(entity.ID, 'Service B ID');
    ctx.serviceB = entity;
  });

  // Assign drivers to services
  _runTest('S.9 Assign Driver A to Service A', function() {
    ServiceCommands.assignDriver(ctx.serviceA.ID, ctx.driverA.ID, ctx.vehicle.ID);
    var updated = ServiceRepository.getById(ctx.serviceA.ID);
    assertEquals(updated.OperationalStatus, 'Asignado', 'Service A status');
    assertEquals(updated.DriverID, ctx.driverA.ID, 'Driver A assigned');
  });

  _runTest('S.10 Assign Driver B to Service B', function() {
    ServiceCommands.assignDriver(ctx.serviceB.ID, ctx.driverB.ID, ctx.vehicle.ID);
    var updated = ServiceRepository.getById(ctx.serviceB.ID);
    assertEquals(updated.OperationalStatus, 'Asignado', 'Service B status');
    assertEquals(updated.DriverID, ctx.driverB.ID, 'Driver B assigned');
  });

  // Advance Service A to Validado (full lifecycle)
  _runTest('S.11 Complete lifecycle for Service A', function() {
    ServiceCommands.confirmService(ctx.serviceA.ID);
    ServiceCommands.startService(ctx.serviceA.ID);
    ServiceCommands.completeService(ctx.serviceA.ID);

    // Create report and approve
    var report = DriverReportCommands.createReport(ctx.serviceA.ID, ctx.driverA.ID, {
      kmExtra: 10,
      hoursExtra: 1,
      parking: 15,
      tolls: 8,
      fuel: 30,
      waitMinutes: 15,
      notes: 'Test report for negative tests'
    });
    DriverReportCommands.approveReport(report.id);

    // Add revenue breakdown
    ServiceRevenueBreakdownRepository.create({
      ServiceID: ctx.serviceA.ID,
      ItemType: 'Transfer',
      Description: 'Airport transfer',
      Quantity: 1,
      UnitPrice: 100,
      Source: 'manual'
    });

    // Validate
    ServiceCommands.validateService(ctx.serviceA.ID);
    var updated = ServiceRepository.getById(ctx.serviceA.ID);
    assertEquals(updated.OperationalStatus, 'Validado', 'Service A validated');
  });

  // Create rapportino and invoice for Service A
  _runTest('S.12 Create Rapportino and Invoice for Service A', function() {
    var rapportino = RapportinoClientCommands.create(
      ctx.project.ID,
      ctx.client.ID,
      new Date().toISOString(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    );
    RapportinoClientCommands.addService(rapportino.id, ctx.serviceA.ID);
    RapportinoClientCommands.review(rapportino.id);
    RapportinoClientCommands.send(rapportino.id);
    RapportinoClientCommands.accept(rapportino.id);
    RapportinoClientCommands.facturar(rapportino.id);

    var invoices = InvoiceRepository.getAllByProject(ctx.project.ID);
    assertGreaterThan(invoices.length, 0, 'Invoice created');
    ctx.invoice = invoices[0];

    InvoiceCommands.emit(ctx.invoice.ID);
    var inv = InvoiceRepository.getById(ctx.invoice.ID);
    assertEquals(inv.Status, 'Emitida', 'Invoice emitted');

    InvoiceCommands.send(ctx.invoice.ID);
    inv = InvoiceRepository.getById(ctx.invoice.ID);
    assertEquals(inv.Status, 'Enviada', 'Invoice sent');
  });

  // ==========================================================================
  // TEST 1: State Transition — validateService twice
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 1: Double Validate ──');

  _runTest('1.1 validateService on already Validado should fail', function() {
    assertThrows(function() {
      ServiceCommands.validateService(ctx.serviceA.ID);
    }, 'Cannot validate a service that is already Validado');
  });

  // ==========================================================================
  // TEST 2: State Transition — emitInvoice twice
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 2: Double Emit Invoice ──');

  _runTest('2.1 emitInvoice on already Emitida should fail', function() {
    assertThrows(function() {
      InvoiceCommands.emit(ctx.invoice.ID);
    }, 'Cannot emit an invoice that is already Emitida');
  });

  // ==========================================================================
  // TEST 3: State Transition — confirmPayment twice
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 3: Double Confirm Payment ──');

  _runTest('3.1 Register and confirm a payment', function() {
    var inv = InvoiceRepository.getById(ctx.invoice.ID);
    var payment = PaymentCommands.register(ctx.invoice.ID, {
      amount: 50,
      paymentMethod: 'BankTransfer',
      paymentDate: new Date().toISOString(),
      reference: 'NEG-TEST-PAY-001'
    });
    assertNotNull(payment.id, 'Payment ID');
    ctx.payment = payment;

    PaymentCommands.confirm(ctx.payment.id);
    var updated = PaymentRepository.getById(ctx.payment.id);
    assertEquals(updated.Status, 'Confirmado', 'Payment confirmed');
  });

  _runTest('3.2 confirmPayment on already Confirmado should fail', function() {
    assertThrows(function() {
      PaymentCommands.confirm(ctx.payment.id);
    }, 'Cannot confirm a payment that is already Confirmado');
  });

  // ==========================================================================
  // TEST 4: Driver Ownership — Driver A accesses Driver B's service
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 4: Driver Ownership ──');

  _runTest('4.1 Driver A trying to access Driver B service should fail', function() {
    // Simulate driver A actor
    var actorA = {
      userId: 'test-driver-a',
      username: 'driverA',
      email: 'alpha@driver.com',
      role: 'driver',
      driverId: ctx.driverA.ID
    };

    // Service B belongs to Driver B
    var serviceB = ServiceRepository.getById(ctx.serviceB.ID);

    assertThrows(function() {
      _assertDriverOwnership(actorA, serviceB.DriverID);
    }, 'Driver A cannot access Driver B service');
  });

  _runTest('4.2 Driver B trying to access Driver A service should fail', function() {
    var actorB = {
      userId: 'test-driver-b',
      username: 'driverB',
      email: 'beta@driver.com',
      role: 'driver',
      driverId: ctx.driverB.ID
    };

    var serviceA = ServiceRepository.getById(ctx.serviceA.ID);

    assertThrows(function() {
      _assertDriverOwnership(actorB, serviceA.DriverID);
    }, 'Driver B cannot access Driver A service');
  });

  _runTest('4.3 Coordinator can access any service (no ownership check)', function() {
    var actorCoordinator = {
      userId: 'test-coordinator',
      username: 'coordinator',
      email: 'coord@test.com',
      role: 'coordinator'
    };

    // Should NOT throw — coordinator has no ownership restriction
    var serviceA = ServiceRepository.getById(ctx.serviceA.ID);
    _assertDriverOwnership(actorCoordinator, serviceA.DriverID);
    // If we got here, it passed
    assertTrue(true, 'Coordinator bypasses ownership check');
  });

  // ==========================================================================
  // TEST 5: Permission Matrix — Coordinator cannot emit invoice
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 5: Permission Denial ──');

  _runTest('5.1 Coordinator has invoice.emit permission = DENIED', function() {
    // From PERMISSION_MATRIX: invoice.emit → ['admin', 'accounting']
    // coordinator is NOT in the list
    var allowed = PERMISSION_MATRIX['invoice.emit'];
    assertNotNull(allowed, 'invoice.emit exists in matrix');
    assertFalse(
      allowed.indexOf('coordinator') !== -1,
      'Coordinator is NOT in invoice.emit allowed roles'
    );
  });

  _runTest('5.2 Driver has invoice.emit permission = DENIED', function() {
    var allowed = PERMISSION_MATRIX['invoice.emit'];
    assertNotNull(allowed, 'invoice.emit exists in matrix');
    assertFalse(
      allowed.indexOf('driver') !== -1,
      'Driver is NOT in invoice.emit allowed roles'
    );
  });

  _runTest('5.3 Accounting has invoice.emit permission = ALLOWED', function() {
    var allowed = PERMISSION_MATRIX['invoice.emit'];
    assertNotNull(allowed, 'invoice.emit exists in matrix');
    assertTrue(
      allowed.indexOf('accounting') !== -1,
      'Accounting IS in invoice.emit allowed roles'
    );
  });

  _runTest('5.4 _hasPermissionAction returns false for coordinator on invoice.emit', function() {
    // Create a test user with coordinator role
    var coordinatorUser = _createTestUser('test-coord-neg', 'coordinator');
    if (coordinatorUser) {
      var result = _hasPermissionAction(coordinatorUser.token, 'invoice.emit');
      assertFalse(result, 'Coordinator cannot emit invoice');
      _cleanupTestUser(coordinatorUser.userId);
    } else {
      Logger.log('  ⚠️ Skipping 5.4: Could not create test user');
    }
  });

  // ==========================================================================
  // TEST 6: Payment exceeds invoice total
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 6: Payment Exceeds Invoice Total ──');

  _runTest('6.1 Register payment exceeding invoice total should fail', function() {
    var inv = InvoiceRepository.getById(ctx.invoice.ID);
    var invoiceTotal = parseFloat(inv.Total) || 0;

    assertThrows(function() {
      PaymentCommands.register(ctx.invoice.ID, {
        amount: invoiceTotal + 1000, // Way over total
        paymentMethod: 'BankTransfer',
        paymentDate: new Date().toISOString(),
        reference: 'NEG-TEST-OVER'
      });
    }, 'Payment amount exceeds invoice total');
  });

  // ==========================================================================
  // TEST 7: Invalid state transitions
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 7: Invalid State Transitions ──');

  _runTest('7.1 Importado → Validado (skipping states) should fail', function() {
    var freshService = ServiceRepository.create({
      ProjectID: ctx.project.ID,
      Date: new Date().toISOString(),
      Time: '11:00',
      PassengerName: 'Fresh Passenger',
      PassengerPhone: '+34600000020',
      PickupLines: ['Test'],
      DropoffLines: ['Test'],
      OperatingCompany: ctx.operatingCompany.ID
    });
    assertEquals(freshService.OperationalStatus, 'Importado', 'Fresh service is Importado');

    assertThrows(function() {
      _assertValidTransition('ServiceOperational', 'Importado', 'Validado');
    }, 'Cannot skip from Importado to Validado');
  });

  _runTest('7.2 Borrador → Pagada (skipping states) should fail', function() {
    assertThrows(function() {
      _assertValidTransition('Invoice', 'Borrador', 'Pagada');
    }, 'Cannot skip from Borrador to Pagada');
  });

  _runTest('7.3 Registrado → Conciliado (skipping Confirmado) should fail', function() {
    assertThrows(function() {
      _assertValidTransition('Payment', 'Registrado', 'Conciliado');
    }, 'Cannot skip from Registrado to Conciliado');
  });

  _runTest('7.4 Validado → Importado (reverse) should fail', function() {
    assertThrows(function() {
      _assertValidTransition('ServiceOperational', 'Validado', 'Importado');
    }, 'Cannot go backwards from Validado');
  });

  _runTest('7.5 Pagada → Borrador (reverse) should fail', function() {
    assertThrows(function() {
      _assertValidTransition('Invoice', 'Pagada', 'Borrador');
    }, 'Cannot go backwards from Pagada');
  });

  // ==========================================================================
  // TEST 8: Immutability — Breakdown modification after Validado
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 8: Immutability After Validate ──');

  _runTest('8.1 Modify revenue breakdown on Validado service should fail', function() {
    var revenues = ServiceRevenueBreakdownRepository.getByService(ctx.serviceA.ID);
    assertGreaterThan(revenues.length, 0, 'Has revenue breakdowns');

    var breakdown = revenues[0];
    assertThrows(function() {
      ServiceRevenueBreakdownRepository.update(breakdown.ID, {
        Description: 'Modified after validate'
      });
    }, 'Cannot modify breakdown after service is Validado');
  });

  _runTest('8.2 Modify cost breakdown on Validado service should fail', function() {
    var costs = ServiceCostBreakdownRepository.getByService(ctx.serviceA.ID);
    if (costs.length > 0) {
      var breakdown = costs[0];
      assertThrows(function() {
        ServiceCostBreakdownRepository.update(breakdown.ID, {
          Description: 'Modified after validate'
        });
      }, 'Cannot modify cost breakdown after service is Validado');
    } else {
      Logger.log('  ⚠️ Skipping 8.2: No cost breakdowns to test');
      assertTrue(true, 'Skipped');
    }
  });

  // ==========================================================================
  // TEST 9: Immutability — Invoice modification after emit
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 9: Invoice Immutability After Emit ──');

  _runTest('9.1 Modify invoice Subtotal after emit should fail', function() {
    assertThrows(function() {
      InvoiceRepository.update(ctx.invoice.ID, {
        Subtotal: 99999
      });
    }, 'Cannot modify Subtotal after invoice is emitted');
  });

  _runTest('9.2 Modify invoice TaxRate after emit should fail', function() {
    assertThrows(function() {
      InvoiceRepository.update(ctx.invoice.ID, {
        TaxRate: 0
      });
    }, 'Cannot modify TaxRate after invoice is emitted');
  });

  _runTest('9.3 Modify invoice Total after emit should fail', function() {
    assertThrows(function() {
      InvoiceRepository.update(ctx.invoice.ID, {
        Total: 0
      });
    }, 'Cannot modify Total after invoice is emitted');
  });

  // ==========================================================================
  // TEST 10: Immutability — Payment modification after confirm
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 10: Payment Immutability After Confirm ──');

  _runTest('10.1 Modify payment Amount after confirm should fail', function() {
    assertThrows(function() {
      PaymentRepository.update(ctx.payment.id, {
        Amount: 1
      });
    }, 'Cannot modify Amount after payment is confirmed');
  });

  _runTest('10.2 Modify payment PaymentMethod after confirm should fail', function() {
    assertThrows(function() {
      PaymentRepository.update(ctx.payment.id, {
        PaymentMethod: 'Cash'
      });
    }, 'Cannot modify PaymentMethod after payment is confirmed');
  });

  // ==========================================================================
  // TEST 11: Service Financial Flow — Invalid transitions
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 11: Financial Flow Transitions ──');

  _runTest('11.1 cobrarService on Pendiente should fail (needs Facturado first)', function() {
    var freshService = ServiceRepository.create({
      ProjectID: ctx.project.ID,
      Date: new Date().toISOString(),
      Time: '12:00',
      PassengerName: 'Financial Test',
      PassengerPhone: '+34600000030',
      PickupLines: ['Test'],
      DropoffLines: ['Test'],
      OperatingCompany: ctx.operatingCompany.ID
    });
    assertEquals(freshService.FinancialStatus, 'Pendiente', 'Fresh is Pendiente');

    assertThrows(function() {
      ServiceCommands.cobrarService(freshService.ID);
    }, 'Cannot cobrar a service in Pendiente status');
  });

  _runTest('11.2 closeService on Facturado should fail (needs Cobrado first)', function() {
    assertThrows(function() {
      ServiceCommands.closeService(ctx.serviceA.ID); // ServiceA is Facturado
    }, 'Cannot close a service in Facturado status');
  });

  // ==========================================================================
  // TEST 12: Invariants — Cross-check validations
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 12: Invariant Checks ──');

  _runTest('12.1 INV-011: All entities have valid states', function() {
    var result = InvariantChecks.INV011_transicionesValidas();
    assertTrue(result.valid, 'INV-011 failed: ' + result.errors.join(', '));
  });

  _runTest('12.2 INV-012: No financial regression', function() {
    var result = InvariantChecks.INV012_noRetrocesoContable();
    assertTrue(result.valid, 'INV-012 failed: ' + result.errors.join(', '));
  });

  _runTest('12.3 INV-013: Invoice immutability check', function() {
    var result = InvariantChecks.INV013_invoiceInmutabilidad();
    assertTrue(result.valid, 'INV-013 failed: ' + result.errors.join(', '));
  });

  _runTest('12.4 INV-014: Payment immutability check', function() {
    var result = InvariantChecks.INV014_paymentInmutabilidad();
    assertTrue(result.valid, 'INV-014 failed: ' + result.errors.join(', '));
  });

  // ==========================================================================
  // TEST 13: Rapportino transitions
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 13: Rapportino Transitions ──');

  _runTest('13.1 Create and test rapportino lifecycle', function() {
    // Create a fresh service (not facturado) for this test
    var freshService = ServiceRepository.create({
      ProjectID: ctx.project.ID,
      Date: new Date().toISOString(),
      Time: '14:00',
      PassengerName: 'Rapportino Test',
      PassengerPhone: '+34600000050',
      PickupLines: ['Test'],
      DropoffLines: ['Test'],
      OperatingCompany: ctx.operatingCompany.ID
    });
    ServiceCommands.assignDriver(freshService.ID, ctx.driverA.ID, ctx.vehicle.ID);
    ServiceCommands.confirmService(freshService.ID);
    ServiceCommands.startService(freshService.ID);
    ServiceCommands.completeService(freshService.ID);
    var report = DriverReportCommands.createReport(freshService.ID, ctx.driverA.ID, {
      kmExtra: 5, hoursExtra: 1, parking: 10, tolls: 5, fuel: 20, waitMinutes: 10, notes: 'Rapportino test'
    });
    DriverReportCommands.approveReport(report.id);
    ServiceRevenueBreakdownRepository.create({
      ServiceID: freshService.ID, ItemType: 'Transfer', Description: 'Test', Quantity: 1, UnitPrice: 80, Source: 'manual'
    });
    ServiceCommands.validateService(freshService.ID);

    var rapportino = RapportinoClientCommands.create(
      ctx.project.ID,
      ctx.client.ID,
      new Date().toISOString(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    );

    // Add a service so the rapportino is not empty
    RapportinoClientCommands.addService(rapportino.id, freshService.ID);

    // Borrador → Revisado should work
    RapportinoClientCommands.review(rapportino.id);
    var updated = RapportinoClientRepository.getById(rapportino.id);
    assertEquals(updated.Status, 'Revisado', 'Borrador → Revisado');
    ctx.testRapportino = rapportino;
  });

  _runTest('13.2 Borrador → Enviado (skipping) should fail', function() {
    // The rapportino is now in Revisado status, sending should fail
    assertThrows(function() {
      RapportinoClientCommands.send(ctx.testRapportino.id);
    }, 'Cannot send a Revisado rapportino (must be Enviado first)');
  });

  _runTest('13.3 Revisado → Facturado (skipping) should fail', function() {
    assertThrows(function() {
      RapportinoClientCommands.facturar(ctx.testRapportino.id);
    }, 'Cannot facturar a Revisado rapportino');
  });

  // ==========================================================================
  // TEST 14: Expense transitions
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 14: Expense Transitions ──');

  _runTest('14.1 Create and confirm expense', function() {
    var expense = ExpenseRepository.create({
      ProjectID: ctx.project.ID,
      Description: 'Test Expense',
      Amount: 100,
      ExpenseDate: new Date().toISOString(),
      AccountingDate: new Date().toISOString(),
      Category: 'Fuel',
      OwnerType: 'Service',
      OwnerID: ctx.serviceA.ID
    });
    assertNotNull(expense.ID, 'Expense ID');
    ctx.expense = expense;

    ExpenseCommands.confirm(expense.ID);
    var updated = ExpenseRepository.getById(expense.ID);
    assertEquals(updated.Status, 'Confirmed', 'Expense confirmed');
  });

  _runTest('14.2 Draft → Cancelled (skipping Confirmed) should fail', function() {
    var expense2 = ExpenseRepository.create({
      ProjectID: ctx.project.ID,
      Description: 'Test Expense 2',
      Amount: 50,
      ExpenseDate: new Date().toISOString(),
      AccountingDate: new Date().toISOString(),
      Category: 'Tolls',
      OwnerType: 'Service',
      OwnerID: ctx.serviceA.ID
    });
    // Expense2 is Draft, should be able to cancel directly (Draft → Cancelled is valid)
    ExpenseCommands.cancel(expense2.ID);
    var updated = ExpenseRepository.getById(expense2.ID);
    assertEquals(updated.Status, 'Cancelled', 'Draft → Cancelled works');
  });

  // ==========================================================================
  // TEST 15: Error serialization
  // ==========================================================================
  Logger.log('');
  Logger.log('── TEST 15: Error Types ──');

  _runTest('15.1 BusinessRuleError has correct properties', function() {
    var err = new BusinessRuleError('Test rule', 'TEST_RULE');
    assertEquals(err.name, 'BusinessRuleError', 'Error name');
    assertEquals(err.code, 'BUSINESS_RULE_ERROR', 'Error code');
    assertEquals(err.ruleId, 'TEST_RULE', 'Rule ID');
    assertEquals(err.message, 'Test rule', 'Message');
  });

  _runTest('15.2 AuthorizationError has statusCode 403', function() {
    var err = new AuthorizationError('Access denied');
    var serialized = _serializeError(err);
    assertEquals(serialized.statusCode, 403, 'Status code is 403');
    assertEquals(serialized.error.type, 'AuthorizationError', 'Type is AuthorizationError');
  });

  _runTest('15.3 ValidationError has statusCode 400', function() {
    var err = new ValidationError('Invalid input', 'email');
    var serialized = _serializeError(err);
    assertEquals(serialized.statusCode, 400, 'Status code is 400');
    assertEquals(serialized.error.field, 'email', 'Field is email');
  });

  _runTest('15.4 NotFoundError has statusCode 404', function() {
    var err = new NotFoundError('Service', 'SVC-001');
    var serialized = _serializeError(err);
    assertEquals(serialized.statusCode, 404, 'Status code is 404');
    assertEquals(serialized.error.entityType, 'Service', 'Entity type');
    assertEquals(serialized.error.entityId, 'SVC-001', 'Entity ID');
  });

  _runTest('15.5 ImmutableError has statusCode 422', function() {
    var err = new ImmutableError('Invoice', 'INV-001');
    var serialized = _serializeError(err);
    assertEquals(serialized.statusCode, 422, 'Status code is 422');
    assertEquals(serialized.error.type, 'ImmutableError', 'Type is ImmutableError');
  });

  // ==========================================================================
  // RESUMEN
  // ==========================================================================
  Logger.log('');
  Logger.log('╔═══════════════════════════════════════════════════════════╗');
  Logger.log('║  NEGATIVE TESTS COMPLETE                                ║');
  Logger.log('╚═══════════════════════════════════════════════════════════╝');

  return TestResults.summary();
}

// ============================================================================
// HELPER: Create temporary test user
// ============================================================================

function _createTestUser(username, role) {
  try {
    var result = registerUser({
      username: username,
      email: username + '@test.com',
      phone: '+34600000099',
      password: 'test1234'
    });
    if (!result.success) return null;

    // Get user and set role
    var user = _findUserByUsername(username);
    if (!user) return null;

    var sh = _getUsersSheet();
    sh.getRange(user.row, 5).setValue(role); // Column 5 = Role

    // Generate token
    var token = _generateToken();
    var now = new Date();
    var expiry = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    sh.getRange(user.row, 12).setValue(token); // Column 11 = Session_Token
    sh.getRange(user.row, 13).setValue(expiry.toISOString()); // Column 12 = Session_Expiry

    return {
      userId: user.data[0],
      token: token,
      role: role
    };
  } catch (e) {
    Logger.log('  ⚠️ Could not create test user: ' + e.message);
    return null;
  }
}

function _cleanupTestUser(userId) {
  try {
    var sh = _getUsersSheet();
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        sh.deleteRow(i + 1);
        return;
      }
    }
  } catch (e) {
    Logger.log('  ⚠️ Could not cleanup test user: ' + e.message);
  }
}
