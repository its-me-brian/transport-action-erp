# PROMPT MAESTRO — AUDITORÍA, FINALIZACIÓN, CORRECCIÓN Y PRUEBAS DEL ERP TRANSPORT ACTION

Actúa como **Lead Software Architect + Senior Full Stack Engineer + QA Engineer + Database/Domain Architect + Security Reviewer**.

Debes continuar y finalizar un proyecto ERP de gestión de transporte para producciones audiovisuales.

El proyecto utiliza:

* Frontend: React + TypeScript + Vite
* Backend: Google Apps Script
* Base de datos: Google Sheets
* Arquitectura de dominio: DDD / Aggregates / Commands / Repositories
* Autenticación mediante usuarios/tokens
* Control de permisos por roles
* Event Bus para auditoría/activity feed
* Locks para concurrencia
* Migraciones de schema
* Driver Reports
* Driver Links
* WhatsApp Parser
* Reconciliation
* Rapportinos
* Facturación
* Pagos
* Gastos
* Dashboards
* Auditoría

---

## 1. OBJETIVO PRINCIPAL

No quiero solamente una revisión.

Quiero que:

1. audites completamente el proyecto;
2. cruces documentación contra código real;
3. cruces frontend contra backend;
4. cruces backend contra modelo de datos;
5. cruces todos los resultados de revisiones anteriores;
6. detectes funcionalidades incompletas;
7. detectes funcionalidades implementadas pero no conectadas;
8. detectes código legacy;
9. detectes contradicciones;
10. implementes las correcciones necesarias;
11. agregues los tests que falten;
12. ejecutes todos los tests posibles;
13. corrijas los errores encontrados;
14. hagas una prueba funcional end-to-end;
15. documentes exactamente qué queda pendiente.

No debes limitarte a decirme qué está mal.

Cuando sea seguro y esté claro qué debe hacerse, **implementa la corrección directamente**.

No inventes funcionalidades que no estén justificadas por la documentación o por el comportamiento existente.

---

## 2. ARCHIVOS Y FUENTES DE VERDAD

Analiza primero todo el repositorio.

Prioridad de fuentes:

1. reglas de negocio y dominio;
2. state machines;
3. invariants;
4. commands;
5. aggregates;
6. workflows;
7. permissions;
8. infrastructure;
9. código backend;
10. API frontend;
11. componentes frontend;
12. tests;
13. README/documentación secundaria.

Si existe contradicción, no la ocultes.

Registra:

* qué dice la documentación;
* qué hace actualmente el backend;
* qué expone la API;
* qué usa realmente el frontend;
* qué prueban los tests;
* cuál debe ser el comportamiento final.

---

## 3. REVISIÓN ANTERIOR

También debes intentar acceder y analizar esta revisión compartida:

https://chatgpt.com/share/6a7e2b4c-e058-83eb-80a9-4e0c4be2194c

Si puedes acceder a ella:

1. extrae todas las observaciones;
2. clasifícalas como:
   * pendiente;
   * parcialmente resuelta;
   * resuelta;
   * obsoleta;
   * contradictoria;
3. cruza cada observación con el código actual;
4. no vuelvas a implementar algo que ya esté correctamente resuelto;
5. identifica cualquier problema nuevo introducido después de esa revisión.

Si el enlace no es accesible, continúa usando el repositorio y documenta esa limitación.

---

## 4. ARQUITECTURA OBJETIVO

La arquitectura final debe respetar:

```
Frontend
   ↓
API
   ↓
Permission/Auth
   ↓
Command / Query
   ↓
Aggregate / Domain
   ↓
Repository
   ↓
Google Sheets
```

No permitas que el frontend modifique directamente estados de negocio saltándose Commands.

Ejemplo:

CORRECTO:
```
facturarService(serviceId)
→ Command
→ validaciones
→ cambio FinancialStatus
```

INCORRECTO:
```
updateServiceField(serviceId, "FinancialStatus", "Facturado")
```

---

## 5. PROBLEMA CRÍTICO ACTUAL: CREACIÓN MANUAL DE SERVICE

Existe actualmente un problema importante:

NewServiceScreen/App.tsx permite crear un Service que termina solamente en el estado local de React.

