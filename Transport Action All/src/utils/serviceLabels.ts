// ============================================================================
// serviceLabels.ts — de IDs a etiquetas legibles
// ============================================================================
// El backend devuelve IDs (SVC-…, PRJ-…, DRV-…). Mostrarlos obliga al usuario a
// traducir códigos de memoria. Estos helpers arman mapas de nombres una sola vez
// por pantalla y SIEMPRE degradan al ID cuando el dato falta: un catálogo
// incompleto nunca deja la tarjeta vacía ni rompe un filtro.
//
// Las fechas se formatean parseando el texto ISO a mano. `new Date('2026-11-07')`
// es medianoche UTC y en un huso negativo mostraría el día anterior.
// ============================================================================

export interface ServiceSummary {
  id: string;
  date: string;
  time: string;
  clientName: string;
  driverName: string;
  projectId: string;
}

export interface ServiceLike {
  id?: string;
  date?: string | Date;
  time?: string | Date;
  clientName?: string;
  driverName?: string;
  projectId?: string;
}

interface NameRow {
  id?: string;
  name?: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function isDate(value: unknown): value is Date {
  return Object.prototype.toString.call(value) === '[object Date]';
}

/** `dd/mm/yyyy`, sin sorpresas de huso horario. */
export function formatShortDate(value?: string | Date | null): string {
  if (!value) return '';
  if (isDate(value)) {
    if (Number.isNaN(value.getTime())) return '';
    return `${pad2(value.getDate())}/${pad2(value.getMonth() + 1)}/${value.getFullYear()}`;
  }
  const text = String(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

/** `HH:mm`, tolerando `HH:mm:ss` y celdas de hora que Sheets entrega como Date. */
export function formatShortTime(value?: string | Date | null): string {
  if (!value) return '';
  if (isDate(value)) {
    if (Number.isNaN(value.getTime())) return '';
    return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }
  const match = /(\d{1,2}):(\d{2})/.exec(String(value));
  return match ? `${pad2(Number(match[1]))}:${match[2]}` : String(value);
}

/** Mapa `id → nombre` para clientes, proyectos, choferes o colaboradores. */
export function buildNameMap(rows?: NameRow[] | null): Record<string, string> {
  const map: Record<string, string> = {};
  (rows || []).forEach(row => {
    if (row && row.id && row.name) map[row.id] = row.name;
  });
  return map;
}

/** Nombre resuelto, con el ID como último recurso (nunca vacío si hay ID). */
export function nameOf(map: Record<string, string> | undefined, id?: string, fallback = ''): string {
  if (!id) return fallback;
  return (map && map[id]) || fallback || id;
}

/** Mapa `serviceId → resumen legible` a partir del listado de servicios. */
export function buildServiceMap(services?: ServiceLike[] | null): Record<string, ServiceSummary> {
  const map: Record<string, ServiceSummary> = {};
  (services || []).forEach(service => {
    if (!service || !service.id) return;
    map[service.id] = {
      id: service.id,
      date: formatShortDate(service.date),
      time: formatShortTime(service.time),
      clientName: service.clientName || '',
      driverName: service.driverName || '',
      projectId: service.projectId || '',
    };
  });
  return map;
}

/**
 * Etiqueta de un servicio: `07/11/2026 · 08:30 · WANDERING IN ROME`.
 * Si el servicio no está en el mapa (borrado, filtrado o catálogo a medias)
 * devuelve el ID, que es feo pero identifica.
 */
export function serviceLabel(summary?: ServiceSummary | null, fallbackId = ''): string {
  if (!summary) return fallbackId;
  return [summary.date, summary.time, summary.clientName]
    .filter(part => !!part)
    .join(' · ') || fallbackId || summary.id;
}

/** Igual que `serviceLabel`, resolviendo el resumen a partir del ID. */
export function serviceLabelById(
  services: Record<string, ServiceSummary> | undefined,
  serviceId?: string
): string {
  if (!serviceId) return '';
  return serviceLabel(services ? services[serviceId] : null, serviceId);
}
