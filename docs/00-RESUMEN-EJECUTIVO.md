# RESUMEN EJECUTIVO — Especificación de Dominio ERP Transport

## Proyecto

Sistema ERP especializado para dos empresas de transporte de producciones audiovisuales:
- **Transport Action**
- **Movie Motion**

Stack: React (frontend) + Google Apps Script (backend) + Google Sheets (base de datos)

---

## Arquitectura del documento

```
docs/
├── 00-RESUMEN-EJECUTIVO.md       ← este archivo
├── 01-ERD.md                     ← diagrama visual de entidades
├── 02-DOMAIN.md                  ← qué representa cada entidad
├── 03-BUSINESS_RULES.md          ← qué puede y no puede pasar
├── 04-STATE_MACHINES.md          ← diagramas de estados
├── 05-WORKFLOWS.md               ← 10 procesos de extremo a extremo
├── 06-EVENTS.md                  ← catálogo de eventos
├── 07-INVARIANTS.md              ← 30+ propiedades invariantes
├── 08-PERMISSIONS.md             ← matriz de permisos por rol
├── 09-AGGREGATES.md              ← Aggregate Roots (DDD)
├── 10-COMMANDS.md                ← catálogo de operaciones
├── 11-CONCURRENCY.md             ← políticas de concurrencia
├── 12-INFRASTRUCTURE.md          ← Locked, _dispatchEvent, _generateId
├── 13-IMPLEMENTATION-BLUEPRINT.md ← contrato de entidades, repos, DTOs, flujo
├── 14-MIGRATIONS.md              ← política de migraciones (ScriptProperties)
├── 15-TESTING.md                 ← estrategia de tests
├── 16-CHANGELOG.md               ← convención para romper cambios
└── 17-CODING-STANDARDS.md        ← estándares de código
```

---

## Evolución del diseño

| Versión | Valoración | Enfoque |
|---------|-----------|---------|
| v4 | 7,5/10 | Listado de pantallas |
| v5 | 8,8/10 | Modelo relacional + inmutabilidad |
| v6 | 9,4/10 | Especificación de dominio |
| v7 | 9,6/10 | Reglas + workflows + eventos |
| **v8** | **9,8/10** | **Doble estado + events como notificación + permisos** |

---

## Conceptos clave

### 1. Service es el centro de todo

```
Project → TransportList → Service → DriverReport → Rapportino → Invoice → Payment
```

### 2. Doble estado en Service

```
OperationalStatus: Importado → Asignado → Confirmado → EnRuta → Realizado → Reportado → Revision → Validado
                    (also: Importado/Asignado/Confirmado/EnRuta → Cancelado — terminal)
FinancialStatus:   Pendiente → Calculado → Confrontacion/ActualsConfirmados → Aprobado → Facturable → Facturado → Cobrado → Cerrado → CerradoComercial
```

### 3. Separación Operativo vs Contable

**Operativo (mutable):**
- Service, Driver, Vehicle, Project, Client, Contact, DriverRate, RateCard, Change, DriverReport

**Contable (inmutable una vez confirmado):**
- ServiceRevenueBreakdown, ServiceCostBreakdown, RapportinoItems, InvoiceItems, Invoice, Payment, Expense

### 4. Events como notificación

```
Command (ACCIONA) → _dispatchEvent() → Listeners (NOTIFICAN)
```

Los listeners solo generan ActivityFeed y AuditLog. Nunca modifican entidades contables.

### 5. Inmutabilidad congelada

- Breakdowns → frozen al validar servicio
- RapportinoItems → LockedAmount al facturar
- InvoiceItems → inmutables desde creación
- Invoice → montos frozen al emitir
- Payment → frozen al confirmar
- Expense → frozen al confirmar

---

## Entidades (38 en total)

