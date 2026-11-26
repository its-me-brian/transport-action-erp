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
      Movements: data.Movements ? JSON.stringify(data.Movements) : '[]',
      Notes: data.Notes || '',
      DriverID: data.DriverID || '',
      VehicleID: data.VehicleID || '',
      OperationalStatus: data.OperationalStatus || (data.DriverID ? 'Asignado' : 'Importado'),
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
      ServiceTypeConfirmed: data.ServiceTypeConfirmed ? 'TRUE' : 'FALSE',
      IsWalking: data.isWalking ? 'TRUE' : 'FALSE',
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

  /**
   * Convierte una fila de Services en el DTO que consume el frontend.
   *
   * `lookups` es opcional y existe por rendimiento. Sin él cada servicio
   * dispara hasta siete lecturas completas de hoja (chofer, vehículo, proyecto,
   * cliente, proveedor y los dos breakdowns); con 62 servicios eso medía ~100 s
   * de listado. `buildLookups()` arma los índices una sola vez por request.
   */
  toDTO(entity, lookups) {
    // `array.map(ServiceRepository.toDTO)` pasa el indice como segundo argumento.
    // Un numero es truthy, asi que `lookups.drivers` explotaba con "Cannot read
    // properties of undefined (reading 'DRV-...')" desde el segundo servicio.
    // Solo se acepta el indice si tiene la forma esperada.
    const lk = lookups ? (lookups.drivers ? lookups : null) : null;

    const lookDriver = (id) => (lk ? lk.drivers[String(id)] || null : DriverRepository.getById(id));
    const lookVehicle = (id) => (lk ? lk.vehicles[String(id)] || null : VehicleRepository.getById(id));
    const lookProject = (id) => (lk ? lk.projects[String(id)] || null : ProjectRepository.getById(id));
    const lookClient = (id) => (lk ? lk.clients[String(id)] || null : ClientRepository.getById(id));
    const lookCollaborator = (id) => (lk ? lk.collaborators[String(id)] || null : CollaboratorRepository.getById(id));

    // Resolve driver name from DriverID
    let driverName = '';
    if (entity.DriverID) {
      const driver = lookDriver(entity.DriverID);
      if (driver) driverName = driver.Name || '';
    }
    
    // Resolve vehicle type: first from VehicleID (linked vehicle), fallback to entity.VehicleType (imported value)
    let vehicleType = entity.VehicleType || '';
    if (entity.VehicleID) {
      const vehicle = lookVehicle(entity.VehicleID);
      if (vehicle) vehicleType = vehicle.Type || '';
    }
    
    // Resolve clientId and clientName through Project
    let clientId = '';
    let clientName = '';
    if (entity.ProjectID) {
      const project = lookProject(entity.ProjectID);
      if (project) {
        clientId = project.ClientID || '';
        if (clientId) {
          const client = lookClient(clientId);
          if (client) clientName = client.Name || '';
        }
      }
    }
    
    // Resolve provider name
    let providerName = '';
    if (entity.ProviderID) {
      if (entity.ProviderType === 'collaborator') {
        const collaborator = lookCollaborator(entity.ProviderID);
        if (collaborator) providerName = collaborator.Name || '';
      } else if (entity.ProviderType === 'internal_driver') {
        const driver = lookDriver(entity.ProviderID);
        if (driver) providerName = driver.Name || '';
      }
    }
    
    let movements = [];
    try {
      movements = JSON.parse(entity.Movements || '[]');
      if (!Array.isArray(movements)) movements = [];
    } catch (e) {
      movements = [];
    }

    return {
      id: entity.ID,
      projectId: entity.ProjectID,
      clientId: clientId,
      clientName: clientName,
      transportListId: entity.TransportListID,
      date: entity.Date,
      time: _normalizeTimeToHHMM(entity.Time),
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
      movements: movements,
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
      serviceTypeConfirmed: entity.ServiceTypeConfirmed === 'TRUE' || entity.ServiceTypeConfirmed === true,
      isWalking: entity.IsWalking === 'TRUE' || entity.IsWalking === true,
      sourceType: entity.SourceType || 'transport_list',
      sourceReference: entity.SourceReference || '',
      // Cost fields from DriverReport (populated on report approval)
      startTime: _normalizeTimeToHHMM(entity.StartTime),
      endTime: _normalizeTimeToHHMM(entity.EndTime),
      km: parseFloat(entity.KmTotal) || 0,
      hasDiaria: entity.HasDiaria === 'true' || entity.HasDiaria === true,
      isFestivo: entity.IsFestivo === 'true' || entity.IsFestivo === true,
      isNotturno: entity.IsNotturno === 'true' || entity.IsNotturno === true,
      diariaType: _normalizeDiariaType(entity.DiariaType),
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt,
      // Revenue breakdown from ServiceRevenueBreakdown sheet
      revenueBreakdown: ServiceEconomics._buildLegacyBreakdown(
        lookups ? (lookups.revenue[String(entity.ID)] || []) : ServiceRevenueBreakdownRepository.getByService(entity.ID), 'Total'),
      // Cost breakdown from ServiceCostBreakdown sheet
      costBreakdown: ServiceEconomics._buildLegacyCostBreakdown(
        lookups ? (lookups.cost[String(entity.ID)] || []) : ServiceCostBreakdownRepository.getByService(entity.ID))
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

/**
 * Índices de las hojas que `toDTO` consulta por servicio.
 *
 * Se arma una sola vez por request: siete lecturas de hoja en vez de siete por
 * servicio. Solo lo usa el listado; el detalle sigue resolviendo por repositorio.
 */
function _buildServiceLookups() {
  const byId = (sheetName) => {
    const map = {};
    _getAll(sheetName).forEach((row) => {
      if (row.ID !== undefined && row.ID !== null && row.ID !== '') map[String(row.ID)] = row;
    });
    return map;
  };
  const byService = (sheetName) => {
    const map = {};
    _getAll(sheetName).forEach((row) => {
      const key = String(row.ServiceID || '');
      if (!key) return;
      (map[key] = map[key] || []).push(row);
    });
    return map;
  };

  return {
    drivers: byId(SHEETS.Drivers),
    vehicles: byId(SHEETS.Vehicles),
    projects: byId(SHEETS.Projects),
    clients: byId(SHEETS.Clients),
    collaborators: byId(SHEETS.Collaborators),
    revenue: byService(SHEETS.ServiceRevenueBreakdown),
    cost: byService(SHEETS.ServiceCostBreakdown)
  };
}

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

  // Un solo armado de índices para todo el listado (ver comentario en toDTO).
  const lookups = _buildServiceLookups();
  return services.map((entity) => ServiceRepository.toDTO(entity, lookups));
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
      'VehicleType', 'ServiceType', 'ServiceTypeConfirmed', 'IsWalking',
      'PickupMapsUrl', 'DropoffMapsUrl', 'PassengersList', 'OriginalTransportDate', 'Movements',
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
      'serviceType': 'ServiceType',
      'serviceTypeConfirmed': 'ServiceTypeConfirmed',
      'vehicleType': 'VehicleType',
      'isWalking': 'IsWalking',
    };

    // Resolve field name: frontend camelCase → backend PascalCase
    // El fieldMap cubre los campos compuestos; para el resto alcanza con
    // capitalizar la primera letra ("time" → "Time", "notes" → "Notes"), así
    // el mismo endpoint acepta el nombre que manda la UI y el de la columna.
    let resolvedField = fieldMap[field] || field;
    if (!allowedFields.includes(resolvedField) && typeof field === 'string' && field) {
      const pascal = field.charAt(0).toUpperCase() + field.slice(1);
      if (allowedFields.includes(pascal)) resolvedField = pascal;
    }

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

    _softDelete(ServiceRepository.SHEET, serviceId);

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

/**
 * ONE-TIME MIGRATION: Fix services stuck in 'Importado' that already have a DriverID.
 * These should be 'Asignado'. Run from Apps Script editor or via API.
 * @returns {Object} { migrated: number, skipped: number }
 */
function migrateImportedServicesWithDriver() {
  var all = ServiceRepository.getAll();
  var migrated = 0;
  var skipped = 0;
  for (var i = 0; i < all.length; i++) {
    var svc = all[i];
    if (svc.OperationalStatus === 'Importado' && svc.DriverID) {
      ServiceRepository.update(svc.ID, { OperationalStatus: 'Asignado' });
      migrated++;
    } else {
      skipped++;
    }
  }
  Logger.log('Migration complete: ' + migrated + ' services migrated, ' + skipped + ' skipped');
  return { migrated: migrated, skipped: skipped };
}
