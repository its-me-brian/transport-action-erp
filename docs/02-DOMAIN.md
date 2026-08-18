# DOMAIN.md — Definición de entidades

> **Última actualización:** 2026-08-03 — Se agregaron campos de conductor a DriverReport y Service (ver changelog al final del archivo)

## OperatingCompany

**Qué representa:** Una de las dos empresas del grupo (Transport Action o Movie Motion).

**Quién la crea:** Solo admin, desde Settings.

**Quién la modifica:** Solo admin.

**Cuándo se bloquea:** Nunca (se puede editar siempre, pero el ID es inmutable).

**Campos:**
- ID: string (ej: "TA", "MM") — inmutable
- Name: string
- VAT: string
- Address: string
- Phone: string
- Email: string
- Currency: string (ej: "EUR")
- DefaultTaxRate: number
- Active: boolean
- CreatedAt: timestamp
- UpdatedAt: timestamp

---

## Settings

**Qué representa:** Configuración del sistema.

**Quién la crea:** Sistema al inicializar.

**Quién la modifica:** Admin.

**Cuándo se bloquea:** Nunca.

**Campos:**
- ID: auto
- Category: "business" | "system"
- Key: string (unique)
- Value: string
- UpdatedAt: timestamp

**Valores iniciales:**
- business / IVA / "21"
- business / Currency / "EUR"
- business / TimeZone / "Europe/Madrid"
- business / ActiveCompany / "TA"
- system / GoogleFolder / ""
- system / SMTP / ""

---

## Sequence

**Qué representa:** Generador de IDs secuenciales por entidad + empresa + año.

**Quién la crea:** Sistema (auto-incremental).

**Quién la modifica:** Solo _generateId().

**Cuándo se bloquea:** Nunca (pero solo se modifica con LockService).

**Campos:**
- Entity: string ("Invoice", "Service", "Project", ...)
- OperatingCompany: string ("TA", "MM")
- Year: number
- Next: number

**Clave:** Entity + OperatingCompany + Year

---

## Client

**Qué representa:** El cliente que paga los servicios.

**Quién la crea:** Coordinator o Admin.

**Quién la modifica:** Coordinator o Admin.

**Cuándo se bloquea:** Nunca.

**Campos:**
- ID: auto (CLI-YYYY-NNNNN)
- Name: string
- Type: "production" | "direct" | "agency"
- VAT: string
- Address: string
- Phone: string
- Email: string
- PaymentTerms: number (días)
- Notes: string
- Active: boolean
- CreatedAt: timestamp
- UpdatedAt: timestamp

---

## Contact

**Qué representa:** Contactos del cliente.

**Quién la crea:** Coordinator o Admin.

**Quién la modifica:** Coordinator o Admin.

**Cuándo se bloquea:** Nunca.

**Campos:**
- ID: auto
- ClientID: → Client
- Name: string
- Role: string
- Phone: string
- Email: string
- WhatsApp: string
- Notes: string
- Active: boolean
- CreatedAt: timestamp
- UpdatedAt: timestamp

---

## Project

**Qué representa:** Un proyecto de producción que agrupa servicios de transporte.

**Quién la crea:** Coordinator o Admin.

**Quién la modifica:** Coordinator o Admin.

**Cuándo se bloquea:** Cuando Status = "Archiviado".

**Campos:**
- ID: auto (PRJ-YYYY-NNNNN)
- ClientID: → Client
- Name: string
- OperatingCompany: → OperatingCompany.ID
- Coordinator: string
- Status: "Nuovo" | "Preparazione" | "Attivo" | "Fatturazione" | "Incasso" | "Chiuso" | "Archiviato"
- DateFrom: date
- DateTo: date
- Notes: string
- CreatedAt: timestamp
- UpdatedAt: timestamp

**Estado:** ver STATE_MACHINES.md

---

## TransportList

**Qué representa:** Una importación de Excel con servicios.

**Quién la crea:** Coordinator (vía upload).

**Quién la modifica:** Nunca (solo lectura después de crear).

**Cuándo se bloquea:** Siempre (inmutable después de crear).

**Campos:**
- ID: auto
- ProjectID: → Project
- FileName: string
- ImportDate: timestamp
- Production: string
- ProjectName: string
- TransportCompany: string
- TotalServices: number
- ImportedBy: string
- Notes: string
- CreatedAt: timestamp

---

## Service

**Qué representa:** Un servicio de transporte individual. Entidad central del sistema.

**Quién la crea:** Sistema (al importar) o Coordinator.

**Quién la modifica:** Coordinator, Admin, Driver (campos específicos).

