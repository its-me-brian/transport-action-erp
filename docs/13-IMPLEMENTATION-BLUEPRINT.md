# IMPLEMENTATION-BLUEPRINT.md — Guía de implementación

## 1. Estructura de carpetas

```
Transport Action/
├── Code.gs
│   ├── config.gs
│   ├── enums.gs
│   ├── infrastructure/
│   │   ├── repository.gs
│   │   ├── lockService.gs
│   │   ├── sequence.gs
│   │   ├── eventBus.gs
│   │   ├── audit.gs
│   │   └── errors.gs
│   ├── domain/
│   │   ├── service.gs
│   │   ├── serviceRevenueBreakdown.gs
│   │   ├── serviceCostBreakdown.gs
│   │   ├── driverReport.gs
│   │   ├── driver.gs
│   │   ├── driverRate.gs
│   │   ├── driverAdvance.gs
│   │   ├── vehicle.gs
│   │   ├── rateCard.gs
│   │   ├── project.gs
│   │   ├── client.gs
│   │   ├── contact.gs
│   │   ├── transportList.gs
│   │   ├── rapportinoClient.gs
│   │   ├── rapportinoDriver.gs
│   │   ├── rapportinoItem.gs
│   │   ├── invoice.gs
│   │   ├── invoiceItem.gs
│   │   ├── payment.gs
│   │   ├── expense.gs
│   │   ├── change.gs
│   │   ├── document.gs
│   │   ├── operatingCompany.gs
│   │   └── settings.gs
│   ├── commands/
│   │   ├── serviceCommands.gs
│   │   ├── rapportinoCommands.gs
│   │   ├── invoiceCommands.gs
│   │   ├── paymentCommands.gs
│   │   └── expenseCommands.gs
│   ├── queries/
│   │   ├── serviceQueries.gs
│   │   ├── cashFlow.gs
│   │   ├── profit.gs
│   │   └── dashboard.gs
│   └── api.gs
│
├── src/
│   ├── services/
│   │   ├── api.ts
│   │   └── types.ts
│   ├── components/
│   └── ...
```

---

## 2. Contrato de cada entidad

### Service

| Campo | Tipo | Required | Default | Editable por | Fuente | Se bloquea cuando |
|-------|------|----------|---------|-------------|--------|-------------------|
| ID | string | Sí | auto | nadie | _generateId | Nunca |
| ProjectID | string | Sí | — | coordinator, admin | assignDriver | Validado |
| TransportListID | string | No | null | sistema | import | Nunca |
| Date | date | Sí | — | coordinator, admin | import/manual | Validado |
| Time | string | No | null | coordinator, admin | import/manual | Validado |
| Production | string | No | null | coordinator, admin | import | Validado |
| Section | string | No | null | coordinator, admin | import | Validado |
| PassengerName | string | No | null | coordinator, admin | import/manual | Validado |
| PassengerRole | string | No | null | coordinator, admin | import/manual | Validado |
| PassengerPhone | string | No | null | coordinator, admin | import/manual | Validado |
| PassengerDepartment | string | No | null | coordinator, admin | import/manual | Validado |
| PickupLines | string[] | No | [] | coordinator, admin | import/manual | Validado |
| DropoffLines | string[] | No | [] | coordinator, admin | import/manual | Validado |
| FlightInfo | string | No | null | coordinator, admin | import/manual | Validado |
| Notes | string | No | null | coordinator, admin | manual | Nunca |
| DriverID | string | No | null | coordinator, admin | assignDriver | Validado |
| VehicleID | string | No | null | coordinator, admin | assignDriver | Validado |
| OperationalStatus | enum | Sí | "Importado" | commands | — | Nunca (solo avanza) |
| FinancialStatus | enum | Sí | "Pendiente" | commands | — | Nunca (solo avanza) |
| EstimatedRevenue | number | No | null | coordinator, admin | manual | Nunca |
| EstimatedCost | number | No | null | coordinator, admin | manual | Nunca |
| OperatingCompany | string | Sí | Settings.ActiveCompany | sistema | — | Nunca |
| Normalized | boolean | Sí | false | sistema | — | Nunca |
| CreatedAt | timestamp | Sí | now | sistema | — | Nunca |
| UpdatedAt | timestamp | Sí | now | sistema | — | Nunca |

