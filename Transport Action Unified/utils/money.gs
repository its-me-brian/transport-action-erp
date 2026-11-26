// ============================================================================
// MONEY.GS — aritmética monetaria en céntimos
// ============================================================================
//
// QUÉ PROBLEMA RESUELVE:
//   Los importes nacen de multiplicaciones (km × tarifa, horas × precio), así
//   que en JavaScript quedan con cola binaria: 18.7 * 3 = 56.099999999999994.
//   Ese residuo viaja hasta el saldo de la factura y rompe comparaciones:
//
//     let saldo = 703.18 - 703.175;        // 0.004999999999...
//     if (saldo <= 0) → NUNCA se cumple    // la factura no pasa a Pagada
//
//   Y `registerPayment` comparaba `amount > saldo`, rechazando por fracciones
//   de céntimo un pago que en pantalla era exactamente el saldo.
//
// CÓMO SE USA:
//   - Al CREAR un importe (items, pagos): `_roundMoney(x)`.
//   - Al COMPARAR: comparar valores ya redondeados, o `_moneyExceeds(a, b)`.
//   - Nunca acumular redondeos en loops de suma: sumar y redondear el total.
//
// Lo que NO hace: no formatea, no convierte moneda, no redondea a 5 céntimos.
// ============================================================================

/**
 * Redondea a 2 decimales (céntimos) con medio céntimo hacia arriba.
 *
 * `Math.round(x * 100) / 100` se desvía porque 1.005 en binario es
 * 1.00499999999999989 y termina en 1.00. Se corrige sumando un epsilon
 * RELATIVO al valor (1e-9), grande frente al ruido binario (~1e-16) y pequeño
 * frente a cualquier importe real: así 1.005 → 1.01 sin deformar 703.18.
 *
 * Qué NO corrige: si el negocio necesitara redondeo bancario (half-even) o
 * redondeo a 5 céntimos, esto no aplica.
 *
 * @param {number|string} value
 * @returns {number} importe con 2 decimales exactos (0 si no es un número)
 */
function _roundMoney(value) {
  var n = typeof value === 'number' ? value : parseFloat(value);
  if (!isFinite(n)) return 0;
  var sign = n < 0 ? -1 : 1;
  var abs = Math.abs(n);
  var eps = Math.max(1, abs) * 1e-9;
  return sign * (Math.round((abs + eps) * 100) / 100);
}

/**
 * true si `amount` supera a `limit` considerando los céntimos como unidad.
 *
 * @param {number|string} amount
 * @param {number|string} limit
 * @returns {boolean}
 */
function _moneyExceeds(amount, limit) {
  return _roundMoney(amount) > _roundMoney(limit);
}

/**
 * Suma importes y redondea una sola vez al final (evita error acumulado).
 *
 * @param {Array<number|string>} values
 * @returns {number}
 */
function _sumMoney(values) {
  if (!Array.isArray(values)) return 0;
  var total = 0;
  for (var i = 0; i < values.length; i++) {
    var n = typeof values[i] === 'number' ? values[i] : parseFloat(values[i]);
    if (isFinite(n)) total += n;
  }
  return _roundMoney(total);
}