| # | Entidad | Contable | Inmutable al crear |
|---|---------|----------|-------------------|
| 1 | OperatingCompany | No | No |
| 2 | Settings | No | No |
| 3 | Sequence | No | Yes (append-only) |
| 4 | Client | No | No |
| 5 | Contact | No | No |
| 6 | Project | No | No |
| 7 | TransportList | No | Yes |
| 8 | Service | No | No |
| 9 | ServiceRevenueBreakdown | Yes | No (frozen al validar) |
| 10 | ServiceCostBreakdown | Yes | No (frozen al validar) |
| 11 | DriverReport | No | No (frozen al aprobar/rechazar) |
| 12 | Driver | No | No |
| 13 | DriverRate | No | No |
| 14 | DriverAdvance | No | No (frozen al descontar) |
| 15 | Vehicle | No | No |
| 16 | RateCard | No | No |
| 17 | RapportinoClient | Yes | No (frozen al facturar) |
| 18 | RapportinoItem | Yes | No (LockedAmount frozen) |
| 19 | RapportinoDriver | Yes | No (frozen al pagar) |
| 20 | Invoice | Yes | No (frozen al emitir) |
| 21 | InvoiceItem | Yes | Yes |
| 22 | Payment | Yes | No (frozen al confirmar) |
| 23 | Expense | Yes | No (frozen al confirmar) |
| 24 | Change | No | No |
| 25 | Document | No | Yes |
| 26 | AuditLog | No | Yes (append-only) |
| 27 | ActivityFeed | No | Yes (append-only) |
| 28 | Collaborator | No | No |
| 29 | SupplierRate | No | No |
| 30 | RapportinoCollaborator | Yes | No (frozen al pagar) |
| 31 | RapportinoCollaboratorItem | Yes | No (LockedAmount frozen) |
| 32 | User | No | No |
| 33 | DriverLink | No | No |
| 34 | DriverLinkResponse | No | Yes |
| 35 | DriverLinkEvent | No | Yes (append-only) |
| 36 | DriverReportInbox | No | No |
| 37 | Presence | No | No |
| 38 | Reconciliation | No | No |

---

## Reglas de negocio (40+)

### Las más importantes

| ID | Regla | Tipo |
|----|-------|------|
| S006 | Validado requiere DriverReport aceptado + Breakdowns | Command |
| S007 | No retroceso después de Validado | Query |
| D003 | Aprobación crea CostBreakdown con Source="driver_report" | Command |
| R002 | Facturar rapportino congela items + crea InvoiceItems | Command |
| I002 | InvoiceNumber se genera al emitir, no al crear | Command |
| I003 | Montos inmutables después de emitir | Query |
| P001 | Payment registrado NO afecta Invoice | Command |
| P002 | Payment confirmado SÍ recalcula saldo | Command |
| E001 | Expense Draft editable, Confirmed inmutable | Command |
| EDGE001 | No anular factura con pagos | Query |

---

## Workflows (10)

| # | Workflow | Entidades involucradas |
|---|----------|----------------------|
| 1 | Importar servicios | TransportList, Service |
| 2 | Asignar conductor | Service, Driver, Vehicle |
| 3 | Conductor informa | Service, DriverReport |
| 4 | Aprobar reporte | DriverReport, ServiceCostBreakdown |
| 5 | Validar servicio | Service, Breakdowns |
| 6 | Generar rapportino cliente | RapportinoClient, RapportinoItem |
| 7 | Facturar rapportino | RapportinoClient, Invoice, InvoiceItem |
| 8 | Emitir factura | Invoice |
| 9 | Registrar pago | Payment, Invoice |
| 10 | Generar rapportino conductor | RapportinoDriver, DriverAdvance |

---

## Invariantes (21)

### Los más críticos

| ID | Invariante |
|----|-----------|
| INV-001 | Invoice.Total = Subtotal + TaxAmount |
| INV-002 | Invoice.Subtotal = SUM(InvoiceItems) |
| INV-003 | Payments ≤ Invoice.Total |
| INV-005 | LockedAmount nunca cambia |
| INV-006 | Breakdowns frozen al validar |
| INV-007 | Máximo 1 DriverReport activo por servicio |
| INV-009 | Sequence siempre creciente |
| INV-012 | No retroceso contable |
| INV-013 | Invoice montos inmutables después de emitir |
| INV-020 | IDs con formato {Prefix}-{Year}-{Sequential} |