---

### ServiceRevenueBreakdown

| Campo | Tipo | Required | Default | Editable por | Fuente | Se bloquea cuando |
|-------|------|----------|---------|-------------|--------|-------------------|
| ID | string | Sí | auto | nadie | _generateId | Nunca |
| ServiceID | string | Sí | — | nadie | — | Nunca |
| ItemType | string | Sí | — | coordinator, admin | manual/rate_card | Validado |
| Description | string | No | null | coordinator, admin | manual | Validado |
| Quantity | number | Sí | 1 | coordinator, admin | manual | Validado |
| UnitPrice | number | Sí | — | coordinator, admin | manual/rate_card | Validado |
| Total | number | Sí | Qty×Price | nadie | calculado | Validado |
| RateCardID | string | No | null | sistema | rate_card | Validado |
| Source | enum | Sí | — | sistema | — | Nunca |
| ReferenceLineID | string | No | null | sistema | adjustment | Nunca |
| Locked | boolean | Sí | false | sistema | validateService | Nunca (una vez true) |
| CreatedAt | timestamp | Sí | now | sistema | — | Nunca |

---

### ServiceCostBreakdown

| Campo | Tipo | Required | Default | Editable por | Fuente | Se bloquea cuando |
|-------|------|----------|---------|-------------|--------|-------------------|
| ID | string | Sí | auto | nadie | _generateId | Nunca |
| ServiceID | string | Sí | — | nadie | — | Nunca |
| ItemType | string | Sí | — | sistema/admin | driver_rate/driver_report/manual | Validado |
| Description | string | No | null | sistema/admin | manual | Validado |
| Amount | number | Sí | — | sistema/admin | driver_rate/driver_report/manual | Validado |
| DriverID | string | No | null | sistema | driver_rate | Validado |
| Source | enum | Sí | — | sistema | — | Nunca |
| ReferenceLineID | string | No | null | sistema | adjustment | Nunca |
| Locked | boolean | Sí | false | sistema | validateService | Nunca (una vez true) |
| CreatedAt | timestamp | Sí | now | sistema | — | Nunca |

---

### DriverReport

| Campo | Tipo | Required | Default | Editable por | Fuente | Se bloquea cuando |
|-------|------|----------|---------|-------------|--------|-------------------|
| ID | string | Sí | auto | nadie | _generateId | Nunca |
| ServiceID | string | Sí | — | nadie | — | Nunca |
| DriverID | string | Sí | — | nadie | — | Nunca |
| Version | number | Sí | 1 | sistema | — | Nunca |
| PreviousReportID | string | No | null | sistema | — | Nunca |
| KmExtra | number | No | 0 | driver | manual | Aceptado/Rechazado |
| HoursExtra | number | No | 0 | driver | manual | Aceptado/Rechazado |
| Parking | number | No | 0 | driver | manual | Aceptado/Rechazado |
| Tolls | number | No | 0 | driver | manual | Aceptado/Rechazado |
| Fuel | number | No | 0 | driver | manual | Aceptado/Rechazado |
| WaitMinutes | number | No | 0 | driver | manual | Aceptado/Rechazado |
| Notes | string | No | null | driver | manual | Aceptado/Rechazado |
| Status | enum | Sí | "Pendiente" | commands | — | Aceptado/Rechazado |
| ApprovedBy | string | No | null | coordinator, admin | approveReport | Aceptado |
| ApprovedDate | timestamp | No | null | coordinator, admin | approveReport | Aceptado |
| RejectedReason | string | No | null | coordinator, admin | rejectReport | Rechazado |
| Locked | boolean | Sí | false | sistema | approve/reject | Nunca (una vez true) |
| SubmittedAt | timestamp | No | null | driver | submitReport | Aceptado/Rechazado |
| CreatedAt | timestamp | Sí | now | sistema | — | Nunca |

