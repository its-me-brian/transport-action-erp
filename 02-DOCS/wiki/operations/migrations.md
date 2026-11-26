---
type: article
title: Migraciones de esquema y datos
description: Cómo se versiona el esquema, qué corre en cada request, y los dos modos de falla silenciosa que hay que vigilar antes de tocar la base.
resource: ../../../Transport Action Unified/migrations/migration.gs
tags: [migraciones, esquema, riesgo, operacion]
timestamp: 2026-11-26T05:10:00Z
aliases: [migrations, migraciones]
topic: operations
status: stable
sources: ["../../../Transport Action Unified/migrations/migration.gs", "../../../Transport Action Unified/api.gs", "../../../docs/14-MIGRATIONS.md"]
score: 0
---

# Migraciones de esquema y datos

> Sources: [migration.gs](../../../Transport%20Action%20Unified/migrations/migration.gs); [api.gs](../../../Transport%20Action%20Unified/api.gs); [14-MIGRATIONS.md](../../../docs/14-MIGRATIONS.md)

## Overview

Hay **una sola versión de esquema para todo el sistema**, guardada en
`PropertiesService.getScriptProperties()` bajo la clave `schemaVersion`. No hay versión por hoja:
una migración mueve la base entera de la versión N a la N+1.

```javascript
PropertiesService.getScriptProperties().getProperty('schemaVersion')  // hoy: "12"
```

## Qué corre y cuándo

`runMigrations()` se invoca **al principio de `_handleRoute`**, o sea en cada `doGet` y cada
`doPost` — incluidos los públicos, como el formulario del chofer. Es barato porque filtra:

```javascript
migrations.filter(m => m.version > currentVersion).sort(by version).forEach(...)
```

Si ya está al día, la función retorna sin hacer nada. Si hay pendientes, ejecuta en orden y
**avanza la versión después de cada una**:

```javascript
m.fn();
_setSchemaVersion(m.version);
```

## La cadena actual (12 migraciones)

| # | Qué introdujo |
|---|---|
| 1 | Esquema inicial — `VehiclePreferred` en *Drivers* |
| 2 | Campos de costo en *Services* |
| 3 | `DriverLinks` + `AuditLog` v2 |
| 4 | Modelo de economía por proveedor |
| 5 | `TransportCompany` en *Projects* |
| 6 | Tablas de infraestructura |
| 7 | `ServiceID` en *InvoiceItems* |
| 8 | Soft delete en todas las entidades |
| 9 | Soft delete en las restantes |
| 10 | Corrección de huecos de esquema |
| 11 | Columna `DriverSource` |
| 12 | `ProjectID` en inbox + `CostBreakdown` + `SupplierRateID` |

## No todo vive en la cadena

Dos cosas parecidas pero distintas, y confundirlas cuesta caro:

| Pieza | Qué es | Cómo se corre |
|---|---|---|
| `migrations/migration.gs` | La cadena versionada | Automático, en cada request |
| `migrations/migrateDriverRateToSupplierRate.gs` | Migración de **datos** puntual | A mano, por acción (`migrateDriverRatesToSupplierRates`), con `verifyMigration` para comprobar |
| `migrations/archiveOldData.gs` | Archivado de histórico | A mano, es destructivo |

Una migración de datos **no** sube `schemaVersion`. Si se corre dos veces, la idempotencia la tiene
que garantizar ella misma.

## Las reglas

Del documento canónico, y son de cumplimiento, no de estilo:

- Nunca borrar campos: solo agregar o renombrar.
- Siempre hacia adelante, sin rollback.
- Cada migración **idempotente**: segura de ejecutar dos veces.
- Probar en hoja de desarrollo antes de producción.
- Registrar la migración en el changelog.

## Los dos modos de falla silenciosa

Esto es lo que hay que tener en la cabeza antes de escribir la migración 13.

**1. El error se traga.** En `api.gs` la llamada está envuelta así:

```javascript
try {
  runMigrations();
} catch (migErr) {
  Logger.log('Migration error (non-fatal): ' + migErr.message);
}
```

Es una decisión deliberada: una migración rota no debe tumbar el ERP. La contrapartida es que la
app **sigue corriendo con el esquema viejo** y el único rastro es una línea en el log de ejecución.
Si un campo nuevo "no aparece" o una acción devuelve datos incompletos, la primera hipótesis es una
migración fallando en silencio, no un bug de la acción.

**2. La versión no avanza, así que reintenta en cada request.** `_setSchemaVersion` corre **después**
de `m.fn()`. Si `fn()` lanza, la versión queda en la anterior y la migración se vuelve a intentar en
la siguiente llamada, y en la siguiente. Con un error determinista eso es un reintento infinito
silencioso: el log se llena, la cuota se consume y nadie se entera por la UI.

Y no hay lock alrededor de `runMigrations()`. Dos requests concurrentes con la misma versión
pendiente pueden ejecutar la misma migración a la vez. La idempotencia es lo que evita el desastre,
no la exclusión mutua — otra razón por la que "idempotente" no es opcional.

## Cómo verificar el estado

| Qué | Cómo |
|---|---|
| Versión aplicada | `getScriptProperties().getProperty('schemaVersion')` desde el editor |
| Errores | **View → Executions** en Apps Script, buscar `Migration error` |
| Que una migración de datos hizo lo suyo | `verifyMigration` (acción del router) |
| Que el esquema coincide con el código | Comparar encabezados de hoja contra `setup.gs` |

El último punto es el que más se olvida: `setup.gs` define el contrato de columnas para
instalaciones nuevas y `migration.gs` lleva las existentes hasta ahí. **Si los dos divergen, una
instalación limpia y una migrada no son la misma base** — y eso ya pasó con *Users*, donde el
setup emitía un layout distinto del que leía `auth.gs`.

## Related

- [Runbook](./runbook.md) — deploy, backup y recuperación.
- [Riesgos abiertos](./risks.md) — los riesgos que siguen abiertos en la primera versión.
- [Modelo de dominio](../erp/domain-model.md) — qué entidades tocan estas migraciones.
