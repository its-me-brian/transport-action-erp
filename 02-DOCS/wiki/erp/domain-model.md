---
type: article
title: Modelo de dominio — Service en el centro
description: Las 38 entidades del ERP, el doble estado del servicio y la escalera de inmutabilidad contable.
resource: ../../../docs/02-DOMAIN.md
tags: [dominio, entidades, inmutabilidad]
timestamp: 2026-11-26T03:40:00Z
aliases: [domain-model]
topic: erp
status: stable
sources: ["../../../docs/01-ERD.md", "../../../docs/02-DOMAIN.md", "../../../docs/09-AGGREGATES.md"]
score: 8
---

# Modelo de dominio — Service en el centro

> Sources: [ERD](../../../docs/01-ERD.md); [Dominio](../../../docs/02-DOMAIN.md); [Agregados](../../../docs/09-AGGREGATES.md)

## Overview

Todo cuelga del **Service**: es la unidad de trabajo que se importa, se asigna, se ejecuta, se
valida, se factura y se cobra. Ninguna entidad contable existe sin un servicio detrás.

```
Project → TransportList → Service → DriverReport → Rapportino → Invoice → Payment
```

## El doble estado

`Service` tiene dos estados independientes que avanzan por carriles distintos:

| Estado | Carril | Quién lo mueve |
|---|---|---|
| `OperationalStatus` | Físico: el viaje ocurrió o no | Coordinator |
| `FinancialStatus` | Contable: la plata se calculó, se aprobó, se cobró | Accounting |

La regla de convivencia: `FinancialStatus` **no puede llegar a `Facturado`** si
`OperationalStatus` no está en `Validado`. Después de validado, el carril financiero avanza solo.

Esto evita el error clásico de mezclar «el viaje se hizo» con «el viaje está pago», y permite
facturar un servicio mientras otro del mismo proyecto sigue en ruta.

## Grupos de entidades

| Grupo | Entidades | Mutabilidad |
|---|---|---|
| Comercial | `Client`, `Contact`, `Project`, `TransportList` | Libre; `TransportList` inmutable al crear |
| Operativo | `Service`, `Driver`, `Vehicle`, `DriverRate`, `RateCard`, `Change`, `DriverReport` | Mutable hasta validar |
| Costo de proveedor | `Collaborator`, `SupplierRate`, `RapportinoCollaborator`, `RapportinoCollaboratorItem` | Se congela al pagar |
| Contable | `ServiceRevenueBreakdown`, `ServiceCostBreakdown`, `RapportinoClient`, `RapportinoItem`, `RapportinoDriver`, `Invoice`, `InvoiceItem`, `Payment`, `Expense`, `DriverAdvance` | Congelado por hitos |
| Sistema | `OperatingCompany`, `Settings`, `Sequence`, `User`, `Document` | Configuración |
| Trazabilidad | `AuditLog`, `ActivityFeed`, `DriverLink`, `DriverLinkEvent`, `DriverLinkResponse`, `DriverReportInbox`, `Presence`, `Reconciliation` | Append-only o efímero |

## La escalera de inmutabilidad

Cada eslabón se congela en un hito distinto, y hacia atrás no se vuelve:

| Entidad | Se congela cuando | Qué queda fijo |
|---|---|---|
| `ServiceRevenueBreakdown` / `ServiceCostBreakdown` | El servicio pasa a `Validado` | Importes y líneas (`Locked = Yes`) |
| `DriverReport` | Se aprueba o se rechaza | El reporte entero; una corrección crea `Version + 1` |
| `RapportinoItem` | El rapportino se factura | `LockedAmount = Amount`, para siempre |
| `InvoiceItem` | Se crea | Todo |
| `Invoice` | Se emite (deja de ser `Borrador`) | `Subtotal`, `TaxRate`, `TaxAmount`, `Total` |
| `Payment` | Se confirma | Todos los campos |
| `Expense` | Se confirma | Todos los campos; corregir exige uno nuevo |

La consecuencia práctica: **corregir después de un hito no es editar, es agregar**. Un ajuste
manual sobre un breakdown ya congelado entra como línea nueva con su `Source`, no reescribiendo
la original.

## Cómo se persiste

Una hoja por entidad. La primera fila son los headers y el repositorio lee **por nombre de
columna** (`_getAll`, `_getById`, `_find`, `_create`, `_update`, `_softDelete`).

Dos excepciones que hay que tener presentes:

1. **`Users` se lee por posición**, no por header: índice 4 es el rol, 7 el estado, 12 el token,
   13 el vencimiento. Cambiar el orden de columnas de esa hoja rompe el login de todos.
   Ver [Runbook](../operations/runbook.md).
2. **Borrado lógico.** Las entidades con columna `DeletedAt` no se borran: se marcan y se
   filtran en las lecturas. Un borrado físico se reserva para datos de prueba.

## Identidad

Todo ID sigue `{Prefix}-{Year}-{Sequential}` (`INV-020`): `SVC-TA-2026-00141`,
`INV-MM-2026-00003`. El secuencial sale de la hoja `Sequence`, es **por prefijo y por sociedad**
(`OC001`) y nunca decrece (`INV-009`). Nadie construye IDs a mano: se piden a `_generateId()`.

## Related

- [Máquinas de estado](./state-machines.md) — las transiciones que mueven estos estados.
- [Reglas y permisos](./business-rules.md) — las invariantes que sostienen el modelo.
- [Flujo del dinero](./money-flow.md) — cómo se llenan los breakdowns y qué los congela.