---

### Invoice

| Campo | Tipo | Required | Default | Editable por | Fuente | Se bloquea cuando |
|-------|------|----------|---------|-------------|--------|-------------------|
| ID | string | Sí | auto | nadie | _generateId | Nunca |
| InvoiceNumber | string | No | null | nadie | Sequence (al emitir) | Emitida |
| ProjectID | string | Sí | — | accounting | facturarRapportino | Emitida |
| ClientID | string | Sí | — | accounting | facturarRapportino | Emitida |
| Date | date | No | null | accounting | emitInvoice | Emitida |
| DueDate | date | No | null | accounting | manual | Emitida |
| Subtotal | number | Sí | 0 | nadie | calculado | Emitida |
| TaxRate | number | Sí | Settings.IVA | nadie | Settings | Emitida |
| TaxAmount | number | Sí | 0 | nadie | calculado | Emitida |
| Total | number | Sí | 0 | nadie | calculado | Emitida |
| Currency | string | Sí | Settings.Currency | nadie | Settings | Emitida |
| Status | enum | Sí | "Borrador" | commands | — | Nunca (solo avanza) |
| Notes | string | No | null | accounting | manual | Emitida |
| VoidReason | string | No | null | accounting | voidInvoice | Anulada |
| CreatedBy | string | Sí | user | sistema | — | Nunca |
| CreatedAt | timestamp | Sí | now | sistema | — | Nunca |
| UpdatedAt | timestamp | Sí | now | sistema | — | Nunca |

---

### Payment (entidad interna de Invoice)

| Campo | Tipo | Required | Default | Editable por | Fuente | Se bloquea cuando |
|-------|------|----------|---------|-------------|--------|-------------------|
| ID | string | Sí | auto | nadie | _generateId | Nunca |
| InvoiceID | string | Sí | — | nadie | — | Nunca |
| ClientID | string | Sí | — | nadie | — | Nunca |
| Amount | number | Sí | — | accounting | manual | Confirmado |
| PaymentMethod | enum | Sí | — | accounting | manual | Confirmado |
| PaymentDate | date | Sí | — | accounting | manual | Confirmado |
| Reference | string | No | null | accounting | manual | Confirmado |
| Notes | string | No | null | accounting | manual | Confirmado |
| Status | enum | Sí | "Registrado" | commands | — | Nunca (solo avanza) |
| CreatedBy | string | Sí | user | sistema | — | Nunca |
| CreatedAt | timestamp | Sí | now | sistema | — | Nunca |
| ConfirmedAt | timestamp | No | null | accounting | confirmPayment | Confirmado |
| ReconciledAt | timestamp | No | null | accounting | reconcilePayment | Conciliado |

---

### Expense

| Campo | Tipo | Required | Default | Editable por | Fuente | Se bloquea cuando |
|-------|------|----------|---------|-------------|--------|-------------------|
| ID | string | Sí | auto | nadie | _generateId | Nunca |
| OwnerType | enum | Sí | — | coordinator, accounting | manual | Confirmado |
| OwnerID | string | Sí | — | coordinator, accounting | manual | Confirmado |
| Category | string | Sí | — | coordinator, accounting | manual | Confirmado |
| Description | string | Sí | — | coordinator, accounting | manual | Confirmado |
| Amount | number | Sí | — | coordinator, accounting | manual | Confirmado |
| ExpenseDate | date | Sí | — | coordinator, accounting | manual | Confirmado |
| AccountingDate | date | Sí | ExpenseDate | coordinator, accounting | manual | Confirmado |
| Status | enum | Sí | "Draft" | commands | — | Nunca (solo avanza) |
| ProjectID | string | No | null | coordinator, accounting | manual | Confirmado |
| OperatingCompany | string | Sí | Settings.ActiveCompany | sistema | — | Nunca |
| CreatedBy | string | Sí | user | sistema | — | Nunca |
| CreatedAt | timestamp | Sí | now | sistema | — | Nunca |
| UpdatedAt | timestamp | Sí | now | sistema | — | Nunca |

---

