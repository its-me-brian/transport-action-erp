# ERD — Diagrama de Entidades y Relaciones

> **Última actualización:** 2026-08-03 — Service y DriverReport actualizados con campos de conductor (StartTime, EndTime, KmTotal, HasDiaria, DiariaType, IsFestivo, IsNotturno)

## Diagrama visual del modelo de datos

```
┌─────────────────────────────┐
│      OPERATING_COMPANY      │
│─────────────────────────────│
│ ID (PK)                     │
│ Name                        │
│ VAT                         │
│ Address                     │
│ Phone                       │
│ Email                       │
│ Currency                    │
│ DefaultTaxRate              │
│ Active                      │
│ CreatedAt                   │
│ UpdatedAt                   │
└──────────────┬──────────────┘
               │
               │ referenced by
               │
    ┌──────────┼──────────────────────────────────┐
    │          │                                  │
    │          ▼                                  ▼
┌───┴──────┐  ┌────────────┐  ┌──────────────┐  ┌────────────┐
│ SEQUENCE │  │  PROJECT   │  │   DRIVER     │  │  VEHICLE   │
│──────────│  │────────────│  │──────────────│  │────────────│
│ Entity   │  │ ID (PK)    │  │ ID (PK)      │  │ ID (PK)    │
│ OperCo.  │  │ ClientID──┐│  │ Name         │  │ Plate      │
│ Year     │  │ Name      ││  │ Type         │  │ Brand      │
│ Next     │  │ OperCo.───┼│  │ Phone        │  │ Model      │
└──────────┘  │ Coordin.  ││  │ WhatsApp     │  │ Type       │
              │ Status    ││  │ Email        │  │ Ownership  │
              │ DateFrom  ││  │ IBAN         │  │ Insurance  │
              │ DateTo    ││  │ LicenseType  │  │ Inspection │
              │ Notes     ││  │ LicenseExpiry│  │ Capacity   │
              │ CreatedAt ││  │ Status       │  │ Status     │
              │ UpdatedAt ││  │ OperCo.───┐  │  │ DriverDef. │
              └─────┬─────┘│  │ Notes     │  │  │ OperCo.───┐│
                    │      │  │ Source    │  │  │ Notes     ││
                    │      │  │ LastUsed  │  │  │ CreatedAt ││
                    │      │  │ TotalRides│  │  │ UpdatedAt ││
                    │      │  │ CreatedAt │  │  └───────────┘│
                    │      │  │ UpdatedAt │  │               │
                    │      │  └─────┬─────┘  │               │
                    │      │        │        │               │
                    │      │        ▼        │               │
                    │      │  ┌───────────┐  │               │
                    │      │  │DRIVER_RATE│  │               │
                    │      │  │───────────│  │               │
                    │      │  │ ID        │  │               │
                    │      │  │ DriverID  │  │               │
                    │      │  │ VehicleTy.│  │               │
                    │      │  │ Transfer  │  │               │
                    │      │  │ HalfDay   │  │               │
                    │      │  │ FullDay   │  │               │
                    │      │  │ Night     │  │               │
                    │      │  │ Holiday   │  │               │
                    │      │  │ WaitHour  │  │               │
                    │      │  │ Active    │  │               │
                    │      │  └───────────┘  │               │
                    │      │                 │               │
                    │      │        ▼        │               │
                    │      │  ┌───────────┐  │               │
                    │      │  │DRIVER_ADV │  │               │
                    │      │  │───────────│  │               │
                    │      │  │ ID        │  │               │
                    │      │  │ DriverID  │  │               │
                    │      │  │ ProjectID │  │               │
                    │      │  │ Amount    │  │               │
                    │      │  │ Remaining │  │               │
                    │      │  │ Date      │  │               │
                    │      │  │ Status    │  │               │
                    │      │  │ DeductedIn│  │               │
                    │      │  │ Notes     │  │               │
                    │      │  └───────────┘  │               │
                    │      │                 │               │
                    ▼      │                 │               │
              ┌──────────┐ │                 │               │
              │ CLIENT   │ │                 │               │
              │──────────│ │                 │               │
              │ ID (PK)  │ │                 │               │
              │ Name     │ │                 │               │
              │ Type     │ │                 │               │
              │ VAT      │ │                 │               │
              │ Address  │ │                 │               │
              │ Phone    │ │                 │               │
              │ Email    │ │                 │               │
              │ PayTerms │ │                 │               │
              │ Notes    │ │                 │               │
              │ Active   │ │                 │               │
              │ CreatedAt│ │                 │               │
              │ UpdatedAt│ │                 │               │
              └────┬─────┘ │                 │               │
                   │       │                 │               │
                   ▼       │                 │               │
              ┌──────────┐ │                 │               │
              │ CONTACT  │ │                 │               │
              │──────────│ │                 │               │
              │ ID       │ │                 │               │
              │ ClientID │ │                 │               │
              │ Name     │ │                 │               │
              │ Role     │ │                 │               │
              │ Phone    │ │                 │               │
              │ Email    │ │                 │               │
              │ WhatsApp │ │                 │               │
              │ Notes    │ │                 │               │
              │ Active   │ │                 │               │
              └──────────┘ │                 │               │
                           │                 │               │
                           ▼                 │               │
                    ┌────────────┐            │               │
                    │TRANSPORT_L.│            │               │
                    │────────────│            │               │
                    │ ID         │            │               │
                    │ ProjectID──┼────────────┘               │
                    │ FileName   │                            │
                    │ ImportDate │                            │
                    │ Production │                            │
                    │ ProjectName│                            │
                    │ TranspCo.  │                            │
                    │ TotalServ. │                            │
                    │ ImportedBy │                            │
                    │ Notes      │                            │
                    │ CreatedAt  │                            │
                    └─────┬──────┘                            │
                          │                                   │
                          ▼                                   │
                    ┌────────────┐                            │
                    │  SERVICE   │◄───────────────────────────┘
                    │────────────│
                    │ ID         │
                    │ ProjectID──┼──▶ Project
                    │ TranspLID──┼──▶ TransportList
                    │ Date       │
                    │ Time       │
                    │ Production │
                    │ Section    │
                    │ PassName   │
                    │ PassRole   │
                    │ PassPhone  │
                    │ PassDept   │
                    │ PickupLines│
                    │ DropoffLn. │
                    │ FlightInfo │
                    │ Notes      │
                    │ DriverID───┼──▶ Driver
                    │ VehicleID──┼──▶ Vehicle
                    │ OpStatus   │
                    │ FinStatus  │
                    │ EstRevenue │
                    │ EstCost    │
                    │ OperCo.    │
                    │ Normalized │
                     │ CreatedAt  │
                     │ UpdatedAt  │
                     │ StartTime  │ ← copiado de DriverReport al aprobar
                     │ EndTime    │ ← copiado de DriverReport al aprobar
                     │ KmTotal    │ ← copiado de DriverReport al aprobar
                     │ HasDiaria  │ ← copiado de DriverReport al aprobar
                     │ IsFestivo  │ ← copiado de DriverReport al aprobar
                     │ IsNotturno │ ← copiado de DriverReport al aprobar
                     │ DiariaType │ ← copiado de DriverReport al aprobar
                     └──┬──┬──┬──┘
                        │  │  │
           ┌────────────┘  │  └────────────────┐
          │               │                   │
          ▼               ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│ SVC_REVENUE_BR. │ │ SVC_COST_BREAKD.│ │  DRIVER_REPORT   │
│─────────────────│ │─────────────────│ │──────────────────│
│ ID              │ │ ID              │ │ ID               │
│ ServiceID       │ │ ServiceID       │ │ ServiceID        │
│ ItemType        │ │ ItemType        │ │ DriverID         │
│ Description     │ │ Description     │ │ Version          │
│ Quantity        │ │ Amount          │ │ PrevReportID     │
│ UnitPrice       │ │ DriverID        │ │ StartTime        │
│ Total           │ │ Source          │ │ EndTime          │
│ RateCardID      │ │ ReferenceLineID │ │ KmTotal          │
│ Source          │ │ Locked          │ │ HasDiaria        │
│ ReferenceLineID │ │ CreatedAt       │ │ IsFestivo        │
│ Locked          └─────────────────┘ │ IsNotturno       │
│ CreatedAt                           │ DiariaType       │
└─────────────────┘                   │ KmExtra          │
                                      │ HoursExtra       │
                                      │ Parking          │
                                      │ Tolls            │
                                      │ Fuel             │
                                      │ WaitMinutes      │
                                      │ Notes            │
                                      │ Status           │
                                      │ ApprovedBy       │
                                      │ ApprovedDate     │
                                      │ RejectedReason   │
                                      │ Locked           │
                                      │ SubmittedAt      │
                                      │ CreatedAt        │
                                      └────────┬─────────┘
                                                 │
                                                 │ referenced by
                                                 │
          ┌──────────────────────────────────────┘
          │
          ▼
┌───────────────────┐
│ RAPPORTINO_ITEMS  │
│───────────────────│
│ ID                │
│ RapportinoClntID──┼──▶ RAPPORTINO_CLIENT
│ ServiceID         │
│ Amount            │
│ LockedAmount      │
│ CreatedAt         │
└───────────────────┘

┌────────────────────────┐
│  RAPPORTINO_CLIENT     │
│────────────────────────│
│ ID                     │
│ ProjectID ──▶ Project  │
│ ClientID  ──▶ Client   │
│ WeekStart              │
│ WeekEnd                │
│ Status                 │
│ Notes                  │
│ CreatedBy              │
│ CreatedAt              │
│ UpdatedAt              │
│ SentAt                 │
│ AcceptedAt             │
└───────────┬────────────┘
            │
            │ referenced by
            ▼
┌───────────────────┐
│  INVOICE_ITEMS    │
│───────────────────│
│ ID                │
│ InvoiceID ──────┐ │
│ RapportinoClntID│ │
│ Amount          │ │
│ CreatedAt       │ │
└─────────────────┘ │
                    │
                    ▼
┌────────────────────────┐
│      INVOICE           │
│────────────────────────│
│ ID                     │
│ InvoiceNumber          │
│ ProjectID ──▶ Project  │
│ ClientID  ──▶ Client   │
│ Date                   │
│ DueDate                │
│ Subtotal               │
│ TaxRate                │
│ TaxAmount              │
│ Total                  │
│ Currency               │
│ Status                 │
│ Notes                  │
│ VoidReason             │
│ CreatedBy              │
│ CreatedAt              │
│ UpdatedAt              │
└───────────┬────────────┘
            │
            │ referenced by
            ▼
┌───────────────────┐
│     PAYMENT       │
│───────────────────│
│ ID                │
│ InvoiceID         │
│ ClientID          │
│ Amount            │
│ PaymentMethod     │
│ PaymentDate       │
│ Reference         │
│ Notes             │
│ Status            │
│ CreatedBy         │
│ CreatedAt         │
│ ConfirmedAt       │
│ ReconciledAt      │
└───────────────────┘

┌─────────────────────────┐
│       EXPENSE           │
│─────────────────────────│
│ ID                      │
│ OwnerType               │
│ OwnerID                 │
│ Category                │
│ Description             │
│ Amount                  │
│ ExpenseDate             │
│ AccountingDate          │
│ Status                  │
│ ProjectID (opcional)    │
│ OperatingCompany        │
│ CreatedBy               │
│ CreatedAt               │
│ UpdatedAt               │
└─────────────────────────┘

┌─────────────────────────┐
│       CHANGE            │
│─────────────────────────│
│ ID                      │
│ EntityType              │
│ EntityID                │
│ Type                    │
│ Description             │
│ Priority                │
│ DueDate                 │
│ Status                  │
│ CreatedBy               │
│ CreatedAt               │
│ ResolvedAt              │
│ ResolvedBy              │
│ Notes                   │
│ UpdatedAt               │
└─────────────────────────┘

┌─────────────────────────┐
│      DOCUMENT           │
│─────────────────────────│
│ ID                      │
│ EntityType              │
│ EntityID                │
│ DocumentType            │
│ Filename                │
│ URL                     │
│ FileSize                │
│ MimeType                │
│ UploadedBy              │
│ CreatedAt               │
└─────────────────────────┘

┌─────────────────────────┐
│      AUDIT_LOG          │
│─────────────────────────│
│ ID                      │
│ Timestamp               │
│ EntityType              │
│ EntityID                │
│ Action                  │
│ Field                   │
│ OldValue                │
│ NewValue                │
│ User                    │
└─────────────────────────┘

┌─────────────────────────┐
│    ACTIVITY_FEED        │
│─────────────────────────│
│ ID                      │
│ Timestamp               │
│ EventType               │
│ EntityType              │
│ EntityID                │
│ Description             │
│ User                    │
│ Metadata                │
└─────────────────────────┘

┌─────────────────────────┐
│      SETTINGS           │
│─────────────────────────│
│ ID                      │
│ Category                │
│ Key                     │
│ Value                   │
│ UpdatedAt               │
└─────────────────────────┘
```