---

## Permisos (4 roles)

| Role | Alcance |
|------|---------|
| admin | Todo |
| coordinator | Operativo (servicios, conductores, proyectos) |
| accounting | Financiero (facturas, pagos, gastos) |
| driver | Solo sus servicios + crear reportes |

---

## Plan de implementación

### Bloque 1 — Documentación (10-12 horas)

| Paso | Qué | Tiempo |
|------|-----|--------|
| 1.1 | ERD definitivo | 1 h |
| 1.2 | DOMAIN.md | 1.5 h |
| 1.3 | BUSINESS_RULES.md | 2 h |
| 1.4 | STATE_MACHINES.md | 1.5 h |
| 1.5 | WORKFLOWS.md | 1.5 h |
| 1.6 | EVENTS.md | 1 h |
| 1.7 | INVARIANTS.md | 30 min |
| 1.8 | PERMISSIONS.md | 30 min |
| 1.9 | Enums compartidos backend/frontend | 30 min |
| 1.10 | State machine en código | 1 h |

### Bloque 2 — Modelo en código (12-15 horas)

| Paso | Qué | Tiempo |
|------|-----|--------|
| 2.1 | Sheet Settings + API | 30 min |
| 2.2 | Sheet Sequence + _generateId() con LockService | 1 h |
| 2.3 | Sheet OperatingCompany + API | 30 min |
| 2.4 | Sheet Clients + API | 1 h |
| 2.5 | Sheet Contacts + API | 45 min |
| 2.6 | Sheet Drivers (actualizar) + API | 45 min |
| 2.7 | Sheet DriverRate + API | 1 h |
| 2.8 | Sheet Vehicles + API | 1 h |
| 2.9 | Sheet RateCard (con campos nullable) + API | 1 h |
| 2.10 | Sheet Projects (actualizar con ClientID) + API | 45 min |
| 2.11 | Sheet AuditLog + _logAudit() | 30 min |
| 2.12 | Sheet Documents (con DocumentType) + API | 30 min |

### Bloque 3 — Núcleo operativo (15-20 horas)

| Paso | Qué | Tiempo |
|------|-----|--------|
| 3.1 | Sheet Services (doble estado) + API | 2 h |
| 3.2 | Sheet ServiceRevenueBreakdown (Source, Locked, ReferenceLineID) + API | 1.5 h |
| 3.3 | Sheet ServiceCostBreakdown (Source separado) + API | 1.5 h |
| 3.4 | calculateServiceRevenue() | 1 h |
| 3.5 | calculateServiceCost() | 1 h |
| 3.6 | calculateServiceProfit() | 30 min |
| 3.7 | Sheet DriverReport (Version, PreviousReportID) + API | 1.5 h |
| 3.8 | Sheet TransportList + API | 1 h |
| 3.9 | Sheet Changes (Priority, DueDate) + API | 1 h |
| 3.10 | Transiciones de estado + validaciones | 2 h |
| 3.11 | Integración TransportListScreen | 2 h |

### Bloque 4 — Flujo comercial (12-15 horas)

| Paso | Qué | Tiempo |
|------|-----|--------|
| 4.1 | Sheet RapportinoClient + API | 1.5 h |
| 4.2 | Sheet RapportinoDriver + API | 1.5 h |
| 4.3 | Sheet RapportinoItems (Amount + LockedAmount) + API | 1 h |
| 4.4 | Sheet DriverAdvance (RemainingAmount) + API | 1 h |
| 4.5 | Lógica de descuento de anticipos | 1 h |
| 4.6 | Sheet Invoices (InvoiceNumber al emitir) + API | 1.5 h |
| 4.7 | Sheet InvoiceItems (bridge, inmutable) + API | 1 h |
| 4.8 | Sheet Payments (afecta al confirmar) + API | 1.5 h |
| 4.9 | Integración Rapportino → Invoice → Payment | 2 h |
| 4.10 | Pantallas: Rapportino, Invoice, Payment | 3 h |

