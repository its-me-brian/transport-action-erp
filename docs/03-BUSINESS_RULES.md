# BUSINESS_RULES.md — Reglas de negocio

Cada regla tiene:
- **ID**: identificador único
- **Cuándo**: precondición
- **Qué**: qué está permitido/prohibido
- **Efectos**: qué ocurre cuando se cumple
- **Tipo**: Command (modifica estado) / Query (valida)

---

## OperatingCompany

### Rule OC001: Secuencia por empresa

**Cuándo:** Se genera un ID secuencial

**Qué:** La secuencia es por Entity + OperatingCompany + Year

**Efectos:**
- Cada empresa tiene numeración independiente
- Ejemplo: INV-TA-2026-00045 y INV-MM-2026-00012

**Tipo:** Query (lógica de generación)

---

## Services — OperationalStatus

### Rule S001: Transición a Asignado

**Cuándo:** Se asigna conductor a servicio

**Qué:** Service.OperationalStatus puede pasar de "Importado" a "Asignado" solo si:
- DriverID es válido
- VehicleID es válido

**Efectos:**
- Service.DriverID = driverId
- Service.VehicleID = vehicleId
- Service.OperationalStatus = "Asignado"
- Driver.Status = "Asignado"
- _dispatchEvent('service.assigned')

**Tipo:** Command

---

### Rule S002: Transición a Confirmado

**Cuándo:** Se confirma un servicio asignado

**Qué:** Solo si OperationalStatus = "Asignado"

**Efectos:**
- Service.OperationalStatus = "Confirmado"
- _dispatchEvent('service.confirmed')

**Tipo:** Command

---

### Rule S003: Transición a EnRuta

**Cuándo:** El conductor inicia el servicio

**Qué:** Solo si OperationalStatus = "Confirmado"

**Efectos:**
- Service.OperationalStatus = "EnRuta"
- _dispatchEvent('service.started')

**Tipo:** Command

---

### Rule S004: Transición a Realizado

**Cuándo:** El conductor completa el servicio

**Qué:** Solo si OperationalStatus = "EnRuta"

**Efectos:**
- Service.OperationalStatus = "Realizado"
- _dispatchEvent('service.completed')

**Tipo:** Command

---

### Rule S005: Transición a Reportado

**Cuándo:** Se crea un DriverReport para el servicio

**Qué:** Solo si OperationalStatus = "Realizado" y no existe DriverReport activo

**Efectos:**
- Service.OperationalStatus = "Reportado"
- DriverReport.Status = "Pendiente"
- _dispatchEvent('report.submitted')

**Tipo:** Command

---

### Rule S006: Transición a Validado

**Cuándo:** Se valida un servicio

**Qué:** Service.OperationalStatus puede pasar de "Reportado" a "Validado" solo si:
- Existe DriverReport con Status = "Aceptado"
- Service.DriverID es válido
- Service.VehicleID es válido
- ≥ 1 línea en ServiceRevenueBreakdown
- ≥ 1 línea en ServiceCostBreakdown

**Efectos:**
- Service.OperationalStatus = "Validado"
- Cada ServiceRevenueBreakdown → Locked = Yes
- Cada ServiceCostBreakdown → Locked = Yes
- _dispatchEvent('service.validated')

**Tipo:** Command

---

### Rule S007: No retroceso después de Validado

**Cuándo:** Service.OperationalStatus ∈ {Validado}

**Qué:** No puede volver a estados anteriores

**Efectos:**
- Rechazo: "Servicio ya validado. No se puede revertir."

**Tipo:** Query

---

## Services — FinancialStatus

### Rule SF001: Transición a Facturado

**Cuándo:** Se facturan servicios

**Qué:** Service.FinancialStatus puede pasar de "Pendiente" a "Facturado" solo si:
- Service.OperationalStatus = "Validado"
- Existe RapportinoItem con LockedAmount congelado para ese servicio

**Efectos:**
- Service.FinancialStatus = "Facturado"
- _dispatchEvent('service.facturado')

**Tipo:** Command

---

### Rule SF002: Transición a Cobrado

**Cuándo:** Se confirma el pago completo

**Qué:** Service.FinancialStatus puede pasar de "Facturado" a "Cobrado" solo si:
- Todos los Invoices que incluyen este servicio están pagados

**Efectos:**
- Service.FinancialStatus = "Cobrado"
- _dispatchEvent('service.cobrado')

**Tipo:** Command

---

### Rule SF003: Transición a Cerrado

