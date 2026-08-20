// ============================================================================
// MIGRATION_DRIVERRATE_TO_SUPPLIERRATE.GS — Migración DriverRate → SupplierRate
// ============================================================================

/**
 * Migra todos los DriverRate existentes a SupplierRate con SupplierType = 'internal_driver'
 * Se ejecuta una sola vez después de deployar las nuevas entidades.
 * 
 * Mapeo:
 * - DriverRate.DriverID → SupplierRate.SupplierID (con SupplierType = 'internal_driver')
 * - DriverRate.VehicleType → SupplierRate.VehicleType + ServiceType = 'Dispo' (default)
 * - DriverRate.TransferRate → SupplierRate.BaseRate (para Transfer)
 * - DriverRate.HalfDayRate → SupplierRate.BaseRate (para HalfDay/Disposizione)
 * - DriverRate.FullDayRate → SupplierRate.BaseRate (para FullDay/Disposizione)
 * - DriverRate.NightExtra → SupplierRate.NightExtra
 * - DriverRate.HolidayExtra → SupplierRate.HolidayExtra
 * - DriverRate.WaitHourRate → SupplierRate.WaitHourRate
 * - ProjectID: se intenta inferir desde Services del driver, si no 'GLOBAL'
 * - IncludedKm/IncludedHours: 0 (legacy no los tenía)
 * - DiariaPiena/DiariaMezza: 0 (legacy no los tenía)
 */

function migrateDriverRatesToSupplierRates() {
  try {
    var driverRates = DriverRateRepository.getAll();
    var migrated = 0;
    var errors = [];
    var seen = new Set(); // Para evitar duplicados

    driverRates.forEach(function(dr) {
      try {
        var driverId = dr.DriverID;
        var vehicleType = dr.VehicleType || 'Van';
        
        // Determinar ProjectID: buscar en Services del driver
        var projectId = 'GLOBAL';
        var services = ServiceRepository.getAllByDriver(driverId);
        if (services.length > 0) {
          // Usar el ProjectID más frecuente
          var projectCounts = {};
          services.forEach(function(s) {
            if (s.ProjectID) {
              projectCounts[s.ProjectID] = (projectCounts[s.ProjectID] || 0) + 1;
            }
          });
          var maxCount = 0;
          Object.keys(projectCounts).forEach(function(pid) {
            if (projectCounts[pid] > maxCount) {
              maxCount = projectCounts[pid];
              projectId = pid;
            }
          });
        }

        var operatingCompany = 'TA';
        if (services.length > 0 && services[0].OperatingCompany) {
          operatingCompany = services[0].OperatingCompany;
        } else {
          var driver = DriverRepository.getById(driverId);
          if (driver && driver.OperatingCompany) {
            operatingCompany = driver.OperatingCompany;
          }
        }

        // Crear SupplierRate para cada tipo de servicio relevante
        var serviceTypes = ['Transfer', 'Dispo'];
        
        serviceTypes.forEach(function(serviceType) {
          var baseRate = 0;
          if (serviceType === 'Transfer') {
            baseRate = parseFloat(dr.TransferRate) || 0;
          } else {
            // Disposizione usa HalfDayRate o FullDayRate
            baseRate = parseFloat(dr.HalfDayRate) || parseFloat(dr.FullDayRate) || 0;
          }

          // Skip si no hay rate configurado
          if (baseRate === 0 && parseFloat(dr.NightExtra) === 0 && parseFloat(dr.HolidayExtra) === 0) {
            return;
          }

          // Clave única para evitar duplicados
          var key = driverId + '|' + projectId + '|' + serviceType + '|' + vehicleType;
          if (seen.has(key)) return;
          seen.add(key);

          SupplierRateRepository.create({
            SupplierType: 'internal_driver',
            SupplierID: driverId,
            ProjectID: projectId,
            ServiceType: serviceType,
            VehicleType: vehicleType,
            BaseRate: baseRate,
            IncludedKm: 0,           // Legacy no tenía
            IncludedHours: 0,        // Legacy no tenía
            ExtraKmRate: 0,          // Legacy no tenía
            ExtraHourRate: 0,        // Legacy no tenía
            DiariaPiena: 0,          // Legacy no tenía
            DiariaMezza: 0,          // Legacy no tenía
            NightExtra: parseFloat(dr.NightExtra) || 0,
            HolidayExtra: parseFloat(dr.HolidayExtra) || 0,
            WaitHourRate: parseFloat(dr.WaitHourRate) || 0,
            ValidFrom: '',
            ValidTo: '',
            Active: dr.Active === 'true' || dr.Active === true,
            OperatingCompany: operatingCompany
          });

          migrated++;
        });

      } catch (e) {
        errors.push('DriverRate ' + dr.ID + ': ' + e.message);
      }
    });

    var result = {
      success: true,
      migrated: migrated,
      errors: errors,
      message: 'Migrados ' + migrated + ' SupplierRates desde ' + driverRates.length + ' DriverRates'
    };

    if (errors.length > 0) {
      result.success = false;
      result.message += '. Errores: ' + errors.join('; ');
    }

    Logger.log('Migration result: ' + JSON.stringify(result));
    return result;

  } catch (e) {
    Logger.log('Migration failed: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Verifica la migración comparando conteos
 */
function verifyMigration() {
  var driverRates = DriverRateRepository.getAll().filter(function(r) {
    return r.Active === 'true' || r.Active === true;
  });
  
  var supplierRates = SupplierRateRepository.getAll().filter(function(r) {
    return r.SupplierType === 'internal_driver' && (r.Active === 'true' || r.Active === true);
  });

  var byDriver = {};
  supplierRates.forEach(function(sr) {
    byDriver[sr.SupplierID] = (byDriver[sr.SupplierID] || 0) + 1;
  });

  return {
    driverRatesActive: driverRates.length,
    supplierRatesInternalDriver: supplierRates.length,
    uniqueDriversMigrated: Object.keys(byDriver).length,
    breakdownByDriver: byDriver
  };
}

/**
 * Rollback: elimina todos los SupplierRate creados por migración (SupplierType=internal_driver)
 * SOLO USAR SI HAY PROBLEMAS GRAVES
 */
function rollbackMigration() {
  try {
    var supplierRates = SupplierRateRepository.getAll().filter(function(r) {
      return r.SupplierType === 'internal_driver';
    });
    
    var deleted = 0;
    supplierRates.forEach(function(sr) {
      _delete(SupplierRateRepository.SHEET, sr.ID);
      deleted++;
    });

    return { success: true, deleted: deleted };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// API endpoint
function apiMigrateDriverRatesToSupplierRates() {
  return migrateDriverRatesToSupplierRates();
}

function apiVerifyMigration() {
  return verifyMigration();
}