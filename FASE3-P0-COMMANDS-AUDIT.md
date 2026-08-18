# FASE 3 P0 — AUDITORÍA DE COMMANDS

Verificación completa de cada Command: Permiso, Lock, Evento, Error, Invariantes, Tests.

---

## 1. SERVICE COMMANDS

### 1.1 assignDriver (S001)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 24 |
| API Exposed | ✅ | apiAssignDriver → api.gs line 604 |
| Permission | ✅ | `service.assign` → admin, coordinator |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `service.assigned` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition, driver exists, vehicle exists |
| Frontend | ⚠️ | **MISSING: No UI button to call assignDriver** |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: Frontend has `assignDriver()` in api.ts but NO UI component calls it.

---

### 1.2 confirmService (S002)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 74 |
| API Exposed | ✅ | apiConfirmService → api.gs line 608 |
| Permission | ✅ | `service.confirm` → admin, coordinator |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `service.confirmed` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition |
| Frontend | ⚠️ | **MISSING: No UI button to call confirmService** |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: Frontend has `confirmService()` in api.ts but NO UI component calls it.

---

### 1.3 startService (S003)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 99 |
| API Exposed | ✅ | apiStartService → api.gs line 619 |
| Permission | ✅ | `service.start` → admin, coordinator, driver |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `service.started` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition |
| Frontend | ⚠️ | **MISSING: No UI button to call startService** |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: Frontend has `startService()` in api.ts but NO UI component calls it.

---

### 1.4 completeService (S004)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 124 |
| API Exposed | ✅ | apiCompleteService → api.gs line 629 |
| Permission | ✅ | `service.complete` → admin, coordinator, driver |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `service.completed` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition |
| Frontend | ⚠️ | **MISSING: No UI button to call completeService** |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: Frontend has `completeService()` in api.ts but NO UI component calls it.

---

### 1.5 validateService (S005)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 150 |
| API Exposed | ✅ | apiValidateService → api.gs line 633 |
| Permission | ✅ | `service.validate` → admin, coordinator |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `service.validated` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition, DriverReport accepted, Driver exists, Vehicle exists, RevenueBreakdown exists, CostBreakdown exists |
| Frontend | ⚠️ | **MISSING: No UI button to call validateService** |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: Frontend has `validateService()` in api.ts but NO UI component calls it.

---

### 1.6 facturarService (SF001)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 221 |
| API Exposed | ✅ | apiFacturarService → api.gs line 652 |
| Permission | ✅ | `service.facturar` → admin, coordinator, accounting |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `service.facturado` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition, OperationalStatus=Validado |
| Frontend | ✅ | DashboardScreen has button |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock() — concurrent invoicing could create duplicate invoices.

---

### 1.7 cobrarService (SF002)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 255 |
| API Exposed | ✅ | apiCobrarService → api.gs line 656 |
| Permission | ✅ | `service.cobrar` → admin, coordinator, accounting |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `service.cobrado` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition |
| Frontend | ✅ | DashboardScreen has button |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock() — concurrent collections could cause issues.

---

### 1.8 closeService (SF003)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 277 |
| API Exposed | ✅ | apiCloseService → api.gs line 659 |
| Permission | ✅ | `service.close` → admin, coordinator |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `service.closed` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition |
| Frontend | ✅ | DashboardScreen has button |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock() — concurrent close operations.

---

### 1.9 cerrarComercialmente (SF003b)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 300 |
| API Exposed | ✅ | apiCerrarComercialmente → api.gs line 663 |
| Permission | ✅ | `service.close` → admin, coordinator |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `service.cerrado_comercialmente` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition |
| Frontend | ✅ | DashboardScreen has button |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock() — concurrent close operations.

---

### 1.10 adjustRevenue (S009)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 323 |
| API Exposed | ✅ | apiAdjustRevenue → api.gs line 636 |
| Permission | ✅ | `service.adjustRevenue` → admin, coordinator |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `service.revenue_adjusted` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | OperationalStatus=Validado |
| Frontend | ❌ | **MISSING: No UI** |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock() and no UI.

---

### 1.11 adjustCost (S010)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | serviceCommands.gs line 375 |
| API Exposed | ✅ | apiAdjustCost → api.gs line 639 |
| Permission | ✅ | `service.adjustCost` → admin, coordinator |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `service.cost_adjusted` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | OperationalStatus=Validado |
| Frontend | ❌ | **MISSING: No UI** |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock() and no UI.

---

## 2. DRIVER REPORT COMMANDS

### 2.1 createReport (DR001)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | driverReportCommands.gs line 14 |
| API Exposed | ✅ | apiCreateDriverReport → api.gs line 728 |
| Permission | ✅ | `driverReport.submit` → admin, driver |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `report.submitted` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Service=Realizado, DriverID matches, No active report |
| Frontend | ✅ | DriverReportScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