**Cuándo:** Se cierra el servicio

**Qué:** Service.FinancialStatus puede pasar de "Cobrado" a "Cerrado"

**Efectos:**
- Service.FinancialStatus = "Cerrado"
- Servicio completamente cerrado
- _dispatchEvent('service.closed')

**Tipo:** Command

---

## ServiceRevenueBreakdown

### Rule SR001: Congelado al validar

**Cuándo:** Service.OperationalStatus → "Validado"

**Qué:** Todas las líneas Locked = Yes

**Efectos:**
- No se pueden editar ni eliminar
- Solo ajustes con Source = "adjustment"

**Tipo:** Command

---

### Rule SR002: Snapshot de RateCard

**Cuándo:** Se crea línea con Source = "rate_card"

**Qué:** Guardar RateCardID

**Efectos:**
- Si el RateCard cambia después, el servicio validado mantiene su snapshot histórico

**Tipo:** Query (lógica de creación)

---

## ServiceCostBreakdown

### Rule SC001: Congelado al validar

**Cuándo:** Service.OperationalStatus → "Validado"

**Qué:** Todas las líneas Locked = Yes

**Efectos:**
- No se pueden editar ni eliminar
- Solo ajustes con Source = "adjustment"

**Tipo:** Command

---

### Rule SC002: Dos fuentes de costo

**Cuándo:** Se crea línea de costo

**Qué:** Source debe ser "driver_rate" (tarifa base) o "driver_report" (extras)

**Efectos:**
- Separación clara para análisis: "¿Cuánto en peajes?" vs "¿Cuánto en tarifas?"

**Tipo:** Query

---

## DriverReport

### Rule D001: Un solo activo por servicio

**Cuándo:** Se crea un DriverReport

**Qué:** Máximo 1 con Status ∈ {Pendiente, Aceptado} por servicio

**Efectos:**
- Si ya existe uno activo, rechazar creación

**Tipo:** Query

---

### Rule D002: Versionado

**Cuándo:** Se crea un nuevo DriverReport para un servicio que ya tuvo uno rechazado

**Qué:** Asignar Version = anterior + 1, PreviousReportID = reporte anterior

**Efectos:**
- Cadena histórica completa: v1 → v2 → v3

**Tipo:** Command

---

### Rule D003: Aprobación

**Cuándo:** Se aprueba un DriverReport

**Qué:** Solo si Status = "Pendiente"

**Efectos:**
- DriverReport.Status = "Aceptado"
- DriverReport.ApprovedBy = usuario actual
- DriverReport.ApprovedDate = now
- DriverReport.Locked = Yes
- Crear ServiceCostBreakdown:
  - Parking → Source = "driver_report", ItemType = "Parking"
  - Tolls → Source = "driver_report", ItemType = "Tolls"
  - Fuel → Source = "driver_report", ItemType = "Fuel"
  - WaitMinutes → Source = "driver_report", ItemType = "Wait"
  - (NO "driver_rate" — esos son extras reportados, no tarifa base)
- _dispatchEvent('report.approved')

**Tipo:** Command

---

### Rule D004: Rechazo

**Cuándo:** Se rechaza un DriverReport

**Qué:** Solo si Status = "Pendiente"

**Efectos:**
- DriverReport.Status = "Rechazado"
- DriverReport.RejectedReason = motivo
- DriverReport.Locked = Yes
- Driver puede crear nuevo reporte (será Version + 1)
- _dispatchEvent('report.rejected')

**Tipo:** Command

---

## RapportinoClient

### Rule R001: Ciclo de vida

**Borrador → Revisado → Enviado → Aceptado → Facturado**

| Transición | Precondición | Efectos |
|-----------|-------------|---------|
| Borrador → Revisado | ≥ 1 ítem, todos Amount > 0 | _dispatchEvent |
| Revisado → Enviado | — | SentAt = now |
| Enviado → Aceptado | — | AcceptedAt = now |
| Aceptado → Facturado | Ver R002 | Ver R002 |

**Tipo:** Command

---

### Rule R002: Efecto Facturado

**Cuándo:** RapportinoClient → Facturado

**Qué:** Proceso completo de facturación

**Efectos:**
1. Cada RapportinoItem → LockedAmount = Amount
2. Crear InvoiceItems (1 por RapportinoItem)
3. Si no existe Invoice en Borrador para Project+Client:
   - Crear Invoice
   - Status = "Borrador"
   - InvoiceNumber = null (se genera al emitir)