## Relaciones principales

| Relación | Tipo | FK |
|----------|------|----|
| Client → Contact | 1:N | Contact.ClientID |
| Project → Client | N:1 | Project.ClientID |
| Project → OperatingCompany | N:1 | Project.OperatingCompany |
| TransportList → Project | N:1 | TransportList.ProjectID |
| Service → Project | N:1 | Service.ProjectID |
| Service → TransportList | N:1 | Service.TransportListID |
| Service → Driver | N:1 | Service.DriverID |
| Service → Vehicle | N:1 | Service.VehicleID |
| ServiceRevenueBreakdown → Service | N:1 | ServiceRevenueBreakdown.ServiceID |
| ServiceCostBreakdown → Service | N:1 | ServiceCostBreakdown.ServiceID |
| DriverReport → Service | 1:1 | DriverReport.ServiceID |
| DriverReport → Driver | N:1 | DriverReport.DriverID |
| DriverRate → Driver | N:1 | DriverRate.DriverID |
| DriverAdvance → Driver | N:1 | DriverAdvance.DriverID |
| DriverAdvance → Project | N:1 | DriverAdvance.ProjectID |
| RapportinoClient → Project | N:1 | RapportinoClient.ProjectID |
| RapportinoClient → Client | N:1 | RapportinoClient.ClientID |
| RapportinoItem → RapportinoClient | N:1 | RapportinoItem.RapportinoClientID |
| RapportinoItem → Service | N:1 | RapportinoItem.ServiceID |
| RapportinoDriver → Project | N:1 | RapportinoDriver.ProjectID |
| RapportinoDriver → Driver | N:1 | RapportinoDriver.DriverID |
| Invoice → Project | N:1 | Invoice.ProjectID |
| Invoice → Client | N:1 | Invoice.ClientID |
| InvoiceItem → Invoice | N:1 | InvoiceItem.InvoiceID |
| InvoiceItem → RapportinoClient | N:1 | InvoiceItem.RapportinoClientID |
| Payment → Invoice | N:1 | Payment.InvoiceID |
| Payment → Client | N:1 | Payment.ClientID |
| Expense → OperatingCompany | N:1 | Expense.OperatingCompany |
| Change → (cualquier entidad) | N:1 | Change.EntityType + EntityID |
| Document → (cualquier entidad) | N:1 | Document.EntityType + EntityID |

