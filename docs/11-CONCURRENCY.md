# CONCURRENCY.md — Políticas de concurrencia

## Situaciones de concurrencia

### 1. Dos coordinadores validando el mismo servicio

**Situación:** Dos personas intentan validar el mismo servicio simultáneamente.

**Solución:**
- validateService() adquiere LockService antes de validar
- Si no puede adquirir lock en 5 segundos: rechazar con "Servicio está siendo procesado por otro usuario"
- Solo una validación procede

### 2. Dos personas emitiendo la misma factura

**Situación:** Dos personas intentan emitir la misma factura simultáneamente.

**Solución:**
- emitInvoice() verifica Status = "Borrador" antes de emitir
- Después de emitir, Status = "Emitida"
- La segunda persona ve Status = "Emitida" y rechaza
- No necesita LockService porque la verificación es atómica en Sheets

### 3. Dos pagos confirmándose a la vez

**Situación:** Dos pagos para el mismo invoice se confirman simultáneamente.

**Solución:**
- Cada confirmPayment() es independiente
- Después de confirmar, recalcula saldo
- Si el segundo pago excede el saldo: rechazar con "Saldo insuficiente"
- No hay pérdida de datos porque cada pago es una fila independiente

### 4. Dos rapportinos facturándose para el mismo proyecto+cliente

**Situación:** Dos rapportinos se facturan al mismo tiempo para el mismo proyecto y cliente.

**Solución:**
- Si ya existe Invoice en Borrador: agregar items (aditivo)
- Si no existe: crear Invoice nuevo
- No hay conflicto porque los items son aditivos
- En el peor caso: dos Invoices en Borrador → se pueden fusionar después

### 5. Generación de IDs concurrente

**Situación:** Dos usuarios crean entidades al mismo tiempo y necesitan IDs secuenciales.

**Solución:**
- _generateId() siempre usa LockService.getScriptLock()
- Sequence se actualiza dentro del lock
- Nunca se genera un ID sin lock
- Timeout: 5 segundos

---

## LockService

### Uso

```javascript
function _withLock(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000); // 5 segundos timeout
    return fn();
  } finally {
    lock.releaseLock();
  }
}
```

### Dónde se usa

| Operación | Usa LockService |
|-----------|----------------|
| _generateId() | Sí |
| validateService() | Sí |
| emitInvoice() | No (verificación atómica) |
| confirmPayment() | No (recálculo después) |
| createRapportinoClient() | No |
| facturarRapportinoClient() | No |
| createExpense() | No |
| confirmExpense() | No |

### Regla general

- Usar LockService solo cuando hay escritura secuencial obligatoria (IDs, validación)
- No usar LockService para operaciones que son independientes entre sí
- Siempre liberar lock en finally

---

## Optimistic Locking (futuro)

Si se necesita mayor concurrencia:

1. Agregar campo `Version` a cada entidad
2. Antes de modificar: verificar que Version no cambió
3. Si cambió: rechazar con "Datos modificados por otro usuario. Recargue la página."
4. Al modificar: incrementar Version

Esto no es necesario hoy con Google Sheets, pero es bueno tenerlo documentado para el futuro.
