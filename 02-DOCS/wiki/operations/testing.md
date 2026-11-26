---
type: article
title: Testing — cuatro niveles y qué prueba cada uno
description: Tests unitarios, gate de sintaxis, batería E2E contra el Web App real y checklist manual; qué cubre cada nivel y qué no.
resource: ../../../docs/15-TESTING.md
tags: [testing, e2e, calidad]
timestamp: 2026-11-26T03:40:00Z
aliases: [testing]
topic: operations
status: stable
sources: ["../../../docs/15-TESTING.md", "../../../docs/18-LOCAL-TESTING.md", "../../../docs/checklist-prueba-manual.html"]
score: 16
---

# Testing — cuatro niveles y qué prueba cada uno

> Sources: [Estrategia de tests](../../../docs/15-TESTING.md); [Testing local](../../../docs/18-LOCAL-TESTING.md); [Checklist manual](../../../docs/checklist-prueba-manual.html)

## Overview

Cuatro niveles con propósitos distintos. Ninguno reemplaza a otro: los unitarios protegen la
lógica, la batería protege los flujos, y el checklist manual protege lo que solo un ojo detecta.

| Nivel | Herramienta | Qué prueba | Último resultado |
|---|---|---|---|
| Unitarios | Vitest | Entidades, comandos, repositorios, invariantes | **792/792**, 33 archivos |
| Sintaxis | `node --check` | Que los 73 `.gs` parseen | **73/73** |
| E2E de sistema | `scripts/e2e/` | 9 suites contra el Web App desplegado, sin mocks | **252 pasos, 0 fallos** |
| Manual | `docs/checklist-prueba-manual.html` | Que la pantalla se vea y se pueda usar | pendiente del dueño |

## 1. Unitarios

```powershell
cd "Transport Action All"
npm test
```

Cubren la máquina de estados, los comandos con sus reglas, los repositorios y las 21
invariantes. Son rápidos y no tocan la red — por eso no ven los defectos que aparecen en el
borde entre capas (ver [Flujo del dinero](../erp/money-flow.md)).

## 2. Gate de sintaxis

```powershell
Get-ChildItem "Transport Action Unified" -Recurse -Filter *.gs | ForEach-Object { node --check $_.FullName }
```

Apps Script no avisa de un error de sintaxis hasta que la función se ejecuta. Este gate lo
detecta antes de publicar. Está en el CI junto con el typecheck.

## 3. Batería E2E

```powershell
node scripts/e2e/run.mjs --check     # valida acciones contra el router, sin red
node scripts/e2e/run.mjs             # corre las 9 suites
node scripts/e2e/run.mjs --suite 05 --verbose
```

| Suite | Cubre |
|---|---|
| `01-system-auth` | Health, router, login, alta/aprobación/baja de usuarios, reset y cambio de clave, permisos por rol |
| `02-catalog` | Clientes, proyectos, choferes, vehículos, colaboradores, tarifas |
| `03-service-lifecycle` | Crear → asignar → confirmar → iniciar → completar → reportar → validar, y transiciones inválidas |
| `04-economics` | Breakdowns, idempotencia, congelado al validar, ajustes manuales, recálculo |
| `05-driver-reports-links` | Inbox de reportes y **link público del chofer**: formulario sin sesión, eventos, revocación, token inválido |
| `06-rapportino` | Rapportino de cliente y chofer, gate de facturación, `facturarRapportino` → factura con items |
| `07-invoicing` | Emisión, pago, conciliación, anulación, duplicados |
| `08-queries-audit` | Listados, filtros, dashboard, auditoría, activity feed |
| `09-admin-settings` | Usuarios, roles, settings, migraciones, snapshot |

**Escribe en la base real.** Crea servicios, usuarios, facturas y links de chofer de verdad. Al
terminar limpia lo suyo, pero si falla a mitad deja basura. Por eso: backup antes, y `--keep`
solo cuando querés conservar la evidencia.

Los datos de prueba se etiquetan con un tag `E2E-<timestamp>`. La limpieza se hace por etiqueta:

```powershell
node scripts/e2e/purge.mjs --dry                  # simulacro
node scripts/e2e/purge.mjs --confirm              # borra
node scripts/e2e/purge.mjs --tag E2E-20261125171628 --confirm
```

Hace falta porque `deleteService` solo borra servicios `Importado`/`Asignado`: un servicio
validado o facturado no se puede eliminar por los comandos normales.

### Dependencias entre suites

No son independientes. `07` necesita el invoice que produce `06`; `09` necesita el servicio
validado de `04`. Correr una suite sola sin su predecesora produce fallos de *fixture*, no de
producto. Distinguir las dos cosas es la mitad del trabajo:

| Síntoma | Lectura |
|---|---|
| `Driver X is already assigned to service Y` | INV-009 funcionando: el fixture eligió un chofer ocupado |
| `Service must have at least 1 CostBreakdown` | El fixture no creó la tarifa; la invariante está bien |
| `Invalid transition: Borrador → Aceptado` | La máquina de estados rechazó un salto; el test estaba mal |
| `fetch failed` / `Timeout 120000ms` | Cuota de Apps Script, no lógica |
| `this.getSaldo is not a function` | Defecto real de producto |

## 4. Checklist manual

`docs/checklist-prueba-manual.html` — 157 ítems en 16 secciones, autocontenido, sin servidor.
Guarda el progreso en `localStorage`, filtra por palabra y se puede imprimir.

Su sección 14 es la más valiosa: la misma tarea por tres caminos distintos (crear servicio por
botón, por URL o por importación). Si un camino funciona y otro no, el defecto está en la
pantalla, no en el comando.

## Related

- [Runbook](./runbook.md) — los comandos y el deploy.
- [Riesgos abiertos](./risks.md) — lo que la batería no puede probar.
- [Reglas y permisos](../erp/business-rules.md) — las invariantes que se verifican.
