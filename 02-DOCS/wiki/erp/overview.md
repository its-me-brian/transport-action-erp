---
type: article
title: ERP Transport Action — Panorama
description: Qué es el sistema, quién lo usa, con qué está construido y dónde corre, al estado de la primera versión.
resource: ../../../docs/00-RESUMEN-EJECUTIVO.md
tags: [producto, stack, arquitectura]
timestamp: 2026-11-26T03:40:00Z
aliases: [erp-overview]
topic: erp
status: stable
sources: ["../../../docs/00-RESUMEN-EJECUTIVO.md", "../../../docs/12-INFRASTRUCTURE.md"]
score: 5
---

# ERP Transport Action — Panorama

> Sources: [Resumen ejecutivo](../../../docs/00-RESUMEN-EJECUTIVO.md); [Infraestructura](../../../docs/12-INFRASTRUCTURE.md)

## Overview

ERP de gestión para una agencia de transporte de Roma que trabaja con producciones
audiovisuales. Cubre el ciclo completo: importar la lista de transportes del cliente, asignar
chofer y vehículo, seguir el servicio hasta validarlo, armar el rapportino, facturar y cobrar.

Administra **dos sociedades operativas** —Transport Action y Movie Motion— bajo la misma base:
cada entidad lleva su `OperatingCompany` y la numeración de IDs es independiente por sociedad.

## Usuarios y roles

Cuatro roles, ni uno más. La matriz completa está en
[Reglas y permisos](./business-rules.md).

| Rol | Qué hace | Alcance |
|---|---|---|
| `admin` | Todo | Usuarios, settings, sociedad emisora, además de todo lo demás |
| `coordinator` | Operación diaria | Servicios, proyectos, choferes, vehículos, rapportinos; no factura ni gestiona usuarios |
| `accounting` | Dinero | Facturas, pagos, gastos, cashflow; no crea servicios ni proyectos |
| `driver` | Solo lo suyo | Sus servicios y el formulario público de reporte; requiere estar vinculado a una fila de *Drivers* |

**Dos términos que no son sinónimos**, y la diferencia decide qué rol alcanza:

| Término | Alcance | Rol mínimo |
|---|---|---|
| **Ciclo operativo** | Importar la lista → asignar → ejecutar → validar → calcular economía | `coordinator` |
| **Ciclo completo** | Lo anterior + rapportino → facturar → cobrar | `admin` |

`coordinator` no factura ni gestiona usuarios; `accounting` no importa, no crea servicios ni
proyectos y no reporta partes de chofer. Ningún rol intermedio cubre el ciclo completo: o hay un
`admin`, o el trabajo se reparte entre dos personas.

## Stack

| Capa | Tecnología | Detalle |
|---|---|---|
| Frontend | React 19 + TypeScript 5.8 + Vite 6 + Tailwind 4 | `Transport Action All/`, router `react-router-dom` 7 |
| Backend | Google Apps Script (JavaScript, `.gs`) | `Transport Action Unified/`, 73 archivos |
| Base de datos | Google Sheets | 39 hojas, una por entidad |
| Deploy | `clasp` | Deployment versionado sobre un único ID de Web App |
| Tests | Vitest + Playwright + batería E2E propia | ver [Testing](../operations/testing.md) |

No hay servidor propio, no hay SQL y no hay ORM. El «backend» es un Web App de Apps Script que
recibe `GET`/`POST` con un parámetro `action` y despacha contra la hoja.

## Topología

```
Navegador
   │  GET/POST  ?action=<nombre>&token=<sesión>
   ▼
Web App /exec  ──►  api.gs  (router: 244 acciones)
                       │
                       ├─► infrastructure/   auth, repository, stateMachine, eventBus, sequence
                       ├─► domain/           una entidad por archivo + *Commands.gs
                       ├─► queries/          dashboard, cashflow, profit, invariantes
                       └─► utils/            money, lock, validation, setupAdmin
                       ▼
                 Google Sheets (39 hojas)
```

El router es la única puerta: el frontend nunca habla con Sheets. `api.gs` normaliza
`apiGetXxx → getXxx`, aplica el mapa camelCase → PascalCase y verifica permisos antes de
despachar.

## Mapa de capas

| Carpeta | Qué contiene | Regla |
|---|---|---|
| `api.gs` | Router y contratos de entrada | Ninguna lógica de negocio |
| `infrastructure/` | Auth, repositorio, máquina de estados, eventos, secuencias, setup | No conoce reglas de negocio |
| `domain/` | Entidades y comandos (`serviceCommands.gs`, `invoiceCommands.gs`, …) | Toda regla de negocio vive acá |
| `queries/` | Lecturas agregadas y `checkInvariants` | Solo lectura |
| `migrations/` | Migraciones de esquema y datos | Idempotentes |
| `utils/` | Utilidades sin estado y scripts de operador | Sin dependencias de dominio |

## Pantallas

Rutas reales del frontend (`src/App.tsx`):

`/dashboard` · `/transport` · `/transport-list` · `/new-service` · `/service/:serviceId/:section?` ·
`/driver-reports` · `/driver-links` · `/rapportinos` · `/reconciliation` · `/accounting` ·
`/financial` · `/customers` · `/providers` · `/drivers` · `/vehicles` · `/projects` ·
`/rate_cards` · `/contacts` · `/documents` · `/reports` · `/audit-center` · `/active-users` ·
`/user-management` · `/settings` · `/no-access`

Dos de ellas —`/transport-list` y `/reports`— **no están en el menú lateral**: se llega por
botón o por URL directa. Es la razón por la que una pasada visual que solo recorra el sidebar
las deja sin probar.

## Escala actual

| Métrica | Valor |
|---|---|
| Acciones en el router | 244 |
| Archivos `.gs` | 73 |
| Hojas en la base | 39 |
| Entidades en la especificación | 38 |
| Invariantes verificables | 21 (`INV-001`…`INV-021`) |

## Qué cubre la primera versión

Operación completa (importar → asignar → validar), economía por servicio, rapportino de
cliente, chofer y colaborador, facturación y cobros, link público del chofer, auditoría,
usuarios y permisos. Lo que **no** está probado con datos reales son las hojas financieras,
que hoy están en cero: ver [Riesgos abiertos](../operations/risks.md).

## Related

- [Modelo de dominio](./domain-model.md) — las entidades y el doble estado del servicio.
- [Máquinas de estado](./state-machines.md) — qué transición es legal y cuál no.
- [Flujo del dinero](./money-flow.md) — de la tarifa a la factura cobrada.
- [Runbook](../operations/runbook.md) — cómo se levanta, se publica y se recupera.
