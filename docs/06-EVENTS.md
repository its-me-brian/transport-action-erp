# EVENTS.md — Catálogo de eventos

## Principio fundamental

Los eventos son **NOTIFICACIONES**, no acciones.

La **ACCIÓN** está en el Command.
El **EVENTO** informa que ocurrió.

---

## Arquitectura del Event Dispatcher

```javascript
// Command (ACCIONA)
function facturarRapportino(rapportinoId) {
  // 1. validar
  // 2. congelar items
  // 3. crear InvoiceItems
  // 4. crear/actualizar Invoice
  // 5. cambiar RapportinoClient.Status
  // 6. dispatch (NOTIFICA)
  _dispatchEvent({
    type: 'rapportino_client.facturado',
    entity: 'RapportinoClient',
    entityId: rapportinoId,
    user: Session.getActiveUser().getEmail(),
    timestamp: new Date().toISOString(),
    payload: { invoiceId: invoice.ID }
  })
}

// Listener (NOTIFICA, no acciona)
EVENT_LISTENERS['rapportino_client.facturado'] = [
  (event) => _logActivity(event),        // ActivityFeed
  (event) => _logAudit(event),           // AuditLog
]
```

---

## Regla para listeners

**PERMITIDO en listeners:**
- ActivityFeed ✓
- AuditLog ✓
- Notificaciones (futuro) ✓
- Actualizar KPIs cache (futuro) ✓

**PROHIBIDO en listeners:**
- Crear/modify entidades contables ✗
- Cambiar estados ✗
- Modificar montos ✗
- Crear Breakdowns ✗
- Crear InvoiceItems ✗

---

## Estructura del evento

```javascript
{
  type: string,           // "service.validated"
  entity: string,         // "Service"
  entityId: string,       // "SVC-2026-00123"
  user: string,           // "admin"
  timestamp: ISO,         // "2026-07-26T15:30:00Z"
  payload: object         // datos específicos del evento
}
```

---

## Catálogo completo

### Operativos

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `service.imported` | `{listId, count}` | Servicios importados |
| `service.assigned` | `{serviceId, driverId, vehicleId}` | Conductor asignado |
| `service.confirmed` | `{serviceId}` | Servicio confirmado |
| `service.started` | `{serviceId}` | Conductor inició ruta |
| `service.completed` | `{serviceId}` | Servicio completado |
| `service.validated` | `{serviceId}` | Servicio validado |
| `service.facturado` | `{serviceId}` | Servicio facturado |
| `service.cobrado` | `{serviceId}` | Servicio cobrado |
| `service.closed` | `{serviceId}` | Servicio cerrado |
| `service.revenue_adjusted` | `{serviceId, adjustmentId, amount}` | Revenue ajustado post-validación |
| `service.cost_adjusted` | `{serviceId, adjustmentId, amount}` | Cost ajustado post-validación |

### Reportes

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `report.submitted` | `{serviceId, reportId}` | Reporte enviado |
| `report.approved` | `{serviceId, reportId}` | Reporte aprobado |
| `report.rejected` | `{serviceId, reportId, reason}` | Reporte rechazado |

### Rapportinos

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `rapportino_client.created` | `{rapportinoId}` | Rapportino cliente creado |
| `rapportino_client.reviewed` | `{rapportinoId}` | Rapportino cliente revisado |
| `rapportino_client.sent` | `{rapportinoId}` | Rapportino cliente enviado |
| `rapportino_client.accepted` | `{rapportinoId}` | Rapportino cliente aceptado |
| `rapportino_client.facturado` | `{rapportinoId, invoiceId}` | Rapportino facturado |
| `rapportino_driver.created` | `{rapportinoId}` | Rapportino conductor creado |
| `rapportino_driver.reviewed` | `{rapportinoId}` | Rapportino conductor revisado |
| `rapportino_driver.sent` | `{rapportinoId}` | Rapportino conductor enviado |
| `rapportino_driver.accepted` | `{rapportinoId}` | Rapportino conductor aceptado |
| `rapportino_driver.pagado` | `{rapportinoId}` | Rapportino conductor pagado |

### Facturación

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `invoice.created` | `{invoiceId}` | Factura creada |
| `invoice.emitted` | `{invoiceId, invoiceNumber}` | Factura emitida |
| `invoice.sent` | `{invoiceId}` | Factura enviada |
| `invoice.partial_payment` | `{invoiceId, paymentId}` | Pago parcial |
| `invoice.paid` | `{invoiceId}` | Factura pagada |
| `invoice.overdue` | `{invoiceId}` | Factura vencida |
| `invoice.voided` | `{invoiceId, reason}` | Factura anulada |

### Pagos

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `payment.created` | `{paymentId, invoiceId}` | Pago registrado |
| `payment.confirmed` | `{paymentId, invoiceId}` | Pago confirmado |
| `payment.reconciled` | `{paymentId}` | Pago conciliado |

### Gastos

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `expense.created` | `{expenseId}` | Gasto creado |
| `expense.confirmed` | `{expenseId}` | Gasto confirmado |
| `expense.cancelled` | `{expenseId}` | Gasto cancelado |
| `expense.corrected` | `{expenseId, newExpenseId, originalAmount}` | Gasto corregido (cancel + recreate) |

### Cambios

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `change.created` | `{changeId}` | Cambio registrado |
| `change.resolved` | `{changeId}` | Cambio resuelto |

### Sistema

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `transport_list.imported` | `{listId, count}` | Lista importada |
| `user.login` | `{userId}` | Login |
| `user.logout` | `{userId}` | Logout |
