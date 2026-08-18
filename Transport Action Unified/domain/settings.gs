// ============================================================================
// SETTINGS.GS — Key-Value store para configuración del sistema
// ============================================================================

const SettingsRepository = {
  SHEET: SHEETS.Settings,

  /**
   * Obtener valor por key
   */
  get(key) {
    const settings = _getAll(this.SHEET);
    const row = settings.find(s => s.Key === key);
    return row ? row.Value : null;
  },

  /**
   * Obtener valor como tipo específico
   */
  getAsNumber(key) {
    const val = this.get(key);
    return val !== null ? Number(val) : null;
  },

  getAsBoolean(key) {
    const val = this.get(key);
    return val === 'true' || val === true;
  },

  /**
   * Obtener múltiples settings por categoría
   */
  getByCategory(category) {
    const settings = _getAll(this.SHEET);
    return settings.filter(s => s.Category === category);
  },

  /**
   * Obtener todas las settings como objeto
   */
  getAll() {
    const settings = _getAll(this.SHEET);
    const result = {};
    settings.forEach(s => { result[s.Key] = s.Value; });
    return result;
  },

  /**
   * Crear o actualizar una setting
   */
  set(key, value, category) {
    const settings = _getAll(this.SHEET);
    const existing = settings.find(s => s.Key === key);
    if (existing) {
      return _update(this.SHEET, existing.ID, { Value: String(value) });
    } else {
      return _create(this.SHEET, {
        ID: 'SET-' + Date.now(),
        Key: key,
        Value: String(value),
        Category: category || 'general',
        Description: '',
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      });
    }
  },

  /**
   * Obtener settings de OperatingCompany por company short code
   */
  getCompanyDefaults(companyCode) {
    return {
      ActiveCompany: companyCode,
      IVA: this.getAsNumber('IVA') || 21,
      Currency: this.get('Currency') || 'EUR',
      DriverBaseRate: this.getAsNumber('DriverBaseRate') || 0,
      WaitMinuteRate: this.getAsNumber('WaitMinuteRate') || 0,
      KmExtraRate: this.getAsNumber('KmExtraRate') || 0
    };
  },

  /**
   * Valores por defecto para Settings
   */
  getDefaults() {
    return {
      IVA: 21,
      Currency: 'EUR',
      DriverBaseRate: 150,
      WaitMinuteRate: 25,
      KmExtraRate: 0.30,
      ActiveCompany: 'TA',
      InvoicePrefix: 'INV',
      ServicePrefix: 'SVC'
    };
  }
};

// ============================================================================
// API de settings
// ============================================================================

function apiGetSettings() {
  return SettingsRepository.getAll();
}

function apiSaveSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { success: false, error: 'settings must be an object' };
  }
  Object.entries(settings).forEach(([key, value]) => {
    SettingsRepository.set(key, value);
  });
  return { success: true };
}
