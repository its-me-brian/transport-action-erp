// ============================================================================
// SUITE 03 — Ciclo de vida operativo del Service
// ============================================================================

import { createService, getService } from '../lib/flows.mjs';

export const name = '03-service-lifecycle';
export const description = 'Importado → Asignado → Confirmado → EnRuta → Realizado, transiciones inválidas, INV-009, cancelación y borrado';

export async function run(ctx) {
  const { client, reporter: r } = ctx;
  const driverA = ctx.ids.drivers[0];
  const driverB = ctx.ids.drivers[1];

  r.section('Alta y edición');
  let service = null;
  await r.step('createService arranca en Importado/Pendiente', async () => {
    service = await createService(ctx, { time: '09:00', passengerName: 'E2E Passenger Lifecycle' });
    if (service.operationalStatus !== 'Importado') throw new Error(`operationalStatus=${service.operationalStatus}`);
    if (service.financialStatus !== 'Pendiente') throw new Error(`financialStatus=${service.financialStatus}`);
    return service;
  });

  await r.step('getService devuelve el DTO completo', async () => {
    const dto = await getService(ctx, service.id);
    if (dto.projectId !== ctx.ids.projectId) throw new Error(`projectId=${dto.projectId}`);
    if (dto.passenger?.name !== 'E2E Passenger Lifecycle') throw new Error('pasajero distinto');
    if (!Array.isArray(dto.route?.pickupLines) || dto.route.pickupLines.length === 0) throw new Error('sin pickupLines');
    return dto;
  });

  await r.step('updateServiceField permite Notes y Time', async () => {
    await client.post('updateServiceField', { serviceId: service.id, field: 'Notes', value: 'nota e2e' });
    await client.post('updateServiceField', { serviceId: service.id, field: 'time', value: '10:15' });
    const dto = await getService(ctx, service.id);
    if (dto.notes !== 'nota e2e') throw new Error(`notes=${dto.notes}`);
    if (dto.time !== '10:15') throw new Error(`time=${dto.time}`);
    return dto;
  });

  await r.expectFailure(
    'updateServiceField rechaza OperationalStatus',
    () => client.post('updateServiceField', { serviceId: service.id, field: 'OperationalStatus', value: 'Validado' }),
    /not editable/i
  );

  r.section('Máquina de estados');
  await r.expectFailure(
    'no se confirma un servicio Importado',
    () => client.post('confirmService', { serviceId: service.id }),
    /transition|Transición|invalid/i
  );

  await r.step('assignDriver → Asignado', async () => {
    const dto = await client.post('assignDriver', {
      serviceId: service.id,
      driverId: driverA,
      vehicleId: ctx.ids.vehicleId,
    });
    if (dto.operationalStatus !== 'Asignado') throw new Error(`status=${dto.operationalStatus}`);
    if (dto.driverId !== driverA) throw new Error('driverId distinto');
    if (dto.vehicleId !== ctx.ids.vehicleId) throw new Error('vehicleId distinto');
    return dto;
  });

  await r.step('el chofer queda marcado como Asignado', async () => {
    const dto = await client.post('getDriver', { id: driverA });
    if (dto.status !== 'Asignado') throw new Error(`driver.status=${dto.status}`);
    return dto;
  });

  await r.step('INV-009: el mismo chofer no toma otro servicio activo', async () => {
    const other = await createService(ctx, { time: '16:00' });
    const err = await r.expectFailure(
      'segundo servicio con el mismo chofer es rechazado',
      () => client.post('assignDriver', { serviceId: other.id, driverId: driverA, vehicleId: ctx.ids.vehicleId }),
      /already assigned|S010/i
    );
    if (!err) throw new Error('INV-009 no se aplicó');
    await client.post('deleteService', { serviceId: other.id, reason: 'E2E cleanup' });
    return err;
  });

  await r.step('confirmService → Confirmado', async () => {
    const dto = await client.post('confirmService', { serviceId: service.id });
    if (dto.operationalStatus !== 'Confirmado') throw new Error(`status=${dto.operationalStatus}`);
    return dto;
  });

  await r.step('startService → EnRuta', async () => {
    const dto = await client.post('startService', { serviceId: service.id });
    if (dto.operationalStatus !== 'EnRuta') throw new Error(`status=${dto.operationalStatus}`);
    return dto;
  });

  await r.step('completeService → Realizado', async () => {
    const dto = await client.post('completeService', { serviceId: service.id });
    if (dto.operationalStatus !== 'Realizado') throw new Error(`status=${dto.operationalStatus}`);
    return dto;
  });

  await r.step('el chofer vuelve a Disponible', async () => {
    const dto = await client.post('getDriver', { id: driverA });
    if (dto.status !== 'Disponible') throw new Error(`driver.status=${dto.status}`);
    return dto;
  });

  // El guard S006 solo dispara desde Reportado: desde Realizado la máquina de
  // estados responde "Invalid transition" y el test no llega a probar la regla.
  await r.step('reportService → Reportado (para llegar al guard S006)', async () => {
    const dto = await client.post('reportService', { serviceId: service.id });
    if (dto.operationalStatus !== 'Reportado') throw new Error(`status=${dto.operationalStatus}`);
    return dto;
  });

  await r.expectFailure(
    'validateService exige un DriverReport aceptado (S006)',
    () => client.post('validateService', { serviceId: service.id }),
    /DriverReport|S006/i
  );

  r.section('Transiciones inválidas y cancelación');
  const cancelService = await createService(ctx, { time: '07:00' });
  await r.step('assignDriver para el servicio a cancelar', async () => {
    const dto = await client.post('assignDriver', {
      serviceId: cancelService.id,
      driverId: driverB,
      vehicleId: ctx.ids.vehicleId,
    });
    return dto;
  });
  await r.expectFailure(
    'startService sin confirmar es rechazado',
    () => client.post('startService', { serviceId: cancelService.id }),
    /transition|Transición|invalid/i
  );
  await r.expectFailure(
    'cancelService exige motivo',
    () => client.post('cancelService', { serviceId: cancelService.id }),
    /reason is required/i
  );
  await r.step('cancelService con motivo → Cancelado', async () => {
    const dto = await client.post('cancelService', { serviceId: cancelService.id, reason: 'E2E cancel' });
    if (dto.operationalStatus !== 'Cancelado') throw new Error(`status=${dto.operationalStatus}`);
    return dto;
  });
  await r.expectFailure(
    'un servicio cancelado no se puede confirmar',
    () => client.post('confirmService', { serviceId: cancelService.id }),
    /transition|Transición|invalid/i
  );

  r.section('Borrado');
  const deletable = await createService(ctx, { time: '06:00' });
  await r.step('deleteService sobre Importado', async () => {
    const res = await client.post('deleteService', { serviceId: deletable.id, reason: 'E2E' });
    if (!res.success) throw new Error('sin success');
    return res;
  });
  await r.expectFailure(
    'un servicio Realizado no se puede borrar (S011)',
    () => client.post('deleteService', { serviceId: service.id, reason: 'E2E' }),
    /Cannot delete|S011/i
  );

  r.section('Listados y filtros');
  await r.step('getServices filtra por proyecto', async () => {
    const list = await client.post('getServices', { projectId: ctx.ids.projectId });
    if (!Array.isArray(list) || list.length < 2) throw new Error(`lista=${list.length}`);
    if (!list.every((s) => s.projectId === ctx.ids.projectId)) throw new Error('mezcla de proyectos');
    return list;
  });
  await r.step('getServices filtra por estado', async () => {
    const list = await client.post('getServices', { status: 'Cancelado' });
    if (!list.some((s) => s.id === cancelService.id)) throw new Error('el cancelado no aparece');
    return list;
  });
  await r.step('getServices filtra por chofer', async () => {
    const list = await client.post('getServices', { driverId: driverA });
    if (!list.some((s) => s.id === service.id)) throw new Error('el servicio del chofer no aparece');
    return list;
  });

  ctx.flowState = { ...(ctx.flowState || {}), serviceId: service.id, driverId: driverA };
}