### 2.2 approveReport (DR002)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | driverReportCommands.gs line 91 |
| API Exposed | ✅ | apiApproveDriverReport → api.gs line 732 |
| Permission | ✅ | `driverReport.approve` → admin, coordinator |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `report.approved` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Status=Pendiente, Locked=false |
| Frontend | ✅ | ReportInboxScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**NOTE**: Approve also triggers:
- ServiceEconomics.applyRevenueBreakdown
- ServiceEconomics.applyCostBreakdown
- ReconciliationCommands.createOrUpdate
- ReconciliationCommands.autoResolveIfMatch

---

### 2.3 rejectReport (DR003)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | driverReportCommands.gs line 212 |
| API Exposed | ✅ | apiRejectDriverReport → api.gs line 736 |
| Permission | ✅ | `driverReport.reject` → admin, coordinator |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `report.rejected` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError, ValidationError |
| Invariants | ✅ | Status=Pendiente, reason required |
| Frontend | ✅ | ReportInboxScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock() — concurrent reject could cause issues.

---

## 3. INVOICE COMMANDS

### 3.1 emit (I001)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | invoiceCommands.gs line 11 |
| API Exposed | ✅ | apiEmitInvoice → api.gs |
| Permission | ✅ | `invoice.emit` → admin, accounting |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `invoice.emitted` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition, has items, generates InvoiceNumber |
| Frontend | ✅ | InvoiceScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

### 3.2 send (I002)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | invoiceCommands.gs line 61 |
| API Exposed | ✅ | apiSendInvoice → api.gs |
| Permission | ✅ | `invoice.send` → admin, accounting |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `invoice.sent` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition |
| Frontend | ✅ | InvoiceScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock().

---

### 3.3 void (I003)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | invoiceCommands.gs line 81 |
| API Exposed | ✅ | apiVoidInvoice → api.gs |
| Permission | ✅ | `invoice.void` → admin, accounting |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `invoice.voided` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError, ValidationError |
| Invariants | ✅ | Valid transition, no confirmed payments, reason required |
| Frontend | ✅ | InvoiceScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock().

---

## 4. PAYMENT COMMANDS

### 4.1 register (P001)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | paymentCommands.gs line 13 |
| API Exposed | ✅ | apiRegisterPayment → api.gs |
| Permission | ✅ | `payment.register` → admin, accounting |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `payment.created` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError, ValidationError |
| Invariants | ✅ | Invoice valid status, Amount > 0, Amount ≤ saldo |
| Frontend | ✅ | PaymentsScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock() — concurrent payment registration.

---

### 4.2 confirm (P002)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | paymentCommands.gs line 66 |
| API Exposed | ✅ | apiConfirmPayment → api.gs |
| Permission | ✅ | `payment.confirm` → admin, accounting |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `payment.confirmed` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition, won't exceed invoice total |
| Frontend | ✅ | PaymentsScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

### 4.3 reconcile (P003)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | paymentCommands.gs line 111 |
| API Exposed | ✅ | apiReconcilePayment → api.gs |
| Permission | ✅ | `payment.reconcile` → admin, accounting |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `payment.reconciled` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition |
| Frontend | ✅ | PaymentsScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

## 5. EXPENSE COMMANDS

### 5.1 create (E001)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | expenseCommands.gs line 21 |
| API Exposed | ✅ | apiCreateExpense → api.gs |
| Permission | ✅ | `expense.create` → admin, coordinator, accounting |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `expense.created` |
| Error Handling | ✅ | ValidationError, BusinessRuleError |
| Invariants | ✅ | Description required, Amount > 0, AccountingDate ≥ ExpenseDate |
| Frontend | ✅ | ExpenseScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

### 5.2 edit (E002)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | expenseCommands.gs line 54 |
| API Exposed | ✅ | apiEditExpense → api.gs |
| Permission | ✅ | `expense.edit` → admin, coordinator, accounting |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ❌ | **MISSING: No event dispatched** |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Status=Draft, AccountingDate ≥ ExpenseDate |
| Frontend | ✅ | ExpenseScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock() and no event.

---

### 5.3 confirm (E003)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | expenseCommands.gs line 77 |
| API Exposed | ✅ | apiConfirmExpense → api.gs |
| Permission | ✅ | `expense.confirm` → admin, accounting |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `expense.confirmed` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition |
| Frontend | ✅ | ExpenseScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

### 5.4 cancel (E005)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | expenseCommands.gs line 99 |
| API Exposed | ✅ | apiCancelExpense → api.gs |
| Permission | ✅ | `expense.cancel` → admin, accounting |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `expense.cancelled` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Valid transition, accounting period check |
| Frontend | ✅ | ExpenseScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

### 5.5 correct (E006)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | expenseCommands.gs line 130 |
| API Exposed | ✅ | apiCorrectExpense → api.gs |
| Permission | ✅ | `expense.correct` → admin, accounting |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `expense.corrected` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Status=Confirmed, accounting period check |
| Frontend | ✅ | ExpenseScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

## 6. RAPPORTINO CLIENT COMMANDS

### 6.1 create (RC001)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | rapportinoCommands.gs line 15 |
| API Exposed | ✅ | apiCreateRapportinoClient → api.gs |
| Permission | ✅ | `rapportinoClient.create` → admin, coordinator |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `rapportino_client.created` |
| Error Handling | ✅ | BusinessRuleError |
| Invariants | ✅ | No duplicate draft, valid period type, project not archived |
| Frontend | ✅ | RapportinoScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

