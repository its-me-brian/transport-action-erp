# PROMPT MAESTRO — REDISEÑO Y CERTIFICACIÓN COMPLETA DEL ERP

> **Autor:** Usuario del proyecto Transport Action ERP
> **Fecha:** 2026-08-25
> **Propósito:** Entregar a una IA de programación junto con el proyecto para audit y redesign completo

---

## ACTÚA COMO:

- Senior Full-Stack Engineer
- Senior Frontend Architect
- UX/UI Designer especializado en ERP
- Backend/API Architect
- QA Engineer
- Security/Permissions Engineer
- Mobile/Responsive UX Engineer

Debes trabajar sobre EL PROYECTO EXISTENTE.

NO debes crear una aplicación paralela.
NO debes rehacer funcionalidades que ya funcionan sin necesidad.
NO debes romper contratos existentes.
NO debes eliminar funcionalidades existentes simplemente porque no estén visibles.
NO debes asumir que una certificación anterior significa que el código actual está correcto.

============================================================
OBJETIVO PRINCIPAL
============================================================

El objetivo es transformar el frontend actual en un ERP profesional, moderno, denso, ergonómico y extremadamente fácil de utilizar para un COORDINATOR.

La unidad central de trabajo debe ser:

                    SERVICE

Todo lo relacionado con un servicio debe poder gestionarse desde:

                    /service/:serviceId

El usuario debe poder llegar al Service desde:

- Calendar
- Dashboard
- Transport List
- Driver Reports
- Driver Link
- WhatsApp Inbox
- Reconciliation
- Rapportino
- cualquier otra pantalla relacionada

y, una vez dentro del Service, NO debe perder el contexto del servicio.

El Service debe convertirse en el verdadero:

                    SERVICE WORKSPACE
                    / SERVICE COMMAND CENTER

Desde allí debe ser posible consultar y gestionar de forma coherente:

- información general
- lifecycle operativo
- lifecycle financiero
- movimientos
- driver
- driver link
- driver report
- WhatsApp
- inbox
- reconciliation
- rapportino
- costes
- ingresos
- facturación
- actividad
- historial
- incidencias
- acciones pendientes
- permisos
- trazabilidad

sin obligar al coordinador a saltar innecesariamente entre pantallas.

============================================================
REGLA CRÍTICA — NO CONFÍES EN DOCUMENTACIÓN ANTERIOR
============================================================

El proyecto puede contener documentos como:

- FINAL-CERTIFICATION
- audit reports
- implementation reports
- completion reports
- QA reports
- previous prompts
- changelogs

NO asumir que esos documentos representan el estado actual.

El código actual es la fuente de verdad.

Cada afirmación de esos documentos debe volver a verificarse contra:

frontend
backend
API
permissions
routes
tests

Si existe una discrepancia:

CÓDIGO ACTUAL
>
DOCUMENTACIÓN ANTIGUA

Debes actualizar la documentación al final.

============================================================
PROHIBIDO HACER UN REDISEÑO SOLAMENTE VISUAL
============================================================

NO limitar el trabajo a:

- CSS
- colores
- spacing
- borders
- shadows
- typography
- responsive CSS

Antes de modificar visualmente una pantalla debes determinar:

1. qué información representa
2. qué backend la alimenta
3. qué acciones permite
4. qué rol puede ejecutar cada acción
5. qué estado del Service representa
6. qué otras pantallas duplican esa función
7. qué URL debe representar
8. qué eventos/logs genera
9. qué sucede después de una mutation
10. cómo funciona en mobile

El rediseño visual debe ser consecuencia de la arquitectura funcional.

============================================================
SERVICE WORKSPACE GOLDEN RULE
============================================================

SI UNA FUNCIÓN ESTÁ RELACIONADA CON UN SERVICE:

DEBE SER POSIBLE LLEGAR A ELLA DESDE EL SERVICE.

Y SI EL USUARIO LLEGA A ESA FUNCIÓN DESDE OTRA PARTE DEL ERP:

DEBE PODER VOLVER AL SERVICE CON UN SOLO CLICK.

Ejemplo:

Calendar
→ Service

WhatsApp Inbox
→ Service / WhatsApp

Driver Report Inbox
→ Service / Driver Report

Reconciliation
→ Service / Reconciliation

Rapportino
→ Service / Finance / Rapportino

Driver Link
→ Service / Communication / Driver Link

Nunca perder:

Service ID
Driver ID
Project ID
Correlation ID

============================================================
REGLA ABSOLUTA DE EJECUCIÓN
============================================================

NO empieces directamente a modificar código.

PRIMERO debes realizar una AUDITORÍA COMPLETA.

Debes recorrer:

