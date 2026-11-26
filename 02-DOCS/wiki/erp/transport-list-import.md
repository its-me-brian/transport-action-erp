---
type: article
title: Importación de listas de transporte
description: El formato xlsx que espera el parser, el ciclo de dos pasos (parsear y después importar), la deduplicación delta y los errores que se ven en producción.
resource: ../../../Transport Action Unified/domain/transportList.gs
tags: [importacion, transport-list, excel, parser]
timestamp: 2026-11-26T05:10:00Z
aliases: [transport-list-import, importar-lista]
topic: erp
status: stable
sources: ["../../../Transport Action Unified/domain/transportList.gs", "../../../Transport Action Unified/infrastructure/excelParser.gs", "../../../docs/05-WORKFLOWS.md"]
score: 0
---

# Importación de listas de transporte

> Sources: [transportList.gs](../../../Transport%20Action%20Unified/domain/transportList.gs); [excelParser.gs](../../../Transport%20Action%20Unified/infrastructure/excelParser.gs); [05-WORKFLOWS.md](../../../docs/05-WORKFLOWS.md)

## Overview

Es el primer paso del ciclo: el cliente manda un Excel con la lista de transports de la
producción, y de ahí nacen los servicios. **No es una importación de una sola llamada**: son dos
pasos separados, y el primero no escribe nada.

| Paso | Acción | Qué hace | Escribe |
|---|---|---|---|
| 1 | `uploadTransportListFile` | Sube el `.xlsx` a Drive, lo parsea y devuelve la **previa** | Solo el archivo archivado |
| 2 | `importTransportListWithProject` | Crea cliente, proyecto y servicios | Sí, todo |

El paso 1 es la confirmación humana: el modal muestra lo parseado, y recién si el usuario acepta se
dispara el paso 2. Por eso `--check` de la batería marca `importTransportListWithProject` como
omitido: necesita un xlsx real subido a Drive, no se puede fabricar con un POST.

## El formato que espera el parser

Un `.xlsx` o `.xls`. Nada más: si `SpreadsheetApp.open` falla, el parser devuelve
`No se pudo leer el archivo. Asegurate de que sea .xlsx o .xls` y **borra el temporal**.

Se lee **la primera hoja** y el formato no es una tabla plana: cada servicio ocupa **de 1 a 4
filas**.

| Fila | Contenido |
|---|---|
| Principal | Vehículo, chofer, hora, pasajero 1, desde, hasta |
| Sub-fila | Teléfono, pasajeros adicionales |
| Sub-fila | `"Then"` con un segundo pickup |

De la cabecera (filas 0–1) salen cuatro metadatos que no son columnas:

| Dato | De dónde |
|---|---|
| `production` | Celda **A1** — es el nombre del cliente |
| `projectName` | Escaneo de las filas 0–1 (las celdas combinadas pueden dejarlo en cualquier columna) |
| `transportCompany` | Ídem |
| `dateStr` | Fecha de la lista |

El escaneo de las filas 0–1 descarta lo que parece encabezado (`"Transport List"`, `"Prep."`), así
que un cambio de plantilla del cliente puede mover estos valores sin romper el parser — y también
puede asignarlos mal sin avisar.

## Qué crea el paso 2

`apiImportTransportListWithProject(data)` resuelve las referencias antes de crear nada:

| Entidad | Cómo se resuelve |
|---|---|
| **Cliente** | `data.clientId` si viene; si no, por `production` (`ClientRepository.getByName`); si no existe, se **crea** con `Type: 'production'`, `PaymentTerms: 30` y nota `Auto-created from transport import` |
| **Proyecto** | `data.projectId` si viene; si no, por nombre + cliente; si no existe, se **crea** con `OperatingCompany` (default `TA`) y `Status: 'Activo'` |
| **Servicios** | Uno por fila principal, con `OperationalStatus: 'Asignado'` si el chofer matchea, `'Importado'` si no |
| **TransportList** | Una fila con el `importId`, total de servicios, producción y URL del archivo |

El `importId` lo arma el paso 1: `IMP-YYYYMMDD-NN`, con un secuencial diario
(`_getNextImportSeq`). Ese ID es la clave que después usa el dedup y el re-import.

**El chofer se resuelve por nombre con fuzzy matching** contra la hoja *Drivers*. Si no matchea, el
servicio queda en `Importado` con `DriverID` vacío — no falla la importación, pero ese servicio no
puede avanzar hasta asignarlo a mano. Es la fuente más común de servicios "colgados" después de una
importación.

## Deduplicación delta

Reimportar el mismo Excel **no duplica**: la clave es

```
fecha normalizada | hora normalizada | pasajero (trim + lowercase)
```

Dos detalles que importan:

- `_normalizeTime` acepta objetos `Date` y strings con múltiples horarios (`"08.10, 15.30"` →
  `"08:10, 15:30"`). Sin esa normalización, Sheets devolviendo un `Date` rompe el dedup en silencio
  — el mismo modo de falla que tenía `checkDuplicatePayment`.
- El dedup se construye dos veces: primero por `importId` (reimportación de la misma lista) y, si
  no encontró nada, **por proyecto** (`getAllByProject`). Eso cubre el caso de reimportar con otro
  `importId`.

El resultado informa `servicesCreated` y `servicesSkipped`, más `importLogs` con las primeras cinco
claves existentes. Cuando el conteo no cierra, ese log es lo primero que hay que mirar.

## Errores que se ven

| Mensaje | Causa |
|---|---|
| `No services to import` | El paso 2 llegó con `services` vacío: el parseo no encontró filas |
| `No se pudo leer el archivo…` | No es xlsx/xls, o está corrupto |
| `No services to import` con previa visible | El modal no propagó los servicios parseados al segundo paso |
| Servicios en `Importado` | El nombre del chofer no matcheó ninguna fila de *Drivers* |
| Cliente duplicado | `production` en A1 cambió de grafía y `getByName` no lo reconoce |

## Acciones del router

| Acción | Permiso |
|---|---|
| `getTransportLists`, `getTransportList` | `transportList.list` |
| `createTransportList`, `importTransportListWithProject` | `transportList.import` |
| `uploadTransportListFile` | `transportList.upload` |
| `exportTransportListExcel` | `transportList.export` |
| `sendTransportListEmail` | `transportList.upload` |

`sendTransportListEmail` manda un email **real** a los destinatarios, por eso la batería lo omite.

## Related

- [Panorama](./overview.md) — dónde entra la importación en el ciclo completo.
- [Modelo de dominio](./domain-model.md) — `TransportList` y `Service`.
- [Alta de un chofer](./driver-onboarding.md) — por qué un servicio queda en `Importado`.
- [Riesgos abiertos](../operations/risks.md) — la importación nunca se probó con un xlsx real.