## 3. Interfaces de repositorios

```javascript
const ServiceRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getAllByProject(projectId),
  getAllByDriver(driverId),
  getAllByStatus(status),
  getByTransportList(transportListId)
}

const InvoiceRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getAllByClient(clientId),
  getAllByProject(projectId),
  getBorradorByProjectClient(projectId, clientId),
  getAllByStatus(status)
}

const PaymentRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getAllByInvoice(invoiceId),
  getConfirmedByInvoice(invoiceId)
}

const ExpenseRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getAllByOwner(ownerType, ownerID),
  getAllByProject(projectId),
  getAllByCompany(operatingCompany),
  getDrafts(),
  getConfirmed()
}

const DriverReportRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getByService(serviceId),
  getActiveByService(serviceId),
  getAllByVersion(serviceId)
}

const RapportinoClientRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getAllByProject(projectId),
  getAllByClient(clientId),
  getBorradorByProjectClient(projectId, clientId)
}

const RapportinoDriverRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getAllByProject(projectId),
  getAllByDriver(driverId)
}

const ClientRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getActive()
}

const DriverRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getAvailable(),
  getAllByCompany(operatingCompany)
}

const VehicleRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getAvailable(),
  getAllByCompany(operatingCompany)
}

const ProjectRepository = {
  getAll(),
  getById(id),
  create(data),
  update(id, changes),
  getAllByCompany(operatingCompany),
  getActive(),
  getByStatus(status)
}

const SettingsRepository = {
  get(key),
  set(key, value),
  getByCategory(category)
}

const AuditLogRepository = {
  getAll(),
  getById(id),
  create(data),
  getAllByEntity(entityType, entityId),
  getRecent(limit)
}

const ActivityFeedRepository = {
  getAll(),
  getById(id),
  create(data),
  getRecent(limit),
  getByEntity(entityType, entityId)
}
```

---

## 4. Interfaces de comandos

```javascript
const ServiceCommands = {
  assignDriver(serviceId, driverId, vehicleId),
  confirmService(serviceId),
  startService(serviceId),
  completeService(serviceId),
  submitReport(serviceId, reportData),
  approveReport(reportId),
  rejectReport(reportId, reason),
  validateService(serviceId),
  adjustRevenue(serviceId, adjustment),
  adjustCost(serviceId, adjustment)
}

const RapportinoClientCommands = {
  create(projectId, clientId, weekStart, weekEnd),
  addService(rapportinoId, serviceId),
  removeService(rapportinoId, serviceId),
  review(rapportinoId),
  send(rapportinoId),
  accept(rapportinoId),
  facturar(rapportinoId)
}

const RapportinoDriverCommands = {
  create(projectId, driverId, weekStart, weekEnd),
  review(rapportinoId),
  send(rapportinoId),
  accept(rapportinoId),
  pay(rapportinoId, amount)
}

const InvoiceCommands = {
  emit(invoiceId),
  void(invoiceId, reason)
}

const PaymentCommands = {
  register(invoiceId, paymentData),
  confirm(paymentId),
  reconcile(paymentId)
}

const ExpenseCommands = {
  create(expenseData),
  edit(expenseId, changes),
  confirm(expenseId),
  cancel(expenseId),
  correct(expenseId)
}
```

---

## 5. Convenciones de nombres

| Concepto | Convención | Ejemplo |
|----------|-----------|---------|
| Sheet name | PascalCase plural | `Services`, `Invoices`, `Payments` |
| Entity ID | Prefix-YYYY-NNNNN | `SVC-2026-00123`, `INV-TA-2026-00045` |
| Functions backend | camelCase con prefijo | `apiGetServices`, `apiCreateService` |
| Commands | camelCase verb+noun | `assignDriver`, `validateService` |
| Queries | camelCase calculate/get | `calculateRevenue`, `getCashFlow` |
| Enums | PascalCase | `ServiceStatus`, `InvoiceStatus` |
| Repository | EntityName + "Repository" | `ServiceRepository`, `InvoiceRepository` |
| DTOs | EntityName + "DTO" | `ServiceDTO`, `InvoiceDTO` |
| Errors | DomainError, ValidationError, etc. | `BusinessRuleError`, `ConcurrencyError` |
| Events | entity.verb | `service.validated`, `invoice.paid` |
| Fields | PascalCase | `OperationalStatus`, `InvoiceNumber` |
| Booleans | is/has/locked | `Locked`, `Active`, `Normalized` |

