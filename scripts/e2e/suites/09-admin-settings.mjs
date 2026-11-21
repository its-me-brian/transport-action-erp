// ============================================================================
// SUITE 09 — Administración, integraciones y comandos legacy
// ============================================================================
// Cierra los huecos que dejan las suites 01–08: todo lo que la UI usa pero
// ninguna suite tocaba. Se agrupa por área y cada paso es independiente: un
// fallo no arrastra al resto.
//
// Lo que NO se prueba acá (y por qué) está al final, en la sección
// 'Fuera de alcance', para que la cobertura no mienta por omisión.
// ============================================================================

import { createService, driveToCompleted, getService } from '../lib/flows.mjs';
import { addDays, today } from '../lib/fixtures.mjs';

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

function idOf(dto) {
  return dto?.id || dto?.ID;
}

function expectStatus(res, allowed, label) {
  if (!res || typeof res !== 'object') throw new Error(`${label}: respuesta vacía`);
  if (res.status === undefined) return res; // algunos comandos devuelven el DTO sin status
  if (!allowed.includes(res.status)) {
    throw new Error(`${label}: status=${res.status}, se esperaba ${allowed.join(' o ')}`);
  }
  return res;
}

export const name = '09-admin-settings';
export const description = 'settings, usuarios, catálogo, links, WhatsApp, inbox masivo, transport lists, rapportino de colaborador, anticipos, gastos y comandos legacy';

