# WORKFLOWS.md — Procesos de negocio de extremo a extremo

Cada workflow describe un proceso completo de principio a fin.

---

## Workflow 1: Importar servicios

```
Usuario sube Excel
    │
    ▼
parseTransportList()
    │
    ▼
validar datos (duplicados, campos obligatorios)
    │
    ▼
crear TransportList
    │
    ▼
crear N Services (OperationalStatus = "Importado", FinancialStatus = "Pendiente")
    │
    ▼
guardar en DB_SHEET_ID
    │
    ▼
retornar preview al frontend
    │
    ▼
usuario confirma importación
    │
    ▼
guardar definitivamente
    │
    ▼
_dispatchEvent('transport_list.imported', {listId, serviceCount})
```

---

## Workflow 2: Asignar conductor

```
Usuario selecciona servicio (OperationalStatus = "Importado")
    │
    ▼
buscar conductor disponible (Driver.Status = "Disponible")
    │
    ▼
seleccionar conductor + vehículo
    │
    ▼
validar:
  ☑ conductor tiene licencia vigente
  ☑ vehículo apto para el tipo de servicio
    │
    ▼
Command: assignDriver(serviceId, driverId, vehicleId)
    │
    ▼
Service.DriverID = driverId
Service.VehicleID = vehicleId
Service.OperationalStatus = "Asignado"
    │
    ▼
_dispatchEvent('service.assigned', {serviceId, driverId, vehicleId})
```

---

## Workflow 3: Conductor informa servicio

```
Conductor completa servicio (OperationalStatus = "Realizado")
    │
    ▼
crea DriverReport con:
  - StartTime (hora real inicio)
  - EndTime (hora real fin)
  - KmTotal (km totales recorridos)
  - HasDiaria (si tiene diaria)
  - DiariaType (piena/mezza/none)
  - IsFestivo (si es festivo)
  - IsNotturno (si es turno nocturno)
  - KmExtra
  - HoursExtra
  - Parking
  - Tolls
  - Fuel
  - WaitMinutes
  - Notes
    │
    ▼
Command: submitDriverReport(serviceId, reportData)
    │
    ▼
DriverReport.Status = "Pendiente"
DriverReport.Version = 1 (o anterior + 1 si hubo rechazos)
DriverReport.SubmittedAt = now
Service.OperationalStatus = "Reportado"
    │
    ▼
_dispatchEvent('report.submitted', {serviceId, reportId})
```

---

## Workflow 4: Aprobar reporte

```
Administración revisa DriverReport
    │
    ▼
¿Datos correctos?
    │
    ├── SÍ → approveDriverReport(reportId)
    │         │
    │         ▼
    │   DriverReport.Status = "Aceptado"
    │   DriverReport.Locked = Yes
    │   DriverReport.ApprovedBy = user
    │   DriverReport.ApprovedDate = now
    │         │
    │         ▼
    │   Crear ServiceCostBreakdown:
    │     Parking → Source = "driver_report", ItemType = "Parking"
    │     Tolls → Source = "driver_report", ItemType = "Tolls"
    │     Fuel → Source = "driver_report", ItemType = "Fuel"
    │     WaitMinutes → Source = "driver_report", ItemType = "Wait"
    │         │
    │         ▼
    │   _dispatchEvent('report.approved')
    │
    └── NO → rejectDriverReport(reportId, reason)
              │
              ▼
        DriverReport.Status = "Rechazado"
        DriverReport.RejectedReason = reason
        DriverReport.Locked = Yes
              │
              ▼
        Conductor puede crear nuevo DriverReport (Version + 1)
```

---

## Workflow 5: Validar servicio

```
Administración valida servicio completo
    │
    ▼
Precondiciones (S006):
  ☑ DriverReport existe y Status = "Aceptado"
  ☑ DriverID asignado
  ☑ VehicleID asignado
  ☑ ≥ 1 línea en ServiceRevenueBreakdown
  ☑ ≥ 1 línea en ServiceCostBreakdown
    │
    ▼
Command: validateService(serviceId)
    │
    ▼
Service.OperationalStatus = "Validado"
    │
    ▼
Freeze breakdowns:
  Cada ServiceRevenueBreakdown → Locked = Yes
  Cada ServiceCostBreakdown → Locked = Yes
    │
    ▼
_dispatchEvent('service.validated', {serviceId})
    │
    ▼
Servicio queda inmutable para datos operativos
Solo permitidos: ajustes con Source = "adjustment"
```

---

## Workflow 6: Generar rapportino de cliente

