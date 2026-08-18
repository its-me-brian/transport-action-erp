// ============================================================================
// RAPPORTINODRIVER.GS — Entidad RapportinoDriver (rapportino para conductor)
// ============================================================================

const RapportinoDriverRepository = {
  SHEET: SHEETS.RapportinoDrivers,

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

  getBorradorByProjectDriver(projectId, driverId, weekStart, weekEnd, periodType) {
    const items = _find(this.SHEET, row =>
      row.ProjectID === projectId &&
      row.DriverID === driverId &&
      row.Status === 'Borrador' &&
      row.PeriodType === (periodType || 'weekly') &&
      row.WeekStart === weekStart &&
      row.WeekEnd === weekEnd
    );
    return items.length > 0 ? items[0] : null;
  },

  /**
   * Check if ANY draft exists for this project/driver (any week)
   */
  hasAnyBorrador(projectId, driverId) {
    const items = _find(this.SHEET, row =>
      row.ProjectID === projectId &&
      row.DriverID === driverId &&
      row.Status === 'Borrador'
    );
    return items.length > 0 ? items[0] : null;
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      ProjectID: data.ProjectID || '',
      DriverID: data.DriverID || '',
      PeriodType: data.PeriodType || 'weekly',
      PeriodStart: data.PeriodStart || data.WeekStart || '',
      PeriodEnd: data.PeriodEnd || data.WeekEnd || '',
      WeekStart: data.WeekStart || '',
      WeekEnd: data.WeekEnd || '',
      Status: 'Borrador',
      Notes: data.Notes || '',
      CreatedBy: _getActiveUser(),
      CreatedAt: now,
      UpdatedAt: now,
      SentAt: '',
      PaidAt: ''
    });
  },

  update(id, changes) {
    changes.UpdatedAt = new Date().toISOString();
    return _update(this.SHEET, id, changes);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      projectId: entity.ProjectID,
      driverId: entity.DriverID,
      periodType: entity.PeriodType || 'weekly',
      periodStart: entity.PeriodStart || entity.WeekStart || '',
      periodEnd: entity.PeriodEnd || entity.WeekEnd || '',
      weekStart: entity.WeekStart,
      weekEnd: entity.WeekEnd,
      status: entity.Status,
      notes: entity.Notes,
      createdBy: entity.CreatedBy,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt,
      sentAt: entity.SentAt,
      paidAt: entity.PaidAt
    };
  }
};