**Cuándo se bloquea:** Cuando OperationalStatus = "Validado" (parcial) o FinancialStatus = "Cerrado" (total).

**Campos:**
- ID: auto (SVC-YYYY-NNNNN)
- ProjectID: → Project
- TransportListID: → TransportList (nullable)
- Date: date
- Time: time
- Production: string
- Section: string

- PassengerName: string
- PassengerRole: string
- PassengerPhone: string
- PassengerDepartment: string

- PickupLines: string[] (JSON array)
- DropoffLines: string[] (JSON array)
- FlightInfo: string
- Notes: string

- DriverID: → Driver (nullable)
- VehicleID: → Vehicle (nullable)

- OperationalStatus: "Importado" | "Asignado" | "Confirmado" | "EnRuta" | "Realizado" | "Reportado" | "Revision" | "Validado" | "Cancelado"
- FinancialStatus: "Pendiente" | "Calculado" | "Confrontacion" | "ActualsConfirmados" | "Aprobado" | "Facturable" | "Facturado" | "Cobrado" | "Cerrado" | "CerradoComercial"

- EstimatedRevenue: number (nullable, planificación)
- EstimatedCost: number (nullable, planificación)

- OperatingCompany: → OperatingCompany.ID
- Normalized: boolean
- CreatedAt: timestamp
- UpdatedAt: timestamp

**Campos extendidos (copiados de DriverReport al aprobar):**
- StartTime: string (hora real de inicio)
- EndTime: string (hora real de fin)
- KmTotal: number (km totales recorridos)
- HasDiaria: boolean
- DiariaType: "piena" | "mezza" | "none"
- IsFestivo: boolean
- IsNotturno: boolean

**Relaciones:**
- → Project (muchos a uno)
- → TransportList (muchos a uno)
- → Driver (muchos a uno)
- → Vehicle (muchos a uno)
- ← ServiceRevenueBreakdown (uno a muchos)
- ← ServiceCostBreakdown (uno a muchos)
- ← DriverReport (uno a uno)
- ← RapportinoItem (muchos a uno)

---

## ServiceRevenueBreakdown

**Qué representa:** Detalle de ingresos de un servicio. Congelado al validar.

**Quién la crea:** Coordinator o sistema (al importar, al asignar tarifa).

**Quién la modifica:** Solo antes de validar. Después, solo vía ajustes.

**Cuándo se bloquea:** Cuando Service.OperationalStatus = "Validado".

**Campos:**
- ID: auto
- ServiceID: → Service
- ItemType: string ("Transfer", "HalfDay", "FullDay", "Night", "Holiday", "Wait", ...)
- Description: string
- Quantity: number
- UnitPrice: number
- Total: number (= Quantity × UnitPrice)
- RateCardID: → RateCard (nullable)
- Source: "rate_card" | "manual" | "adjustment" | "imported"
- ReferenceLineID: → ServiceRevenueBreakdown (nullable, para ajustes)
- Locked: boolean
- CreatedAt: timestamp

---

## ServiceCostBreakdown

**Qué representa:** Detalle de costos de un servicio. Congelado al validar.

**Quién la crea:** Sistema (al aprobar reporte) o Admin.

**Quién la modifica:** Solo antes de validar. Después, solo vía ajustes.

**Cuándo se bloquea:** Cuando Service.OperationalStatus = "Validado".

**Campos:**
- ID: auto
- ServiceID: → Service
- ItemType: string ("DriverBase", "Parking", "Tolls", "Fuel", "Wait", ...)
- Description: string
- Amount: number
- DriverID: → Driver (nullable)
- Source: "driver_rate" | "driver_report" | "manual" | "adjustment"
- ReferenceLineID: → ServiceCostBreakdown (nullable, para ajustes)
- Locked: boolean
- CreatedAt: timestamp

---

## DriverReport

**Qué representa:** Reporte del conductor sobre un servicio completado. Tiene dos partes: entrada del conductor y workflow administrativo.

**Quién la crea:** Driver.

**Quién la modifica:** Driver (antes de enviar), Admin (solo campos admin).

**Cuándo se bloquea:** Cuando Status = "Aceptado" o "Rechazado".

**Campos:**
- ID: auto
- ServiceID: → Service
- DriverID: → Driver

- Version: number (1, 2, 3...)
- PreviousReportID: → DriverReport (nullable)

- StartTime: string (hora real de inicio — conductor reporta)
- EndTime: string (hora real de fin — conductor reporta)
- KmTotal: number (km totales recorridos — conductor reporta)
- HasDiaria: boolean (si tiene diaria — conductor reporta)
- DiariaType: "piena" | "mezza" | "none" (tipo de diaria — conductor reporta)
- IsFestivo: boolean (si es día festivo — conductor reporta)
- IsNotturno: boolean (si es turno nocturno — conductor reporta)

