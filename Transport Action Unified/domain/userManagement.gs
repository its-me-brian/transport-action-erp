/**
 * domain/userManagement.gs
 *
 * User CRUD management — extracted from infrastructure/auth.gs.
 * Auth functions (login, logout, register, validate) remain in auth.gs.
 *
 * Dependencies (from auth.gs — global scope in GAS):
 *   _getUsersSheet, _findUserByUsername, _findUserByEmail,
 *   _requirePermission, _hashPassword, _generateSalt, VALID_ROLES
 */

// ============================================================================
// GET ALL USERS
// ============================================================================

/**
 * Get all users (admin only).
 * @param {string} token - Session token
 * @returns {{ success: boolean, users: Array }}
 */
function umGetUsers(token) {
  try {
    var permErr = _requirePermission(token, 'admin');
    if (permErr) return permErr;

    var sh = _getUsersSheet();
    var data = sh.getDataRange().getValues();
    var users = [];

    for (var i = 1; i < data.length; i++) {
      users.push({
        id: data[i][0],
        username: data[i][1],
        role: data[i][4],
        name: data[i][5],
        email: data[i][6],
        status: data[i][7],
        createdAt: data[i][8],
        lastLogin: data[i][10]
      });
    }

    return { success: true, users: users };
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================================
// CREATE USER
// ============================================================================

/**
 * Create a user (admin only). Sets status to 'approved' directly.
 * @param {string} token - Session token
 * @param {Object} userData - { username, email, password, name?, role? }
 */
function umCreateUser(token, userData) {
  try {
    var permErr = _requirePermission(token, 'admin');
    if (permErr) return permErr;

    var username = userData.username;
    var email = userData.email;
    var password = userData.password;
    var name = userData.name || '';
    var role = userData.role || 'coordinator';

    if (VALID_ROLES.indexOf(role) === -1) {
      return { error: 'Invalid role. Valid roles: ' + VALID_ROLES.join(', ') };
    }

    if (!username || !email || !password) {
      return { error: 'Username, email and password are required' };
    }

    return _withLock(function() {
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
        role,         // E
        name,         // F
        email,        // G
        'approved',   // H — approved directly
        now,          // I
        now,          // J
        '',           // K
        '',           // L
        ''            // M
      ]);

      _dispatchEvent({
        type: 'user.created',
        entity: 'User',
        entityId: id,
        user: email,
        payload: { username: username, role: role }
      });

      return { success: true, message: 'User created', userId: id };
    });
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================================
// APPROVE USER
// ============================================================================

/**
 * Approve a pending user (admin only).
 *
 * A role must be resolved in the same operation: registration stores the
 * sentinel 'pending' in the Role column, so approving without assigning a
 * real role would create an account that can log in but can do nothing.
 *
 * @param {string} token - Session token
 * @param {string} userId - User ID to approve
 * @param {string} [role] - Role to assign (admin|coordinator|accounting|driver)
 */
function umApproveUser(token, userId, role) {
  try {
    var permErr = _requirePermission(token, 'admin');
    if (permErr) return permErr;

    return _withLock(function() {
      var sh = _getUsersSheet();
      var data = sh.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
          var currentRole = data[i][4];
          var nextRole = role || (VALID_ROLES.indexOf(currentRole) !== -1 ? currentRole : '');

          if (VALID_ROLES.indexOf(nextRole) === -1) {
            return { error: 'A valid role (admin, coordinator, accounting, driver) is required to approve this user' };
          }

          if (nextRole !== currentRole) {
            sh.getRange(i + 1, 5).setValue(nextRole);                 // E = Role
          }
          sh.getRange(i + 1, 8).setValue('approved');                 // H = Active
          sh.getRange(i + 1, 10).setValue(new Date().toISOString());  // J = Updated_At

          _dispatchEvent({
            type: 'user.approved',
            entity: 'User',
            entityId: userId,
            user: data[i][6],
            payload: { username: data[i][1], role: nextRole, previousRole: currentRole }
          });

          return { success: true, message: 'User approved', role: nextRole };
        }
      }
      return { error: 'User not found' };
    });
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================================
// REJECT USER
// ============================================================================

/**
 * Reject a pending user (admin only).
 * @param {string} token - Session token
 * @param {string} userId - User ID to reject
 */
function umRejectUser(token, userId) {
  try {
    var permErr = _requirePermission(token, 'admin');
    if (permErr) return permErr;

    return _withLock(function() {
      var sh = _getUsersSheet();
      var data = sh.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
          sh.getRange(i + 1, 8).setValue('rejected');               // H = Active
          sh.getRange(i + 1, 10).setValue(new Date().toISOString()); // J = Updated_At

          _dispatchEvent({
            type: 'user.rejected',
            entity: 'User',
            entityId: userId,
            user: data[i][6],
            payload: { username: data[i][1], role: data[i][4] }
          });

          return { success: true, message: 'User rejected' };
        }
      }
      return { error: 'User not found' };
    });
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================================
// UPDATE USER ROLE
// ============================================================================

/**
 * Update user role (admin only).
 * @param {string} token - Session token
 * @param {string} userId - User ID
 * @param {string} newRole - New role
 */
function umUpdateUserRole(token, userId, newRole) {
  try {
    var permErr = _requirePermission(token, 'admin');
    if (permErr) return permErr;

    if (VALID_ROLES.indexOf(newRole) === -1) {
      return { error: 'Invalid role. Valid roles: ' + VALID_ROLES.join(', ') };
    }

    return _withLock(function() {
      var sh = _getUsersSheet();
      var data = sh.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
          var oldRole = data[i][4];
          sh.getRange(i + 1, 5).setValue(newRole);                   // E = Role
          sh.getRange(i + 1, 10).setValue(new Date().toISOString()); // J = Updated_At

          _dispatchEvent({
            type: 'user.roleChanged',
            entity: 'User',
            entityId: userId,
            user: data[i][6],
            payload: { username: data[i][1], oldRole: oldRole, newRole: newRole }
          });

          return { success: true, message: 'Role updated' };
        }
      }
      return { error: 'User not found' };
    });
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================================
// DELETE USER
// ============================================================================

/**
 * Delete a user (admin only).
 * @param {string} token - Session token
 * @param {string} userId - User ID to delete
 */
function umDeleteUser(token, userId) {
  try {
    var permErr = _requirePermission(token, 'admin');
    if (permErr) return permErr;

    return _withLock(function() {
      var sh = _getUsersSheet();
      var data = sh.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
          _dispatchEvent({
            type: 'user.deleted',
            entity: 'User',
            entityId: userId,
            user: data[i][6],
            payload: { username: data[i][1], role: data[i][4] }
          });

          _softDelete('Users', userId);
          return { success: true, message: 'User deleted' };
        }
      }
      return { error: 'User not found' };
    });
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================================
// RESET PASSWORD (admin)
// ============================================================================

/**
 * Reset a user's password (admin only).
 *
 * El admin no necesita conocer la contraseña actual: es la única vía de
 * recuperación cuando un usuario la olvida. Invalida el token activo del
 * usuario afectado (columnas L y M) para forzar un nuevo login, salvo que el
 * admin esté reseteando su propia cuenta (así no se autoexpulsa de la sesión).
 *
 * @param {string} token - Session token del admin que ejecuta el reset
 * @param {string} userId - Usuario a resetear
 * @param {string} newPassword - Nueva contraseña (mínimo 6 caracteres)
 */
function umResetPassword(token, userId, newPassword) {
  try {
    var permErr = _requirePermission(token, 'userManagement');
    if (permErr) return permErr;

    var actor = _getUserFromToken(token);
    if (!actor) return { error: 'Invalid session' };
    if (!userId) return { error: 'User ID is required' };

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }
    if (newPassword.length > 128) {
      return { error: 'Password is too long (max 128 characters)' };
    }

    return _withLock(function() {
      var sh = _getUsersSheet();
      var data = sh.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (data[i][0] !== userId) continue;

        var salt = _generateSalt();
        var hash = _hashPassword(newPassword, salt);
        var now = new Date().toISOString();

        sh.getRange(i + 1, 3).setValue(hash); // C = Password_Hash
        sh.getRange(i + 1, 4).setValue(salt); // D = Salt
        sh.getRange(i + 1, 10).setValue(now); // J = Updated_At

        var selfReset = actor.id === userId;
        if (!selfReset) {
          // Cortar sesiones abiertas del usuario afectado.
          sh.getRange(i + 1, 12).setValue(''); // L = Token
          sh.getRange(i + 1, 13).setValue(''); // M = Token_Expiry
        }

        _dispatchEvent({
          type: 'user.passwordReset',
          entity: 'User',
          entityId: userId,
          user: data[i][6],
          payload: {
            username: data[i][1],
            resetBy: actor.username,
            selfReset: selfReset,
            sessionsInvalidated: !selfReset
          }
        });

        return {
          success: true,
          message: 'Password reset',
          selfReset: selfReset
        };
      }

      return { error: 'User not found' };
    });
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================================
// UPDATE USER
// ============================================================================

/**
 * Update user fields (admin only). Can change name, email, role.
 * @param {string} token - Session token
 * @param {string} userId - User ID
 * @param {Object} updates - { name?, email?, role? }
 */
function umUpdateUser(token, userId, updates) {
  try {
    var permErr = _requirePermission(token, 'admin');
    if (permErr) return permErr;

    return _withLock(function() {
      var sh = _getUsersSheet();
      var data = sh.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
          if (updates.role !== undefined) {
            if (VALID_ROLES.indexOf(updates.role) === -1) {
              return { error: 'Invalid role. Valid roles: ' + VALID_ROLES.join(', ') };
            }
            sh.getRange(i + 1, 5).setValue(updates.role);  // E = Role
          }
          if (updates.name !== undefined) {
            sh.getRange(i + 1, 6).setValue(updates.name);  // F = Name
          }
          if (updates.email !== undefined) {
            sh.getRange(i + 1, 7).setValue(updates.email); // G = Email
          }
          sh.getRange(i + 1, 10).setValue(new Date().toISOString()); // J = Updated_At

          _dispatchEvent({
            type: 'user.updated',
            entity: 'User',
            entityId: userId,
            user: data[i][6],
            payload: { username: data[i][1], updates: updates }
          });

          return { success: true, message: 'User updated' };
        }
      }
      return { error: 'User not found' };
    });
  } catch (e) {
    return { error: e.message };
  }
}
