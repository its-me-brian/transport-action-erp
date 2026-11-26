# Wiki Log

## [2026-11-26] ingest | ERP Transport Action — Panorama
- Created: [ERP Transport Action — Panorama](erp/overview.md)
- Created: [Modelo de dominio — Service en el centro](erp/domain-model.md)
- Created: [Máquinas de estado](erp/state-machines.md)
- Created: [Reglas de negocio, invariantes y permisos](erp/business-rules.md)
- Created: [Flujo del dinero](erp/money-flow.md)
- Created: [Runbook](operations/runbook.md)
- Created: [Testing](operations/testing.md)
- Created: [Riesgos abiertos](operations/risks.md)
- Updated: [Constitución](sdd/constitution.md) — ratificada v1.0.0
- Source: `docs/` (corpus canónico, destilado a mano; ver decisión del 2026-11-26)
- Note: no se materializó el scaffolding de Obsidian (`.base`, `.obsidian/app.json`). Se puede
  agregar sin tocar los artículos.

## [2026-11-26] maintenance | autofixes: 0, new See Also: 8, gaps detected: 3
- Scores recalculados a `scores.json`; links internos verificados (0 rotos).
- Gaps abiertos: onboarding de un chofer nuevo, importación de listas de transporte, migraciones.

## [2026-11-26] ingest | cierre de los 3 gaps abiertos
- Created: [Alta de un chofer](erp/driver-onboarding.md) — cuenta vs link público, `DRIVER_NOT_LINKED`, ciclo del token
- Created: [Importación de listas de transporte](erp/transport-list-import.md) — formato xlsx, dos pasos, dedup delta
- Created: [Migraciones](operations/migrations.md) — `schemaVersion`, cadena de 12, fallas silenciosas
- Updated: [index.md](index.md) (3 filas nuevas), [gaps.md](gaps.md) (3 → `[FILLED]`), `scores.json`
- Source: código verificado, no memoria — `api.gs`, `infrastructure/driverLinks.gs`,
  `domain/transportList.gs`, `infrastructure/excelParser.gs`, `migrations/migration.gs`, más
  `docs/14-MIGRATIONS.md` y `docs/18-LOCAL-TESTING.md`
- Evidencia medida: *Drivers* tiene 13 filas y **0 con `Email`** (`backups/db-20261126-030944.json`),
  lo que confirma que la cuenta `driver` es inoperante y el link público es el camino real.
- Hallazgo documentado: `runMigrations()` corre en cada request dentro de un `try/catch` que solo
  loguea, y la versión avanza después de `fn()`. Una migración rota reintenta en cada request y la
  app sigue con el esquema viejo, sin señal en la UI.
- Verificación: un lector sin contexto respondió 5 preguntas de dominio usando solo la wiki, y
  detectó 2 ambigüedades, ya cerradas: el vencimiento del link se calcula desde **medianoche UTC**
  de `dateTo` (con `linkDurationDays: 0` nace vencido), y "ciclo operativo" vs "ciclo completo"
  quedó definido en [Panorama](erp/overview.md) — el ciclo completo exige `admin`, no `coordinator`.


