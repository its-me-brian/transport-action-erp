// ============================================================================
// API.GS — Router central de endpoints
// ============================================================================

/**
 * Normaliza action names: apiGetXxx → getXxx, apiCreateXxx → createXxx
 */
function _normalizeAction(action) {
  if (action && action.indexOf('api') === 0) {
    return action.charAt(3).toLowerCase() + action.slice(4);
  }
  return action;
}

// ============================================================================
// FIELD NORMALIZATION — camelCase (frontend) → PascalCase (backend sheets)
// ============================================================================

/**
 * Mapas de campos por entidad: camelCase → PascalCase.
 * Incluye SOLO campos que el frontend envía y el backend espera.
 * Campos no listados se pasan sin modificar.
 */
var FIELD_MAPS = {
  client: {
    name: 'Name', type: 'Type', vat: 'VAT', address: 'Address',
    phone: 'Phone', email: 'Email', paymentTerms: 'PaymentTerms',
    notes: 'Notes', active: 'Active', operatingCompany: 'OperatingCompany',
    currency: 'Currency', status: 'Status'
  },
  driver: {
    name: 'Name', phone: 'Phone', whatsapp: 'WhatsApp',
    vehiclePreferred: 'VehiclePreferred', notes: 'Notes',
    status: 'Status', email: 'Email', type: 'Type',
    collaboratorId: 'CollaboratorID', iban: 'Iban',
    licenseType: 'LicenseType', licenseExpiry: 'LicenseExpiry',
    operatingCompany: 'OperatingCompany', source: 'Source'
  },
  vehicle: {
    plate: 'Plate', brand: 'Brand', model: 'Model', type: 'Type',
    ownership: 'Ownership', insuranceExpiry: 'InsuranceExpiry',
    inspectionExpiry: 'InspectionExpiry', capacity: 'Capacity',
    status: 'Status', driverDefault: 'DriverDefault',
    operatingCompany: 'OperatingCompany', notes: 'Notes'
  },
  contact: {
    clientId: 'ClientID', name: 'Name', role: 'Role',
    phone: 'Phone', email: 'Email', whatsapp: 'WhatsApp',
    notes: 'Notes', active: 'Active'
  },
  collaborator: {
    name: 'Name', vat: 'VAT', address: 'Address',
    phone: 'Phone', email: 'Email', paymentTerms: 'PaymentTerms',
    notes: 'Notes', active: 'Active', operatingCompany: 'OperatingCompany'
  },
  supplierRate: {
    supplierType: 'SupplierType', supplierId: 'SupplierID',
    projectId: 'ProjectID', serviceType: 'ServiceType',
    vehicleType: 'VehicleType', baseRate: 'BaseRate',
    includedKm: 'IncludedKm', includedHours: 'IncludedHours',
    extraKmRate: 'ExtraKmRate', extraHourRate: 'ExtraHourRate',
    diariaPiena: 'DiariaPiena', diariaMezza: 'DiariaMezza',
    nightExtra: 'NightExtra', holidayExtra: 'HolidayExtra',
    waitHourRate: 'WaitHourRate', validFrom: 'ValidFrom',
    validTo: 'ValidTo', active: 'Active', operatingCompany: 'OperatingCompany'
  },
  driverRate: {
    driverId: 'DriverID', vehicleType: 'VehicleType',
    transferRate: 'TransferRate', halfDayRate: 'HalfDayRate',
    fullDayRate: 'FullDayRate', nightExtra: 'NightExtra',
    holidayExtra: 'HolidayExtra', waitHourRate: 'WaitHourRate',
    active: 'Active'
  },
  rateCard: {
    name: 'Name', category: 'Category', vehicleType: 'VehicleType',
    basePrice: 'BasePrice', extraKmRate: 'ExtraKmRate',
    extraHourRate: 'ExtraHourRate', waitRate: 'WaitRate',
    nightFee: 'NightFee', holidayFee: 'HolidayFee',
    halfDayPrice: 'HalfDayPrice', fullDayPrice: 'FullDayPrice',
    airportSurcharge: 'AirportSurcharge', operatingCompany: 'OperatingCompany',
    active: 'Active', notes: 'Notes', clientId: 'ClientID',
    projectId: 'ProjectID', validFrom: 'ValidFrom', validTo: 'ValidTo',
    includedKm: 'IncludedKm', includedHours: 'IncludedHours'
  },
  project: {
    name: 'Name', status: 'Status', dateFrom: 'DateFrom',
    dateTo: 'DateTo', transportCompany: 'TransportCompany',
    notes: 'Notes', clientId: 'ClientID', coordinator: 'Coordinator',
    operatingCompany: 'OperatingCompany'
  },
  expense: {
    ownerType: 'OwnerType', ownerId: 'OwnerID', category: 'Category',
    description: 'Description', amount: 'Amount', expenseDate: 'ExpenseDate',
    accountingDate: 'AccountingDate', projectId: 'ProjectID',
    operatingCompany: 'OperatingCompany', notes: 'Notes'
  },
  change: {
    entityType: 'EntityType', entityId: 'EntityID', type: 'Type',
    description: 'Description', priority: 'Priority', dueDate: 'DueDate',
    notes: 'Notes', status: 'Status', createdBy: 'CreatedBy'
  },
  document: {
    entityType: 'EntityType', entityId: 'EntityID', fileName: 'Filename',
    fileUrl: 'FileUrl', mimeType: 'MimeType', uploadedBy: 'UploadedBy'
  },
  invoice: {
    projectId: 'ProjectID', clientId: 'ClientID', dueDate: 'DueDate',
    notes: 'Notes'
  },
  driverAdvance: {
    driverId: 'DriverID', projectId: 'ProjectID', amount: 'Amount',
    notes: 'Notes', status: 'Status', deductedIn: 'DeductedIn'
  }
};

/**
 * Normaliza un objeto: convierte keys camelCase → PascalCase usando el mapa de la entidad.
 * Si no se pasa fieldMap, convierte solo la primera letra (fallback genérico).
 */
function _normalizeToPascal(data, fieldMap) {
  if (!data || typeof data !== 'object') return data;
  var map = fieldMap || {};
  var result = {};
  for (var key in data) {
    if (!data.hasOwnProperty(key)) continue;
    // Preservar token y campos de routing (no normalizar)
    if (key === 'token' || key === 'action') {
      result[key] = data[key];
      continue;
    }
    var pascalKey = map[key] || key;
    result[pascalKey] = data[key];
  }
  return result;
}

