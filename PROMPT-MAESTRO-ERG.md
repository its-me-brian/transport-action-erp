# PROMPT MAESTRO — CIERRE OPERATIVO Y VALIDACIÓN E2E DEL ERP

> **Autor:** Usuario del proyecto Transport Action ERP
> **Fecha:** 2026-08-27
> **Propósito:** Dejar el proyecto funcional, coherente y listo para empezar a usarse

---

ACTÚA COMO CTO + SENIOR FULL-STACK ENGINEER + QA LEAD + UX ENGINEER DEL PROYECTO.

Voy a proporcionarte el proyecto completo de la web app ERP existente.

TU OBJETIVO NO ES PROPONER CAMBIOS.

TU OBJETIVO ES DEJAR EL PROYECTO FUNCIONAL, COHERENTE Y LISTO PARA EMPEZAR A USARSE.

Debes trabajar sobre EL PROYECTO EXISTENTE.

NO debes crear un ERP paralelo.
NO debes rehacer funcionalidades que ya funcionan correctamente.
NO debes eliminar funcionalidades existentes sin justificarlo.
NO debes limitarte a corregir el frontend.
NO debes limitarte a corregir el backend.

Debes comprobar y corregir:

FRONTEND
↓
API
↓
BACKEND
↓
REPOSITORIES
↓
BASE DE DATOS / GOOGLE SHEETS / PERSISTENCIA
↓
RESPUESTA
↓
FRONTEND
↓
ESTADO VISUAL

y posteriormente comprobar el flujo completo mediante pruebas.

===========================================================
0. REGLA PRINCIPAL: NO DEJAR NADA "PENDIENTE"
===========================================================

No quiero una lista de recomendaciones.

Quiero IMPLEMENTACIÓN + VERIFICACIÓN.

Cada problema encontrado debe pasar por:

1. DETECTAR
2. DOCUMENTAR
3. CORREGIR
4. PROBAR
5. VERIFICAR PERSISTENCIA
6. VERIFICAR READ-BACK
7. VERIFICAR UI
8. VERIFICAR PERMISOS
9. VERIFICAR LOGS
10. VERIFICAR REGRESIÓN

No marques una tarea como terminada porque:

- compila
- el botón funciona
- la API responde 200
- el frontend muestra un mensaje de éxito

Debe comprobarse que:

FRONTEND
→ API
→ BACKEND
→ BD
→ READ-BACK
→ FRONTEND

produce exactamente el resultado esperado.

===========================================================
1. PRIMERA FASE — AUDITORÍA COMPLETA DEL PROYECTO
===========================================================

ANTES DE MODIFICAR CÓDIGO:

analiza TODO el proyecto.

Revisa:

- estructura frontend
- estructura backend
- APIs
- services
- repositories
- models
- types
- stores
- hooks
- componentes
- páginas
- routing
- autenticación
- autorización
- state machines
- Google Sheets / BD
- migraciones
- logs
- audit logs
- activity feed
- tests
- E2E
- fixtures
- documentación

Construye internamente una matriz:

ENTIDAD
→ FRONTEND
→ API
→ BACKEND
→ REPOSITORY
→ PERSISTENCIA
→ READ
→ UPDATE
→ DELETE
→ PERMISSIONS
→ LOGGING
→ TEST

Entidades mínimas:

- Service
- Driver
- Project
- Client
- Movement
- DriverLink
- DriverLinkResponse
- WhatsApp message
- DriverReportInbox
- DriverReport
- Reconciliation
- RateCard
- SupplierRate
- ServiceRevenueBreakdown
- ServiceCostBreakdown
- Rapportino
- Invoice
- InvoiceItem
- Payment
- User
- Role
- Permission
- AuditLog
- ActivityLog

NO empieces el rediseño visual hasta haber entendido estos contratos.

===========================================================
2. SEGUNDA FASE — SERVICE COMO UNIDAD CENTRAL
===========================================================

El concepto principal del ERP debe ser:

SERVICE = unidad central de operación.

El Service debe permitir gestionar TODO lo que corresponde a ese servicio.

Desde un Service concreto se debe poder acceder y operar sobre:

- información básica
- cliente
- proyecto
- driver
- vehículo
- movimientos
- horarios
- DriverLink
- WhatsApp
- DriverReport
- Reconciliation
- RateCard
- SupplierRate
- revenue
- costs
- economics
- Rapportino
- Invoice / InvoiceItems
- Payments relacionados
- historial
- audit trail

No significa duplicar las pantallas globales.

Debe existir:

GLOBAL WORKSPACE
para trabajar con muchos servicios

y:

SERVICE WORKSPACE
para resolver un servicio concreto.

===========================================================
3. SERVICE WORKSPACE — REDISEÑO
===========================================================

Rediseña el Service Workspace para convertirlo en un verdadero:

"SINGLE SERVICE OPERATIONAL COCKPIT"

No utilizar un enorme panel lateral permanente si desperdicia espacio.

Prioriza:

HEADER
-------------------------
Service ID
Date
Client
Project
Driver
Status
Financial Status
Next Action
-------------------------

TABS / SECTIONS

OVERVIEW
OPERATIONS
COMMUNICATION
DRIVER REPORT
RECONCILIATION
FINANCE
HISTORY

Cada sección debe tener información accionable.

No mostrar únicamente datos.

Debe permitir ejecutar las acciones correspondientes.

===========================================================
4. OVERVIEW
===========================================================

Mostrar de forma compacta:

- Service ID
- fecha
- cliente
- proyecto
- service type
- vehicle type
- driver
- vehicle plate
- passengers
- pickup
- dropoff
- status
- next action

Mostrar también:

OPERATIONAL STATUS
FINANCIAL STATUS

y cualquier bloqueo:

⚠ Missing Driver
⚠ Missing Driver Report
⚠ RateCard Missing
⚠ SupplierRate Missing
⚠ Reconciliation Pending
⚠ Financial Approval Required

Cada warning debe llevar a la acción correspondiente.

===========================================================
5. MOVEMENTS / OPERATIONS
===========================================================

Desde Service:

- ver movimientos
- crear movimiento
- editar movimiento
- eliminar movimiento si corresponde
- modificar horarios
- modificar pickup/dropoff
- pasajeros
- flight info
- notas
- vehicle
- driver

Cada modificación debe comprobar:

UI
→ API
→ BACKEND
→ DB
→ READ-BACK

No permitas campos aparentemente editables que no tengan persistencia real.

IMPORTANTE:

audita TODOS los campos de:

EditService
EditServiceSections
formularios
modales
inputs

Para cada campo comprobar:

campo UI
→ nombre enviado
→ parámetro API
→ campo backend
→ columna BD
→ lectura posterior

Si un campo no puede guardarse correctamente:

O CONECTARLO CORRECTAMENTE
O ELIMINARLO DE LA UI.

Nunca dejar un campo "falso editable".

===========================================================
6. DRIVER
===========================================================

Desde Service debe poder gestionarse:

- driver
- teléfono
- vehículo
- plate
- DriverLink
- estado del driver

Comprobar relación:

Service.DriverID
→ Driver.ID

Nunca duplicar información del Driver en Service si la fuente de verdad es Driver.

Si el usuario añade/modifica teléfono del Driver:

UI
→ Driver API
→ Driver repository
→ DB
→ read-back

===========================================================
7. DRIVER LINK — FLUJO COMPLETO
===========================================================

Auditar:

CREACIÓN
EDICIÓN
ENVÍO
APERTURA
RESPUESTA
RECEPCIÓN
CAPTURA
NORMALIZACIÓN
CORRELACIÓN
DRIVER REPORT

Flujo esperado:

SERVICE
↓
CREATE DRIVER LINK
↓
LINK
↓
DRIVER
↓
SUBMISSION
↓
DriverLinkResponse
↓
DriverReportInbox
↓
Normalization
↓
Correlation
↓
Review
↓
DriverReport
↓
Reconciliation

DriverLink debe utilizar la MISMA pipeline de normalización/captura que WhatsApp.

No permitir que:

DriverLink
→ Inbox

y quede abandonado.

Debe llegar hasta:

DriverReport

cuando los datos sean suficientes.