- KmExtra: number
- HoursExtra: number
- Parking: number
- Tolls: number
- Fuel: number
- WaitMinutes: number
- Notes: string

- Status: "Pendiente" | "Aceptado" | "Rechazado"
- ApprovedBy: string (nullable)
- ApprovedDate: timestamp (nullable)
- RejectedReason: string (nullable)
- Locked: boolean

- SubmittedAt: timestamp
- CreatedAt: timestamp

---

## Driver

**Qué representa:** Un conductor del sistema.

**Quién la crea:** Admin o Coordinator.

**Quién la modifica:** Admin o Coordinator.

**Cuándo se bloquea:** Nunca.

**Campos:**
- ID: auto (DRV-YYYY-NNNNN)
- Name: string
- Type: "interno" | "freelance"
- Phone: string
- WhatsApp: string
- Email: string
- IBAN: string
- VehiclePreferred: string
- LicenseType: string
- LicenseExpiry: date
- Status: "Disponible" | "Asignado" | "Inactivo"
- OperatingCompany: → OperatingCompany.ID
- Notes: string
- Source: string
- LastUsed: timestamp
- TotalRides: number
- CreatedAt: timestamp
- UpdatedAt: timestamp

---

## DriverRate

**Qué representa:** Tarifas de un conductor por tipo de vehículo.

**Quién la crea:** Admin.

**Quién la modifica:** Admin.

**Cuándo se bloquea:** Nunca.

**Campos:**
- ID: auto
- DriverID: → Driver
- VehicleType: "Transfer" | "HalfDay" | "FullDay" | "Van" | "Minibus" | "Bus"
- TransferRate: number
- HalfDayRate: number
- FullDayRate: number
- NightExtra: number
- HolidayExtra: number
- WaitHourRate: number
- Active: boolean
- CreatedAt: timestamp
- UpdatedAt: timestamp

---

## DriverAdvance

**Qué representa:** Adelantos de dinero al conductor.

**Quién la crea:** Admin o Accounting.

**Quién la modifica:** Admin o Accounting.

**Cuándo se bloquea:** Cuando Status = "Descontado".

**Campos:**
- ID: auto
- DriverID: → Driver
- ProjectID: → Project (nullable)
- Amount: number (monto original)
- RemainingAmount: number (saldo pendiente)
- Date: date
- Status: "Pendiente" | "ParcialmenteDescontado" | "Descontado"
- DeductedIn: → RapportinoDriver (nullable)
- Notes: string
- CreatedAt: timestamp

---

## Vehicle

**Qué representa:** Un vehículo del sistema.

**Quién la crea:** Admin.

**Quién la modifica:** Admin.

**Cuándo se bloquea:** Nunca.

**Campos:**
- ID: auto (VEH-YYYY-NNNNN)
- Plate: string
- Brand: string
- Model: string
- Type: "Transfer" | "HalfDay" | "FullDay" | "Van" | "Minibus" | "Bus"
- Ownership: "propio" | "alquilado" | "tercero"
- InsuranceExpiry: date
- InspectionExpiry: date
- Capacity: number
- Status: "Disponible" | "Asignado" | "Mantenimiento" | "Inactivo"
- DriverDefault: → Driver (nullable)
- OperatingCompany: → OperatingCompany.ID
- Notes: string
- CreatedAt: timestamp
- UpdatedAt: timestamp

---

## RateCard

**Qué representa:** Tarifario de precios.

**Quién la crea:** Admin.

**Quién la modifica:** Admin.

**Cuándo se bloquea:** Nunca.

**Campos:**
- ID: auto
- Name: string
- Category: string
- VehicleType: string
- BasePrice: number
- ExtraKmRate: number
- ExtraHourRate: number
- WaitRate: number
- NightFee: number
- HolidayFee: number
- HalfDayPrice: number
- FullDayPrice: number
- AirportSurcharge: number
- OperatingCompany: → OperatingCompany.ID
- Active: boolean
- Notes: string

- ClientID: → Client (nullable, futuro)
- ProjectID: → Project (nullable, futuro)
- ValidFrom: date (nullable, futuro)
- ValidTo: date (nullable, futuro)

- CreatedAt: timestamp
- UpdatedAt: timestamp

**Snapshot:** Cuando un Service crea una línea en ServiceRevenueBreakdown con Source="rate_card", guarda RateCardID. Si el RateCard cambia después, el servicio validado mantiene su snapshot histórico.

---

## RapportinoClient

**Qué representa:** Rapportino semanal de servicios para un cliente.

