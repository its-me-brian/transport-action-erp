---
type: constitution
title: Transport Action — Constitución
description: Principios ratificados del proyecto, derivados de la especificación y de la evidencia medida al cerrar la primera versión.
tags: [sdd, constitution]
timestamp: 2026-11-26T05:15:13Z
topic: sdd
status: ratified
version: 1.0.1
---

# Transport Action — Constitución

> Ratificada el 2026-11-26 sobre evidencia medida, no sobre intención: la especificación de
> `docs/` más la corrida de verificación de la primera versión (deployment 240, 792 tests
> unitarios, 252 pasos E2E, 21 invariantes sin violar). Cada sección cita de dónde sale.
> El dueño puede enmendarla: toda enmienda se anota abajo y sube la versión.

## Hechos conocidos

- **Producto**: ERP de gestión para una agencia de transporte de Roma que trabaja con
  producciones audiovisuales. Dos sociedades operativas bajo una misma base.
- **Alcance**: importar servicios, asignar, ejecutar, validar, calcular economía, rapportinos
  (cliente, chofer, colaborador), facturar, cobrar, auditar.
- **Cómo aterrizan los cambios**: directo sobre la rama por defecto, sin PR. Decisión tomada en
  el onboarding (`--workflow main`).
- **Estado**: primera versión funcionalmente completa; ver
  [Riesgos abiertos](../operations/risks.md) para lo que falta.

## 1. Stack canónico

| Capa | Decisión | Consecuencia |
|---|---|---|
| Frontend | React 19 + TypeScript 5.8 + Vite 6 + Tailwind 4, router `react-router-dom` 7 | Sin framework de datos: el estado del servidor se maneja con hooks propios en `src/hooks/` |
| Backend | Google Apps Script (`.gs`), sin transpilación | JavaScript con `var`/`const`; sin módulos ES, sin bundler |
| Persistencia | Google Sheets, 39 hojas, una por entidad | Sin SQL, sin ORM, sin transacciones. La atomicidad se resuelve con `LockService` |
| Deploy | `clasp` con deployment versionado sobre un único ID | Publicar exige `version` + `deploy`; `push` solo no cambia lo que corre |
| Tests | Vitest (unitarios) + batería E2E propia (sistema) + Playwright (UI) | Ver [Testing](../operations/testing.md) |

**No se agrega** un runtime nuevo (Node server, base relacional, ORM, framework de datos) sin
una propuesta que explique qué problema resuelve y qué se pierde. La simplicidad de la pila es
una decisión, no un accidente.

## 2. Barra de calidad

Un cambio está listo cuando **todo** esto pasa:

| Gate | Criterio |
|---|---|
| Tipos | `npm run lint` (`tsc --noEmit`) sin errores |
| Unitarios | `npm test` verde — hoy 792/792 en 33 archivos |
| Sintaxis backend | `node --check` sobre los 73 `.gs`, sin errores |
| Flujos | Batería E2E verde en las suites afectadas |
| Invariantes | `checkInvariants` con 0 violaciones (`INV-001`…`INV-021`) |
| Datos | Backup tomado antes de cualquier operación destructiva |

**No se publica con un gate en rojo.** Un test que se debilita para pasar es peor que un test
que falla: convierte una alarma en decoración.

## 3. Convenciones

| Concepto | Convención | Ejemplo |
|---|---|---|
| Repositorios | `PascalCase` + `Repository` | `ServiceRepository` |
| Comandos | `camelCase` verbo + sustantivo | `validateService` |
| Consultas | `camelCase` `calculate`/`get` | `calculateRevenue` |
| Entidades / DTOs | `PascalCase` / `PascalCase` + `DTO` | `Invoice`, `InvoiceDTO` |
| Privadas | prefijo `_` | `_generateId`, `_logAudit` |
| Públicas de API | `camelCase` | `apiGetServices` |
| Constantes | `UPPER_SNAKE` | `DB_SHEET_ID` |
| Hojas | `PascalCase` plural | `Services`, `Invoices` |
| Campos | `PascalCase` | `OperationalStatus` |

Reglas de estructura, sin excepciones:

1. **Sheets solo se toca desde el repositorio.** `api.gs` y el dominio nunca abren una hoja.
2. **El estado solo cambia por la máquina de estados.** Asignar `OperationalStatus` a mano es
   un defecto, aunque el valor sea el correcto.
3. **Los IDs solo salen de `_generateId()`.** Nunca se construyen por concatenación.
4. **Los eventos se emiten desde comandos, no desde el repositorio.** Los listeners notifican;
   no modifican entidades contables.