El flujo actual utiliza aproximadamente:
```
handleAddService()
→ crea ID local man-...
→ setServices()
```

Esto NO es suficiente.

Debes implementar el flujo completo:

```
Frontend
→ createService()
→ API endpoint
→ validación de permisos
→ ServiceCommand / ServiceRepository
→ persistencia en Google Sheets
→ DTO
→ actualización de UI
```

El Service creado manualmente debe sobrevivir:
* refresh;
* logout/login;
* navegación;
* consulta desde otro usuario.

Debe tener un ID real del sistema.

No utilices IDs `man-*` como solución permanente.

Crea:
* endpoint backend;
* función frontend;
* DTO;
* validaciones;
* permisos;
* tests;
* integración con App/NewServiceScreen.

---

## 6. AUDITORÍA DEL SERVICE LIFECYCLE

Comprueba e implementa el lifecycle completo:

OperationalStatus:
```
Importado → Asignado → Confirmado → EnRuta → Realizado → Reportado → Validado
```

FinancialStatus:
```
Pendiente → Calculado → Confrontacion → ActualsConfirmados → Aprobado → Facturable → Facturado → Cobrado → Cerrado → CerradoComercial
```

Verifica que:
* no existan saltos ilegales;
* no existan retrocesos;
* no se pueda validar sin DriverReport aceptado;
* no se pueda validar sin Driver;
* no se pueda validar sin Vehicle;
* no se pueda validar sin RevenueBreakdown;
* no se pueda validar sin CostBreakdown;
* los breakdowns se congelen al validar;
* no se pueda facturar un Service no validado;
* no se pueda cobrar uno no facturado;
* no se pueda cerrar uno no cobrado;
* no se pueda cerrar comercialmente uno no cerrado.

---

## 7. REVISAR TODOS LOS COMMANDS

Audita:
* assignDriver
* confirmService
* startService
* completeService
* validateService
* facturarService
* cobrarService
* closeService
* cerrarComercialmente
* adjustRevenue
* adjustCost

Comprueba que:
* están documentados;
* están correctamente expuestos por API;
* tienen permisos;
* son utilizados por frontend cuando corresponda;
* tienen tests positivos;
* tienen tests negativos;
* tienen manejo de errores;
* generan eventos;
* respetan locks;
* respetan invariantes.

---

## 8. REVISAR DRIVER REPORT

El flujo final debe ser coherente:

```
Service Realizado → DriverReport → Pendiente → Aprobado/Rechazado → CostBreakdown cuando corresponde → Service Reportado → Reconciliation si corresponde → Validación → Service Validado
```

Comprueba:
* máximo un DriverReport activo;
* versionado correcto;
* rechazo permite nueva versión;
* reportes aprobados/rechazados quedan congelados;
* el driver solo puede acceder a sus servicios;
* coordinator/admin puede revisar;
* accounting no puede modificar reportes si la documentación lo prohíbe.

---

## 9. DRIVER LINKS

Audita completamente:
* generación;
* token;
* expiración;
* revocación;
* driver;
* proyecto;
* rango de fechas;
* formulario público;
* respuesta;
* persistencia;
* DriverReport;
* seguridad;
* reutilización del token;
* token expirado;
* token revocado.

Comprueba que un DriverLink nunca permita acceder a información de otro conductor.

---

## 10. WHATSAPP PARSER

Comprueba que:
* parsea todos los formatos documentados;
* maneja errores;
* no crea datos inválidos;
* no permite manipular servicios de otro conductor;
* produce el mismo formato de datos que DriverLinks;
* termina en el mismo pipeline de DriverReport/Inbox;
* está cubierto por tests.

Añade tests para:
* formatos válidos;
* formatos incompletos;
* números inválidos;
* horas inválidas;
* km negativos;
* mensajes ambiguos;
* texto vacío;
* múltiples servicios.

---

## 11. RECONCILIATION

Audita:
```
Production vs Driver vs Final
```

Debe quedar claro:
* quién crea;
* quién revisa;
* quién resuelve;
* quién puede modificar;
* cuándo se considera resuelto;
* cómo afecta al CostBreakdown;
* cómo afecta al Service;
* qué ocurre si production y driver difieren.

