// ============================================================================
// DOCUMENT.GS — Entidad Document (archivos asociados a entidades)
// ============================================================================

const DocumentRepository = {
  SHEET: SHEETS.Documents,

  getAll() {
    return _getAll(this.SHEET);
  },

  getById(id) {
    return _getById(this.SHEET, id);
  },

  getByEntity(entityType, entityId) {
    return _find(this.SHEET, row => row.EntityType === entityType && row.EntityID === entityId);
  },

  getByType(documentType) {
    return _find(this.SHEET, row => row.DocumentType === documentType);
  },

  create(data) {
    const now = new Date().toISOString();
    return _create(this.SHEET, {
      ID: '',
      EntityType: data.EntityType || '',
      EntityID: data.EntityID || '',
      DocumentType: data.DocumentType || 'Other',
      Filename: data.Filename || '',
      URL: data.URL || '',
      FileSize: data.FileSize || 0,
      MimeType: data.MimeType || '',
      UploadedBy: _getActiveUser(),
      CreatedAt: now
    });
  },

  delete(id) {
    return _delete(this.SHEET, id);
  },

  toDTO(entity) {
    return {
      id: entity.ID,
      entityType: entity.EntityType,
      entityId: entity.EntityID,
      documentType: entity.DocumentType,
      filename: entity.Filename,
      url: entity.URL,
      fileSize: parseInt(entity.FileSize) || 0,
      mimeType: entity.MimeType,
      uploadedBy: entity.UploadedBy,
      createdAt: entity.CreatedAt
    };
  }
};

// ============================================================================
// API endpoints
// ============================================================================

function apiGetDocuments(filters) {
  let documents = DocumentRepository.getAll();
  if (filters) {
    if (filters.entityType && filters.entityId) {
      documents = DocumentRepository.getByEntity(filters.entityType, filters.entityId);
    }
    if (filters.documentType) {
      documents = documents.filter(d => d.DocumentType === filters.documentType);
    }
  }
  return documents.map(DocumentRepository.toDTO);
}

function apiGetDocument(id) {
  const entity = DocumentRepository.getById(id);
  if (!entity) throw new NotFoundError('Document', id);
  return DocumentRepository.toDTO(entity);
}

function apiCreateDocument(data) {
  if (!data.EntityType) throw new ValidationError('EntityType is required');
  if (!data.EntityID) throw new ValidationError('EntityID is required');
  if (!data.Filename) throw new ValidationError('Filename is required');

  const entity = DocumentRepository.create(data);
  _dispatchEvent({
    type: 'document.created',
    entity: 'Document',
    entityId: entity.ID,
    payload: { entityType: data.EntityType, entityId: data.EntityID, filename: data.Filename }
  });
  return DocumentRepository.toDTO(entity);
}

function apiDeleteDocument(id) {
  const entity = DocumentRepository.getById(id);
  if (!entity) throw new NotFoundError('Document', id);
  DocumentRepository.delete(id);
  _dispatchEvent({
    type: 'document.deleted',
    entity: 'Document',
    entityId: id
  });
  return { success: true };
}