1. frontend
2. backend
3. API
4. routing
5. modelos
6. stores
7. permisos
8. roles
9. logs
10. Service lifecycle
11. Driver Link
12. WhatsApp
13. Driver Reports
14. Reconciliation
15. Rapportino
16. responsive/mobile
17. navegación
18. estados loading/error/empty
19. componentes duplicados
20. pantallas duplicadas
21. rutas duplicadas
22. contratos frontend/backend

NO declares terminado ningún punto simplemente porque exista el archivo correspondiente.

Debes verificar que:

FRONTEND
       ↓
API
       ↓
BACKEND
       ↓
DATABASE / STORAGE
       ↓
EVENTS / LOGS

se corresponden realmente.

============================================================
REGLA DE NO-OMISIÓN
============================================================

Debes mantener una CHECKLIST MAESTRA.

Cada tarea tendrá:

[ ] PENDIENTE
[~] EN PROGRESO
[x] IMPLEMENTADO
[✓] VERIFICADO

No puedes marcar:

[x] IMPLEMENTADO

sin haber comprobado el código.

No puedes marcar:

[✓] VERIFICADO

sin haber comprobado:

- frontend
- backend
- API
- permisos
- responsive
- estados
- errores
- navegación

Cuando termines debes entregar:

MASTER IMPLEMENTATION CHECKLIST

con TODOS los puntos.

NO debes decir simplemente:
"todo está listo".

Debes demostrarlo.

============================================================
FASE 0 — AUDITORÍA INICIAL
============================================================

Antes de modificar nada:

1. Analiza estructura completa del proyecto.

2. Identifica:

- entry points
- router
- layouts
- screens
- pages
- components
- hooks
- contexts
- stores
- services
- API clients
- backend endpoints
- repositories
- models
- permissions
- roles
- logs
- tests

3. Construye un mapa:

ROUTE
→ SCREEN
→ COMPONENTS
→ API
→ BACKEND FUNCTION
→ DATABASE/STORAGE
→ PERMISSION

4. Detecta:

- duplicaciones
- código muerto
- rutas duplicadas
- componentes equivalentes
- navegación antigua
- modals innecesarios
- drawers innecesarios
- lógica duplicada
- permisos inconsistentes
- nombres inconsistentes

5. NO elimines nada todavía.

Primero presenta:

ARCHITECTURE AUDIT

============================================================
FASE 1 — ROUTING Y NAVEGACIÓN
============================================================

El router debe ser la fuente de verdad.

El Service debe utilizar URLs profundas.

Ejemplo:

/service/:serviceId

Y:

/service/:serviceId/overview
/service/:serviceId/movements
/service/:serviceId/operations
/service/:serviceId/communication
/service/:serviceId/finance
/service/:serviceId/history

Si se decide utilizar tabs internas, deben seguir siendo deep-linkable.

Ejemplo:

/service/123/communication/whatsapp

debe abrir directamente:

Service 123
→ Communication
→ WhatsApp

NO:

URL dice WhatsApp
pero UI muestra Overview.

============================================================
IMPORTANTE
============================================================

NO utilizar:

initialTab

como única fuente de verdad.

La URL debe controlar el estado de navegación.

La navegación debe ser:

URL
 ↓
route params
 ↓
active section
 ↓
render

No:

URL
 ↓
initial state
 ↓
estado independiente

============================================================
FASE 2 — ELIMINAR DOBLE NAVEGACIÓN
============================================================

Actualmente existe:

GLOBAL NAVIGATION
+
SERVICE NAVIGATION

Esto genera demasiado consumo horizontal.

Cuando el usuario entra en:

/service/:serviceId

debe activarse:

SERVICE WORKSPACE MODE

La navegación global debe:

- minimizarse
- convertirse en icon/menu
- poder abrirse como overlay
- no ocupar innecesariamente espacio

El Service debe utilizar prácticamente todo el viewport.

Desktop:

GLOBAL NAV
→ COLLAPSIBLE

SERVICE WORKSPACE
→ FULL WIDTH

Mobile:

GLOBAL NAV
→ DRAWER

============================================================
FASE 3 — NUEVO SERVICE WORKSPACE
============================================================

Rediseñar completamente:

ServiceWorkspace

No tratarlo como un simple modal.

Debe convertirse en una página/record workspace real.

Estructura:

------------------------------------------------------------
HEADER
------------------------------------------------------------

←

SVC-TA-2026-00001

Driver Name

Date

Service Type

Vehicle

Operational Status

Financial Status

[PRIMARY ACTION]

------------------------------------------------------------
LIFECYCLE
------------------------------------------------------------

OPERATIONAL

Imported
→ Assigned
→ Confirmed
→ En Route
→ Completed
→ Reported
→ Review
→ Validated

