// ============================================================================
// EXPENSECOMMANDS.GS — Comandos de Expense
// ============================================================================

/**
 * Helper: verificar si una fecha está en período contable cerrado.
 * Settings['AccountingPeriodClose'] = date string. If expense AccountingDate ≤ close date, period is closed.
 */
function _isAccountingPeriodClosed(accountingDate) {
  if (!accountingDate) return false;
  var closeDate = SettingsRepository.get('AccountingPeriodClose');
  if (!closeDate) return false; // No close date = period always open
  return new Date(accountingDate) <= new Date(closeDate);
}

/**
 * Campos editables de Expense: nombre que manda la UI (camelCase) → columna.
 *
 * Sin este mapeo `_update` recibe claves que no existen como columna, las
 * ignora y devuelve true: el gasto "se editaba" sin cambiar nada (Amount
 * quedaba en 0 y la UI mostraba el valor viejo sin error).
 */
const _EXPENSE_FIELDS = {
  ownerType: 'OwnerType',
  ownerId: 'OwnerID',
  category: 'Category',
  description: 'Description',
  amount: 'Amount',
  expenseDate: 'ExpenseDate',
  accountingDate: 'AccountingDate',
  projectId: 'ProjectID',
  operatingCompany: 'OperatingCompany',
  notes: 'Notes'
};

/** Normaliza un payload de gasto a nombres de columna. Acepta ambos formatos. */
function _normalizeExpenseFields(data) {
  const out = {};
  if (!data) return out;
  Object.keys(_EXPENSE_FIELDS).forEach((camel) => {
    const column = _EXPENSE_FIELDS[camel];
    if (data[column] !== undefined && data[column] !== null && data[column] !== '') {
      out[column] = data[column];
    } else if (data[camel] !== undefined) {
      out[column] = data[camel];
    }
  });
  return out;
}

