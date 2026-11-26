---
type: article
title: Riesgos abiertos de la primera versión
description: Lo que está verde, lo que está sin probar con datos reales y el riesgo técnico que no se arregla con tests.
resource: ../../../docs/18-LOCAL-TESTING.md
tags: [riesgos, rendimiento, v1]
timestamp: 2026-11-26T03:40:00Z
aliases: [risks]
topic: operations
status: stable
sources: ["../../../docs/18-LOCAL-TESTING.md", "../../../docs/11-CONCURRENCY.md"]
score: 13
---

# Riesgos abiertos de la primera versión

> Sources: [Testing local](../../../docs/18-LOCAL-TESTING.md); [Concurrencia](../../../docs/11-CONCURRENCY.md)

## Overview

La primera versión está funcionalmente completa y verificada por la batería: 252 pasos, 0
fallos, 21 invariantes sin violar. Lo que queda abierto no es corrección de código — es
operación, datos y rendimiento. Este artículo existe para que nadie confunda «los tests pasan»
con «está listo para el negocio».

## 1. Rendimiento y cuotas — el riesgo más serio

Cada acción del Web App tarda **7–11 segundos**. Un flujo de 15 pasos tarda ~3 minutos. Después
de dos horas de uso sostenido, Apps Script empieza a devolver `fetch failed` y timeouts de 120 s;
en reposo vuelve a ~3,3 s.

| Medición | Valor |
|---|---|
| `healthCheck` en reposo | 3,3 s |
| `login` en reposo | 3,7 s |
| Acción típica bajo carga | 7–11 s |
| Saturación | ~2 h de martilleo continuo |

No es un bug: es el modelo de ejecución de Apps Script (una invocación por request, sin
conexión persistente, con cuotas diarias). Un coordinador cargando 20 servicios en una mañana
va a chocar con esto. **No se arregla con tests.**

## 2. Datos financieros sin probar

Tras la purga, las hojas del circuito de dinero quedaron así:

| Hoja | Filas |
|---|---|
| `Invoices` | 0 |
| `InvoiceItems` | 0 |
| `Payments` | 0 |
| `Expenses` | 10 |

La batería sí ejercitó el ciclo completo (creó factura con items por €603,18 y la borró), así
que el código está probado. Lo que **no** está probado es la operación con volumen real: cientos
de facturas, pagos parciales, vencimientos. Es la diferencia entre «funciona» y «aguanta».

## 3. VAT de prueba

La sociedad emisora está cargada con `00FALSO12135`, un identificador inventado a propósito para
ejercitar el circuito. No es un CIF válido y una factura emitida con él no tiene validez fiscal.
Antes de la primera factura real: reemplazarlo por el CIF verdadero y completar la dirección
fiscal definitiva. Ver [Flujo del dinero](../erp/money-flow.md).

## 4. Una sesión por usuario

`Users` guarda **un solo token** por cuenta (columnas 12/13). Un segundo login invalida el
primero. Consecuencias:

- Dos personas no pueden compartir la cuenta `admin`. Cada una necesita la suya.
- Un script que se loguee mientras alguien trabaja le corta la sesión a esa persona.
- La batería toma un lock en `reports/e2e.lock` justamente por esto.

Es una limitación de diseño, no un defecto: obliga a que cada operador tenga su usuario, que es
lo correcto para la auditoría.

## 5. Residuos inertes

Quedaron dos usuarios de prueba como filas `deleted` (`v1probe`, `v1driver`). No pueden loguear
ni aparecen en los listados: son ruido cosmético en la hoja, no un riesgo.

## 6. Lo que ningún test automático cubre

| Aspecto | Por qué no |
|---|---|
| Que la pantalla se vea bien | La batería llama acciones; no renderiza |
| Que el flujo se entienda | Requiere un humano usándolo |
| Envío real de emails | Las suites los omiten a propósito: mandan correo de verdad |
| Migraciones globales | Reescriben toda la base; se omiten por diseño |
| Pagos con IBAN y fecha reales | Requieren datos bancarios verdaderos |

Para eso está el [checklist manual](../../../docs/checklist-prueba-manual.html).

## Related

- [Testing](./testing.md) — qué sí está probado y con qué evidencia.
- [Runbook](./runbook.md) — backup, purga y rollback.
- [Flujo del dinero](../erp/money-flow.md) — el circuito que depende del VAT real.
