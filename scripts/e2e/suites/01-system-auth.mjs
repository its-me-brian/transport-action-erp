// ============================================================================
// SUITE 01 — Sistema, autenticación, usuarios y permisos
// ============================================================================

import { config } from '../lib/env.mjs';
import { createClient, login } from '../lib/client.mjs';

export const name = '01-system-auth';
export const description = 'health, router, login, sesión, alta/aprobación/baja de usuarios, permisos por rol';

export async function run(ctx) {
  const { client, reporter: r } = ctx;
  const tag = ctx.tag;

  r.section('Sistema');
  await r.step('healthCheck responde ok', async () => {
    const health = await client.raw('healthCheck', {});
    if (health.status !== 'ok') throw new Error(`status=${health.status}`);
    return health;
  });

  await r.expectFailure(
    'acción inexistente es rechazada',
    () => client.raw('accionQueNoExiste', {}),
    /Invalid action/i
  );

  await r.expectFailure(
    'acción protegida sin token es rechazada',
    () => client.raw('getServices', {}),
    /Authentication required/i
  );

  r.section('Autenticación');
  await r.expectFailure(
    'login con contraseña incorrecta falla',
    () => client.raw('loginUser', { username: config.username, password: 'definitivamente-mal' }),
    /Invalid credentials/i
  );

  const session = await r.step('login del admin', () => login(client, config.username, config.password));
  if (!session) return;

  await r.step('validateSession confirma la sesión', async () => {
    const v = await client.post('validateSession', {});
    if (!v || v.valid !== true) throw new Error('validateSession no devolvió valid=true');
    if (!v.user?.role) throw new Error('validateSession sin rol');
    return v;
  });

  r.section('Usuarios');
  await r.step('getUsers lista al admin', async () => {
    const data = await client.post('getUsers', {});
    if (!Array.isArray(data.users) || data.users.length === 0) throw new Error('lista vacía');
    if (!data.users.some((u) => u.username === config.username)) throw new Error('el admin no aparece');
    return data.users;
  });

  const pendingUsername = `${tag.toLowerCase()}-pending`;
  const pendingEmail = `${pendingUsername}@example.invalid`;
  let pendingId = null;

  await r.step('registerUser crea una cuenta pendiente', async () => {
    const res = await client.raw('registerUser', {
      username: pendingUsername,
      email: pendingEmail,
      password: 'Pendiente2026!',
      name: 'E2E Pending',
    });
    pendingId = res.userId;
    if (!pendingId) throw new Error('sin userId');
    ctx.track('userIds', pendingId);
    return res;
  });

  await r.expectFailure(
    'una cuenta pendiente no puede loguear',
    () => client.raw('loginUser', { username: pendingUsername, password: 'Pendiente2026!' }),
    /pending admin approval/i
  );

  await r.step('approveUser asigna rol coordinator', async () => {
    const res = await client.post('approveUser', { userId: pendingId, role: 'coordinator' });
    if (res.role !== 'coordinator') throw new Error(`rol=${res.role}`);
    return res;
  });

  const coord = createClient();
  await r.step('la cuenta aprobada puede loguear', async () => {
    const s = await login(coord, pendingUsername, 'Pendiente2026!');
    if (s.user?.role !== 'coordinator') throw new Error(`rol=${s.user?.role}`);
    return s;
  });

  await r.step('coordinator ve el dashboard', async () => {
    const data = await coord.post('getMainDashboard', {});
    if (!data || typeof data !== 'object') throw new Error('respuesta inválida');
    return data;
  });

  await r.expectFailure(
    'coordinator NO puede listar usuarios',
    () => coord.post('getUsers', {}),
    /permission|not allowed|admin/i
  );

  await r.expectFailure(
    'coordinator NO puede crear usuarios',
    () => coord.post('createUser', { username: `${tag}-x`, email: `${tag}-x@example.invalid`, password: 'Otro2026!' }),
    /permission|not allowed|admin/i
  );

  await r.step('updateUserRole cambia a accounting', async () => {
    await client.post('updateUserRole', { userId: pendingId, newRole: 'accounting' });
    const users = await client.post('getUsers', {});
    const user = users.users.find((u) => u.id === pendingId);
    if (user.role !== 'accounting') throw new Error(`rol=${user.role}`);
    return user;
  });

  r.section('Contraseñas');
  await r.step('resetPassword fija una temporal', async () => {
    const res = await client.post('resetPassword', { userId: pendingId, newPassword: 'Temporal2026!' });
    if (!res.success) throw new Error('sin success');
    return res;
  });

  await r.expectFailure(
    'la contraseña anterior deja de servir',
    () => coord.raw('loginUser', { username: pendingUsername, password: 'Pendiente2026!' }),
    /Invalid credentials/i
  );

  const coord2 = createClient();
  await r.step('la contraseña temporal funciona', async () => {
    const s = await login(coord2, pendingUsername, 'Temporal2026!');
    return s;
  });

  await r.step('changePassword permite volver a la propia', async () => {
    const res = await coord2.post('changePassword', {
      currentPassword: 'Temporal2026!',
      newPassword: 'Propia2026!',
    });
    if (!res.success) throw new Error('sin success');
    return res;
  });

  await r.expectFailure(
    'changePassword rechaza una clave corta',
    () => coord2.post('changePassword', { currentPassword: 'Propia2026!', newPassword: '123' }),
    /at least 6/i
  );

  r.section('Sesiones y baja');
  await r.step('logoutUser invalida el token secundario', async () => {
    await coord2.post('logoutUser', {});
    const v = await coord2.raw('validateSession', { token: coord2.token });
    if (v.valid !== false) throw new Error('la sesión sigue válida');
    return v;
  });

  await r.step('deleteUser da de baja la cuenta', async () => {
    const res = await client.post('deleteUser', { userId: pendingId });
    if (!res.success) throw new Error('sin success');
    return res;
  });

  await r.expectFailure(
    'una cuenta dada de baja no puede loguear',
    () => coord.raw('loginUser', { username: pendingUsername, password: 'Propia2026!' }),
    /disabled|Invalid credentials/i
  );

  await r.step('el token del admin sigue válido', async () => {
    const v = await client.post('validateSession', {});
    if (v.valid !== true) throw new Error('el admin perdió la sesión');
    return v;
  });
}