Prueba:
* coincidencia;
* diferencia de km;
* diferencia de horas;
* diferencia de diaria;
* festivo;
* nocturno;
* resolución manual;
* auto-resolución;
* doble resolución concurrente.

---

## 12. RAPPORTINO CLIENT

Comprueba:
```
Borrador → Revisado → Enviado → Aceptado → Facturado
```

Y:
* solo Services válidos;
* no duplicación;
* items correctos;
* LockedAmount;
* imposibilidad de modificar después de facturar;
* creación correcta de InvoiceItems;
* relación Service → RapportinoItem;
* relación Rapportino → Project/Client.

Comprueba también que todas las acciones importantes estén realmente disponibles desde la UI.

---

## 13. RAPPORTINO DRIVER

Audita:
```
Borrador → Revisado → Enviado → Aceptado → Pagado
```

Comprueba:
* Driver;
* Services;
* DriverAdvance;
* descuentos;
* pagos;
* LockedAmount;
* inmutabilidad.

---

## 14. RAPPORTINO COLLABORATOR

Audita exactamente el mismo flujo para colaboradores externos.

Comprueba:
* SupplierRate;
* Collaborator;
* Driver;
* ProviderType;
* ProviderID;
* costes;
* pagos.

Debe existir una única lógica coherente para internal_driver vs collaborator.

---

## 15. INVOICES

Audita:
```
Invoice → Borrador → Emitida → Enviada → PagoParcial/Pagada/Vencida → Anulada cuando corresponda
```

Comprueba invariantes:
* Invoice.Total = Subtotal + TaxAmount
* Invoice.Subtotal = SUM(InvoiceItems)
* Payment confirmado <= Invoice.Total

Comprueba que:
* InvoiceNumber se genere al emitir;
* importes se congelen al emitir;
* InvoiceItems sean inmutables;
* no se pueda anular con pagos;
* no se pueda editar una factura emitida.

---

## 16. PAYMENTS

Audita:
```
Registrado → Confirmado → Conciliado
```

Comprueba:
* payment registrado no afecta saldo;
* payment confirmado sí afecta saldo;
* no sobrepasa invoice total;
* payment confirmado es inmutable;
* payment conciliado es inmutable;
* duplicados;
* concurrencia.

---

## 17. EXPENSES

Audita:
```
Draft → Confirmed → Cancelled
```

Comprueba:
* Draft editable;
* Confirmed inmutable;
* Cancelled no contabiliza;
* AccountingDate;
* ExpenseDate;
* AccountingDate >= ExpenseDate;
* owner;
* project;
* permisos.

---

## 18. PROJECTS

Audita:
```
Nuovo → Preparazione → Attivo → Fatturazione → Incasso → Chiuso → Archiviato
```

Comprueba que las funciones:
* prepararProject
* activarProject
* pasarAFacturacionProject
* pasarACobroProject
* cerrarProject
* archiveProject

estén realmente conectadas a UI cuando deban estarlo.

---

## 19. DASHBOARDS

Existe backend para:
* main dashboard;
* project dashboard;
* driver dashboard;
* cash flow;
* profit;
* service summaries;
* pending validation;
* pending invoicing.

Determina qué fuente está utilizando actualmente cada pantalla.

No debe haber dos cálculos diferentes del mismo KPI.

Todos los importes financieros deben tener una única fuente de verdad.

Verifica:
* revenue;
* cost;
* profit;
* margin;
* estimated;
* actual;
* variance;
* cash flow;
* pending invoice;
* pending payment.

---

## 20. DOCUMENTS

Hay API/backend para documentos, pero aparentemente no existe integración completa con frontend.

Audita:
* upload;
* metadata;
* entityType;
* entityId;
* URL;
* MIME type;
* uploadedBy;
* permisos;
* eliminación;
* acceso.

Si es una funcionalidad definida por el dominio, intégrala correctamente.

---

## 21. AUDIT LOG Y ACTIVITY FEED

Todo Command importante debe:
* generar evento;
* generar audit log;
* generar activity feed cuando corresponda.

Los listeners NO deben modificar entidades contables.

