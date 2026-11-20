// ============================================================================
// SERVICEECONOMICS.GS — Cálculo económico dual del Service (Revenue vs Cost)
// ============================================================================

const ServiceEconomics = {
  /**
   * Calcula Revenue Breakdown (lado producción/cliente) desde RateCard
   * Usa: Customer RateCard (RateCard) + DriverReport actuals
   * 
   * @param {string} serviceId
   * @param {Object} driverReport - { startTime, endTime, kmTotal, hasDiaria, isFestivo, isNotturno, diariaType }
   * @returns {Array} items para ServiceRevenueBreakdown
   */
  calculateRevenueBreakdown(serviceId, driverReport) {
    const service = ServiceRepository.getById(serviceId);
    if (!service) throw new NotFoundError('Service', serviceId);

    const project = ProjectRepository.getById(service.ProjectID);
    if (!project) throw new NotFoundError('Project', service.ProjectID);

    const client = ClientRepository.getById(project.ClientID);
    if (!client) throw new NotFoundError('Client', project.ClientID);

    // Buscar RateCard: por Project + ServiceType + VehicleType
    const vehicleType = service.VehicleType || (() => {
      if (service.VehicleID) {
        const v = VehicleRepository.getById(service.VehicleID);
        return v ? v.Type : 'Van';
      }
      return 'Van';
    })();

    const serviceType = service.ServiceType || 'Dispo';

    const rateCard = RateCardRepository.getByClientAndType(
      client.ID,
      service.ProjectID,
      vehicleType,
      serviceType
    );

    if (!rateCard) {
      throw new BusinessRuleError(
        'No RateCard found for client ' + client.Name +
        ', project ' + service.ProjectID +
        ', vehicleType ' + vehicleType +
        ', serviceType ' + serviceType,
        'NO_RATECARD'
      );
    }

    const items = [];

    // 1. BASE
    const basePrice = this._getBasePrice(rateCard, serviceType);
    if (basePrice > 0) {
      items.push(this._createBreakdownItem('Base', 'Servicio base ' + serviceType, 1, basePrice, rateCard.ID, 'rate_card'));
    }

    // 2. EXTRA KM
    if (driverReport && driverReport.kmTotal > 0) {
      const includedKm = this._getIncludedKm(rateCard, serviceType);
      const extraKm = Math.max(0, driverReport.kmTotal - includedKm);
      if (extraKm > 0 && rateCard.ExtraKmRate > 0) {
        items.push(this._createBreakdownItem(
          'ExtraKm', 
          'Km extra (' + extraKm + ' km @ €' + rateCard.ExtraKmRate + '/km)', 
          extraKm, 
          rateCard.ExtraKmRate, 
          rateCard.ID, 
          'rate_card'
        ));
      }
    }

    // 3. EXTRA HOURS
    if (driverReport && driverReport.startTime && driverReport.endTime) {
      const hours = this._calculateHours(driverReport.startTime, driverReport.endTime);
      const includedHours = this._getIncludedHours(rateCard, serviceType);
      const extraHours = Math.max(0, hours - includedHours);
      if (extraHours > 0 && rateCard.ExtraHourRate > 0) {
        items.push(this._createBreakdownItem(
          'ExtraHours',
          'Horas extra (' + extraHours + ' h @ €' + rateCard.ExtraHourRate + '/h)',
          extraHours,
          rateCard.ExtraHourRate,
          rateCard.ID,
          'rate_card'
        ));
      }
    }

    // 4. NOCTURNIDAD — per-hour calculation (21:30 - 06:30)
    // AUTO-CALCULATED from service hours — no checkbox needed
    // Admin can still override via isNotturno flag (force enable/disable)
    if (driverReport && driverReport.startTime && driverReport.endTime) {
      const nightHours = this._calculateNightHours(driverReport.startTime, driverReport.endTime);
      // Admin override: isNotturno === false means "force disable night fee"
      const isNightDisabled = driverReport.isNotturno === false;
      if (nightHours > 0 && !isNightDisabled) {
        const nightRate = rateCard.NightFee > 0 ? rateCard.NightFee : 10; // default €10/h
        items.push(this._createBreakdownItem(
          'Night',
          'Nocturnidad (' + nightHours + 'h @ €' + nightRate + '/h)',
          nightHours,
          nightRate,
          rateCard.ID,
          'rate_card'
        ));
      }
    }

    // 5. FESTIVO — HolidayFee from RateCard, fallback to 50% of base price
    if (driverReport && driverReport.isFestivo && basePrice > 0) {
      const holidayRate = rateCard.HolidayFee > 0 ? rateCard.HolidayFee : basePrice * 0.5;
      items.push(this._createBreakdownItem(
        'Holiday',
        rateCard.HolidayFee > 0
          ? 'Festivo (€' + holidayRate + ')'
          : 'Festivo (50% de €' + basePrice + ')',
        1,
        holidayRate,
        rateCard.ID,
        'rate_card'
      ));
    }

    // 6. DIARIA (lado cliente)
    if (driverReport && driverReport.hasDiaria && driverReport.diariaType !== 'none') {
      const diariaPrice = this._getDiariaPrice(rateCard, driverReport.diariaType);
      if (diariaPrice > 0) {
        items.push(this._createBreakdownItem(
          'Diaria',
          'Diaria ' + driverReport.diariaType,
          1,
          diariaPrice,
          rateCard.ID,
          'rate_card'
        ));
      }
    }

    // 7. WAIT TIME (si aplica)
    if (driverReport && driverReport.waitMinutes > 0 && rateCard.WaitRate > 0) {
      const waitHours = Math.ceil(driverReport.waitMinutes / 60);
      items.push(this._createBreakdownItem(
        'Wait',
        'Tiempo de espera (' + waitHours + ' h @ €' + rateCard.WaitRate + '/h)',
        waitHours,
        rateCard.WaitRate,
        rateCard.ID,
        'rate_card'
      ));
    }

    // 8. AIRPORT SURCHARGE (si es transfer airport)
    if ((serviceType === 'Airport' || serviceType === 'Transfer Airport') && rateCard.AirportSurcharge > 0) {
      items.push(this._createBreakdownItem(
        'AirportSurcharge',
        'Suplemento aeropuerto',
        1,
        rateCard.AirportSurcharge,
        rateCard.ID,
        'rate_card'
      ));
    }

    return items;
  },

  /**
   * Calcula Cost Breakdown (lado proveedor/conductor) desde SupplierRate
   * Usa: SupplierRate (Driver o Collaborator) + DriverReport actuals
   * 
   * @param {string} serviceId
   * @param {Object} driverReport - { startTime, endTime, kmTotal, hasDiaria, isFestivo, isNotturno, diariaType }
   * @returns {Array} items para ServiceCostBreakdown
   */
  calculateCostBreakdown(serviceId, driverReport) {
    const service = ServiceRepository.getById(serviceId);
    if (!service) throw new NotFoundError('Service', serviceId);

    // Determinar proveedor
    const providerType = service.ProviderType || 'internal_driver';
    const providerId = service.ProviderID || service.DriverID;
    const driverId = service.DriverID;

    if (!providerId) {
      throw new BusinessRuleError('Service has no provider assigned', 'NO_PROVIDER');
    }

    // Buscar SupplierRate
    const projectId = service.ProjectID || 'GLOBAL';
    const vehicleType = service.VehicleType || 'Van';
    const serviceType = service.ServiceType || 'Dispo';

    let supplierRate = SupplierRateRepository.getByCriteria(
      providerType,
      providerId,
      projectId,
      serviceType,
      vehicleType
    );

    // Fallback: buscar en GLOBAL si no hay específico del proyecto
    if (!supplierRate && projectId !== 'GLOBAL') {
      supplierRate = SupplierRateRepository.getByCriteria(
        providerType,
        providerId,
        'GLOBAL',
        serviceType,
        vehicleType
      );
    }

    if (!supplierRate) {
      throw new BusinessRuleError(
        'No SupplierRate found for ' + providerType + ' ' + providerId +
        ', project ' + projectId + ', serviceType ' + serviceType +
        ', vehicleType ' + vehicleType,
        'NO_SUPPLIERRATE'
      );
    }

    const items = [];
    const srId = supplierRate ? supplierRate.ID : '';

    // 1. BASE
    if (supplierRate.BaseRate > 0) {
      items.push(this._createCostItem(
        'Base',
        'Servicio base ' + serviceType + ' (proveedor)',
        supplierRate.BaseRate,
        driverId,
        'driver_rate',
        srId
      ));
    }

    // 2. EXTRA KM
    if (driverReport && driverReport.kmTotal > 0) {
      const includedKm = supplierRate.IncludedKm || 0;
      const extraKm = Math.max(0, driverReport.kmTotal - includedKm);
      if (extraKm > 0 && supplierRate.ExtraKmRate > 0) {
        items.push(this._createCostItem(
          'ExtraKm',
          'Km extra proveedor (' + extraKm + ' km @ €' + supplierRate.ExtraKmRate + '/km)',
          extraKm * supplierRate.ExtraKmRate,
          driverId,
          'driver_rate',
          srId
        ));
      }
    }

    // 3. EXTRA HOURS
    if (driverReport && driverReport.startTime && driverReport.endTime) {
      const hours = this._calculateHours(driverReport.startTime, driverReport.endTime);
      const includedHours = supplierRate.IncludedHours || 0;
      const extraHours = Math.max(0, hours - includedHours);
      if (extraHours > 0 && supplierRate.ExtraHourRate > 0) {
        items.push(this._createCostItem(
          'ExtraHours',
          'Horas extra proveedor (' + extraHours + ' h @ €' + supplierRate.ExtraHourRate + '/h)',
          extraHours * supplierRate.ExtraHourRate,
          driverId,
          'driver_rate',
          srId
        ));
      }
    }

    // 4. NOCTURNIDAD (proveedor) — per-hour calculation (21:30 - 06:30)
    // AUTO-CALCULATED from service hours — same logic as revenue side
    if (driverReport && driverReport.startTime && driverReport.endTime) {
      const nightHours = this._calculateNightHours(driverReport.startTime, driverReport.endTime);
      const isNightDisabled = driverReport.isNotturno === false;
      if (nightHours > 0 && !isNightDisabled) {
        const nightRate = supplierRate.NightExtra > 0 ? supplierRate.NightExtra : 10; // default €10/h
        items.push(this._createCostItem(
          'Night',
          'Nocturnidad proveedor (' + nightHours + 'h @ €' + nightRate + '/h)',
          nightHours * nightRate,
          driverId,
          'driver_rate',
          srId
        ));
      }
    }

    // 5. FESTIVO (proveedor) — HolidayExtra from SupplierRate, fallback to 50% of base
    if (driverReport && driverReport.isFestivo && supplierRate.BaseRate > 0) {
      const holidayRate = supplierRate.HolidayExtra > 0 ? supplierRate.HolidayExtra : supplierRate.BaseRate * 0.5;
      items.push(this._createCostItem(
        'Holiday',
        supplierRate.HolidayExtra > 0
          ? 'Festivo proveedor (€' + holidayRate + ')'
          : 'Festivo proveedor (50% de €' + supplierRate.BaseRate + ')',
        holidayRate,
        driverId,
        'driver_rate',
        srId
      ));
    }

    // 6. DIARIA (proveedor) - REGLAS SEPARADAS
    if (driverReport && driverReport.hasDiaria && driverReport.diariaType !== 'none') {
      const diariaCost = this._getSupplierDiariaCost(supplierRate, driverReport.diariaType);
      if (diariaCost > 0) {
        items.push(this._createCostItem(
          'Diaria',
          'Diaria proveedor ' + driverReport.diariaType,
          diariaCost,
          driverId,
          'driver_rate',
          srId
        ));
      }
    }

    // 7. WAIT TIME (proveedor)
    if (driverReport && driverReport.waitMinutes > 0 && supplierRate.WaitHourRate > 0) {
      const waitHours = Math.ceil(driverReport.waitMinutes / 60);
      items.push(this._createCostItem(
        'Wait',
        'Tiempo de espera proveedor (' + waitHours + ' h @ €' + supplierRate.WaitHourRate + '/h)',
        waitHours * supplierRate.WaitHourRate,
        driverId,
        'driver_rate',
        srId
      ));
    }

    // 8. EXTRAS DEL DRIVER REPORT (parking, tolls, fuel) - source: driver_report
    if (driverReport) {
      if (driverReport.parking > 0) {
        items.push(this._createCostItem(
          'Parking',
          'Parking',
          driverReport.parking,
          driverId,
          'driver_report',
          ''
        ));
      }
      if (driverReport.tolls > 0) {
        items.push(this._createCostItem(
          'Tolls',
          'Peajes',
          driverReport.tolls,
          driverId,
          'driver_report',
          ''
        ));
      }
      if (driverReport.fuel > 0) {
        items.push(this._createCostItem(
          'Fuel',
          'Combustible',
          driverReport.fuel,
          driverId,
          'driver_report',
          ''
        ));
      }
    }

    return items;
  },

  /**
   * Aplica Revenue Breakdown al Service (crea/actualiza ServiceRevenueBreakdown items)
   * Idempotente: elimina items desbloqueados de origen automático (rate_card) y recrea.
   * Preserva ajustes manuales ('manual', 'adjustment').
   */
  applyRevenueBreakdown(serviceId, driverReport) {
    const items = this.calculateRevenueBreakdown(serviceId, driverReport);
    const created = [];

    // Limpiar items automáticos desbloqueados (evita duplicados al re-aplicar)
    const existing = ServiceRevenueBreakdownRepository.getUnlockedByService(serviceId);
    existing.forEach(item => {
      if (item.Source === 'rate_card' || item.Source === 'imported') {
        ServiceRevenueBreakdownRepository.delete(item.ID);
      }
    });

    items.forEach(item => {
      const entity = ServiceRevenueBreakdownRepository.create({
        ServiceID: serviceId,
        ItemType: item.itemType,
        Description: item.description,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
        RateCardID: item.rateCardId,
        Source: item.source
      });
      created.push(entity);
    });

    return created;
  },

  /**
   * Aplica Cost Breakdown al Service (crea/actualiza ServiceCostBreakdown items)
   * Idempotente: elimina items desbloqueados de origen automático y recrea.
   * Preserva ajustes manuales ('manual', 'adjustment').
   */
  applyCostBreakdown(serviceId, driverReport) {
    const items = this.calculateCostBreakdown(serviceId, driverReport);
    const created = [];

    // Limpiar items automáticos desbloqueados (evita duplicados al re-aplicar)
    const existing = ServiceCostBreakdownRepository.getUnlockedByService(serviceId);
    existing.forEach(item => {
      if (item.Source === 'driver_rate' || item.Source === 'driver_report') {
        ServiceCostBreakdownRepository.delete(item.ID);
      }
    });

    items.forEach(item => {
      const entity = ServiceCostBreakdownRepository.create({
        ServiceID: serviceId,
        ItemType: item.itemType,
        Description: item.description,
        Amount: item.amount,
        DriverID: item.driverId,
        Source: item.source,
        SupplierRateID: item.supplierRateId || ''
      });
      created.push(entity);
    });

    return created;
  },

  /**
   * Calcula ambos lados y devuelve resumen económico
   */
  calculateEconomics(serviceId, driverReport) {
    const revenueItems = this.calculateRevenueBreakdown(serviceId, driverReport);
    const costItems = this.calculateCostBreakdown(serviceId, driverReport);

    const revenue = revenueItems.reduce((sum, i) => sum + i.total, 0);
    const cost = costItems.reduce((sum, i) => sum + i.amount, 0);

    return {
      serviceId: serviceId,
      revenue: {
        total: revenue,
        breakdown: revenueItems
      },
      cost: {
        total: cost,
        breakdown: costItems
      },
      margin: revenue - cost,
      marginPercent: revenue > 0 ? ((revenue - cost) / revenue * 100).toFixed(2) : 0
    };
  },

  // ========== HELPERS ==========

  _getBasePrice(rateCard, serviceType) {
    switch (serviceType) {
      case 'Transfer Airport':
      case 'Transfer City':
      case 'Transfer':
        return rateCard.BasePrice || 0;
      case 'Dispo':
        return rateCard.FullDayPrice || rateCard.HalfDayPrice || rateCard.BasePrice || 0;
      case 'HalfDay':
        return rateCard.HalfDayPrice || 0;
      case 'FullDay':
        return rateCard.FullDayPrice || 0;
      case 'Airport':
        return rateCard.BasePrice || 0;
      default:
        return rateCard.BasePrice || 0;
    }
  },

  _getIncludedKm(rateCard, serviceType) {
    // Read from RateCard — different contracts can have different included km
    return parseFloat(rateCard.IncludedKm) || 0;
  },

  _getIncludedHours(rateCard, serviceType) {
    // Read from RateCard — different contracts can have different included hours
    return parseFloat(rateCard.IncludedHours) || 0;
  },

  _getDiariaPrice(rateCard, diariaType) {
    if (diariaType === 'piena') return rateCard.FullDayPrice || 0;
    if (diariaType === 'mezza') return rateCard.HalfDayPrice || 0;
    return 0;
  },

  _getSupplierDiariaCost(supplierRate, diariaType) {
    if (diariaType === 'piena') return supplierRate.DiariaPiena || 0;
    if (diariaType === 'mezza') return supplierRate.DiariaMezza || 0;
    return 0;
  },

  _calculateHours(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    // Handle Date objects — extract HH:MM
    var s = typeof startTime === 'string' ? startTime : (startTime instanceof Date ? String(startTime.getHours()).padStart(2,'0') + ':' + String(startTime.getMinutes()).padStart(2,'0') : String(startTime));
    var e = typeof endTime === 'string' ? endTime : (endTime instanceof Date ? String(endTime.getHours()).padStart(2,'0') + ':' + String(endTime.getMinutes()).padStart(2,'0') : String(endTime));
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    let diff = end - start;
    if (diff < 0) diff += 24 * 60; // overnight
    return diff / 60;
  },

  /**
   * Calculate night hours (21:30 - 06:30) within a service window.
   * Night window: 21:30 (1290 min) to 06:30 (390 min) — crosses midnight.
   * Service is always < 24h (single-day), so we compute direct overlap.
   */
  _calculateNightHours(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    // Handle Date objects — extract HH:MM
    var s = typeof startTime === 'string' ? startTime : (startTime instanceof Date ? String(startTime.getHours()).padStart(2,'0') + ':' + String(startTime.getMinutes()).padStart(2,'0') : String(startTime));
    var e = typeof endTime === 'string' ? endTime : (endTime instanceof Date ? String(endTime.getHours()).padStart(2,'0') + ':' + String(endTime.getMinutes()).padStart(2,'0') : String(endTime));
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    const NIGHT_START = 21 * 60 + 30; // 21:30 = 1290
    const NIGHT_END = 6 * 60 + 30;    // 06:30 = 390

    let totalNightMinutes = 0;

    if (endMin > startMin) {
      // Same-day service (e.g., 08:00 → 18:00)
      // Check overlap with 21:30-24:00
      const o1Start = Math.max(startMin, NIGHT_START);
      const o1End = Math.min(endMin, 24 * 60);
      if (o1End > o1Start) totalNightMinutes += o1End - o1Start;
      // Check overlap with 00:00-06:30
      const o2Start = Math.max(startMin, 0);
      const o2End = Math.min(endMin, NIGHT_END);
      if (o2End > o2Start) totalNightMinutes += o2End - o2Start;
    } else {
      // Overnight service (e.g., 22:00 → 02:00) — endMin <= startMin
      // Service wraps midnight. Count overlap with 21:30-24:00 on day 1
      const o1Start = Math.max(startMin, NIGHT_START);
      const o1End = 24 * 60;
      if (o1End > o1Start) totalNightMinutes += o1End - o1Start;
      // Count overlap with 00:00-06:30 on day 2
      const o2Start = 0;
      const o2End = Math.min(endMin, NIGHT_END);
      if (o2End > o2Start) totalNightMinutes += o2End - o2Start;
    }

    return Math.round((totalNightMinutes / 60) * 10) / 10;
  },

  _createBreakdownItem(itemType, description, quantity, unitPrice, rateCardId, source) {
    return {
      itemType: itemType,
      description: description,
      quantity: quantity,
      unitPrice: unitPrice,
      total: quantity * unitPrice,
      rateCardId: rateCardId,
      source: source
    };
  },

  _createCostItem(itemType, description, amount, driverId, source, supplierRateId) {
    return {
      itemType: itemType,
      description: description,
      amount: amount,
      driverId: driverId,
      source: source,
      supplierRateId: supplierRateId || ''
    };
  },

  /**
   * Build legacy revenue breakdown format from ServiceRevenueBreakdown items.
   * Maps ItemType → { base, kmOver, hoursOver, diaria, notturno, holiday, wait, airport }
   * Used by ServiceRepository.toDTO() to populate the frontend revenueBreakdown field.
   */
  _buildLegacyBreakdown(items, amountField) {
    var result = { base: 0, kmOver: 0, hoursOver: 0, diaria: 0, notturno: 0, holiday: 0, wait: 0, airport: 0 };
    if (!items || !items.length) return result;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var val = parseFloat(item[amountField]) || 0;
      switch (item.ItemType) {
        case 'Base': result.base += val; break;
        case 'ExtraKm': result.kmOver += val; break;
        case 'ExtraHours': result.hoursOver += val; break;
        case 'Diaria': result.diaria += val; break;
        case 'Night': result.notturno += val; break;
        case 'Holiday': result.holiday += val; break;
        case 'Wait': result.wait += val; break;
        case 'AirportSurcharge': result.airport += val; break;
        // Manual/adjustment items with ItemType not in the list → add to base
        default: result.base += val; break;
      }
    }
    return result;
  },

  /**
   * Build legacy cost breakdown format from ServiceCostBreakdown items.
   * Maps ItemType → { base, kmOver, hoursOver, diaria, notturno, holiday, wait, extras }
   * Used by ServiceRepository.toDTO() to populate the frontend costBreakdown field.
   */
  _buildLegacyCostBreakdown(items) {
    var result = { base: 0, kmOver: 0, hoursOver: 0, diaria: 0, notturno: 0, holiday: 0, wait: 0, extras: 0 };
    if (!items || !items.length) return result;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var val = parseFloat(item.Amount) || 0;
      switch (item.ItemType) {
        case 'Base': result.base += val; break;
        case 'ExtraKm': result.kmOver += val; break;
        case 'ExtraHours': result.hoursOver += val; break;
        case 'Diaria': result.diaria += val; break;
        case 'Night': result.notturno += val; break;
        case 'Holiday': result.holiday += val; break;
        case 'Wait': result.wait += val; break;
        // Parking, Tolls, Fuel → extras
        case 'Parking': result.extras += val; break;
        case 'Tolls': result.extras += val; break;
        case 'Fuel': result.extras += val; break;
        default: result.base += val; break;
      }
    }
    return result;
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiCalculateServiceEconomics(serviceId, driverReport) {
  return ServiceEconomics.calculateEconomics(serviceId, driverReport);
}