5. **Toda regla de negocio vive en `domain/`.** La infraestructura no conoce reglas.
6. **El dinero se opera en centavos enteros.** Sin `parseFloat` acumulado, sin comparar floats.
7. **Lectura separada de escritura.** `queries/` no muta nada.

## 4. Ramas y publicación

- Rama por defecto, sin PR: el proyecto es de un solo operador y la fricción de un PR sin
  revisor no compra seguridad.
- Cada publicación crea una **versión** y se despliega sobre el mismo deployment ID, para que la
  URL y los permisos no cambien.
- El rollback es desplegar la versión anterior: `clasp deploy -i <id> -V <n>`.
- Un commit describe el efecto, no el archivo: `fix: invoice DTO saldo resolution`.
- Los commits automáticos del harness usan `docs(auto):` — tipo `docs`, ámbito `auto` — sin emoji
  ni atribución de IA, y llevan `[skip ci]` solo en la rama de intercambio `rsc/knowledge`.

## 5. Piso de seguridad y privacidad

- **Nada de credenciales en el repo.** La contraseña de arranque es aleatoria por instalación y
  se imprime una sola vez en el log de ejecución.
- **El token de sesión vive en la hoja, uno por usuario.** Un login nuevo revoca el anterior.
- **El backend es la autoridad de permisos.** La UI puede esconder un botón; no puede conceder
  un permiso.
- **Los datos financieros no se borran, se anulan.** `Cancelled`, `Anulada`, `deleted`: el
  rastro queda y la auditoría lo registra.
- **Los backups enmascaran hash, salt y token.** Un backup no sirve para recuperar una clave.
- **Nada de datos de producción en tests.** La batería etiqueta lo suyo con `E2E-<timestamp>` y
  lo purga por etiqueta.

## 6. Piso de UX

- **Toda acción destructiva pide confirmación** y dice qué se va a borrar.
- **Todo error de escritura se muestra.** Un `catch` que traga el error está prohibido: fue
  exactamente el defecto que dejó Company Settings sin guardar durante meses.
- **Los estados se ven, no se adivinan.** Si una transición no está disponible, el botón no
  aparece — pero el backend la rechaza igual.
- **Mobile primero en el link del chofer.** Ese formulario se usa desde el teléfono, en la calle,
  sin sesión.
- **Castellano en la interfaz**, con los términos del dominio en italiano cuando son del negocio
  (`rapportino`, `piazzale`, `diaria`).

## 7. Presupuestos de rendimiento

| Escenario | Presupuesto | Realidad medida |
|---|---|---|
| Acción individual en reposo | ≤ 5 s | 3,3 s |
| Acción bajo carga | ≤ 12 s | 7–11 s |
| Flujo de 15 pasos | ≤ 3 min | ~3 min |
| Sesión sostenida | Sin errores de cuota | Se satura a las ~2 h |

El límite no lo pone el código: lo pone Apps Script. **Un cambio que agregue viajes a la hoja por
request empeora un presupuesto que ya está al límite** y necesita justificación explícita.

## 8. Conocimiento y decisiones

- `docs/` es el corpus canónico del dominio: especificación, reglas, estados, invariantes.
- `02-DOCS/wiki/` es el modelo destilado que leen los agentes; se entra por
  [index.md](../index.md).
- Las decisiones del harness se anotan en [decisions.md](../harness/decisions.md); las del ciclo
  SDD, en `02-DOCS/wiki/sdd/`.
- Una decisión sin fecha y sin motivo no es una decisión: es un rumor.

## Definición de Terminado

El criterio que corre `verify`:

1. El comportamiento pedido existe y se puede ejercitar por la API, no solo por la UI.
2. Los gates de la sección 2 están en verde, con la salida a la vista.
3. Las invariantes afectadas siguen en 0 violaciones.
4. Las transiciones ilegales nuevas se rechazan con error de negocio, no con excepción.
5. La documentación que quedó falsa se corrigió en el mismo cambio.
6. Hay evidencia: comando ejecutado y resultado, no «debería funcionar».

## Registro de enmiendas

| Fecha | Versión | Cambio | Por qué |
|------|---------|--------|---------|
| 2026-11-26 | draft | Borrador generado por `rsc onboard`. | El piso de SDD necesita una constitución. |
| 2026-11-26 | 1.0.0 | Ratificada desde la especificación de `docs/` y la evidencia de la primera versión. | Sin ella, `verify` corre contra un DoD vacío. |
| 2026-11-26 | 1.0.1 | Los commits automáticos del harness quedan en `docs(auto):`, sin emoji. | Alinear el auto-commit con la convención de commits de la §4. |
