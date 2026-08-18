# FASE 6 — E2E TEST

Prueba completa del flujo de negocio de 34 pasos.

---

## E2E TEST SCENARIO

### Preconditions
- Admin user logged in
- OperatingCompany exists
- Test spreadsheet with empty data

---

## TEST STEPS

### 1. Login admin
```
POST /login
Body: { username: "admin", password: "..." }
Expected: { success: true, token: "..." }
```

### 2. Create OperatingCompany (if needed)
```
POST /updateOperatingCompany
Body: { id: "TA", name: "Transport Action", ... }
Expected: { success: true }
```

### 3. Create Client
```
POST /createClient
Body: { name: "Test Client", type: "Production", vat: "12345678A" }
Expected: { success: true, id: "CLI-xxx" }
```

### 4. Create Project
```
POST /createProject
Body: { name: "Test Project", clientId: "CLI-xxx", status: "Nuovo" }
Expected: { success: true, id: "PRJ-xxx" }
```

### 5. Create Driver
```
POST /createDriver
Body: { name: "Test Driver", phone: "+34600000000" }
Expected: { success: true, id: "DRV-xxx" }
```

### 6. Create Vehicle
```
POST /createVehicle
Body: { plate: "ABC-123", brand: "Mercedes", type: "Van" }
Expected: { success: true, id: "VEH-xxx" }
```

### 7. Create Service
```
POST /createService
Body: { projectId: "PRJ-xxx", date: "2026-08-14", time: "08:00" }
Expected: { success: true, id: "SVC-xxx" }
```

### 8. Assign Driver + Vehicle
```
POST /assignDriver
Body: { serviceId: "SVC-xxx", driverId: "DRV-xxx", vehicleId: "VEH-xxx" }
Expected: { success: true, operationalStatus: "Asignado" }
```

### 9. Confirm Service
```
POST /confirmService
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, operationalStatus: "Confirmado" }
```

### 10. Start Service
```
POST /startService
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, operationalStatus: "EnRuta" }
```

### 11. Complete Service
```
POST /completeService
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, operationalStatus: "Realizado" }
```

### 12. Create DriverReport
```
POST /submitDriverReport
Body: { serviceId: "SVC-xxx", driverId: "DRV-xxx", reportData: { kmTotal: 50, startTime: "08:00", endTime: "18:00" } }
Expected: { success: true, id: "DRR-xxx", status: "Pendiente" }
```

### 13. Approve DriverReport
```
POST /approveDriverReport
Body: { reportId: "DRR-xxx" }
Expected: { success: true, status: "Aceptado" }
```

### 14. Create/Confirm Reconciliation (if needed)
```
POST /createOrUpdateReconciliation
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, status: "Resuelto" }
```

### 15. Create RevenueBreakdown
```
POST /applyRevenueBreakdown
Body: { serviceId: "SVC-xxx", driverReportData: {...} }
Expected: { success: true, items: [...] }
```

### 16. Verify CostBreakdown
```
POST /getCostBreakdowns
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, items: [...] }
```

### 17. Validate Service
```
POST /validateService
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, operationalStatus: "Validado" }
```

### 18. Verify Locks
```
POST /getRevenueBreakdowns
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, items: [{ locked: true }, ...] }
```

### 19. Create RapportinoClient
```
POST /createRapportinoClient
Body: { projectId: "PRJ-xxx", clientId: "CLI-xxx", weekStart: "2026-08-11", weekEnd: "2026-08-17" }
Expected: { success: true, id: "RC-xxx" }
```

### 20. Add Service to Rapportino
```
POST /addServiceToRapportino
Body: { rapportinoId: "RC-xxx", serviceId: "SVC-xxx" }
Expected: { success: true }
```

### 21. Review Rapportino
```
POST /reviewRapportinoClient
Body: { rapportinoId: "RC-xxx" }
Expected: { success: true, status: "Revisado" }
```

### 22. Send Rapportino
```
POST /sendRapportinoClient
Body: { rapportinoId: "RC-xxx" }
Expected: { success: true, status: "Enviado" }
```

### 23. Accept Rapportino
```
POST /acceptRapportinoClient
Body: { rapportinoId: "RC-xxx" }
Expected: { success: true, status: "Aceptado" }
```

### 24. Confirm Actuals (after reconciliation)
```
POST /confirmActuals
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, financialStatus: "ActualsConfirmados" }
```

