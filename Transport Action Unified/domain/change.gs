/**
 * domain/change.gs
 * 
 * Change tracking for any entity (polymorphic per ERD docs/01-ERD.md).
 * EntityType + EntityID reference any entity in the system.
 * 
 * Features:
 * - Create, read, update, delete changes
 * - Track modifications on any entity (schedule, driver, vehicle, route, other)
 */

const ChangeRepository = {
  SHEET: SHEETS.Changes,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByEntity(entityType, entityId) {
    return _find(this.SHEET, row => row.EntityType === entityType && row.EntityID === entityId);
  },

  getByStatus(status) {
    return _find(this.SHEET, row => row.Status === status);
  },

  create(data) {
    var now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      EntityType: data.EntityType || '',
      EntityID: data.EntityID || '',
      Type: data.Type || 'other',
      Description: data.Description || '',
      Priority: data.Priority || 'Medium',
      DueDate: data.DueDate || '',
      Status: 'Open',
      CreatedBy: data.CreatedBy || _getActiveUser(),
      CreatedAt: now,
      ResolvedAt: '',
      ResolvedBy: '',
      Notes: data.Notes || '',
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
      entityType: entity.EntityType,
      entityId: entity.EntityID,
      type: entity.Type,
      description: entity.Description,
      priority: entity.Priority,
      dueDate: entity.DueDate,
      status: entity.Status,
      createdBy: entity.CreatedBy,
      createdAt: entity.CreatedAt,
      resolvedAt: entity.ResolvedAt,
      resolvedBy: entity.ResolvedBy,
      notes: entity.Notes,
      updatedAt: entity.UpdatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetChanges(data) {
  var changes = ChangeRepository.getAll();
  
  if (data && data.status) {
    changes = changes.filter(function(c) { return c.Status === data.status; });
  }
  if (data && data.entityType && data.entityId) {
    changes = changes.filter(function(c) { return c.EntityType === data.entityType && c.EntityID === data.entityId; });
  }
  if (data && data.entityType) {
    changes = changes.filter(function(c) { return c.EntityType === data.entityType; });
  }
  
  return { changes: changes.map(ChangeRepository.toDTO) };
}

function apiCreateChange(data) {
  if (!data.EntityType) throw new ValidationError('EntityType is required');
  if (!data.EntityID) throw new ValidationError('EntityID is required');
  
  var entity = ChangeRepository.create(data);
  _dispatchEvent({
    type: 'change.created',
    entity: 'Change',
    entityId: entity.ID,
    payload: { entityType: data.EntityType, entityId: data.EntityID, type: data.Type }
  });
  return { success: true, id: entity.ID };
}

function apiUpdateChange(data) {
  var entity = ChangeRepository.getById(data.id);
  if (!entity) throw new NotFoundError('Change', data.id);
  
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  var updates = {};
  
  // Accept both camelCase (frontend) and PascalCase (normalized)
  var status = data.Status || data.status;
  var resolvedBy = data.ResolvedBy || data.resolvedBy;
  var notes = data.Notes || data.notes;
  var priority = data.Priority || data.priority;
  var dueDate = data.DueDate || data.dueDate;
  
  if (status) updates.Status = status;
  if (resolvedBy) updates.ResolvedBy = resolvedBy;
  if (notes) updates.Notes = notes;
  if (priority) updates.Priority = priority;
  if (dueDate) updates.DueDate = dueDate;
  
  if (status === 'Resolved' || status === 'resolved') {
    updates.ResolvedAt = now;
  }
  
  ChangeRepository.update(data.id, updates);

  if (status === 'Resolved' || status === 'resolved') {
    _dispatchEvent({
      type: 'change.resolved',
      entity: 'Change',
      entityId: data.id,
      payload: { entityType: entity.EntityType, entityId: entity.EntityID, resolvedBy: resolvedBy }
    });
  }

  return { success: true };
}

function apiDeleteChange(data) {
  var entity = ChangeRepository.getById(data.id);
  if (!entity) throw new NotFoundError('Change', data.id);
  
  _delete(ChangeRepository.SHEET, data.id);
  return { success: true };
}

/**
 * Resolve a change (docs/10-COMMANDS.md).
 * Precondition: Status=Open. Effect: Status→Resolved.
 */
function apiResolveChange(changeId) {
  var entity = ChangeRepository.getById(changeId);
  if (!entity) throw new NotFoundError('Change', changeId);
  if (entity.Status !== 'Open') {
    throw new BusinessRuleError(
      'Change must be Open to resolve. Current: ' + entity.Status,
      'CHANGE_RESOLVE_PRECONDITION'
    );
  }

  var now = new Date().toISOString();
  ChangeRepository.update(changeId, {
    Status: 'Resolved',
    ResolvedAt: now,
    ResolvedBy: _getActiveUser()
  });

  _dispatchEvent({
    type: 'change.resolved',
    entity: 'Change',
    entityId: changeId,
    payload: { entityType: entity.EntityType, entityId: entity.EntityID }
  });

  return ChangeRepository.toDTO(ChangeRepository.getById(changeId));
}