FINANCIAL

Pending
→ Calculated
→ Reconciliation
→ Approved
→ Billable
→ Invoiced
→ Paid
→ Closed

Ambos deben poder visualizarse.

NO mostrar únicamente:

"In Review"

si existe información financiera adicional.

------------------------------------------------------------
NAVIGATION
------------------------------------------------------------

Reducir las pestañas actuales.

Propuesta:

Overview
Movements
Operations
Communication
Finance
History

============================================================
OPERATIONS
============================================================

Agrupar:

- Driver
- Driver Report
- Reconciliation

============================================================
COMMUNICATION
============================================================

Agrupar:

- Driver Link
- WhatsApp
- Inbox

============================================================
FINANCE
============================================================

Agrupar:

- Rapportino
- Revenue
- Cost
- Invoice
- Payment

============================================================
HISTORY
============================================================

Activity Feed contextual.

============================================================
FASE 4 — SERVICE OVERVIEW
============================================================

Overview NO debe ser simplemente una ficha.

Debe convertirse en:

SERVICE COMMAND CENTER.

Debe mostrar simultáneamente:

1. Service identity
2. Next Action
3. Operational lifecycle
4. Financial lifecycle
5. Driver
6. Movements
7. Driver Link status
8. Driver Report status
9. WhatsApp status
10. Reconciliation status
11. Financial status
12. Alerts
13. Recent Activity

Diseñar una estructura de alta densidad.

No utilizar grandes espacios vacíos.

No crear tarjetas gigantes sin información.

Priorizar:

- tablas compactas
- filas
- badges
- status indicators
- action buttons
- agrupaciones

============================================================
FASE 5 — ACTION CENTER
============================================================

El Service debe calcular una:

NEXT ACTION

basándose en:

- OperationalStatus
- FinancialStatus
- Driver
- Driver Link
- Driver Report
- Inbox
- WhatsApp
- Reconciliation
- Permissions

Ejemplos:

Assign Driver
Confirm Service
Start Service
Complete Service
Request Driver Report
Review Driver Report
Resolve Reconciliation
Validate Service
Approve Financial Data
Mark Billable

No mostrar una acción que el usuario no pueda ejecutar.

No esperar a que backend devuelva ACCESS_DENIED para ocultarla.

============================================================
FASE 6 — NO CERRAR EL SERVICE DESPUÉS DE ACCIONES
============================================================

Actualmente una acción puede provocar:

ACTION
→ update
→ close workspace

ESTO DEBE CORREGIRSE.

Debe ser:

ACTION
→ backend mutation
→ updated Service
→ refetch/returned DTO
→ update UI
→ workspace permanece abierto

Ejemplo:

Validate
↓
backend
↓
Service = Validated
↓
Lifecycle actualizado
↓
Next Action actualizado
↓
Activity agregada
↓
Workspace sigue abierto

============================================================
FASE 7 — DRIVER
============================================================

Dentro de:

Operations → Driver

mostrar:

- driver
- phone
- vehicle
- assignment
- driver status
- driver link
- report status
- WhatsApp status
- last activity

Permitir:

- cambiar driver
- crear driver si corresponde
- actualizar teléfono cuando esté permitido
- abrir comunicación
- abrir Driver Link
- abrir Driver Report

Toda modificación debe respetar permissions.

============================================================
FASE 8 — DRIVER LINK
============================================================

Driver Link debe integrarse completamente con Service.

Mostrar:

LINK STATUS

Created
Opened
Submitted
Expired
Revoked
Updated

Mostrar:

- creation time
- expiry
- access
- last access
- submission
- driver
- service
- events

Utilizar:

DriverLinkEvents

para Activity.

El Service debe poder abrir:

/service/:id/communication/driver-link

y nunca perder contexto.

Acciones:

Create
Regenerate
Copy
Open
Revoke

según permisos.

No mostrar acciones no autorizadas.

============================================================
FASE 9 — WHATSAPP
============================================================

NO tratar WhatsApp únicamente como:

"Open WhatsApp".

Integrar:

WhatsApp
→ capture
→ parser
→ inbox
→ normalize
→ correlation
→ review
→ accept/reject
→ DriverReport

Dentro del Service mostrar:

- último mensaje
- estado
- driver
- service match
- parsing status
- correlation
- discrepancies
- report result

Ejemplo:

WhatsApp received
✓ Parsed
✓ Driver matched
✓ Service matched
⚠ Difference detected

Permitir:

Review
Accept
Reject
Open WhatsApp

según permisos.

No duplicar:

WhatsAppCaptureScreen
WhatsAppParser
WhatsAppTab
WhatsAppParserSection

