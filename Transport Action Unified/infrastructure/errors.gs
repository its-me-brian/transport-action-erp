// ============================================================================
// ERRORS.GS — Errores del dominio
// ============================================================================

class DomainError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DomainError';
    this.code = code || 'DOMAIN_ERROR';
  }
}

class ValidationError extends DomainError {
  constructor(message, field) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}

class BusinessRuleError extends DomainError {
  constructor(message, ruleId) {
    super(message, 'BUSINESS_RULE_ERROR');
    this.name = 'BusinessRuleError';
    this.ruleId = ruleId;
  }
}

class ConcurrencyError extends DomainError {
  constructor(message) {
    super(message, 'CONCURRENCY_ERROR');
    this.name = 'ConcurrencyError';
  }
}

class NotFoundError extends DomainError {
  constructor(entityType, entityId) {
    super(`${entityType} ${entityId} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

class ImmutableError extends DomainError {
  constructor(entityType, entityId) {
    super(`${entityType} ${entityId} is immutable`, 'IMMUTABLE');
    this.name = 'ImmutableError';
  }
}

class AuthorizationError extends DomainError {
  constructor(message) {
    super(message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

// Helper: serializar error para respuesta API
function _serializeError(error) {
  if (error instanceof DomainError) {
    var statusCode = 500;
    if (error instanceof ValidationError) statusCode = 400;
    else if (error instanceof AuthorizationError) statusCode = 403;
    else if (error instanceof NotFoundError) statusCode = 404;
    else if (error instanceof BusinessRuleError) statusCode = 422;
    else if (error instanceof ConcurrencyError) statusCode = 409;
    else if (error instanceof ImmutableError) statusCode = 422;

    return {
      success: false,
      statusCode: statusCode,
      error: {
        type: error.name,
        code: error.code,
        message: error.message,
        ruleId: error.ruleId || undefined,
        field: error.field || undefined,
        entityType: error.entityType || undefined,
        entityId: error.entityId || undefined
      }
    };
  }

  return {
    success: false,
    statusCode: 500,
    error: {
      type: 'SystemError',
      code: 'SYSTEM_ERROR',
      message: error.message || 'Error interno del servidor'
    }
  };
}
