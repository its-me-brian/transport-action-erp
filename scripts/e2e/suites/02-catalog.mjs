// ============================================================================
// SUITE 02 — Catálogos maestros: CRUD completo
// ============================================================================

import { addDays, today } from '../lib/fixtures.mjs';

export const name = '02-catalog';
export const description = 'clientes, contactos, proyectos (máquina de estados), choferes, vehículos, colaboradores, tarifas, cambios, documentos y gastos';

export async function run(ctx) {
  const { client, reporter: r } = ctx;
  const tag = ctx.tag;
  const suffix = String(Date.now()).slice(-5);

  r.section('Clientes');
  let tempClientId = null;
  await r.step('createClient', async () => {
    const dto = await client.post('createClient', {
      name: `${tag} Client Temp ${suffix}`,
      type: 'Agency',
      vat: 'IT99999999999',
      paymentTerms: 15,
    });
    tempClientId = dto.id;
    return dto;
  });
  await r.step('getClient devuelve el registro', async () => {
    const dto = await client.post('getClient', { id: tempClientId });
    if (dto.name !== `${tag} Client Temp ${suffix}`) throw new Error('nombre distinto');
    return dto;
  });
  await r.step('updateClient modifica campos', async () => {
    await client.post('updateClient', { id: tempClientId, changes: { phone: '+39 011 2223333', notes: 'editado' } });
    const dto = await client.post('getClient', { id: tempClientId });
    if (dto.phone !== '+39 011 2223333') throw new Error(`phone=${dto.phone}`);
    return dto;
  });
  await r.step('getClients lo incluye en la lista', async () => {
    const list = await client.post('getClients', {});
    if (!Array.isArray(list) || !list.some((c) => c.id === tempClientId)) throw new Error('no aparece');
    return list;
  });

  r.section('Contactos');
  let contactId = null;
  await r.step('createContact', async () => {
    const dto = await client.post('createContact', {
      clientId: tempClientId,
      name: `${tag} Contact`,
      role: 'Producer',
      phone: '+39 340 0000000',
      email: 'contact@example.invalid',
    });
    contactId = dto.id;
    return dto;
  });
  await r.step('getContacts filtra por cliente', async () => {
    const list = await client.post('getContacts', { clientId: tempClientId });
    if (!list.some((c) => c.id === contactId)) throw new Error('contacto ausente');
    return list;
  });
  await r.step('updateContact', async () => {
    await client.post('updateContact', { id: contactId, changes: { role: 'Coordinator' } });
    const list = await client.post('getContacts', { clientId: tempClientId });
    const found = list.find((c) => c.id === contactId);
    if (found.role !== 'Coordinator') throw new Error(`role=${found.role}`);
    return found;
  });
  await r.step('deleteContact', () => client.post('deleteContact', { id: contactId }));

  r.section('Proyectos');
  let tempProjectId = null;
  await r.step('createProject arranca en Nuovo', async () => {
    const dto = await client.post('createProject', {
      name: `${tag} Project Temp ${suffix}`,
      clientId: tempClientId,
      dateFrom: today(),
      dateTo: addDays(today(), 10),
    });
    tempProjectId = dto.id;
    if (dto.status !== 'Nuovo') throw new Error(`status=${dto.status}`);
    return dto;
  });
  await r.step('prepararProject → Preparazione', async () => {
    const dto = await client.post('prepararProject', { id: tempProjectId });
    if (dto.status !== 'Preparazione') throw new Error(`status=${dto.status}`);
    return dto;
  });
  await r.step('activarProject → Attivo', async () => {
    const dto = await client.post('activarProject', { id: tempProjectId });
    if (dto.status !== 'Attivo') throw new Error(`status=${dto.status}`);
    return dto;
  });
  await r.expectFailure(
    'prepararProject no se puede repetir (transición inválida)',
    () => client.post('prepararProject', { id: tempProjectId }),
    /transition|Transición|invalid|Attivo/i
  );
  await r.step('pasarAFacturacionProject → Fatturazione', async () => {
    const dto = await client.post('pasarAFacturacionProject', { id: tempProjectId });
    if (dto.status !== 'Fatturazione') throw new Error(`status=${dto.status}`);
    return dto;
  });
  await r.step('pasarACobroProject → Incasso', async () => {
    const dto = await client.post('pasarACobroProject', { id: tempProjectId });
    if (dto.status !== 'Incasso') throw new Error(`status=${dto.status}`);
    return dto;
  });
  await r.step('cerrarProject → Chiuso', async () => {
    const dto = await client.post('cerrarProject', { id: tempProjectId });
    if (dto.status !== 'Chiuso') throw new Error(`status=${dto.status}`);
    return dto;
  });
  await r.step('archiveProject → Archiviato', async () => {
    const dto = await client.post('archiveProject', { id: tempProjectId });
    if (dto.status !== 'Archiviato') throw new Error(`status=${dto.status}`);
    return dto;
  });
  await r.step('getProjects incluye el proyecto', async () => {
    const list = await client.post('getProjects', {});
    if (!list.some((p) => p.id === tempProjectId)) throw new Error('no aparece');
    return list;
  });

  r.section('Choferes');
  let tempDriverId = null;
  await r.step('createDriver', async () => {
    const dto = await client.post('createDriver', {
      name: `${tag} Driver Temp ${suffix}`,
      phone: '+39 333 9999999',
      status: 'Disponible',
    });
    tempDriverId = dto.id;
    return dto;
  });
  await r.step('updateDriver', async () => {
    await client.post('updateDriver', {
      id: tempDriverId,
      fields: { licenseType: 'B', licenseExpiry: addDays(today(), 365), iban: 'IT00X0000000000000000000000' },
    });
    const dto = await client.post('getDriver', { id: tempDriverId });
    if (dto.licenseType !== 'B') throw new Error(`licenseType=${dto.licenseType}`);
    return dto;
  });
  await r.expectFailure(
    'createDriver exige nombre',
    () => client.post('createDriver', { phone: '+39 000' }),
    /Name is required/i
  );
  await r.step('getDrivers incluye el chofer', async () => {
    const list = await client.post('getDrivers', {});
    if (!list.some((d) => d.id === tempDriverId)) throw new Error('no aparece');
    return list;
  });

  r.section('Vehículos');
  let tempVehicleId = null;
  const plate = `ZZ${suffix}`;
  await r.step('createVehicle', async () => {
    const dto = await client.post('createVehicle', {
      plate,
      brand: 'Iveco',
      model: 'Daily',
      type: 'Van',
      ownership: 'Owned',
      capacity: 9,
    });
    tempVehicleId = dto.id;
    return dto;
  });
  await r.expectFailure(
    'no se puede repetir la patente',
    () => client.post('createVehicle', { plate, type: 'Van' }),
    /already exists|DUPLICATE/i
  );
  await r.step('updateVehicle', async () => {
    await client.post('updateVehicle', { id: tempVehicleId, changes: { capacity: 12 } });
    const dto = await client.post('getVehicle', { id: tempVehicleId });
    if (Number(dto.capacity) !== 12) throw new Error(`capacity=${dto.capacity}`);
    return dto;
  });

  r.section('Colaboradores y tarifas');
  let tempCollabId = null;
  await r.step('createCollaborator', async () => {
    const dto = await client.post('createCollaborator', {
      name: `${tag} Collab Temp ${suffix}`,
      vat: 'IT22222222222',
      paymentTerms: 30,
      active: true,
    });
    tempCollabId = dto.id;
    return dto;
  });
  await r.step('updateCollaborator', async () => {
    await client.post('updateCollaborator', { id: tempCollabId, changes: { phone: '+39 02 9999999' } });
    const dto = await client.post('getCollaborator', { id: tempCollabId });
    if (dto.phone !== '+39 02 9999999') throw new Error(`phone=${dto.phone}`);
    return dto;
  });

  let tempSupplierRateId = null;
  await r.step('createSupplierRate', async () => {
    const dto = await client.post('createSupplierRate', {
      supplierType: 'collaborator',
      supplierId: tempCollabId,
      projectId: ctx.ids.projectId,
      serviceType: 'Dispo',
      vehicleType: 'Van',
      baseRate: 200,
      includedKm: 80,
      includedHours: 8,
      extraKmRate: 0.6,
      extraHourRate: 30,
    });
    tempSupplierRateId = dto.id;
    return dto;
  });
  await r.step('getSupplierRates lo lista', async () => {
    const list = await client.post('getSupplierRates', {});
    if (!list.some((s) => s.id === tempSupplierRateId)) throw new Error('no aparece');
    return list;
  });
  await r.step('updateSupplierRate', async () => {
    await client.post('updateSupplierRate', { id: tempSupplierRateId, changes: { baseRate: 210 } });
    const dto = await client.post('getSupplierRate', { id: tempSupplierRateId });
    if (Number(dto.baseRate) !== 210) throw new Error(`baseRate=${dto.baseRate}`);
    return dto;
  });

  let tempDriverRateId = null;
  await r.step('createDriverRate', async () => {
    const dto = await client.post('createDriverRate', {
      driverId: tempDriverId,
      vehicleType: 'Van',
      transferRate: 100,
      fullDayRate: 260,
    });
    tempDriverRateId = dto.id;
    return dto;
  });
  await r.step('getDriverRates filtra por chofer', async () => {
    const list = await client.post('getDriverRates', { driverId: tempDriverId });
    if (!list.some((d) => d.id === tempDriverRateId)) throw new Error('no aparece');
    return list;
  });

  let tempRateCardId = null;
  await r.step('createRateCard exige VehicleType', async () => {
    await r.expectFailure(
      'createRateCard sin VehicleType falla',
      () => client.post('createRateCard', { name: 'sin tipo' }),
      /VehicleType is required/i
    );
    const dto = await client.post('createRateCard', {
      name: `${tag} RateCard Temp ${suffix}`,
      vehicleType: 'Van',
      serviceType: 'Dispo',
      basePrice: 300,
      clientId: tempClientId,
    });
    tempRateCardId = dto.id;
    return dto;
  });
  await r.step('getRateCards filtra por cliente', async () => {
    const list = await client.post('getRateCards', { clientId: tempClientId });
    if (!list.some((c) => c.id === tempRateCardId)) throw new Error('no aparece');
    return list;
  });

  r.section('Cambios y documentos');
  let changeId = null;
  await r.step('createChange', async () => {
    const dto = await client.post('createChange', {
      entityType: 'Service',
      entityId: 'SVC-E2E',
      type: 'Issue',
      description: 'Cambio de prueba E2E',
      priority: 'Low',
      dueDate: addDays(today(), 5),
    });
    changeId = dto.id;
    return dto;
  });
  await r.step('getChanges lo lista', async () => {
    // getChanges devuelve { changes: [...] }, igual que consume ChangesScreen.
    const res = await client.post('getChanges', {});
    const list = Array.isArray(res) ? res : res?.changes ?? [];
    if (!list.some((c) => c.id === changeId)) throw new Error('no aparece');
    if (!changeId) throw new Error('createChange no devolvió id');
    return list;
  });
  await r.step('updateChange y resolveChange', async () => {
    await client.post('updateChange', { id: changeId, notes: 'actualizado' });
    const resolved = await client.post('resolveChange', { id: changeId });
    if (resolved.status !== 'Resuelto' && resolved.status !== 'Resolved') throw new Error(`status=${resolved.status}`);
    return resolved;
  });
  await r.step('deleteChange', () => client.post('deleteChange', { id: changeId }));

  let documentId = null;
  await r.step('createDocument y getDocuments', async () => {
    const dto = await client.post('createDocument', {
      entityType: 'Client',
      entityId: tempClientId,
      fileName: 'contrato.pdf',
      fileUrl: 'https://example.invalid/contrato.pdf',
      mimeType: 'application/pdf',
      uploadedBy: 'e2e',
    });
    documentId = dto.id;
    const list = await client.post('getDocuments', { entityType: 'Client', entityId: tempClientId });
    if (!list.some((d) => d.id === documentId)) throw new Error('no aparece');
    return dto;
  });
  await r.step('deleteDocument', () => client.post('deleteDocument', { id: documentId }));

  r.section('Gastos');
  let expenseId = null;
  await r.step('createExpense (Draft)', async () => {
    const dto = await client.post('createExpense', {
      ownerType: 'proyecto',
      ownerId: ctx.ids.projectId,
      category: 'Fuel',
      description: 'Gasto E2E',
      amount: 75.5,
      expenseDate: today(),
    });
    expenseId = dto.id;
    if (dto.status !== 'Draft') throw new Error(`status=${dto.status}`);
    return dto;
  });
  await r.step('editExpense en Draft', async () => {
    const dto = await client.post('editExpense', { id: expenseId, changes: { amount: 80 } });
    if (Number(dto.amount) !== 80) throw new Error(`amount=${dto.amount}`);
    return dto;
  });
  await r.expectFailure(
    'createExpense rechaza importe 0',
    () => client.post('createExpense', {
      ownerType: 'proyecto',
      ownerId: ctx.ids.projectId,
      category: 'Fuel',
      description: 'inválido',
      amount: 0,
      expenseDate: today(),
    }),
    /Amount must be > 0/i
  );
  await r.step('confirmExpense → Confirmed', async () => {
    const dto = await client.post('confirmExpense', { id: expenseId });
    if (dto.status !== 'Confirmed') throw new Error(`status=${dto.status}`);
    return dto;
  });
  await r.expectFailure(
    'no se edita un gasto confirmado',
    () => client.post('editExpense', { id: expenseId, changes: { amount: 90 } }),
    /draft/i
  );
  await r.step('getExpenses lo lista', async () => {
    const list = await client.post('getExpenses', {});
    if (!list.some((e) => e.id === expenseId)) throw new Error('no aparece');
    return list;
  });
  await r.step('cancelExpense', async () => {
    const dto = await client.post('cancelExpense', { id: expenseId, reason: 'E2E' });
    if (dto.status !== 'Cancelled' && dto.status !== 'Anulado') throw new Error(`status=${dto.status}`);
    return dto;
  });

  r.section('Configuración');
  await r.step('getSettings devuelve un objeto', async () => {
    const data = await client.post('getSettings', {});
    if (!data || typeof data !== 'object') throw new Error('respuesta inválida');
    return data;
  });
  await r.step('getVehicleTypes devuelve una lista', async () => {
    const list = await client.post('getVehicleTypes', {});
    if (!Array.isArray(list) || list.length === 0) throw new Error('lista vacía');
    return list;
  });
  await r.step('getServiceTypes devuelve una lista', async () => {
    const list = await client.post('getServiceTypes', {});
    if (!Array.isArray(list) || list.length === 0) throw new Error('lista vacía');
    return list;
  });
  await r.step('getOperatingCompanies crea la sociedad si la hoja esta vacia', async () => {
    // Una instalacion nueva tiene OperatingCompany vacia y sin issuer las
    // facturas no se pueden emitir. El alta no existia en el router: se agrego
    // en esta ronda, asi que la bateria la ejercita y deja una sociedad valida.
    const asList = (v) => (Array.isArray(v) ? v : v?.items ?? v?.companies ?? []);
    let list = asList(await client.post('getOperatingCompanies', {}));
    if (list.length === 0) {
      const created = await client.post('createOperatingCompany', {
        name: `${ctx.tag} SL`,
        vat: 'IT00000000000',
        currency: 'EUR',
        defaultTaxRate: 21,
        active: true,
      });
      if (!created || !(created.id || created.ID)) throw new Error('createOperatingCompany no devolvio id');
      list = asList(await client.post('getOperatingCompanies', {}));
    }
    if (list.length === 0) throw new Error('lista vacia');
    const first = list[0];
    ctx.ids.operatingCompanyId = first.id || first.ID;
    return list;
  });

  r.section('Limpieza del catálogo');
  await r.step('deleteRateCard', () => client.post('deleteRateCard', { id: tempRateCardId }));
  await r.step('deleteSupplierRate', () => client.post('deleteSupplierRate', { id: tempSupplierRateId }));
  await r.step('deleteDriverRate', () => client.post('deleteDriverRate', { id: tempDriverRateId }));
  await r.step('deleteCollaborator', () => client.post('deleteCollaborator', { id: tempCollabId }));
  await r.step('deleteVehicle', () => client.post('deleteVehicle', { id: tempVehicleId }));
  await r.step('deleteDriver', () => client.post('deleteDriver', { id: tempDriverId }));
  await r.step('deleteProject', () => client.post('deleteProject', { id: tempProjectId }));
  await r.step('deleteClient', () => client.post('deleteClient', { id: tempClientId }));
}
