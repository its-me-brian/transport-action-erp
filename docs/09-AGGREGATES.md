# AGGREGATES.md — Agregados y Aggregate Roots

## Service

**Aggregate Root:** Service

**Entidades internas:**
- ServiceRevenueBreakdown
- ServiceCostBreakdown
- DriverReport

**Quién controla invariantes:** Service (el root)

**Reglas de integridad:**
- No se puede crear un Breakdown directamente, solo vía comandos de Service
- No se puede crear un DriverReport directamente, solo vía submitReport
- Los Breakdowns se congelan cuando el Service se valida
- El DriverReport se congela al aprobar/rechazar

**Referencias a otros agregados:**
- → Project
- → Driver
- → Vehicle
- → TransportList

---

## RapportinoClient

**Aggregate Root:** RapportinoClient

**Entidades internas:**
- RapportinoItem

**Quién controla invariantes:** RapportinoClient

**Reglas de integridad:**
- No se puede crear un RapportinoItem directamente, solo vía addServiceToRapportino
- Los items se congelan al facturar
- Un rapportino facturado no puede modificarse

**Referencias a otros agregados:**
- → Project
- → Client
- ← Service (vía RapportinoItem)

---

## RapportinoDriver

**Aggregate Root:** RapportinoDriver

**Entidades internas:** (ninguna interna, pero referencia Service)

**Quién controla invariantes:** RapportinoDriver

**Referencias a otros agregados:**
- → Project
- → Driver
- ← Service

---

## Invoice

**Aggregate Root:** Invoice

**Entidades internas:**
- InvoiceItem
- Payment

**Quién controla invariantes:** Invoice

**Reglas de integridad:**
- No se puede crear un InvoiceItem directamente, solo vía facturarRapportino
- No se puede crear un Payment directamente, solo vía registerPayment
- Los montos se congelan al emitir
- Un invoice emitido no puede modificarse
- Payment no existe sin Invoice

**Referencias a otros agregados:**
- → Project
- → Client
- ← RapportinoClient (vía InvoiceItem)

---

## Expense

**Aggregate Root:** Expense

**Entidades internas:** (ninguna)

**Quién controla invariantes:** Expense

**Referencias a otros agregados:**
- → OperatingCompany
- → Project (opcional)

---

## Client

**Aggregate Root:** Client

**Entidades internas:**
- Contact

**Quién controla invariantes:** Client

**Reglas de integridad:**
- No se puede crear un Contact sin Client
- Un Client puede tener múltiples Contacts

---

## Driver

**Aggregate Root:** Driver

**Entidades internas:**
- DriverRate
- DriverAdvance

**Quién controla invariantes:** Driver

**Reglas de integridad:**
- Los DriverRate pertenecen al Driver
- Los DriverAdvance pertenecen al Driver pero pueden referenciar Projects

---

## Vehicle

**Aggregate Root:** Vehicle

**Entidades internas:** (ninguna)

**Referencias:**
- → Driver (DriverDefault, nullable)

---

## Project

**Aggregate Root:** Project

**Entidades internas:** (ninguna, pero es el centro de muchas relaciones)

**Referencias:**
- → Client
- → OperatingCompany
- ← Service
- ← RapportinoClient
- ← RapportinoDriver
- ← Invoice
- ← Expense

---

## OperatingCompany

**Aggregate Root:** OperatingCompany

**Entidades internas:** (ninguna)

**Nota:** Es una entidad de referencia. No tiene workflow propio.

---

## Settings

**Aggregate Root:** Settings

**Entidades internas:** (ninguna)

**Nota:** Es una entidad de configuración. No tiene workflow propio.