### Bloque 5 — Finanzas (10-15 horas)

| Paso | Qué | Tiempo |
|------|-----|--------|
| 5.1 | Sheet Expenses (OwnerType + OwnerID + AccountingDate + Draft/Confirmed) + API | 1.5 h |
| 5.2 | apiGetCashFlow() (vista) | 1 h |
| 5.3 | calculateProjectProfit() | 1 h |
| 5.4 | calculateCompanyProfit() | 1 h |
| 5.5 | Sheet ActivityFeed (desde _dispatchEvent) | 1 h |
| 5.6 | _dispatchEvent() central con listeners | 2 h |
| 5.7 | Pantallas: CashFlow, Expenses, Profit | 3 h |

### Bloque 6 — Integración y pruebas (15-25 horas)

| Paso | Qué | Tiempo |
|------|-----|--------|
| 6.1 | Dashboard con KPIs calculados bajo demanda | 3 h |
| 6.2 | Buscador global | 2 h |
| 6.3 | Sidebar reorganizado por secciones | 1.5 h |
| 6.4 | Migración de datos existentes | 3 h |
| 6.5 | Escenario 1: Flujo completo | 2 h |
| 6.6 | Escenario 2: Estrés (50 servicios, 10 rapportinos, 5 facturas) | 2 h |
| 6.7 | Escenario 3: Pago parcial + vencimiento | 1.5 h |
| 6.8 | Escenario 4: Corrección post-validación (ajuste) | 1.5 h |
| 6.9 | Corrección de efectos secundarios | 3-5 h |
| 6.10 | Deploy y validación | 2 h |

---

## Resumen total

| Bloque | Tiempo |
|--------|--------|
| 1 — Documentación | 10-12 h |
| 2 — Modelo en código | 12-15 h |
| 3 — Núcleo operativo | 15-20 h |
| 4 — Flujo comercial | 12-15 h |
| 5 — Finanzas | 10-15 h |
| 6 — Integración y pruebas | 15-25 h |
| **Total** | **74-102 horas** |

---

## Cambios vs versiones anteriores

| v7 | v8 | Por qué |
|----|----|---------|
| InvoiceNumber al crear | InvoiceNumber al emitir | Borradores no consumen números |
| Sin versionado DriverReport | Version + PreviousReportID | Cadena histórica |
| Source="driver_report" mezclado | Source separado: driver_rate vs driver_report | Análisis limpio |
| Service con 10 estados | Doble estado: Operational + Financial | Independencia de mundos |
| Payment afecta al crear | Payment afecta al confirmar | Separación registro/confirmación |
| Expense inmutable siempre | Expense Draft/Confirmed/Cancelled | Permite corrección antes de confirmar |
| Events como acción | Events como notificación | Commands accionan, Events notifican |
| Sin PERMISSIONS | PERMISSIONS.md con matriz completa | Control de acceso |
| OperatingCompany como string | OperatingCompany como entidad | Formalidad |
| 7 documentos | 8 documentos | PERMISSIONS.md agregado |

---

## El paquete completo

Con esta especificación, cualquier desarrollador (o cualquier sesión de IA) podría implementar el sistema sin preguntar qué significa cada cosa. Todo está definido:

- **ERD**: modelo visual de entidades y relaciones
- **DOMAIN**: qué representa cada entidad, quién la crea, quién la modifica, cuándo se bloquea
- **BUSINESS_RULES**: qué puede y no puede pasar + efectos completos
- **STATE_MACHINES**: diagramas de estados y transiciones
- **WORKFLOWS**: 10 procesos de extremo a extremo
- **EVENTS**: catálogo completo de eventos y efectos
- **INVARIANTS**: 21 propiedades que siempre se cumplen
- **PERMISSIONS**: matriz de permisos por rol

Eso es una **especificación de dominio completa** para un ERP de complejidad media.
