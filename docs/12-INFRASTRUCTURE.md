# INFRASTRUCTURE.md — Detalles de implementación

Este documento documenta CÓMO se implementan las decisiones de dominio.
No confundir con BUSINESS_RULES.md (QUÉ debe ocurrir).

---

## Locked (congelamiento)

### ServiceRevenueBreakdown
- Campo: `Locked` (boolean)
- Se pone `true` cuando Service.OperationalStatus → "Validado"
- Una vez `true`, nunca vuelve a `false`
- Las líneas con Locked=true no se pueden editar ni eliminar

### ServiceCostBreakdown
- Misma lógica que RevenueBreakdown

### RapportinoItem
- Campo: `LockedAmount` (number, nullable)
- Se llena cuando RapportinoClient.Status → "Facturado"
- LockedAmount = Amount
- Una vez lleno, nunca cambia

### Invoice
- Montos congelados cuando Status → "Emitida"
- Subtotal, TaxRate, TaxAmount, Total no cambian después de emitir

### Payment
- Campo: Status
- Confirmado = inmutable
- Conciliado = inmutable

### Expense
- Campo: Status
- Draft = editable
- Confirmed = inmutable
- Cancelled = anulado

---

## _dispatchEvent

### Estructura

```javascript
function _dispatchEvent(event) {
  // 1. Audit log (siempre)
  _logAudit(event);

  // 2. Activity feed (siempre)
  _logActivity(event);

  // 3. Listeners específicos por tipo
  EVENT_LISTENERS[event.type]?.forEach(listener => listener(event));
}
```

### Listeners

**PERMITIDO:**
- _logActivity() → ActivityFeed
- _logAudit() → AuditLog

**PROHIBIDO:**
- Modificar entidades contables
- Cambiar estados
- Modificar montos

---

## _generateId

### Formato

```
{Prefix}-{OperatingCompany}-{Year}-{Sequential}
```

Ejemplo: `INV-TA-2026-00045`

### Implementación

```javascript
function _generateId(prefix, operatingCompany) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const seqSheet = ss.getSheetByName('Sequence');
    const year = new Date().getFullYear();

    // Buscar secuencia existente
    const data = seqSheet.getDataRange().getValues();
    let rowNum = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === prefix && data[i][1] === operatingCompany && data[i][2] === year) {
        rowNum = i + 1;
        break;
      }
    }

    let nextNum;
    if (rowNum > 0) {
      nextNum = data[rowNum - 1][3] + 1;
      seqSheet.getRange(rowNum, 4).setValue(nextNum);
    } else {
      nextNum = 1;
      seqSheet.appendRow([prefix, operatingCompany, year, nextNum]);
    }

    const numStr = String(nextNum).padStart(5, '0');
    return `${prefix}-${operatingCompany}-${year}-${numStr}`;

  } finally {
    lock.releaseLock();
  }
}
```

---

## CashFlow (vista)

CashFlow no es una tabla. Es una función que calcula bajo demanda.

```javascript
function apiGetCashFlow(filters) {
  const payments = getPayments(filters);
  const expenses = getExpenses(filters);

  const movements = [];

  payments.forEach(p => {
    movements.push({
      type: 'income',
      category: 'invoice_payment',
      description: 'Pago cliente',
      amount: p.Amount,
      date: p.PaymentDate,
      referenceId: p.ID,
      referenceType: 'Payment'
    });
  });

  expenses.forEach(e => {
    if (e.Status === 'Confirmed') {
      movements.push({
        type: 'expense',
        category: `${e.OwnerType}_${e.Category}`,
        description: e.Description,
        amount: e.Amount,
        date: e.AccountingDate,
        referenceId: e.ID,
        referenceType: 'Expense'
      });
    }
  });

  movements.sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalIncome = movements.filter(m => m.type === 'income').reduce((s, m) => s + m.Amount, 0);
  const totalExpense = movements.filter(m => m.type === 'expense').reduce((s, m) => s + m.Amount, 0);

  return {
    movements,
    summary: { totalIncome, totalExpense, balance: totalIncome - totalExpense }
  };
}
```

---

## Funciones de cálculo (bajo demanda)

```javascript
function calculateServiceRevenue(serviceId) {
  const breakdown = RevenueBreakdownRepository.getAllByService(serviceId);
  const total = breakdown.reduce((sum, item) => sum + item.Total, 0);
  return { breakdown, total };
}

function calculateServiceCost(serviceId) {
  const breakdown = CostBreakdownRepository.getAllByService(serviceId);
  const total = breakdown.reduce((sum, item) => sum + item.Amount, 0);
  return { breakdown, total };
}

function calculateServiceProfit(serviceId) {
  const revenue = calculateServiceRevenue(serviceId);
  const cost = calculateServiceCost(serviceId);
  return {
    revenue: revenue.total,
    cost: cost.total,
    profit: revenue.total - cost.total
  };
}

function calculateProjectProfit(projectId) {
  const services = ServiceRepository.getAllByProject(projectId);
  let totalRevenue = 0;
  let totalCost = 0;

  services.forEach(s => {
    totalRevenue += calculateServiceRevenue(s.ID).total;
    totalCost += calculateServiceCost(s.ID).total;
  });

  const operationalProfit = totalRevenue - totalCost;
  const projectExpenses = ExpenseRepository.getAllByOwner('proyecto', projectId);
  const totalProjectExpenses = projectExpenses.reduce((sum, e) => sum + e.Amount, 0);

  return {
    totalRevenue,
    totalCost,
    operationalProfit,
    projectExpenses: totalProjectExpenses,
    projectProfit: operationalProfit - totalProjectExpenses
  };
}

function calculateCompanyProfit(operatingCompany) {
  const projects = ProjectRepository.getAllByCompany(operatingCompany);
  let totalRevenue = 0;
  let totalCost = 0;

  projects.forEach(p => {
    const profit = calculateProjectProfit(p.ID);
    totalRevenue += profit.totalRevenue;
    totalCost += profit.totalCost;
  });

  const operationalProfit = totalRevenue - totalCost;
  const companyExpenses = ExpenseRepository.getAllByOwner('empresa', operatingCompany);
  const totalCompanyExpenses = companyExpenses.reduce((sum, e) => sum + e.Amount, 0);

  return {
    totalRevenue,
    totalCost,
    operationalProfit,
    companyExpenses: totalCompanyExpenses,
    companyProfit: operationalProfit - totalCompanyExpenses
  };
}
```
