// ============================================================================
// DRIVER.GS — Entidad Driver (conductor)
// ============================================================================

const DriverRepository = {
  SHEET: SHEETS.Drivers,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getAvailable() {
    return _find(this.SHEET, row => row.Status === 'Disponible');
  },

  getByCompany(operatingCompany) {
    return _find(this.SHEET, row => row.OperatingCompany === operatingCompany);
  },

  getByName(name) {
    const drivers = _getAll(this.SHEET);
    return drivers.find(d => d.Name === name);
  },

  getByCollaborator(collaboratorId) {
    return _find(this.SHEET, row => row.CollaboratorID === collaboratorId);
  },

  getByPhone(phone) {
    const drivers = _getAll(this.SHEET);
    return drivers.find(d => d.Phone === phone || d.WhatsApp === phone);
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      Name: data.Name || '',
      Type: data.Type || 'interno',
      DriverOwnership: data.DriverOwnership || 'own',
      CollaboratorID: data.CollaboratorID || '',
      Phone: data.Phone || '',
      WhatsApp: data.WhatsApp || '',
      Email: data.Email || '',
      IBAN: data.IBAN || '',
      VehiclePreferred: data.VehiclePreferred || '',
      LicenseType: data.LicenseType || '',
      LicenseExpiry: data.LicenseExpiry || '',
      Status: 'Disponible',
      OperatingCompany: data.OperatingCompany || '',
      Notes: data.Notes || '',
      Source: data.Source || 'manual',
      LastImportDate: data.LastImportDate || '',
      LastUsed: '',
      TotalRides: 0,
      CreatedAt: now,
      UpdatedAt: now
    });
  },

  update(id, changes) {
    changes.UpdatedAt = new Date().toISOString();
    return _update(this.SHEET, id, changes);
  },

  incrementRides(id) {
    const driver = this.getById(id);
    if (driver) {
      this.update(id, {
        TotalRides: (parseInt(driver.TotalRides) || 0) + 1,
        LastUsed: new Date().toISOString()
      });
    }
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      name: entity.Name,
      type: entity.Type,
      driverOwnership: entity.DriverOwnership || 'own',
      collaboratorId: entity.CollaboratorID || '',
      phone: entity.Phone,
      whatsapp: entity.WhatsApp,
      email: entity.Email,
      iban: entity.IBAN,
      vehiclePreferred: entity.VehiclePreferred,
      licenseType: entity.LicenseType,
      licenseExpiry: entity.LicenseExpiry,
      status: entity.Status,
      operatingCompany: entity.OperatingCompany,
      notes: entity.Notes,
      source: entity.Source,
      lastImportDate: entity.LastImportDate || '',
      lastUsed: entity.LastUsed,
      totalRides: entity.TotalRides,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetDrivers() {
  return DriverRepository.getAll().map(DriverRepository.toDTO);
}

function apiGetDriver(id) {
  const entity = DriverRepository.getById(id);
  if (!entity) throw new NotFoundError('Driver', id);
  return DriverRepository.toDTO(entity);
}

function apiGetDriversByCollaborator(collaboratorId) {
  if (!collaboratorId) throw new ValidationError('collaboratorId is required');
  return DriverRepository.getByCollaborator(collaboratorId).map(DriverRepository.toDTO);
}

function apiCreateDriver(data) {
  if (!data.Name) throw new ValidationError('Name is required');
  if (!data.Phone) throw new ValidationError('Phone is required');
  const entity = DriverRepository.create(data);
  _dispatchEvent({ type: 'driver.created', entity: 'Driver', entityId: entity.ID });
  return DriverRepository.toDTO(entity);
}

function apiUpdateDriver(id, changes) {
  const entity = DriverRepository.getById(id);
  if (!entity) throw new NotFoundError('Driver', id);
  DriverRepository.update(id, changes);
  _dispatchEvent({ type: 'driver.updated', entity: 'Driver', entityId: id, payload: changes });
  return DriverRepository.toDTO(DriverRepository.getById(id));
}

function apiDeleteDriver(id) {
  const entity = DriverRepository.getById(id);
  if (!entity) throw new NotFoundError('Driver', id);
  const result = _safeDelete('Driver', id);
  if (!result.success) {
    return { success: false, error: result.error, dependencies: result.dependencies };
  }
  _dispatchEvent({ type: 'driver.deleted', entity: 'Driver', entityId: id });
  return { success: true };
}

/**
 * Crea un conductor al vuelo desde el formulario de servicios.
 * Verifica duplicados por teléfono antes de crear.
 * Usa executeWithLock para concurrencia segura.
 *
 * @param {Object} data - { Name, Phone, OperatingCompany? }
 * @returns {Object} { success, driverId, name }
 */
function apiCreateDriverOnTheFly(data) {
  if (!data.Name) throw new ValidationError('Name is required');
  if (!data.Phone) throw new ValidationError('Phone is required');

  return executeWithLock(() => {
    // Verificar duplicados por teléfono
    const existingByPhone = DriverRepository.getByPhone(data.Phone);
    if (existingByPhone) {
      throw new ValidationError(
        'DRIVER_EXISTS: Ya existe un conductor con el teléfono ' + data.Phone +
        ' (' + existingByPhone.Name + '). ID: ' + existingByPhone.ID
      );
    }

    // Crear conductor
    const entity = DriverRepository.create({
      Name: data.Name,
      Phone: data.Phone,
      WhatsApp: data.Phone,
      OperatingCompany: data.OperatingCompany || '',
      Source: 'service_form',
      Notes: 'Creado desde formulario de servicios'
    });

    _dispatchEvent({
      type: 'driver.created',
      entity: 'Driver',
      entityId: entity.ID,
      payload: { source: 'on_the_fly', name: data.Name }
    });

    Logger.log('[DRIVER] Conductor al vuelo creado: ' + entity.ID + ' (' + data.Name + ')');
    return DriverRepository.toDTO(entity);
  }, 'Crear conductor al vuelo: ' + data.Name);
}

/**
 * Cleanup drivers with invalid names (non-driver entries)
 * @returns {Object} { removed: number }
 */
function apiCleanupDrivers() {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
    var sh = ss.getSheetByName(SHEETS.Drivers);
    if (!sh) return { error: 'Drivers sheet not found' };
    
    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { removed: 0 };
    
    var data = sh.getRange(2, 2, lastRow - 1, 1).getValues(); // Column B = name
    var rejectPatterns = /^(ad's|assistant|as per|transport|coordinator|manager|captain|dept|department|office|ops|operations|vacancy|unassigned|tbd|n\/a)/i;
    
    // Get headers to find ID column
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var idCol = headers.indexOf('ID');
    if (idCol === -1) return { error: 'ID column not found' };
    
    var idData = sh.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
    
    var removed = 0;
    for (var i = data.length - 1; i >= 0; i--) {
      var name = String(data[i][0] || '').trim();
      if (!name || rejectPatterns.test(name)) {
        var driverId = String(idData[i][0] || '').trim();
        if (driverId) {
          _softDelete(SHEETS.Drivers, driverId);
          removed++;
        }
      }
    }
    
    return { removed: removed };
  } catch (e) {
    return { error: e.message };
  }
}
