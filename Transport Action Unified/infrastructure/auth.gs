/**
 * infrastructure/auth.gs
 * 
 * Authentication, authorization, and user management system.
 * 
 * Roles (from docs/08-PERMISSIONS.md): admin, coordinator, accounting, driver
 * Authorization: EXPLICIT permission matrix (NO hierarchy).
 * 
 * Users sheet columns (A-M):
 *   A(0)=User_ID  B(1)=Username  C(2)=Password_Hash  D(3)=Salt
 *   E(4)=Role  F(5)=Name  G(6)=Email  H(7)=Active
 *   I(8)=Created_At  J(9)=Updated_At  K(10)=Last_Login
 *   L(11)=Session_Token  M(12)=Session_Expiry
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var VALID_ROLES = ['admin', 'coordinator', 'accounting', 'driver'];

/**
 * PERMISSION MATRIX — Source of truth: docs/08-PERMISSIONS.md
 * 
 * Each key is a permission string "resource.action".
 * Each value is the array of roles allowed to perform that action.
 * Admin ALWAYS has access (checked separately in _hasPermissionAction).
 * 
 * NO HIERARCHY. No role can perform an action unless its role is listed.
 */
var PERMISSION_MATRIX = {
  // === SERVICES ===
  'service.list':              ['admin', 'coordinator', 'accounting'],
  'service.list_own':          ['admin', 'coordinator', 'accounting', 'driver'],
  'service.import':            ['admin', 'coordinator'],
  'service.assign':            ['admin', 'coordinator'],
  'service.confirm':           ['admin', 'coordinator'],
  'service.start':             ['admin', 'coordinator', 'driver'],
  'service.complete':          ['admin', 'coordinator', 'driver'],
  'service.validate':          ['admin', 'coordinator'],
  'service.adjustRevenue':     ['admin', 'coordinator'],
  'service.adjustCost':        ['admin', 'coordinator'],
  'service.updateField':       ['admin', 'coordinator'],
  'service.delete':            ['admin', 'coordinator'],
  'service.facturar':          ['admin', 'coordinator', 'accounting'],
  'service.cobrar':            ['admin', 'coordinator', 'accounting'],
  'service.close':             ['admin', 'coordinator'],
  'service.confirmActuals':    ['admin', 'coordinator', 'accounting'],
  'service.approveFinancial':  ['admin', 'accounting'],
  'service.markFacturable':    ['admin', 'coordinator', 'accounting'],

  // === PROJECTS ===
  'project.list':              ['admin', 'coordinator', 'accounting'],
  'project.create':            ['admin', 'coordinator'],
  'project.update':            ['admin', 'coordinator'],
  'project.delete':            ['admin', 'coordinator'],
  'project.archive':           ['admin', 'coordinator'],
  'project.preparar':          ['admin', 'coordinator'],
  'project.activar':           ['admin', 'coordinator'],
  'project.pasarAFacturacion': ['admin', 'coordinator'],
  'project.pasarACobro':       ['admin', 'coordinator'],
  'project.cerrar':            ['admin', 'coordinator'],

  // === DRIVERS ===
  'driver.list':               ['admin', 'coordinator', 'accounting'],
  'driver.create':             ['admin', 'coordinator'],
  'driver.update':             ['admin', 'coordinator'],
  'driver.delete':             ['admin', 'coordinator'],
  'driver.cleanup':            ['admin', 'coordinator'],

  // === VEHICLES ===
  'vehicle.list':              ['admin', 'coordinator', 'accounting'],
  'vehicle.create':            ['admin', 'coordinator'],
  'vehicle.update':            ['admin', 'coordinator'],
  'vehicle.delete':            ['admin', 'coordinator'],

  // === DRIVER RATES ===
  'driverRate.list':           ['admin', 'coordinator'],
  'driverRate.create':         ['admin', 'coordinator'],
  'driverRate.update':         ['admin', 'coordinator'],
  'driverRate.delete':         ['admin', 'coordinator'],

  // === COLLABORATORS ===
  'collaborator.list':         ['admin', 'coordinator', 'accounting'],
  'collaborator.create':       ['admin', 'coordinator'],
  'collaborator.update':       ['admin', 'coordinator'],
  'collaborator.delete':       ['admin', 'coordinator'],

  // === SUPPLIER RATES ===
  'supplierRate.list':         ['admin', 'coordinator'],
  'supplierRate.create':       ['admin', 'coordinator'],
  'supplierRate.update':       ['admin', 'coordinator'],
  'supplierRate.delete':       ['admin', 'coordinator'],

  // === SERVICE ECONOMICS ===
  'service.economics':         ['admin', 'coordinator', 'accounting'],

  // === RECONCILIATION ===
  'reconciliation.check':      ['admin', 'coordinator', 'accounting'],
  'reconciliation.update':     ['admin', 'coordinator'],

  // === RATE CARDS ===
  'rateCard.list':             ['admin', 'coordinator'],
  'rateCard.create':           ['admin'],
  'rateCard.update':           ['admin'],
  'rateCard.delete':           ['admin'],

  // === CLIENTS ===
  'client.list':               ['admin', 'coordinator', 'accounting'],
  'client.create':             ['admin', 'coordinator'],
  'client.update':             ['admin', 'coordinator'],
  'client.delete':             ['admin', 'coordinator'],

  // === CONTACTS ===
  'contact.list':              ['admin', 'coordinator', 'accounting'],
  'contact.create':            ['admin', 'coordinator'],
  'contact.update':            ['admin', 'coordinator'],
  'contact.delete':            ['admin', 'coordinator'],

  // === TRANSPORT LISTS ===
  'transportList.list':        ['admin', 'coordinator'],
  'transportList.upload':      ['admin', 'coordinator'],
  'transportList.import':      ['admin', 'coordinator'],
  'transportList.export':      ['admin', 'coordinator'],

  // === DRIVER REPORTS ===
  'driverReport.list':         ['admin', 'coordinator', 'driver'],
  'driverReport.create':       ['admin', 'driver'],
  'driverReport.submit':       ['admin', 'driver'],
  'driverReport.approve':      ['admin', 'coordinator'],
  'driverReport.reject':       ['admin', 'coordinator'],

  // === RAPPORTINO CLIENT ===
  'rapportinoClient.list':     ['admin', 'coordinator', 'accounting'],
  'rapportinoClient.create':   ['admin', 'coordinator'],
  'rapportinoClient.addService':    ['admin', 'coordinator'],
  'rapportinoClient.removeService': ['admin', 'coordinator'],
  'rapportinoClient.review':   ['admin', 'coordinator'],
  'rapportinoClient.send':     ['admin', 'coordinator'],
  'rapportinoClient.accept':   ['admin', 'coordinator', 'accounting'],
  'rapportinoClient.facturar': ['admin', 'accounting'],

  // === RAPPORTINO DRIVER ===
  'rapportinoDriver.list':     ['admin', 'coordinator'],
  'rapportinoDriver.create':   ['admin', 'coordinator'],
  'rapportinoDriver.review':   ['admin', 'coordinator'],
  'rapportinoDriver.send':     ['admin', 'coordinator'],
  'rapportinoDriver.accept':   ['admin', 'coordinator'],
  'rapportinoDriver.pay':      ['admin', 'accounting'],

  // === RAPPORTINO COLLABORATOR ===
  'rapportinoCollaborator.list':      ['admin', 'coordinator', 'accounting'],
  'rapportinoCollaborator.create':    ['admin', 'coordinator'],
  'rapportinoCollaborator.addService': ['admin', 'coordinator'],
  'rapportinoCollaborator.send':      ['admin', 'coordinator'],
  'rapportinoCollaborator.accept':    ['admin', 'coordinator'],
  'rapportinoCollaborator.pay':       ['admin', 'accounting'],

  // === INVOICES ===
  'invoice.list':              ['admin', 'accounting'],
  'invoice.create':            ['admin', 'accounting'],
  'invoice.edit':              ['admin', 'accounting'],
  'invoice.emit':              ['admin', 'accounting'],
  'invoice.send':              ['admin', 'accounting'],
  'invoice.void':              ['admin', 'accounting'],

  // === PAYMENTS ===
  'payment.list':              ['admin', 'accounting'],
  'payment.register':          ['admin', 'accounting'],
  'payment.edit':              ['admin', 'accounting'],
  'payment.confirm':           ['admin', 'accounting'],
  'payment.reconcile':         ['admin', 'accounting'],

  // === EXPENSES ===
  'expense.list':              ['admin', 'coordinator', 'accounting'],
  'expense.create':            ['admin', 'coordinator', 'accounting'],
  'expense.edit':              ['admin', 'coordinator', 'accounting'],
  'expense.confirm':           ['admin', 'accounting'],
  'expense.cancel':            ['admin', 'accounting'],
  'expense.correct':           ['admin', 'accounting'],

  // === CHANGES ===
  'change.list':               ['admin', 'coordinator', 'accounting', 'driver'],
  'change.create':             ['admin', 'coordinator', 'accounting', 'driver'],
  'change.update':             ['admin', 'coordinator', 'accounting', 'driver'],
  'change.delete':             ['admin', 'coordinator'],
  'change.resolve':            ['admin', 'coordinator'],

  // === DOCUMENTS ===
  'document.list':             ['admin', 'coordinator', 'accounting', 'driver'],
  'document.create':           ['admin', 'coordinator', 'accounting', 'driver'],
  'document.delete':           ['admin', 'coordinator', 'accounting', 'driver'],

  // === DRIVER ADVANCES ===
  'driverAdvance.list':        ['admin', 'accounting'],
  'driverAdvance.create':      ['admin', 'accounting'],
  'driverAdvance.update':      ['admin', 'accounting'],

  // === DRIVER LINKS ===
  'driverLink.list':           ['admin', 'coordinator'],
  'driverLink.generate':       ['admin', 'coordinator'],
  'driverLink.update':         ['admin', 'coordinator'],
  'driverLink.deactivate':     ['admin', 'coordinator'],
  'driverLink.compare':        ['admin', 'coordinator'],

  // === DRIVER REPORT INBOX (FASE 15C) ===
  'inbox.list':                ['admin', 'coordinator'],
  'inbox.capture':             ['admin', 'coordinator', 'driver'],
  'inbox.normalize':           ['admin', 'coordinator'],
  'inbox.review':              ['admin', 'coordinator'],

  // === PRESENCE (FASE 15E) ===
  'presence.read':             ['admin', 'coordinator'],

  // === OPERATING COMPANY ===
  'operatingCompany.list':     ['admin', 'coordinator', 'accounting'],
  'operatingCompany.update':   ['admin'],

  // === REVENUE / COST BREAKDOWNS ===
  'revenueBreakdown.list':     ['admin', 'coordinator', 'accounting'],
  'costBreakdown.list':        ['admin', 'coordinator', 'accounting'],

  // === REPORTS / QUERIES ===
  'report.dashboard':          ['admin', 'coordinator', 'accounting'],
  'report.projectDashboard':   ['admin', 'coordinator', 'accounting'],
  'report.driverDashboard':    ['admin', 'coordinator', 'accounting'],
  'report.serviceSummary':     ['admin', 'coordinator', 'accounting'],
  'report.pendingValidation':  ['admin', 'coordinator'],
  'report.pendingInvoicing':   ['admin', 'accounting'],
  'report.profitProject':      ['admin', 'coordinator', 'accounting'],
  'report.profitDriver':       ['admin', 'coordinator', 'accounting'],
  'report.profitCompany':      ['admin', 'accounting'],
  'report.cashflow':           ['admin', 'accounting'],

  // === SYSTEM ===
  'settings.read':             ['admin', 'coordinator', 'accounting'],
  'settings.write':            ['admin'],
  'auditLog.read':             ['admin', 'accounting'],
  'activityFeed.read':         ['admin', 'coordinator', 'accounting', 'driver'],
  'userManagement':            ['admin'],
  'invariantCheck':            ['admin'],
  'integrationTest':           ['admin']
};