Si necesita revisión humana:

mostrar:

PENDING REVIEW

y no:

SUCCESS.

===========================================================
8. WHATSAPP — FLUJO COMPLETO
===========================================================

Este flujo es PRIORIDAD MÁXIMA.

Debe funcionar:

WhatsApp
↓
Parser
↓
Reports
↓
Candidate Services
↓
Correlation
↓
Inbox
↓
Normalization
↓
Review
↓
DriverReport
↓
Reconciliation

MUY IMPORTANTE:

NO mostrar:

"Report captured successfully"

si únicamente se creó DriverReportInbox.

El resultado debe distinguir:

captured
normalized
reviewReady
driverReportCreated
driverReportApproved
reconciliationCreated
rateCardApplied

Ejemplo:

{
  captured: true,
  normalized: true,
  reviewReady: true,
  driverReportCreated: true,
  driverReportApproved: false,
  reconciliationCreated: false,
  errors: []
}

Si falla:

{
  captured: true,
  normalized: true,
  reviewReady: true,
  driverReportCreated: false,
  errors: [
    {
      code: "...",
      message: "..."
    }
  ]
}

Nunca ocultar errores de etapas posteriores.

===========================================================
9. WHATSAPP MULTI-SERVICE
===========================================================

Debe existir la posibilidad de pegar varios mensajes de WhatsApp.

Ejemplo:

MESSAGE 1
MESSAGE 2
MESSAGE 3
MESSAGE 4
MESSAGE 5

Parser:

REPORT 1
REPORT 2
REPORT 3
REPORT 4
REPORT 5

Cada report debe generar:

serviceCandidates

con:

- serviceId
- driverId
- date
- time
- project
- client
- serviceType
- confidence

IMPORTANTE:

NO asumir que todos pertenecen al Service actualmente abierto.

Si hay varios candidatos:

mostrar:

REPORT
→ candidate Service
→ confidence
→ reason

Ejemplo:

REPORT #1
SVC-00001
96%
Driver + date + time match

REPORT #2
SVC-00018
91%

REPORT #3
SVC-00022
84%

Permitir:

CONFIRM

o:

CHANGE SERVICE

o:

REVIEW

No realizar asociaciones incorrectas automáticamente.

===========================================================
10. CORRELATION
===========================================================

Crear/usar un:

CorrelationID

que permita seguir:

WhatsApp
↓
Inbox
↓
DriverReport
↓
Reconciliation
↓
Revenue
↓
Cost
↓
Rapportino
↓
Invoice
↓
Payment

El mismo principio debe aplicarse a DriverLink.

El coordinador debe poder ver el correlation ID en History/Audit cuando sea necesario.

===========================================================
11. DRIVER REPORT
===========================================================

El DriverReport debe tener una relación inequívoca con:

- Service
- Driver
- Project
- Client
- Date
- source
- channel
- correlation ID

Comprobar que:

DriverReport.ServiceID === Service.ID

DriverReport.DriverID === Service.DriverID

cuando corresponda.

Nunca confiar únicamente en valores enviados por frontend.

El backend debe validar estas relaciones.

===========================================================
12. DRIVER REPORT LIST
===========================================================

Revisar cualquier código del tipo:

reports[0]

No asumir que el primer report es el correcto.

Implementar una selección determinista:

- latest
- active
- approved
- current

según reglas de negocio.

El frontend debe recibir del backend el report correcto.

===========================================================
13. RECONCILIATION
===========================================================

Flujo:

DriverReport
↓
Reconciliation
↓
Compare planned vs actual
↓
Differences
↓
Resolve
↓
Approve
↓
Financial processing

Desde Service debe poder:

- ver reconciliation
- resolver diferencias
- aprobar
- volver a revisar
- ver resultado

Si existe diferencia:

mostrarla claramente.

No esconderla.

===========================================================
14. RATECARD — PRIORIDAD MÁXIMA
===========================================================

Revisar completamente RateCard.

La selección debe considerar realmente los criterios definidos por negocio.

Como mínimo comprobar:

Project
Client
ServiceType
VehicleType
validity
active

No aceptar que el comentario del código diga:

"Project + ServiceType + VehicleType"

si la implementación realmente busca:

"Client + VehicleType + ServiceType"

La implementación real debe coincidir con el modelo de negocio.

Una vez seleccionado:

guardar:

RateCardID

y snapshot de los valores utilizados cuando corresponda.

El Service debe mostrar:

RATE CARD
----------------
RateCard ID
Project
Service Type
Vehicle Type
Base
Included KM
Extra KM
Extra Hour
Night
Holiday
Diaria
----------------

Si falta RateCard:

NO ocultar el error.

Mostrar:

⚠ RATECARD REQUIRED

y bloquear únicamente las etapas que realmente dependan de él.

===========================================================
15. NIGHT / NOTTURNO
===========================================================

Revisar la lógica de:

isNotturno

No tratar:

false

como equivalente automático a:

"night disabled"

si el valor realmente significa:

"not yet determined".

Separar:

AUTO
FORCED TRUE
FORCED FALSE

si el modelo de negocio lo requiere.

La nocturnidad debe calcularse correctamente a partir de los horarios cuando corresponda.

===========================================================
16. SUPPLIER RATE / COST
===========================================================

Auditar:

SupplierRate
↓
ServiceCostBreakdown

Debe quedar trazabilidad:

SupplierRateID

y fuente:

supplier_rate

Si falta:

mostrar:

⚠ SUPPLIER RATE REQUIRED

No ocultar errores.

===========================================================
17. ECONOMICS
===========================================================

Debe existir una cadena clara:

Revenue
-
Cost
=
Margin

Mostrar:

Revenue
Cost
Margin

y fuentes:

RateCard
SupplierRate

Cada número debe poder explicarse.

Si:

Revenue = 0

porque falta RateCard:

mostrar el motivo.

No simplemente:

€0.

===========================================================
18. FINANCIAL STATUS
===========================================================

Revisar completamente la state machine.

Debe existir claramente:

Operational Status

y:

Financial Status

No mezclar ambas.

Validar:

Importato
→ Assegnato
→ Confermato
→ InCorso
→ Realizzato
→ Reportato
→ Revision
→ Approvato
→ ...

y la correspondiente transición financiera:

Calculated
→ Approved
→ Facturable
→ Invoiced
→ Paid

La UI debe reflejar EXACTAMENTE las transiciones permitidas por backend.

Nunca ofrecer una acción que provoque:

INVALID_TRANSITION.

===========================================================
19. NEXT ACTION
===========================================================

Next Action debe derivarse del estado real del backend.

No hardcodear:

Importato + driver
→ Confirm

si la state machine realmente requiere:

Importato
→ Assegnato
→ Confermato

La UI debe mostrar exactamente la siguiente transición válida.

Ejemplo:

Status:
Importato

Next Action:
ASSEGNA DRIVER

Después:

Status:
Assegnato

Next Action:
CONFERMA SERVICE

etc.

===========================================================
20. RAPPORTINO
===========================================================

Revisar completamente el vínculo:

Service
→ Rapportino

No utilizar únicamente:

projectId

si se necesita:

serviceId.

El backend debe devolver únicamente los Rapportinos que contienen realmente ese Service.

Auditar:

- filtros
- fechas
- driver
- collaborator
- service
- project
- client

Debe funcionar desde:

GLOBAL RAPPORTINI

y:

SERVICE → RAPPORTINO

sin mezclar scopes.

===========================================================
21. INVOICE
===========================================================

Separar:

Project Invoice

de:

Service Invoice Item.

Una Invoice puede pertenecer al:

Client / Project

pero sus:

InvoiceItems

deben poder estar vinculados a:

ServiceID.

Desde Service mostrar únicamente:

InvoiceItems relacionados con el Service.

No mostrar todas las facturas del proyecto como si fueran del Service.

===========================================================
22. PAYMENTS
===========================================================

Revisar igualmente:

Payment
→ Invoice
→ InvoiceItem
→ Service

No mostrar todos los pagos del cliente como si pertenecieran al Service.

Mostrar únicamente el contexto relacionado.

===========================================================
23. FINANCIAL WORKFLOW
===========================================================