Comprueba que:
* actor;
* timestamp;
* entity;
* entityId;
* action;
* oldValue;
* newValue

se registren correctamente.

---

## 22. PERMISSIONS

Haz una matriz real:

```
                admin  coordinator  accounting  driver  anonymous
```

Services / Projects / Clients / Drivers / Vehicles / DriverReports / Rapportinos / Invoices / Payments / Expenses / Documents / Reconciliation / Dashboard / Audit / Activity / Settings / Users

Para cada endpoint prueba:
* sin token;
* token inválido;
* usuario pendiente;
* usuario aprobado;
* cada rol.

No confíes exclusivamente en ocultar botones del frontend.

La seguridad real debe estar en backend.

---

## 23. API CONTRACT

Audita absolutamente todos los endpoints.

Para cada endpoint documenta:
* action;
* HTTP method;
* request;
* response;
* auth;
* permission;
* entity;
* errors;
* side effects;
* event;
* tests.

Comprueba especialmente la conversión:
```
camelCase frontend ↔ PascalCase backend
```

Incluyendo:
* null;
* undefined;
* '';
* 0;
* false;
* arrays;
* fechas;
* objetos JSON.

---

## 24. API FUNCTIONS SIN USO EN FRONTEND

Revisa especialmente estas funciones:
* facturarService
* cobrarService
* closeService
* prepararProject
* activarProject
* pasarAFacturacionProject
* pasarACobroProject
* cerrarProject
* submitDriverReport
* getDocuments
* createDocument
* deleteDocument
* getRevenueBreakdowns
* getCostBreakdowns
* calculateServiceEconomics
* applyRevenueBreakdown
* applyCostBreakdown
* getMainDashboard
* getProjectDashboard
* getDriverDashboard
* getCashFlow
* getServiceSummaryByProject
* getServiceSummaryByDriver
* getPendingValidation
* getPendingInvoicing

Para cada una determina:
A. Debe estar conectada al frontend → implementarlo.
B. Es backend-only → documentarlo.
C. Es legacy → eliminar o marcar claramente.
D. Está reemplazada → documentar reemplazo.

No dejes funciones ambiguas.

---

## 25. FRONTEND

Audita todos los componentes.

Especial atención a:
* DashboardScreen
* NewServiceScreen
* DriverPanelScreen
* ReportsScreen
* TransportListScreen
* ProjectScreen
* ClientScreen
* CollaboratorScreen
* VehicleScreen
* AccountingScreen
* RapportinoScreen
* DriverReportsScreen
* ReportInboxScreen
* ReconciliationScreen
* DriverLinksScreen
* DriverAdvanceScreen
* RateCardScreen
* DriverRateScreen
* ChangesScreen
* ActivityFeedScreen
* AuditCenterScreen
* UserManagementScreen

Comprueba:
* loading;
* empty state;
* errors;
* success;
* retry;
* permissions;
* stale data;
* refresh;
* optimistic updates;
* rollback;
* forms;
* validation;
* modal closing;
* duplicate submit;
* double click;
* concurrency.

---

## 26. ESTADO LOCAL VS PERSISTENCIA

Identifica todos los sitios donde el frontend modifica un objeto solamente con `setState()` cuando debería persistir mediante API.

El objetivo es:
* crear → backend
* editar → backend
* eliminar → backend
* cambiar estado → command backend
* calcular financiero → backend

No permitir falsas operaciones que desaparezcan al refrescar.

---

## 27. TESTING FRONTEND

Existen aproximadamente 20 tests de componentes.

Añade tests para todas las pantallas críticas que carezcan de cobertura.

Prioridad:

P0:
* NewServiceScreen
* Dashboard
* Reports
* DriverReport
* ReportInbox
* Reconciliation
* Accounting

P1:
* Project
* Client
* DriverPanel
* Documents
* Activity/Audit

Prueba:
* render;
* load;
* success;
* empty;
* error;
* form;
* validation;
* permissions;
* API call;
* response;
* state update.

---

## 28. TESTING BACKEND

Ejecuta:
* integration tests;
* negative tests;
* invariant tests;
* migration tests.

No te limites a comprobar que el test termina.