### 25. Approve Financial
```
POST /approveFinancial
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, financialStatus: "Aprobado" }
```

### 26. Mark Facturable
```
POST /markFacturable
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, financialStatus: "Facturable" }
```

### 27. Facturar Rapportino
```
POST /facturarRapportino
Body: { rapportinoId: "RC-xxx" }
Expected: { success: true, status: "Facturado", invoiceId: "INV-xxx" }
```

### 28. Verify Invoice
```
POST /getInvoice
Body: { id: "INV-xxx" }
Expected: { success: true, status: "Borrador", total: ... }
```

### 29. Emit Invoice
```
POST /emitInvoice
Body: { invoiceId: "INV-xxx" }
Expected: { success: true, status: "Emitida", invoiceNumber: "INV-TA-..." }
```

### 30. Send Invoice
```
POST /sendInvoice
Body: { invoiceId: "INV-xxx" }
Expected: { success: true, status: "Enviada" }
```

### 31. Register Payment
```
POST /registerPayment
Body: { invoiceId: "INV-xxx", amount: 1000, paymentMethod: "bank", paymentDate: "2026-08-14" }
Expected: { success: true, id: "PAY-xxx" }
```

### 32. Confirm Payment
```
POST /confirmPayment
Body: { paymentId: "PAY-xxx" }
Expected: { success: true, status: "Confirmado" }
```

### 33. Reconcile Payment
```
POST /reconcilePayment
Body: { paymentId: "PAY-xxx" }
Expected: { success: true, status: "Conciliado" }
```

### 34. Close Service
```
POST /closeService
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, financialStatus: "Cerrado" }
```

### 35. Close Commercially
```
POST /cerrarComercialmente
Body: { serviceId: "SVC-xxx" }
Expected: { success: true, financialStatus: "CerradoComercial" }
```

### 36. Verify Dashboard
```
POST /getMainDashboard
Body: {}
Expected: { success: true, totalServices: ..., totalRevenue: ... }
```

### 37. Verify AuditLog
```
POST /apiGetAuditLog
Body: { limit: 10 }
Expected: { success: true, entries: [...], count: >0 }
```

### 38. Verify ActivityFeed
```
POST /apiGetActivityFeed
Body: { limit: 10 }
Expected: { success: true, entries: [...], count: >0 }
```

---

## EXPECTED RESULTS

After all 38 steps:
1. Service exists in Google Sheets
2. Service.OperationalStatus = "Validado"
3. Service.FinancialStatus = "CerradoComercial"
4. DriverReport exists with Status = "Aceptado"
5. Reconciliation exists with Status = "Resuelto"
6. RevenueBreakdown items exist and are locked
7. CostBreakdown items exist and are locked
8. RapportinoClient exists with Status = "Facturado"
9. Invoice exists with Status = "Pagada" (after full payment)
10. Payment exists with Status = "Conciliado"
11. AuditLog has entries for all operations
12. ActivityFeed has entries for all operations

---

## DATA VERIFICATION

### Service Entity
```sql
SELECT * FROM Services WHERE ID = 'SVC-xxx'
-- Expected:
-- OperationalStatus: Validado
-- FinancialStatus: CerradoComercial
-- DriverID: DRV-xxx
-- VehicleID: VEH-xxx
```

### DriverReport Entity
```sql
SELECT * FROM DriverReports WHERE ServiceID = 'SVC-xxx'
-- Expected:
-- Status: Aceptado
-- Locked: true
-- Version: 1
```

### Invoice Entity
```sql
SELECT * FROM Invoices WHERE ID = 'INV-xxx'
-- Expected:
-- Status: Emitida
-- InvoiceNumber: INV-TA-...
-- Total: > 0
-- Subtotal = Total / (1 + TaxRate/100)
```

### Payment Entity
```sql
SELECT * FROM Payments WHERE InvoiceID = 'INV-xxx'
-- Expected:
-- Status: Conciliado
-- Amount: <= Invoice.Total
```

---

## FAILURE SCENARIOS

If any step fails:
1. Log the failed step number
2. Log the request and response
3. Log the current state of the entity
4. Report which invariant was violated

---

## AUTOMATION

This E2E test can be automated using:
1. **Postman/Newman**: Export as Postman collection
2. **Playwright**: Frontend E2E testing
3. **Custom script**: Node.js script calling API directly

Recommended: Create a Postman collection with all 34 steps.
