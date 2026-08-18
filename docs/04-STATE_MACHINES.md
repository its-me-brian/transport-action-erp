# STATE_MACHINES.md — Diagramas de estados y transiciones

## Service — Doble Estado

```
OperationalStatus:
═══════════════

Importado
    │ asignar conductor (S001)
    ▼
Asignado
    │ confirmar (S002)
    ▼
Confirmado
    │ iniciar ruta (S003)
    ▼
EnRuta
    │ completar (S004)
    ▼
Realizado
    │ recibir reporte (S005)
    ▼
Reportado
    │ validar (S006)
    ▼
Revision
    │ validar (S007)
    ▼
Validado ◄─── freeze breakdowns
    │
    ╳ (no retroceso)

Cancelado ◄── terminal (S008)
    │ desde Importado/Asignado/Confirmado/EnRuta
    ╳ (no retroceso)


FinancialStatus:
════════════════

Pendiente
    │ calcular (rate card)
    ▼
Calculado
    │ confrontar (driver report)
    ▼
Confrontacion
    │ resolver reconciliación
    ▼
ActualsConfirmados
    │ aprobar
    ▼
Aprobado
    │ marcar facturable
    ▼
Facturable
    │ facturar (SF001)
    ▼
Facturado
    │ cobrar (SF002)
    ▼
Cobrado
    │ cerrar (SF003)
    ▼
Cerrado
    │ cerrar comercialmente
    ▼
CerradoComercial
    │
    ╳ (no retroceso)
```

### Reglas de interacción entre estados

```
OperationalStatus debe ser "Validado" para que
FinancialStatus pueda avanzar a "Facturado"

FinancialStatus puede cambiar independientemente
de OperationalStatus después de "Validado"

Ejemplos válidos:
  Operational: Realizado    Financial: Pendiente  → OK
  Operational: Validado     Financial: Pendiente  → OK
  Operational: Validado     Financial: Facturado  → OK
  Operational: Realizado    Financial: Facturado  → IMPOSIBLE
```

---

## Invoice

```
Borrador
    │ emitir (I001) → InvoiceNumber = Sequence()
    ▼
Emitida
    │
    ├── enviar ──▶ Enviada
    │                  │
    │      ┌───────────┤
    │      │           │
    │  primer pago  vencimiento
    │      │           │
    │      ▼           ▼
    │ PagoParcial   Vencida
    │      │           │
    │      │ saldo=0   │ pago completo
    │      ▼           ▼
    │   Pagada ◄──── Pagada
    │
    └── anular ──▶ Anulada (sin pagos)

Transiciones completas:
  Borrador   → Emitida
  Borrador   → Anulada
  Emitida    → Enviada
  Emitida    → Anulada
  Enviada    → PagoParcial
  Enviada    → Pagada
  Enviada    → Vencida
  PagoParcial → Pagada
  PagoParcial → Vencida
  Vencida    → Pagada
```

---

## Payment

```
Registrado
    │ confirmar (P002) → recalcula saldo Invoice
    ▼
Confirmado
    │ conciliar (P003)
    ▼
Conciliado

Anulado ◄── terminal (desde Registrado)

Registrado:   NO afecta Invoice
Confirmado:   SÍ afecta saldo
Conciliado:   verificación bancaria
Anulado:      anulado, inmutable
```

---

## RapportinoClient

```
Borrador
    │ revisar (R001)
    ▼
Revisado
    │ enviar
    ▼
Enviado
    │ aceptar
    ▼
Aceptado
    │ facturar (R002) → lock items + crear InvoiceItems
    ▼
Facturado
    │
    ╳ (no retroceso)
```

---

## RapportinoDriver

```
Borrador
    │ revisar (RD001)
    ▼
Revisado
    │ enviar
    ▼
Enviado
    │ aceptar
    ▼
Aceptado
    │ pagar (RD002) → crear DriverAdvances
    ▼
Pagado
    │
    ╳ (no retroceso)
```

---

## Expense

```
Draft
    │ confirmar (E002)
    ▼
Confirmed ◄── inmutable
    │ cancelar (E003)
    ▼
Cancelled

Draft:       editable
Confirmed:   inmutable
Cancelled:   anulado, no contabiliza
```

---

## DriverReport

```
Pendiente
    │
    ├── aprobar (D003)
    │   ▼
    │ Aceptado → Locked
    │            → crear CostBreakdown (Source="driver_report")
    │
    └── rechazar (D004)
        ▼
    Rechazado → Locked
               → puede crear nuevo (Version + 1)
```

---

## Change

```
Open
    │ resolver
    ▼
Resolved
    │ reopen
    ▼
Open
```

---

## Project

```
Nuovo
    │ preparar
    ▼
Preparazione
    │ activar
    ▼
Attivo
    │ pasar a facturación
    ▼
Fatturazione
    │ pasar a cobro
    ▼
Incasso
    │ cerrar
    ▼
Chiuso
    │ archivar
    ▼
Archiviato
    │
    ╳ (no retroceso)
```
