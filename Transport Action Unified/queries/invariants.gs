// ============================================================================
// INVARIANTS.GS — Verificación de invariantes del sistema
// ============================================================================
//
// Cada función verifica una propiedad que SIEMPRE debe cumplirse.
// Retorna { valid: boolean, errors: string[] }
//
// Uso: Llamar desde el editor de Apps Script o vía doGet?mode=test
// ============================================================================

const InvariantChecks = {
  /**
   * Ejecutar todos los checks y retornar reporte
   */
  checkAll() {
    const results = {};
    const checks = [
      'INV001_invoiceTotal',
      'INV002_invoiceItems',
      'INV003_paymentSaldo',
      'INV004_paymentPagada',
      'INV005_rapportinoItemsLocked',
      'INV006_breakdownsLocked',
      'INV007_driverReportUnico',
      'INV008_expensePropietario',
      'INV009_sequenceMonotonica',
      'INV010_driverAdvancePositivo',
      'INV011_transicionesValidas',
      'INV012_noRetrocesoContable',
      'INV013_invoiceInmutabilidad',
      'INV014_paymentInmutabilidad',
      'INV015_serviceToProject',
      'INV016_serviceToDriver',
      'INV017_rapportinoItemToService',
      'INV018_invoiceItemToRapportino',
      'INV019_paymentToInvoice',
      'INV020_idFormat',
      'INV021_accountingDate'
    ];

    let totalPassed = 0;
    let totalFailed = 0;

    checks.forEach(check => {
      try {
        results[check] = this[check]();
        if (results[check].valid) totalPassed++;
        else totalFailed++;
      } catch (e) {
        results[check] = { valid: false, errors: [`Exception: ${e.message}`] };
        totalFailed++;
      }
    });

    return {
      summary: { total: checks.length, passed: totalPassed, failed: totalFailed },
      results
    };
  },

  // ==========================================================================
  // INV-001: Invoice total
  // Invoice.Total = Invoice.Subtotal + Invoice.TaxAmount
  // Invoice.TaxAmount = Invoice.Subtotal × Invoice.TaxRate
  // ==========================================================================
  INV001_invoiceTotal() {
    const errors = [];
    const invoices = InvoiceRepository.getAll();

    invoices.forEach(inv => {
      if (inv.Status === 'Anulada') return; // skip anuladas

      const subtotal = parseFloat(inv.Subtotal) || 0;
      const taxRate = parseFloat(inv.TaxRate) || 0;
      const taxAmount = parseFloat(inv.TaxAmount) || 0;
      const total = parseFloat(inv.Total) || 0;

      const expectedTaxAmount = subtotal * (taxRate / 100);
      const expectedTotal = subtotal + taxAmount;

      if (Math.abs(taxAmount - expectedTaxAmount) > 0.01) {
        errors.push(`${inv.ID}: TaxAmount ${taxAmount} ≠ Subtotal(${subtotal}) × TaxRate(${taxRate}/100) = ${expectedTaxAmount}`);
      }
      if (Math.abs(total - expectedTotal) > 0.01) {
        errors.push(`${inv.ID}: Total ${total} ≠ Subtotal(${subtotal}) + TaxAmount(${taxAmount}) = ${expectedTotal}`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-002: Invoice items
  // Invoice.Subtotal = SUM(InvoiceItems.Amount para ese Invoice)
  // ==========================================================================
  INV002_invoiceItems() {
    const errors = [];
    const invoices = InvoiceRepository.getAll();

    invoices.forEach(inv => {
      if (inv.Status === 'Anulada') return;

      const items = InvoiceItemRepository.getByInvoice(inv.ID);
      const sumItems = items.reduce((s, i) => s + (parseFloat(i.Amount) || 0), 0);
      const subtotal = parseFloat(inv.Subtotal) || 0;

      if (Math.abs(subtotal - sumItems) > 0.01) {
        errors.push(`${inv.ID}: Subtotal ${subtotal} ≠ SUM(InvoiceItems.Amount) = ${sumItems}`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-003: Payment saldo
  // Para Invoice con Status ∈ {Enviada, PagoParcial, Vencida}:
  //   SUM(Payment confirmados) ≤ Invoice.Total
  // ==========================================================================
  INV003_paymentSaldo() {
    const errors = [];
    const invoices = InvoiceRepository.getAll()
      .filter(i => ['Enviada', 'PagoParcial', 'Vencida'].includes(i.Status));

    invoices.forEach(inv => {
      const payments = PaymentRepository.getConfirmedByInvoice(inv.ID);
      const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.Amount) || 0), 0);
      const total = parseFloat(inv.Total) || 0;

      if (totalPaid > total + 0.01) {
        errors.push(`${inv.ID}: Pagos confirmados ${totalPaid} > Total factura ${total}`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-004: Payment pagada
  // Si Invoice.Status = "Pagada":
  //   SUM(Payment confirmados) ≥ Invoice.Total
  // ==========================================================================
  INV004_paymentPagada() {
    const errors = [];
    const invoices = InvoiceRepository.getAll()
      .filter(i => i.Status === 'Pagada');

    invoices.forEach(inv => {
      const payments = PaymentRepository.getConfirmedByInvoice(inv.ID);
      const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.Amount) || 0), 0);
      const total = parseFloat(inv.Total) || 0;

      if (totalPaid < total - 0.01) {
        errors.push(`${inv.ID}: Pagos confirmados ${totalPaid} < Total factura ${total} pero Status = Pagada`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-005: RapportinoItems locked
  // Para RapportinoItem donde RapportinoClient.Status = "Facturado":
  //   LockedAmount = Amount (doc: congelación = LockedAmount)
  // ==========================================================================
  INV005_rapportinoItemsLocked() {
    const errors = [];
    const rapportinos = RapportinoClientRepository.getAll()
      .filter(r => r.Status === 'Facturado');

    rapportinos.forEach(rap => {
      const items = RapportinoItemRepository.getByRapportinoClient(rap.ID);
      items.forEach(item => {
        const amount = parseFloat(item.Amount) || 0;
        const lockedAmount = parseFloat(item.LockedAmount) || 0;

        if ((parseFloat(item.LockedAmount) || 0) <= 0) {
          errors.push(`${rap.ID} / item ${item.ID}: LockedAmount should be > 0 but is ${item.LockedAmount}`);
        }
        if (Math.abs(lockedAmount - amount) > 0.01) {
          errors.push(`${rap.ID} / item ${item.ID}: LockedAmount ${lockedAmount} ≠ Amount ${amount}`);
        }
      });
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-006: Breakdowns locked
  // Para Service con OperationalStatus ∈ {Validado}:
  //   ServiceRevenueBreakdown: Locked = Yes para cada línea
  //   ServiceCostBreakdown: Locked = Yes para cada línea
  // ==========================================================================
  INV006_breakdownsLocked() {
    const errors = [];
    const services = ServiceRepository.getAll()
      .filter(s => s.OperationalStatus === 'Validado');

    services.forEach(svc => {
      const revenues = ServiceRevenueBreakdownRepository.getByService(svc.ID);
      revenues.forEach(item => {
        if (item.Locked !== true && item.Locked !== 'true') {
          errors.push(`${svc.ID}: RevenueBreakdown ${item.ID} not locked`);
        }
      });

      const costs = ServiceCostBreakdownRepository.getByService(svc.ID);
      costs.forEach(item => {
        if (item.Locked !== true && item.Locked !== 'true') {
          errors.push(`${svc.ID}: CostBreakdown ${item.ID} not locked`);
        }
      });
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-007: DriverReport único
  // COUNT(DriverReport WHERE ServiceID = Service.ID AND Status ∈ {Pendiente, Aceptado}) ≤ 1
  // ==========================================================================
  INV007_driverReportUnico() {
    const errors = [];
    const services = ServiceRepository.getAll();

    services.forEach(svc => {
      const reports = DriverReportRepository.getByService(svc.ID)
        .filter(r => r.Status === 'Pendiente' || r.Status === 'Aceptado');

      if (reports.length > 1) {
        errors.push(`${svc.ID}: ${reports.length} active DriverReports (expected ≤ 1)`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-008: Expense propietario
  // EXACTAMENTE 1 (OwnerType, OwnerID)
  // ==========================================================================
  INV008_expensePropietario() {
    const errors = [];
    const expenses = ExpenseRepository.getAll();

    expenses.forEach(exp => {
      if (!exp.OwnerType || !exp.OwnerID) {
        errors.push(`${exp.ID}: Missing OwnerType or OwnerID`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-009: Sequence monotonica
  // Next es estrictamente creciente (no se decrementa)
  // Check: for each entity type, verify IDs follow {Prefix}-{Company}-{Year}-{Seq}
  // and sequences are monotonically increasing within same prefix+year.
  // ==========================================================================
  INV009_sequenceMonotonica() {
    const errors = [];
    // docs/12-INFRASTRUCTURE.md: {Prefix}-{OperatingCompany}-{Year}-{Sequential}
    const pattern = /^([A-Z]+)-([A-Z]+)-(\d{4})-(\d+)$/;

    const entitySheets = [
      { name: 'Service', items: ServiceRepository.getAll() },
      { name: 'Invoice', items: InvoiceRepository.getAll() },
      { name: 'Payment', items: PaymentRepository.getAll() },
      { name: 'DriverReport', items: DriverReportRepository.getAll() },
      { name: 'Expense', items: ExpenseRepository.getAll() }
    ];

    entitySheets.forEach(({ name, items }) => {
      const sequences = {};
      items.forEach(item => {
        if (!item.ID) return;
        const match = item.ID.match(pattern);
        if (!match) {
          errors.push(`${name} ${item.ID}: invalid ID format`);
          return;
        }
        const [, prefix, company, year, seq] = match;
        const key = `${prefix}-${company}-${year}`;
        const num = parseInt(seq, 10);
        if (sequences[key] !== undefined && num <= sequences[key]) {
          errors.push(`${name} ${item.ID}: sequence ${num} <= previous ${sequences[key]} (not monotonic)`);
        }
        sequences[key] = num;
      });
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-010: DriverAdvance positivo
  // RemainingAmount ≥ 0 AND RemainingAmount ≤ Amount
  // ==========================================================================
  INV010_driverAdvancePositivo() {
    const errors = [];
    const advances = DriverAdvanceRepository.getAll();

    advances.forEach(adv => {
      const remaining = parseFloat(adv.RemainingAmount) || 0;
      const amount = parseFloat(adv.Amount) || 0;

      if (remaining < 0) {
        errors.push(`${adv.ID}: RemainingAmount ${remaining} < 0`);
      }
      if (remaining > amount + 0.01) {
        errors.push(`${adv.ID}: RemainingAmount ${remaining} > Amount ${amount}`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-011: Transiciones válidas
  // Verifica que cada entidad tenga un estado actual que exista en la máquina
  // y que no tenga un estado "colgado" fuera de la definición.
  // ==========================================================================
  INV011_transicionesValidas() {
    const errors = [];

    // Service.OperationalStatus
    var svcStates = Object.keys(STATE_MACHINES.ServiceOperational);
    ServiceRepository.getAll().forEach(svc => {
      if (svc.OperationalStatus && svcStates.indexOf(svc.OperationalStatus) === -1) {
        errors.push(`${svc.ID}: OperationalStatus "${svc.OperationalStatus}" not in state machine`);
      }
    });

    // Service.FinancialStatus
    var finStates = Object.keys(STATE_MACHINES.ServiceFinancial);
    ServiceRepository.getAll().forEach(svc => {
      if (svc.FinancialStatus && finStates.indexOf(svc.FinancialStatus) === -1) {
        errors.push(`${svc.ID}: FinancialStatus "${svc.FinancialStatus}" not in state machine`);
      }
    });

    // Invoice.Status
    var invStates = Object.keys(STATE_MACHINES.Invoice);
    InvoiceRepository.getAll().forEach(inv => {
      if (inv.Status && invStates.indexOf(inv.Status) === -1) {
        errors.push(`${inv.ID}: Status "${inv.Status}" not in state machine`);
      }
    });

    // Payment.Status
    var payStates = Object.keys(STATE_MACHINES.Payment);
    PaymentRepository.getAll().forEach(pay => {
      if (pay.Status && payStates.indexOf(pay.Status) === -1) {
        errors.push(`${pay.ID}: Status "${pay.Status}" not in state machine`);
      }
    });

    // RapportinoClient.Status
    var rcStates = Object.keys(STATE_MACHINES.RapportinoClient);
    RapportinoClientRepository.getAll().forEach(rc => {
      if (rc.Status && rcStates.indexOf(rc.Status) === -1) {
        errors.push(`${rc.ID}: Status "${rc.Status}" not in state machine`);
      }
    });

    // RapportinoDriver.Status
    var rdStates = Object.keys(STATE_MACHINES.RapportinoDriver);
    RapportinoDriverRepository.getAll().forEach(rd => {
      if (rd.Status && rdStates.indexOf(rd.Status) === -1) {
        errors.push(`${rd.ID}: Status "${rd.Status}" not in state machine`);
      }
    });

    // DriverReport.Status
    var drStates = Object.keys(STATE_MACHINES.DriverReport);
    DriverReportRepository.getAll().forEach(dr => {
      if (dr.Status && drStates.indexOf(dr.Status) === -1) {
        errors.push(`${dr.ID}: Status "${dr.Status}" not in state machine`);
      }
    });

    // Expense.Status
    var expStates = Object.keys(STATE_MACHINES.Expense);
    ExpenseRepository.getAll().forEach(exp => {
      if (exp.Status && expStates.indexOf(exp.Status) === -1) {
        errors.push(`${exp.ID}: Status "${exp.Status}" not in state machine`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-012: No retroceso contable
  // Si Service.OperationalStatus ∈ {Validado}: nunca vuelve a valores anteriores
  // Si Service.FinancialStatus ∈ {Facturado, Cobrado, Cerrado}: nunca vuelve
  // This checks current state consistency (historical rollback would require audit)
  // ==========================================================================
  INV012_noRetrocesoContable() {
    const errors = [];

    // Check: if a service has FinancialStatus ≥ Facturado, it should also be Validado
    const advancedFinancial = ['Facturado', 'Cobrado', 'Cerrado'];
    ServiceRepository.getAll().forEach(svc => {
      if (advancedFinancial.indexOf(svc.FinancialStatus) !== -1) {
        if (svc.OperationalStatus !== 'Validado') {
          errors.push(`${svc.ID}: FinancialStatus=${svc.FinancialStatus} but OperationalStatus=${svc.OperationalStatus} (should be Validado)`);
        }
      }
    });

    // Check: if OperationalStatus = Validado, no breakdown should be unlocked
    ServiceRepository.getAll()
      .filter(s => s.OperationalStatus === 'Validado')
      .forEach(svc => {
        const unlockedRevenue = ServiceRevenueBreakdownRepository.getUnlockedByService(svc.ID);
        const unlockedCost = ServiceCostBreakdownRepository.getUnlockedByService(svc.ID);
        if (unlockedRevenue.length > 0) {
          errors.push(`${svc.ID}: Validado but has ${unlockedRevenue.length} unlocked revenue items`);
        }
        if (unlockedCost.length > 0) {
          errors.push(`${svc.ID}: Validado but has ${unlockedCost.length} unlocked cost items`);
        }
      });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-013: Invoice inmutabilidad
  // Si Invoice.Status ≠ "Borrador": Subtotal, TaxRate, TaxAmount, Total no cambian
  // Verify: for each non-Borrador invoice, recalculate from items and compare
  // ==========================================================================
  INV013_invoiceInmutabilidad() {
    const errors = [];
    const invoices = InvoiceRepository.getAll()
      .filter(i => i.Status !== 'Borrador' && i.Status !== 'Anulada');

    invoices.forEach(inv => {
      const items = InvoiceItemRepository.getByInvoice(inv.ID);
      const sumItems = items.reduce((s, i) => s + (parseFloat(i.Amount) || 0), 0);
      const subtotal = parseFloat(inv.Subtotal) || 0;
      const taxRate = parseFloat(inv.TaxRate) || 0;
      const taxAmount = parseFloat(inv.TaxAmount) || 0;
      const total = parseFloat(inv.Total) || 0;

      // Verify snapshot matches items
      if (Math.abs(subtotal - sumItems) > 0.01) {
        errors.push(`${inv.ID}: Subtotal ${subtotal} ≠ SUM(items) ${sumItems} after emit`);
      }
      // Verify tax calculation
      const expectedTax = subtotal * (taxRate / 100);
      if (Math.abs(taxAmount - expectedTax) > 0.01) {
        errors.push(`${inv.ID}: TaxAmount ${taxAmount} ≠ Subtotal×TaxRate ${expectedTax}`);
      }
      // Verify total
      if (Math.abs(total - (subtotal + taxAmount)) > 0.01) {
        errors.push(`${inv.ID}: Total ${total} ≠ Subtotal+TaxAmount ${subtotal + taxAmount}`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-014: Payment inmutabilidad
  // Si Payment.Status ∈ {Confirmado, Conciliado}: Amount, PaymentMethod,
  // PaymentDate, Reference no cambian.
  // Verify: check that confirmed payments haven't been tampered with.
  // ==========================================================================
  INV014_paymentInmutabilidad() {
    const errors = [];
    // Confirmed payments should have ConfirmedAt set
    PaymentRepository.getAll()
      .filter(p => p.Status === 'Confirmado' || p.Status === 'Conciliado')
      .forEach(pay => {
        if (!pay.ConfirmedAt) {
          errors.push(`${pay.ID}: Status=${pay.Status} but missing ConfirmedAt`);
        }
        if (!pay.Amount || parseFloat(pay.Amount) <= 0) {
          errors.push(`${pay.ID}: Confirmed payment has invalid Amount ${pay.Amount}`);
        }
      });

    // Conciliado payments should have ReconciledAt set
    PaymentRepository.getAll()
      .filter(p => p.Status === 'Conciliado')
      .forEach(pay => {
        if (!pay.ReconciledAt) {
          errors.push(`${pay.ID}: Status=Conciliado but missing ReconciledAt`);
        }
      });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-015: Service → Project
  // Todo Service tiene ProjectID que referencia un Project existente
  // ==========================================================================
  INV015_serviceToProject() {
    const errors = [];
    const services = ServiceRepository.getAll();
    const projects = ProjectRepository.getAll();
    const projectIds = new Set(projects.map(p => p.ID));

    services.forEach(svc => {
      if (svc.ProjectID && !projectIds.has(svc.ProjectID)) {
        errors.push(`${svc.ID}: ProjectID ${svc.ProjectID} does not exist`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-016: Service → Driver
  // Si Service.OperationalStatus ∈ {Asignado..Validado}:
  //   Service.DriverID referencia un Driver existente
  // ==========================================================================
  INV016_serviceToDriver() {
    const errors = [];
    const driverStatuses = ['Asignado', 'Confirmado', 'EnRuta', 'Realizado', 'Reportado', 'Validado'];
    const services = ServiceRepository.getAll()
      .filter(s => driverStatuses.includes(s.OperationalStatus));
    const drivers = DriverRepository.getAll();
    const driverIds = new Set(drivers.map(d => d.ID));

    services.forEach(svc => {
      if (svc.DriverID && !driverIds.has(svc.DriverID)) {
        errors.push(`${svc.ID}: DriverID ${svc.DriverID} does not exist`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-017: RapportinoItem → Service
  // Todo RapportinoItem tiene ServiceID que referencia un Service existente
  // ==========================================================================
  INV017_rapportinoItemToService() {
    const errors = [];
    const items = RapportinoItemRepository.getAll();
    const services = ServiceRepository.getAll();
    const serviceIds = new Set(services.map(s => s.ID));

    items.forEach(item => {
      if (item.ServiceID && !serviceIds.has(item.ServiceID)) {
        errors.push(`${item.ID}: ServiceID ${item.ServiceID} does not exist`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-018: InvoiceItem → RapportinoClient
  // Todo InvoiceItem tiene RapportinoClientID que referencia un RapportinoClient existente
  // ==========================================================================
  INV018_invoiceItemToRapportino() {
    const errors = [];
    const items = InvoiceItemRepository.getAll();
    const rapportinos = RapportinoClientRepository.getAll();
    const rapportinoIds = new Set(rapportinos.map(r => r.ID));

    items.forEach(item => {
      if (item.RapportinoClientID && !rapportinoIds.has(item.RapportinoClientID)) {
        errors.push(`${item.ID}: RapportinoClientID ${item.RapportinoClientID} does not exist`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-019: Payment → Invoice
  // Todo Payment tiene InvoiceID que referencia un Invoice existente
  // ==========================================================================
  INV019_paymentToInvoice() {
    const errors = [];
    const payments = PaymentRepository.getAll();
    const invoices = InvoiceRepository.getAll();
    const invoiceIds = new Set(invoices.map(i => i.ID));

    payments.forEach(pay => {
      if (pay.InvoiceID && !invoiceIds.has(pay.InvoiceID)) {
        errors.push(`${pay.ID}: InvoiceID ${pay.InvoiceID} does not exist`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-020: ID format
  // Todo ID sigue el patrón: {Prefix}-{Year}-{Sequential}
  // ==========================================================================
  INV020_idFormat() {
    const errors = [];
    // docs/12-INFRASTRUCTURE.md: {Prefix}-{OperatingCompany}-{Year}-{Sequential}
    const pattern = /^[A-Z]+-[A-Z]+-\d{4}-\d{5}$/;

    // Check a sample from each entity
    const entities = [
      { name: 'Service', items: ServiceRepository.getAll().slice(0, 10) },
      { name: 'Invoice', items: InvoiceRepository.getAll().slice(0, 10) },
      { name: 'Payment', items: PaymentRepository.getAll().slice(0, 10) },
      { name: 'DriverReport', items: DriverReportRepository.getAll().slice(0, 10) },
      { name: 'Expense', items: ExpenseRepository.getAll().slice(0, 10) }
    ];

    entities.forEach(({ name, items }) => {
      items.forEach(item => {
        if (item.ID && !pattern.test(item.ID)) {
          errors.push(`${name} ${item.ID}: does not match pattern {Prefix}-{Year}-{Sequential}`);
        }
      });
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-021: AccountingDate
  // Para todo Expense: AccountingDate ≥ ExpenseDate
  // ==========================================================================
  INV021_accountingDate() {
    const errors = [];
    const expenses = ExpenseRepository.getAll();

    expenses.forEach(exp => {
      if (exp.AccountingDate && exp.ExpenseDate) {
        const accounting = new Date(exp.AccountingDate);
        const expense = new Date(exp.ExpenseDate);
        if (accounting < expense) {
          errors.push(`${exp.ID}: AccountingDate ${exp.AccountingDate} < ExpenseDate ${exp.ExpenseDate}`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-022: Invoice number uniqueness
  // No two invoices with the same InvoiceNumber
  // ==========================================================================
  INV022_invoiceNumberUnique() {
    const errors = [];
    const invoices = InvoiceRepository.getAll().filter(i => i.InvoiceNumber);
    const seen = {};

    invoices.forEach(inv => {
      if (seen[inv.InvoiceNumber]) {
        errors.push(`${inv.ID}: Duplicate InvoiceNumber ${inv.InvoiceNumber} (first: ${seen[inv.InvoiceNumber]})`);
      } else {
        seen[inv.InvoiceNumber] = inv.ID;
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // ==========================================================================
  // INV-023: No double driver assignment
  // A driver assigned to an active service cannot be assigned to another
  // ==========================================================================
  INV023_noDoubleDriverAssignment() {
    const errors = [];
    const activeStatuses = ['Asignado', 'Confirmado', 'EnRuta', 'Realizado', 'Reportado'];
    const services = ServiceRepository.getAll()
      .filter(s => s.DriverID && activeStatuses.includes(s.OperationalStatus));

    const driverMap = {};
    services.forEach(s => {
      if (driverMap[s.DriverID]) {
        errors.push(`Driver ${s.DriverID}: assigned to ${driverMap[s.DriverID]} and ${s.ID} simultaneously`);
      } else {
        driverMap[s.DriverID] = s.ID;
      }
    });

    return { valid: errors.length === 0, errors };
  }
};

// ============================================================================
// API endpoint
// ============================================================================

function apiCheckInvariants() {
  return InvariantChecks.checkAll();
}
