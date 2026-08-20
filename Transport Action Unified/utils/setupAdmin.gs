// ============================================================================
// SETUPADMIN.GS — Script de inicialización para crear el usuario admin
// ============================================================================
//
// INSTRUCCIONES:
// 1. Abrir https://script.google.com → tu proyecto → editor
// 2. Pegar este archivo (o ya debería estar si lo subiste con clasp)
// 3. Seleccionar la función "setupAdminUser" en el dropdown
// 4. Click en "Ejecutar"
// 5. Autorizar cuando pida permisos
// 6. UNA VEJECUTADO, BORRAR ESTE ARCHIVO (no es seguro tenerlo en producción)
//
// CREDENCIALES:
//   Username: admin
//   Password: admin123
//   Role: admin
// ============================================================================

function setupAdminUser() {
  var SHEET_NAME = 'Users';
  var ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);

  if (!sh) {
    Logger.log('[SETUP] Hoja Users no existe. Creándola...');
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow([
      'User_ID', 'Username', 'Password_Hash', 'Salt', 'Role',
      'Name', 'Email', 'Active', 'Created_At', 'Updated_At',
      'Last_Login', 'Session_Token', 'Session_Expiry'
    ]);
    sh.getRange(1, 1, 1, 13).setBackground('#f3f4f6').setFontWeight('bold');
  }

  // Verificar si ya existe un admin
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toLowerCase() === 'admin') {
      Logger.log('[SETUP] Usuario "admin" ya existe en fila ' + (i + 1) + '. Saltando creación.');
      return;
    }
  }

  // Generar salt y hash
  var salt = _generateSalt();
  var hash = _hashPassword('admin123', salt);

  // ID incremental
  var lastId = 0;
  for (var i = 1; i < data.length; i++) {
    var id = parseInt(String(data[i][0]).replace(/\D/g, ''), 10);
    if (!isNaN(id) && id > lastId) lastId = id;
  }
  var newId = 'USR-' + String(lastId + 1).padStart(5, '0');

  var now = new Date().toISOString();

  // Insertar fila
  sh.appendRow([
    newId,           // A: User_ID
    'admin',         // B: Username
    hash,            // C: Password_Hash
    salt,            // D: Salt
    'admin',         // E: Role
    'Administrator', // F: Name
    'admin@transport-action.local', // G: Email
    'approved',      // H: Active (DEBE ser 'approved' para login)
    now,             // I: Created_At
    now,             // J: Updated_At
    '',              // K: Last_Login (vacío hasta primer login)
    '',              // L: Session_Token (vacío)
    ''               // M: Session_Expiry (vacío)
  ]);

  Logger.log('[SETUP] Usuario admin creado exitosamente:');
  Logger.log('[SETUP]   ID: ' + newId);
  Logger.log('[SETUP]   Username: admin');
  Logger.log('[SETUP]   Password: admin123');
  Logger.log('[SETUP]   Role: admin');
  Logger.log('[SETUP]   Salt: ' + salt);
  Logger.log('[SETUP]   Hash: ' + hash);
  Logger.log('[SETUP]   ¡BORRÁ ESTE ARCHIVO DESPUÉS DE EJECUTAR!');
}