**Quién la crea:** Coordinator.

**Quién la modifica:** Coordinator, Accounting.

**Cuándo se bloquea:** Cuando Status = "Facturado".

**Campos:**
- ID: auto
- ProjectID: → Project
- ClientID: → Client
- WeekStart: date
- WeekEnd: date
- Status: "Borrador" | "Revisado" | "Enviado" | "Aceptado" | "Facturado"
- Notes: string
- CreatedBy: string
- CreatedAt: timestamp
- UpdatedAt: timestamp
- SentAt: timestamp (nullable)
- AcceptedAt: timestamp (nullable)

---

## RapportinoItems

**Qué representa:** Bridge entre RapportinoClient y Service. Monto congelado al facturar.

**Quién la crea:** Coordinator (al crear rapportino).

**Quién la modifica:** Solo antes de Facturado.

**Cuándo se bloquea:** Cuando RapportinoClient.Status = "Facturado".

**Campos:**
- ID: auto
- RapportinoClientID: → RapportinoClient
- ServiceID: → Service
- Amount: number
- LockedAmount: number (nullable, se llena al facturar)
- CreatedAt: timestamp

---

## RapportinoDriver

**Qué representa:** Rapportino semanal de servicios para un conductor.

**Quién la crea:** Coordinator.

**Quién la modifica:** Coordinator.

**Cuándo se bloquea:** Cuando Status = "Pagado".

**Campos:**
- ID: auto
- ProjectID: → Project
- DriverID: → Driver
- WeekStart: date
- WeekEnd: date
- Status: "Borrador" | "Revisado" | "Enviado" | "Aceptado" | "Pagado"
- Notes: string
- CreatedBy: string
- CreatedAt: timestamp
- UpdatedAt: timestamp
- SentAt: timestamp (nullable)
- PaidAt: timestamp (nullable)

---

## Invoice

**Qué representa:** Documento de facturación.

**Quién la crea:** Accounting (o sistema al facturar rapportino).

**Quién la modifica:** Accounting.

**Cuándo se bloquea:** Cuando Status ≠ "Borrador".

**Campos:**
- ID: auto (INV-UUID interno)
- InvoiceNumber: string (nullable, se genera al emitir)
- ProjectID: → Project
- ClientID: → Client
- Date: date (fecha de emisión)
- DueDate: date

- Subtotal: number (calculado)
- TaxRate: number (desde Settings.IVA)
- TaxAmount: number (calculado)
- Total: number (calculado)

- Currency: string
- Status: "Borrador" | "Emitida" | "Enviada" | "PagoParcial" | "Pagada" | "Vencida" | "Anulada"

- Notes: string
- VoidReason: string (nullable, si Status = "Anulada")
- CreatedBy: string
- CreatedAt: timestamp
- UpdatedAt: timestamp

**InvoiceNumber format:** {Prefix}-{OperatingCompany}-{Year}-{Sequential}
Ejemplo: INV-TA-2026-00045

---

## InvoiceItems

**Qué representa:** Bridge entre Invoice y RapportinoClient. Inmutables.

**Quién la crea:** Sistema (al facturar rapportino).

**Quién la modifica:** Nunca.

**Cuándo se bloquea:** Siempre (inmutables desde creación).

**Campos:**
- ID: auto
- InvoiceID: → Invoice
- RapportinoClientID: → RapportinoClient
- Amount: number
- CreatedAt: timestamp

---

## Payment

**Qué representa:** Pago de un Invoice.

**Quién la crea:** Accounting.

**Quién la modifica:** Accounting (solo antes de confirmar).

**Cuándo se bloquea:** Cuando Status = "Confirmado".

**Campos:**
- ID: auto (PAY-YYYY-NNNNN)
- InvoiceID: → Invoice
- ClientID: → Client
- Amount: number
- PaymentMethod: "transfer" | "cash" | "card" | "check"
- PaymentDate: date
- Reference: string
- Notes: string
- Status: "Registrado" | "Confirmado" | "Conciliado"
- CreatedBy: string
- CreatedAt: timestamp
- ConfirmedAt: timestamp (nullable)
- ReconciledAt: timestamp (nullable)

---

## Expense

**Qué representa:** Gasto de la empresa, proyecto, vehículo, servicio o conductor.

**Quién la crea:** Coordinator, Accounting, Admin.

**Quién la modifica:** Solo si Status = "Draft".

**Cuándo se bloquea:** Cuando Status = "Confirmed".