// ============================================================================
// PASSWORD HASHING
// ============================================================================

function _generateSalt() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var salt = '';
  for (var i = 0; i < 16; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

function _hashPassword(password, salt) {
  var raw = salt + password + salt;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function _generateToken() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================================================
// USER SHEET HELPERS
// ============================================================================

function _getUsersSheet() {
  var ss = SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  var sh = ss.getSheetByName(SHEETS.Users);
  if (!sh) {
    _setupUsers(ss);
    return ss.getSheetByName(SHEETS.Users);
  }
  return sh;
}

function _findUserByUsername(username) {
  var sh = _getUsersSheet();
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toLowerCase() === username.toLowerCase()) {
      return { row: i + 1, data: data[i] };
    }
  }
  return null;
}

function _findUserByEmail(email) {
  var sh = _getUsersSheet();
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][6]).trim().toLowerCase() === email.toLowerCase()) {
      return { row: i + 1, data: data[i] };
    }
  }
  return null;
}

function _findUserByToken(token) {
  var sh = _getUsersSheet();
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][11]).trim() === token) {
      var expiry = new Date(data[i][12]);
      if (expiry > new Date()) {
        return { row: i + 1, data: data[i] };
      }
    }
  }
  return null;
}

function _getUserFromToken(token) {
  if (!token) return null;
  var user = _findUserByToken(token);
  if (!user) return null;
  return {
    id: user.data[0],
    username: user.data[1],
    role: user.data[4],
    name: user.data[5],
    email: user.data[6],
    active: user.data[7]
  };
}

