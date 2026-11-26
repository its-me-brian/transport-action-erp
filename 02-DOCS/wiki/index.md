# Knowledge Base Index

> **OKF v0.1 reserved file** — `index.md` no lleva frontmatter: es el catálogo que leen los
> agentes, con links markdown relativos (`topic/article.md`). La navegación humana vive en las
> vistas `.base` de Obsidian y en el dashboard.

## erp

Qué es el producto, cómo está modelado y qué reglas no se pueden romper. Es el contexto que
necesita cualquier spec antes de proponer un cambio.

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [ERP Transport Action — Panorama](erp/overview.md) | Producto, roles, stack, topología, pantallas y escala actual | 2026-11-26 | 5.0 |
| [Modelo de dominio — Service en el centro](erp/domain-model.md) | 38 entidades, doble estado y la escalera de inmutabilidad contable | 2026-11-26 | 8.0 |
| [Máquinas de estado](erp/state-machines.md) | Transiciones válidas de cada entidad y dónde se hacen cumplir | 2026-11-26 | 11.0 |
| [Reglas de negocio, invariantes y permisos](erp/business-rules.md) | 40+ reglas por familia, 21 invariantes verificables y los 4 roles | 2026-11-26 | 14.0 |
| [Flujo del dinero](erp/money-flow.md) | De la tarifa a la factura cobrada: qué se congela y cuándo | 2026-11-26 | 20.0 |
| [Alta de un chofer](erp/driver-onboarding.md) | Cuenta vs link público, `DRIVER_NOT_LINKED` y el ciclo del token | 2026-11-26 | 7.0 |
| [Importación de listas de transporte](erp/transport-list-import.md) | Formato xlsx, ciclo de dos pasos, dedup delta y errores típicos | 2026-11-26 | 6.0 |
| [Etiquetas legibles](erp/ui-labels.md) | De IDs a nombre/fecha/cliente, regla de degradación y búsqueda por nombre | 2026-11-26 | 2.0 |

## operations

Cómo se corre, se prueba, se publica y se recupera. Léelo antes de tocar la base real.

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [Runbook](operations/runbook.md) | Comandos reales, deploy con clasp, backup y recuperación de acceso | 2026-11-26 | 12.0 |
| [Testing](operations/testing.md) | Cuatro niveles, 9 suites E2E y cómo distinguir fixture de producto | 2026-11-26 | 16.0 |
| [Migraciones](operations/migrations.md) | `schemaVersion`, la cadena de 12 y sus dos fallas silenciosas | 2026-11-26 | 8.0 |
| [Riesgos abiertos](operations/risks.md) | Rendimiento, cuotas, hojas financieras vacías y VAT de prueba | 2026-11-26 | 13.0 |

## sdd

Principios ratificados y el ciclo de trabajo de las features.

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [Constitución](sdd/constitution.md) | Stack canónico, barra de calidad, convenciones, DoD (v1.0.0) | 2026-11-26 | -4.0 |

## harness

Perfil, plan aceptado y decisiones del propio harness. No es conocimiento del producto.

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [Perfil del usuario](harness/user-profile.md) | Registro técnico, tipo de proyecto y objetivo | 2026-11-26 | -4.9 |
| [Plan de instalación](harness/installation-plan.md) | Qué se instaló y por qué, con el plan aceptado | 2026-11-26 | -4.9 |
| [Decisiones del harness](harness/decisions.md) | Bitácora append-only de decisiones (formato: 3 opciones, elección, porqué) | 2026-11-26 | 2.1 |

## Fuera de la wiki

No es conocimiento destilado, pero es de donde sale:

| Qué | Dónde | Para qué |
|---|---|---|
| Especificación canónica del ERP | `docs/00-RESUMEN-EJECUTIVO.md` … `docs/17-CODING-STANDARDS.md` | Fuente de verdad del dominio; la wiki la destila, no la reemplaza |
| Guía de prueba local | `docs/18-LOCAL-TESTING.md` | Smoke manual, usuarios, backup, release |
| Checklist manual | `docs/checklist-prueba-manual.html` | 157 ítems para la pasada visual humana |
| Código | `Transport Action All/` (React) y `Transport Action Unified/` (Apps Script) | Lo que se documenta, nunca se ingesta |

> **Score**: puntaje compuesto (links entrantes, fuentes, citas, frescura; menos conflictos y
> penalidad por huérfano). Se recalcula en cada Maintenance Pass. Los artículos por debajo del
> umbral los levanta Micro-Improve / Deep Improve.
