# Knowledge Gaps

Conceptos que la wiki menciona pero no explica por sí sola, o preguntas que hoy se contestan
leyendo código. Append-only: cuando se llenan, se marcan `[FILLED]`, no se borran.

## [2026-11-26] gap | Onboarding de un chofer nuevo
Source: [Modelo de dominio](erp/domain-model.md) y [Reglas y permisos](erp/business-rules.md)
mencionan `DRIVER_NOT_LINKED` sin explicar el procedimiento completo.
Mentioned in: [Modelo de dominio](erp/domain-model.md), [Reglas de negocio](erp/business-rules.md), [Riesgos abiertos](operations/risks.md)
Suggested topic: operations
Status: open

## [2026-11-26] gap | Importación de listas de transporte
Source: [Panorama](erp/overview.md) nombra `TransportList` y la importación como primer paso del
ciclo, pero no hay artículo sobre el parser, el formato aceptado ni los errores típicos.
Mentioned in: [Panorama](erp/overview.md), [Modelo de dominio](erp/domain-model.md)
Suggested topic: erp
Status: open

## [2026-11-26] gap | Migraciones de esquema y datos
Source: `docs/14-MIGRATIONS.md` existe y se cita de pasada, pero la wiki no explica cómo se
versiona el esquema ni qué pasa si una migración falla a mitad.
Mentioned in: [Runbook](operations/runbook.md)
Suggested topic: operations
Status: open