/**
 * Resuelve el usuario activo desde el token de la request.
 * Setea ACTIVE_USER global para que _dispatchEvent lo use como fallback.
 *
 * @param {string} token - Session token (de params o data)
 */
function _resolveActiveUser(token) {
  if (!token) return;
  try {
    var user = _findUserByToken(token);
    if (user && user.data) {
      _setActiveUser(user.data[6]); // column 6 = email
    }
  } catch (e) {
    // Silenciar — el fallback en _dispatchEvent usará 'system'
  }
}

/**
 * Helper: verificar permiso usando PERMISSION_MATRIX.
 * Docs: docs/08-PERMISSIONS.md — Matriz explícita sin jerarquía.
 * 
 * @param {Object} data - Request data con token
 * @param {string} permission - Permission string e.g. 'service.validate'
 */
function _checkPermission(data, permission) {
  if (!data || !data.token) {
    throw new ValidationError('Authentication required');
  }
  var err = _requirePermissionAction(data.token, permission);
  if (err) {
    throw new AuthorizationError(err.error);
  }
}

/**
 * Helper: verificar permiso con lista explícita de roles (DEPRECATED).
 * @deprecated Use _checkPermission(data, 'resource.action') instead.
 */
function _checkPermissionExact(data, allowedRoles, description) {
  if (!data || !data.token) {
    throw new ValidationError('Authentication required');
  }
  var err = _requirePermissionExact(data.token, allowedRoles, description);
  if (err) {
    throw new AuthorizationError(err.error);
  }
}

/**
 * Helper: resolver ActorContext desde token.
 * Centraliza la identidad del usuario para commands y auditoría.
 * 
 * @param {string} token - Session token
 * @returns {Object} {userId, username, email, role, driverId?}
 */
function _requireActor(token) {
  var user = _getUserFromToken(token);
  if (!user || user.active !== 'approved') {
    throw new AuthorizationError('Authentication required');
  }
  var actor = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };
  // Resolve driverId for driver users
  if (user.role === 'driver') {
    var drivers = DriverRepository.getAll();
    var match = drivers.find(function(d) {
      return String(d.Email).trim().toLowerCase() === user.email.toLowerCase();
    });
    actor.driverId = match ? match.ID : null;
  }
  return actor;
}

/**
 * Helper: verificar ownership de driver.
 * Throws AuthorizationError if driver tries to access another driver's data.
 */
function _assertDriverOwnership(actor, serviceDriverId) {
  if (actor.role === 'driver') {
    if (!actor.driverId) {
      throw new AuthorizationError('DRIVER_NOT_LINKED: No driver profile linked to this account. Contact coordinator.');
    }
    if (actor.driverId !== serviceDriverId) {
      throw new AuthorizationError('ACCESS_DENIED: You can only access your own services.');
    }
  }
}

/**
 * Endpoint GET — delega al router unificado.
 */
function doGet(e) {
  return _handleRoute(e.parameter, e.parameter);
}

/**
 * Endpoint POST — parsea body JSON y delega al router unificado.
 * gasPost envía action en query string, data en body.
 */
function doPost(e) {
  var params = e.parameter;
  var data = params;

  // Parse body JSON (gasPost sends JSON.stringify(data) as body)
  if (e.postData && e.postData.contents) {
    try {
      var bodyData = JSON.parse(e.postData.contents);
      // Merge: query params (action, token) + body data
      data = Object.assign({}, params, bodyData);
    } catch (ex) {
      // If body isn't valid JSON, treat as-is
    }
  }

  return _handleRoute(params, data);
}

/**
 * Router unificado — recibe params (query string) y data (cuerpo mergeado).
 * GET routes leen de data (que es params para GET), POST routes leen de data (body).
 */
