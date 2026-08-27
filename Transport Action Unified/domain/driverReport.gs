// ============================================================================
// DRIVERREPORT.GS — Entidad DriverReport (reporte del conductor)
// ============================================================================

const DriverReportRepository = {
  SHEET: SHEETS.DriverReports,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByService(serviceId) {
    return _find(this.SHEET, row => row.ServiceID === serviceId);
  },

  /**
   * Obtener el reporte activo (no locked) para un servicio
   */
  getActiveByService(serviceId) {
    const reports = this.getByService(serviceId);
    return reports.find(r => r.Locked !== 'true' && r.Locked !== true);
  },

  /**
   * Obtener todos los reportes de un servicio (versiones)
   */
  getAllByVersion(serviceId) {
    const reports = this.getByService(serviceId);
    return reports.sort((a, b) => (parseInt(a.Version) || 0) - (parseInt(b.Version) || 0));
  },

  /**
   * Obtener siguiente versión para un servicio
   */
  getNextVersion(serviceId) {
    const reports = this.getByService(serviceId);
    if (reports.length === 0) return 1;
    const maxVersion = Math.max(...reports.map(r => parseInt(r.Version) || 0));
    return maxVersion + 1;
  },

  create(data) {
    const now = new Date().toISOString();
    const version = data.Version || this.getNextVersion(data.ServiceID);
    return _create(this.SHEET, {
      ID: '',
      Source: data.Source || '',
      ServiceID: data.ServiceID || '',
      DriverID: data.DriverID || '',
      Version: version,
      PreviousReportID: data.PreviousReportID || '',
      // Cost fields from WhatsApp parsing
      StartTime: data.StartTime || '',
      EndTime: data.EndTime || '',
      KmTotal: parseFloat(data.KmTotal) || 0,
      HasDiaria: data.HasDiaria || false,
      IsFestivo: data.IsFestivo || false,
      IsNotturno: data.IsNotturno || false,
      DiariaType: data.DiariaType || 'none',
      // Extra costs
      KmExtra: parseFloat(data.KmExtra) || 0,
      HoursExtra: parseFloat(data.HoursExtra) || 0,
      Parking: parseFloat(data.Parking) || 0,
      Tolls: parseFloat(data.Tolls) || 0,
      Fuel: parseFloat(data.Fuel) || 0,
      WaitMinutes: parseFloat(data.WaitMinutes) || 0,
      Notes: data.Notes || '',
      Status: 'Pendiente',
      ApprovedBy: '',
      ApprovedDate: '',
      RejectedReason: '',
      Locked: false,
      SubmittedAt: '',
      CreatedAt: now
    });
  },

  update(id, changes) {
    return _update(this.SHEET, id, changes);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      source: entity.Source || '',
      serviceId: entity.ServiceID,
      driverId: entity.DriverID,
      version: parseInt(entity.Version) || 1,
      previousReportId: entity.PreviousReportID,
      // Cost fields
      startTime: entity.StartTime || '',
      endTime: entity.EndTime || '',
      km: parseFloat(entity.KmTotal) || 0,
      hasDiaria: entity.HasDiaria === 'true' || entity.HasDiaria === true,
      isFestivo: entity.IsFestivo === 'true' || entity.IsFestivo === true,
      isNotturno: entity.IsNotturno === 'true' || entity.IsNotturno === true,
      diariaType: entity.DiariaType || 'none',
      // Extra costs
      kmExtra: parseFloat(entity.KmExtra) || 0,
      hoursExtra: parseFloat(entity.HoursExtra) || 0,
      parking: parseFloat(entity.Parking) || 0,
      tolls: parseFloat(entity.Tolls) || 0,
      fuel: parseFloat(entity.Fuel) || 0,
      waitMinutes: parseFloat(entity.WaitMinutes) || 0,
      notes: entity.Notes,
      status: entity.Status,
      approvedBy: entity.ApprovedBy,
      approvedDate: entity.ApprovedDate,
      rejectedReason: entity.RejectedReason,
      locked: entity.Locked === 'true' || entity.Locked === true,
      submittedAt: entity.SubmittedAt,
      createdAt: entity.CreatedAt,
      // Calculados
      totalExtras: (parseFloat(entity.Parking) || 0) +
                   (parseFloat(entity.Tolls) || 0) +
                   (parseFloat(entity.Fuel) || 0)
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetDriverReports(serviceId) {
  if (serviceId) {
    return DriverReportRepository.getByService(serviceId)
      .map(DriverReportRepository.toDTO);
  }
  return DriverReportRepository.getAll()
    .map(DriverReportRepository.toDTO);
}

function apiGetDriverReport(id) {
  const entity = DriverReportRepository.getById(id);
  if (!entity) throw new NotFoundError('DriverReport', id);
  return DriverReportRepository.toDTO(entity);
}

function apiGetActiveDriverReport(serviceId) {
  const report = DriverReportRepository.getActiveByService(serviceId);
  return report ? DriverReportRepository.toDTO(report) : null;
}
