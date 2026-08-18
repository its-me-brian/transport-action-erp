# Transport Action ERP

Sistema ERP para gestión de servicios de transporte para producciones audiovisuales — construido con React (frontend) y Google Apps Script (backend).

## Arquitectura

```
Frontend (React + TypeScript + Vite)
    ↓ API calls (gasPost/gasGet)
Backend (Google Apps Script)
    ↓
Google Sheets (base de datos, 38 hojas)
```

### Frontend (`Transport Action All/src/`)

- **Componentes**: 39 componentes UI
- **Screens**: 33 pantallas
- **API Client**: 195 funciones en `services/api.ts`
- **Tests**: 569 tests (29 archivos, vitest + @testing-library/react)
- **Build**: Vite + TypeScript + Tailwind CSS v4

### Backend (`Transport Action Unified/`)

- **API Layer**: `api.gs` — 209 acciones registradas
- **Domain**: 20 archivos de dominio (commands, repositories, economics)
- **Infrastructure**: 12 archivos (auth, state machine, locks, events, audit, etc.)
- **Commands**: 57 comandos con `_withLock` + `_dispatchEvent` + `_assertValidTransition`
- **State Machines**: 11 máquinas de estado (ServiceOperational, ServiceFinancial, Invoice, Payment, etc.)
- **Permissions**: Matriz explícita por permiso (sin jerarquías)
- **Tests**: `integrationTest.gs` (34+ pasos) + `negativeTests.gs` (17 escenarios)

## Roles

| Role | Descripción |
|------|-------------|
| admin | Acceso completo |
| coordinator | Gestión operativa |
| accounting | Gestión financiera |
| driver | Conductor (acceso limitado) |

## Ciclo de Vida del Servicio

### OperationalStatus
```
Importado → Asignado → Confirmado → EnRuta → Realizado → Reportado → Validado
                                                        ↓
                                                      Revision → Validado
```

### FinancialStatus
```
Pendiente → Calculado → Confrontacion → ActualsConfirmados → Aprobado → Facturable → Facturado → Cobrado → Cerrado → CerradoComercial
```

### Reglas Críticas
- Cada Service tiene DOS lados económicos independientes: Provider + Driver
- `FinancialStatus` SOLO se cambia vía Commands (nunca directo)
- `approveReport()` usa `ServiceCommands` para transiciones (no writes directos)
- `validateService()` congela breakdowns al validar
- Locks reentrant en GAS: `_withLock` es seguro para llamadas anidadas

## Configuración

### Variables de Entorno

```bash
# Frontend (.env en Transport Action All/)
VITE_GAS_WEBAPP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### Google Sheets Setup

El backend espera 38 hojas en el spreadsheet. El setup automático se ejecuta al importar el proyecto:
- Service, Driver, Vehicle, Project, Client, Contact
- Invoice, InvoiceItem, Payment, Expense
- DriverReport, DriverLink, DriverReportInbox
- RapportinoClient, RapportinoDriver, RapportinoCollaborator, RapportinoItem
- ServiceRevenueBreakdown, ServiceCostBreakdown
- Reconciliation, RateCard, DriverRate, SupplierRate
- OperatingCompany, Collaborator, Document, Change
- AuditLog, ActivityFeed, UserManagement
- Settings, Sequence

### Migraciones

Las migraciones están en `Transport Action Unified/migrations/`. Se ejecutan automáticamente al cargar el backend.

## Desarrollo

```bash
# Instalar dependencias
cd "Transport Action All" && npm install

# Ejecutar tests
cd test && npm test

# Desarrollo
cd "Transport Action All" && npm run dev

# Build
cd "Transport Action All" && npm run build

# Lint (TypeScript)
cd test && npx tsc --noEmit
```

## Deploy

```bash
# 1. Build frontend
cd "Transport Action All" && npm run build

# 2. Push backend a GAS
cd "Transport Action Unified" && npx clasp push

# 3. IMPORTANTE: Después de clasp push, el Web App debe ser REDESPLIEGADO manualmente en GAS
```

### Test Backend

```bash
# Push test files (mismo scriptId que producción)
cd "test/Transport Action Unified" && npx clasp push

# Ejecutar en GAS Editor:
# - runIntegrationTest() — Flujo completo 34+ pasos
# - runNegativeTests() — 17 escenarios de reglas de negocio
```

## Documentación

- `PROMPT-AUDITORIA-COMPLETA.md` — Prompt de auditoría completa (38 secciones)
- `docs/04-STATE_MACHINES.md` — Definición de state machines
- `docs/08-PERMISSIONS.md` — Matriz de permisos
- `docs/10-COMMANDS.md` — Documentación de comandos

## Reglas Arquitectónicas

1. **Frontend → API → Command → Aggregate → Repository → Google Sheets**
2. **NUNCA** manipular campos directamente para cambios de estado de negocio
3. **NUNCA** hacer `updateServiceField(id, "FinancialStatus", "Facturado")` — usar `facturarService(id)`
4. Cada cambio de estado debe pasar por `_assertValidTransition` + `_withLock` + `_dispatchEvent`
5. Los valores italianos son la fuente canónica para el estado de Project

## Tests

### Frontend (vitest)
```bash
cd test && npx vitest run
```
- 569 tests pasando
- 29 archivos de test
- Cobertura: state machines, API contracts, screens, DTOs

### Backend (GAS)
```bash
# En GAS Editor:
runIntegrationTest()   # Flujo completo E2E
runNegativeTests()     # Reglas de negocio y seguridad
```
- 34+ pasos de integración
- 17 escenarios negativos
- Invariantes: INV-001 a INV-021