function _handleRoute(params, data) {
  var action = _normalizeAction(params.action);

  // Public actions that don't require user session tokens.
  // driverForm uses a driver link token (not a user session token),
  // so _resolveActiveUser would wastefully try to look it up in Users sheet.
  var PUBLIC_ACTIONS = ['driverForm', 'login', 'loginUser', 'registerUser', 'validateSession', 'healthCheck'];

  // Resolver usuario activo desde token para audit trail (skip for public actions)
  if (PUBLIC_ACTIONS.indexOf(action) === -1) {
    _resolveActiveUser(data.token);
  }

  try {
    // Run pending migrations (lightweight — skips if already at latest version)
    // Wrapped in try/catch so migration errors don't crash the request
    try {
      runMigrations();
    } catch (migErr) {
      Logger.log('Migration error (non-fatal): ' + migErr.message);
    }

    var result;

    switch (action) {
      // =====================================================================
      // AUTH — PUBLIC
      // =====================================================================
      case 'healthCheck':
        result = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'production'
        };
        break;
      case 'login':
      case 'loginUser':
        result = loginUser(data.username, data.password);
        break;
      case 'registerUser':
        result = registerUser(data);
        break;
      case 'validateSession':
        result = validateSession(data.token);
        break;
      case 'logoutUser':
        result = logoutUser(data.token);
        break;

      // =====================================================================
      // USERS — admin only
      // =====================================================================
      case 'getUsers':
        _checkPermission(data, 'userManagement');
        result = umGetUsers(data.token);
        break;
      case 'createUser':
        _checkPermission(data, 'userManagement');
        result = umCreateUser(data.token, data);
        break;
      case 'updateUser':
        _checkPermission(data, 'userManagement');
        result = umUpdateUser(data.token, data.userId, data.updates);
        break;
      case 'deleteUser':
        _checkPermission(data, 'userManagement');
        result = umDeleteUser(data.token, data.userId);
        break;
      case 'approveUser':
        _checkPermission(data, 'userManagement');
        result = umApproveUser(data.token, data.userId);
        break;
      case 'rejectUser':
        _checkPermission(data, 'userManagement');
        result = umRejectUser(data.token, data.userId);
        break;
      case 'updateUserRole':
        _checkPermission(data, 'userManagement');
        result = umUpdateUserRole(data.token, data.userId, data.newRole);
        break;

      // =====================================================================
      // OPERATING COMPANY
      // =====================================================================
      case 'getOperatingCompanies':
        _checkPermission(data, 'operatingCompany.list');
        result = apiGetOperatingCompanies();
        break;
      case 'updateOperatingCompany':
        _checkPermission(data, 'operatingCompany.update');
        result = apiUpdateOperatingCompany(data.id, data);
        break;

      // =====================================================================
      // SETTINGS
      // =====================================================================
      case 'getSettings':
        _checkPermission(data, 'settings.read');
        result = apiGetSettings();
        break;
      case 'saveSettings':
        _checkPermission(data, 'settings.write');
        result = apiSaveSettings(data.settings);
        break;
      case 'getVehicleTypes':
        _checkPermission(data, 'settings.read');
        result = apiGetVehicleTypes();
        break;
      case 'saveVehicleTypes':
        _checkPermission(data, 'settings.write');
        result = apiSaveVehicleTypes(data.types);
        break;
      case 'getServiceTypes':
        _checkPermission(data, 'settings.read');
        result = apiGetServiceTypes();
        break;
      case 'saveServiceTypes':
        _checkPermission(data, 'settings.write');
        result = apiSaveServiceTypes(data.types);
        break;

      // =====================================================================
      // CLIENTS
      // =====================================================================
      case 'getClients':
        _checkPermission(data, 'client.list');
        result = apiGetClients();
        break;
      case 'getClient':
        _checkPermission(data, 'client.list');
        result = apiGetClient(data.id);
        break;
      case 'createClient':
        _checkPermission(data, 'client.create');
        result = apiCreateClient(_normalizeToPascal(data, FIELD_MAPS.client));
        break;
      case 'updateClient':
        _checkPermission(data, 'client.update');
        result = apiUpdateClient(data.id, _normalizeToPascal(data.changes || data, FIELD_MAPS.client));
        break;
      case 'deleteClient':
        _checkPermission(data, 'client.delete');
        result = apiDeleteClient(data.id);
        break;

      // =====================================================================
      // CONTACTS
      // =====================================================================
      case 'getContacts':
        _checkPermission(data, 'contact.list');
        result = apiGetContacts(data.clientId);
        break;
      case 'createContact':
        _checkPermission(data, 'contact.create');
        result = apiCreateContact(_normalizeToPascal(data, FIELD_MAPS.contact));
        break;
      case 'updateContact':
        _checkPermission(data, 'contact.update');
        result = apiUpdateContact(data.id, _normalizeToPascal(data.changes || data, FIELD_MAPS.contact));
        break;
      case 'deleteContact':
        _checkPermission(data, 'contact.delete');
        result = apiDeleteContact(data.id);
        break;

      // =====================================================================
      // PROJECTS
      // =====================================================================
      case 'getProjects':
        _checkPermission(data, 'project.list');
        result = apiGetProjects();
        break;
      case 'getProject':
        _checkPermission(data, 'project.list');
        result = apiGetProject(data.id);
        break;
      case 'createProject':
        _checkPermission(data, 'project.create');
        result = apiCreateProject(_normalizeToPascal(data, FIELD_MAPS.project));
        break;
      case 'updateProject':
        _checkPermission(data, 'project.update');
        result = apiUpdateProject(data.id, _normalizeToPascal(data.changes || data, FIELD_MAPS.project));
        break;
      case 'deleteProject':
        _checkPermission(data, 'project.delete');
        result = apiDeleteProject(data.id);
        break;
      case 'archiveProject':
        _checkPermission(data, 'project.archive');
        result = apiArchiveProject(data.id);
        break;
      case 'prepararProject':
        _checkPermission(data, 'project.preparar');
        result = apiPrepararProject(data.id);
        break;
      case 'activarProject':
        _checkPermission(data, 'project.activar');
        result = apiActivarProject(data.id);
        break;
      case 'pasarAFacturacionProject':
        _checkPermission(data, 'project.pasarAFacturacion');
        result = apiPasarAFacturacionProject(data.id);
        break;
      case 'pasarACobroProject':
        _checkPermission(data, 'project.pasarACobro');
        result = apiPasarACobroProject(data.id);
        break;
      case 'cerrarProject':
        _checkPermission(data, 'project.cerrar');
        result = apiCerrarProject(data.id);
        break;

      // =====================================================================
      // DRIVERS
      // =====================================================================
      case 'getDrivers':
        _checkPermission(data, 'driver.list');
        result = apiGetDrivers();
        break;
      case 'getDriver':
        _checkPermission(data, 'driver.list');
        result = apiGetDriver(data.id);
        break;
      case 'createDriver':
        _checkPermission(data, 'driver.create');
        result = apiCreateDriver(_normalizeToPascal(data, FIELD_MAPS.driver));
        break;
      case 'createDriverOnTheFly':
        _checkPermission(data, 'driver.create');
        result = apiCreateDriverOnTheFly(_normalizeToPascal(data, FIELD_MAPS.driver));
        break;
      case 'updateDriver':
        _checkPermission(data, 'driver.update');
        // Frontend sends {id, fields} — normalize both field names AND values
        result = apiUpdateDriver(data.id, _normalizeToPascal(data.fields || data.changes || data, FIELD_MAPS.driver));
        break;
      case 'deleteDriver':
        _checkPermission(data, 'driver.delete');
        result = apiDeleteDriver(data.id);
        break;
      case 'cleanupDrivers':
        _checkPermission(data, 'driver.cleanup');
        result = apiCleanupDrivers();
        break;

      // =====================================================================
      // VEHICLES
      // =====================================================================
      case 'getVehicles':
        _checkPermission(data, 'vehicle.list');
        result = apiGetVehicles();
        break;
      case 'getVehicle':
        _checkPermission(data, 'vehicle.list');
        result = apiGetVehicle(data.id);
        break;
      case 'createVehicle':
        _checkPermission(data, 'vehicle.create');
        result = apiCreateVehicle(_normalizeToPascal(data, FIELD_MAPS.vehicle));
        break;
      case 'updateVehicle':
        _checkPermission(data, 'vehicle.update');
        result = apiUpdateVehicle(data.id, _normalizeToPascal(data.changes || data, FIELD_MAPS.vehicle));
        break;
      case 'deleteVehicle':
        _checkPermission(data, 'vehicle.delete');
        result = apiDeleteVehicle(data.id);
        break;

      // =====================================================================
      // DRIVER RATES
      // =====================================================================
      case 'getDriverRates':
        _checkPermission(data, 'driverRate.list');
        result = apiGetDriverRates(data.driverId);
        break;
      case 'createDriverRate':
        _checkPermission(data, 'driverRate.create');
        result = apiCreateDriverRate(_normalizeToPascal(data, FIELD_MAPS.driverRate));
        break;
      case 'updateDriverRate':
        _checkPermission(data, 'driverRate.update');
        result = apiUpdateDriverRate(data.id, _normalizeToPascal(data.changes || data, FIELD_MAPS.driverRate));
        break;
      case 'deleteDriverRate':
        _checkPermission(data, 'driverRate.delete');
        result = apiDeleteDriverRate(data.id);
        break;

      // =====================================================================
      // RATE CARDS
      // =====================================================================
      case 'getRateCards':
        _checkPermission(data, 'rateCard.list');
        result = apiGetRateCards(data.clientId);
        break;
      case 'createRateCard':
        _checkPermission(data, 'rateCard.create');
        result = apiCreateRateCard(_normalizeToPascal(data, FIELD_MAPS.rateCard));
        break;
      case 'updateRateCard':
        _checkPermission(data, 'rateCard.update');
        result = apiUpdateRateCard(data.id, _normalizeToPascal(data.changes || data, FIELD_MAPS.rateCard));
        break;
      case 'deleteRateCard':
        _checkPermission(data, 'rateCard.delete');
        result = apiDeleteRateCard(data.id);
        break;

      // =====================================================================
      // TRANSPORT LISTS
      // =====================================================================
      case 'getTransportLists':
        _checkPermission(data, 'transportList.list');
        result = apiGetTransportLists(data.projectId);
        break;
      case 'getTransportList':
        _checkPermission(data, 'transportList.list');
        result = apiGetTransportList(data.id);
        break;
      case 'autoDetectImportTargets':
        _checkPermission(data, 'transportList.import');
        result = apiAutoDetectImportTargets(data.production, data.projectName);
        break;
      case 'uploadTransportListFile':
        _checkPermission(data, 'transportList.upload');
        result = uploadTransportListFile(data.fileData, data.fileName);
        break;
      case 'importTransportListWithProject':
        _checkPermission(data, 'transportList.import');
        result = apiImportTransportListWithProject(data);
        break;
      case 'exportTransportListExcel':
        _checkPermission(data, 'transportList.export');
        result = exportTransportListExcel(data.services, data.fileName);
        break;

      // =====================================================================
      // SERVICES — with driver ownership
      // =====================================================================
      case 'getServices':
        _checkPermission(data, 'service.list');
        // Driver: force filter by own services only
        var _actorServices = _requireActor(data.token);
        if (_actorServices.role === 'driver') {
          if (!_actorServices.driverId) {
            throw new AuthorizationError('DRIVER_NOT_LINKED: No driver profile linked to this account.');
          }
          data.filters = data.filters || {};
          data.filters.driverId = _actorServices.driverId;
        }
        result = apiGetServices(data);
        break;
      case 'getService':
        _checkPermission(data, 'service.list');
        var _svc = ServiceRepository.getById(data.id);
        if (_svc) {
          var _actorGet = _requireActor(data.token);
          _assertDriverOwnership(_actorGet, _svc.DriverID);
        }
        result = apiGetService(data.id);
        break;
      case 'createService':
        _checkPermission(data, 'service.import');
        result = apiCreateService(data);
        break;
      case 'assignDriver':
        _checkPermission(data, 'service.assign');
        result = apiAssignDriver(data.serviceId, data.driverId, data.vehicleId);
        break;
      case 'confirmService':
        _checkPermission(data, 'service.confirm');
        result = apiConfirmService(data.serviceId);
        break;
      case 'startService':
        _checkPermission(data, 'service.start');
        // Driver: verify ownership
        var _actorStart = _requireActor(data.token);
        if (_actorStart.role === 'driver') {
          var _svcStart = ServiceRepository.getById(data.serviceId);
          if (_svcStart) _assertDriverOwnership(_actorStart, _svcStart.DriverID);
        }
        result = apiStartService(data.serviceId);
        break;
      case 'completeService':
        _checkPermission(data, 'service.complete');
        // Driver: verify ownership
        var _actorComplete = _requireActor(data.token);
        if (_actorComplete.role === 'driver') {
          var _svcComplete = ServiceRepository.getById(data.serviceId);
          if (_svcComplete) _assertDriverOwnership(_actorComplete, _svcComplete.DriverID);
        }
        result = apiCompleteService(data.serviceId);
        break;
      case 'validateService':
        _checkPermission(data, 'service.validate');
        result = apiValidateService(data.serviceId);
        break;
      case 'adjustRevenue':
        _checkPermission(data, 'service.adjustRevenue');
        result = apiAdjustRevenue(data.serviceId, data.adjustment);
        break;
      case 'adjustCost':
        _checkPermission(data, 'service.adjustCost');
        result = apiAdjustCost(data.serviceId, data.adjustment);
        break;
      case 'updateServiceField':
        _checkPermission(data, 'service.updateField');
        result = apiUpdateServiceField(data.serviceId, data.field, data.value);
        break;
      case 'deleteService':
        _checkPermission(data, 'service.delete');
        result = apiDeleteService(data.serviceId, data.reason || '');
        break;
      case 'cancelService':
        _checkPermission(data, 'service.delete');
        result = ServiceCommands.cancelService(data.serviceId, data.reason || '');
        break;

      // =====================================================================
      // SERVICE — FINANCIAL FLOW
      // =====================================================================
      case 'facturarService':
        _checkPermission(data, 'service.facturar');
        result = apiFacturarService(data.serviceId);
        break;
      case 'cobrarService':
        _checkPermission(data, 'service.cobrar');
        result = apiCobrarService(data.serviceId);
        break;
      case 'closeService':
        _checkPermission(data, 'service.close');
        result = apiCloseService(data.serviceId);
        break;
      case 'cerrarComercialmente':
        _checkPermission(data, 'service.close');
        result = apiCerrarComercialmente(data.serviceId);
        break;

      // =====================================================================
      // SERVICE — FINANCIAL FLOW (additional transitions)
      // =====================================================================
      case 'confirmActuals':
        _checkPermission(data, 'service.confirmActuals');
        result = apiConfirmActuals(data.serviceId);
        break;
      case 'approveFinancial':
        _checkPermission(data, 'service.approveFinancial');
        result = apiApproveFinancial(data.serviceId);
        break;
      case 'markFacturable':
        _checkPermission(data, 'service.markFacturable');
        result = apiMarkFacturable(data.serviceId);
        break;
      case 'calculateService':
        _checkPermission(data, 'service.markFacturable');
        result = apiCalculateService(data.serviceId);
        break;
      case 'moveToConfrontacion':
        _checkPermission(data, 'service.confirmActuals');
        result = apiMoveToConfrontacion(data.serviceId);
        break;
      case 'moveToRevision':
        _checkPermission(data, 'service.validate');
        result = apiMoveToRevision(data.serviceId);
        break;

      // =====================================================================
      // REVENUE / COST BREAKDOWNS
      // =====================================================================
      case 'getRevenueBreakdowns':
        _checkPermission(data, 'revenueBreakdown.list');
        result = apiGetRevenueBreakdowns(data.serviceId);
        break;
      case 'getCostBreakdowns':
        _checkPermission(data, 'costBreakdown.list');
        result = apiGetCostBreakdowns(data.serviceId);
        break;

      // =====================================================================
      // DRIVER REPORTS — with ownership
      // =====================================================================
      case 'getDriverReports':
        _checkPermission(data, 'driverReport.list');
        // Driver: force filter by own ID, reject if not linked
        var _actorDR = _requireActor(data.token);
        if (_actorDR.role === 'driver') {
          if (!_actorDR.driverId) {
            throw new AuthorizationError('DRIVER_NOT_LINKED: No driver profile linked to this account.');
          }
          data.filters = data.filters || {};
          data.filters.driverId = _actorDR.driverId;
        }
        result = apiGetDriverReports(data.filters);
        break;
      case 'getDriverReport':
        _checkPermission(data, 'driverReport.list');
        // Security: driver can only read their own reports
        var _actorDRGet = _requireActor(data.token);
        if (_actorDRGet.role === 'driver') {
          if (!_actorDRGet.driverId) {
            throw new AuthorizationError('DRIVER_NOT_LINKED: No driver profile linked to this account.');
          }
          var _drReport = apiGetDriverReport(data.id);
          if (_drReport && _drReport.DriverID !== _actorDRGet.driverId) {
            throw new AuthorizationError('ACCESS_DENIED: You can only access your own reports.');
          }
          result = _drReport;
        } else {
          result = apiGetDriverReport(data.id);
        }
        break;
      case 'getActiveDriverReport':
        _checkPermission(data, 'driverReport.list');
        result = apiGetActiveDriverReport(data.serviceId);
        break;
      case 'submitDriverReport':
        _checkPermission(data, 'driverReport.submit');
        // Resolve driverId from token — drivers shouldn't send their own ID
        var _actorSubmit = _requireActor(data.token);
        var _driverIdSubmit = data.driverId;
        if (!_driverIdSubmit) {
          _driverIdSubmit = _actorSubmit.driverId;
        }
        if (!_driverIdSubmit) {
          throw new AuthorizationError('DRIVER_NOT_LINKED: Could not resolve driver from token. Contact coordinator.');
        }
        result = apiCreateDriverReport(data.serviceId, _driverIdSubmit, data.reportData);
        break;
      case 'approveDriverReport':
        _checkPermission(data, 'driverReport.approve');
        result = apiApproveDriverReport(data.reportId);
        break;
case 'rejectDriverReport':
        _checkPermission(data, 'driverReport.reject');
        result = apiRejectDriverReport(data.reportId, data.reason);
        break;

      // =====================================================================
      // RECONCILIATION (confrontación producción ↔ conductor)
      // =====================================================================
      case 'getReconciliations':
        _checkPermission(data, 'reconciliation.check');
        result = apiGetReconciliations(data);
        break;
      case 'getReconciliation':
        _checkPermission(data, 'reconciliation.check');
        result = apiGetReconciliation(data.id);
        break;
      case 'getReconciliationByService':
        _checkPermission(data, 'reconciliation.check');
        result = apiGetReconciliationByService(data.serviceId);
        break;
      case 'getPendingReconciliations':
        _checkPermission(data, 'reconciliation.check');
        result = apiGetPendingReconciliations(data.company);
        break;
      case 'createOrUpdateReconciliation':
        _checkPermission(data, 'reconciliation.update');
        result = apiCreateOrUpdateReconciliation(data.serviceId);
        break;
      case 'resolveReconciliation':
        _checkPermission(data, 'reconciliation.update');
        result = apiResolveReconciliation(data.reconciliationId, data.resolution);
        break;
      case 'autoResolveReconciliation':
        _checkPermission(data, 'reconciliation.update');
        result = apiAutoResolveReconciliation(data.serviceId);
        break;

      // =====================================================================
      // COLLABORATORS (proveedores/subcontratación)
      // =====================================================================
      case 'getCollaborators':
        _checkPermission(data, 'collaborator.list');
        result = apiGetCollaborators(data);
        break;
      case 'getCollaborator':
        _checkPermission(data, 'collaborator.list');
        result = apiGetCollaborator(data.id);
        break;
      case 'createCollaborator':
        _checkPermission(data, 'collaborator.create');
        result = apiCreateCollaborator(_normalizeToPascal(data, FIELD_MAPS.collaborator));
        break;
      case 'updateCollaborator':
        _checkPermission(data, 'collaborator.update');
        result = apiUpdateCollaborator(data.id, _normalizeToPascal(data.changes || data, FIELD_MAPS.collaborator));
        break;
      case 'deleteCollaborator':
        _checkPermission(data, 'collaborator.delete');
        result = apiDeleteCollaborator(data.id);
        break;

      // =====================================================================
      // SUPPLIER RATES (tarifas de proveedor: conductor interno o colaborador)
      // =====================================================================
      case 'getSupplierRates':
        _checkPermission(data, 'supplierRate.list');
        result = apiGetSupplierRates(data);
        break;
      case 'getSupplierRate':
        _checkPermission(data, 'supplierRate.list');
        result = apiGetSupplierRate(data.id);
        break;
      case 'createSupplierRate':
        _checkPermission(data, 'supplierRate.create');
        result = apiCreateSupplierRate(_normalizeToPascal(data, FIELD_MAPS.supplierRate));
        break;
      case 'updateSupplierRate':
        _checkPermission(data, 'supplierRate.update');
        result = apiUpdateSupplierRate(data.id, _normalizeToPascal(data.changes || data, FIELD_MAPS.supplierRate));
        break;
      case 'deleteSupplierRate':
        _checkPermission(data, 'supplierRate.delete');
        result = apiDeleteSupplierRate(data.id);
        break;

      // =====================================================================
      // SERVICE ECONOMICS (cálculo dual Revenue/Cost)
      // =====================================================================
      case 'calculateServiceEconomics':
        _checkPermission(data, 'service.economics');
        result = apiCalculateServiceEconomics(data.serviceId, data.driverReport);
        break;
      case 'applyRevenueBreakdown':
        _checkPermission(data, 'service.economics');
        result = apiApplyRevenueBreakdown(data.serviceId, data.driverReport);
        break;
      case 'applyCostBreakdown':
        _checkPermission(data, 'service.economics');
        result = apiApplyCostBreakdown(data.serviceId, data.driverReport);
        break;

      // =====================================================================
      // MIGRATION
      // =====================================================================
      case 'migrateDriverRatesToSupplierRates':
        _checkPermission(data, 'integrationTest');
        result = apiMigrateDriverRatesToSupplierRates();
        break;
      case 'verifyMigration':
        _checkPermission(data, 'integrationTest');
        result = apiVerifyMigration();
        break;

      // =====================================================================
      // RAPPORTINO COLLABORATOR
      // =====================================================================
      case 'getRapportinoCollaborators':
        _checkPermission(data, 'rapportinoCollaborator.list');
        result = apiGetRapportinoCollaborators(data);
        break;
      case 'getRapportinoCollaborator':
        _checkPermission(data, 'rapportinoCollaborator.list');
        result = apiGetRapportinoCollaborator(data.id);
        break;
      case 'getRapportinoCollaboratorItems':
        _checkPermission(data, 'rapportinoCollaborator.list');
        result = apiGetRapportinoCollaboratorItems(data.rapportinoId);
        break;
      case 'createRapportinoCollaborator':
        _checkPermission(data, 'rapportinoCollaborator.create');
        result = apiCreateRapportinoCollaborator(data.projectId, data.collaboratorId, data.periodStart, data.periodEnd, data.periodType);
        break;
      case 'addServiceToRapportinoCollaborator':
        _checkPermission(data, 'rapportinoCollaborator.addService');
        result = apiAddServiceToRapportinoCollaborator(data.rapportinoId, data.serviceId);
        break;
      case 'sendRapportinoCollaborator':
        _checkPermission(data, 'rapportinoCollaborator.send');
        result = apiSendRapportinoCollaborator(data.rapportinoId);
        break;
      case 'acceptRapportinoCollaborator':
        _checkPermission(data, 'rapportinoCollaborator.accept');
        result = apiAcceptRapportinoCollaborator(data.rapportinoId);
        break;
      case 'payRapportinoCollaborator':
        _checkPermission(data, 'rapportinoCollaborator.pay');
        result = apiPayRapportinoCollaborator(data.rapportinoId, data.amount, data.paymentData);
        break;

      // =====================================================================
      // RAPPORTINO CLIENT
      // =====================================================================
      case 'getRapportinoClients':
        _checkPermission(data, 'rapportinoClient.list');
        result = apiGetRapportinoClients(data);
        break;
      case 'createRapportinoClient':
        _checkPermission(data, 'rapportinoClient.create');
        result = apiCreateRapportinoClient(data.projectId, data.clientId, data.weekStart, data.weekEnd, data.periodType);
        break;
      case 'addServiceToRapportino':
        _checkPermission(data, 'rapportinoClient.addService');
        result = apiAddServiceToRapportino(data.rapportinoId, data.serviceId);
        break;
      case 'removeServiceFromRapportino':
        _checkPermission(data, 'rapportinoClient.removeService');
        result = apiRemoveServiceFromRapportino(data.rapportinoId, data.serviceId);
        break;
      case 'reviewRapportinoClient':
        _checkPermission(data, 'rapportinoClient.review');
        result = apiReviewRapportinoClient(data.rapportinoId);
        break;
      case 'sendRapportinoClient':
        _checkPermission(data, 'rapportinoClient.send');
        result = apiSendRapportinoClient(data.rapportinoId);
        break;
      case 'acceptRapportinoClient':
        _checkPermission(data, 'rapportinoClient.accept');
        result = apiAcceptRapportinoClient(data.rapportinoId);
        break;
      case 'rejectRapportinoClient':
        _checkPermission(data, 'rapportinoClient.reject');
        result = apiRejectRapportinoClient(data.rapportinoId, data.reason);
        break;
      case 'facturarRapportino':
        _checkPermission(data, 'rapportinoClient.facturar');
        result = apiFacturarRapportino(data.rapportinoId);
        break;

      // =====================================================================
      // RAPPORTINO DRIVER
      // =====================================================================
      case 'getRapportinoDrivers':
        _checkPermission(data, 'rapportinoDriver.list');
        result = apiGetRapportinoDrivers(data);
        break;
      case 'createRapportinoDriver':
        _checkPermission(data, 'rapportinoDriver.create');
        result = apiCreateRapportinoDriver(data.projectId, data.driverId, data.weekStart, data.weekEnd, data.periodType);
        break;
      case 'reviewRapportinoDriver':
        _checkPermission(data, 'rapportinoDriver.review');
        result = apiReviewRapportinoDriver(data.rapportinoId);
        break;
      case 'sendRapportinoDriver':
        _checkPermission(data, 'rapportinoDriver.send');
        result = apiSendRapportinoDriver(data.rapportinoId);
        break;
      case 'acceptRapportinoDriver':
        _checkPermission(data, 'rapportinoDriver.accept');
        result = apiAcceptRapportinoDriver(data.rapportinoId);
        break;
      case 'rejectRapportinoDriver':
        _checkPermission(data, 'rapportinoDriver.reject');
        result = apiRejectRapportinoDriver(data.rapportinoId, data.reason);
        break;
      case 'payRapportinoDriver':
        _checkPermission(data, 'rapportinoDriver.pay');
        result = apiPayRapportinoDriver(data.rapportinoId, data.amount);
        break;

      // =====================================================================
      // RAPPORTINO ITEMS
      // =====================================================================
      case 'getRapportinoItems':
        _checkPermission(data, 'rapportinoClient.list');
        result = apiGetRapportinoItems(data.rapportinoClientId);
        break;

      // =====================================================================
      // INVOICES
      // =====================================================================
      case 'getInvoices':
        _checkPermission(data, 'invoice.list');
        result = apiGetInvoices(data);
        break;
      case 'getInvoice':
        _checkPermission(data, 'invoice.list');
        result = apiGetInvoice(data.id);
        break;
      case 'createInvoice':
        _checkPermission(data, 'invoice.create');
        result = apiCreateInvoice(_normalizeToPascal(data, FIELD_MAPS.invoice));
        break;
      case 'editInvoice':
        _checkPermission(data, 'invoice.edit');
        result = apiEditInvoice(data.invoiceId, data.changes);
        break;
      case 'emitInvoice':
        _checkPermission(data, 'invoice.emit');
        result = apiEmitInvoice(data.invoiceId);
        break;
      case 'sendInvoice':
        _checkPermission(data, 'invoice.send');
        result = apiSendInvoice(data.invoiceId);
        break;
      case 'voidInvoice':
        _checkPermission(data, 'invoice.void');
        result = apiVoidInvoice(data.invoiceId, data.reason);
        break;

      // =====================================================================
      // INVOICE ITEMS
      // =====================================================================
      case 'getInvoiceItems':
        _checkPermission(data, 'invoice.list');
        result = apiGetInvoiceItems(data.invoiceId);
        break;

      // =====================================================================
      // PAYMENTS
      // =====================================================================
      case 'getPayments':
        _checkPermission(data, 'payment.list');
        result = apiGetPayments(data);
        break;
      case 'getPayment':
        _checkPermission(data, 'payment.list');
        result = apiGetPayment(data.id);
        break;
      case 'registerPayment':
        _checkPermission(data, 'payment.register');
        result = apiRegisterPayment(data.invoiceId, data.paymentData);
        break;
      case 'editPayment':
        _checkPermission(data, 'payment.edit');
        result = apiEditPayment(data.paymentId, data.changes);
        break;
      case 'confirmPayment':
        _checkPermission(data, 'payment.confirm');
        result = apiConfirmPayment(data.paymentId);
        break;
      case 'reconcilePayment':
        _checkPermission(data, 'payment.reconcile');
        result = apiReconcilePayment(data.paymentId);
        break;
      case 'checkDuplicatePayment':
        _checkPermission(data, 'payment.list');
        result = apiCheckDuplicatePayment(data.invoiceId, data.amount, data.paymentDate, data.reference);
        break;
      case 'voidPayment':
        _checkPermission(data, 'payment.void');
        result = apiVoidPayment(data.paymentId, data.reason);
        break;

      // =====================================================================
      // EXPENSES
      // =====================================================================
      case 'getExpenses':
        _checkPermission(data, 'expense.list');
        result = apiGetExpenses(data);
        break;
      case 'getExpense':
        _checkPermission(data, 'expense.list');
        result = apiGetExpense(data.id);
        break;
      case 'createExpense':
        _checkPermission(data, 'expense.create');
        result = apiCreateExpense(data);
        break;
      case 'editExpense':
        _checkPermission(data, 'expense.edit');
        result = apiEditExpense(data.id, data.changes);
        break;
      case 'confirmExpense':
        _checkPermission(data, 'expense.confirm');
        result = apiConfirmExpense(data.id);
        break;
      case 'cancelExpense':
        _checkPermission(data, 'expense.cancel');
        result = apiCancelExpense(data.id);
        break;
      case 'correctExpense':
        _checkPermission(data, 'expense.correct');
        result = apiCorrectExpense(data.id);
        break;

      // =====================================================================
      // CHANGES
      // =====================================================================
      case 'getChanges':
        _checkPermission(data, 'change.list');
        result = apiGetChanges(data);
        break;
      case 'createChange':
        _checkPermission(data, 'change.create');
        result = apiCreateChange(_normalizeToPascal(data, FIELD_MAPS.change));
        break;
      case 'updateChange':
        _checkPermission(data, 'change.update');
        // apiUpdateChange(data) reads fields directly from the data object
        result = apiUpdateChange(_normalizeToPascal(data, FIELD_MAPS.change));
        break;
      case 'deleteChange':
        _checkPermission(data, 'change.delete');
        result = apiDeleteChange(data.id);
        break;
      case 'resolveChange':
        _checkPermission(data, 'change.resolve');
        result = apiResolveChange(data.id);
        break;

      // =====================================================================
      // DOCUMENTS
      // =====================================================================
      case 'getDocuments':
        _checkPermission(data, 'document.list');
        result = apiGetDocuments(data);
        break;
      case 'getDocument':
        _checkPermission(data, 'document.list');
        result = apiGetDocument(data.id);
        break;
      case 'createDocument':
        _checkPermission(data, 'document.create');
        result = apiCreateDocument(_normalizeToPascal(data, FIELD_MAPS.document));
        break;
      case 'deleteDocument':
        _checkPermission(data, 'document.delete');
        result = apiDeleteDocument(data.id);
        break;

      // =====================================================================
      // DRIVER ADVANCES
      // =====================================================================
      case 'getDriverAdvances':
        _checkPermission(data, 'driverAdvance.list');
        result = apiGetDriverAdvances(data);
        break;
      case 'getDriverAdvance':
        _checkPermission(data, 'driverAdvance.list');
        result = apiGetDriverAdvance(data.id);
        break;
      case 'createDriverAdvance':
        _checkPermission(data, 'driverAdvance.create');
        result = apiCreateDriverAdvance(data);
        break;
      case 'updateDriverAdvance':
        _checkPermission(data, 'driverAdvance.update');
        result = apiUpdateDriverAdvance(data.id, _normalizeToPascal(data.changes || data, FIELD_MAPS.driverAdvance));
        break;
      case 'checkDriverPendingAdvances':
        _checkPermission(data, 'driverAdvance.list');
        result = apiCheckDriverPendingAdvances(data.driverId);
        break;

      // =====================================================================
      // DRIVER LINKS (v2 - FASE 15)
      // =====================================================================
      case 'driverForm':
        return _serveDriverForm(data.token);
      case 'getDriverLinks':
        _checkPermission(data, 'driverLink.list');
        result = getDriverLinks(data.filters);
        break;
      case 'generateDriverLink':
        _checkPermission(data, 'driverLink.generate');
        result = generateDriverLink(
          data.driverId, data.projectId,
          data.dateFrom, data.dateTo,
          data.baseUrl, data.fieldsSchema,
          data.linkDurationDays
        );
        break;
      case 'deactivateDriverLink':
        _checkPermission(data, 'driverLink.deactivate');
        result = deactivateDriverLink(data.linkToken);
        break;
      case 'updateDriverLink':
        _checkPermission(data, 'driverLink.update');
        result = updateDriverLink(data.linkToken, data.updates);
        break;
      case 'compareTransportVsDriverLink':
        _checkPermission(data, 'driverLink.compare');
        result = compareTransportVsDriverLink(data.transportService, data.driverLinkService);
        break;
      case 'getDriverLinkEvents':
        _checkPermission(data, 'driverLink.list');
        result = _getDriverLinkEvents(data.linkToken);
        break;

      // =====================================================================
      // DRIVER REPORT INBOX (FASE 15C)
      // =====================================================================
      case 'captureReport':
        _checkPermission(data, 'inbox.capture');
        result = captureReport(
          data.source, data.channel,
          data.driverId, data.projectId,
          data.serviceDate, data.rawData
        );
        break;
      case 'getInboxItems':
        _checkPermission(data, 'inbox.list');
        result = getInboxItems(data.filters);
        break;
      case 'getInboxItem':
        _checkPermission(data, 'inbox.list');
        result = getInboxItem(data.inboxId);
        break;
      case 'normalizeReport':
        _checkPermission(data, 'inbox.normalize');
        result = normalizeReport(data.inboxId, data.normalizedData);
        break;
      case 'submitToReview':
        _checkPermission(data, 'inbox.normalize');
        result = submitToReview(data.inboxId);
        break;
      case 'acceptReport':
        _checkPermission(data, 'inbox.review');
        result = acceptReport(data.inboxId, data.reviewedBy);
        break;
      case 'rejectReport':
        _checkPermission(data, 'inbox.review');
        result = rejectReport(data.inboxId, data.reason, data.reviewedBy);
        break;
      case 'lockReport':
        _checkPermission(data, 'inbox.review');
        result = lockReport(data.inboxId);
        break;

      // =====================================================================
      // DRIVER LINK RESPONSES
      // =====================================================================
      case 'getDriverLinkResponses':
        _checkPermission(data, 'inbox.list');
        result = getDriverLinkResponses(data.filters);
        break;

      // =====================================================================
      // WHATSAPP CAPTURE
      // =====================================================================
      case 'parseWhatsApp':
        _checkPermission(data, 'inbox.list');
        result = parseWhatsAppForCapture(data.text);
        break;
      case 'captureWhatsAppReports':
        _checkPermission(data, 'inbox.normalize');
        result = captureWhatsAppReports(data.reports, data.projectId);
        break;

      // =====================================================================
      // PRESENCE (FASE 15E)
      // =====================================================================
      case 'heartbeat':
        if (!data.token) throw new ValidationError('Authentication required');
        result = apiHeartbeat(data.token, data.userAgent, data.sessionId, data.ipAddress);
        break;
      case 'getActiveUsers':
        _checkPermission(data, 'presence.read');
        result = apiGetActiveUsers(data.timeoutMs);
        break;

      // =====================================================================
      // QUERIES / REPORTS
      // =====================================================================
      case 'getServiceSummaryByProject':
        _checkPermission(data, 'report.serviceSummary');
        result = apiGetServiceSummaryByProject(data.projectId);
        break;
      case 'getServiceSummaryByDriver':
        _checkPermission(data, 'report.serviceSummary');
        result = apiGetServiceSummaryByDriver(data.driverId, data.startDate, data.endDate);
        break;
      case 'getPendingValidation':
        _checkPermission(data, 'report.pendingValidation');
        result = apiGetPendingValidation(data.company);
        break;
      case 'getPendingInvoicing':
        _checkPermission(data, 'report.pendingInvoicing');
        result = apiGetPendingInvoicing(data.company);
        break;
      case 'getProfitByProject':
        _checkPermission(data, 'report.profitProject');
        result = apiGetProfitByProject(data.projectId);
        break;
      case 'getProfitByDriver':
        _checkPermission(data, 'report.profitDriver');
        result = apiGetProfitByDriver(data.driverId, data.startDate, data.endDate);
        break;
      case 'getProfitByCompany':
        _checkPermission(data, 'report.profitCompany');
        result = apiGetProfitByCompany(data.company, data.startDate, data.endDate);
        break;
      case 'getEstimatedVsActual':
        _checkPermission(data, 'report.profitProject');
        result = apiGetEstimatedVsActual(data.projectId);
        break;
      case 'getMainDashboard':
        _checkPermission(data, 'report.dashboard');
        result = apiGetMainDashboard(data.company, data.startDate, data.endDate);
        break;
      case 'getProjectDashboard':
        _checkPermission(data, 'report.projectDashboard');
        result = apiGetProjectDashboard(data.projectId);
        break;
      case 'getDriverDashboard':
        _checkPermission(data, 'report.driverDashboard');
        result = apiGetDriverDashboard(data.driverId, data.startDate, data.endDate);
        break;
      case 'getCashFlow':
        _checkPermission(data, 'report.cashflow');
        result = apiGetCashFlow(data);
        break;

      // =====================================================================
      // AUDIT / ACTIVITY
      // =====================================================================
      case 'getAuditLog':
      case 'apiGetAuditLog':
        _checkPermission(data, 'auditLog.read');
        result = apiGetAuditLog(data.limit);
        break;
      case 'getActivityFeed':
      case 'apiGetActivityFeed':
        _checkPermission(data, 'activityFeed.read');
        result = apiGetActivityFeed(data.limit);
        break;

      // =====================================================================
      // SYSTEM / TESTS
      // =====================================================================
      case 'runIntegrationTest':
        _checkPermission(data, 'integrationTest');
        result = runIntegrationTest();
        break;
      case 'checkInvariants':
        _checkPermission(data, 'invariantCheck');
        result = apiCheckInvariants();
        break;

      // =====================================================================
      // WHATSAPP PARSERS — AUTHENTICATED (utility)
      // =====================================================================
      case 'parseWhatsApp':
        _checkPermission(data, 'service.list');
        result = parseWhatsAppText(data.text);
        break;
      case 'parseDriverReport':
        _checkPermission(data, 'service.list');
        result = parseDriverReport(data.text);
        break;
      case 'parseMultipleDriverReports':
        _checkPermission(data, 'service.list');
        result = parseMultipleDriverReports(data.text);
        break;

      // =====================================================================
      // WHATSAPP BUILDERS — AUTHENTICATED (utility)
      // =====================================================================
      case 'buildDriverWhatsAppMessage':
        _checkPermission(data, 'transportList.list');
        result = buildDriverWhatsAppMessage(data.driverName, data.services, data.dateStr);
        break;
      case 'buildGroupWhatsAppMessage':
        _checkPermission(data, 'transportList.list');
        result = buildGroupWhatsAppMessage(data.services, data.dateStr, data.production);
        break;
      case 'buildAgencyWhatsAppMessage':
        _checkPermission(data, 'transportList.list');
        result = buildAgencyWhatsAppMessage(data.services, data.agencyName, data.dateStr);
        break;

      // =====================================================================
      // EMAIL
      // =====================================================================
      case 'sendTransportListEmail':
        _checkPermission(data, 'transportList.upload');
        result = sendTransportListEmail(data.recipients, data.subject, data.services, data.dateStr, data.production);
        break;
      case 'sendServicesToAgency':
        _checkPermission(data, 'transportList.upload');
        result = sendServicesToAgency(data.recipients, data.agencyName, data.services, data.dateStr, data.notes);
        break;

      default:
        throw new ValidationError('Invalid action: ' + action);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: true, data: result })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify(_serializeError(error))
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