sin una justificación arquitectónica clara.

Consolidar la lógica.

============================================================
FASE 10 — DRIVER REPORT
============================================================

El flujo debe ser:

Driver
→ Driver Link / WhatsApp
→ Submission
→ Inbox
→ Normalization
→ Review
→ Accept
→ DriverReport
→ Service
→ Reconciliation
→ Validation

Debe poder seguirse desde el Service.

Mostrar:

- status
- received at
- source
- driver
- correlation ID
- parsed values
- expected values
- discrepancies
- accepted/rejected
- reviewer
- review time

============================================================
FASE 11 — RECONCILIATION
============================================================

NO convertir:

reconciliation exists

en:

Completed.

Respetar estados reales del backend.

Ejemplo:

Pending
In Progress
Resolved

Mostrar:

- expected
- actual
- difference
- status
- reason
- resolution
- user
- timestamp

Debe estar relacionado con:

Service
Movement
DriverReport

cuando corresponda.

============================================================
FASE 12 — RAPPORTINO
============================================================

MUY IMPORTANTE.

El Rapportino dentro de Service debe corresponder REALMENTE al Service.

NO traer todos los rapportini del Project y mostrarlos dentro del Service.

Debe existir una relación inequívoca:

Rapportino
→ ServiceID

Si backend actualmente no ofrece:

getRapportinoByService(serviceId)

crear/ajustar el endpoint necesario sin romper APIs existentes.

Frontend:

Service
→ Finance
→ Rapportino

debe mostrar exclusivamente la información correspondiente.

============================================================
FASE 13 — FINANCE
============================================================

El Service debe poder mostrar:

Revenue
Cost
Margin
Rapportino
Invoice
Payment

Respetando:

FinancialStatus

y permisos.

Ejemplo:

Operational:
VALIDATED

Financial:
PENDING

Debe ser perfectamente visible.

============================================================
FASE 14 — HISTORY
============================================================

NO utilizar:

getAuditLog(200)

y filtrar en frontend.

Eso NO garantiza que el histórico esté completo.

Crear/utilizar:

getServiceActivity(serviceId)

o equivalente.

El Service debe mostrar:

Activity Feed

Ejemplo:

10:15 Service assigned
10:22 Driver Link created
10:28 Driver opened link
10:47 Driver submitted report
10:48 Inbox captured report
10:50 WhatsApp received
10:55 Discrepancy detected
11:03 Coordinator reviewed
11:10 Service validated

Separar:

ACTIVITY FEED

de:

AUDIT LOG

Audit Log debe ser técnico/inmutable.

Activity Feed debe ser legible para usuarios.

============================================================
FASE 15 — DRIVER LINK EVENTS
============================================================

Integrar:

DriverLinkEvents

en Activity.

Eventos:

CREATED
ACCESSED
SUBMITTED
EXPIRED
REVOKED
UPDATED

Relacionarlos con:

ServiceID
DriverID
CorrelationID

============================================================
FASE 16 — PERMISSIONS
============================================================

AUDITAR COMPLETAMENTE:

Frontend permissions
Backend permissions
Permission Matrix
Roles
Route guards
Component guards
Mutation guards

No confiar únicamente en frontend.

Backend debe seguir siendo autoridad.

Frontend debe anticipar permisos para UX.

============================================================
CREAR MATRIZ
============================================================

Para cada rol:

ADMIN
COORDINATOR
ACCOUNTING
DRIVER
VIEWER
u otros existentes

comprobar:

Dashboard
Calendar
Service
Driver
Driver Link
Driver Reports
WhatsApp
Inbox
Reconciliation
Rapportino
Finance
Users
Settings
Audit
Logs

Para cada acción:

VIEW
CREATE
EDIT
DELETE
ASSIGN
CONFIRM
START
COMPLETE
REPORT
REVIEW
VALIDATE
APPROVE
RECONCILE
INVOICE
etc.

Comparar:

FRONTEND
vs
BACKEND

Si existe una diferencia:

DOCUMENTAR
→ CORREGIR
→ TESTEAR

============================================================
FASE 17 — DRIVER ROLE
============================================================

Verificar específicamente que Driver pueda:

- ver sus propios servicios
- acceder a sus servicios
- abrir su Driver Link
- enviar report
- consultar lo que corresponda
- NO ver servicios ajenos
- NO ejecutar acciones de coordinator
- NO acceder a información financiera restringida

Si backend actualmente exige:

service.list

para getService

y Driver sólo tiene:

service.list_own

corregir el diseño de autorización.

Nunca resolverlo simplemente quitando seguridad.

============================================================
FASE 18 — ACTION VISIBILITY
============================================================

Toda acción UI debe pasar por:

can(permission)

Ejemplo conceptual:

if (can("service.validate")) {
    show Validate
}

Pero backend debe verificar nuevamente.

Nunca:

frontend = seguridad

Frontend = UX

Backend = seguridad real

============================================================
FASE 19 — MOBILE
============================================================

NO hacer simplemente:

desktop width: 100%

Debe diseñarse una composición mobile específica.

Verificar TODAS las pantallas:

1. Login
2. Dashboard
3. Calendar
4. Services
5. Service Workspace
6. Service Overview
7. Movements
8. Driver
9. Driver Link
10. Driver Report
11. WhatsApp
12. Inbox
13. Reconciliation
14. Rapportino
15. Finance
16. History
17. Driver Reports
18. Settings
19. Users
20. Roles
21. Audit
22. Logs
23. cualquier pantalla adicional

Para cada pantalla verificar:

- 320px
- 360px
- 375px
- 390px
- 414px
- 768px
- desktop

============================================================
MOBILE SERVICE
============================================================

Debe tener:

Header compacto
↓
Status
↓
Next Action
↓
Important information
↓
Sections
↓
Activity

No utilizar sidebars permanentes.

Utilizar:

drawer
bottom sheet
collapsible sections
horizontal tabs
sticky actions

según necesidad.

============================================================
FASE 20 — RESPONSIVE SERVICE HEADER
============================================================

Desktop:

Service ID
Driver
Date
Status
Primary Action

Tablet:

Service ID
Status
Primary Action
More

Mobile:

←
Service ID
Status

[⋮]

El resto en panel.

============================================================
FASE 21 — SPACING / DENSITY
============================================================

Optimizar:

padding
margin
line-height
card heights
header heights
sidebar width
table density

Objetivo:

ERP de alta densidad informativa.

No dashboard de marketing.

Eliminar:

espacios vacíos
cards enormes
secciones innecesariamente altas

Pero NO sacrificar legibilidad.

============================================================
FASE 22 — SERVICE CONTEXT PANEL
============================================================

En desktop debe existir un panel contextual opcional.

Ejemplo:

MAIN CONTENT 75%
CONTEXT PANEL 25%

Panel:

NEXT ACTION
Driver
Driver Link
Report
WhatsApp
Reconciliation
Alerts

Debe poder:

collapse
expand

Cuando está cerrado:

MAIN CONTENT = 100%

Esto evita desperdicio de espacio.

============================================================
FASE 23 — CALENDAR / GLOBAL ENTRY
============================================================

Desde Calendar:

click Service

debe abrir:

/service/:id

No un modal antiguo.

Si existe un modal de Service:

eliminarlo progresivamente.

Debe existir un único concepto de:

Service Workspace.

============================================================
FASE 24 — DASHBOARD ENTRY
============================================================

Desde Dashboard:

Service
→ /service/:id

Mantener contexto.

============================================================
FASE 25 — DRIVER REPORT ENTRY
============================================================

Desde Driver Reports:

Report
→ Service

debe navegar a:

/service/:id/operations/report

No abrir una pantalla aislada que duplique el Service.

============================================================
FASE 26 — WHATSAPP ENTRY
============================================================

Desde WhatsApp Inbox:

Message
→ correlated Service

navegar a:

/service/:id/communication/whatsapp

con el mensaje seleccionado.

============================================================
FASE 27 — RECONCILIATION ENTRY
============================================================

Desde Reconciliation:

record
→ Service

navegar a:

/service/:id/operations/reconciliation

============================================================
FASE 28 — RAPPORTINO ENTRY
============================================================

Desde Rapportino:

record
→ Service

navegar a:

/service/:id/finance/rapportino

============================================================
FASE 29 — NO DUPLICATE SCREENS
============================================================

Buscar y detectar:

DriverReportsScreen
DriverSubmissionsScreen
ReportInboxScreen
WhatsAppCaptureScreen
WhatsAppParserSection
WhatsAppTab
ReportsScreen
HistoryScreen
etc.

Para cada uno determinar:

- necesario
- duplicado
- wrapper
- legacy
- reemplazar
- eliminar

NO eliminar inmediatamente.

Primero mapear dependencias.

Después consolidar.

============================================================
FASE 30 — LOADING STATES
============================================================

Cada pantalla debe tener:

Skeleton
Loading
Loaded
Empty
Error
Permission denied

No utilizar simplemente:

"Loading..."

en todo.

Service Workspace debe mantener layout estable durante loading.

============================================================
FASE 31 — ERROR STATES
============================================================

Cada API debe manejar:

401
403
404
409
422
500
network error

Especialmente:

409 Conflict

para:

- locks
- concurrent modifications
- status transitions