Debe quedar:

Service
↓
Actuals confirmed
↓
Financial approval
↓
Facturable
↓
Invoice
↓
Payment

La UI debe impedir intentar:

Facturar

antes de:

Facturable.

Si el backend exige:

approveFinancial()

antes de:

markFacturable()

la UI debe reflejarlo.

Nunca mostrar un botón que el backend rechazará.

===========================================================
24. ROLES Y PERMISSIONS
===========================================================

Auditar TODOS los permisos.

Crear una única fuente de verdad.

Comparar:

Frontend permissions
vs
Backend permissions.

No permitir:

frontend = permission exists

backend = permission doesn't exist.

Revisar especialmente:

- admin
- coordinator
- accounting
- driver

Driver:

debe poder ver/modificar únicamente lo que corresponde a sus propios Services / Reports / Links.

Nunca confiar únicamente en:

"ocultar botón"

El backend debe impedir acceso.

===========================================================
25. DRIVER OWNERSHIP
===========================================================

Para cualquier:

getService
getDriverReport
DriverLink
DriverReport
submission

comprobar server-side:

current user
→ driver ID
→ service driver ID.

Si no coincide:

403.

No depender del frontend.

===========================================================
26. LOCKING / CONCURRENCY
===========================================================

Revisar TODAS las operaciones de escritura.

Cualquier escritura en Sheets/BD que requiera locking debe utilizar el mecanismo definido por la arquitectura.

Auditar:

- updateService
- updateServiceField
- deleteService
- captureReport
- approveReport
- DriverLink
- WhatsApp
- invoices
- payments
- reconciliation

Objetivo:

evitar corrupción por dos coordinadores trabajando simultáneamente.

===========================================================
27. LOGGING / AUDIT
===========================================================

Toda acción importante debe registrar:

actor
timestamp
serviceId
entityId
action
source
channel
correlationId
oldValue
newValue

Ejemplo:

SERVICE_UPDATED

actor:
user@example.com

serviceId:
SVC-001

field:
driverId

old:
DR-001

new:
DR-004

source:
BACKOFFICE

correlationId:
COR-123

===========================================================
28. ACTIVITY FEED
===========================================================

Revisar:

_buildActivityDescription()

y asegurar que los eventos importantes tengan descripción clara.

Especialmente:

- inbox.captured
- inbox.normalized
- inbox.pending_review
- driver_report.created
- driver_report.approved
- reconciliation.created
- reconciliation.approved
- ratecard.applied
- service.updated
- invoice.created
- payment.created

No utilizar siempre una descripción genérica.

===========================================================
29. GLOBAL WORKSPACES
===========================================================

Mantener pantallas globales para operaciones masivas.

Ejemplos:

Dashboard
Calendar
Services
Driver Reports
WhatsApp Inbox
Reconciliation
Rapportini
Accounting
Management

Estas pantallas deben permitir:

- búsqueda
- filtros
- selección múltiple
- acciones batch cuando sean seguras

===========================================================
30. MULTI-SERVICE OPERATIONS
===========================================================

Implementar correctamente:

WhatsApp:

10 messages
↓
10 reports
↓
10 candidate services
↓
review
↓
confirm
↓
10 services updated.

Driver Reports:

select multiple
↓
bulk review / approve cuando sea permitido.

Reconciliation:

select multiple
↓
bulk operation cuando sea segura.

Nunca hacer bulk actions que puedan mezclar Services incorrectamente.

===========================================================
31. ROUTING
===========================================================

Cada Service debe tener URL propia.

Ejemplo:

/services/:serviceId

o la estructura equivalente ya utilizada por el proyecto.

Debe poder:

- abrir directamente
- refrescar
- copiar URL
- volver atrás
- abrir en nueva pestaña
- deep-link

La navegación no debe depender de que previamente se haya abierto el Service desde Calendar.

===========================================================
32. SERVICE SUBSECTIONS
===========================================================

Permitir deep links cuando tenga sentido:

/services/:id/overview
/services/:id/operations
/services/:id/driver
/services/:id/whatsapp
/services/:id/report
/services/:id/reconciliation
/services/:id/finance
/services/:id/history