Verifica que realmente prueba la regla que dice probar.

Añade tests cuando exista una regla documentada sin cobertura.

---

## 29. TEST ISOLATION

Los tests backend no deben contaminar permanentemente la base de datos real.

Implementa, si la arquitectura lo permite:
* test company;
* test project;
* test data namespace;
* cleanup;
* teardown.

Nunca borres datos reales accidentalmente.

Si se necesita una Spreadsheet específica de pruebas, documenta exactamente cómo configurarla.

---

## 30. E2E

Implementa una prueba completa del siguiente escenario:

1. Login admin.
2. Crear OperatingCompany si es necesario.
3. Crear Client.
4. Crear Project.
5. Crear Driver.
6. Crear Vehicle.
7. Crear Service.
8. Asignar Driver + Vehicle.
9. Confirmar.
10. Iniciar.
11. Completar.
12. Crear DriverReport.
13. Aprobar DriverReport.
14. Crear/confirmar Reconciliation si corresponde.
15. Crear RevenueBreakdown.
16. Verificar CostBreakdown.
17. Validar Service.
18. Verificar locks.
19. Crear RapportinoClient.
20. Añadir Service.
21. Revisar.
22. Enviar.
23. Aceptar.
24. Facturar.
25. Verificar Invoice.
26. Emitir Invoice.
27. Registrar Payment.
28. Confirmar Payment.
29. Conciliar.
30. Cerrar Service.
31. Cerrar comercialmente.
32. Verificar Dashboard.
33. Verificar AuditLog.
34. Verificar ActivityFeed.

Este flujo debe sobrevivir a refresh de frontend.

---

## 31. TEST NEGATIVO COMPLETO

Prueba explícitamente:
* saltar estados;
* retroceder estados;
* modificar entidad bloqueada;
* modificar Invoice emitida;
* modificar Payment confirmado;
* modificar Expense confirmado;
* validar Service sin DriverReport;
* validar sin Driver;
* validar sin Vehicle;
* validar sin Revenue;
* validar sin Cost;
* pagar más que Invoice;
* anular Invoice con Payment;
* Driver acceder a otro Driver;
* Driver acceder a otro Service;
* usuario sin permiso;
* token expirado;
* token inválido;
* DriverLink expirado;
* DriverLink revocado;
* doble submit;
* doble aprobación;
* doble emisión;
* doble confirmación de Payment.

---

## 32. CONCURRENCIA

Verifica las reglas de CONCURRENCY.md.

Especialmente:
* dos usuarios validando;
* dos usuarios emitiendo;
* dos Payments;
* dos Rapportinos;
* dos DriverReports;
* dos operaciones simultáneas sobre el mismo Service.

Utiliza LockService donde corresponda.

No soluciones concurrencia únicamente en frontend.

---

## 33. MIGRATIONS

Audita:
* schemaVersion;
* migrations;
* idempotencia;
* rollback;
* ejecución repetida;
* datos existentes.

Una migración ejecutada dos veces no debe duplicar datos.

---

## 34. DOCUMENTACIÓN

Corrige README.

El README debe explicar realmente:
* arquitectura;
* frontend;
* Apps Script;
* Google Sheets;
* configuración;
* `VITE_GAS_WEBAPP_URL`;
* despliegue;
* permisos;
* setup de Sheets;
* migraciones;
* tests;
* deployment;
* troubleshooting.

No mantengas referencias obsoletas a Gemini/AI Studio si ya no son parte de la arquitectura.

Actualiza documentación cuando modifiques:
* entidades;
* reglas;
* comandos;
* estados;
* workflows;
* permisos;
* invariantes;
* infraestructura;
* migraciones;
* tests.

---

## 35. DEFINICIÓN DE "TERMINADO"

No consideres el proyecto terminado porque:
* compile;
* aparezca la UI;
* los mocks funcionen;
* un test aislado pase.

El proyecto se considera terminado solamente cuando:

