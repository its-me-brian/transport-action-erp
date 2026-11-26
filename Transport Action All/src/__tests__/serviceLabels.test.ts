/**
 * TESTS — serviceLabels (de IDs a etiquetas legibles)
 *
 * Cubre la regla que sostiene todo el cambio: una etiqueta nunca queda vacía
 * ni inventa datos. Si el catálogo no alcanza, se degrada al ID.
 *
 * El caso que más importa es la fecha: `new Date('2026-11-07')` es medianoche
 * UTC, así que en un huso negativo formatear con `toLocaleDateString` muestra
 * el día anterior. Los tests fijan el texto ISO, no el huso de la máquina.
 */
import { describe, it, expect } from 'vitest';
import {
  buildNameMap,
  buildServiceMap,
  formatShortDate,
  formatShortTime,
  nameOf,
  serviceLabel,
  serviceLabelById,
} from '../utils/serviceLabels';

describe('formatShortDate', () => {
  it('convierte una fecha ISO sin corrimiento de huso', () => {
    expect(formatShortDate('2026-11-07')).toBe('07/11/2026');
  });

  it('ignora la hora cuando viene en el mismo texto', () => {
    expect(formatShortDate('2026-11-07T23:30:00.000Z')).toBe('07/11/2026');
  });

  it('formatea un Date en hora local', () => {
    expect(formatShortDate(new Date(2026, 0, 9))).toBe('09/01/2026');
  });

  it('devuelve vacío sin dato o con un Date inválido', () => {
    expect(formatShortDate('')).toBe('');
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate(new Date('no-es-fecha'))).toBe('');
  });

  it('devuelve el texto crudo si no puede interpretarlo', () => {
    expect(formatShortDate('proximamente')).toBe('proximamente');
  });
});

describe('formatShortTime', () => {
  it('recorta los segundos', () => {
    expect(formatShortTime('08:30:00')).toBe('08:30');
  });

  it('completa la hora con un cero a la izquierda', () => {
    expect(formatShortTime('8:05')).toBe('08:05');
  });

  it('lee una celda de hora que Sheets entrega como Date', () => {
    expect(formatShortTime(new Date(2026, 0, 9, 7, 5))).toBe('07:05');
  });

  it('devuelve vacío sin dato', () => {
    expect(formatShortTime('')).toBe('');
    expect(formatShortTime(null)).toBe('');
  });
});

describe('buildNameMap / nameOf', () => {
  it('arma el mapa id → nombre e ignora filas incompletas', () => {
    const map = buildNameMap([
      { id: 'CLI-1', name: 'WANDERING IN ROME' },
      { id: 'CLI-2' },
      { name: 'sin id' },
      null as unknown as { id?: string; name?: string },
    ]);
    expect(map).toEqual({ 'CLI-1': 'WANDERING IN ROME' });
  });

  it('tolera un catálogo nulo', () => {
    expect(buildNameMap(null)).toEqual({});
  });

  it('devuelve el nombre cuando existe', () => {
    expect(nameOf({ 'DRV-1': 'Marco Rossi' }, 'DRV-1')).toBe('Marco Rossi');
  });

  it('degrada al ID cuando el catálogo no lo tiene', () => {
    expect(nameOf({}, 'DRV-9')).toBe('DRV-9');
  });

  it('devuelve el fallback explícito antes que el ID', () => {
    expect(nameOf({}, 'DRV-9', 'Sin asignar')).toBe('Sin asignar');
  });

  it('devuelve vacío sin id', () => {
    expect(nameOf({ 'DRV-1': 'Marco' }, '')).toBe('');
  });
});

describe('buildServiceMap / serviceLabel', () => {
  const services = [
    { id: 'SVC-1', date: '2026-11-07', time: '08:30:00', clientName: 'WANDERING IN ROME', driverName: 'Marco Rossi', projectId: 'PRJ-1' },
    { id: 'SVC-2', date: '2026-11-08', time: '09:00', clientName: '', driverName: 'Ana Ruiz', projectId: 'PRJ-1' },
    { id: 'SVC-3', date: '', time: '', clientName: '', driverName: '', projectId: '' },
  ];

  it('indexa por serviceId y normaliza fecha y hora', () => {
    const map = buildServiceMap(services);
    expect(map['SVC-1']).toEqual({
      id: 'SVC-1',
      date: '07/11/2026',
      time: '08:30',
      clientName: 'WANDERING IN ROME',
      driverName: 'Marco Rossi',
      projectId: 'PRJ-1',
    });
  });

  it('arma la etiqueta fecha · hora · cliente', () => {
    expect(serviceLabel(buildServiceMap(services)['SVC-1'])).toBe('07/11/2026 · 08:30 · WANDERING IN ROME');
  });

  it('omite las partes que faltan sin dejar separadores sueltos', () => {
    expect(serviceLabel(buildServiceMap(services)['SVC-2'])).toBe('08/11/2026 · 09:00');
  });

  it('degrada al ID del servicio cuando no hay resumen', () => {
    expect(serviceLabel(undefined, 'SVC-404')).toBe('SVC-404');
  });

  it('degrada al ID del servicio cuando el resumen está vacío', () => {
    expect(serviceLabel(buildServiceMap(services)['SVC-3'], 'SVC-3')).toBe('SVC-3');
  });

  it('resuelve por id con serviceLabelById', () => {
    const map = buildServiceMap(services);
    expect(serviceLabelById(map, 'SVC-1')).toBe('07/11/2026 · 08:30 · WANDERING IN ROME');
    expect(serviceLabelById(map, 'SVC-404')).toBe('SVC-404');
    expect(serviceLabelById(map, '')).toBe('');
  });

  it('ignora servicios sin id', () => {
    expect(buildServiceMap([{ date: '2026-11-07' }])).toEqual({});
  });
});
