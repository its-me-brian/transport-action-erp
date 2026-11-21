// ============================================================================
// RESETADMINPASSWORD.GS — recuperación de la contraseña de admin sin sesión
// ============================================================================
//
// PARA QUÉ SIRVE
//   La app permite resetear la contraseña de cualquier usuario desde
//   /user-management, pero eso exige estar logueado como admin. Si se perdió
//   la única credencial de admin, no hay forma de entrar: este script es la
//   vía de recuperación fuera de la app.
//
// CÓMO SE USA
//   1. Abrir https://script.google.com → el proyecto → editor
//   2. Seleccionar la función `resetAdminPassword`
//   3. Ejecutar y autorizar si pide permisos
//   4. Copiar la contraseña del log (se muestra UNA sola vez)
//   5. Entrar a la app con esa contraseña y cambiarla desde
//      /user-management → "Change my password"
//
// QUÉ HACE EXACTAMENTE
//   - Genera un salt nuevo y el hash de una contraseña aleatoria de 20 chars
//   - Escribe C (hash) y D (salt), actualiza J (Updated_At)
//   - Revoca la sesión abierta del usuario (limpia L y M)
//   - NO toca el rol (E) ni el estado (H): si la cuenta está 'pending',
//     'disabled' o 'deleted', el login la va a seguir rechazando y el log lo dice
//
// A diferencia de setupAdmin.gs, este archivo es idempotente: se puede volver a
// correr cuantas veces haga falta. No crea usuarios ni credenciales por defecto.
// ============================================================================

function resetAdminPassword() {
  var TARGET = 'admin';

  var ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  var sh = ss.getSheetByName('Users');
  if (!sh) {
    Logger.log('[RESET] No existe la hoja Users. Corré primero utils/setupAdmin.gs.');
    return;
  }

  var data = sh.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toLowerCase() === TARGET) {
      rowIndex = i + 1; // 1-based para la Sheet
      break;
    }
  }

  if (rowIndex === -1) {
    Logger.log('[RESET] No existe el usuario "' + TARGET + '". Corré utils/setupAdmin.gs.');
    return;
  }

  var row = data[rowIndex - 1];
  var role = String(row[4]).trim();
  var status = String(row[7]).trim();

  if (status === 'deleted') {
    Logger.log('[RESET] ABORTADO: la cuenta "' + TARGET + '" está dada de baja (Active=deleted).');
    Logger.log('[RESET] Restaurala a propósito desde la Sheet (columna H = approved) y volvé a correr.');
    return;
  }

  var salt = _generateSalt();
  var password = _randomPassword(20);
  var hash = _hashPassword(password, salt);
  var now = new Date().toISOString();

  // C=hash, D=salt, J=Updated_At, L=token, M=expiry
  sh.getRange(rowIndex, 3).setValue(hash);
  sh.getRange(rowIndex, 4).setValue(salt);
  sh.getRange(rowIndex, 10).setValue(now);
  sh.getRange(rowIndex, 12).setValue('');
  sh.getRange(rowIndex, 13).setValue('');

  Logger.log('[RESET] Contraseña de "' + TARGET + '" regenerada.');
  Logger.log('[RESET]   Password: ' + password + '   <-- anotala ahora, no se vuelve a mostrar');
  Logger.log('[RESET]   Role: ' + role + '   Active: ' + status);

  if (status !== 'approved') {
    Logger.log('[RESET] ATENCIÓN: Active es "' + status + '" y el login exige "approved".');
    Logger.log('[RESET] La contraseña nueva no sirve hasta que la cuenta esté aprobada.');
  }
  if (VALID_ROLES.indexOf(role) === -1) {
    Logger.log('[RESET] ATENCIÓN: el rol "' + role + '" no es válido (' + VALID_ROLES.join(', ') + ').');
    Logger.log('[RESET] Asignale un rol desde /user-management o la Sheet antes de entrar.');
  }
}

/**
 * Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para poder copiarla del log.
 */
function _randomPassword(length) {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + Utilities.getUuid(),
    Utilities.Charset.UTF_8
  );
  var password = '';
  for (var i = 0; i < length; i++) {
    password += alphabet.charAt(Math.abs(bytes[i]) % alphabet.length);
  }
  return password;
}
