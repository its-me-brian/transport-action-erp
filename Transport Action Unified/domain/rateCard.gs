// ============================================================================
// RATECARD.GS — Entidad RateCard (tarifario de clientes)
// ============================================================================

const RateCardRepository = {
  SHEET: SHEETS.RateCards,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByClient(clientId) {
    return _find(this.SHEET, row => row.ClientID === clientId);
  },

  getByClientAndType(clientId, projectId, vehicleType, serviceType) {
    const cards = this.getByClient(clientId);
    const st = serviceType || 'Dispo';
    const vt = (vehicleType || 'Van').trim();
    
    // Normalize Active field — Google Sheets may store as boolean, number, string, or "TRUE"/"FALSE"
    const isActive = (val) => {
      if (val === true || val === 1) return true;
      if (typeof val === 'string') {
        var lower = val.toLowerCase().trim();
        return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'si';
      }
      return false;
    };
    
    const matches = cards.filter(c => {
      const vtMatch = (c.VehicleType || '').trim().toLowerCase() === vt.toLowerCase();
      const stMatch = (c.ServiceType || 'Dispo').trim().toLowerCase() === st.toLowerCase();
      const activeMatch = isActive(c.Active);
      Logger.log('[getByClientAndType] Card ' + c.ID + ': VehicleType=' + c.VehicleType + ' vs ' + vt + ' => ' + vtMatch +
        ', ServiceType=' + c.ServiceType + ' vs ' + st + ' => ' + stMatch +
        ', Active=' + c.Active + ' (type=' + typeof c.Active + ') => ' + activeMatch);
      return vtMatch && stMatch && activeMatch;
    });
    
    Logger.log('[getByClientAndType] clientId=' + clientId + ', projectId=' + projectId + ', vehicleType=' + vt + ', serviceType=' + st + ' => ' + matches.length + ' matches');
    
    // Prefer project-specific rate card, then GLOBAL, then first match
    if (projectId) {
      const projectMatch = matches.find(c => c.ProjectID === projectId);
      if (projectMatch) return projectMatch;
    }
    const globalMatch = matches.find(c => !c.ProjectID || c.ProjectID === 'GLOBAL');
    if (globalMatch) return globalMatch;
    return matches[0] || undefined;
  },

  getActive() {
    return _find(this.SHEET, row => row.Active === 'true' || row.Active === true);
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      Name: data.Name || '',
      Category: data.Category || '',
      VehicleType: data.VehicleType || 'Van',
      ServiceType: data.ServiceType || 'Dispo',
      BasePrice: data.BasePrice || 0,
      IncludedKm: parseFloat(data.IncludedKm) || 0,
      IncludedHours: parseFloat(data.IncludedHours) || 0,
      ExtraKmRate: data.ExtraKmRate || 0,
      ExtraHourRate: data.ExtraHourRate || 0,
      WaitRate: data.WaitRate || 0,
      NightFee: data.NightFee || 0,
      HolidayFee: data.HolidayFee || 0,
      HalfDayPrice: data.HalfDayPrice || 0,
      FullDayPrice: data.FullDayPrice || 0,
      AirportSurcharge: data.AirportSurcharge || 0,
      OperatingCompany: data.OperatingCompany || '',
      Active: true,
      Notes: data.Notes || '',
      ClientID: data.ClientID || '',
      ProjectID: data.ProjectID || '',
      ValidFrom: data.ValidFrom || '',
      ValidTo: data.ValidTo || '',
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
      name: entity.Name,
      category: entity.Category,
      vehicleType: entity.VehicleType,
      serviceType: entity.ServiceType || 'Dispo',
      basePrice: entity.BasePrice,
      includedKm: parseFloat(entity.IncludedKm) || 0,
      includedHours: parseFloat(entity.IncludedHours) || 0,
      extraKmRate: entity.ExtraKmRate,
      extraHourRate: entity.ExtraHourRate,
      waitRate: entity.WaitRate,
      nightFee: entity.NightFee,
      holidayFee: entity.HolidayFee,
      halfDayPrice: entity.HalfDayPrice,
      fullDayPrice: entity.FullDayPrice,
      airportSurcharge: entity.AirportSurcharge,
      operatingCompany: entity.OperatingCompany,
      active: entity.Active === 'true' || entity.Active === true,
      notes: entity.Notes,
      clientId: entity.ClientID,
      projectId: entity.ProjectID,
      validFrom: entity.ValidFrom,
      validTo: entity.ValidTo,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetRateCards(clientId) {
  if (clientId) {
    return RateCardRepository.getByClient(clientId).map(RateCardRepository.toDTO);
  }
  return RateCardRepository.getAll().map(RateCardRepository.toDTO);
}

function apiCreateRateCard(data) {
  if (!data.VehicleType) throw new ValidationError('VehicleType is required');
  if (!data.ServiceType) data.ServiceType = 'Dispo';
  const entity = RateCardRepository.create(data);
  return RateCardRepository.toDTO(entity);
}

function apiUpdateRateCard(id, changes) {
  const entity = RateCardRepository.getById(id);
  if (!entity) throw new NotFoundError('RateCard', id);
  RateCardRepository.update(id, changes);
  return RateCardRepository.toDTO(RateCardRepository.getById(id));
}

function apiDeleteRateCard(id) {
  const entity = RateCardRepository.getById(id);
  if (!entity) throw new NotFoundError('RateCard', id);
  _softDelete(RateCardRepository.SHEET, id);
  _dispatchEvent({ type: 'ratecard.deleted', entity: 'RateCard', entityId: id });
  return { success: true };
}

/**
 * Diagnostic: trace why a RateCard lookup fails for a given service.
 * Returns detailed info about the service, client, project, and all matching/failing RateCards.
 */
function apiDebugRateCardLookup(serviceId) {
  const service = ServiceRepository.getById(serviceId);
  if (!service) return { error: 'Service not found: ' + serviceId };

  const project = ProjectRepository.getById(service.ProjectID);
  const client = project ? ClientRepository.getById(project.ClientID) : null;

  const vehicleType = service.VehicleType || (() => {
    if (service.VehicleID) {
      const v = VehicleRepository.getById(service.VehicleID);
      return v ? v.Type : 'Van';
    }
    return 'Van';
  })();
  const serviceType = service.ServiceType || 'Dispo';

  // Get ALL rate cards for this client (regardless of Active/VehicleType/ServiceType)
  const allCardsForClient = client ? RateCardRepository.getByClient(client.ID) : [];

  // Also get ALL rate cards globally
  const allCards = RateCardRepository.getAll();

  // Detailed filter breakdown for each card
  const cardDiagnostics = allCardsForClient.map(c => {
    const isActive = c.Active === true || c.Active === 'true' || c.Active === 'TRUE' || c.Active === 'True';
    const vtMatch = c.VehicleType === vehicleType;
    const stMatch = c.ServiceType === serviceType;
    return {
      id: c.ID,
      name: c.Name,
      ClientID: c.ClientID,
      ProjectID: c.ProjectID,
      VehicleType: c.VehicleType,
      ServiceType: c.ServiceType,
      Active: c.Active,
      ActiveType: typeof c.Active,
      isActive: isActive,
      VehicleTypeMatch: vtMatch,
      ServiceTypeMatch: stMatch,
      BasePrice: c.BasePrice,
      FullDayPrice: c.FullDayPrice,
      HalfDayPrice: c.HalfDayPrice,
      IncludedKm: c.IncludedKm,
      IncludedHours: c.IncludedHours
    };
  });

  return {
    service: {
      id: service.ID,
      ProjectID: service.ProjectID,
      VehicleType: service.VehicleType,
      VehicleID: service.VehicleID,
      ServiceType: service.ServiceType,
      resolvedVehicleType: vehicleType,
      resolvedServiceType: serviceType
    },
    project: project ? { id: project.ID, ClientID: project.ClientID, Name: project.Name } : null,
    client: client ? { id: client.ID, Name: client.Name } : null,
    totalRateCardsInSheet: allCards.length,
    rateCardsForClient: allCardsForClient.length,
    cardDiagnostics: cardDiagnostics,
    // Also try the actual lookup
    lookupResult: (() => {
      try {
        const found = RateCardRepository.getByClientAndType(client ? client.ID : '', service.ProjectID, vehicleType, serviceType);
        return found ? { found: true, id: found.ID } : { found: false };
      } catch (e) {
        return { found: false, error: e.message };
      }
    })()
  };
}
