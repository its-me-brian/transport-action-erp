// ============================================================================
// CASHFLOW.GS — Query de CashFlow (vista bajo demanda)
// ============================================================================
// Docs: docs/12-INFRASTRUCTURE.md (sección "CashFlow")
// CashFlow no es una tabla. Es una función que calcula bajo demanda
// combinando Payments (ingresos) y Expenses (egresos confirmados).

const CashFlowQueries = {
  /**
   * Calcular cash flow para un período.
   * Docs: docs/12-INFRASTRUCTURE.md — apiGetCashFlow(filters)
   *
   * @param {Object} [filters] - { startDate, endDate, projectId, operatingCompany }
   * @returns {Object} { movements, summary: { totalIncome, totalExpense, balance } }
   */
  calculate(filters) {
    // Get payments (income) using repository
    let payments = PaymentRepository.getAll();
    if (filters) {
      if (filters.startDate) payments = payments.filter(p => p.PaymentDate >= filters.startDate);
      if (filters.endDate) payments = payments.filter(p => p.PaymentDate <= filters.endDate);
      if (filters.projectId) payments = payments.filter(p => p.ProjectID === filters.projectId);
    }

    // Get expenses (only confirmed ones) using repository
    let expenses = ExpenseRepository.getConfirmed();
    if (filters) {
      if (filters.startDate) expenses = expenses.filter(e => (e.AccountingDate || e.ExpenseDate) >= filters.startDate);
      if (filters.endDate) expenses = expenses.filter(e => (e.AccountingDate || e.ExpenseDate) <= filters.endDate);
      if (filters.projectId) expenses = expenses.filter(e => e.ProjectID === filters.projectId);
    }

    var movements = [];

    // Map payments to income movements
    payments.forEach(function(p) {
      movements.push({
        type: 'income',
        category: 'invoice_payment',
        description: 'Pago cliente',
        amount: parseFloat(p.Amount) || 0,
        date: p.PaymentDate || '',
        referenceId: p.ID || '',
        referenceType: 'Payment',
        invoiceId: p.InvoiceID || ''
      });
    });

    // Map expenses to expense movements
    expenses.forEach(function(e) {
      movements.push({
        type: 'expense',
        category: (e.OwnerType || '') + '_' + (e.Category || ''),
        description: e.Description || '',
        amount: parseFloat(e.Amount) || 0,
        date: e.AccountingDate || e.Date || '',
        referenceId: e.ID || '',
        referenceType: 'Expense'
      });
    });

    // Sort by date
    movements.sort(function(a, b) {
      return new Date(a.date) - new Date(b.date);
    });

    // Calculate summary
    var totalIncome = movements
      .filter(function(m) { return m.type === 'income'; })
      .reduce(function(s, m) { return s + m.amount; }, 0);

    var totalExpense = movements
      .filter(function(m) { return m.type === 'expense'; })
      .reduce(function(s, m) { return s + m.amount; }, 0);

    return {
      movements: movements,
      summary: {
        totalIncome: totalIncome,
        totalExpense: totalExpense,
        balance: totalIncome - totalExpense
      }
    };
  }
};

// ============================================================================
// API WRAPPER
// ============================================================================

function apiGetCashFlow(filters) {
  return CashFlowQueries.calculate(filters);
}


