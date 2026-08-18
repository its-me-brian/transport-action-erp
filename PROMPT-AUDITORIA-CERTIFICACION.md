# PROMPT MAESTRO — AUDITORÍA, CORRECCIÓN, INTEGRACIÓN Y CERTIFICACIÓN FUNCIONAL DEL ERP TRANSPORT ACTION

Actúa simultáneamente como:
- Lead Software Architect
- Senior Full Stack Engineer
- Backend Engineer especializado en Google Apps Script
- Database/Domain Architect
- QA Lead
- Security Reviewer
- Integration Engineer
- DDD / State Machine specialist

Tienes delante el repositorio completo del proyecto Transport Action ERP.

NO quiero una revisión superficial.

Quiero que audites el proyecto completo y, cuando encuentres un problema inequívoco y suficientemente definido, LO CORRIJAS DIRECTAMENTE en el código.

No quiero únicamente recomendaciones.

No inventes funcionalidades sin comprobar antes que están justificadas por:
1. el dominio,
2. la documentación,
3. el comportamiento existente,
4. las relaciones entre entidades,
5. los flujos de negocio.

---

## 1. STACK REAL

**Frontend:** React, TypeScript, Vite, Vitest, Testing Library
**Backend:** Google Apps Script
**Base de datos:** Google Sheets
**Arquitectura:** Domain entities, Commands, Repositories, Queries, State Machines, Events, AuditLog, ActivityFeed, LockService, Permissions, Migrations

---

## 2. FUENTES DE VERDAD

Analiza TODO el repositorio antes de modificar código. Prioridad:
1. reglas de dominio
2. state machines
3. invariants
4. commands
5. aggregates
6. workflows
7. permissions
8. repositories
9. backend API
10. database schema/setup
11. frontend API
12. frontend components
13. tests
14. documentación secundaria
15. auditorías anteriores

Las auditorías anteriores NO son la fuente de verdad del estado actual. Úsalas como historial. Comprueba cada hallazgo contra el código actual.

---

## 3. OBJETIVO

El objetivo final es que el ERP pueda considerarse funcionalmente terminado y pueda pasar una certificación real.

Debes verificar: Frontend → API → Backend Router → Permission → Command → Domain → Repository → Google Sheet → Query → API response → Frontend state

Una funcionalidad está completa únicamente si CREATE → persistencia → READ → UPDATE cuando corresponda → persistencia del UPDATE → validación → permisos → bloqueo cuando corresponda → audit/event → UI actualizada funciona realmente.

---

## 4. BUG CRÍTICO: updateServiceField

Audita apiUpdateServiceField(). Comprueba qué campos permite modificar. NO debe ser posible utilizar una función genérica de edición para saltarse la State Machine. Los cambios de estado deben pasar por los Commands correspondientes.

---

## 5. BUG CRÍTICO: edición de datos de DriverReport/Rapportino

Audita el mapping existente en DashboardScreen.tsx. Comprueba que el backend realmente permite persistir los campos. No permitas que React actualice el estado local si la persistencia backend ha fallado.

---

## 6. BUG CRÍTICO: CANCELACIÓN DE SERVICE

Determina cuál es el comportamiento correcto según el dominio. Si CANCELAR y ELIMINAR son conceptos diferentes, implementa cancelService() con Command, backend endpoint, permission, state transition, cancellation reason, timestamp, user, audit event, frontend API, frontend UI, tests.

---

## 7. DRIVER LINKS

Auditar completamente. Determinar si DriverLink debe ser editable. Si es así, crear updateDriverLink() con Command, Backend API, Permission, Repository update, UI edit modal, Validation, Audit/Event, Tests.

---

## 8-33. Ver prompt completo en secciones anteriores.

---

## ORDEN DE EJECUCIÓN

### P0 — Bloquean certificación
1. Eliminar OperationalStatus/FinancialStatus de updateServiceField
2. Fix rapportino field persistence
3. Fix cancel flow
4. Definir DriverLink update/editability
5. Revisar Invoice draft editability
6. Revisar Payment registered editability
7. Verificar todos los Commands contra StateMachine

### P1 — Tests y wiring
8. Tests backend de Commands
9. Tests de invariants
10. Tests de permisos
11. Tests negativos
12. Tests de locks/concurrencia
13. E2E real
14. Wire de dashboards pendientes

### P2 — Limpieza
15. Eliminar funciones deprecated
16. Actualizar documentación
17. Unificar nomenclatura
18. Eliminar contradicciones documentales

---

## CRITERIO DE CALIDAD

Antes de decir "terminado", intenta romper el sistema. Prueba estados inválidos, IDs inexistentes, entidades eliminadas, permisos insuficientes, doble submit, doble click, doble emisión, doble pago, modificación después de lock, datos incompletos, fechas inválidas, cantidades negativas, overpayment, links expirados/revocados, Driver/Project/Service incorrectos, relaciones rotas.

El sistema debe fallar de forma controlada y sin corrupción de datos.
