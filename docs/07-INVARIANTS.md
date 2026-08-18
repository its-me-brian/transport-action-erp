# INVARIANTS.md — Propiedades que siempre se cumplen

Invariantes que TODO el sistema debe cumplir en todo momento.
Útil para pruebas automáticas y para detectar corrupción de datos.

---

## Invariantes de montos

### INV-001: Invoice total
```
Invoice.Total = Invoice.Subtotal + Invoice.TaxAmount
Invoice.TaxAmount = Invoice.Subtotal × Invoice.TaxRate
```

### INV-002: Invoice items
```
Invoice.Subtotal = SUM(InvoiceItems.Amount para ese Invoice)
```

### INV-003: Payment saldo
```
Para todo Invoice con Status ∈ {Enviada, PagoParcial, Vencida}:
  SUM(Payment.Amount donde InvoiceID = Invoice.ID y Status ∈ {Confirmado, Conciliado})
  ≤ Invoice.Total
```

### INV-004: Payment pagada
```
Si Invoice.Status = "Pagada":
  SUM(Payment.Amount donde InvoiceID = Invoice.ID y Status ∈ {Confirmado, Conciliado})
  ≥ Invoice.Total
```

### INV-005: RapportinoItems locked
```
Para todo RapportinoItem donde RapportinoClient.Status = "Facturado":
  LockedAmount = Amount
  LockedAmount nunca cambia después de eso
```

### INV-006: Breakdown locked
```
Para todo Service con OperationalStatus ∈ {Validado}:
  ServiceRevenueBreakdown: Locked = Yes para cada línea
  ServiceCostBreakdown: Locked = Yes para cada línea
```

---

## Invariantes de entidades

### INV-007: DriverReport único
```
Para todo Service:
  COUNT(DriverReport WHERE ServiceID = Service.ID AND Status ∈ {Pendiente, Aceptado}) ≤ 1
```

### INV-008: Expense propietario
```
Para todo Expense:
  EXACTAMENTE 1 (OwnerType, OwnerID)
```

### INV-009: Sequence monotónica
```
Para toda Sequence:
  Next es estrictamente creciente
  Nunca se decrementa
```

### INV-010: DriverAdvance positivo
```
Para todo DriverAdvance:
  RemainingAmount ≥ 0
  RemainingAmount ≤ Amount
```

---

## Invariantes de estado

### INV-011: Transiciones válidas
```
Para toda transición de estado:
  El estado destino está en la lista de transiciones válidas del estado origen
  (ver STATE_MACHINES.md)
```

### INV-012: No retroceso contable
```
Si Service.OperationalStatus ∈ {Validado}:
  Status nunca vuelve a valores anteriores

Si Service.FinancialStatus ∈ {Facturado, Cobrado, Cerrado}:
  Status nunca vuelve a valores anteriores
```

### INV-013: Invoice inmutabilidad
```
Si Invoice.Status ≠ "Borrador":
  Subtotal, TaxRate, TaxAmount, Total no cambian
```

### INV-014: Payment inmutabilidad
```
Si Payment.Status ∈ {Confirmado, Conciliado}:
  Ningún campo cambia
```

---

## Invariantes de integridad referencial

### INV-015: Service → Project
```
Todo Service tiene ProjectID que referencia un Project existente
```

### INV-016: Service → Driver
```
Si Service.OperationalStatus ∈ {Asignado, Confirmado, EnRuta, Realizado, Reportado, Validado}:
  Service.DriverID referencia un Driver existente con Status ∈ {Disponible, Asignado}
```

### INV-017: RapportinoItem → Service
```
Todo RapportinoItem tiene ServiceID que referencia un Service existente
```

### INV-018: InvoiceItem → RapportinoClient
```
Todo InvoiceItem tiene RapportinoClientID que referencia un RapportinoClient existente
```

### INV-019: Payment → Invoice
```
Todo Payment tiene InvoiceID que referencia un Invoice existente
```

---

## Invariantes de formato

### INV-020: ID format
```
Todo ID sigue el patrón: {Prefix}-{Year}-{Sequential}
Prefix ∈ {SVC, INV, PAY, RAP, DRV, VEH, PRJ, CLI, EXP, ...}
Year = año actual
Sequential = 5 dígitos, zero-padded
```

### INV-021: AccountingDate
```
Para todo Expense:
  AccountingDate ≥ ExpenseDate
```