function apiApplyRevenueBreakdown(serviceId, driverReport) {
  return ServiceEconomics.applyRevenueBreakdown(serviceId, driverReport);
}

function apiApplyCostBreakdown(serviceId, driverReport) {
  return ServiceEconomics.applyCostBreakdown(serviceId, driverReport);
}

/**
 * Recalculate both revenue and cost breakdowns for a service.
 * Reads the active DriverReport and rebuilds all breakdown items.
 * Used by the FinanceTab "Recalculate" button.
 */
function apiRecalculateServiceEconomics(serviceId) {
  var service = ServiceRepository.getById(serviceId);
  if (!service) throw new NotFoundError('Service', serviceId);
  
  var report = DriverReportRepository.getActiveByService(serviceId);
  if (!report) throw new BusinessRuleError('No active DriverReport for service ' + serviceId, 'NO_REPORT');
  
  var driverReportData = {
    startTime: report.StartTime,
    endTime: report.EndTime,
    kmTotal: parseFloat(report.KmTotal) || 0,
    hasDiaria: report.HasDiaria === 'true' || report.HasDiaria === true,
    isFestivo: report.IsFestivo === 'true' || report.IsFestivo === true,
    isNotturno: report.IsNotturno === 'true' || report.IsNotturno === true,
    diariaType: report.DiariaType || 'none',
    parking: parseFloat(report.Parking) || 0,
    tolls: parseFloat(report.Tolls) || 0,
    fuel: parseFloat(report.Fuel) || 0,
    waitMinutes: parseFloat(report.WaitMinutes) || 0
  };
  
  var warnings = [];
  var revenueItems = [];
  var costItems = [];
  
  try {
    revenueItems = ServiceEconomics.applyRevenueBreakdown(serviceId, driverReportData);
  } catch (e) {
    warnings.push('Revenue: ' + e.message);
  }
  
  try {
    costItems = ServiceEconomics.applyCostBreakdown(serviceId, driverReportData);
  } catch (e) {
    warnings.push('Cost: ' + e.message);
  }
  
  return {
    serviceId: serviceId,
    revenueItems: revenueItems.length,
    costItems: costItems.length,
    warnings: warnings
  };
}

