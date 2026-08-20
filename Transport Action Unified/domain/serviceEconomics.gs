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
      vehicleType, 
      serviceType
    );

    if (!rateCard) {
      throw new BusinessRuleError(
        'No RateCard found for client ' + client.Name + 
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

    // 4. NOCTURNIDAD — per-hour calculation (9:30pm - 6:30am = €10/h)
    if (driverReport && driverReport.isNotturno && driverReport.startTime && driverReport.endTime) {
      const nightHours = this._calculateNightHours(driverReport.startTime, driverReport.endTime);
      if (nightHours > 0) {
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

    // 5. FESTIVO — 50% of base price
    if (driverReport && driverReport.isFestivo && basePrice > 0) {
      const holidayAmount = basePrice * 0.5;
      items.push(this._createBreakdownItem(
        'Holiday',
        'Festivo (50% de €' + basePrice + ')',
        1,
        holidayAmount,
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

    // 1. BASE
    if (supplierRate.BaseRate > 0) {
      items.push(this._createCostItem(
        'Base',
        'Servicio base ' + serviceType + ' (proveedor)',
        supplierRate.BaseRate,
        driverId,
        'driver_rate'
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
          'driver_rate'
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
          'driver_rate'
        ));
      }
    }

    // 4. NOCTURNIDAD (proveedor) — per-hour calculation (9:30pm - 6:30am)
    if (driverReport && driverReport.isNotturno && driverReport.startTime && driverReport.endTime) {
      const nightHours = this._calculateNightHours(driverReport.startTime, driverReport.endTime);
      if (nightHours > 0) {
        const nightRate = supplierRate.NightExtra > 0 ? supplierRate.NightExtra : 10; // default €10/h
        items.push(this._createCostItem(
          'Night',
          'Nocturnidad proveedor (' + nightHours + 'h @ €' + nightRate + '/h)',
          nightHours * nightRate,
          driverId,
          'driver_rate'
        ));
      }
    }

    // 5. FESTIVO (proveedor) — 50% of base rate
    if (driverReport && driverReport.isFestivo && supplierRate.BaseRate > 0) {
      const holidayAmount = supplierRate.BaseRate * 0.5;
      items.push(this._createCostItem(
        'Holiday',
        'Festivo proveedor (50% de €' + supplierRate.BaseRate + ')',
        holidayAmount,
        driverId,
        'driver_rate'
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
          'driver_rate'
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
        'driver_rate'
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
          'driver_report'
        ));
      }
      if (driverReport.tolls > 0) {
        items.push(this._createCostItem(
          'Tolls',
          'Peajes',
          driverReport.tolls,
          driverId,
          'driver_report'
        ));
      }
      if (driverReport.fuel > 0) {
        items.push(this._createCostItem(
          'Fuel',
          'Combustible',
          driverReport.fuel,
          driverId,
          'driver_report'
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
        Source: item.source
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
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    let diff = end - start;
    if (diff < 0) diff += 24 * 60; // overnight
    return diff / 60;
  },

  /**
   * Calculate night hours (21:30 - 06:30) within a service window.
   * Night window: 9:30pm (1350 min) to 6:30am (390 min) — crosses midnight.
   */
  _calculateNightHours(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    // Night window in minutes from midnight
    const NIGHT_START = 21 * 60 + 30; // 21:30 = 1290
    const NIGHT_END = 6 * 60 + 30;    // 06:30 = 390

    let totalNightMinutes = 0;
    let current = startMin;

    // Handle services that span midnight
    const serviceMinutes = endMin > startMin ? endMin - startMin : (24 * 60 - startMin + endMin);

    for (let i = 0; i < Math.ceil(serviceMinutes / (24 * 60)); i++) {
      const dayStart = current;
      const dayEnd = current + Math.min(serviceMinutes - i * (24 * 60), 24 * 60);

      // Check overlap with night window (same day: 21:30-24:00, next day: 00:00-06:30)
      // Night part 1: 21:30 to midnight (1290 to 1440)
      const nightStart1 = Math.max(dayStart, NIGHT_START);
      const nightEnd1 = Math.min(dayEnd, 1440);
      if (nightEnd1 > nightStart1) {
        totalNightMinutes += nightEnd1 - nightStart1;
      }

      // Night part 2: midnight to 06:30 (0 to 390) — only if service started before 21:30
      if (dayStart < NIGHT_START) {
        const nightStart2 = Math.max(dayStart, 0);
        const nightEnd2 = Math.min(dayEnd, NIGHT_END);
        if (nightEnd2 > nightStart2) {
          totalNightMinutes += nightEnd2 - nightStart2;
        }
      }

      current += 24 * 60;
    }

    return Math.round((totalNightMinutes / 60) * 10) / 10; // round to 1 decimal
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

  _createCostItem(itemType, description, amount, driverId, source) {
    return {
      itemType: itemType,
      description: description,
      amount: amount,
      driverId: driverId,
      source: source
    };
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