// ============================================================================
// PERMISSION CHECK — MATRIX-BASED (NO HIERARCHY)
// ============================================================================

/**
 * Check if a user has a specific permission using the PERMISSION_MATRIX.
 * Admin ALWAYS has access to everything.
 * 
 * @param {string} token - Session token
 * @param {string} permission - Permission string e.g. 'service.validate'
 * @returns {boolean}
 */
function _hasPermissionAction(token, permission) {
  var user = _getUserFromToken(token);
  if (!user || user.active !== 'approved') return false;
  
  // Admin has full access
  if (user.role === 'admin') return true;
  
  var allowedRoles = PERMISSION_MATRIX[permission];
  if (!allowedRoles) return false; // Unknown permission = deny
  
  return allowedRoles.indexOf(user.role) !== -1;
}

/**
 * Check permission and return error object if not authorized.
 * Use in API: const err = _requirePermissionAction(data.token, 'service.validate');
 *             if (err) throw new AuthorizationError(err.error);
 * 
 * @param {string} token - Session token
 * @param {string} permission - Permission string
 * @returns {Object|null} null if ok, {error: string} if denied
 */
function _requirePermissionAction(token, permission) {
  if (!_hasPermissionAction(token, permission)) {
    return { error: 'Insufficient permissions. Required: ' + permission };
  }
  return null;
}