### 6.2 addService (RC002)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | rapportinoCommands.gs line 68 |
| API Exposed | ✅ | apiAddServiceToRapportino → api.gs |
| Permission | ✅ | `rapportinoClient.addService` → admin, coordinator |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ❌ | **MISSING: No event dispatched** |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Rapportino=Borrador, Service=Validado, FinancialStatus pending, not duplicate, has revenue |
| Frontend | ✅ | RapportinoScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

**ISSUE**: No _withLock() and no event.

---

### 6.3 facturar (RC007)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | rapportinoCommands.gs line 321 |
| API Exposed | ✅ | apiFacturarRapportino → api.gs |
| Permission | ✅ | `rapportinoClient.facturar` → admin, accounting |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `rapportino_client.facturado` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Status=Aceptado, Ready to Invoice gate, items locked, Invoice created, FinancialStatus updated |
| Frontend | ✅ | RapportinoScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

## 7. RAPPORTINO DRIVER COMMANDS

### 7.1 create (RD001)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | rapportinoCommands.gs line 419 |
| API Exposed | ✅ | apiCreateRapportinoDriver → api.gs |
| Permission | ✅ | `rapportinoDriver.create` → admin, coordinator |
| Lock | ❌ | **MISSING: No _withLock()** |
| Event | ✅ | `rapportino_driver.created` |
| Error Handling | ✅ | BusinessRuleError, NotFoundError |
| Invariants | ✅ | Valid IDs, project not archived, collaborator check, valid period |
| Frontend | ✅ | RapportinoScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

### 7.2 pay (RD005)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Documented | ✅ | rapportinoCommands.gs line 572 |
| API Exposed | ✅ | apiPayRapportinoDriver → api.gs |
| Permission | ✅ | `rapportinoDriver.pay` → admin, accounting |
| Lock | ✅ | `_withLock()` |
| Event | ✅ | `rapportino_driver.pagado` |
| Error Handling | ✅ | NotFoundError, BusinessRuleError |
| Invariants | ✅ | Status=Aceptado, internal driver check, creates DriverAdvance |
| Frontend | ✅ | RapportinoScreen |
| Positive Test | ⚠️ | **MISSING** |
| Negative Test | ⚠️ | **MISSING** |

---

## SUMMARY — COMMANDS AUDIT

| Category | Total | Lock ✅ | Event ✅ | Permission ✅ | Frontend ✅ | Tests ✅ |
|----------|-------|---------|----------|---------------|-------------|----------|
| Service Commands | 11 | 5/11 | 11/11 | 11/11 | 7/11 | 0/11 |
| Driver Report Commands | 3 | 2/3 | 3/3 | 3/3 | 3/3 | 0/3 |
| Invoice Commands | 3 | 1/3 | 3/3 | 3/3 | 3/3 | 0/3 |
| Payment Commands | 3 | 2/3 | 3/3 | 3/3 | 3/3 | 0/3 |
| Expense Commands | 5 | 1/5 | 4/5 | 5/5 | 5/5 | 0/5 |
| Rapportino Commands | 8 | 2/8 | 6/8 | 8/8 | 8/8 | 0/8 |
| **TOTAL** | **33** | **13/33** | **30/33** | **33/33** | **29/33** | **0/33** |

---

## CRITICAL ISSUES

### P0-1: Missing Locks (6 commands)
- `facturarService` — concurrent invoicing
- `cobrarService` — concurrent collections
- `closeService` — concurrent close
- `cerrarComercialmente` — concurrent close
- `adjustRevenue` — concurrent adjustments
- `adjustCost` — concurrent adjustments
- `rejectReport` — concurrent rejection
- `send` (Invoice) — concurrent send
- `void` (Invoice) — concurrent void
- `register` (Payment) — concurrent registration
- `create` (Expense) — concurrent creation
- `edit` (Expense) — concurrent edit
- `confirm` (Expense) — concurrent confirmation
- `cancel` (Expense) — concurrent cancellation
- `create` (RapportinoClient) — concurrent creation
- `addService` (RapportinoClient) — concurrent add
- `create` (RapportinoDriver) — concurrent creation

### P0-2: Missing Frontend (4 commands)
- `assignDriver` — no UI button
- `confirmService` — no UI button
- `startService` — no UI button
- `completeService` — no UI button
- `validateService` — no UI button
- `adjustRevenue` — no UI
- `adjustCost` — no UI

### P0-3: Missing Events (2 commands)
- `edit` (Expense) — no event
- `addService` (RapportinoClient) — no event

### P0-4: Missing Tests (33 commands)
- ALL commands lack positive tests
- ALL commands lack negative tests

---

## NEXT STEPS

1. **Add _withLock() to all 17 commands missing it**
2. **Add events to 2 commands missing them**
3. **Add lifecycle buttons to ServiceDetailScreen**
4. **Write tests for all 33 commands**
5. **Write E2E test for 34-step flow**