**Campos:**
- ID: auto (EXP-YYYY-NNNNN)
- OwnerType: "empresa" | "proyecto" | "vehiculo" | "servicio" | "conductor"
- OwnerID: string (ID de la entidad propietaria)
- Category: string
- Description: string
- Amount: number
- ExpenseDate: date (cuándo ocurrió)
- AccountingDate: date (cuándo se registra)
- Status: "Draft" | "Confirmed" | "Cancelled"
- ProjectID: → Project (nullable, análisis transversal)
- OperatingCompany: → OperatingCompany.ID
- CreatedBy: string
- CreatedAt: timestamp
- UpdatedAt: timestamp

---

## Change

**Qué representa:** Cambios de último momento en cualquier entidad.

**Quién la crea:** Cualquier usuario.

**Quién la modifica:** Admin o creador.

**Cuándo se bloquea:** Cuando Status = "Resolved".

**Campos:**
- ID: auto
- EntityType: string
- EntityID: string
- Type: "schedule" | "driver" | "vehicle" | "route" | "other"
- Description: string
- Priority: "Low" | "Medium" | "High" | "Critical"
- DueDate: date (nullable)
- Status: "Open" | "Resolved"
- CreatedBy: string
- CreatedAt: timestamp
- ResolvedAt: timestamp (nullable)
- ResolvedBy: string (nullable)
- Notes: string
- UpdatedAt: timestamp

---

## Document

**Qué representa:** Archivo asociado a cualquier entidad.

**Quién la crea:** Cualquier usuario.

**Quién la modifica:** Nadie (inmutable).

**Cuándo se bloquea:** Siempre.

**Campos:**
- ID: auto
- EntityType: string
- EntityID: string
- DocumentType: "Invoice" | "CMR" | "DriverLicense" | "Insurance" | "VehiclePhoto" | "Contract" | "Rapportino" | "Other"
- Filename: string
- URL: string
- FileSize: number
- MimeType: string
- UploadedBy: string
- CreatedAt: timestamp

---

## AuditLog

**Qué representa:** Registro de cambios. Generado desde _dispatchEvent.

**Quién la crea:** Sistema.

**Quién la modifica:** Nadie (append-only).

**Cuándo se bloquea:** Siempre.

**Campos:**
- ID: auto
- Timestamp: timestamp
- EntityType: string
- EntityID: string
- Action: string
- Field: string (nullable)
- OldValue: string (nullable)
- NewValue: string (nullable)
- User: string

---

## ActivityFeed

**Qué representa:** Feed de actividad legible. Generado desde _dispatchEvent.

**Quién la crea:** Sistema.

**Quién la modifica:** Nadie (append-only).

**Cuándo se bloquea:** Siempre.

**Campos:**
- ID: auto
- Timestamp: timestamp
- EventType: string
- EntityType: string
- EntityID: string
- Description: string
- User: string
- Metadata: string (JSON, nullable)

---

## Changelog

### 2026-08-03 — Campos de conductor agregados a DriverReport y Service

**Motivo:** Los conductores reportan datos que no estaban en la definición original de DriverReport. WhatsApp messages reales muestran que los conductores envían: hora inicio, hora fin, km totales, diaria, festivo, nocturno. Estos campos son necesarios para el flujo completo de rapportino.

**Cambios realizados:**

1. **DriverReport** — Se agregaron 7 campos:
   - `StartTime` (string) — Hora real de inicio del servicio
   - `EndTime` (string) — Hora real de fin del servicio
   - `KmTotal` (number) — Kilómetros totales recorridos
   - `HasDiaria` (boolean) — Si tiene diaria asignada
   - `DiariaType` ("piena" | "mezza" | "none") — Tipo de diaria
   - `IsFestivo` (boolean) — Si es día festivo
   - `IsNotturno` (boolean) — Si es turno nocturno

2. **Service** — Se agregaron 7 campos extendidos (copiados de DriverReport al aprobar reporte):
   - `StartTime`, `EndTime`, `KmTotal`, `HasDiaria`, `DiariaType`, `IsFestivo`, `IsNotturno`

3. **Workflow 3** (docs/05-WORKFLOWS.md) — Actualizado para incluir los nuevos campos en el proceso de reporte del conductor.

**Archivos afectados:**
- docs/02-DOMAIN.md (este archivo)
- docs/05-WORKFLOWS.md
- Transport Action Unified/infrastructure/setup.gs (Services sheet +7 columnas)
- Transport Action Unified/domain/service.gs (ServiceRepository.create/toDTO)
- Transport Action All/src/types.ts (Service interface)
- Transport Action All/src/components/DashboardScreen.tsx (fieldMap)

**Nota:** Estos campos NO existían en la definición original de ERD. Se agregaron porque el código los necesita para el flujo real de WhatsApp.
