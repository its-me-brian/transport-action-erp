# TESTING.md — Estrategia de tests

## Niveles de testing

### 1. Tests de entidades (invariantes)

Verificar que las invariantes siempre se cumplen.

```javascript
function testINV001_invoiceTotal() {
  const invoice = createTestInvoice({ subtotal: 100, taxRate: 21 });
  assertEquals(invoice.taxAmount, 21);
  assertEquals(invoice.total, 121);
}

function testINV005_lockedAmount() {
  const item = createTestRapportinoItem({ amount: 500 });
  freezeRapportinoItem(item);
  assertEquals(item.lockedAmount, 500);
  // Intentar modificar → debe fallar
}
```

### 2. Tests de commands

Verificar que cada command ejecuta correctamente.

```javascript
function testAssignDriver() {
  const service = createTestService({ operationalStatus: 'Importado' });
  const driver = createTestDriver({ status: 'Disponible' });
  const vehicle = createTestVehicle({ status: 'Disponible' });

  ServiceCommands.assignDriver(service.id, driver.id, vehicle.id);

  const updated = ServiceRepository.getById(service.id);
  assertEquals(updated.operationalStatus, 'Asignado');
  assertEquals(updated.driverId, driver.id);
  assertEquals(updated.vehicleId, vehicle.id);
}

function testValidateService_failsWithoutReport() {
  const service = createTestService({ operationalStatus: 'Reportado' });
  // No crear DriverReport

  try {
    ServiceCommands.validateService(service.id);
    fail('Debería haber fallado');
  } catch (e) {
    assertInstanceOf(e, BusinessRuleError);
    assertEquals(e.ruleId, 'S006');
  }
}
```

### 3. Tests de repositorios

Verificar CRUD y queries.

```javascript
function testServiceRepository_getByProject() {
  const project = createTestProject();
  createTestService({ projectId: project.id });
  createTestService({ projectId: project.id });
  createTestService({ projectId: 'other' });

  const results = ServiceRepository.getAllByProject(project.id);
  assertEquals(results.length, 2);
}
```

### 4. Tests de integración

Verificar flujos completos.

```javascript
function testFullFlow_serviceToInvoice() {
  // 1. Crear servicio
  const service = createTestService();

  // 2. Asignar conductor
  ServiceCommands.assignDriver(service.id, driver.id, vehicle.id);

  // 3. Conductor reporta
  ServiceCommands.submitReport(service.id, reportData);

  // 4. Admin aprueba
  ServiceCommands.approveReport(reportId);

  // 5. Admin valida
  ServiceCommands.validateService(service.id);

  // 6. Crear rapportino
  const rapportino = RapportinoClientCommands.create(...);
  RapportinoClientCommands.addService(rapportino.id, service.id);
  RapportinoClientCommands.review(rapportino.id);
  RapportinoClientCommands.send(rapportino.id);
  RapportinoClientCommands.accept(rapportino.id);

  // 7. Facturar
  RapportinoClientCommands.facturar(rapportino.id);

  // 8. Verificar Invoice creado
  const invoices = InvoiceRepository.getAllByProject(project.id);
  assertEquals(invoices.length, 1);
  assertEquals(invoices[0].status, 'Borrador');

  // 9. Emitir
  InvoiceCommands.emit(invoices[0].id);
  assertNotEquals(invoices[0].invoiceNumber, null);

  // 10. Pagar
  PaymentCommands.register(invoices[0].id, paymentData);
  PaymentCommands.confirm(paymentId);

  // 11. Verificar saldo
  const updated = InvoiceRepository.getById(invoices[0].id);
  assertEquals(updated.status, 'Pagada');
}
```

## Qué se prueba

| Nivel | Qué | Cuándo |
|-------|-----|--------|
| Entidades | Invariantes, formateo, defaults | Después de crear cada entidad |
| Commands | Precondiciones, efectos, errores | Después de crear cada command |
| Repositorios | CRUD, queries, filtros | Después de crear cada repositorio |
| Integración | Flujos completos | Al final de cada fase |

## Qué NO se prueba

- UI (frontend) — se prueba manualmente
- Performance — no es crítico para este volumen
- Edge cases extremos — se documentan en INVARIANTS.md

## Herramientas

Google Apps Script no tiene framework de tests nativo.
Se usa un helper mínimo:

```javascript
function assertEquals(actual, expected) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

function assertNotEquals(actual, expected) {
  if (actual === expected) {
    throw new Error(`Expected not ${expected}`);
  }
}

function assertInstanceOf(obj, cls) {
  if (!(obj instanceof cls)) {
    throw new Error(`Expected instance of ${cls.name}`);
  }
}

function fail(message) {
  throw new Error(message);
}
```

Los tests se ejecutan vía `doGet` en modo test o desde Apps Script IDE.
