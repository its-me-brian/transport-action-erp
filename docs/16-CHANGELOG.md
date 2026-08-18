# CHANGELOG.md — Convención para romper cambios

## Regla

Cuando un cambio afecta la arquitectura, actualizar el documento correspondiente:

| Tipo de cambio | Documento a actualizar |
|---------------|----------------------|
| Nueva entidad | DOMAIN.md, ERD.md |
| Campo nuevo/eliminado en entidad | DOMAIN.md, ERD.md |
| Nuevo enum | DOMAIN.md (en la entidad) |
| Nueva regla de negocio | BUSINESS_RULES.md |
| Nuevo command | COMMANDS.md |
| Cambio en transición de estado | STATE_MACHINES.md |
| Nuevo workflow | WORKFLOWS.md |
| Nuevo evento | EVENTS.md |
| Nueva invariante | INVARIANTS.md |
| Nuevo permiso | PERMISSIONS.md |
| Nuevo agregado | AGGREGATES.md |
| Cambio en concurrencia | CONCURRENCY.md |
| Cambio en implementación | INFRASTRUCTURE.md, IMPLEMENTATION-BLUEPRINT.md |
| Migración de datos | MIGRATIONS.md |
| Nuevo test | TESTING.md |

## Formato del cambio

```markdown
## [Fecha] — Descripción del cambio

**Afecta:** SERVICE.md, COMMANDS.md
**Razón:** Descripción del por qué
**Antes:** Cómo era antes
**Ahora:** Cómo es ahora
**Migración:** Script de migración (si aplica)
```

## Ejemplo

```markdown
## [2026-07-28] — Agregado campo AccountingDate a Expense

**Afecta:** DOMAIN.md, ERD.md, MIGRATIONS.md
**Razón:** En contabilidad, la fecha de registro puede diferir de la fecha del gasto
**Antes:** Expense solo tenía ExpenseDate
**Ahora:** Expense tiene ExpenseDate y AccountingDate
**Migración:** migration_002.gs — copia ExpenseDate a AccountingDate para filas existentes
```

---

## Historial

| Fecha | Cambio | Afecta |
|-------|--------|--------|
| 2026-08-14 | [AUDIT] RapportinoClientCommands.removeService() wrapped in _withLock | rapportinoCommands.gs |
| 2026-08-14 | [AUDIT] ReconciliationCommands.resolve() wrapped in _withLock | reconciliation.gs |
| 2026-08-14 | [AUDIT] DriverReportInbox: normalizeReport, acceptReport, rejectReport, lockReport wrapped in _withLock | driverReportInbox.gs |
| 2026-08-14 | [AUDIT] TransportList: fix rollback bug (original value), OperatingCompany filter MI→MM, rollback on error | TransportListScreen.tsx |
| 2026-08-14 | [AUDIT] Expense correct(): fix ExpenseDate (was expense.Date=undefined) + copy ProjectID | expenseCommands.gs |
| 2026-08-14 | [AUDIT] DriverReport totalExtras: include kmExtra + hoursExtra in total | api.ts |
| 2026-08-14 | [AUDIT] Reconciliation: fix Diaria value intera→piena (matches serviceEconomics) | ReconciliationScreen.tsx |
| 2026-08-14 | ExpenseScreen: exports Excel (CSV) + PDF (browser print) con filtros activos | ExpenseScreen.tsx |
| 2026-08-14 | RapportinoScreen: individual PDF export en detail modal | RapportinoScreen.tsx |
| 2026-08-14 | rapportinoCommands: usa ServiceCommands.facturarService() con _withLock | rapportinoCommands.gs |
| 2026-08-14 | DriverCell: phone input + creación de conductor nuevo desde dropdown | TransportListScreen.tsx |
| 2026-08-14 | Agregados filtros DateFrom/DateTo/Driver a InvoiceScreen + exports Excel/PDF | InvoiceScreen.tsx, api.ts, invoice.gs |
| 2026-08-14 | Agregados filtros DateFrom/DateTo/Status a PaymentsScreen + exports Excel/PDF | PaymentsScreen.tsx, api.ts, payment.gs |
| 2026-08-14 | Agregado campo ServiceID a InvoiceItemDTO y migración 007 | api.ts, invoiceItem.gs, migration.gs |
| 2026-08-14 | Driver Links: backend filters (projectId/status/startDate/endDate) + client-side search | driverLinks.gs, DriverLinksScreen.tsx, api.ts |
| 2026-08-03 | Agregados campos StartTime, EndTime, KmTotal, HasDiaria, DiariaType, IsFestivo, IsNotturno a Service y DriverReport | DOMAIN.md, ERD.md, WORKFLOWS.md, setup.gs |
| 2026-08-03 | Agregados functions reconcilePayment, correctExpense, DriverAdvance CRUD a frontend | api.ts, PaymentsScreen, ExpenseScreen, DriverAdvanceScreen |
| 2026-07-27 | Arquitectura inicial congelada (v9) | Todos los documentos |