4. Si ya existe Invoice en Borrador:
   - Agregar InvoiceItems a ese Invoice
5. Recalcular Invoice.Subtotal, TaxAmount, Total
6. RapportinoClient.Status = "Facturado"
7. _dispatchEvent('rapportino_client.facturado')

**Tipo:** Command

---

## RapportinoDriver

### Rule RD001: Ciclo de vida

**Borrador → Revisado → Enviado → Aceptado → Pagado**

| Transición | Precondición | Efectos |
|-----------|-------------|---------|
| Borrador → Revisado | ≥ 1 servicio asignado | _dispatchEvent |
| Revisado → Enviado | — | SentAt = now |
| Enviado → Aceptado | — | — |
| Aceptado → Pagado | Ver RD002 | Ver RD002 |

**Tipo:** Command

---

### Rule RD002: Efecto Pagado

**Cuándo:** RapportinoDriver → Pagado

**Qué:** Crear anticipos

**Efectos:**
1. Crear DriverAdvance:
   - Amount = monto acordado
   - RemainingAmount = amount
   - Status = "Pendiente"
2. RapportinoDriver.Status = "Pagado"
3. _dispatchEvent('rapportino_driver.pagado')

**Tipo:** Command

---

## Invoices

### Rule I001: Ciclo de vida

**Borrador → Emitida → Enviada → PagoParcial → Pagada → Vencida → Anulada**

| Transición | Precondición | Efectos |
|-----------|-------------|---------|
| Borrador → Emitida | ≥ 1 item, Total > 0 | InvoiceNumber = Sequence() |
| Borrador → Anulada | Sin items | Motivo requerido |
| Emitida → Enviada | — | — |
| Emitida → Anulada | Sin pagos | Motivo requerido |
| Enviada → PagoParcial | Pago parcial confirmado | — |
| Enviada → Pagada | Pago completo confirmado | — |
| Enviada → Vencida | DueDate < hoy | — |
| PagoParcial → Pagado | Saldo = 0 | — |
| PagoParcial → Vencida | DueDate < hoy | — |
| Vencida → Pagado | Pago completo confirmado | — |

**Tipo:** Command

---

### Rule I002: InvoiceNumber se genera al emitir

**Cuándo:** Borrador → Emitida

**Qué:** Generar InvoiceNumber

**Efectos:**
- InvoiceNumber = Sequence('Invoice', OperatingCompany)
- Formato: INV-{OC}-{Year}-{Sequential}
- Borradores abandonados no consumen números

**Tipo:** Command

---

### Rule I003: Montos inmutables después de emitir

**Cuándo:** Invoice.Status ≠ "Borrador"

**Qué:** Subtotal, TaxRate, TaxAmount, Total no se modifican

**Efectos:**
- Para correcciones: Invoice nuevo + anular el anterior

**Tipo:** Query

---

### Rule I004: Cálculo automático

**Cuándo:** Se agrega o elimina un InvoiceItem

**Qué:** Recalcular montos

**Efectos:**
- Invoice.Subtotal = SUM(InvoiceItems.Amount)
- Invoice.TaxAmount = Invoice.Subtotal × Invoice.TaxRate
- Invoice.Total = Invoice.Subtotal + Invoice.TaxAmount

**Tipo:** Command

---

## Payments

### Rule P001: Afecta Invoice solo al confirmar

**Cuándo:** Se crea un Payment

**Qué:** Payment.Status = "Registrado". Invoice NO cambia.

**Efectos:**
- Invoice intacto hasta que Payment se confirme

**Tipo:** Command

---

### Rule P002: Confirmación actualiza saldo

**Cuándo:** Payment.Status → "Confirmado"

**Qué:** Recalcular saldo del Invoice

**Efectos:**
- Saldo = Invoice.Total - SUM(Payments confirmados)
- Si Saldo = 0 → Invoice.Status = "Pagada"
- Si Saldo > 0 → Invoice.Status = "PagoParcial"
- _dispatchEvent('payment.confirmed')

**Tipo:** Command

---

### Rule P003: Conciliación

**Cuándo:** Payment.Status → "Conciliado"

**Qué:** Verificar contra extracto bancario

**Efectos:**
- Payment.ReconciledAt = now
- _dispatchEvent('payment.reconciled')

**Tipo:** Command

---

### Rule P004: Monto

**Cuándo:** Se registra un Payment

**Qué:** Amount ≤ saldo pendiente del Invoice

**Saldo pendiente = Invoice.Total - SUM(Payments confirmados para ese Invoice)**

