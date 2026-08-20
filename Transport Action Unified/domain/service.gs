// ============================================================================
// SERVICE.GS — Entidad Service (entidad central del ERP)
// ============================================================================

const ServiceRepository = {
  SHEET: SHEETS.Services,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getAllByProject(projectId) {
    return _find(this.SHEET, row => row.ProjectID === projectId);
  },

  getAllByDriver(driverId) {
    return _find(this.SHEET, row => row.DriverID === driverId);
  },

  getAllByStatus(status) {
    return _find(this.SHEET, row => row.OperationalStatus === status);
  },

  getAllByFinancialStatus(status) {
    return _find(this.SHEET, row => row.FinancialStatus === status);
  },

  getByTransportList(transportListId) {
    return _find(this.SHEET, row => row.TransportListID === transportListId);
  },

  getByClient(clientId) {
    // Services are linked to clients through Projects
    const projects = ProjectRepository.getByClient(clientId);
    const projectIds = projects.map(p => p.ID);
    return _getAll(this.SHEET).filter(s => projectIds.includes(s.ProjectID));
  },

  getByDateRange(startDate, endDate) {
    const services = _getAll(this.SHEET);
    return services.filter(s => {
      const d = new Date(s.Date);
      return d >= new Date(startDate) && d <= new Date(endDate);
    });
  },

  getByCompany(operatingCompany) {
    return _find(this.SHEET, row => row.OperatingCompany === operatingCompany);
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      ProjectID: data.ProjectID || '',
      TransportListID: data.TransportListID || '',
      Date: data.Date || '',
      Time: data.Time || '',
      Production: data.Production || '',
      Section: data.Section || '',
      PassengerName: data.PassengerName || '',
      PassengerRole: data.PassengerRole || '',
      PassengerPhone: data.PassengerPhone || '',
      PassengerDepartment: data.PassengerDepartment || '',
      PickupLines: data.PickupLines ? JSON.stringify(data.PickupLines) : '[]',
      DropoffLines: data.DropoffLines ? JSON.stringify(data.DropoffLines) : '[]',
      FlightInfo: data.FlightInfo || '',
      PickupMapsUrl: data.PickupMapsUrl || '',
      DropoffMapsUrl: data.DropoffMapsUrl || '',
      OriginalTransportDate: data.OriginalTransportDate || '',
      PassengersList: data.PassengersList || '',
      Notes: data.Notes || '',
      DriverID: data.DriverID || '',
      VehicleID: data.VehicleID || '',
      OperationalStatus: 'Importado',
      FinancialStatus: 'Pendiente',
      EstimatedRevenue: data.EstimatedRevenue || '',
      EstimatedCost: data.EstimatedCost || '',
      OperatingCompany: data.OperatingCompany || '',
      Normalized: false,
      StartTime: '',
      EndTime: '',
      KmTotal: '',
      HasDiaria: '',
      IsFestivo: '',
      IsNotturno: '',
      DiariaType: '',
      // New fields for provider/economy model
      ProviderType: data.ProviderType || '',
      ProviderID: data.ProviderID || '',
      ServiceType: data.ServiceType || '',
      SourceType: data.SourceType || 'transport_list',
      SourceReference: data.SourceReference || '',
      VehicleType: data.VehicleType || '',
      CreatedAt: now,
      UpdatedAt: now
    });
  },

  update(id, changes) {
    changes.UpdatedAt = new Date().toISOString();
    return _update(this.SHEET, id, changes);
  },

  toDTO(entity) {
    // Resolve driver name from DriverID
    let driverName = '';
    if (entity.DriverID) {
      const driver = DriverRepository.getById(entity.DriverID);
      if (driver) driverName = driver.Name || '';
    }
    
    // Resolve vehicle type: first from VehicleID (linked vehicle), fallback to entity.VehicleType (imported value)
    let vehicleType = entity.VehicleType || '';
    if (entity.VehicleID) {
      const vehicle = VehicleRepository.getById(entity.VehicleID);
      if (vehicle) vehicleType = vehicle.Type || '';
    }
    
    // Resolve clientId and clientName through Project
    let clientId = '';
    let clientName = '';
    if (entity.ProjectID) {
      const project = ProjectRepository.getById(entity.ProjectID);
      if (project) {
        clientId = project.ClientID || '';
        if (clientId) {
          const client = ClientRepository.getById(clientId);
          if (client) clientName = client.Name || '';
        }
      }
    }
    
    // Resolve provider name
    let providerName = '';
    if (entity.ProviderID) {
      if (entity.ProviderType === 'collaborator') {
        const collaborator = CollaboratorRepository.getById(entity.ProviderID);
        if (collaborator) providerName = collaborator.Name || '';
      } else if (entity.ProviderType === 'internal_driver') {
        const driver = DriverRepository.getById(entity.ProviderID);
        if (driver) providerName = driver.Name || '';
      }
    }
    
    return {
      id: entity.ID,
      projectId: entity.ProjectID,
      clientId: clientId,
      clientName: clientName,
      transportListId: entity.TransportListID,
      date: entity.Date,
      time: entity.Time,
      production: entity.Production,
      section: entity.Section,
      passenger: {
        name: entity.PassengerName,
        role: entity.PassengerRole,
        phone: entity.PassengerPhone,
        department: entity.PassengerDepartment
      },
      route: {
        pickupLines: JSON.parse(entity.PickupLines || '[]'),
        dropoffLines: JSON.parse(entity.DropoffLines || '[]'),
        flightInfo: entity.FlightInfo
      },
      pickupMapsUrl: entity.PickupMapsUrl || '',
      dropoffMapsUrl: entity.DropoffMapsUrl || '',
      originalTransportDate: entity.OriginalTransportDate || '',
      passengersList: entity.PassengersList || '',
      driverId: entity.DriverID,
      driverName: driverName,
      vehicleId: entity.VehicleID,
      vehicleType: vehicleType,
      operationalStatus: entity.OperationalStatus,
      financialStatus: entity.FinancialStatus,
      estimatedRevenue: entity.EstimatedRevenue,
      estimatedCost: entity.EstimatedCost,
      operatingCompany: entity.OperatingCompany,
      normalized: entity.Normalized === 'true' || entity.Normalized === true,
      notes: entity.Notes,
      // Provider fields
      providerType: entity.ProviderType || '',
      providerId: entity.ProviderID || '',
      providerName: providerName,
      serviceType: entity.ServiceType || '',
      sourceType: entity.SourceType || 'transport_list',
      sourceReference: entity.SourceReference || '',
      // Cost fields from DriverReport (populated on report approval)
      startTime: entity.StartTime || '',
      endTime: entity.EndTime || '',
      km: parseFloat(entity.KmTotal) || 0,
      hasDiaria: entity.HasDiaria === 'true' || entity.HasDiaria === true,
      isFestivo: entity.IsFestivo === 'true' || entity.IsFestivo === true,
      isNotturno: entity.IsNotturno === 'true' || entity.IsNotturno === true,
      diariaType: entity.DiariaType || 'none',
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetServices(filters) {
  let services = ServiceRepository.getAll();

  if (filters) {
    if (filters.projectId) services = services.filter(s => s.ProjectID === filters.projectId);
    if (filters.driverId) services = services.filter(s => s.DriverID === filters.driverId);
    if (filters.transportListId) services = services.filter(s => s.TransportListID === filters.transportListId);
    if (filters.status) services = services.filter(s => s.OperationalStatus === filters.status);
    if (filters.financialStatus) services = services.filter(s => s.FinancialStatus === filters.financialStatus);
    if (filters.company) services = services.filter(s => s.OperatingCompany === filters.company);
    if (filters.dateFrom) services = services.filter(s => new Date(s.Date) >= new Date(filters.dateFrom));
    if (filters.dateTo) services = services.filter(s => new Date(s.Date) <= new Date(filters.dateTo));
  }

  return services.map(ServiceRepository.toDTO);
}

function apiGetService(id) {
  const entity = ServiceRepository.getById(id);
  if (!entity) throw new NotFoundError('Service', id);
  return ServiceRepository.toDTO(entity);
}

function apiCreateService(data) {
  if (!data.ProjectID) throw new ValidationError('ProjectID is required');
  if (!data.Date) throw new ValidationError('Date is required');

  const project = ProjectRepository.getById(data.ProjectID);
  if (!project) throw new NotFoundError('Project', data.ProjectID);

  // Default OperatingCompany from project
  if (!data.OperatingCompany) {
    data.OperatingCompany = project.OperatingCompany;
  }

  const entity = ServiceRepository.create(data);
  _dispatchEvent({ type: 'service.imported', entity: 'Service', entityId: entity.ID });
  return ServiceRepository.toDTO(entity);
}

/**
 * Update a single field on a Service.
 * Validates that the service is not locked (Validado/Cerrado).
 * @param {string} serviceId - Service ID
 * @param {string} field - Field name to update
 * @param {*} value - New value
 * @returns {Object} { success, error? }
 */
function apiUpdateServiceField(serviceId, field, value) {
  try {
    const entity = ServiceRepository.getById(serviceId);
    if (!entity) return { success: false, error: 'Service not found: ' + serviceId };

    // Lock check: cannot modify if Validado or Cerrado
    if (entity.OperationalStatus === 'Validado') {
      return { success: false, error: 'Service is validated. Cannot modify.' };
    }
    if (entity.FinancialStatus === 'Cerrado') {
      return { success: false, error: 'Service is closed. Cannot modify.' };
    }

    // Whitelist allowed fields for inline editing
    // NOTE: OperationalStatus and FinancialStatus are NOT here — state changes
    // MUST go through Commands (assignDriver, confirmService, startService, etc.)
    // to enforce state machine rules, preconditions, and audit events.
    // NOTE: DriverID and VehicleID are NOT here — assignment MUST go through
    // assignDriver() which handles ProviderType, ProviderID, Driver.Status side effects.
    const allowedFields = [
      'OperatingCompany', 'Notes',
      'PassengerName', 'PassengerRole', 'PassengerPhone', 'PassengerDepartment',
      'FlightInfo', 'Time', 'Section', 'Production',
      'PickupLines', 'DropoffLines',
      'EstimatedRevenue', 'EstimatedCost',
      'VehicleType',
      'PickupMapsUrl', 'DropoffMapsUrl', 'PassengersList', 'OriginalTransportDate',
      // Report/operational fields — used by WhatsApp parser and ReportsScreen
      'StartTime', 'EndTime', 'KmTotal', 'DiariaType', 'HasDiaria'
    ];

    // Map frontend camelCase names to backend PascalCase column names
    const fieldMap = {
      'startTime': 'StartTime',
      'endTime': 'EndTime',
      'km': 'KmTotal',
      'diariaType': 'DiariaType',
      'hasDiaria': 'HasDiaria',
      'pickupMapsUrl': 'PickupMapsUrl',
      'dropoffMapsUrl': 'DropoffMapsUrl',
      'passengersList': 'PassengersList',
      'originalTransportDate': 'OriginalTransportDate',
    };

    // Resolve field name: frontend camelCase → backend PascalCase
    const resolvedField = fieldMap[field] || field;

    if (!allowedFields.includes(resolvedField)) {
      return { success: false, error: 'Field not editable: ' + field };
    }

    const oldValue = entity[resolvedField];
    const changes = {};
    changes[resolvedField] = value;

    ServiceRepository.update(serviceId, changes);

    _dispatchEvent({
      type: 'service.updated',
      entity: 'Service',
      entityId: serviceId,
      payload: { field: resolvedField, oldValue, newValue: value }
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Delete a service.
 * Only allowed if OperationalStatus is 'Importado' or 'Asignado' (before confirmation).
 * @param {string} serviceId - Service ID
 * @param {string} reason - Optional deletion reason (for audit trail)
 * @returns {Object} { success, error? }
 */
function apiDeleteService(serviceId, reason) {
  try {
    const entity = ServiceRepository.getById(serviceId);
    if (!entity) throw new NotFoundError('Service', serviceId);

    // Only allow deletion before confirmation
    const allowedStatuses = ['Importado', 'Asignado'];
    if (!allowedStatuses.includes(entity.OperationalStatus)) {
      throw new BusinessRuleError(
        'Cannot delete service in status: ' + entity.OperationalStatus + '. Only Importado/Asignado services can be deleted.',
        'S011'
      );
    }

    _delete(ServiceRepository.SHEET, serviceId);

    _dispatchEvent({
      type: 'service.deleted',
      entity: 'Service',
      entityId: serviceId,
      payload: { reason: reason || '', previousStatus: entity.OperationalStatus }
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
