# E2E Flow — Transport Action ERP

## Overview

This document describes the complete end-to-end flow for the Transport Action ERP, from service creation to financial closure.

## Prerequisites

- Admin user with full permissions
- Google Sheets backend connected
- At least one OperatingCompany, Client, Driver, and Vehicle in the system

---

## Flow Steps

### Phase 1: Service Creation

1. **Login as Admin**
   - Navigate to `/` 
   - Enter credentials
   - Verify dashboard loads

2. **Create Service**
   - Click "New Service" in sidebar
   - Fill required fields:
     - Project (select from dropdown)
     - Client (auto-filled from project)
     - Date
     - Pickup/Dropoff locations
     - Service type (Transfer City, Transfer Airport, etc.)
   - Click "Create Service"
   - **Verify**: Service appears in Transport List with status "Importado"

3. **Assign Driver + Vehicle**
   - Open service detail (`/service/:id`)
   - Click "Assign Driver"
   - Select driver and vehicle from dropdowns
   - Confirm assignment
   - **Verify**: Status changes to "Asignado"

4. **Confirm Service**
   - Driver confirms via WhatsApp or backoffice
   - **Verify**: Status changes to "Confirmado"

5. **Start Service (EnRuta)**
   - Driver starts service
   - **Verify**: Status changes to "EnRuta"

6. **Complete Service (Realizado)**
   - Driver completes service
   - **Verify**: Status changes to "Realizado"

### Phase 2: Driver Report

7. **Submit Driver Report**
   - Driver submits report via DriverLink or WhatsApp
   - Report includes: km, diaria, festivo, notturno
   - **Verify**: Status changes to "Reportado"

8. **Approve Driver Report**
   - Coordinator reviews report in Report Inbox
   - Click "Approve"
   - **Verify**: Report status = "Aceptado", CostBreakdown created

### Phase 3: Reconciliation (if needed)

9. **Create Reconciliation**
   - Navigate to Reconciliation screen
   - Compare Production vs Driver data
   - **Verify**: Differences highlighted in amber/red

10. **Resolve Reconciliation**
    - Click "Resolve" on reconciliation item
    - Confirm final values
    - **Verify**: Status changes to "Resuelto"

### Phase 4: Validation

11. **Validate Service**
    - Coordinator validates service in ServiceWorkspace
    - Click "Validate" button
    - **Verify**: Status changes to "Validado", breakdowns frozen

### Phase 5: Rapportino

12. **Create Rapportino Client**
    - Navigate to Rapportinos screen
    - Click "New Rapportino"
    - Select project, client, week
    - Add services to rapportino
    - **Verify**: Rapportino created with status "Borrador"

13. **Review Rapportino**
    - Review items and totals
    - Click "Review"
    - **Verify**: Status changes to "Revisado"

14. **Send Rapportino**
    - Click "Send"
    - **Verify**: Status changes to "Enviado"

15. **Accept Rapportino**
    - Client accepts rapportino
    - **Verify**: Status changes to "Aceptado", LockedAmount set

### Phase 6: Invoicing

16. **Create Invoice**
    - Click "Invoice" on rapportino
    - **Verify**: Invoice created with status "Borrador"

17. **Emit Invoice**
    - Review invoice details
    - Click "Emit"
    - **Verify**: Status changes to "Emitida", InvoiceNumber generated, amounts frozen

18. **Send Invoice**
    - Send invoice to client
    - **Verify**: Status changes to "Enviada"

### Phase 7: Payment

19. **Register Payment**
    - Navigate to Payments screen
    - Click "Add Payment"
    - Enter amount, method, date
    - **Verify**: Payment created with status "Registrado"

20. **Confirm Payment**
    - Click "Confirm"
    - **Verify**: Status changes to "Confirmado", affects balance

21. **Reconcile Payment**
    - Click "Reconcile"
    - **Verify**: Status changes to "Conciliado"

### Phase 8: Closure

22. **Close Service**
    - Coordinator closes service
    - **Verify**: Status changes to "Cerrado"

23. **Close Commercially**
    - Accounting closes service commercially
    - **Verify**: Status changes to "CerradoComercial"

### Phase 9: Verification

24. **Verify Dashboard**
    - Navigate to Executive Dashboard
    - **Verify**: KPIs reflect all changes

25. **Verify Audit Log**
    - Navigate to Audit Center
    - **Verify**: All actions logged with correct timestamps

26. **Verify Activity Feed**
    - **Verify**: Recent activities show all changes

---

## State Machines

### Operational Status
```
Importado → Asignado → Confirmado → EnRuta → Realizado → Reportado → Revision → Validado
```

### Financial Status
```
Pendiente → Calculado → Confrontacion → ActualsConfirmados → Aprobado → Facturable → Facturado → Cobrado → Cerrado → CerradoComercial
```

### Rapportino Status (Client)
```
Borrador → Revisado → Enviado → Aceptado → Facturado
```

### Rapportino Status (Driver)
```
Borrador → Revisado → Enviado → Aceptado → Pagado
```

### Invoice Status
```
Borrador → Emitida → Enviada → PagoParcial/Pagada/Vencida → Anulada
```

### Payment Status
```
Registrado → Confirmado → Conciliado
```

---

## Key Invariants

1. **Cannot validate without**: Driver, Vehicle, DriverReport (accepted), RevenueBreakdown, CostBreakdown
2. **Cannot invoice without validation**
3. **Cannot collect without invoicing**
4. **Cannot close without collection**
5. **Breakdowns freeze on validation**
6. **Invoice amounts freeze on emission**
7. **Confirmed payments are immutable**
8. **Rapportino items immutable after acceptance**

---

## Testing

Run E2E contract tests:
```bash
npx vitest run src/__tests__/e2e-financial-flow.test.ts
```

Run all tests:
```bash
npx vitest run
```

---

## Navigation

- `/` — Dashboard (Calendar)
- `/executive` — Executive Dashboard (KPIs)
- `/transport` — Transport List
- `/new-service` — Create Service
- `/service/:id` — Service Workspace
- `/service/:id/:section` — Service Workspace (specific tab)
- `/rapportinos` — Rapportinos
- `/reports` — Driver Reports
- `/reconciliation` — Reconciliation
- `/accounting` — Accounting (Invoices/Payments/Expenses)
- `/clients` — Clients
- `/projects` — Projects
- `/drivers` — Driver Panel
- `/vehicles` — Vehicles
- `/contacts` — Contacts
- `/settings` — Company Settings
- `/admin/users` — User Management
- `/admin/audit` — Audit Center