---

## 6. Flujo de una transacción completa

```
1. Frontend llama a api.ts
   │
   ▼
2. api.ts hace fetch a GAS endpoint
   │
   ▼
3. api.gs recibe en doPost/doGet
   │  route = 'service/validate'
   │
   ▼
4. Router llama a ServiceCommands.validate(serviceId)
   │
   ▼
5. Command valida precondiciones (Business Rules)
   │  ¿Existe DriverReport aceptado?
   │  ¿Tiene DriverID?
   │  ¿Tiene VehicleID?
   │  ¿Tiene ≥1 RevenueBreakdown?
   │  ¿Tiene ≥1 CostBreakdown?
   │
   ├── NO → lanzar BusinessRuleError
   │
   ├── SÍ → continuar
   │
   ▼
6. Command modifica estado
   │  Service.OperationalStatus = "Validado"
   │
   ▼
7. Command ejecuta side effects
   │  Congelar RevenueBreakdowns → Locked = true
   │  Congelar CostBreakdowns → Locked = true
   │
   ▼
8. Command guarda vía Repository
   │  ServiceRepository.update(serviceId, changes)
   │  RevenueBreakdownRepository.updateBulk(items)
   │  CostBreakdownRepository.updateBulk(items)
   │
   ▼
9. Repository escribe en Sheet
   │
   ▼
10. Command despacha evento
    │  _dispatchEvent({
    │    type: 'service.validated',
    │    entity: 'Service',
    │    entityId: serviceId,
    │    user: Session.getActiveUser().getEmail(),
    │    timestamp: new Date().toISOString(),
    │    payload: {}
    │  })
    │
    ▼
11. EventBus ejecuta listeners
    │  _logAudit(event)
    │  _logActivity(event)
    │
    ▼
12. Retornar resultado al frontend
    │  { success: true, service: ServiceDTO }
    │
    ▼
13. Frontend actualiza UI
```

---

## 7. DTOs

