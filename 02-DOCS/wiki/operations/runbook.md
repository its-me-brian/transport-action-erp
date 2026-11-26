---
type: article
title: Runbook — levantar, probar, publicar y recuperar
description: Los comandos reales del proyecto, el modelo de deploy con clasp y las trampas que cuestan una tarde.
resource: ../../../docs/18-LOCAL-TESTING.md
tags: [operaciones, deploy, backup, recuperacion]
timestamp: 2026-11-26T03:40:00Z
aliases: [runbook]
topic: operations
status: stable
sources: ["../../../docs/18-LOCAL-TESTING.md", "../../../docs/12-INFRASTRUCTURE.md", "../../../docs/14-MIGRATIONS.md"]
score: 12
---

# Runbook — levantar, probar, publicar y recuperar

> Sources: [Testing local](../../../docs/18-LOCAL-TESTING.md); [Infraestructura](../../../docs/12-INFRASTRUCTURE.md); [Migraciones](../../../docs/14-MIGRATIONS.md)

## Overview

El proyecto tiene dos mitades con ciclos distintos: el **frontend** se levanta con Vite y se
publica donde sea; el **backend** se empuja con `clasp` a Apps Script y se publica creando una
versión del Web App. Tocar una no publica la otra.

## Arranque

```powershell
cd "Transport Action All"
npm install
npm run dev          # http://localhost:3001
```

Abrilo con `http://`, no `https://`. Un `ERR_SSL_PROTOCOL_ERROR` acá significa que el navegador
está forzando TLS contra un socket HTTP — no es la app.

## Comandos

| Qué | Comando | Dónde |
|---|---|---|
| Tipos | `npm run lint` (`tsc --noEmit`) | `Transport Action All/` |
| Tests unitarios | `npm test` (`vitest run`) | `Transport Action All/` |
| Sintaxis de los `.gs` | `node --check` sobre cada archivo | raíz |
| Batería E2E, sin red | `node scripts/e2e/run.mjs --check` | raíz |
| Batería E2E completa | `node scripts/e2e/run.mjs` | raíz |
| Una suite | `node scripts/e2e/run.mjs --suite 04 --verbose` | raíz |
| Backup de la base | `node scripts/backup-snapshot.mjs` | raíz |
| Purga de datos de prueba | `node scripts/e2e/purge.mjs --dry` → `--confirm` | raíz |
| Release | `.\scripts\release.ps1 -Message "..."` | raíz |
| Recuperar clave de admin | `resetAdminPassword` desde el editor | Apps Script |

## Deploy con clasp

```powershell
cd "Transport Action Unified"
clasp push                                  # sube el árbol local al proyecto remoto
clasp version "descripcion"                 # crea una versión inmutable
clasp deploy -i <deploymentId> -V <n> -d "descripcion"
clasp list-versions                         # qué versiones existen
```

`scripts/release.ps1` encadena todo: lint + tests, `clasp push`, `clasp version`,
`clasp deploy` sobre el ID del `.env`, y un `healthCheck` contra el `/exec` real. Si algo falla
antes del deploy, el Web App sigue en la versión anterior; si falla el health check, imprime el
comando de rollback.

**Rollback** = volver a desplegar la versión anterior sobre el mismo ID:

```powershell
clasp deploy -i <deploymentId> -V <versionAnterior>
```

La URL y los permisos quedan intactos porque el ID no cambia.

## Trampas que ya costaron tiempo

| Trampa | Qué pasa | Cómo se evita |
|---|---|---|
| **Un solo token por usuario** | `Users` columnas 12/13 guardan el token vigente. Un segundo login invalida el primero | Nunca dos sesiones con el mismo usuario a la vez; la batería toma un lock en `reports/e2e.lock` |
| **`Users` se lee por posición** | El rol es el índice 4, el estado el 7. Reordenar columnas rompe el login de todos | No tocar el orden de la hoja `Users`; el setup genera el layout A–M correcto |
| **`success: true` miente** | El router devuelve `{success:true, data:{error:"..."}}` cuando la acción existe pero falla | Validar `data.error`, no `success`. Cualquier script que solo mire `success` reporta falsos positivos |
| **Funciones del editor no están en el deployment** | Correr desde el editor usa el contenido guardado (HEAD), no la versión publicada | Para scripts de operador no hace falta deploy; para la app sí |
| **`clasp push` no publica** | Subir el código no cambia el Web App vivo | Siempre `version` + `deploy` |
| **Límite de 2 minutos por comando** | Un proceso largo muere a mitad y deja datos a medio crear | Correr desacoplado (`Start-Process`) y seguir el log |
| **`deleteService` es limitado** | Solo borra `Importado`/`Asignado`; un servicio validado o facturado no se puede eliminar por comandos normales | Usar `purgeTestData` / `purge.mjs`, que borra por etiqueta con cascada |

## Backup

`scripts/backup-snapshot.mjs` exporta **datos** (no fórmulas) a `backups/db-<fecha>.json` usando
la API del Web App. Requiere `ADMIN_PASSWORD` en el entorno y toma la URL del `.env`.

```powershell
$env:ADMIN_PASSWORD = "<clave admin>"
node scripts/backup-snapshot.mjs
```

El backend enmascara `Password_Hash`, `Salt` y `Token` antes de responder: el archivo sirve para
comparar y auditar, **no** para restaurar contraseñas. Un usuario con la clave perdida se
recupera con un reset, no restaurando el backup.

Antes de cualquier operación destructiva o corrida larga: backup. Es la red de contención.

## Recuperación de acceso

`utils/resetAdminPassword.gs` genera una contraseña aleatoria para `admin`, revoca la sesión
abierta y **no** toca rol ni estado. Se corre desde el editor de Apps Script
(`Run` → `View → Execution log`), no por URL: no es una acción del router.

Si la cuenta estuviera `pending` o `deleted`, el log lo advierte — la clave se genera igual pero
el login la rechaza.

## Related

- [Testing](./testing.md) — qué prueba cada comando y con qué criterio.
- [Riesgos abiertos](./risks.md) — rendimiento, cuotas y datos faltantes.
- [Panorama](../erp/overview.md) — qué se está publicando.
