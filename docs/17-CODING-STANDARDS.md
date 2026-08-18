# CODING-STANDARDS.md — Estándares de código

## Nombres

| Concepto | Convención | Ejemplo |
|----------|-----------|---------|
| Repositorios | PascalCase + "Repository" | `ServiceRepository`, `InvoiceRepository` |
| Commands | camelCase verb+noun | `assignDriver`, `validateService` |
| Queries | camelCase calculate/get | `calculateRevenue`, `getCashFlow` |
| Entidades | PascalCase | `Service`, `Invoice`, `Payment` |
| DTOs | PascalCase + "DTO" | `ServiceDTO`, `InvoiceDTO` |
| Enums | PascalCase | `ServiceStatus`, `InvoiceStatus` |
| Errores | PascalCase + "Error" | `BusinessRuleError`, `ValidationError` |
| Funciones privadas | _prefijo | `_generateId()`, `_logAudit()` |
| Funciones públicas | camelCase | `apiGetServices()`, `apiCreateService()` |
| Variables locales | camelCase | `serviceId`, `invoiceTotal` |
| Constantes | UPPER_SNAKE | `DB_SHEET_ID`, `SCHEMA_VERSION` |
| Sheets | PascalCase plural | `Services`, `Invoices`, `Payments` |
| Campos | PascalCase | `OperationalStatus`, `InvoiceNumber` |
| Booleans | prefijo is/has/locked | `Locked`, `Active`, `Normalized` |

---

## Reglas de código

### Nunca acceder a Sheets fuera de Repository

```javascript
// BIEN
function ServiceRepository.getById(id) {
  const sheet = getSheet('Services');
  // ...
}

// MAL
function apiGetService(data) {
  const sheet = getSheet('Services'); // ← directamente
  // ...
}
```

### Nunca modificar estados directamente

```javascript
// BIEN
ServiceCommands.validateService(serviceId);

// MAL
const service = ServiceRepository.getById(serviceId);
service.OperationalStatus = 'Validado';
ServiceRepository.update(serviceId, service); // ← sin validación
```

### Nunca usar getRange() repetidamente

```javascript
// BIEN — leer una vez, modificar memoria, guardar una vez
const data = sheet.getDataRange().getValues();
data[row][col] = newValue;
sheet.getDataRange().setValues(data);

// MAL — leer y guardar celda por celda
for (let i = 0; i < rows; i++) {
  sheet.getRange(i, col).getValue(); // ← N llamadas
  sheet.getRange(i, col).setValue(x); // ← N llamadas
}
```

### Nunca crear IDs fuera de _generateId()

```javascript
// BIEN
const id = _generateId('SVC', operatingCompany);

// MAL
const id = 'SVC-' + Date.now(); // ← no garantiza unicidad
```

### Nunca emitir eventos desde Repository

```javascript
// BIEN — Command despacha evento
function ServiceCommands.validateService(serviceId) {
  // ... lógica ...
  _dispatchEvent({ type: 'service.validated', ... });
}

// MAL — Repository despacha evento
function ServiceRepository.update(id, data) {
  // ... update ...
  _dispatchEvent({ ... }); // ← repository no debería saber de eventos
}
```

### Toda regla de negocio pertenece al Dominio

```javascript
// BIEN — en domain/service.gs
function canValidate(service) {
  return service.OperationalStatus === 'Reportado'
    && hasAcceptedReport(service.ID)
    && service.DriverID
    && service.VehicleID;
}

// MAL — en commands/serviceCommands.gs
if (service.OperationalStatus === 'Reportado' && ...) { // ← regla en command
```

### Separar lectura de escritura

```javascript
// BIEN — Query no modifica nada
function calculateServiceRevenue(serviceId) {
  const breakdown = RevenueBreakdownRepository.getAllByService(serviceId);
  return breakdown.reduce((sum, item) => sum + item.Total, 0);
}

// MAL — Query que modifica
function calculateServiceRevenue(serviceId) {
  const breakdown = RevenueBreakdownRepository.getAllByService(serviceId);
  breakdown.total = breakdown.reduce(...); // ← no persistir derivados
  return breakdown;
}
```

---

## Estructura de un Command

```javascript
function validateService(serviceId) {
  // 1. Cargar aggregate
  const service = ServiceRepository.getById(serviceId);
  if (!service) throw new NotFoundError('Service', serviceId);

  // 2. Validar precondiciones (Business Rules)
  if (!canValidate(service)) {
    throw new BusinessRuleError('No se puede validar', 'S006');
  }

  // 3. Ejecutar efectos
  service.OperationalStatus = 'Validado';
  freezeBreakdowns(serviceId);

  // 4. Persistir vía Repository
  ServiceRepository.update(serviceId, service);

  // 5. Despachar evento
  _dispatchEvent({
    type: 'service.validated',
    entity: 'Service',
    entityId: serviceId,
    user: Session.getActiveUser().getEmail(),
    timestamp: new Date().toISOString(),
    payload: {}
  });

  // 6. Retornar DTO
  return toServiceDTO(service);
}
```

---

## Estructura de un Repository

```javascript
const ServiceRepository = {
  getAll() {
    return _getAll('Services').map(toServiceEntity);
  },

  getById(id) {
    const row = _getById('Services', id);
    return row ? toServiceEntity(row) : null;
  },

  create(data) {
    const entity = {
      ID: _generateId('SVC', data.OperatingCompany),
      ...data,
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    };
    _create('Services', entity);
    return entity;
  },

  update(id, changes) {
    changes.UpdatedAt = new Date();
    _update('Services', id, changes);
  },

  getAllByProject(projectId) {
    return _findByField('Services', 'ProjectID', projectId).map(toServiceEntity);
  }
};
```

---

## Estructura de un DTO

```javascript
function toServiceDTO(entity) {
  return {
    id: entity.ID,
    projectId: entity.ProjectID,
    operationalStatus: entity.OperationalStatus,
    financialStatus: entity.FinancialStatus,
    // ... solo campos que el frontend necesita
  };
}
```

---

## Estructura de un error

```javascript
// Definición
class BusinessRuleError extends DomainError {
  constructor(message, ruleId) {
    super(message, 'BUSINESS_RULE_ERROR');
    this.ruleId = ruleId;
  }
}

// Uso
throw new BusinessRuleError(
  'Servicio no tiene DriverReport aceptado',
  'S006'
);

// Frontend
try {
  await api.validateService(serviceId);
} catch (e) {
  if (e.code === 'BUSINESS_RULE_ERROR') {
    showError(e.message, e.ruleId);
  }
}
```
