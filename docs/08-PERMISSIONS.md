# PERMISSIONS.md — Matriz de permisos por rol

## Roles

| Role | Descripción |
|------|------------|
| admin | Acceso total al sistema |
| coordinator | Gestión operativa (servicios, conductores, proyectos) |
| accounting | Gestión financiera (facturas, pagos, gastos) |
| driver | Solo sus servicios y creación de reportes |

---

## Matriz de permisos

### Operativo

| Acción | admin | coordinator | accounting | driver |
|--------|-------|-------------|------------|--------|
| Ver proyectos | ✅ | ✅ | ✅ | ❌ |
| Crear proyectos | ✅ | ✅ | ❌ | ❌ |
| Editar proyectos | ✅ | ✅ | ❌ | ❌ |
| Archivar proyectos | ✅ | ✅ | ❌ | ❌ |
| Importar servicios | ✅ | ✅ | ❌ | ❌ |
| Ver todos los servicios | ✅ | ✅ | ✅ | ❌ |
| Ver sus servicios | ✅ | ✅ | ✅ | ✅ |
| Asignar conductor | ✅ | ✅ | ❌ | ❌ |
| Confirmar servicio | ✅ | ✅ | ❌ | ❌ |
| Iniciar ruta | ✅ | ✅ | ❌ | ✅ |
| Completar servicio | ✅ | ✅ | ❌ | ✅ |
| Validar servicio | ✅ | ✅ | ❌ | ❌ |

### DriverReport

| Acción | admin | coordinator | accounting | driver |
|--------|-------|-------------|------------|--------|
| Crear DriverReport | ✅ | ❌ | ❌ | ✅ |
| Editar DriverReport (Pendiente) | ✅ | ❌ | ❌ | ✅ |
| Enviar DriverReport | ✅ | ❌ | ❌ | ✅ |
| Aprobar DriverReport | ✅ | ✅ | ❌ | ❌ |
| Rechazar DriverReport | ✅ | ✅ | ❌ | ❌ |
| Ver historial de reports | ✅ | ✅ | ❌ | ✅ |

### Rapportinos

| Acción | admin | coordinator | accounting | driver |
|--------|-------|-------------|------------|--------|
| Crear rapportino cliente | ✅ | ✅ | ❌ | ❌ |
| Revisar rapportino cliente | ✅ | ✅ | ❌ | ❌ |
| Enviar rapportino cliente | ✅ | ✅ | ❌ | ❌ |
| Aceptar rapportino cliente | ✅ | ✅ | ✅ | ❌ |
| Facturar rapportino | ✅ | ❌ | ✅ | ❌ |
| Crear rapportino conductor | ✅ | ✅ | ❌ | ❌ |
| Revisar rapportino conductor | ✅ | ✅ | ❌ | ❌ |
| Enviar rapportino conductor | ✅ | ✅ | ❌ | ❌ |
| Pagar rapportino conductor | ✅ | ❌ | ✅ | ❌ |

### Facturación

| Acción | admin | coordinator | accounting | driver |
|--------|-------|-------------|------------|--------|
| Crear factura | ✅ | ❌ | ✅ | ❌ |
| Editar factura (Borrador) | ✅ | ❌ | ✅ | ❌ |
| Emitir factura | ✅ | ❌ | ✅ | ❌ |
| Enviar factura | ✅ | ❌ | ✅ | ❌ |
| Anular factura | ✅ | ❌ | ✅ | ❌ |
| Ver facturas | ✅ | ❌ | ✅ | ❌ |

### Pagos

| Acción | admin | coordinator | accounting | driver |
|--------|-------|-------------|------------|--------|
| Registrar pago | ✅ | ❌ | ✅ | ❌ |
| Confirmar pago | ✅ | ❌ | ✅ | ❌ |
| Conciliar pago | ✅ | ❌ | ✅ | ❌ |
| Ver pagos | ✅ | ❌ | ✅ | ❌ |

### Gastos

| Acción | admin | coordinator | accounting | driver |
|--------|-------|-------------|------------|--------|
| Crear gasto (Draft) | ✅ | ✅ | ✅ | ❌ |
| Editar gasto (Draft) | ✅ | ✅ | ✅ | ❌ |
| Confirmar gasto | ✅ | ❌ | ✅ | ❌ |
| Cancelar gasto | ✅ | ❌ | ✅ | ❌ |
| Ver gastos | ✅ | ✅ | ✅ | ❌ |

### Entidades auxiliares

| Acción | admin | coordinator | accounting | driver |
|--------|-------|-------------|------------|--------|
| Gestionar conductores | ✅ | ✅ | ❌ | ❌ |
| Gestionar vehículos | ✅ | ✅ | ❌ | ❌ |
| Gestionar RateCard | ✅ | ❌ | ❌ | ❌ |
| Gestionar clients | ✅ | ✅ | ❌ | ❌ |
| Gestionar contacts | ✅ | ✅ | ❌ | ❌ |
| Crear cambios | ✅ | ✅ | ✅ | ✅ |
| Resolver cambios | ✅ | ✅ | ❌ | ❌ |
| Subir documentos | ✅ | ✅ | ✅ | ✅ |

### Reporting

| Acción | admin | coordinator | accounting | driver |
|--------|-------|-------------|------------|--------|
| Ver dashboard | ✅ | ✅ | ✅ | ❌ |
| Ver cashflow | ✅ | ❌ | ✅ | ❌ |
| Ver profit por proyecto | ✅ | ✅ | ✅ | ❌ |
| Ver profit por empresa | ✅ | ❌ | ✅ | ❌ |
| Exportar datos | ✅ | ✅ | ✅ | ❌ |

### Sistema

| Acción | admin | coordinator | accounting | driver |
|--------|-------|-------------|------------|--------|
| Settings | ✅ | ❌ | ❌ | ❌ |
| Audit log | ✅ | ❌ | ✅ | ❌ |
| Activity feed | ✅ | ✅ | ✅ | ✅ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |
| OperatingCompany | ✅ | ❌ | ❌ | ❌ |

---

## Reglas de implementación

### Backend (Google Apps Script)

```javascript
function checkPermission(requiredRole) {
  const user = Session.getActiveUser().getEmail();
  const role = _getUserRole(user);

  const permissions = {
    admin: ['admin', 'coordinator', 'accounting', 'driver'],
    coordinator: ['coordinator'],
    accounting: ['accounting'],
    driver: ['driver']
  };

  return permissions[requiredRole]?.includes(role) || false;
}

// Uso en endpoints:
function apiValidateService(data) {
  if (!checkPermission('coordinator')) {
    return { error: 'Sin permisos' };
  }
  // ...
}
```

### Frontend (React)

```typescript
const ROLE = getUserRole(); // desde auth context

const can = {
  validateService: ['admin', 'coordinator'].includes(ROLE),
  createInvoice: ['admin', 'accounting'].includes(ROLE),
  createDriverReport: ['admin', 'driver'].includes(ROLE),
  // ...
};

// Uso:
{can.validateService && (
  <Button onClick={handleValidate}>Validar</Button>
)}
```
