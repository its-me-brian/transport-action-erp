---
type: article
title: Flujo del dinero — de la tarifa a la factura cobrada
description: Cómo se calcula el ingreso y el costo de un servicio, cómo se congela, y qué hace falta para emitir una factura.
resource: ../../../docs/05-WORKFLOWS.md
tags: [dinero, facturacion, rapportino, riesgo]
timestamp: 2026-11-26T03:40:00Z
aliases: [money-flow]
topic: erp
status: stable
sources: ["../../../docs/05-WORKFLOWS.md", "../../../docs/03-BUSINESS_RULES.md", "../../../docs/18-LOCAL-TESTING.md"]
score: 20
---

# Flujo del dinero — de la tarifa a la factura cobrada

> Sources: [Workflows](../../../docs/05-WORKFLOWS.md); [Reglas de negocio](../../../docs/03-BUSINESS_RULES.md); [Testing local](../../../docs/18-LOCAL-TESTING.md)

## Overview

El dinero recorre cinco estaciones y en cada una cambia de dueño: la **tarifa** define el
precio, el **breakdown** lo aplica al servicio, el **rapportino** lo agrupa, la **factura** lo
formaliza y el **pago** lo cierra. Cada estación congela lo anterior.

```
RateCard (precio cliente)  ─┐
                            ├─► Breakdowns del servicio ─► Rapportino ─► Invoice ─► Payment
SupplierRate (costo chofer) ┘        (se congelan al validar)
```

## 1. Tarifas

Dos tablas separadas, a propósito:

| Tabla | Qué fija | Quién la mantiene |
|---|---|---|
| `RateCard` | Precio de venta por tipo de servicio, vehículo, diaria, festivo, nocturno | admin |
| `SupplierRate` | Costo del proveedor — chofer interno o colaborador — por el mismo criterio | admin |

El breakdown guarda **snapshot** de la tarifa aplicada (`SR002`): si mañana sube el precio, lo
ya calculado no cambia.

## 2. Breakdowns del servicio

`ServiceRevenueBreakdown` y `ServiceCostBreakdown` son líneas, no un total. Cada una declara su
`Source`:

- `rate_card` — calculado desde la tarifa de venta
- `driver_rate` — costo según la tarifa del proveedor
- `driver_report` — costo real informado por el chofer y aprobado
- `manual` — ajuste cargado a mano

Al pasar el servicio a `Validado`, todas las líneas quedan `Locked = Yes` (`INV-006`). A partir
de ahí, un ajuste entra como **línea nueva** (`B002`) y sobrevive a cualquier recálculo
(`B003`).

## 3. Rapportino

`RapportinoClient` agrupa los servicios de un cliente en un período. Es la puerta a la factura:
su gate `canFacturar` exige servicios validados y facturables, reconciliación resuelta y el
rapportino del chofer aceptado. Al facturar, cada `RapportinoItem` fija `LockedAmount = Amount`
(`INV-005`) y se crean los `InvoiceItem` correspondientes (`R002`).

Hay un rapportino paralelo para el proveedor: `RapportinoDriver` (chofer interno) y
`RapportinoCollaborator` (colaborador externo). Se pagan, no se facturan.

## 4. Factura

`Invoice` nace en `Borrador`, sin número. El `InvoiceNumber` se consume **al emitir** (`I002`),
para que un borrador descartado no queme un número fiscal. Al emitir, los montos se congelan
(`I003`).

### Requisito que bloquea todo: la sociedad emisora

Una factura necesita `OperatingCompany`: razón social, VAT, dirección, moneda e IVA. Si la hoja
está vacía, **no se puede emitir ninguna factura** y el error no es obvio.

Estado actual de la sociedad cargada:

| Campo | Valor |
|---|---|
| Nombre | Agencia de Transporte |
| VAT | `00FALSO12135` — **inventado a propósito** |
| Dirección | Via San Fernando 7 |
| Moneda / IVA | EUR / 21 % |

Ese VAT no es un CIF válido: el backend no valida formato, por eso entra. Sirve para ejercitar
el circuito; **antes de la primera factura real hay que reemplazarlo** por el CIF verdadero y la
dirección fiscal definitiva.

## 5. Pago

| Estado | Efecto sobre la factura |
|---|---|
| `Registrado` | Ninguno |
| `Confirmado` | Recalcula saldo y estado (`P002`) |
| `Conciliado` | Verificación bancaria |
| `Anulado` | Terminal |

Un pago confirmado es inmutable (`P005`). Anular una factura con pagos está prohibido
(`EDGE001`).

## Lo que este flujo enseñó

La batería E2E encontró acá cuatro defectos que ningún test unitario veía, porque todos vivían
en el borde entre capas:

| Defecto | Síntoma | Causa raíz |
|---|---|---|
| DTO de factura roto | Listar o leer **cualquier** factura devolvía `SYSTEM_ERROR` | `this.getSaldo` usado como callback: `this` era el global de Apps Script |
| Pago inmutable de más | Un pago confirmado no se podía conciliar ni anular nunca | Transición escrita como edición de campos en vez de cambio de estado |
| Detector de duplicados muerto | `checkDuplicatePayment` nunca marcaba nada | Comparaba `Date` contra el string `'YYYY-MM-DD'` |
| Company Settings mudo | Editar VAT, dirección o teléfono fallaba y el `catch` lo tragaba | Se llamaba `updateOperatingCompany('TA')` con el literal del slot como ID |

Los tres primeros están en el camino del dinero. Es la razón por la que este flujo se prueba
contra la base real y no solo con mocks.

## Related

- [Reglas y permisos](./business-rules.md) — las invariantes de montos.
- [Máquinas de estado](./state-machines.md) — `Invoice` y `Payment` en detalle.
- [Riesgos abiertos](../operations/risks.md) — hojas financieras en cero y VAT falso.