Mostrar mensajes humanos.

Ejemplo:

"Another coordinator modified this service. Reload to continue."

============================================================
FASE 32 — OPTIMISTIC VS SERVER STATE
============================================================

No actualizar visualmente un Service como definitivo antes de confirmar backend.

Mutation:

UI
→ request
→ backend
→ response
→ state update

Si falla:

rollback
+
error message

============================================================
FASE 33 — DATA REFRESH
============================================================

Después de cualquier mutation:

Assign
Confirm
Start
Complete
Report
Review
Validate
Reconciliation
Driver Link
etc.

Actualizar:

Service
Lifecycle
Next Action
Activity
Related sections

sin cerrar workspace.

============================================================
FASE 34 — LOGGING
============================================================

Verificar que acciones importantes generan trazabilidad.

Ejemplos:

Service assigned
Driver changed
Driver Link created
Driver Link opened
Driver Link revoked
Report received
Report accepted
Report rejected
WhatsApp captured
WhatsApp parsed
Reconciliation changed
Service validated
Financial status changed

Cada evento debe tener cuando corresponda:

actor
timestamp
serviceId
driverId
source
correlationId

============================================================
FASE 35 — AUDIT LOG
============================================================

Verificar:

who
when
entity
entityId
action
field
oldValue
newValue
source
correlationId

NO permitir modificaciones al audit log.

============================================================
FASE 36 — CORRELATION
============================================================

Revisar que:

ServiceID
DriverID
DriverReportID
DriverLinkID
InboxID
ReconciliationID
RapportinoID
CorrelationID

estén correctamente relacionados.

Especial atención:

WhatsApp
Driver Link
Driver Report

No permitir correlaciones ambiguas.

============================================================
FASE 37 — SERVICE LIFECYCLE COMPLETO
============================================================

Ejecutar mentalmente y/o mediante tests:

IMPORT
↓
ASSIGN DRIVER
↓
CONFIRM
↓
START
↓
COMPLETE
↓
DRIVER REPORT
↓
INBOX
↓
REVIEW
↓
RECONCILIATION
↓
VALIDATE
↓
FINANCIAL CALCULATION
↓
APPROVAL
↓
BILLABLE
↓
INVOICE
↓
PAYMENT
↓
CLOSED

Verificar cada transición:

- UI
- backend
- permissions
- logs
- activity
- next action
- URL
- mobile

============================================================
FASE 38 — DRIVER FLOW
============================================================

Verificar:

Service assigned
↓
Driver receives link
↓
Driver opens link
↓
Driver submits
↓
Backend receives
↓
Inbox
↓
Correlation
↓
Driver Report
↓
Coordinator review
↓
Reconciliation
↓
Validation

Verificar también:

- expired link
- revoked link
- duplicate submission
- invalid token
- wrong driver
- wrong service
- malformed submission

============================================================
FASE 39 — WHATSAPP FLOW
============================================================

Verificar:

WhatsApp
↓
capture
↓
parse
↓
normalize
↓
driver matching
↓
service matching
↓
inbox
↓
review
↓
accept
↓
report
↓
reconciliation
↓
service

Verificar:

- unknown driver
- unknown service
- ambiguous service
- malformed message
- duplicate message
- partial data
- conflicting data

============================================================
FASE 40 — CALENDAR FLOW
============================================================

Calendar
↓
Service
↓
Service Workspace
↓
Action
↓
Backend
↓
updated Service
↓
Calendar refresh

No perder estado.

============================================================
FASE 41 — TABLET
============================================================

Verificar específicamente:

768
820
834
1024
1280

Evitar:

horizontal overflow
double sidebar
tiny buttons
unusable tables
hidden primary actions

============================================================
FASE 42 — ACCESSIBILITY
============================================================

Verificar:

keyboard navigation
focus
aria-label
contrast
button labels
tooltips
screen readers
focus trap en drawers
focus trap en modals que permanezcan

No depender solamente del color.

============================================================
FASE 43 — VISUAL DESIGN
============================================================

Diseñar:

moderno
formal
enterprise
limpio
profesional

Evitar:

- exceso de colores
- cards gigantes
- gradients innecesarios
- sombras excesivas
- apariencia de dashboard genérico
- iconos sin significado
- botones ambiguos

Usar:

- typography consistente
- spacing system
- status badges
- compact tables
- clear hierarchy
- restrained colors
- strong primary action

============================================================
FASE 44 — SERVICE ACTION BAR
============================================================

Primary action:

una sola acción principal.

Secondary:

More / ⋮

Ejemplo:

[Validate] [⋮]

Menu:

Assign
Confirm
Start
Complete
Request Report
Review
Reconciliation
etc.