```javascript
function toServiceDTO(entity) {
  return {
    id: entity.ID,
    projectId: entity.ProjectID,
    transportListId: entity.TransportListID,
    date: entity.Date,
    time: entity.Time,
    production: entity.Production,
    section: entity.Section,
    passenger: {
      name: entity.PassengerName,
      role: entity.PassengerRole,
      phone: entity.PassengerPhone,
      department: entity.PassengerDepartment
    },
    route: {
      pickupLines: JSON.parse(entity.PickupLines || '[]'),
      dropoffLines: JSON.parse(entity.DropoffLines || '[]'),
      flightInfo: entity.FlightInfo
    },
    driverId: entity.DriverID,
    vehicleId: entity.VehicleID,
    operationalStatus: entity.OperationalStatus,
    financialStatus: entity.FinancialStatus,
    estimatedRevenue: entity.EstimatedRevenue,
    estimatedCost: entity.EstimatedCost,
    operatingCompany: entity.OperatingCompany,
    normalized: entity.Normalized,
    createdAt: entity.CreatedAt,
    updatedAt: entity.UpdatedAt
  };
}

function toInvoiceDTO(entity) {
  return {
    id: entity.ID,
    invoiceNumber: entity.InvoiceNumber,
    projectId: entity.ProjectID,
    clientId: entity.ClientID,
    date: entity.Date,
    dueDate: entity.DueDate,
    subtotal: entity.Subtotal,
    taxRate: entity.TaxRate,
    taxAmount: entity.TaxAmount,
    total: entity.Total,
    currency: entity.Currency,
    status: entity.Status,
    notes: entity.Notes,
    voidReason: entity.VoidReason,
    createdBy: entity.CreatedBy,
    createdAt: entity.CreatedAt,
    updatedAt: entity.UpdatedAt
  };
}

function toPaymentDTO(entity) {
  return {
    id: entity.ID,
    invoiceId: entity.InvoiceID,
    clientId: entity.ClientID,
    amount: entity.Amount,
    paymentMethod: entity.PaymentMethod,
    paymentDate: entity.PaymentDate,
    reference: entity.Reference,
    notes: entity.Notes,
    status: entity.Status,
    createdBy: entity.CreatedBy,
    createdAt: entity.CreatedAt,
    confirmedAt: entity.ConfirmedAt,
    reconciledAt: entity.ReconciledAt
  };
}

function toExpenseDTO(entity) {
  return {
    id: entity.ID,
    ownerType: entity.OwnerType,
    ownerId: entity.OwnerID,
    category: entity.Category,
    description: entity.Description,
    amount: entity.Amount,
    expenseDate: entity.ExpenseDate,
    accountingDate: entity.AccountingDate,
    status: entity.Status,
    projectId: entity.ProjectID,
    operatingCompany: entity.OperatingCompany,
    createdBy: entity.CreatedBy,
    createdAt: entity.CreatedAt,
    updatedAt: entity.UpdatedAt
  };
}

function toDriverDTO(entity) {
  return {
    id: entity.ID,
    name: entity.Name,
    type: entity.Type,
    phone: entity.Phone,
    whatsapp: entity.WhatsApp,
    email: entity.Email,
    iban: entity.IBAN,
    vehiclePreferred: entity.VehiclePreferred,
    licenseType: entity.LicenseType,
    licenseExpiry: entity.LicenseExpiry,
    status: entity.Status,
    operatingCompany: entity.OperatingCompany,
    notes: entity.Notes,
    source: entity.Source,
    lastUsed: entity.LastUsed,
    totalRides: entity.TotalRides,
    createdAt: entity.CreatedAt,
    updatedAt: entity.UpdatedAt
  };
}
```

---

## 8. Errores del dominio

```javascript
class DomainError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

class ValidationError extends DomainError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

class BusinessRuleError extends DomainError {
  constructor(message, ruleId) {
    super(message, 'BUSINESS_RULE_ERROR');
    this.name = 'BusinessRuleError';
    this.ruleId = ruleId;
  }
}

class ConcurrencyError extends DomainError {
  constructor(message) {
    super(message, 'CONCURRENCY_ERROR');
    this.name = 'ConcurrencyError';
  }
}

class NotFoundError extends DomainError {
  constructor(entityType, entityId) {
    super(`${entityType} ${entityId} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}
```

---

## 9. Orden de implementación por capas

```
Fase 1: Infraestructura
├── config.gs
├── enums.gs
├── errors.gs
├── lockService.gs
├── sequence.gs
├── repository.gs
├── eventBus.gs
└── audit.gs

Fase 2: Entidades base
├── operatingCompany.gs
├── settings.gs
├── client.gs
├── contact.gs
├── project.gs
├── driver.gs
├── driverRate.gs
├── vehicle.gs
├── rateCard.gs
└── transportList.gs

Fase 3: Service + Breakdowns
├── service.gs
├── serviceRevenueBreakdown.gs
├── serviceCostBreakdown.gs
└── serviceCommands.gs

Fase 4: DriverReport
├── driverReport.gs
└── driverReportCommands.gs

Fase 5: Rapportinos
├── rapportinoClient.gs
├── rapportinoDriver.gs
├── rapportinoItem.gs
└── rapportinoCommands.gs

Fase 6: Invoice + Payment
├── invoice.gs
├── invoiceItem.gs
├── payment.gs
├── invoiceCommands.gs
└── paymentCommands.gs

Fase 7: Expenses
├── expense.gs
└── expenseCommands.gs

Fase 8: Queries + Dashboards
├── serviceQueries.gs
├── cashFlow.gs
├── profit.gs
└── dashboard.gs

Fase 9: Frontend updates
├── api.ts (nuevas interfaces)
├── screens updates
└── sidebar reorganization
```
