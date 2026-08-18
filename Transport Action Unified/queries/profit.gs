// ============================================================================
// PROFIT.GS — Queries de Profitabilidad
// ============================================================================

const ProfitQueries = {
  /**
   * Calcular profit por proyecto
   */
  byProject(projectId) {
    const services = ServiceRepository.getAllByProject(projectId);
    let totalRevenue = 0;
    let totalCost = 0;

    services.forEach(s => {
      totalRevenue += ServiceQueries.calculateRevenue(s.ID);
      totalCost += ServiceQueries.calculateCost(s.ID);
    });

    return {
      projectId,
      serviceCount: services.length,
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0
    };
  },

  /**
   * Calcular profit por conductor
   */
  byDriver(driverId, startDate, endDate) {
    let services = ServiceRepository.getAllByDriver(driverId);
    if (startDate) services = services.filter(s => new Date(s.Date) >= new Date(startDate));
    if (endDate) services = services.filter(s => new Date(s.Date) <= new Date(endDate));

    let totalRevenue = 0;
    let totalCost = 0;

    services.forEach(s => {
      totalRevenue += ServiceQueries.calculateRevenue(s.ID);
      totalCost += ServiceQueries.calculateCost(s.ID);
    });

    return {
      driverId,
      serviceCount: services.length,
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0
    };
  },

  /**
   * Calcular profit por empresa operadora
   */
  byCompany(operatingCompany, startDate, endDate) {
    let services = ServiceRepository.getByCompany(operatingCompany);
    if (startDate) services = services.filter(s => new Date(s.Date) >= new Date(startDate));
    if (endDate) services = services.filter(s => new Date(s.Date) <= new Date(endDate));

    let totalRevenue = 0;
    let totalCost = 0;

    services.forEach(s => {
      totalRevenue += ServiceQueries.calculateRevenue(s.ID);
      totalCost += ServiceQueries.calculateCost(s.ID);
    });

    return {
      operatingCompany,
      serviceCount: services.length,
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0
    };
  },

  /**
   * Profit por período (diario, semanal, mensual)
   */
  byPeriod(periodType, startDate, endDate) {
    const services = ServiceRepository.getByDateRange(startDate, endDate);
    const periods = {};

    services.forEach(s => {
      const date = new Date(s.Date);
      let key;

      if (periodType === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (periodType === 'weekly') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else if (periodType === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!periods[key]) {
        periods[key] = { revenue: 0, cost: 0, count: 0 };
      }
      periods[key].revenue += ServiceQueries.calculateRevenue(s.ID);
      periods[key].cost += ServiceQueries.calculateCost(s.ID);
      periods[key].count++;
    });

    // Calcular profit para cada período
    Object.keys(periods).forEach(key => {
      periods[key].profit = periods[key].revenue - periods[key].cost;
      periods[key].margin = periods[key].revenue > 0
        ? (periods[key].profit / periods[key].revenue * 100)
        : 0;
    });

    return periods;
  },

  /**
   * Comparar Estimated vs Actual por proyecto
   * Muestra desviación entre lo estimado y lo real
   */
  estimatedVsActual(projectId) {
    const services = ServiceRepository.getAllByProject(projectId);
    let totalEstimatedRevenue = 0;
    let totalEstimatedCost = 0;
    let totalActualRevenue = 0;
    let totalActualCost = 0;
    let serviceCount = 0;

    services.forEach(s => {
      const estRev = parseFloat(s.EstimatedRevenue) || 0;
      const estCost = parseFloat(s.EstimatedCost) || 0;
      const actRev = ServiceQueries.calculateRevenue(s.ID);
      const actCost = ServiceQueries.calculateCost(s.ID);

      totalEstimatedRevenue += estRev;
      totalEstimatedCost += estCost;
      totalActualRevenue += actRev;
      totalActualCost += actCost;
      serviceCount++;
    });

    const estimatedProfit = totalEstimatedRevenue - totalEstimatedCost;
    const actualProfit = totalActualRevenue - totalActualCost;
    const revenueVariance = totalEstimatedRevenue > 0
      ? ((totalActualRevenue - totalEstimatedRevenue) / totalEstimatedRevenue * 100)
      : 0;
    const costVariance = totalEstimatedCost > 0
      ? ((totalActualCost - totalEstimatedCost) / totalEstimatedCost * 100)
      : 0;
    const profitVariance = estimatedProfit > 0
      ? ((actualProfit - estimatedProfit) / estimatedProfit * 100)
      : 0;

    return {
      projectId,
      serviceCount,
      estimated: {
        revenue: totalEstimatedRevenue,
        cost: totalEstimatedCost,
        profit: estimatedProfit,
        margin: totalEstimatedRevenue > 0
          ? (estimatedProfit / totalEstimatedRevenue * 100)
          : 0
      },
      actual: {
        revenue: totalActualRevenue,
        cost: totalActualCost,
        profit: actualProfit,
        margin: totalActualRevenue > 0
          ? (actualProfit / totalActualRevenue * 100)
          : 0
      },
      variance: {
        revenuePercent: revenueVariance,
        costPercent: costVariance,
        profitPercent: profitVariance,
        revenueAbs: totalActualRevenue - totalEstimatedRevenue,
        costAbs: totalActualCost - totalEstimatedCost,
        profitAbs: actualProfit - estimatedProfit
      }
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetProfitByProject(projectId) {
  return ProfitQueries.byProject(projectId);
}

function apiGetProfitByDriver(driverId, startDate, endDate) {
  return ProfitQueries.byDriver(driverId, startDate, endDate);
}

function apiGetProfitByCompany(operatingCompany, startDate, endDate) {
  return ProfitQueries.byCompany(operatingCompany, startDate, endDate);
}

function apiGetEstimatedVsActual(projectId) {
  return ProfitQueries.estimatedVsActual(projectId);
}