No llenar header con 8 botones.

============================================================
FASE 45 — MOBILE ACTION BAR
============================================================

Mobile:

[Primary Action]

[⋮]

Primary action debe ser sticky cuando sea necesario.

============================================================
FASE 46 — TESTING
============================================================

Crear/verificar tests para:

routing
service loading
service mutation
permissions
driver
driver link
whatsapp
driver reports
reconciliation
rapportino
history
financial
mobile states

============================================================
FASE 47 — E2E
============================================================

Crear escenarios:

TEST 01
Coordinator opens Service from Calendar.

TEST 02
Coordinator assigns Driver.

TEST 03
Coordinator confirms.

TEST 04
Driver Link created.

TEST 05
Driver opens link.

TEST 06
Driver submits report.

TEST 07
Inbox receives report.

TEST 08
Coordinator reviews.

TEST 09
Reconciliation created.

TEST 10
Coordinator resolves.

TEST 11
Coordinator validates.

TEST 12
Financial status progresses.

TEST 13
Accounting accesses financial data.

TEST 14
Driver cannot access unauthorized Service.

TEST 15
User without permission cannot validate.

TEST 16
WhatsApp message correlated.

TEST 17
WhatsApp discrepancy appears.

TEST 18
Activity log updated.

TEST 19
Audit log updated.

TEST 20
Service remains open after mutation.

TEST 21
Deep link opens correct section.

TEST 22
Mobile Service usable.

============================================================
FASE 48 — PERMISSION MATRIX TEST
============================================================

Para cada role ejecutar:

VIEW
CREATE
EDIT
DELETE
ACTION

y registrar:

EXPECTED
ACTUAL

Cualquier diferencia:

FAIL

============================================================
FASE 49 — RESPONSIVE CERTIFICATION
============================================================

Para cada pantalla crear matriz:

SCREEN
320
360
375
390
414
768
1024
1280
1440+

Resultado:

PASS
FAIL

Con observaciones.

============================================================
FASE 50 — PERFORMANCE
============================================================

Evitar:

- llamadas API duplicadas
- renders innecesarios
- fetch global de logs
- fetch de todos los rapportini para un Service
- datos duplicados
- listeners sin cleanup

Service Workspace debe cargar solamente:

- Service
- información necesaria
- relaciones necesarias

No cargar todo el ERP.

============================================================
FASE 51 — CLEANUP
============================================================

Una vez verificado el nuevo flujo:

eliminar o deprecar:

- navegación antigua
- modals duplicados
- screens duplicadas
- hooks obsoletos
- contexts obsoletos
- rutas duplicadas
- código muerto

PERO solamente después de verificar dependencias.

============================================================
FASE 52 — DOCUMENTACIÓN
============================================================

Actualizar:

routes
architecture
permissions
service lifecycle
driver flow
whatsapp flow
driver link flow
reconciliation flow
logging
mobile behavior

============================================================
FASE 53 — CERTIFICACIÓN FINAL
============================================================

Crear una nueva:

FINAL-CERTIFICATION-MATRIX

NO reutilizar ciegamente una certificación anterior.

La certificación anterior es solamente referencia.

El código actual debe ser auditado nuevamente.

La matriz debe incluir:

1. Frontend
2. Backend
3. API
4. Database
5. Routing
6. Permissions
7. Roles
8. Service lifecycle
9. Driver
10. Driver Link
11. Driver Report
12. WhatsApp
13. Inbox
14. Reconciliation
15. Rapportino
16. Finance
17. Activity
18. Audit
19. Desktop
20. Tablet
21. Mobile
22. Accessibility
23. Error handling
24. Loading states
25. Security
26. Performance

============================================================
FORMATO FINAL OBLIGATORIO
============================================================

Al finalizar debes entregar:

------------------------------------------------------------
1. EXECUTIVE SUMMARY
------------------------------------------------------------

Qué se cambió.

------------------------------------------------------------
2. ARCHITECTURE CHANGES
------------------------------------------------------------

Antes:
...

Después:
...

------------------------------------------------------------
3. SERVICE WORKSPACE
------------------------------------------------------------

Lista completa de cambios.

------------------------------------------------------------
4. ROUTING
------------------------------------------------------------

Todas las rutas.

------------------------------------------------------------
5. SCREEN AUDIT
------------------------------------------------------------

Cada pantalla:

PASS / FAIL

------------------------------------------------------------
6. MOBILE AUDIT
------------------------------------------------------------

Cada pantalla:

320
360
375
390
414
768
1024
desktop

------------------------------------------------------------
7. ROLE/PERMISSION MATRIX
------------------------------------------------------------

Role
Permission
Frontend
Backend
Result

