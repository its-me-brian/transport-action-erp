// ============================================================================
// EXPENSE.GS — Entidad Expense (gasto operativo)
// ============================================================================

const ExpenseRepository = {
  SHEET: SHEETS.Expenses,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getAllByOwner(ownerType, ownerID) {
    return _find(this.SHEET, row =>
      row.OwnerType === ownerType && row.OwnerID === ownerID
    );
  },

  getAllByProject(projectId) {
    return _find(this.SHEET, row => row.ProjectID === projectId);
  },

  getAllByCompany(operatingCompany) {
    return _find(this.SHEET, row => row.OperatingCompany === operatingCompany);
  },

  getDrafts() {
    return _find(this.SHEET, row => row.Status === 'Draft');
  },

  getConfirmed() {
    return _find(this.SHEET, row => row.Status === 'Confirmed');
  },

  getByDateRange(startDate, endDate) {
    const expenses = _getAll(this.SHEET);
    return expenses.filter(e => {
      const d = new Date(e.ExpenseDate);
      return d >= new Date(startDate) && d <= new Date(endDate);
    });
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      OwnerType: data.OwnerType || 'Service',
      OwnerID: data.OwnerID || '',
      Category: data.Category || '',
      Description: data.Description || '',
      Amount: parseFloat(data.Amount) || 0,
      ExpenseDate: data.ExpenseDate || now,
      AccountingDate: data.AccountingDate || data.ExpenseDate || now,
      Status: 'Draft',
      ProjectID: data.ProjectID || '',
      OperatingCompany: data.OperatingCompany || '',
      Notes: data.Notes || '',
      CreatedBy: _getActiveUser(),
      CreatedAt: now,
      UpdatedAt: now
    });
  },

  update(id, changes) {
    changes.UpdatedAt = new Date().toISOString();
    return _update(this.SHEET, id, changes);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      ownerType: entity.OwnerType,
      ownerId: entity.OwnerID,
      category: entity.Category,
      description: entity.Description,
      amount: parseFloat(entity.Amount) || 0,
      expenseDate: entity.ExpenseDate,
      accountingDate: entity.AccountingDate,
      status: entity.Status,
      projectId: entity.ProjectID,
      operatingCompany: entity.OperatingCompany,
      notes: entity.Notes || '',
      createdBy: entity.CreatedBy,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetExpenses(filters) {
  let expenses = ExpenseRepository.getAll();
  if (filters) {
    if (filters.projectId) expenses = expenses.filter(e => e.ProjectID === filters.projectId);
    if (filters.status) expenses = expenses.filter(e => e.Status === filters.status);
    if (filters.company) expenses = expenses.filter(e => e.OperatingCompany === filters.company);
    if (filters.dateFrom) expenses = expenses.filter(e => new Date(e.ExpenseDate) >= new Date(filters.dateFrom));
    if (filters.dateTo) expenses = expenses.filter(e => new Date(e.ExpenseDate) <= new Date(filters.dateTo));
  }
  return expenses.map(ExpenseRepository.toDTO);
}

function apiGetExpense(id) {
  const entity = ExpenseRepository.getById(id);
  if (!entity) throw new NotFoundError('Expense', id);
  return ExpenseRepository.toDTO(entity);
}
