---
type: article
title: Alta de un chofer — cuenta, perfil y link público
description: Los dos caminos para que un chofer opere, por qué la cuenta hoy no sirve, y el ciclo completo del link público con su token y su vencimiento.
resource: ../../../Transport Action Unified/api.gs
tags: [choferes, driver-links, permisos, operacion]
timestamp: 2026-11-26T05:10:00Z
aliases: [driver-onboarding, alta-chofer]
topic: erp
status: stable
sources: ["../../../Transport Action Unified/api.gs", "../../../Transport Action Unified/infrastructure/driverLinks.gs", "../../../Transport Action Unified/infrastructure/setup.gs", "../../../docs/18-LOCAL-TESTING.md"]
score: 0
---

# Alta de un chofer — cuenta, perfil y link público

> Sources: [api.gs](../../../Transport%20Action%20Unified/api.gs); [driverLinks.gs](../../../Transport%20Action%20Unified/infrastructure/driverLinks.gs); [18-LOCAL-TESTING.md](../../../docs/18-LOCAL-TESTING.md)

## Overview

Un chofer puede operar por **dos caminos que no se parecen en nada**:

| Camino | Autenticación | Qué puede hacer | Estado real hoy |
|---|---|---|---|
| **Cuenta de usuario** (`role: driver`) | Token de sesión, como cualquier usuario | Ver sus servicios y sus partes | ⚠️ **Inoperante**: exige un email que ninguna fila de *Drivers* tiene |
| **Link público** | Token de link en la URL, sin sesión | Cargar los servicios de un rango de fechas | ✅ Es el camino que se usa |

El segundo no es un atajo: es el diseño. El chofer trabaja desde el teléfono, en la calle, sin
querer aprender un login. El primero existe en el código y en la matriz de permisos, pero está
esperando un dato que nadie carga.

## Camino 1 — cuenta de usuario

Son **dos registros en dos hojas** y tienen que coincidir:

1. Fila en `Users` con `Role = driver` y `Status = approved`.
2. Fila en `Drivers` cuyo **`Email`** (columna H, posición 8 del contrato posicional) sea igual al
   email de la cuenta.

La resolución está en [api.gs](../../../Transport%20Action%20Unified/api.gs): al construir el
actor, si el rol es `driver` busca en *Drivers* una fila cuyo `Email` coincida
(`trim().toLowerCase()` en ambos lados) y guarda ese `ID` como `actor.driverId`. Si no encuentra
ninguna, `driverId` queda en `null` y **cada endpoint de chofer corta con error**:

```
DRIVER_NOT_LINKED: No driver profile linked to this account. Contact coordinator.
```

Los endpoints que lo lanzan son los cuatro que el chofer necesita para existir:

| Acción | Qué pasa sin vínculo |
|---|---|
| `getServices` | Rechaza antes de filtrar: no hay `driverId` por el que filtrar |
| `getDriverReports` | Ídem |
| `getDriverReport` | Ídem, y además protege lectura ajena |
| `submitDriverReport` | No puede resolver de quién es el parte |

**Síntoma en pantalla:** el login funciona, el rol es correcto, y la pantalla queda vacía con un
error de autorización. No es un bug de permisos: es un perfil sin email.

**Evidencia al 2026-11-26:** en `backups/db-20261126-030944.json`, la hoja *Drivers* tiene 13
filas y **0 con `Email` cargado**. Por eso ninguna cuenta `driver` puede funcionar todavía.

Para habilitarlo: cargar el email en la fila del chofer (columna H) **y** crear la cuenta con ese
mismo email. Los dos lados, no uno.

## Camino 2 — link público (el que se usa)

### Generar

`generateDriverLink(driverId, projectId, dateFrom, dateTo, baseUrl, fieldsSchema, linkDurationDays)`
exige los cuatro primeros parámetros y valida `dateFrom <= dateTo`.

| Campo | Valor |
|---|---|
| `Token` | ID generado por `_generateId('DL', 'TA')`, sin prefijo ni guiones |
| `Status` | `ACTIVE` al crear |
| `ExpiresAt` | `dateTo + linkDurationDays` días (**default 1**), calculado desde la medianoche UTC de `dateTo` |
| `FieldsSchema` | JSON de los campos del formulario; si no se pasa, `DEFAULT_FIELDS_SCHEMA` |
| Link resultante | `<baseUrl>?action=driverForm&token=<token>` |