## Resumen de entidades

| Entidad | Tabla | Contable | Inmutable al crear |
|---------|-------|----------|-------------------|
| OperatingCompany | Yes | No | No |
| Settings | Yes | No | No |
| Sequence | Yes | No | Yes (append-only) |
| Client | Yes | No | No |
| Contact | Yes | No | No |
| Project | Yes | No | No |
| TransportList | Yes | No | Yes |
| Service | Yes | No | No |
| ServiceRevenueBreakdown | Yes | Yes | No (frozen al validar) |
| ServiceCostBreakdown | Yes | Yes | No (frozen al validar) |
| DriverReport | Yes | No | No (frozen al aprobar/rechazar) |
| Driver | Yes | No | No |
| DriverRate | Yes | No | No |
| DriverAdvance | Yes | No | No (frozen al descontar) |
| Vehicle | Yes | No | No |
| RateCard | Yes | No | No |
| RapportinoClient | Yes | Yes | No (frozen al facturar) |
| RapportinoItem | Yes | Yes | No (LockedAmount frozen al facturar) |
| RapportinoDriver | Yes | Yes | No (frozen al pagar) |
| Invoice | Yes | Yes | No (frozen al emitir) |
| InvoiceItem | Yes | Yes | Yes |
| Payment | Yes | Yes | No (frozen al confirmar) |
| Expense | Yes | Yes | No (frozen al confirmar) |
| Change | Yes | No | No |
| Document | Yes | No | Yes |
| AuditLog | Yes | No | Yes (append-only) |
| ActivityFeed | Yes | No | Yes (append-only) |