1. frontend compila;
2. TypeScript no tiene errores;
3. tests frontend pasan;
4. tests backend pasan;
5. negative tests pasan;
6. invariants pasan;
7. API contracts coinciden;
8. permisos funcionan;
9. CRUD funciona realmente contra Sheets;
10. Service lifecycle funciona;
11. DriverReport funciona;
12. Reconciliation funciona;
13. Rapportinos funcionan;
14. Invoice funciona;
15. Payment funciona;
16. Expense funciona;
17. Dashboard usa datos reales;
18. Audit funciona;
19. Activity Feed funciona;
20. refresh no destruye datos;
21. no existen operaciones financieras únicamente locales;
22. no existen botones que aparenten funcionar pero no persistan;
23. no existen endpoints críticos sin UI cuando deben existir;
24. no existen UI actions que eviten Commands;
25. no existen reglas críticas únicamente en frontend.

---

## 36. PROCEDIMIENTO OBLIGATORIO DE TRABAJO

No modifiques código indiscriminadamente.

Trabaja en fases:

### FASE 1 — INVENTARIO

Crear:
* inventario frontend;
* inventario API;
* inventario backend;
* inventario entidades;
* inventario repositories;
* inventario commands;
* inventario queries;
* inventario tests.

### FASE 2 — MATRIZ DE TRAZABILIDAD

Crear una tabla:
```
Feature → Documentation → Entity → Repository → Command → API → Frontend → Test → Status
```

### FASE 3 — P0

Resolver primero:
* creación real de Service;
* lifecycle Service;
* seguridad;
* persistencia;
* DriverReport;
* Reconciliation;
* Invoice/Payment;
* errores de integración.

### FASE 4 — P1

Resolver:
* dashboards;
* documents;
* project lifecycle;
* economics;
* reportes;
* UX.

### FASE 5 — TESTS

Ejecutar todos. Corregir. Volver a ejecutar.

### FASE 6 — E2E

Ejecutar flujo completo.

### FASE 7 — DOCUMENTACIÓN

Actualizar documentación.

### FASE 8 — AUDITORÍA FINAL

Buscar:
* TODO;
* FIXME;
* legacy;
* endpoints sin uso;
* botones sin backend;
* backend sin UI;
* funciones duplicadas;
* reglas duplicadas;
* cálculos financieros frontend;
* estados modificados directamente;
* datos locales que deberían persistir.

---

## 37. FORMATO DE INFORME FINAL

Al finalizar entrega:

### A. RESUMEN
* estado final;
* porcentaje aproximado completado;
* principales problemas encontrados;
* principales correcciones.

### B. CAMBIOS REALIZADOS
Por archivo.

### C. FUNCIONALIDADES TERMINADAS

### D. FUNCIONALIDADES PENDIENTES
Cada una con: motivo, impacto, dificultad, dependencia.

### E. TESTS
```
Frontend: X passed / Y failed
Backend: X passed / Y failed
Negative: X passed / Y failed
E2E: PASS/FAIL
```

### F. PROBLEMAS DE INFRAESTRUCTURA

### G. RIESGOS

### H. CRITERIO DE GO-LIVE
GO o NO-GO con explicación.

---

## 38. REGLA FINAL

No quiero una solución superficial.

Si encuentras una función que parece funcionar pero realmente solo modifica estado local, considérala incompleta.

Si encuentras un endpoint que existe pero no tiene UI y debería tenerla, integra lo.

Si encuentras una UI que modifica directamente un estado que debería cambiar mediante Command, corrígela.

Si encuentras documentación que contradice al código, determina cuál debe ser la fuente correcta y actualiza ambas partes.

Si encuentras una regla de negocio sin test, crea el test.

Si encuentras un test que no comprueba realmente la regla, corrige el test.

Si encuentras código legacy, no lo mezcles silenciosamente con la arquitectura nueva.

Si una operación financiera puede producir datos incorrectos aunque la UI funcione, trátala como P0.

Prioriza siempre:
1. integridad de datos;
2. reglas de negocio;
3. seguridad;
4. persistencia;
5. consistencia frontend/backend;
6. testing;
7. UX.

El objetivo final no es que el proyecto "parezca terminado".

El objetivo es que el ERP pueda ejecutar de forma fiable un flujo real completo desde la creación del servicio hasta el cierre financiero, con persistencia real en Google Sheets, permisos, auditoría, invariantes y pruebas reproducibles.