------------------------------------------------------------
8. SERVICE LIFECYCLE TEST
------------------------------------------------------------

Cada transición.

------------------------------------------------------------
9. DRIVER FLOW
------------------------------------------------------------

PASS / FAIL

------------------------------------------------------------
10. DRIVER LINK FLOW
------------------------------------------------------------

PASS / FAIL

------------------------------------------------------------
11. WHATSAPP FLOW
------------------------------------------------------------

PASS / FAIL

------------------------------------------------------------
12. DRIVER REPORT FLOW
------------------------------------------------------------

PASS / FAIL

------------------------------------------------------------
13. RECONCILIATION FLOW
------------------------------------------------------------

PASS / FAIL

------------------------------------------------------------
14. FINANCIAL FLOW
------------------------------------------------------------

PASS / FAIL

------------------------------------------------------------
15. LOGGING
------------------------------------------------------------

Activity
Audit
DriverLinkEvents
Inbox

------------------------------------------------------------
16. DUPLICATES REMOVED
------------------------------------------------------------

Lista.

------------------------------------------------------------
17. BACKEND/FRONTEND MISMATCHES
------------------------------------------------------------

Lista de todos los encontrados y corregidos.

------------------------------------------------------------
18. TEST RESULTS
------------------------------------------------------------

Build
Unit
Integration
E2E
Responsive

------------------------------------------------------------
19. REMAINING ISSUES
------------------------------------------------------------

ESTA SECCIÓN ES OBLIGATORIA.

Si existe cualquier cosa pendiente:

PENDIENTE
→ describir exactamente qué
→ archivo
→ componente
→ backend
→ motivo

No ocultar pendientes.

------------------------------------------------------------
20. FINAL CERTIFICATION
------------------------------------------------------------

Debe ser:

CERTIFIED

solamente si:

TODOS los puntos están:

[✓] IMPLEMENTED
[✓] VERIFIED

Si existe uno solo:

[ ] PENDING

entonces el proyecto NO puede declararse completamente certificado.

============================================================
REGLA FINAL
============================================================

NO QUIERO UNA RESPUESTA GENÉRICA.

NO QUIERO:

"he mejorado la interfaz"

"responsive optimizado"

"roles revisados"

"todo funciona"

Quiero:

archivo
→ componente
→ cambio
→ motivo
→ backend relacionado
→ permission relacionada
→ test
→ resultado

Trabaja de manera incremental.

FASE 0
→ auditar

FASE 1
→ corregir routing

FASE 2
→ corregir Service Workspace

FASE 3
→ corregir lifecycle

FASE 4
→ corregir Driver

FASE 5
→ corregir Driver Link

FASE 6
→ corregir WhatsApp

FASE 7
→ corregir Driver Report

FASE 8
→ corregir Reconciliation

FASE 9
→ corregir Rapportino/Finance

FASE 10
→ corregir Activity/Audit

FASE 11
→ permisos/roles

FASE 12
→ responsive/mobile

FASE 13
→ duplicaciones/cleanup

FASE 14
→ tests

FASE 15
→ certificación

NO SALTAR FASES.

NO MARCAR UNA FASE COMO COMPLETA SI EXISTEN SUBTAREAS PENDIENTES.

============================================================
PRINCIPIO DE DISEÑO MÁS IMPORTANTE
============================================================

El coordinador debe pensar:

"Estoy trabajando sobre este Service."

NO:

"Tengo que ir a Driver Reports."

"Tengo que ir a WhatsApp."

"Tengo que ir a Reconciliation."

"Tengo que volver al Calendar."

"Tengo que buscar el Rapportino."

La aplicación debe pensar:

SERVICE
↓
Driver
↓
Driver Link
↓
Driver Report
↓
WhatsApp
↓
Reconciliation
↓
Rapportino
↓
Finance
↓
History

TODO debe permanecer conectado al Service.

El Service es la unidad central del ERP.

La aplicación debe optimizarse alrededor de ese concepto.

============================================================
ARQUITECTURA OBJETIVO
============================================================

                         ERP
                          │
       ┌──────────────────┼──────────────────┐
       ↓                  ↓                  ↓
   Calendar           WhatsApp          Driver Reports
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ↓
                    SERVICE #123
                          │
          ┌───────────────┼────────────────┐
          │               │                │
       Overview       Operations      Communication
          │               │                │
          │          ┌────┼────┐       ┌───┴────┐
          │          │    │    │       │        │
          │        Driver Report Recon  Link   WhatsApp
          │
          └───────────────┬────────────────┘
                          ↓
                       Finance
                          │
                  Rapportino / Cost
                  Revenue / Invoice
                          │
                          ↓
                       History
                          │
                 Activity + Audit
```