**Efectos:**
- Si Amount > saldo: rechazar con "Monto excede saldo pendiente"

**Tipo:** Query

---

### Rule P005: Inmutabilidad después de confirmar

**Cuándo:** Payment.Status ∈ {Confirmado, Conciliado}

**Qué:** Ningún campo se modifica

**Efectos:**
- Ninguno

**Tipo:** Query

---

## Expenses

### Rule E001: Draft editable

**Cuándo:** Expense.Status = "Draft"

**Qué:** Se puede editar cualquier campo

**Efectos:**
- Ninguno

**Tipo:** Command

---

### Rule E002: Confirmación

**Cuándo:** Expense.Status → "Confirmed"

**Qué:** Se congela

**Efectos:**
- Expense Status = "Confirmed"
- Inmutable
- _dispatchEvent('expense.confirmed')

**Tipo:** Command

---

### Rule E003: Cancelación

**Cuándo:** Expense.Status → "Cancelled"

**Qué:** Anular gasto

**Efectos:**
- Expense Status = "Cancelled"
- No contabiliza
- _dispatchEvent('expense.cancelled')

**Tipo:** Command

---

### Rule E004: AccountingDate

**Cuándo:** Se crea o modifica un Expense

**Qué:** AccountingDate ≥ ExpenseDate

**Efectos:**
- Si AccountingDate < ExpenseDate: rechazar

**Tipo:** Query

---

### Rule E005: Propietario único

**Cuándo:** Se crea un Expense

**Qué:** Exactamente 1 OwnerType + OwnerID

**Efectos:**
- ProjectID es opcional (solo para análisis transversal)

**Tipo:** Query

---

### Rule E006: Corrección

**Cuándo:** Se necesita corregir un Expense confirmado

**Qué:** Crear Expense nuevo con monto opuesto + nuevo con monto correcto

**Efectos:**
- 2 Expenses nuevos (uno negativo, uno positivo)
- Referencia al original en Notes

**Tipo:** Command

---

## Breakdowns

### Rule B001: Congelado al validar

**Cuándo:** Service.OperationalStatus → "Validado"

**Qué:** Todas las líneas Locked = Yes

**Efectos:**
- Solo ajustes después

**Tipo:** Command

---

### Rule B002: Ajustes

**Cuándo:** Se necesita corregir un Breakdown congelado

**Qué:** Crear nueva línea

**Efectos:**
- Source = "adjustment"
- ReferenceLineID = línea original (nullable)
- Línea original permanece Locked

**Tipo:** Command

---

### Rule B003: Cálculo bajo demanda

**Cuándo:** Se piden funciones de cálculo

**Qué:** Nunca persistir resultados

**Efectos:**
- Excepción: EstimatedRevenue y EstimatedCost se persisten como planificación

**Tipo:** Query

---

## Cases límite

### EDGE001: Factura con pagos → anular

**Cuándo:** Se intenta anular Invoice con pagos registrados

**Qué:** Rechazar

**Efectos:**
- Mensaje: "No se puede anular un Invoice con pagos registrados"

**Tipo:** Query

---

### EDGE002: Servicio con rapportino facturado

**Cuándo:** Se intenta modificar servicio con RapportinoItems con LockedAmount

**Qué:** Rechazar

**Efectos:**
- Mensaje: "Servicio con rapportinos facturados. No se puede modificar."

**Tipo:** Query

---

### EDGE003: Pago duplicado

**Cuándo:** Se registra Payment con mismo InvoiceID + Amount + PaymentDate + Reference

**Qué:** Advertir pero permitir

**Efectos:**
- Popup: "Este pago ya fue registrado. ¿Confirmar?"

**Tipo:** Query

---

### EDGE004: Conductor con anticipos pendientes

**Cuándo:** Se asigna conductor con DriverAdvances con RemainingAmount > 0

**Qué:** Advertir pero permitir

**Efectos:**
- Banner: "Conductor tiene anticipos pendientes de descuento"

**Tipo:** Query

---

### EDGE005: Proyecto archivado

**Cuándo:** Project.Status = "Archiviado"

**Qué:** No se pueden crear servicios ni rapportinos nuevos

**Efectos:**
- Solo lectura

**Tipo:** Query

---

### EDGE006: Reapertura

**Cuándo:** Se intenta revertir estado contable

**Qué:** No soportado

**Efectos:**
- Para correcciones: crear ajustes o documentos nuevos

**Tipo:** Query
