---
type: article
title: Máquinas de estado
description: Transiciones válidas de Service, Invoice, Payment, Rapportino, Expense, DriverReport, Project y Change, y dónde se hacen cumplir.
resource: ../../../docs/04-STATE_MACHINES.md
tags: [estados, transiciones, invariantes]
timestamp: 2026-11-26T03:40:00Z
aliases: [state-machines]
topic: erp
status: stable
sources: ["../../../docs/04-STATE_MACHINES.md", "../../../docs/11-CONCURRENCY.md"]
score: 11
---

# Máquinas de estado

> Sources: [Máquinas de estado](../../../docs/04-STATE_MACHINES.md); [Concurrencia](../../../docs/11-CONCURRENCY.md)

## Overview

Ningún estado se escribe directamente. Cada transición pasa por la máquina de estados
(`infrastructure/stateMachine.gs`), que valida que el destino esté en la lista permitida del
origen. Una transición ilegal devuelve error de negocio, no un `SYSTEM_ERROR`: el sistema
rechaza, no explota.

## Service — carril operativo

| Desde | Hacia | Regla | Quién |
|---|---|---|---|
| `Importado` | `Asignado` | Requiere chofer y vehículo válidos | coordinator |
| `Asignado` | `Confirmado` | — | coordinator |
| `Confirmado` | `EnRuta` | — | coordinator, driver |
| `EnRuta` | `Realizado` | — | coordinator, driver |
| `Realizado` | `Reportado` | Requiere `DriverReport` | coordinator |
| `Reportado` | `Revision` | — | coordinator |
| `Revision` | `Validado` | Requiere reporte aceptado **y** breakdowns (`S006`) | coordinator |
| `Importado`…`EnRuta` | `Cancelado` | Terminal | coordinator |

Después de `Validado` no hay retroceso (`S007`, `INV-012`).

## Service — carril financiero

| Desde | Hacia | Disparador |
|---|---|---|
| `Pendiente` | `Calculado` | Cálculo por RateCard / SupplierRate |
| `Calculado` | `Confrontacion` | Llega el reporte del chofer |
| `Confrontacion` | `ActualsConfirmados` | Se resuelve la reconciliación |
| `ActualsConfirmados` | `Aprobado` | Aprobación manual |
| `Aprobado` | `Facturable` | Se marca facturable |
| `Facturable` | `Facturado` | `facturarRapportino` (`SF001`) |
| `Facturado` | `Cobrado` | Cobro completo (`SF002`) |
| `Cobrado` | `Cerrado` | Cierre (`SF003`) |
| `Cerrado` | `CerradoComercial` | Cierre comercial |

`Facturado` exige `OperationalStatus = Validado`. Un servicio `Realizado` con
`FinancialStatus = Facturado` es imposible por diseño.

## Invoice

| Desde | Hacia | Condición |
|---|---|---|
| `Borrador` | `Emitida` | Se asigna `InvoiceNumber` en ese momento, no al crear |
| `Borrador` / `Emitida` | `Anulada` | Solo sin pagos (`EDGE001`) |
| `Emitida` | `Enviada` | — |
| `Enviada` | `PagoParcial` / `Pagada` / `Vencida` | Según saldo y fecha |
| `PagoParcial` | `Pagada` / `Vencida` | — |
| `Vencida` | `Pagada` | Pago completo |

Los montos quedan fijos al emitir (`I003`, `INV-013`).

## Payment

| Desde | Hacia | Efecto |
|---|---|---|
| `Registrado` | `Confirmado` | Recién acá recalcula el saldo de la factura (`P002`) |
| `Registrado` | `Anulado` | Terminal |
| `Confirmado` | `Conciliado` | Verificación bancaria |

Un pago `Registrado` **no** afecta la factura. Confirmarlo sí. Después de confirmado es
inmutable (`P005`, `INV-014`) — y esa inmutabilidad es la que durante meses impidió conciliar y
anular: ver [Flujo del dinero](./money-flow.md).

## Rapportinos

`RapportinoClient` y `RapportinoDriver` comparten forma:

```
Borrador → Revisado → Enviado → Aceptado → Facturado | Pagado
```

El paso `Enviado` es obligatorio: aceptar desde `Revisado` es una transición ilegal y el
sistema la rechaza. `RapportinoCollaborator` sigue la misma cadena.

## Expense

`Draft` (editable) → `Confirmed` (inmutable) → `Cancelled` (no contabiliza).
`AccountingDate ≥ ExpenseDate` (`INV-021`).

## DriverReport

`Pendiente` → `Aceptado` (crea `ServiceCostBreakdown` con `Source = driver_report`) o
`Rechazado` (permite uno nuevo con `Version + 1`). Nunca hay dos activos por servicio
(`INV-007`, regla `D001`).

## Project

`Nuovo → Preparazione → Attivo → Fatturazione → Incasso → Chiuso → Archiviato`, sin retroceso.

## Change

`Open ⇄ Resolved`, con reapertura permitida.

## Dónde se hace cumplir

| Capa | Mecanismo |
|---|---|
| Dominio | `_assertValidTransition(entidad, desde, hacia)` en cada comando |
| Datos | `checkInvariants` (`queries/invariants.gs`) verifica `INV-001`…`INV-021` sobre la base real |
| UI | Botones deshabilitados por estado — cosmético, no es la garantía |

La UI es una comodidad. La garantía está en el comando: si alguien llama la acción directamente
por API, la transición ilegal se rechaza igual.

## Related

- [Modelo de dominio](./domain-model.md) — qué entidad tiene cada estado.
- [Reglas y permisos](./business-rules.md) — las reglas detrás de cada flecha.
- [Testing](../operations/testing.md) — cómo se prueba que una transición ilegal falla bien.