No crear rutas innecesarias si el router actual puede resolverlo mediante estado/tab.

Priorizar URLs útiles y estables.

===========================================================
33. UI / UX
===========================================================

El diseño debe ser:

- moderno
- formal
- profesional
- limpio
- rápido de entender
- orientado a operaciones

Evitar:

- exceso de modales
- paneles duplicados
- sidebars gigantes
- información repetida
- botones ambiguos
- acciones escondidas
- scroll innecesario

Prioridad:

INFORMATION DENSITY
sin perder legibilidad.

===========================================================
34. DESKTOP
===========================================================

Optimizar especialmente pantallas grandes.

Eliminar espacios desperdiciados.

El Service Workspace debe utilizar eficientemente el ancho disponible.

No utilizar:

Left Sidebar
+
Right Sidebar
+
Main Content

si el resultado es que el contenido útil queda reducido.

===========================================================
35. MOBILE
===========================================================

Auditar TODAS las pantallas.

No simplemente:

"añadir responsive CSS".

Comprobar físicamente cada flujo.

Pantallas mínimas:

- Login
- Dashboard
- Calendar
- Services
- Service Detail
- Driver
- DriverLink
- WhatsApp
- Driver Reports
- Reconciliation
- Rapportini
- Accounting
- Invoice
- Payment
- Settings
- Users / Roles

Comprobar:

320px
375px
390px
430px
768px

según corresponda.

No permitir:

- overflow horizontal accidental
- botones fuera de pantalla
- tablas imposibles de usar
- modales más grandes que viewport
- formularios ilegibles
- tabs imposibles de navegar
- headers que ocupen demasiado espacio.

En mobile priorizar:

STATUS
NEXT ACTION
CURRENT TASK
KEY DATA
ACTIONS

===========================================================
36. FORMULARIOS
===========================================================

Auditar TODOS los formularios.

Para cada formulario:

1. abrir
2. introducir datos
3. submit
4. observar request
5. observar backend
6. comprobar DB
7. recargar
8. comprobar persistencia
9. comprobar error handling
10. comprobar permisos

No aceptar:

"se actualiza visualmente"

como evidencia de persistencia.

===========================================================
37. ERRORES
===========================================================

Todos los errores backend deben llegar al frontend de forma comprensible.

Nunca:

success=true

si una etapa posterior falló.

Crear errores estructurados:

code
message
stage
entity
serviceId
correlationId

Ejemplo:

{
  code: "RATECARD_NOT_FOUND",
  stage: "ECONOMICS",
  serviceId: "...",
  correlationId: "..."
}

===========================================================
38. TEST E2E
===========================================================

Revisar primero los tests existentes.

No eliminarlos para conseguir verde.

Actualizar selectores únicamente si el nuevo diseño cambia correctamente el DOM.

Corregir:

- login
- application container
- main body
- service creation
- driver assignment
- DriverLink
- WhatsApp
- DriverReport
- reconciliation
- ratecard
- financial workflow
- invoice
- payment

===========================================================
39. TEST CRÍTICO — CICLO COMPLETO DEL SERVICE
===========================================================

Crear/usar un Service de prueba.

Ejecutar:

1. Create Service
2. Assign Client
3. Assign Project
4. Assign Driver
5. Assign Vehicle
6. Create DriverLink
7. Open DriverLink
8. Submit Driver response
9. Capture response
10. Create DriverReport
11. Validate DriverReport
12. Reconciliation
13. Apply RateCard
14. Apply SupplierRate
15. Calculate Revenue
16. Calculate Cost
17. Calculate Margin
18. Confirm actuals
19. Approve financials
20. Mark Facturable
21. Create Rapportino
22. Create InvoiceItem
23. Create Invoice
24. Register Payment
25. Close service

Después de CADA PASO:

comprobar DB.

===========================================================
40. TEST CRÍTICO — WHATSAPP
===========================================================

Ejecutar:

Service A
Driver A
Date A

pegar mensaje WhatsApp.

Comprobar:

Parser
↓
Candidate
↓
Inbox
↓
Normalization
↓
Review
↓
DriverReport
↓
Reconciliation
↓
RateCard
↓
Economics