/**
 * DEPRECATED: Check if a user has the required role using hierarchy.
 * @deprecated Use _hasPermissionAction(token, 'resource.action') instead.
 * Kept for backward compatibility during migration.
 */
function _hasPermission(token, requiredRole) {
  var user = _getUserFromToken(token);
  if (!user || user.active !== 'approved') return false;
  if (user.role === 'admin') return true;
  var hierarchy = { 'admin': 4, 'coordinator': 3, 'accounting': 2, 'driver': 1 };
  var userLevel = hierarchy[user.role] || 0;
  var requiredLevel = hierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * DEPRECATED: Check if user role is in an explicit list.
 * @deprecated Use _hasPermissionAction(token, 'resource.action') instead.
 */
function _hasPermissionExact(token, allowedRoles) {
  var user = _getUserFromToken(token);
  if (!user || user.active !== 'approved') return false;
  if (user.role === 'admin') return true;
  return allowedRoles.indexOf(user.role) !== -1;
}

/**
 * DEPRECATED: Check permission and return error.
 * @deprecated Use _requirePermissionAction(token, 'resource.action') instead.
 */
function _requirePermission(token, requiredRole) {
  if (!_hasPermission(token, requiredRole)) {
    return { error: 'Insufficient permissions. Required: ' + requiredRole };
  }
  return null;
}

/**
 * DEPRECATED: Check permission with role list and return error.
 * @deprecated Use _requirePermissionAction(token, 'resource.action') instead.
 */
function _requirePermissionExact(token, allowedRoles, description) {
  if (!_hasPermissionExact(token, allowedRoles)) {
    return { error: 'Insufficient permissions. Required: ' + (description || allowedRoles.join(' or ')) };
  }
  return null;
}

// ============================================================================
// AUTH API
// ============================================================================

/**
 * Register a new user.
 * Public registration ALWAYS creates user with role='pending'.
 * Only admin can assign actual roles via umUpdateUserRole.
 * 
 * @param {Object} userData - { username, email, password, name? }
 */
function registerUser(userData) {
  try {
    var username = userData.username;
    var email = userData.email;
    var password = userData.password;
    var name = userData.name || '';
    
    // FORCE role to 'pending' — ignore any role from client
    var role = 'pending';
    
    if (!username || !email || !password) {
      return { error: 'Username, email and password are required' };
    }
    
    if (_findUserByUsername(username)) {
      return { error: 'Username already exists' };
    }
    if (_findUserByEmail(email)) {
      return { error: 'Email already registered' };
    }
    
    var sh = _getUsersSheet();
    var salt = _generateSalt();
    var hash = _hashPassword(password, salt);
    var now = new Date().toISOString();
    var id = 'USR-' + String(sh.getLastRow()).padStart(3, '0');
    
    sh.appendRow([
      id,           // A
      username,     // B
      hash,         // C
      salt,         // D
      role,         // E — always 'pending'
      name,         // F
      email,        // G
      'pending',    // H
      now,          // I
      now,          // J
      '',           // K
      '',           // L
      ''            // M
    ]);
    
    return { 
      success: true, 
      message: 'Registration successful. Waiting for admin approval.',
      userId: id
    };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Login user.
 */
function loginUser(username, password) {
  try {
    if (!username || !password) {
      return { error: 'Username and password are required' };
    }
    
    var user = _findUserByUsername(username);
    if (!user) {
      return { error: 'Invalid credentials' };
    }
    
    var storedHash = user.data[2];
    var salt = user.data[3];
    var inputHash = _hashPassword(password, salt);
    
    if (storedHash !== inputHash) {
      return { error: 'Invalid credentials' };
    }
    
    if (user.data[7] !== 'approved') {
      return { error: 'Account pending admin approval' };
    }
    
    var token = _generateToken();
    var expiry = new Date();
    expiry.setHours(expiry.getHours() + 8);
    
    var sh = _getUsersSheet();
    sh.getRange(user.row, 11).setValue(new Date().toISOString());
    sh.getRange(user.row, 12).setValue(token);
    sh.getRange(user.row, 13).setValue(expiry.toISOString());
    
    _dispatchEvent({
      type: 'user.login',
      entity: 'User',
      entityId: user.data[0],
      user: user.data[6],
      payload: { username: user.data[1], role: user.data[4] }
    });

    _setActiveUser(user.data[6]);

    return {
      success: true,
      token: token,
      user: {
        id: user.data[0],
        username: user.data[1],
        role: user.data[4],
        name: user.data[5],
        email: user.data[6]
      }
    };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Logout user.
 */
function logoutUser(token) {
  try {
    var user = _findUserByToken(token);
    if (user) {
      _dispatchEvent({
        type: 'user.logout',
        entity: 'User',
        entityId: user.data[0],
        user: user.data[6],
        payload: { username: user.data[1] }
      });

      _setActiveUser('');

      var sh = _getUsersSheet();
      sh.getRange(user.row, 12).setValue('');
      sh.getRange(user.row, 13).setValue('');
    }
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Validate session token.
 */
function validateSession(token) {
  try {
    var user = _getUserFromToken(token);
    if (!user) {
      return { valid: false, error: 'Invalid or expired session' };
    }
    if (user.active !== 'approved') {
      return { valid: false, error: 'Account not approved' };
    }
    return { valid: true, user: user };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

// ============================================================================
// Change own password
// ============================================================================

function changePassword(token, currentPassword, newPassword) {
  try {
    var user = _getUserFromToken(token);
    if (!user) return { error: 'Invalid session' };
    
    var sh = _getUsersSheet();
    var data = sh.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === user.id) {
        var storedHash = data[i][2];
        var salt = data[i][3];
        var inputHash = _hashPassword(currentPassword, salt);
        
        if (storedHash !== inputHash) {
          return { error: 'Current password is incorrect' };
        }
        
        var newSalt = _generateSalt();
        var newHash = _hashPassword(newPassword, newSalt);
        
        sh.getRange(i + 1, 3).setValue(newHash);
        sh.getRange(i + 1, 4).setValue(newSalt);
        sh.getRange(i + 1, 10).setValue(new Date().toISOString());
        
        return { success: true, message: 'Password changed' };
      }
    }
    return { error: 'User not found' };
  } catch (e) {
    return { error: e.message };
  }
}