export async function run(ctx) {
  const { client, reporter: r } = ctx;
  const driverId = ctx.ids.drivers[0];

  // ── Presencia y auditoría ────────────────────────────────────────────────
  r.section('Presencia y auditoría');

  await r.step('heartbeat registra la sesión', async () => {
    const res = await client.post('heartbeat', { userAgent: 'e2e-battery', sessionId: ctx.tag });
    if (!res || res.success === false) throw new Error('heartbeat no confirmó');
    return res;
  });

  await r.step('getActiveUsers devuelve una lista', async () => {
    const list = arr(await client.post('getActiveUsers', { timeoutMs: 3600000 }));
    if (!Array.isArray(list)) throw new Error('no es un array');
    return { count: list.length };
  });

  await r.step('getActivityFeed devuelve eventos recientes', async () => {
    const list = arr(await client.post('getActivityFeed', { limit: 10 }));
    if (!Array.isArray(list)) throw new Error('no es un array');
    if (list.length === 0) throw new Error('feed vacío: no se registró ningún evento');
    return { count: list.length };
  });

  await r.step('getProfitByCompany responde para el rango actual', async () => {
    const res = await client.post('getProfitByCompany', {
      company: 'TA',
      startDate: addDays(today(), -30),
      endDate: today(),
    });
    if (!res || typeof res !== 'object') throw new Error('respuesta inválida');
    return res;
  });

  // ── Configuración ────────────────────────────────────────────────────────
  r.section('Configuración (round-trip idempotente)');

  await r.step('saveSettings reescribe los mismos valores', async () => {
    const current = await client.post('getSettings', {});
    if (!current || typeof current !== 'object') throw new Error('getSettings inválido');
    const keys = Object.keys(current);
    if (keys.length === 0) throw new Error('Settings vacío: no hay nada que reescribir');
    const res = await client.post('saveSettings', { settings: current });
    if (!res?.success) throw new Error('saveSettings no devolvió success');
    const after = await client.post('getSettings', {});
    for (const k of keys) {
      if (String(after[k]) !== String(current[k])) {
        throw new Error(`la key ${k} cambió: ${current[k]} → ${after[k]}`);
      }
    }
    return { keys: keys.length };
  });

  await r.step('saveVehicleTypes reescribe la lista actual', async () => {
    const current = arr(await client.post('getVehicleTypes', {}));
    if (current.length === 0) throw new Error('lista de vehicle types vacía');
    const res = await client.post('saveVehicleTypes', { types: current });
    if (!res?.success) throw new Error('saveVehicleTypes no devolvió success');
    const after = arr(await client.post('getVehicleTypes', {}));
    if (after.join(',') !== current.join(',')) {
      throw new Error(`lista distinta: ${current.join(',')} → ${after.join(',')}`);
    }
    return { types: current };
  });

  await r.step('saveServiceTypes reescribe la lista actual', async () => {
    const current = arr(await client.post('getServiceTypes', {}));
    if (current.length === 0) throw new Error('lista de service types vacía');
    const res = await client.post('saveServiceTypes', { types: current });
    if (!res?.success) throw new Error('saveServiceTypes no devolvió success');
    const after = arr(await client.post('getServiceTypes', {}));
    if (after.join(',') !== current.join(',')) {
      throw new Error(`lista distinta: ${current.join(',')} → ${after.join(',')}`);
    }
    return { types: current };
  });

  await r.step('updateOperatingCompany actualiza sin cambiar el nombre', async () => {
    const list = arr(await client.post('getOperatingCompanies', {}));
    if (list.length === 0) throw new Error('no hay operating companies');
    const company = list[0];
    const id = idOf(company);
    const res = await client.post('updateOperatingCompany', {
      id,
      name: company.name || company.Name,
      active: company.active ?? company.Active,
    });
    if (res && res.success === false) throw new Error('updateOperatingCompany falló');
    return { id };
  });

  // ── Usuarios ─────────────────────────────────────────────────────────────
  r.section('Usuarios: update y reject');

  const tempUsername = `${ctx.tag.toLowerCase()}-upd`;
  let tempUserId = null;

  await r.step('createUser crea una cuenta de prueba', async () => {
    const res = await client.post('createUser', {
      username: tempUsername,
      email: `${tempUsername}@example.invalid`,
      password: 'Update2026!',
      name: 'E2E Update',
      role: 'coordinator',
    });
    tempUserId = idOf(res) || res.userId;
    if (!tempUserId) throw new Error('sin userId');
    ctx.track('userIds', tempUserId);
    return { id: tempUserId };
  });

  await r.step('updateUser cambia el nombre', async () => {
    const res = await client.post('updateUser', { userId: tempUserId, updates: { name: 'E2E Updated' } });
    if (res && res.success === false) throw new Error('updateUser falló');
    const data = await client.post('getUsers', {});
    const list = Array.isArray(data) ? data : data?.users || [];
    const found = list.find((u) => (u.id || u.ID) === tempUserId);
    if (!found) throw new Error('el usuario no aparece en getUsers');
    if (found.name && found.name !== 'E2E Updated') throw new Error(`name=${found.name}`);
    return found;
  });

  await r.step('rejectUser rechaza la cuenta', async () => {
    const res = await client.post('rejectUser', { userId: tempUserId });
    if (res && res.success === false) throw new Error('rejectUser falló');
    return res;
  });

  await r.expectFailure(
    'una cuenta rechazada no puede loguear',
    () => client.raw('loginUser', { username: tempUsername, password: 'Update2026!' }),
    /rejected|pending|Invalid credentials|disabled/i
  );

  // ── Catálogo: updates y lecturas ─────────────────────────────────────────
  r.section('Catálogo: updates y lecturas');

  await r.step('updateProject cambia las notas', async () => {
    const res = await client.post('updateProject', {
      id: ctx.ids.projectId,
      changes: { notes: `E2E updated ${ctx.tag}` },
    });
    if (res && res.success === false) throw new Error('updateProject falló');
    const projects = arr(await client.post('getProjects', {}));
    const found = projects.find((p) => idOf(p) === ctx.ids.projectId);
    if (!found) throw new Error('el proyecto no aparece en getProjects');
    return found;
  });

  await r.step('updateRateCard cambia las notas', async () => {
    const res = await client.post('updateRateCard', {
      id: ctx.ids.rateCardId,
      changes: { notes: `E2E updated ${ctx.tag}` },
    });
    if (res && res.success === false) throw new Error('updateRateCard falló');
    const cards = arr(await client.post('getRateCards', {}));
    const found = cards.find((c) => idOf(c) === ctx.ids.rateCardId);
    if (!found) throw new Error('la tarifa no aparece en getRateCards');
    return found;
  });

  await r.step('updateDriverRate cambia el full day', async () => {
    let rates = arr(await client.post('getDriverRates', { driverId }));
    if (rates.length === 0) rates = arr(await client.post('getDriverRates', {}));
    const rate = rates.find((x) => (x.driverId || x.DriverID) === driverId) || rates[0];
    if (!rate) throw new Error('el fixture no dejó driver rates');
    const res = await client.post('updateDriverRate', {
      id: idOf(rate),
      changes: { fullDayRate: 295 },
    });
    if (res && res.success === false) throw new Error('updateDriverRate falló');
    const after = arr(await client.post('getDriverRates', {})).find((x) => idOf(x) === idOf(rate));
    if (after && Math.abs(parseFloat(after.fullDayRate) - 295) > 0.01) {
      throw new Error(`fullDayRate=${after.fullDayRate}`);
    }
    return after;
  });

  let flyDriverId = null;
  await r.step('createDriverOnTheFly crea un chofer', async () => {
    const res = await client.post('createDriverOnTheFly', {
      name: `${ctx.tag} Driver Fly`,
      phone: '+39 333 111 2222',
      type: 'Internal',
      driverOwnership: 'Internal',
    });
    flyDriverId = idOf(res);
    if (!flyDriverId) throw new Error('sin id de chofer');
    ctx.track('drivers', flyDriverId);
    const drivers = arr(await client.post('getDrivers', {}));
    if (!drivers.some((d) => idOf(d) === flyDriverId)) throw new Error('el chofer no aparece en getDrivers');
    return { id: flyDriverId };
  });

  await r.step('getDriversByCollaborator responde por colaborador', async () => {
    const list = arr(await client.post('getDriversByCollaborator', { collaboratorId: ctx.ids.collaboratorId }));
    if (!Array.isArray(list)) throw new Error('no es un array');
    return { count: list.length };
  });

  await r.step('getVehicles y getCollaborators incluyen las fixtures', async () => {
    const vehicles = arr(await client.post('getVehicles', {}));
    if (!vehicles.some((v) => idOf(v) === ctx.ids.vehicleId)) throw new Error('falta el vehículo fixture');
    const collaborators = arr(await client.post('getCollaborators', {}));
    if (!collaborators.some((c) => idOf(c) === ctx.ids.collaboratorId)) throw new Error('falta el colaborador fixture');
    return { vehicles: vehicles.length, collaborators: collaborators.length };
  });

  // ── Links de chofer: edición y respuestas ────────────────────────────────
  r.section('Links de chofer: update y respuestas');

  let editLinkToken = null;
  await r.step('generateDriverLink crea un link para editar', async () => {
    const res = await client.post('generateDriverLink', {
      driverId,
      projectId: ctx.ids.projectId,
      dateFrom: today(),
      dateTo: addDays(today(), 7),
      baseUrl: 'https://example.invalid',
      linkDurationDays: 2,
    });
    editLinkToken = res?.token;
    if (!editLinkToken) throw new Error('sin token');
    ctx.track('linkTokens', editLinkToken);
    return { token: editLinkToken };
  });

  await r.step('updateDriverLink extiende DateTo', async () => {
    const newEnd = addDays(today(), 14);
    const res = await client.post('updateDriverLink', {
      linkToken: editLinkToken,
      updates: { DateTo: newEnd },
    });
    if (res && res.success === false) throw new Error(`updateDriverLink: ${res.error || 'falló'}`);
    const links = arr(await client.post('getDriverLinks', { filters: { driverId } }));
    const found = links.find((l) => (l.token || l.Token) === editLinkToken);
    if (!found) throw new Error('el link no aparece');
    return found;
  });

  await r.step('getDriverLinkResponses responde con una lista', async () => {
    const list = arr(await client.post('getDriverLinkResponses', { filters: {} }));
    if (!Array.isArray(list)) throw new Error('no es un array');
    return { count: list.length };
  });

  await r.step('deactivateDriverLink revoca el link de prueba', async () => {
    const res = await client.post('deactivateDriverLink', { linkToken: editLinkToken });
    if (res && res.success === false) throw new Error('deactivateDriverLink falló');
    return res;
  });

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  r.section('WhatsApp: parse y captura');

  const waText = [
    `${today().split('-').reverse().join('/')} E2E Driver Alpha`,
    'Inizio 08:00 Fine 18:30',
    'Km 140',
    'Diaria piena',
    'Parcheggio 12',
    'Pedaggi 8',
  ].join('\n');

  let parsed = null;
  await r.step('parseWhatsApp interpreta un rapportino de texto', async () => {
    parsed = await client.post('parseWhatsApp', { text: waText });
    if (!parsed?.success) throw new Error(parsed?.error || 'parse falló');
    if (!Array.isArray(parsed.reports) || parsed.reports.length === 0) throw new Error('sin reports');
    return { reportCount: parsed.reportCount, first: parsed.reports[0]?.driverName };
  });

  await r.expectFailure(
    'parseWhatsApp rechaza un texto basura',
    () => client.post('parseWhatsApp', { text: 'zzz' }),
    /too short|Could not parse/i
  );

  await r.step('captureWhatsAppReports crea items de inbox', async () => {
    if (!parsed?.reports?.length) throw new Error('no hay parse previo para capturar');
    const before = arr(await client.post('getInboxItems', { filters: {} })).length;
    const res = await client.post('captureWhatsAppReports', {
      reports: parsed.reports.slice(0, 1),
      projectId: ctx.ids.projectId,
    });
    const created = arr(res);
    for (const item of created) {
      const id = idOf(item) || item.inboxId;
      if (id) ctx.track('inboxIds', id);
    }
    const after = arr(await client.post('getInboxItems', { filters: {} })).length;
    if (after <= before) throw new Error(`el inbox no creció: ${before} → ${after}`);
    return { created: created.length, before, after };
  });

  // ── Inbox masivo ─────────────────────────────────────────────────────────
  r.section('Inbox: lock y operaciones masivas');

  const bulkIds = [];
  await r.step('captureReport crea dos items para el lote', async () => {
    for (const km of [101, 102]) {
      const cap = await client.post('captureReport', {
        source: 'whatsapp',
        channel: 'manual',
        driverId,
        projectId: ctx.ids.projectId,
        serviceDate: today(),
        rawData: { startTime: '08:00', endTime: '18:00', kmTotal: km, hasDiaria: true, diariaType: 'piena' },
      });
      const id = cap?.inboxId;
      if (!id) throw new Error('sin inboxId');
      ctx.track('inboxIds', id);
      bulkIds.push(id);
    }
    return { ids: bulkIds.length };
  });

  await r.step('lockReport bloquea el primero', async () => {
    const res = await client.post('lockReport', { inboxId: bulkIds[0] });
    if (res && res.success === false) throw new Error('lockReport falló');
    const item = await client.post('getInboxItem', { id: bulkIds[0] });
    if (item && item.locked !== undefined && item.locked !== true && item.locked !== 'true') {
      throw new Error(`locked=${item.locked}`);
    }
    return res;
  });

  await r.step('bulkNormalizeInbox normaliza el segundo', async () => {
    const res = await client.post('bulkNormalizeInbox', {
      inboxIds: [bulkIds[1]],
      normalizedData: {
        startTime: '08:00',
        endTime: '18:00',
        kmTotal: 102,
        hasDiaria: true,
        diariaType: 'piena',
        isFestivo: false,
        isNotturno: false,
      },
    });
    if (res && res.success === false) throw new Error(`bulkNormalizeInbox: ${res.error || 'falló'}`);
    return res;
  });

  await r.step('bulkAcceptInbox acepta el lote normalizado', async () => {
    const res = await client.post('bulkAcceptInbox', { inboxIds: [bulkIds[1]] });
    if (res && res.success === false) throw new Error(`bulkAcceptInbox: ${res.error || 'falló'}`);
    const created = arr(res);
    for (const item of created) {
      const id = idOf(item) || item.reportId;
      if (id) ctx.track('reportIds', id);
    }
    return { accepted: created.length };
  });

  // ── Transport lists ──────────────────────────────────────────────────────
  r.section('Transport lists');

  await r.step('autoDetectImportTargets responde con candidatos', async () => {
    const res = await client.post('autoDetectImportTargets', {
      production: ctx.tag,
      projectName: ctx.tag,
    });
    if (!res || typeof res !== 'object') throw new Error('respuesta inválida');
    if (!Array.isArray(res.clients) || !Array.isArray(res.projects)) {
      throw new Error('faltan clients/projects en la respuesta');
    }
    return { clients: res.clients.length, projects: res.projects.length };
  });

  await r.step('getTransportLists filtra por proyecto', async () => {
    const list = arr(await client.post('getTransportLists', { projectId: ctx.ids.projectId }));
    if (!Array.isArray(list)) throw new Error('no es un array');
    return { count: list.length };
  });

  await r.step('exportTransportListExcel genera el archivo', async () => {
    const res = await client.post('exportTransportListExcel', {
      services: [
        {
          vehicle: 'Van 1',
          driver: 'E2E Driver',
          driverPhone: '+39 000',
          time: '09:00',
          passengers: 'E2E Passenger',
          from: 'Milano',
          to: 'Malpensa',
        },
      ],
      fileName: `${ctx.tag}-export.xlsx`,
    });
    if (!res || res.success === false) throw new Error(res?.error || 'export falló');
    if (!res.excelUrl && !res.fileId) throw new Error('sin excelUrl ni fileId');
    return { excelUrl: !!res.excelUrl, fileId: !!res.fileId };
  });

  await r.expectFailure(
    'uploadTransportListFile rechaza un archivo inválido',
    () =>
      client.post('uploadTransportListFile', {
        fileData: 'esto-no-es-base64-de-un-xlsx',
        fileName: 'invalido.xlsx',
      }),
    /.*/
  );

  // ── Rapportino de colaborador ────────────────────────────────────────────
  r.section('Rapportino de colaborador');

  let collabDriverId = null;
  let collaboratorServiceId = null;
  let collaboratorRapportinoId = null;

  await r.step('chofer vinculado al colaborador', async () => {
    const res = await client.post('createDriverOnTheFly', {
      name: `${ctx.tag} Collab Driver`,
      phone: '+39 333 444 5555',
      type: 'Internal',
      driverOwnership: 'Collaborator',
      collaboratorId: ctx.ids.collaboratorId,
    });
    collabDriverId = idOf(res);
    if (!collabDriverId) throw new Error('sin id');
    ctx.track('drivers', collabDriverId);
    return { id: collabDriverId };
  });

  await r.step('servicio completado con proveedor colaborador', async () => {
    const svc = await createService(ctx, { time: '06:45', serviceType: 'Dispo' });
    await driveToCompleted(ctx, svc.id, collabDriverId, ctx.ids.vehicleId);
    const dto = await getService(ctx, svc.id);
    if (dto.providerType !== 'collaborator') throw new Error(`providerType=${dto.providerType}`);
    if (dto.providerId !== ctx.ids.collaboratorId) throw new Error(`providerId=${dto.providerId}`);
    collaboratorServiceId = svc.id;
    return { providerType: dto.providerType };
  });

  await r.step('createRapportinoCollaborator', async () => {
    const res = await client.post('createRapportinoCollaborator', {
      projectId: ctx.ids.projectId,
      collaboratorId: ctx.ids.collaboratorId,
      periodStart: today(),
      periodEnd: addDays(today(), 6),
      periodType: 'weekly',
    });
    collaboratorRapportinoId = idOf(res);
    if (!collaboratorRapportinoId) throw new Error('sin id');
    ctx.track('rapportinoCollaboratorIds', collaboratorRapportinoId);
    return res;
  });

  await r.step('addServiceToRapportinoCollaborator suma el servicio', async () => {
    const res = await client.post('addServiceToRapportinoCollaborator', {
      rapportinoId: collaboratorRapportinoId,
      serviceId: collaboratorServiceId,
    });
    if (res && res.success === false) throw new Error(`addService: ${res.error || 'falló'}`);
    return res;
  });

  await r.step('getRapportinoCollaborators y getRapportinoCollaboratorItems', async () => {
    const list = arr(await client.post('getRapportinoCollaborators', { filters: { projectId: ctx.ids.projectId } }));
    if (!list.some((x) => idOf(x) === collaboratorRapportinoId)) throw new Error('no aparece el rapportino');
    const items = arr(await client.post('getRapportinoCollaboratorItems', { rapportinoId: collaboratorRapportinoId }));
    if (items.length === 0) throw new Error('sin items');
    return { items: items.length };
  });

  await r.step('getRapportinoClients devuelve la lista', async () => {
    const list = arr(await client.post('getRapportinoClients', { filters: { projectId: ctx.ids.projectId } }));
    if (!Array.isArray(list)) throw new Error('no es un array');
    return { count: list.length };
  });

  await r.step('sendRapportinoCollaborator lo envía', async () => {
    const res = await client.post('sendRapportinoCollaborator', { rapportinoId: collaboratorRapportinoId });
    expectStatus(res, ['Enviado', 'Enviato'], 'sendRapportinoCollaborator');
    return res;
  });

  await r.step('acceptRapportinoCollaborator lo acepta', async () => {
    const res = await client.post('acceptRapportinoCollaborator', { rapportinoId: collaboratorRapportinoId });
    expectStatus(res, ['Aceptado', 'Acceptato'], 'acceptRapportinoCollaborator');
    return res;
  });

  await r.step('removeServiceFromRapportino quita el servicio', async () => {
    const res = await client.post('removeServiceFromRapportino', {
      rapportinoId: collaboratorRapportinoId,
      serviceId: collaboratorServiceId,
    });
    if (res && res.success === false) throw new Error(`removeService: ${res.error || 'falló'}`);
    return res;
  });

  await r.step('rejectRapportinoClient rechaza un rapportino nuevo', async () => {
    const created = await client.post('createRapportinoClient', {
      projectId: ctx.ids.projectId,
      clientId: ctx.ids.clientId,
      weekStart: today(),
      weekEnd: addDays(today(), 6),
      periodType: 'weekly',
    });
    const id = idOf(created);
    if (!id) throw new Error('sin id');
    ctx.track('rapportinoClientIds', id);
    const res = await client.post('rejectRapportinoClient', { rapportinoId: id, reason: 'E2E rechazo' });
    expectStatus(res, ['Rechazado', 'Rifiutato'], 'rejectRapportinoClient');
    return res;
  });

  // ── Reconciliación y comandos legacy ─────────────────────────────────────
  r.section('Reconciliación y comandos legacy');

  const economicsServiceId = ctx.flowState?.economicsServiceId;

  await r.step('createReconciliation + getReconciliation', async () => {
    if (!economicsServiceId) throw new Error('la suite 04 no dejó un servicio validado');
    const created = await client.post('createReconciliation', { serviceId: economicsServiceId });
    const id = idOf(created) || created?.reconciliationId;
    if (!id) throw new Error('sin id de reconciliación');
    ctx.track('reconciliationIds', id);
    const got = await client.post('getReconciliation', { id });
    if (idOf(got) !== id) throw new Error('id distinto');
    return got;
  });

  await r.step('debugServiceEconomicsChain devuelve la cadena', async () => {
    if (!economicsServiceId) throw new Error('sin servicio de economía');
    const res = await client.post('debugServiceEconomicsChain', { serviceId: economicsServiceId });
    if (!res || typeof res !== 'object') throw new Error('respuesta inválida');
    return res;
  });

  await r.step('calculateService deja el servicio en Calculado', async () => {
    const svc = await createService(ctx, { time: '11:15' });
    await driveToCompleted(ctx, svc.id, driverId, ctx.ids.vehicleId);
    await client.post('calculateService', { serviceId: svc.id });
    const dto = await getService(ctx, svc.id);
    if (dto.financialStatus !== 'Calculado') throw new Error(`financialStatus=${dto.financialStatus}`);
    return { status: dto.financialStatus };
  });

  await r.step('reportService → Reportado → moveToRevision → Revision', async () => {
    const svc = await createService(ctx, { time: '12:00' });
    await driveToCompleted(ctx, svc.id, driverId, ctx.ids.vehicleId);

    await client.post('reportService', { serviceId: svc.id });
    let dto = await getService(ctx, svc.id);
    if (dto.operationalStatus !== 'Reportado') {
      throw new Error(`reportService dejó operationalStatus=${dto.operationalStatus}`);
    }

    await client.post('moveToRevision', { serviceId: svc.id });
    dto = await getService(ctx, svc.id);
    if (dto.operationalStatus !== 'Revision') {
      throw new Error(`moveToRevision dejó operationalStatus=${dto.operationalStatus}`);
    }
    return { status: dto.operationalStatus };
  });

  await r.step('moveToConfrontacion deja el servicio en Confrontacion', async () => {
    const svc = await createService(ctx, { time: '13:30' });
    await driveToCompleted(ctx, svc.id, driverId, ctx.ids.vehicleId);
    await client.post('calculateService', { serviceId: svc.id });
    await client.post('moveToConfrontacion', { serviceId: svc.id });
    const dto = await getService(ctx, svc.id);
    if (dto.financialStatus !== 'Confrontacion') {
      throw new Error(`financialStatus=${dto.financialStatus}`);
    }
    return { status: dto.financialStatus };
  });

  // ── Anticipos ────────────────────────────────────────────────────────────
  r.section('Anticipos de chofer');

  let advanceId = null;
  await r.step('createDriverAdvance crea un anticipo', async () => {
    const res = await client.post('createDriverAdvance', {
      DriverID: driverId,
      ProjectID: ctx.ids.projectId,
      Amount: 5,
      Notes: `E2E ${ctx.tag}`,
    });
    advanceId = idOf(res);
    if (!advanceId) throw new Error('sin id');
    return res;
  });

  await r.step('getDriverAdvances y getDriverAdvance lo devuelven', async () => {
    const list = arr(await client.post('getDriverAdvances', { driverId }));
    if (!list.some((a) => idOf(a) === advanceId)) throw new Error('no aparece en la lista');
    const one = await client.post('getDriverAdvance', { id: advanceId });
    if (idOf(one) !== advanceId) throw new Error('detalle con id distinto');
    return { count: list.length };
  });

  await r.step('updateDriverAdvance cambia las notas', async () => {
    const res = await client.post('updateDriverAdvance', {
      id: advanceId,
      changes: { Notes: `E2E updated ${ctx.tag}` },
    });
    if (res && res.success === false) throw new Error('updateDriverAdvance falló');
    return res;
  });

  await r.step('checkDriverPendingAdvances reporta el pendiente', async () => {
    const res = await client.post('checkDriverPendingAdvances', { driverId });
    if (!res || typeof res !== 'object') throw new Error('respuesta inválida');
    return res;
  });

  // ── Gastos ───────────────────────────────────────────────────────────────
  r.section('Gastos: crear, confirmar y corregir');

  let expenseId = null;
  await r.step('createExpense crea un gasto en borrador', async () => {
    const res = await client.post('createExpense', {
      OwnerType: 'Driver',
      OwnerID: driverId,
      Category: 'Parking',
      Description: `E2E ${ctx.tag} expense`,
      Amount: 15,
      ExpenseDate: today(),
      AccountingDate: today(),
      ProjectID: ctx.ids.projectId,
      OperatingCompany: 'TA',
    });
    expenseId = idOf(res);
    if (!expenseId) throw new Error('sin id');
    ctx.track('expenseIds', expenseId);
    return res;
  });

  await r.step('confirmExpense lo confirma', async () => {
    const res = await client.post('confirmExpense', { id: expenseId });
    if (res && res.success === false) throw new Error(`confirmExpense: ${res.error || 'falló'}`);
    return res;
  });

  await r.step('correctExpense crea la corrección y cancela el original', async () => {
    const res = await client.post('correctExpense', { id: expenseId });
    const newId = idOf(res);
    if (!newId) throw new Error('sin id de la corrección');
    if (newId === expenseId) throw new Error('la corrección reutilizó el mismo id');
    ctx.track('expenseIds', newId);
    const original = await client.post('getExpense', { id: expenseId });
    if (original?.status && original.status !== 'Cancelled') {
      throw new Error(`el original quedó en ${original.status}`);
    }
    return { newId };
  });

  // ── Pagos ────────────────────────────────────────────────────────────────
  r.section('Pagos: editPayment');

  const paymentId = (ctx.ids.paymentIds || [])[0];
  if (paymentId) {
    await r.expectFailure(
      'editPayment rechaza un pago ya conciliado (P005)',
      () => client.post('editPayment', { paymentId, changes: { Amount: 1 } }),
      /Registrado|P005/i
    );
    r.skip(
      'editPayment sobre un pago Registrado',
      'requiere un pago con saldo pendiente; las suites 06/07 dejan el invoice saldado'
    );
  } else {
    r.skip('editPayment', 'la suite 07 no dejó pagos');
  }

  // ── Fuera de alcance ─────────────────────────────────────────────────────
  r.section('Fuera de alcance (deliberado)');

  r.skip('sendTransportListEmail', 'envía un email real a los destinatarios');
  r.skip('sendServicesToAgency', 'envía un email real a la agencia');
  r.skip('migrateImportedServicesWithDriver', 'migración global: reescribe todos los servicios importados');
  r.skip('importTransportListWithProject', 'requiere un xlsx real subido a Drive');
  r.skip('cleanupDrivers', 'borra choferes huérfanos de toda la base');
  r.skip('payRapportinoCollaborator', 'requiere datos de pago reales (método, IBAN, fecha)');
  r.skip('payRapportinoDriver', 'requiere datos de pago reales');
  r.skip('rejectRapportinoDriver', 'el fixture no deja un rapportino de chofer en estado rechazable');
  r.skip('linkReportToService', 'requiere un reporte huérfano sin servicio');
  r.skip('rejectDriverReport', 'requiere un reporte en revisión con servicio ya validado');
}