const ExpenseCommands = {
  /**
   * Crear gasto
   * Status = Draft (editable)
   */
  create(expenseData) {
    return _withLock(() => {
      const data = _normalizeExpenseFields(expenseData);
      if (!data.Description) throw new ValidationError('Description is required');
      if (!data.Amount || Number(data.Amount) <= 0) throw new ValidationError('Amount must be > 0');
      if (!data.OwnerType) throw new ValidationError('OwnerType is required');
      if (!data.OwnerID) throw new ValidationError('OwnerID is required');

      // E004: AccountingDate ≥ ExpenseDate
      var expenseDate = data.ExpenseDate;
      var accountingDate = data.AccountingDate || expenseDate;
      if (expenseDate && accountingDate && new Date(accountingDate) < new Date(expenseDate)) {
        throw new BusinessRuleError('AccountingDate must be ≥ ExpenseDate', 'E004');
      }
      data.AccountingDate = accountingDate;

      // Default OperatingCompany
      if (!data.OperatingCompany) {
        data.OperatingCompany = SettingsRepository.get('ActiveCompany') || 'TA';
      }

      const expense = ExpenseRepository.create(data);

      _dispatchEvent({
        type: 'expense.created',
        entity: 'Expense',
        entityId: expense.ID
      });

      return ExpenseRepository.toDTO(expense);
    });
  },

  /**
   * Editar gasto
   * Solo si Status = Draft
   */
  edit(expenseId, changes) {
    return _withLock(() => {
      const expense = ExpenseRepository.getById(expenseId);
      if (!expense) throw new NotFoundError('Expense', expenseId);
      if (expense.Status !== 'Draft') {
        throw new BusinessRuleError('Can only edit draft expenses', 'E001');
      }

      const fields = _normalizeExpenseFields(changes);
      if (fields.Amount !== undefined && Number(fields.Amount) <= 0) {
        throw new ValidationError('Amount must be > 0');
      }
      if (fields.Description !== undefined && !fields.Description) {
        throw new ValidationError('Description is required');
      }

      // E004: AccountingDate ≥ ExpenseDate (check against effective values)
      var effectiveExpenseDate = fields.ExpenseDate || expense.ExpenseDate;
      var effectiveAccountingDate = fields.AccountingDate || expense.AccountingDate || effectiveExpenseDate;
      if (effectiveExpenseDate && effectiveAccountingDate && new Date(effectiveAccountingDate) < new Date(effectiveExpenseDate)) {
        throw new BusinessRuleError('AccountingDate must be ≥ ExpenseDate', 'E004');
      }
      if (!effectiveAccountingDate) fields.AccountingDate = effectiveExpenseDate;

      ExpenseRepository.update(expenseId, fields);

      _dispatchEvent({
        type: 'expense.edited',
        entity: 'Expense',
        entityId: expenseId
      });

      return ExpenseRepository.toDTO(ExpenseRepository.getById(expenseId));
    });
  },

  /**
   * Confirmar gasto
   * Draft → Confirmed (inmutable)
   */
  confirm(expenseId) {
    return _withLock(() => {
      const expense = ExpenseRepository.getById(expenseId);
      if (!expense) throw new NotFoundError('Expense', expenseId);
      _assertValidTransition('Expense', expense.Status, 'Confirmed');

      ExpenseRepository.update(expenseId, { Status: 'Confirmed' });

      _dispatchEvent({
        type: 'expense.confirmed',
        entity: 'Expense',
        entityId: expenseId,
        payload: { amount: expense.Amount, category: expense.Category }
      });

      return ExpenseRepository.toDTO(ExpenseRepository.getById(expenseId));
    });
  },

  /**
   * Cancelar gasto
   * Draft → Cancelled
   * Confirmed → Cancelled (si no está en periodo cerrado)
   */
  cancel(expenseId) {
    return _withLock(() => {
      const expense = ExpenseRepository.getById(expenseId);
      if (!expense) throw new NotFoundError('Expense', expenseId);
      _assertValidTransition('Expense', expense.Status, 'Cancelled');

      // If Confirmed, check accounting period is not closed
      if (expense.Status === 'Confirmed') {
        if (_isAccountingPeriodClosed(expense.AccountingDate)) {
          throw new BusinessRuleError(
            'Cannot cancel confirmed expense in closed accounting period. Use correct instead.',
            'E007'
          );
        }
      }

      ExpenseRepository.update(expenseId, { Status: 'Cancelled' });

      _dispatchEvent({
        type: 'expense.cancelled',
        entity: 'Expense',
        entityId: expenseId
      });

      return ExpenseRepository.toDTO(ExpenseRepository.getById(expenseId));
    });
  },

  /**
   * Corregir gasto (docs/10-COMMANDS.md — E006).
   * Precondición: Status=Confirmed.
   * Efecto: Cancelar el gasto actual + crear nuevo con mismos datos (Draft).
   */
  correct(expenseId) {
    return _withLock(() => {
      const expense = ExpenseRepository.getById(expenseId);
      if (!expense) throw new NotFoundError('Expense', expenseId);
      if (expense.Status !== 'Confirmed') {
        throw new BusinessRuleError(
          'Expense must be Confirmed to correct. Current: ' + expense.Status,
          'E006'
        );
      }

      // Check accounting period is not closed
      if (_isAccountingPeriodClosed(expense.AccountingDate)) {
        throw new BusinessRuleError(
          'Cannot correct expense in closed accounting period.',
          'E007'
        );
      }

      // 1. Cancel the current expense via state machine validation
      _assertValidTransition('Expense', expense.Status, 'Cancelled');
      ExpenseRepository.update(expenseId, { Status: 'Cancelled' });

      // 2. Create a new expense with the same data
      var newData = {
        OwnerType: expense.OwnerType,
        OwnerID: expense.OwnerID,
        Category: expense.Category,
        Description: expense.Description,
        Amount: expense.Amount,
        AccountingDate: expense.AccountingDate,
        ExpenseDate: expense.ExpenseDate,
        ProjectID: expense.ProjectID || '',
        OperatingCompany: expense.OperatingCompany,
        Notes: (expense.Notes || '') + ' [Corrected from ' + expenseId + ']'
      };

      var newExpense = ExpenseRepository.create(newData);

      _dispatchEvent({
        type: 'expense.corrected',
        entity: 'Expense',
        entityId: expenseId,
        payload: { newExpenseId: newExpense.ID, originalAmount: expense.Amount }
      });

      return ExpenseRepository.toDTO(newExpense);
    });
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiCreateExpense(data) {
  return ExpenseCommands.create(data);
}

function apiEditExpense(id, changes) {
  return ExpenseCommands.edit(id, changes);
}

function apiConfirmExpense(id) {
  return ExpenseCommands.confirm(id);
}

function apiCancelExpense(id) {
  return ExpenseCommands.cancel(id);
}

function apiCorrectExpense(id) {
  return ExpenseCommands.correct(id);
}
