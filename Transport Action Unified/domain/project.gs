// ============================================================================
// PROJECT.GS — Entidad Project (proyecto = cliente + fechas + company)
// ============================================================================

const ProjectRepository = {
  SHEET: SHEETS.Projects,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getActive() {
    return _find(this.SHEET, row => row.Status === 'Attivo');
  },

  getByStatus(status) {
    return _find(this.SHEET, row => row.Status === status);
  },

  getByClient(clientId) {
    return _find(this.SHEET, row => row.ClientID === clientId);
  },

  getByCompany(operatingCompany) {
    return _find(this.SHEET, row => row.OperatingCompany === operatingCompany);
  },

  getByName(name) {
    const projects = _getAll(this.SHEET);
    return projects.find(p => p.Name === name);
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      ClientID: data.ClientID || '',
      Name: data.Name || '',
      TransportCompany: data.TransportCompany || '',
      OperatingCompany: data.OperatingCompany || '',
      Coordinator: data.Coordinator || '',
      Status: data.Status || 'Nuovo',
      DateFrom: data.DateFrom || '',
      DateTo: data.DateTo || '',
      Notes: data.Notes || '',
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
      clientId: entity.ClientID,
      name: entity.Name,
      transportCompany: entity.TransportCompany || '',
      operatingCompany: entity.OperatingCompany,
      coordinator: entity.Coordinator,
      status: entity.Status,
      dateFrom: entity.DateFrom,
      dateTo: entity.DateTo,
      notes: entity.Notes,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetProjects() {
  return ProjectRepository.getAll().map(ProjectRepository.toDTO);
}

function apiGetProject(id) {
  const entity = ProjectRepository.getById(id);
  if (!entity) throw new NotFoundError('Project', id);
  return ProjectRepository.toDTO(entity);
}

function apiCreateProject(data) {
  var name = data.name || data.Name;
  if (!name) throw new ValidationError('Name is required');
  if (ProjectRepository.getByName(name)) {
    throw new BusinessRuleError('Project with this name already exists', 'PROJECT_DUPLICATE');
  }
  // Normalize field names (frontend sends camelCase)
  var normalizedData = {
    Name: name,
    ClientID: data.clientId || data.ClientID || '',
    TransportCompany: data.transportCompany || data.TransportCompany || '',
    OperatingCompany: data.operatingCompany || data.OperatingCompany || '',
    Coordinator: data.coordinator || data.Coordinator || '',
    Status: data.status || data.Status || 'Nuovo',
    DateFrom: data.dateFrom || data.DateFrom || '',
    DateTo: data.dateTo || data.DateTo || '',
    Notes: data.notes || data.Notes || ''
  };
  const entity = ProjectRepository.create(normalizedData);
  _dispatchEvent({ type: 'project.created', entity: 'Project', entityId: entity.ID });
  return ProjectRepository.toDTO(entity);
}

function apiUpdateProject(id, changes) {
  const entity = ProjectRepository.getById(id);
  if (!entity) throw new NotFoundError('Project', id);
  ProjectRepository.update(id, changes);
  _dispatchEvent({ type: 'project.updated', entity: 'Project', entityId: id, payload: changes });
  return ProjectRepository.toDTO(ProjectRepository.getById(id));
}

function apiDeleteProject(id) {
  const entity = ProjectRepository.getById(id);
  if (!entity) throw new NotFoundError('Project', id);
  _delete(ProjectRepository.SHEET, id);
  _dispatchEvent({ type: 'project.deleted', entity: 'Project', entityId: id });
  return { success: true };
}

// ============================================================================
// PROJECT STATE MACHINE — docs/04-STATE_MACHINES.md
// Nuovo → Preparazione → Attivo → Fatturazione → Incasso → Chiuso → Archiviato
// ============================================================================

/**
 * Enforce project state transition (docs/04-STATE_MACHINES.md).
 * No retroceso allowed (Archiviato is terminal).
 */
function _transitionProjectStatus(entity, targetStatus) {
  const VALID_TRANSITIONS = {
    'Nuovo': 'Preparazione',
    'Preparazione': 'Attivo',
    'Attivo': 'Fatturazione',
    'Fatturazione': 'Incasso',
    'Incasso': 'Chiuso',
    'Chiuso': 'Archiviato'
  };
  const expected = VALID_TRANSITIONS[entity.Status];
  if (expected !== targetStatus) {
    throw new BusinessRuleError(
      'Invalid transition: ' + entity.Status + ' → ' + targetStatus + '. Expected: ' + entity.Status + ' → ' + expected,
      'PROJECT_INVALID_TRANSITION'
    );
  }
  ProjectRepository.update(entity.ID, { Status: targetStatus });
  _dispatchEvent({ type: 'project.statusChanged', entity: 'Project', entityId: entity.ID, payload: { from: entity.Status, to: targetStatus } });
  return ProjectRepository.toDTO(ProjectRepository.getById(entity.ID));
}

function apiPrepararProject(id) {
  const entity = ProjectRepository.getById(id);
  if (!entity) throw new NotFoundError('Project', id);
  return _transitionProjectStatus(entity, 'Preparazione');
}

function apiActivarProject(id) {
  const entity = ProjectRepository.getById(id);
  if (!entity) throw new NotFoundError('Project', id);
  return _transitionProjectStatus(entity, 'Attivo');
}

function apiPasarAFacturacionProject(id) {
  const entity = ProjectRepository.getById(id);
  if (!entity) throw new NotFoundError('Project', id);
  return _transitionProjectStatus(entity, 'Fatturazione');
}

function apiPasarACobroProject(id) {
  const entity = ProjectRepository.getById(id);
  if (!entity) throw new NotFoundError('Project', id);
  return _transitionProjectStatus(entity, 'Incasso');
}

function apiCerrarProject(id) {
  const entity = ProjectRepository.getById(id);
  if (!entity) throw new NotFoundError('Project', id);
  return _transitionProjectStatus(entity, 'Chiuso');
}

/**
 * Archivar proyecto (docs/10-COMMANDS.md).
 * Precondición: Status=Chiuso. Efecto: Status→Archiviato.
 */
function apiArchiveProject(id) {
  const entity = ProjectRepository.getById(id);
  if (!entity) throw new NotFoundError('Project', id);
  return _transitionProjectStatus(entity, 'Archiviato');
}

// ============================================================================
// END PROJECT.GS — Import→Project linking removed (use TransportLists.ProjectID FK)
// ============================================================================