El `baseUrl` por defecto es la URL del propio Web App (`SpreadsheetApp.getService().getUrl()`), así
que el link apunta al deployment vivo sin configuración extra.

**La hora del vencimiento no es obvia.** `new Date(dateTo)` interpreta `"2026-11-26"` como
**medianoche UTC**, y el vencimiento se calcula sumándole días enteros. Con el default de 1 día:

| `dateTo` | `ExpiresAt` real | Efecto |
|---|---|---|
| `2026-11-26` | `2026-11-27T00:00Z` | Vive todo el 26 y muere a las 01:00 de Roma (UTC+1 en invierno) |
| `2026-11-26` con `linkDurationDays: 0` | `2026-11-26T00:00Z` | **Nace vencido**: a esa hora en Roma ya pasó |

No hay margen de gracia ni hora configurable: es fecha, no timestamp. Si el chofer tiene que
reportar a la mañana siguiente, el link necesita `durationDays` ≥ 1 sobre un `dateTo` que incluya
ese día.

### Abrir

`driverForm` es una de las **5 acciones públicas** del router (junto con `login`, `loginUser`,
`registerUser`, `validateSession` y `healthCheck`). El token del link **no es un token de sesión**:
no pasa por `_checkPermission`.

`_serveDriverForm(token)` valida el token con `getDriverLinkByToken`, que:

- rechaza si `Status !== 'ACTIVE'` (revocado o ya vencido),
- si `ExpiresAt` ya pasó, **transiciona a `EXPIRED`**, registra el evento y devuelve nulo,
- devuelve nulo también si la hoja no tiene encabezados.

Después arma el formulario con **los servicios que ese chofer ya tiene asignados** en ese proyecto
y ese rango de fechas (`_getServicesByDriverAndDateRange`). Si no hay ninguno, el formulario
aparece vacío: **el link no crea servicios, solo reporta los existentes**. Ese es el error de
operación más común — generar el link antes de asignar.

### Enviar

`submitDriverLinkResponse(token, services)` es público y escribe en `DriverLinkResponses` con:

- **lock** (`_withLock`) y **revalidación del token adentro del lock** — si lo revocan mientras el
  chofer escribe, se rechaza;
- **idempotencia por `token + serviceId`**: reenviar el mismo servicio devuelve
  `status: 'duplicate'` y no duplica la fila.

Cada respuesta guarda `DataServizio`, `TipoServizio`, `OrarioInizio`, `OrarioFine`, `Descrizione`,
`Clienti`, `Targa`, `KmTotali`, `Diaria` (`nessuna` por defecto) y `Note`.

### Cerrar

La máquina de estados del link es `ACTIVE → EXPIRED | REVOKED`, centralizada. `deactivateDriverLink`
pasa a `REVOKED` y registra evento. Todo queda en `DriverLinkEvents` (`CREATED`, `ACCESSED`,
`REVOKED`, `EXPIRED`), que es lo que después se audita.

## Qué mirar cuando algo no funciona

| Síntoma | Causa probable |
|---|---|
| "Link non valido" | Token inexistente, revocado o vencido — no es un error de permisos |
| Formulario vacío | El chofer no tiene servicios asignados en ese proyecto y rango |
| `DRIVER_NOT_LINKED` con sesión válida | Falta el `Email` en la fila de *Drivers* |
| El link no abre desde el teléfono | Permisos del deployment: el Web App debe estar en "Anyone" para que el formulario público funcione |
| Servicio enviado dos veces, una sola fila | Idempotencia por `token + serviceId` funcionando |

## Related

- [Reglas de negocio, invariantes y permisos](./business-rules.md) — la matriz de los 4 roles.
- [Modelo de dominio](./domain-model.md) — `DriverLink`, `DriverLinkResponse` y sus estados.
- [Máquinas de estado](./state-machines.md) — `ACTIVE → EXPIRED | REVOKED`.
- [Testing](../operations/testing.md) — la suite 05 ejercita el link completo, sin sesión.
