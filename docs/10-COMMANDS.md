# COMMANDS.md — Catálogo de operaciones del sistema

## Servicios

| Command | Agregado | Precondiciones | Efectos |
|---------|----------|---------------|---------|
| assignDriver(serviceId, driverId, vehicleId) | Service | OperationalStatus=Importado | Status→Asignado |
| confirmService(serviceId) | Service | OperationalStatus=Asignado | Status→Confirmado |
| startService(serviceId) | Service | OperationalStatus=Confirmado | Status→EnRuta |
| completeService(serviceId) | Service | OperationalStatus=EnRuta | Status→Realizado |
| submitReport(serviceId, reportData) | Service | OperationalStatus=Realizado, sin reporte activo | Status→Reportado, crear DriverReport |
| approveReport(reportId) | Service | DriverReport.Status=Pendiente | Reporte→Aceptado, crear CostBreakdown |
| rejectReport(reportId, reason) | Service | DriverReport.Status=Pendiente | Reporte→Rechazado |
| validateService(serviceId) | Service | Reporte Aceptado, DriverID, VehicleID, ≥1 Revenue, ≥1 Cost | Status→Validado, freeze breakdowns |
| adjustRevenue(serviceId, adjustment) | Service | OperationalStatus=Validado | Nueva línea Source=adjustment |
| adjustCost(serviceId, adjustment) | Service | OperationalStatus=Validado | Nueva línea Source=adjustment |

## Rapportinos Cliente

| Command | Agregado | Precondiciones | Efectos |
|---------|----------|---------------|---------|
| createRapportinoClient(projectId, clientId, weekStart, weekEnd) | RapportinoClient | Proyecto activo | Status=Borrador |
| addServiceToRapportino(rapportinoId, serviceId) | RapportinoClient | Status=Borrador | Agregar RapportinoItem |
| removeServiceFromRapportino(rapportinoId, serviceId) | RapportinoClient | Status=Borrador | Eliminar RapportinoItem |
| reviewRapportinoClient(rapportinoId) | RapportinoClient | ≥1 ítem, todos Amount>0 | Status→Revisado |
| sendRapportinoClient(rapportinoId) | RapportinoClient | Status=Revisado | Status→Enviado, SentAt |
| acceptRapportinoClient(rapportinoId) | RapportinoClient | Status=Enviado | Status→Aceptado, AcceptedAt |
| facturarRapportinoClient(rapportinoId) | RapportinoClient | Status=Aceptado | LockedAmount, crear InvoiceItems, Status→Facturado |

## Rapportinos Conductor

| Command | Agregado | Precondiciones | Efectos |
|---------|----------|---------------|---------|
| createRapportinoDriver(projectId, driverId, weekStart, weekEnd) | RapportinoDriver | Proyecto activo | Status=Borrador |
| reviewRapportinoDriver(rapportinoId) | RapportinoDriver | ≥1 servicio | Status→Revisado |
| sendRapportinoDriver(rapportinoId) | RapportinoDriver | Status=Revisado | Status→Enviado, SentAt |
| acceptRapportinoDriver(rapportinoId) | RapportinoDriver | Status=Enviado | Status→Aceptado |
| payRapportinoDriver(rapportinoId, amount) | RapportinoDriver | Status=Aceptado | Status→Pagado, crear DriverAdvance |

## Facturación

| Command | Agregado | Precondiciones | Efectos |
|---------|----------|---------------|---------|
| emitInvoice(invoiceId) | Invoice | ≥1 item, Total>0, Status=Borrador | InvoiceNumber=Sequence(), Status→Emitida |
| voidInvoice(invoiceId, reason) | Invoice | Status∈{Borrador,Emitida}, sin pagos | Status→Anulada, VoidReason |
| registerPayment(invoiceId, paymentData) | Invoice | Status∈{Enviada,PagoParcial,Vencida} | Payment=Registrado |
| confirmPayment(paymentId) | Invoice | Payment=Registrado | Payment→Confirmado, recalcular saldo |
| reconcilePayment(paymentId) | Invoice | Payment=Confirmado | Payment→Conciliado |

## Gastos

| Command | Agregado | Precondiciones | Efectos |
|---------|----------|---------------|---------|
| createExpense(expenseData) | Expense | — | Status=Draft |
| editExpense(expenseId, changes) | Expense | Status=Draft | Actualizar campos |
| confirmExpense(expenseId) | Expense | Status=Draft | Status→Confirmed |
| cancelExpense(expenseId) | Expense | Status=Draft | Status→Cancelled |
| correctExpense(expenseId) | Expense | Status=Confirmed | Cancelar + crear nuevo |

## Entidades auxiliares

| Command | Agregado | Precondiciones | Efectos |
|---------|----------|---------------|---------|
| createClient(clientData) | Client | — | Crear client |
| updateClient(clientId, changes) | Client | — | Actualizar |
| createDriver(driverData) | Driver | — | Crear conductor |
| updateDriver(driverId, changes) | Driver | — | Actualizar |
| createVehicle(vehicleData) | Vehicle | — | Crear vehículo |
| updateVehicle(vehicleId, changes) | Vehicle | — | Actualizar |
| createProject(projectData) | Project | — | Crear proyecto |
| updateProject(projectId, changes) | Project | Status≠Archiviado | Actualizar |
| archiveProject(projectId) | Project | Status=Chiuso | Status→Archiviato |
| createChange(changeData) | Change | — | Crear cambio |
| resolveChange(changeId) | Change | Status=Open | Status→Resolved |