/**
 * Diagnostic: trace the full chain from Service → Project → Client → RateCard → SupplierRate
 * Returns all intermediate data so we can see exactly where the lookup fails.
 */
function apiDebugServiceEconomicsChain(serviceId) {
  var result = { serviceId: serviceId };
  
  // 1. Service
  var service = ServiceRepository.getById(serviceId);
  if (!service) { result.error = 'Service not found'; return result; }
  result.service = {
    id: service.ID,
    projectId: service.ProjectID,
    driverId: service.DriverID,
    vehicleType: service.VehicleType,
    vehicleId: service.VehicleID,
    serviceType: service.ServiceType,
    providerType: service.ProviderType,
    providerId: service.ProviderID,
    operationalStatus: service.OperationalStatus,
    financialStatus: service.FinancialStatus
  };
  
  // 2. Project
  var project = ProjectRepository.getById(service.ProjectID);
  if (!project) { result.error = 'Project not found: ' + service.ProjectID; return result; }
  result.project = { id: project.ID, name: project.Name, clientId: project.ClientID };
  
  // 3. Client
  var client = ClientRepository.getById(project.ClientID);
  if (!client) { result.error = 'Client not found: ' + project.ClientID; return result; }
  result.client = { id: client.ID, name: client.Name, active: client.Active };
  
  // 4. VehicleType resolution
  var vehicleType = service.VehicleType || '';
  if (service.VehicleID) {
    var vehicle = VehicleRepository.getById(service.VehicleID);
    if (vehicle) vehicleType = vehicle.Type || '';
  }
  result.resolvedVehicleType = vehicleType;
  result.resolvedServiceType = service.ServiceType || 'Dispo';
  
  // 5. All RateCards for this client
  var allCards = RateCardRepository.getByClient(client.ID);
  result.allClientRateCards = allCards.map(function(c) {
    return {
      id: c.ID, name: c.Name, vehicleType: c.VehicleType, serviceType: c.ServiceType,
      active: c.Active, activeType: typeof c.Active, projectId: c.ProjectID,
      basePrice: c.BasePrice, fullDayPrice: c.FullDayPrice, halfDayPrice: c.HalfDayPrice
    };
  });
  
  // 6. Try the lookup
  var matchedCard = RateCardRepository.getByClientAndType(
    client.ID, service.ProjectID, vehicleType, service.ServiceType || 'Dispo'
  );
  result.matchedRateCard = matchedCard ? {
    id: matchedCard.ID, name: matchedCard.Name, basePrice: matchedCard.BasePrice
  } : null;
  
  // 7. SupplierRate lookup
  var providerType = service.ProviderType || 'internal_driver';
  var providerId = service.ProviderID || service.DriverID;
  if (providerId) {
    var sr = SupplierRateRepository.getByCriteria(
      providerType, providerId, service.ProjectID || 'GLOBAL',
      service.ServiceType || 'Dispo', vehicleType
    );
    result.matchedSupplierRate = sr ? {
      id: sr.ID, baseRate: sr.BaseRate, providerType: sr.ProviderType, providerId: sr.ProviderID
    } : null;
  }
  
  // 8. Existing breakdowns
  result.existingRevenueItems = ServiceRevenueBreakdownRepository.getByService(serviceId).length;
  result.existingCostItems = ServiceCostBreakdownRepository.getByService(serviceId).length;
  
  // 9. Active DriverReport
  var report = DriverReportRepository.getActiveByService(serviceId);
  result.activeDriverReport = report ? {
    id: report.ID, status: report.Status, locked: report.Locked,
    startTime: report.StartTime, endTime: report.EndTime, kmTotal: report.KmTotal
  } : null;
  
  return result;
}