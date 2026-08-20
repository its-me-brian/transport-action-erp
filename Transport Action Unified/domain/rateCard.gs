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

  getByClientAndType(clientId, vehicleType, serviceType) {
    const cards = this.getByClient(clientId);
    return cards.find(c => c.VehicleType === vehicleType && c.ServiceType === (serviceType || 'Dispo') && (c.Active === 'true' || c.Active === true));
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
  if (!data.ClientID) throw new ValidationError('ClientID is required');
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
  _delete(RateCardRepository.SHEET, id);
  _dispatchEvent({ type: 'ratecard.deleted', entity: 'RateCard', entityId: id });
  return { success: true };
}