El resultado final debe poder verse desde:

SERVICE A

sin tener que navegar por otras pantallas para saber qué ocurrió.

===========================================================
41. TEST CRÍTICO — WHATSAPP MULTIPLE
===========================================================

Pegar al menos:

5 mensajes

correspondientes a:

5 Services diferentes.

Comprobar:

no se mezclan.

Cada uno termina asociado al Service correcto.

Los que tengan baja confianza:

PENDING REVIEW.

===========================================================
42. TEST CRÍTICO — DRIVERLINK
===========================================================

Repetir el ciclo completo usando DriverLink en lugar de WhatsApp.

Resultado esperado:

DriverLink
→ Inbox
→ DriverReport
→ Reconciliation
→ Economics.

===========================================================
43. TEST DE ERROR
===========================================================

Probar deliberadamente:

- Service inexistente
- Driver inexistente
- Driver incorrecto
- RateCard inexistente
- SupplierRate inexistente
- mensaje WhatsApp ambiguo
- dos Services candidatos
- DriverLink duplicado
- DriverReport duplicado
- transición inválida
- usuario sin permiso
- Driver intentando acceder a Service ajeno

Cada caso debe:

1. fallar correctamente
2. explicar el error
3. no dejar datos corruptos
4. generar log
5. mantener integridad de BD.

===========================================================
44. TEST DE PERSISTENCIA
===========================================================

Para cada operación:

WRITE
↓
RELOAD
↓
READ

El resultado debe permanecer.

Especialmente:

- driver
- phone
- vehicle
- times
- passengers
- notes
- status
- ratecard
- supplier rate
- report
- reconciliation
- invoice
- payment.

===========================================================
45. TEST DE ROLES
===========================================================

Ejecutar el flujo completo como:

ADMIN
COORDINATOR
ACCOUNTING
DRIVER

Comprobar:

qué puede ver
qué puede crear
qué puede editar
qué puede aprobar
qué puede eliminar

y verificar que el backend lo impide cuando corresponde.

===========================================================
46. TEST DE CONCURRENCIA
===========================================================

Simular:

Coordinator A
y
Coordinator B

trabajando simultáneamente sobre el mismo Service.

Comprobar:

- locking
- conflictos
- estado final
- audit log.

===========================================================
47. MATRIZ FINAL DE VALIDACIÓN
===========================================================

Crear una tabla interna:

| FLOW | FRONTEND | API | BACKEND | DB | READBACK | ROLE | LOG | E2E |
|------|----------|-----|---------|----|----------|------|-----|-----|

Debe estar TODO:

PASS

o:

FAIL

No usar:

PARTIAL

como estado final.

Si algo no está listo:

FAIL.

Y continuar corrigiéndolo.

===========================================================
48. DEFINITION OF DONE
===========================================================

El proyecto solamente puede considerarse terminado cuando:

[ ] npm/build correcto
[ ] TypeScript correcto
[ ] no errores críticos frontend
[ ] no errores críticos backend
[ ] todos los endpoints utilizados existen
[ ] todos los formularios persisten
[ ] Service funciona
[ ] Driver funciona
[ ] DriverLink funciona
[ ] WhatsApp funciona
[ ] DriverReport funciona
[ ] Reconciliation funciona
[ ] RateCard funciona
[ ] SupplierRate funciona
[ ] Economics funciona
[ ] Rapportino funciona
[ ] Invoice funciona
[ ] Payment funciona
[ ] roles funcionan
[ ] ownership funciona
[ ] audit logs funcionan
[ ] activity logs funcionan
[ ] routing funciona
[ ] deep links funcionan
[ ] mobile funciona
[ ] E2E pasa
[ ] errores están correctamente gestionados
[ ] no existen acciones UI que backend rechace
[ ] no existen campos editables que no persistan
[ ] no existen datos de otras entidades mostrados como propios
[ ] no existen asociaciones incorrectas Service/Driver/Report
[ ] no existen operaciones financieras fuera de orden.

===========================================================
49. REGLA DE NO REGRESIÓN
===========================================================

Cada modificación debe comprobar:

¿He roto otra pantalla?

¿He roto otro endpoint?

¿He roto otro rol?

¿He roto otra transición?

¿He roto mobile?

¿He roto deep links?

¿He roto tests?

¿He roto otra relación de BD?

Antes de finalizar:

ejecutar nuevamente todos los tests relevantes.

===========================================================
50. FORMA DE TRABAJO
===========================================================

NO hagas primero un informe enorme y después esperes.

Trabaja por fases.

FASE 1
Auditoría.

FASE 2
Corrección de contratos críticos.

FASE 3
WhatsApp / DriverLink / DriverReport.

FASE 4
Reconciliation / RateCard / Economics.

FASE 5
Rapportino / Invoice / Payment.

FASE 6
Roles / Security / Logs.

FASE 7
Service Workspace.

FASE 8
Global Workspaces / Multi-Service.

FASE 9
Mobile.

FASE 10
E2E.

FASE 11
Regression.

Después de cada fase:

- indicar qué se encontró
- qué se modificó
- qué archivos se modificaron
- qué endpoints se modificaron
- qué tablas/Sheets se afectan
- qué tests se ejecutaron
- qué pasó
- qué queda pendiente

PERO NO AVANCES DE FASE SI EXISTEN FALLOS BLOQUEANTES.

===========================================================
51. PRIORIDAD ABSOLUTA
===========================================================

Si encuentras conflicto entre:

UX
y
integridad de datos

prioriza integridad.

Si encuentras conflicto entre:

frontend
y
backend

no ocultes el problema.

Corrige el contrato.

Si encuentras una funcionalidad que parece funcionar pero no persiste:

considerarla FALLIDA.

Si encuentras una operación que devuelve success pero falla posteriormente:

considerarla FALLIDA.

Si encuentras un botón que el backend rechaza:

considerarlo FALLIDO.

Si encuentras información que pertenece a otro Service:

considerarlo FALLIDO.

===========================================================
52. OBJETIVO FINAL
===========================================================

Al finalizar quiero poder utilizar el ERP de esta forma:

ABRO CALENDAR
↓
VEO SERVICES
↓
ABRO SERVICE
↓
SERVICE WORKSPACE
↓
GESTIONO TODO EL SERVICIO
↓
DRIVER
↓
DRIVERLINK / WHATSAPP
↓
DRIVER REPORT
↓
RECONCILIATION
↓
RATECARD
↓
SUPPLIER RATE
↓
ECONOMICS
↓
RAPPORТINO
↓
INVOICE
↓
PAYMENT
↓
CLOSE

Y si necesito trabajar con muchos servicios:

GLOBAL WORKSPACE
↓
FILTER
↓
SELECT MULTIPLE
↓
BULK ACTION
↓
SERVICES ACTUALIZADOS

La información debe ser consistente en todas las pantallas.

===========================================================
53. INFORME FINAL OBLIGATORIO
===========================================================

Al terminar NO me digas simplemente:

"he terminado".

Entrega:

1. RESUMEN DE CAMBIOS

2. ARCHIVOS MODIFICADOS

3. ENDPOINTS MODIFICADOS

4. CAMBIOS DE BD / SHEETS

5. FLUJOS CORREGIDOS

6. TESTS EJECUTADOS

7. RESULTADO DE CADA TEST

8. MATRIZ FRONTEND/BACKEND/DB

9. MATRIZ DE ROLES

10. MATRIZ DE PERMISOS

11. MATRIZ DE STATE MACHINE

12. MATRIZ DE SERVICE WORKSPACE

13. MATRIZ MOBILE

14. PROBLEMAS ENCONTRADOS Y CORREGIDOS

15. ERRORES QUE PERMANECEN

IMPORTANTE:

Si quedan errores:

NO decir "todo está listo".

Indicar exactamente:

FAIL
→ componente
→ archivo
→ causa
→ impacto
→ qué falta.

El objetivo es que el ERP quede REALMENTE UTILIZABLE.

NO quiero una auditoría teórica.

QUIERO UN PROYECTO FUNCIONAL Y VERIFICADO DE EXTREMO A EXTREMO.