```
Administración selecciona servicios validados para un proyecto
    │
    ▼
Command: createRapportinoClient(projectId, clientId, weekStart, weekEnd)
    │
    ▼
RapportinoClient.Status = "Borrador"
    │
    ▼
Agregar servicios como RapportinoItems:
  RapportinoItem.ServiceID = serviceId
  RapportinoItem.Amount = calculateServiceRevenue(serviceId).total
    │
    ▼
Command: reviewRapportinoClient(rapportinoId)
    │
    ▼
Validación (R001):
  ☑ ≥ 1 RapportinoItem
  ☑ Todos tienen ServiceID válido
  ☑ Todos tienen Amount > 0
    │
    ▼
RapportinoClient.Status = "Revisado"
    │
    ▼
Command: sendRapportinoClient(rapportinoId)
    │
    ▼
RapportinoClient.Status = "Enviado"
RapportinoClient.SentAt = now
    │
    ▼
_cliente revisa y acepta
    │
    ▼
Command: acceptRapportinoClient(rapportinoId)
    │
    ▼
RapportinoClient.Status = "Aceptado"
RapportinoClient.AcceptedAt = now
```

---

## Workflow 7: Facturar rapportino

```
RapportinoClient.Status = "Aceptado"
    │
    ▼
Command: facturarRapportinoClient(rapportinoId)
    │
    ▼
1. Congelar ítems:
   Cada RapportinoItem → LockedAmount = Amount
    │
    ▼
2. Crear/actualizar InvoiceItems:
   ¿Existe Invoice en Borrador para Project+Client?
     │
     ├── SÍ → agregar InvoiceItems al Invoice existente
     │
     └── NO → crear Invoice nuevo
               Invoice.ID = UUID interno
               Invoice.InvoiceNumber = null (se genera al emitir)
               Invoice.Status = "Borrador"
               Crear InvoiceItems
    │
    ▼
3. Recalcular Invoice:
   Invoice.Subtotal = SUM(InvoiceItems.Amount)
   Invoice.TaxAmount = Subtotal × TaxRate
   Invoice.Total = Subtotal + TaxAmount
    │
    ▼
4. RapportinoClient.Status = "Facturado"
    │
    ▼
5. Actualizar servicios:
   Cada servicio referenciado → FinancialStatus = "Facturado"
    │
    ▼
6. _dispatchEvent('rapportino_client.facturado', {rapportinoId, invoiceId})
```

---

## Workflow 8: Emitir factura

```
Invoice.Status = "Borrador"
    │
    ▼
Administración revisa montos
    │
    ▼
Command: emitInvoice(invoiceId)
    │
    ▼
Validación:
  ☑ Invoice.Items.length > 0
  ☑ Total > 0
    │
    ▼
Invoice.InvoiceNumber = Sequence('Invoice', operatingCompany)
Invoice.Status = "Emitida"
    │
    ▼
Montos congelados (I003)
    │
    ▼
_dispatchEvent('invoice.emitted', {invoiceId, invoiceNumber})
```

---

## Workflow 9: Registrar pago

```
Invoice.Status ∈ {Enviada, PagoParcial, Vencida}
    │
    ▼
Command: registerPayment(invoiceId, paymentData)
    │
    ▼
Payment.Status = "Registrado"
Payment.InvoiceID = invoiceId
    │
    ▼
Invoice NO cambia todavía
    │
    ▼
Command: confirmPayment(paymentId)
    │
    ▼
Payment.Status = "Confirmado"
Payment.ConfirmedAt = now
    │
    ▼
Recalcular saldo:
  Saldo = Invoice.Total - SUM(Payments confirmados)
    │
    ├── Saldo = 0 → Invoice.Status = "Pagada"
    ├── Saldo > 0 → Invoice.Status = "PagoParcial"
    └── Saldo < 0 → error (nunca debería pasar)
    │
    ▼
_dispatchEvent('payment.confirmed', {paymentId, invoiceId})
```

---

## Workflow 10: Generar rapportino de conductor

```
Fin de semana/semana
    │
    ▼
Command: createRapportinoDriver(projectId, driverId, weekStart, weekEnd)
    │
    ▼
Buscar servicios del conductor en ese rango de fechas
    │
    ▼
RapportinoDriver.Status = "Borrador"
    │
    ▼
Command: reviewRapportinoDriver(rapportinoId)
    │
    ▼
Validación (RD001):
  ☑ ≥ 1 servicio asignado
  ☑ DriverID válido
    │
    ▼
RapportinoDriver.Status = "Revisado"
    │
    ▼
Command: sendRapportinoDriver(rapportinoId)
    │
    ▼
RapportinoDriver.Status = "Enviado"
RapportinoDriver.SentAt = now
    │
    ▼
Conductor acepta
    │
    ▼
Command: acceptRapportinoDriver(rapportinoId)
    │
    ▼
RapportinoDriver.Status = "Aceptado"
    │
    ▼
Command: payRapportinoDriver(rapportinoId, amount)
    │
    ▼
Crear DriverAdvance:
  Advance.Amount = monto acordado
  Advance.RemainingAmount = amount
  Advance.Status = "Pendiente"
    │
    ▼
RapportinoDriver.Status = "Pagado"
    │
    ▼
_dispatchEvent('rapportino_driver.pagado', {rapportinoId})
```
