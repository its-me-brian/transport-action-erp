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

const ExpenseCommands = {
  /**
   * Crear gasto
   * Status = Draft (editable)
   */
  create(expenseData) {
    return _withLock(() => {
      if (!expenseData.description) throw new ValidationError('Description is required');
      if (!expenseData.amount || expenseData.amount <= 0) throw new ValidationError('Amount must be > 0');
      if (!expenseData.ownerType) throw new ValidationError('OwnerType is required');
      if (!expenseData.ownerId) throw new ValidationError('OwnerID is required');

      // E004: AccountingDate ≥ ExpenseDate
      var expenseDate = expenseData.expenseDate || expenseData.ExpenseDate;
      var accountingDate = expenseData.accountingDate || expenseData.AccountingDate || expenseDate;
      if (expenseDate && accountingDate && new Date(accountingDate) < new Date(expenseDate)) {
        throw new BusinessRuleError('AccountingDate must be ≥ ExpenseDate', 'E004');
      }

      // Default OperatingCompany
      if (!expenseData.operatingCompany) {
        expenseData.operatingCompany = SettingsRepository.get('ActiveCompany') || 'TA';
      }

      const expense = ExpenseRepository.create(expenseData);

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

      // E004: AccountingDate ≥ ExpenseDate (check against effective values)
      var effectiveExpenseDate = changes.expenseDate || changes.ExpenseDate || expense.ExpenseDate;
      var effectiveAccountingDate = changes.accountingDate || changes.AccountingDate || expense.AccountingDate || effectiveExpenseDate;
      if (effectiveExpenseDate && effectiveAccountingDate && new Date(effectiveAccountingDate) < new Date(effectiveExpenseDate)) {
        throw new BusinessRuleError('AccountingDate must be ≥ ExpenseDate', 'E004');
      }

      ExpenseRepository.update(expenseId, changes);

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
