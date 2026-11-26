---
type: article
title: Etiquetas legibles — de IDs a nombres en la interfaz
description: Cómo la UI traduce SVC-/PRJ-/DRV-/CLI- a fecha, cliente y chofer, dónde se aplica, la regla de degradación al ID y el motivo por el que la búsqueda debe coincidir con lo que se ve.
resource: ../../../Transport Action All/src/utils/serviceLabels.ts
tags: [ui, frontend, rapportino, reconciliation, driver-reports, usabilidad]
timestamp: 2026-11-26T16:30:00Z
aliases: [ui-labels, etiquetas-legibles, ids-a-nombres]
topic: erp
status: stable
sources: ["../../../Transport Action All/src/utils/serviceLabels.ts", "../../../Transport Action All/src/hooks/useRapportino.ts", "../../../Transport Action All/src/components/RapportinoDetailModal.tsx", "../../../Transport Action All/src/components/ReconciliationScreen.tsx", "../../../Transport Action All/src/components/DriverReportScreen.tsx", "../../../Transport Action Unified/domain/service.gs"]
score: 0
---

# Etiquetas legibles — de IDs a nombres en la interfaz

> Sources: [serviceLabels.ts](../../../Transport%20Action%20All/src/utils/serviceLabels.ts); [useRapportino.ts](../../../Transport%20Action%20All/src/hooks/useRapportino.ts); [service.gs](../../../Transport%20Action%20Unified/domain/service.gs)

## Overview

El backend devuelve **IDs** (`SVC-TA-2026-00141`, `PRJ-TA-2026-00012`, `DRV-TA-2026-00181`,
`CLI-…`). Mostrarlos obliga a la persona a traducir códigos de memoria, y en una tarjeta con
cuatro datos el ID ocupa el lugar donde debería estar el nombre del cliente.

Desde 2026-11-26 las tarjetas de rapportino (cliente, chofer, colaborador), el detalle con su PDF,
la reconciliación y los partes del chofer muestran **nombre, fecha y hora**. El ID sigue existiendo,
pero como `title` (tooltip) y como último recurso.

## La regla: nunca vacío, el ID como piso

Todos los helpers de `serviceLabels.ts` degradan al ID cuando el catálogo no alcanza:

| Helper | Devuelve | Si falta el dato |
|---|---|---|
| `formatShortDate` | `07/11/2026` | `''` |
| `formatShortTime` | `08:30` | `''` |
| `buildNameMap` | `Record<id, name>` | mapa vacío |
| `nameOf` | nombre | fallback, y si no hay, el ID |
| `buildServiceMap` | `Record<serviceId, {date,time,clientName,driverName}>` | mapa vacío |
| `serviceLabel` | `07/11/2026 · 08:30 · WANDERING IN ROME` | el ID del servicio |

Consecuencia práctica: un catálogo incompleto (servicio borrado, proyecto filtrado, request
caído) **nunca** deja una tarjeta vacía ni rompe un filtro. Vuelve al comportamiento anterior
en ese dato puntual, no en toda la pantalla.

## De dónde salen los nombres

No hay endpoint nuevo. Los datos ya estaban:

- **Rapportinos**: `useRapportino` ya pedía `getProjects`, `getClients`, `getDrivers` y
  `getCollaborators` para los desplegables de filtro. Ahora además los convierte en mapas con
  `useMemo` —una vez por cambio de catálogo, no por tarjeta— y les suma `getServices()`.
- **Reconciliación**: la hoja `Reconciliation` guarda **solo** `ServiceID` y `ProjectID`; no tiene
  fecha, hora, chofer ni cliente. El cruce con `Services` es inevitable, y se hace en el cliente
  con un `getServices()` + `getProjects()` al montar la pantalla.
- **Partes del chofer**: un `getServices()` al montar y `serviceLabel` por tarjeta.

`apiGetServices` ya devuelve `clientName` y `driverName` resueltos: `ServiceRepository.toDTO`
arma los índices una sola vez por request (`_buildServiceLookups`) y cruza
`Service → Project → Client`. No hay N+1 desde el frontend.

## Rendimiento: un request extra, y aislado

Cada pantalla paga **un** `getServices()` adicional. Va con su propio `catch`: si falla, se
registra en consola y las tarjetas caen al ID, pero los filtros y el listado siguen funcionando.
No comparte el `try` de los catálogos obligatorios, así que un fallo de etiquetas no dispara el
toast de "error al cargar datos de filtro".

