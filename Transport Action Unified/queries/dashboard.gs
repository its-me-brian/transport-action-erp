// ============================================================================
// DASHBOARD.GS — Queries de Dashboard (resumen ejecutivo)
// ============================================================================

const DashboardQueries = {
  /**
   * Dashboard principal — resumen ejecutivo
   */
  getMainDashboard(company, startDate, endDate) {
    // Servicios
    let services = ServiceRepository.getAll();
    if (company) services = services.filter(s => s.OperatingCompany === company);
    if (startDate) services = services.filter(s => new Date(s.Date) >= new Date(startDate));
    if (endDate) services = services.filter(s => new Date(s.Date) <= new Date(endDate));

    const totalServices = services.length;
    const validatedServices = services.filter(s => s.OperationalStatus === 'Validado').length;
    const pendingValidation = services.filter(s => s.OperationalStatus === 'Reportado').length;

    // Revenue y Cost
    let totalRevenue = 0;
    let totalCost = 0;
    services.forEach(s => {
      totalRevenue += ServiceQueries.calculateRevenue(s.ID);
      totalCost += ServiceQueries.calculateCost(s.ID);
    });

    // Facturación
    const invoices = InvoiceRepository.getAll();
    const pendingInvoices = invoices.filter(i => i.Status === 'Borrador').length;
    const sentInvoices = invoices.filter(i => ['Emitida', 'Enviada'].includes(i.Status)).length;
    const totalInvoiced = invoices
      .filter(i => !['Borrador', 'Anulada'].includes(i.Status))
      .reduce((sum, i) => sum + (parseFloat(i.Total) || 0), 0);

    // Pagos
    const payments = PaymentRepository.getAll();
    const totalPaid = payments
      .filter(p => ['Confirmado', 'Conciliado'].includes(p.Status))
      .reduce((sum, p) => sum + (parseFloat(p.Amount) || 0), 0);

    // Gastos
    const expenses = ExpenseRepository.getConfirmed();
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.Amount) || 0), 0);

    // Conductores
    const drivers = DriverRepository.getAll();
    const availableDrivers = drivers.filter(d => d.Status === 'Disponible').length;
    const assignedDrivers = drivers.filter(d => d.Status === 'Asignado').length;

    // Vehículos
    const vehicles = VehicleRepository.getAll();
    const availableVehicles = vehicles.filter(v => v.Status === 'Disponible').length;

    return {
      services: {
        total: totalServices,
        validated: validatedServices,
        pendingValidation
      },
      financials: {
        totalRevenue,
        totalCost,
        profit: totalRevenue - totalCost,
        margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0
      },
      invoicing: {
        pending: pendingInvoices,
        sent: sentInvoices,
        totalInvoiced,
        totalPaid,
        pendingAmount: totalInvoiced - totalPaid
      },
      expenses: {
        total: totalExpenses
      },
      resources: {
        drivers: { total: drivers.length, available: availableDrivers, assigned: assignedDrivers },
        vehicles: { total: vehicles.length, available: availableVehicles }
      }
    };
  },

  /**
   * Dashboard por proyecto
   */
  getProjectDashboard(projectId) {
    const project = ProjectRepository.getById(projectId);
    if (!project) throw new NotFoundError('Project', projectId);

    const services = ServiceRepository.getAllByProject(projectId);
    const profit = ProfitQueries.byProject(projectId);
    const rapportinos = RapportinoClientRepository.getAllByProject(projectId);

    return {
      project: ProjectRepository.toDTO(project),
      services: {
        total: services.length,
        byStatus: {
          importado: services.filter(s => s.OperationalStatus === 'Importado').length,
          asignado: services.filter(s => s.OperationalStatus === 'Asignado').length,
          confirmado: services.filter(s => s.OperationalStatus === 'Confirmado').length,
          enRuta: services.filter(s => s.OperationalStatus === 'EnRuta').length,
          realizado: services.filter(s => s.OperationalStatus === 'Realizado').length,
          reportado: services.filter(s => s.OperationalStatus === 'Reportado').length,
          validado: services.filter(s => s.OperationalStatus === 'Validado').length
        }
      },
      financials: profit,
      rapportinos: {
        total: rapportinos.length,
        byStatus: {
          borrador: rapportinos.filter(r => r.Status === 'Borrador').length,
          revisado: rapportinos.filter(r => r.Status === 'Revisado').length,
          enviado: rapportinos.filter(r => r.Status === 'Enviado').length,
          aceptado: rapportinos.filter(r => r.Status === 'Aceptado').length,
          facturado: rapportinos.filter(r => r.Status === 'Facturado').length
        }
      }
    };
  },

  /**
   * Dashboard de conductor
   */
  getDriverDashboard(driverId, startDate, endDate) {
    const driver = DriverRepository.getById(driverId);
    if (!driver) throw new NotFoundError('Driver', driverId);

    let services = ServiceRepository.getAllByDriver(driverId);
    if (startDate) services = services.filter(s => new Date(s.Date) >= new Date(startDate));
    if (endDate) services = services.filter(s => new Date(s.Date) <= new Date(endDate));

    const profit = ProfitQueries.byDriver(driverId, startDate, endDate);
    const advances = DriverAdvanceRepository.getByDriver(driverId);
    const unpaidAdvances = advances.filter(a => a.Status === 'Pendiente');

    return {
      driver: DriverRepository.toDTO(driver),
      services: {
        total: services.length,
        byStatus: {
          asignado: services.filter(s => s.OperationalStatus === 'Asignado').length,
          confirmado: services.filter(s => s.OperationalStatus === 'Confirmado').length,
          enRuta: services.filter(s => s.OperationalStatus === 'EnRuta').length,
          realizado: services.filter(s => s.OperationalStatus === 'Realizado').length
        }
      },
      financials: profit,
      advances: {
        total: advances.length,
        unpaid: unpaidAdvances.length,
        totalUnpaid: unpaidAdvances.reduce((sum, a) => sum + (parseFloat(a.RemainingAmount) || 0), 0)
      }
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetMainDashboard(company, startDate, endDate) {
  return DashboardQueries.getMainDashboard(company, startDate, endDate);
}

function apiGetProjectDashboard(projectId) {
  return DashboardQueries.getProjectDashboard(projectId);
}

function apiGetDriverDashboard(driverId, startDate, endDate) {
  return DashboardQueries.getDriverDashboard(driverId, startDate, endDate);
}
