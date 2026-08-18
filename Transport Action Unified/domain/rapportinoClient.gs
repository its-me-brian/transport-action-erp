// ============================================================================
// RAPPORTINOCLIENT.GS — Entidad RapportinoClient (rapportino para cliente)
// ============================================================================

const RapportinoClientRepository = {
  SHEET: SHEETS.RapportinoClients,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getAllByProject(projectId) {
    return _find(this.SHEET, row => row.ProjectID === projectId);
  },

  getAllByClient(clientId) {
    return _find(this.SHEET, row => row.ClientID === clientId);
  },

  getBorradorByProjectClient(projectId, clientId, periodStart, periodEnd, periodType) {
    const items = _find(this.SHEET, row =>
      row.ProjectID === projectId &&
      row.ClientID === clientId &&
      row.Status === 'Borrador' &&
      row.PeriodType === (periodType || 'weekly') &&
      row.PeriodStart === periodStart &&
      row.PeriodEnd === periodEnd
    );
    return items.length > 0 ? items[0] : null;
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      ProjectID: data.ProjectID || '',
      ClientID: data.ClientID || '',
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
      AcceptedAt: ''
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
      clientId: entity.ClientID,
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
      acceptedAt: entity.AcceptedAt
    };
  }
};
