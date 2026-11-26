// ============================================================================
// SERVICEQUERIES.GS — Queries de Service (cálculos y consultas)
// ============================================================================

const ServiceQueries = {
  /**
   * Calcula revenue de un servicio (desde ServiceRevenueBreakdown)
   */
  calculateRevenue(serviceId) {
    const items = ServiceRevenueBreakdownRepository.getByService(serviceId);
    return items.reduce((sum, item) => sum + (parseFloat(item.Total) || 0), 0);
  },

  /**
   * Calcula cost de un servicio (desde ServiceCostBreakdown - legacy)
   * @deprecated Use ServiceEconomics.calculateEconomics() instead
   */
  calculateCost(serviceId) {
    const items = ServiceCostBreakdownRepository.getByService(serviceId);
    return items.reduce((sum, item) => sum + (parseFloat(item.Amount) || 0), 0);
  },

  /**
   * Calcula profit usando economics nuevo (Revenue - Cost desde breakdowns actuales)
   */
  calculateProfit(serviceId) {
    return this.calculateRevenue(serviceId) - this.calculateCost(serviceId);
  },

  /**
   * Totales de revenue por servicio en UNA sola lectura de la hoja.
   * Devuelve { [serviceId]: total }.
   *
   * `calculateRevenue()` lee la hoja completa en cada llamada: iterar N
   * servicios hacía N lecturas (2 round-trips de Apps Script cada una) y el
   * dashboard ejecutivo tardaba ~110 s con 120 servicios. Esto lo deja en una.
   */
  revenueTotalsByService() {
    return _sumByService(ServiceRevenueBreakdownRepository.getAll(), 'ServiceID', 'Total');
  },

  /** Totales de cost por servicio en UNA sola lectura. { [serviceId]: total } */
  costTotalsByService() {
    return _sumByService(ServiceCostBreakdownRepository.getAll(), 'ServiceID', 'Amount');
  },

  /**
   * Obtener servicios por rango de fechas con totales
   */
  getServicesByDateRange(startDate, endDate, filters) {
    let services = ServiceRepository.getByDateRange(startDate, endDate);

    if (filters) {
      if (filters.projectId) services = services.filter(s => s.ProjectID === filters.projectId);
      if (filters.driverId) services = services.filter(s => s.DriverID === filters.driverId);
      if (filters.status) services = services.filter(s => s.OperationalStatus === filters.status);
      if (filters.company) services = services.filter(s => s.OperatingCompany === filters.company);
    }

    return services.map(s => {
      const dto = ServiceRepository.toDTO(s);
      dto.revenue = this.calculateRevenue(s.ID);
      dto.cost = this.calculateCost(s.ID);
      dto.profit = dto.revenue - dto.cost;
      return dto;
    });
  },

  /**
   * Obtener resumen de servicios por conductor
   */
  getSummaryByDriver(driverId, startDate, endDate) {
    let services = ServiceRepository.getAllByDriver(driverId);
    if (startDate) services = services.filter(s => new Date(s.Date) >= new Date(startDate));
    if (endDate) services = services.filter(s => new Date(s.Date) <= new Date(endDate));

    const totalRevenue = services.reduce((sum, s) => sum + this.calculateRevenue(s.ID), 0);
    const totalCost = services.reduce((sum, s) => sum + this.calculateCost(s.ID), 0);

    return {
      driverId,
      serviceCount: services.length,
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      services: services.map(s => ServiceRepository.toDTO(s))
    };
  },

  /**
   * Obtener resumen de servicios por proyecto
   */
  getSummaryByProject(projectId) {
    const services = ServiceRepository.getAllByProject(projectId);

    const totalRevenue = services.reduce((sum, s) => sum + this.calculateRevenue(s.ID), 0);
    const totalCost = services.reduce((sum, s) => sum + this.calculateCost(s.ID), 0);

    return {
      projectId,
      serviceCount: services.length,
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      byStatus: {
        importado: services.filter(s => s.OperationalStatus === 'Importado').length,
        asignado: services.filter(s => s.OperationalStatus === 'Asignado').length,
        confirmado: services.filter(s => s.OperationalStatus === 'Confirmado').length,
        enRuta: services.filter(s => s.OperationalStatus === 'EnRuta').length,
        realizado: services.filter(s => s.OperationalStatus === 'Realizado').length,
        reportado: services.filter(s => s.OperationalStatus === 'Reportado').length,
        revision: services.filter(s => s.OperationalStatus === 'Revision').length,
        validado: services.filter(s => s.OperationalStatus === 'Validado').length
      }
    };
  },

  /**
   * Obtener servicios pendientes de validación
   */
  getPendingValidation(company) {
    let services = ServiceRepository.getAllByStatus('Reportado');
    if (company) services = services.filter(s => s.OperatingCompany === company);
    return services.map((s) => ServiceRepository.toDTO(s));
  },

  /**
   * Obtener servicios pendientes de facturación
   */
  getPendingInvoicing(company) {
    let services = ServiceRepository.getAllByFinancialStatus('Pendiente');
    services = services.filter(s => s.OperationalStatus === 'Validado');
    if (company) services = services.filter(s => s.OperatingCompany === company);
    return services.map((s) => ServiceRepository.toDTO(s));
  },

  /**
   * Obtener servicios en confrontación (nuevo estado financiero)
   */
  getInConfrontation(company) {
    let services = ServiceRepository.getAllByFinancialStatus('Confrontacion');
    if (company) services = services.filter(s => s.OperatingCompany === company);
    return services.map((s) => ServiceRepository.toDTO(s));
  }
};

/**
 * Suma un campo numérico agrupando por id, sobre filas ya leídas.
 * Reemplaza bucles `getByService()` (una lectura de hoja por servicio) por una
 * sola lectura + agregación en memoria.
 */
function _sumByService(rows, idField, amountField) {
  const totals = {};
  (rows || []).forEach(function (row) {
    const id = row[idField];
    if (!id) return;
    const amount = parseFloat(row[amountField]) || 0;
    totals[id] = (totals[id] || 0) + amount;
  });
  return totals;
}

// ============================================================================
// API endpoints
// ============================================================================

function apiGetServiceSummaryByProject(projectId) {
  return ServiceQueries.getSummaryByProject(projectId);
}

function apiGetServiceSummaryByDriver(driverId, startDate, endDate) {
  return ServiceQueries.getSummaryByDriver(driverId, startDate, endDate);
}

function apiGetPendingValidation(company) {
  return ServiceQueries.getPendingValidation(company);
}

function apiGetPendingInvoicing(company) {
  return ServiceQueries.getPendingInvoicing(company);
}