## La trampa que se resolvió en el mismo cambio

Cambiar lo que se **ve** sin cambiar lo que se **busca** rompe los filtros: con nombres en
pantalla y búsqueda por ID, escribir `WANDERING` no encuentra nada aunque el nombre esté ahí.

Por eso los cuatro buscadores aceptan **ambos**: el ID crudo y la etiqueta resuelta.

| Pantalla | Filtro |
|---|---|
| Rapportinos (3 pestañas) | `id`, `clientId`/`driverId`/`collaboratorId`, `projectId`, nombre y proyecto |
| Reconciliación | `serviceId`, `projectId`, `id`, etiqueta del servicio, nombre del proyecto |
| Partes del chofer | `id`, `serviceId`, `driverId`, etiqueta del servicio |

## El rapportino es por período, no por servicio

Una tarjeta de rapportino equivale a **una semana de un cliente**, así que ahí no hay "un servicio"
que identificar: lo que corresponde es el nombre del cliente y el rango de fechas.

El nivel servicio vive en los **items**, y hasta este cambio el modal de detalle no los mostraba.
Ahora `openDetail` pide `getRapportinoItems(rapportinoClientId)` al abrir (solo en la pestaña de
clientes) y el modal lista `Fecha · Hora · Conductor · Importe`. La misma tabla se imprime en el
PDF.

Ese request es **por tarjeta abierta**, no por listado: `getRapportinoItems` sin parámetro
devuelve todos los items de la hoja, y por eso la firma de `api.ts` lo exige.

## Dónde se aplica

| Archivo | Qué cambió |
|---|---|
| `src/utils/serviceLabels.ts` | Nuevo. Formateadores, mapas y etiquetas |
| `src/components/RapportinoCards.tsx` | Las 3 tarjetas aceptan `names` y caen al ID |
| `src/components/RapportinoScreen.tsx` | Arma `names` por tarjeta y por detalle |
| `src/hooks/useRapportino.ts` | Mapas con `useMemo`, `openDetail`, export CSV/PDF con nombres |
| `src/components/RapportinoDetailModal.tsx` | Nombre del cliente/proyecto, tabla de servicios, PDF con la tabla |
| `src/components/ReconciliationScreen.tsx` | Etiqueta de servicio y nombre de proyecto |
| `src/components/DriverReportScreen.tsx` | Etiqueta de servicio y **nombre del chofer** en tarjeta, modal y buscador |
| `src/services/api.ts` | `getRapportinoItems(rapportinoClientId)` |
| `src/__tests__/serviceLabels.test.ts` | Nuevo. 22 tests de los helpers: fecha sin corrimiento, degradación al ID |

## El costo, dicho de frente

Cada pantalla que traduce IDs pide **su propio catálogo** al backend:

| Pantalla | Requests de catálogo | Antes |
|---|---|---|
| Rapportinos | 5 (proyectos, clientes, choferes, colaboradores, **servicios**) | 4 |
| Reconciliación | 2 (**servicios**, proyectos) | 0 |
| Partes del chofer | 2 (**servicios**, choferes) | 0 |

`getServices()` **no acepta límite** (`apiGetServices` devuelve la hoja entera, filtrada solo si se le pasan
filtros). Hoy son 37 servicios y el costo es despreciable; con miles de servicios es la latencia que ya
documenta [riesgos](../operations/risks.md). No se cacheó entre pantallas a propósito: un caché
compartido necesita invalidación, y un nombre viejo es peor que un ID correcto.

Si alguna vez pesa, el arreglo es del backend (devolver `clientName`/`driverName` en los DTO de
rapportino y reconciliación), no del frontend.

## Verificación

- `npx tsc --noEmit` sin errores.
- `npx vitest run` → **814/814** en 34 archivos.
- Tests nuevos: `serviceLabels.test.ts` (22 casos: fecha ISO sin corrimiento de huso, hora con y sin
  segundos, mapa incompleto, degradación al ID, etiqueta sin separadores sueltos).
- Tests actualizados: `RapportinoScreen.test.tsx`, `ReconciliationScreen.test.tsx` (mocks de catálogo).

## See Also

- [Flujo del dinero](money-flow.md) — el rapportino es la puerta al Invoice
- [Máquinas de estado](state-machines.md) — los estados que muestran las tarjetas
- [Riesgos abiertos](../operations/risks.md) — la latencia que hace caro un request extra
