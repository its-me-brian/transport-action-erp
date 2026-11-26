---
type: article
title: Reglas de negocio, invariantes y permisos
description: Las 40+ reglas del dominio agrupadas por familia, las 21 invariantes verificables y la matriz de cuatro roles.
resource: ../../../docs/03-BUSINESS_RULES.md
tags: [reglas, invariantes, permisos, seguridad]
timestamp: 2026-11-26T03:40:00Z
aliases: [business-rules]
topic: erp
status: stable
sources: ["../../../docs/03-BUSINESS_RULES.md", "../../../docs/07-INVARIANTS.md", "../../../docs/08-PERMISSIONS.md"]
score: 14
---

# Reglas de negocio, invariantes y permisos

> Sources: [Reglas de negocio](../../../docs/03-BUSINESS_RULES.md); [Invariantes](../../../docs/07-INVARIANTS.md); [Permisos](../../../docs/08-PERMISSIONS.md)

## Overview

Tres capas de obligación, de más blanda a más dura: **reglas** (qué puede pasar y con qué
efecto), **invariantes** (propiedades que nunca se violan, verificables sobre la base) y
**permisos** (quién puede disparar cada comando). Una regla que no se puede verificar sobre los
datos es una convención; una invariante es un test.

## Familias de reglas

| Prefijo | Ámbito | Ejemplo |
|---|---|---|
| `OC` | Sociedad y numeración | `OC001` — secuencia independiente por empresa |
| `S` | Ciclo del servicio | `S006` — validar exige reporte aceptado + breakdowns |
| `SF` | Carril financiero | `SF001` — facturar exige `OperationalStatus = Validado` |
| `SR` / `SC` | Breakdowns de ingreso y costo | `SR002` — el breakdown guarda snapshot de la tarifa |
| `D` | Reporte del chofer | `D003` — aprobar crea `CostBreakdown` con `Source = driver_report` |
| `R` | Rapportino cliente | `R002` — facturar congela items y crea `InvoiceItems` |
| `RD` | Rapportino chofer | `RD002` — pagar crea `DriverAdvances` |
| `I` | Factura | `I002` — `InvoiceNumber` se genera al emitir |
| `P` | Pago | `P001` — registrar no afecta la factura; confirmar sí |
| `E` | Gasto | `E001` — `Draft` editable, `Confirmed` inmutable |
| `B` | Breakdown manual | `B002` — los ajustes sobreviven al recálculo |
| `EDGE` | Casos borde | `EDGE001` — no anular factura con pagos |

## Las doce que más se rompen

| Regla | Qué impone | Dónde vive |
|---|---|---|
| `S006` | No se valida sin reporte aceptado y breakdowns | `serviceCommands.gs` |
| `S007` | No se retrocede después de `Validado` | `stateMachine.gs` |
| `SF001` | No se factura un servicio no validado | `serviceCommands.gs` |
| `D001` | Un solo `DriverReport` activo por servicio | `driverReportCommands.gs` |
| `D003` | Aprobar el reporte genera el costo real | `driverReportCommands.gs` |
| `R002` | Facturar congela `LockedAmount` | `rapportinoCommands.gs` |
| `I002` | El número de factura se consume al emitir | `invoiceCommands.gs` |
| `I003` | Los montos no cambian después de emitir | `invoice.gs` |
| `P002` | Solo el pago confirmado mueve el saldo | `paymentCommands.gs` |
| `P005` | El pago confirmado es inmutable | `payment.gs` |
| `E001` | El gasto confirmado no se edita | `expenseCommands.gs` |
| `EDGE001` | No se anula una factura con pagos | `invoiceCommands.gs` |

## Invariantes

`queries/invariants.gs` expone `checkInvariants`, que recorre la base y devuelve las violaciones.
La última corrida completa dio **0 violadas** sobre 21 verificadas.

| Grupo | Invariantes | Qué garantizan |
|---|---|---|
| Montos | `INV-001`…`INV-006` | Total = subtotal + impuesto; subtotal = suma de items; pagos ≤ total; `LockedAmount` y breakdowns congelados |
| Entidades | `INV-007`…`INV-010` | Un reporte activo por servicio; un dueño por gasto; secuencia creciente; anticipo nunca negativo |
| Estado | `INV-011`…`INV-014` | Solo transiciones válidas; no retroceso contable; factura y pago inmutables |
| Referencias | `INV-015`…`INV-019` | Servicio→proyecto, servicio→chofer, item→servicio, item→rapportino, pago→factura |
| Formato | `INV-020`, `INV-021` | IDs `{Prefix}-{Year}-{Sequential}`; `AccountingDate ≥ ExpenseDate` |

## Permisos

Cuatro roles, sin rol «básico». El backend es la autoridad: `infrastructure/auth.gs` guarda la
matriz y cada acción del router declara qué permiso exige. El frontend esconde botones, pero
esconder un botón no es un permiso.

| Ámbito | admin | coordinator | accounting | driver |
|---|---|---|---|---|
| Proyectos y servicios | total | crear, editar, asignar, validar | solo lectura | solo los suyos |
| Reporte del chofer | todo | aprobar y rechazar | — | crear y enviar |
| Rapportino cliente | todo | crear, revisar, enviar | aceptar y facturar | — |
| Facturas y pagos | todo | — | todo | — |
| Gastos | todo | crear y editar `Draft` | confirmar, cancelar | — |
| RateCard | todo | — | — | — |
| Usuarios, settings, sociedad | todo | — | — | — |
| Auditoría | todo | activity feed | audit log | activity feed |

Dos consecuencias que importan al asignar un rol nuevo:

- **`coordinator` no factura.** Si alguien tiene que facturar, necesita `accounting`.
- **`driver` no sirve sin vínculo.** El login funciona, pero la pantalla queda vacía con
  `DRIVER_NOT_LINKED` si ninguna fila de *Drivers* lleva su email.

## Related

- [Máquinas de estado](./state-machines.md) — las transiciones que estas reglas gobiernan.
- [Flujo del dinero](./money-flow.md) — las reglas de factura y pago en contexto.
- [Testing](../operations/testing.md) — cómo se prueba que una regla rechaza.
