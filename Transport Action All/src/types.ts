// --- DRIVER TYPES ---

export interface Driver {
  id: string;
  name: string;
  avatar: string;
  status: 'Disponible' | 'Asignado' | 'Inactivo';
  vehicle: string;
  nextShift: string;
  currentLocation: string;
  progress?: number;
  restMandated?: boolean;
}

// --- NEW ENTITIES ---

export interface Collaborator {
  id: string;
  name: string;
  vat: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  active: boolean;
  notes: string;
  services: Service[];
  rates: CollaboratorRate[];
}

export interface CollaboratorRate {
  id: string;
  serviceType: 'Transfer' | 'Disposizione' | 'Extra' | 'Shuttle';
  vehicleType: string;
  baseRate: number;
  includedKm: number;
  includedHours: number;
  extraKmRate: number;
  extraHourRate: number;
  diariaPiena: number;
  diariaMezza: number;
  nightExtra: number;
  validFrom: Date;
  validTo: Date;
  active: boolean;
}

// --- MODIFIED SERVICE INTERFACE ---

export interface Service {
  id: string;
  backendId?: string;
  time: string;
  status: 'In Transit' | 'Scheduled' | 'Completed' | 'In Progress' | 'Canceled';
  operationalStatus: 'Importado' | 'Asignado' | 'Confirmado' | 'EnRuta' | 'Realizado' | 'Reportado' | 'Revision' | 'Validado' | 'Cancelado';
  financialStatus: 'Pendiente' | 'Calculado' | 'Confrontacion' | 'ActualsConfirmados' | 'Aprobado' | 'Facturable' | 'Facturado' | 'Cobrado' | 'Cerrado' | 'CerradoComercial';
  title: string;
  company: 'Transport Action' | 'Movie Motion';
  project: string;
  backendProjectId?: string;
  location: string;
  driverId?: string;
  driverName: string;
  driverPhone?: string;
  date: string;           // Raw date from message (DD/MM or DD/MM/YY) – can be anywhere
  dateParsed?: string;
  startTime: string;
  endTime: string;
  kmTotal: number;
  kmOver: number;
  diariaType: 'piena' | 'mezza' | 'none';
  rawText: string;
  // Route and passenger info
  from?: string;
  to?: string;
  flightInfo?: string;
  notes?: string;
  passengers?: string;    // Semicolon-separated passenger names
  vehicleType?: string;
  vehiclePlate?: string;
  // Client info (resolved from Project → Client)
  clientId?: string;
  clientName?: string;
  // Cost fields from DriverReport (populated on report approval)
  km?: number;
  hasDiaria?: boolean;
  isFestivo?: boolean;
  isNotturno?: boolean;
  diariaCost?: number;
  kmOverCost?: number;
  revenueBreakdown: {
    base: number;
    kmOver: number;
    hoursOver: number;
    diaria: number;
    notturno: number;
  };
  costBreakdown: {
    base: number;
    kmOver: number;
    hoursOver: number;
    diaria: number;
    notturno: number;
  };
  revenueValidated: boolean;
  costValidated: boolean;
  // Cost fields used by DashboardScreen (from parametros or backend)
  baseCost?: number;
  overtimeCost?: number;
  kmCost?: number;
  notturnoCost?: number;
  totalCost?: number;
  // Overtime fields (dispo)
  overtimeBefore?: number;
  overtimeAfter?: number;
  overtimeHours?: number;
  // Route description (editable in DashboardScreen)
  routeDescription?: string;
  // Dashboard-specific fields
  po?: string;
  cancelReason?: string;
  // Internal edit form metadata (not persisted)
  _costsFromParametros?: Record<string, number>;
}

/**
 * Check if a service is a "Production" vehicle type (excluded from rapportinos).
 * These services stay in Transport List for record but are shown in gray in calendar.
 */
export function isProductionVehicle(service: Service): boolean {
  const vehicle = (service.vehicleType || '').toUpperCase();
  return vehicle.indexOf('PRODUCTION') > -1;
}

export type ScreenId =
  // OPERATIONS
  | 'transport'
  | 'executive_dashboard'
  | 'driver_reports'
  | 'driver_links'
  // FINANCE
  | 'rapportinos'
  | 'reconciliation'
  | 'accounting'
  | 'financial'
  // MANAGEMENT
  | 'customers'
  | 'providers'
  | 'drivers'
  | 'vehicles'
  | 'projects'
  // SYSTEM
  | 'audit_center'
  | 'active_users'
  | 'user_management'
  | 'settings'
  // INTERNAL (hidden from sidebar)
  | 'new_service'
  | 'transport_list'
  // DEPRECATED (backwards-compat redirects — will be removed)
  | 'dashboard'
  | 'company_settings'
  | 'reports'
  | 'driver_panel'
  | 'changes'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'contacts'
  | 'driver_rates'
  | 'rate_cards'
  | 'driver_advances'
  | 'report_inbox'
  | 'activity_feed'
  | 'documents';

// --- Helpers for date formatting ---
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function formatDateKey(d: Date): string {
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function getWeekColumns(baseDate: Date = new Date()): { key: string; label: string; date: string; isToday: boolean; isTomorrow: boolean; isDayAfterTomorrow: boolean; dayOffset: number; colorClass: string; headerBg: string; headerText: string; borderClass: string }[] {
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = new Date();
  const todayKey = formatDateKey(today);
  
  // Calculate tomorrow's key
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = formatDateKey(tomorrow);
  
  // Calculate day after tomorrow's key
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  const dayAfterKey = formatDateKey(dayAfter);
  
  // Color scheme: Today=blue, Tomorrow=amber, DayAfter=green, others=default
  const todayColor = { colorClass: 'bg-primary/8 border-primary/20', headerBg: 'bg-primary/15', headerText: 'text-primary', borderClass: 'border-b-2 border-primary' };
  const tomorrowColor = { colorClass: 'bg-amber-50 border-amber-200', headerBg: 'bg-amber-100', headerText: 'text-amber-700', borderClass: 'border-b-2 border-amber-400' };
  const dayAfterColor = { colorClass: 'bg-emerald-50 border-emerald-200', headerBg: 'bg-emerald-100', headerText: 'text-emerald-700', borderClass: 'border-b-2 border-emerald-400' };
  const defaultColor = { colorClass: 'bg-surface border-outline-variant/50', headerBg: '', headerText: 'text-on-surface', borderClass: 'border-b border-outline-variant' };
  
  // Align to Monday of the week containing baseDate
  const aligned = new Date(baseDate);
  const dow = aligned.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dow === 0 ? -6 : 1 - dow; // shift to Monday
  aligned.setDate(aligned.getDate() + mondayOffset);
  
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(aligned);
    d.setDate(aligned.getDate() + i);
    const key = formatDateKey(d);
    const isToday = key === todayKey;
    const isTomorrow = key === tomorrowKey;
    const isDayAfterTomorrow = key === dayAfterKey;
    const dayOffset = i;
    const colors = isToday ? todayColor : isTomorrow ? tomorrowColor : isDayAfterTomorrow ? dayAfterColor : defaultColor;
    const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : isDayAfterTomorrow ? 'Day After' : dayNames[d.getDay()];
    return {
      key,
      label,
      date: key,
      isToday,
      isTomorrow,
      isDayAfterTomorrow,
      dayOffset,
      ...colors,
    };
  });
}

/**
 * Maps a Service DTO from the backend (Services sheet) to the frontend Service format.
 * Used when reading from Services instead of Transport List.
 */
export function mapServiceDTOToService(dto: Record<string, any>): Service {
  // Parse date to "MMM DD" format
  let dateKey = '';
  if (dto.date) {
    const d = new Date(dto.date);
    if (!isNaN(d.getTime())) {
      dateKey = formatDateKey(d);
    }
  }
  if (!dateKey && dto.date) {
    dateKey = dateKeyFromAny(String(dto.date));
  }

  // Extract from/to from route
  const fromStr = (dto.route?.pickupLines || [])[0] || '';
  const toRaw = (dto.route?.dropoffLines || [])[0] || '';
  const mapsUrlMatch = toRaw.match(/https?:\/\/(maps\.app\.goo\.gl|goo\.gl|google\.com\/maps)[^\s]*/i);
  const mapsUrl = mapsUrlMatch ? mapsUrlMatch[0] : '';
  const toClean = toRaw.replace(/https?:\/\/[^\s]*/g, '').trim();

  // Build passengers string
  const passengerName = dto.passenger?.name || '';

  // Map operationalStatus to frontend status
  const statusMap: Record<string, Service['status']> = {
    'Importado': 'Scheduled',
    'Asignado': 'Scheduled',
    'Confirmado': 'Scheduled',
    'EnRuta': 'In Progress',
    'Realizado': 'Completed',
    'Reportado': 'Completed',
    'Revision': 'Completed',
    'Validado': 'Completed',
    'Cancelado': 'Canceled',
  };

  return {
    id: dto.id || `svc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    time: dto.time || '',
    status: statusMap[dto.operationalStatus] || 'Scheduled',
    operationalStatus: dto.operationalStatus || 'Importado',
    title: [dto.production, passengerName].filter(Boolean).join(' — ') || 'Transport Service',
    company: dto.operatingCompany || 'Transport Action',
    project: dto.production || 'Unknown',
    backendProjectId: dto.projectId || '',
    location: fromStr || toClean || '',
    driverId: dto.driverId || '',
    driverName: dto.driverName || 'Unassigned',
    driverPhone: '',
    date: dateKey,
    from: fromStr,
    to: toClean,
    flightInfo: dto.route?.flightInfo || '',
    notes: dto.notes || (mapsUrl ? `maps:${mapsUrl}` : ''),
    passengers: passengerName,
    vehicleType: dto.vehicleType || '',
    vehiclePlate: '',
    // Client info resolved from Project → Client
    clientId: dto.clientId || '',
    clientName: dto.clientName || '',
    // Cost fields from DriverReport (populated on report approval)
    startTime: dto.startTime || '',
    endTime: dto.endTime || '',
    km: dto.km || 0,
    hasDiaria: dto.hasDiaria || false,
    isFestivo: dto.isFestivo || false,
    isNotturno: dto.isNotturno || false,
    diariaType: dto.diariaType || 'none',
    // Required fields with defaults
    financialStatus: dto.financialStatus || 'Pendiente',
    kmTotal: dto.kmTotal || dto.km || 0,
    kmOver: dto.kmOver || 0,
    rawText: dto.rawText || '',
    revenueBreakdown: dto.revenueBreakdown || { base: parseFloat(dto.estimatedRevenue) || 0, kmOver: 0, hoursOver: 0, diaria: 0, notturno: 0 },
    costBreakdown: dto.costBreakdown || { base: parseFloat(dto.estimatedCost) || 0, kmOver: 0, hoursOver: 0, diaria: 0, notturno: 0 },
    revenueValidated: dto.revenueValidated || false,
    costValidated: dto.costValidated || false,
    // Cost fields from parametros/backend (DashboardScreen edit modal)
    baseCost: dto.baseCost != null ? parseFloat(dto.baseCost) : undefined,
    overtimeCost: dto.overtimeCost != null ? parseFloat(dto.overtimeCost) : undefined,
    kmCost: dto.kmCost != null ? parseFloat(dto.kmCost) : undefined,
    notturnoCost: dto.notturnoCost != null ? parseFloat(dto.notturnoCost) : undefined,
    totalCost: dto.totalCost != null ? parseFloat(dto.totalCost) : undefined,
    overtimeBefore: dto.overtimeBefore != null ? parseInt(dto.overtimeBefore) : undefined,
    overtimeAfter: dto.overtimeAfter != null ? parseInt(dto.overtimeAfter) : undefined,
    overtimeHours: dto.overtimeHours != null ? parseFloat(dto.overtimeHours) : undefined,
    routeDescription: dto.routeDescription || undefined,
  };
}

export function dateKeyFromAny(raw: string): string {
  if (!raw) return formatDateKey(new Date());
  // Already "MMM DD" e.g. "Jul 21"
  const m1 = raw.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (m1) return `${m1[1]} ${m1[2]}`;
  // "Tuesday July 07th" or "July 07th" or "July 7"
  const m2 = raw.match(/(?:[A-Za-z]+\s+)?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/i);
  if (m2) {
    const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const monthIdx = monthNames.indexOf(m2[1].toLowerCase());
    if (monthIdx >= 0) {
      const d = new Date(new Date().getFullYear(), monthIdx, parseInt(m2[2]));
      return formatDateKey(d);
    }
  }
  // DD/MM/YYYY
  const m3 = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m3) {
    const d = new Date(parseInt(m3[3]), parseInt(m3[2]) - 1, parseInt(m3[1]));
    return formatDateKey(d);
  }
  // ISO date
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return formatDateKey(d);
  return raw;
}

/**
 * Parse a "MMM DD" date key back to a full Date object.
 * e.g. "Jul 7" → Date(2026, 6, 7)
 */
export function parseDateKeyToDate(dateKey: string, referenceYear?: number): Date | null {
  if (!dateKey) return null;
  const year = referenceYear || new Date().getFullYear();
  const parts = dateKey.split(' ');
  if (parts.length !== 2) return null;
  const monthStr = parts[0];
  const day = parseInt(parts[1]);
  if (isNaN(day)) return null;
  const monthIdx = SHORT_MONTHS.indexOf(monthStr);
  if (monthIdx === -1) return null;
  return new Date(year, monthIdx, day);
}

/**
 * Find the earliest service date from a list of services.
 * Returns a Date object suitable as baseDate for the calendar.
 */
export function findFirstServiceDate(services: Service[]): Date {
  if (services.length === 0) return new Date();
  
  let earliest: Date | null = null;
  for (const s of services) {
    const d = parseDateKeyToDate(s.date);
    if (d && (!earliest || d.getTime() < earliest.getTime())) {
      earliest = d;
    }
  }
  
  // If no valid date found, use today
  if (!earliest) return new Date();
  
  // Go to the Monday of that week (start of week view)
  const day = earliest.getDay();
  const diff = earliest.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(earliest.getFullYear(), earliest.getMonth(), diff);
}

// --- Month view helpers ---

export type ViewMode = 'week' | 'month' | 'day';

interface MonthWeek {
  weekStart: Date;
  label: string;
  dateKey: string;
}

/**
 * Generate the weeks for a given month.
 * Each week starts on Monday.
 */
export function getMonthWeeks(year: number, month: number): MonthWeek[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Find the Monday on or before the first day
  const firstDow = firstDay.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = firstDow === 0 ? -6 : 1 - firstDow;
  const firstMonday = new Date(year, month, 1 + mondayOffset);
  
  const weeks: MonthWeek[] = [];
  let current = new Date(firstMonday);
  let weekNum = 1;
  
  while (current <= lastDay || weeks.length === 0) {
    weeks.push({
      weekStart: new Date(current),
      label: `Week ${weekNum}`,
      dateKey: formatDateKey(current),
    });
    current.setDate(current.getDate() + 7);
    weekNum++;
    // Safety: stop after 6 weeks max
    if (weekNum > 6) break;
  }
  
  return weeks;
}

/**
 * Get the month name for display
 */
export function getMonthName(month: number): string {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return months[month];
}

/**
 * Parse time string "HH:MM" to hour number (0-23)
 * Handles: "07:30"→7, "10.20"→10, "9"→9, "08"→8, Date objects
 */
export function parseTimeToHour(timeStr: string | Date): number {
  if (!timeStr) return -1;
  if (timeStr instanceof Date) {
    return timeStr.getHours();
  }
  const str = String(timeStr).trim();
  // Try HH:MM or HH.MM first
  const m1 = str.match(/(\d{1,2})[:.](\d{1,2})/);
  if (m1) return parseInt(m1[1]);
  // Fallback: standalone number like "9", "08", "10"
  const m2 = str.match(/^(\d{1,2})/);
  if (m2) return parseInt(m2[1]);
  return -1;
}

/**
 * Format time string to proper HH:MM display.
 * Handles: "10.20" → "10:20", "8.5" → "08:05", "13.08" → "13:08", "10:20" → "10:20"
 * Also handles ranges: "08.00 - 17.00" → "08:00 - 17.00"
 * Handles Date objects from Google Sheets.
 */
export function formatTimeDisplay(timeStr: string | Date): string {
  if (!timeStr) return '';
  
  // Handle Date objects from Google Sheets
  if (timeStr instanceof Date) {
    const h = String(timeStr.getHours()).padStart(2, '0');
    const m = String(timeStr.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  
  const str = String(timeStr);
  
  // Handle ranges
  const rangeMatch = str.match(/(\d{1,2}[.:]\d{1,2})\s*[-–]\s*(\d{1,2}[.:]\d{1,2})/);
  if (rangeMatch) {
    return `${formatSingleTime(rangeMatch[1])} - ${formatSingleTime(rangeMatch[2])}`;
  }
  
  return formatSingleTime(str);
}

function formatSingleTime(raw: string): string {
  // "10.20" or "10:20" → "10:20"
  // "8.5" → "08:05" (single digit after dot = tens of minutes)
  // "13.08" → "13:08"
  // "9" → "09:00" (standalone hour)
  const match = raw.match(/(\d{1,2})[.:](\d{1,2})/);
  if (match) {
    const hours = parseInt(match[1]);
    let minutes = parseInt(match[2]);
    // If single digit after dot, treat as tens of minutes (e.g. "8.5" → 08:50)
    if (String(match[2]).length === 1) {
      minutes = minutes * 10;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  // Standalone number like "9", "08"
  const hourMatch = raw.match(/^(\d{1,2})$/);
  if (hourMatch) {
    return `${String(parseInt(hourMatch[1])).padStart(2, '0')}:00`;
  }
  return raw;
}

/**
 * Generate hour slots for the day view (6:00 to 22:00)
 */
export function getHourSlots(): { hour: number; label: string }[] {
  const slots = [];
  for (let h = 6; h <= 22; h++) {
    slots.push({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
    });
  }
  return slots;
}

/**
 * Driver Report from WhatsApp - structured format
 * Example:
 * "Isidoro dragone
 * 22/7/26
 * Inizio 8:30
 * Fine 18:30
 * Km tot 488
 * Km over 388
 * Diaria piena"
 */
export interface DriverReport {
  driverName: string;
  collaboratorId: string | null; // null = conductor propio
  serviceId: string;              // matched after parsing
  dateParsed?: string;             // Parsed to MMM DD format (for matching)
  start: string;
  end: string;
  kmTotal: number;
  kmOver: number;
  diariaType: 'piena' | 'mezza' | 'none';
  rawText: string;
}

/**
 * Parse driver report from WhatsApp message
 * Handles multiple formats including:
 * - "Isidoro dragone\n22/7/26\nInizio 8:30\nFine 18:30\nKm tot 488\nKm over 388\nDiaria piena"
 * - "7/7/26Isidoro dragone\nInizio 8:30\nFine 18:30..."
 * - "Marco Troccoli 22/07/2026 Inizio Dispo ore 10,30 Fine Dispo Ore 21,30 km 630 km Over 530 Diaria Piena"
 */
export function parseDriverReport(text: string): DriverReport | null {
  if (!text || text.trim().length < 10) return null;
  
  // Strip WhatsApp metadata if present: [HH:MM, DD/MM/YYYY] +phone...
  let clean = text.replace(/^\[[\d:]+,\s*[\d/]+\]\s*[\+]?\d[\d\s\-():]+\s*:\s*/gm, '').trim();
  if (!clean || clean.length < 10) clean = text;
  
  const lower = clean.toLowerCase();
  
  // Extract date (DD/MM or DD/MM/YY) - can be anywhere
  let dateParsed = '';
  const dateMatch = clean.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    dateParsed = `${monthNames[month - 1]} ${day}`;
  }
  
  // Extract driver name - try multiple patterns
  let driverName = '';
  
  // Pattern 1: Name on same line as date "7/7/26Isidoro dragone"
  const nameAfterDate = clean.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*([A-Za-z][A-Za-z\s]+?)(?:\n|$)/);
  if (nameAfterDate) {
    driverName = nameAfterDate[1].trim();
  }
  
  // Pattern 2: Name on separate line, typical "First Last"
  if (!driverName) {
    const nameMatch = clean.match(/^([A-Z][a-z]+\s+[a-z]+(?:\s+[a-z]+)*)/m);
    if (nameMatch && !nameMatch[1].match(/^(inizio|fine|km|diaria)/i)) {
      driverName = nameMatch[1].trim();
    }
  }
  
  // Pattern 3: ALL CAPS name "EMANUELE ROCCHINI"
  if (!driverName) {
    const capsName = clean.match(/^([A-Z]{2,}\s+[A-Z]{2,})/m);
    if (capsName) {
      // Convert to Title Case
      driverName = capsName[1].toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
  }
  
  // Pattern 4: Name with company in parentheses "Michele Bartolucci (Amadio)"
  if (!driverName) {
    const nameWithParen = clean.match(/([A-Z][a-z]+\s+[a-z]+(?:\s+\([A-Za-z]+\))?)/);
    if (nameWithParen && !nameWithParen[1].match(/^(inizio|fine|km|diaria)/i)) {
      driverName = nameWithParen[1].trim();
    }
  }
  
  // Pattern 5: Fallback - first line cleaned
  if (!driverName) {
    const firstLine = clean.split('\n')[0].trim();
    driverName = firstLine.replace(/[\d\/\-.:]/g, '').replace(/\s+/g, ' ').trim();
  }
  
  // Extract start time - multiple patterns
  let startTime = '';
  const startMatch = clean.match(/inizio\s*(?:dispo\w*\s*)?(?:ore\s*)?[:\s]*(\d{1,2}[.:,]\d{2})/i) ||
                     clean.match(/inizio\s+(\d{1,2}[.:,]\d{2})/i) ||
                     clean.match(/start\s*[:\s]*(\d{1,2}[.:,]\d{2})/i) ||
                     clean.match(/in\s*[:\s]*(\d{1,2}[.:,]\d{2})/i);
  if (startMatch) startTime = formatSingleTime(startMatch[1]);
  
  // Extract end time - multiple patterns
  let endTime = '';
  const endMatch = clean.match(/fine\s*(?:dispo\w*\s*)?(?:ore\s*)?[:\s]*(\d{1,2}[.:,]\d{2})/i) ||
                   clean.match(/fine\s+(\d{1,2}[.:,]\d{2})/i) ||
                   clean.match(/end\s*[:\s]*(\d{1,2}[.:,]\d{2})/i) ||
                   clean.match(/out\s*[:\s]*(\d{1,2}[.:,]\d{2})/i);
  if (endMatch) endTime = formatSingleTime(endMatch[1]);
  
  // Extract km total - multiple patterns
  let kmTotal = 0;
  const kmTotMatch = clean.match(/km\s*tot(?:ali)?\s*[:\s]*(\d+)/i) ||
                     clean.match(/km\s+totali\s+(\d+)/i) ||
                     clean.match(/(\d+)\s*km\s*tot/i) ||
                     clean.match(/totale\s*km\.?\s*(\d+)/i);
  if (kmTotMatch) kmTotal = parseInt(kmTotMatch[1]);
  
  // If just "km XXX" found (no tot/over), take it as total
  if (kmTotal === 0) {
    const kmSimple = clean.match(/\bkm\s+(\d+)/i);
    if (kmSimple) kmTotal = parseInt(kmSimple[1]);
  }
  
  // Extract km over (extra km) - multiple patterns
  let kmOver = 0;
  const kmOverMatch = clean.match(/km\s*over\s*[:\s]*(\d+)/i) ||
                      clean.match(/over\s*[:\s]*(\d+)/i) ||
                      clean.match(/\(?\s*(\d+)\s*km\s*over\s*\)?/i) ||
                      clean.match(/\(?\s*over\s+(\d+)\s*\)?/i);
  if (kmOverMatch) kmOver = parseInt(kmOverMatch[1]);
  
  // Extract diaria type - very flexible
  let diariaType: 'piena' | 'mezza' | 'none' = 'none';
  if (/\+?\s*diaria\s+piena|diaria\s+completa|full\s*meal/i.test(clean)) {
    diariaType = 'piena';
  } else if (/\+?\s*diaria\s+mezza|half\s*meal/i.test(clean)) {
    diariaType = 'mezza';
  } else if (/diaria/i.test(clean)) {
    diariaType = 'piena'; // Default to piena if just "diaria" mentioned
  }
  
  // Auto-calculate KM Over: if driver only sent total KM (no explicit over),
  // subtract 100 included KM and the rest is over
  if (kmOver === 0 && kmTotal > 100) {
    kmOver = kmTotal - 100;
  }
  
  // Validate minimum required fields
  if (!driverName || (!startTime && !endTime)) {
    return null;
  }
  
  return {
    driverName,
    collaboratorId: null,
    serviceId: '',
    dateParsed,
    start: startTime,
    end: endTime,
    kmTotal,
    kmOver,
    diariaType,
    rawText: text,
  };
}

/**
 * Parse multiple driver reports from a WhatsApp chat export
 * Each report is typically a separate message from the same number
 */
export function parseMultipleDriverReports(text: string): DriverReport[] {
  // Split by WhatsApp message timestamps: [HH:MM, DD/MM/YYYY] +phone number
  // Handles: +393801388757, +39 380 138 8757, +39 380 138 8757:, 0039...
  const messages = text.split(/\[\d{1,2}:\d{2},\s*\d{1,2}\/\d{1,2}\/\d{4}\]\s*[\+]?\d[\d\s\-():]+\s*:\s*/g)
    .filter(m => m.trim().length > 10);
  
  if (messages.length === 0) {
    // Try splitting by double newlines
    const parts = text.split(/\n\n+/);
    return parts.map(p => parseDriverReport(p)).filter((r): r is DriverReport => r !== null);
  }
  
  return messages.map(m => parseDriverReport(m)).filter((r): r is DriverReport => r !== null);
}

/**
 * Calculate diaria cost based on type
 */
export function getDiariaCost(type: 'piena' | 'mezza' | 'none'): number {
  switch (type) {
    case 'piena': return 50;
    case 'mezza': return 35;
    case 'none': return 0;
  }
}

/**
 * Calculate km over cost (extra km beyond included limit)
 * Typically €1.50 per extra km
 */
export function getKmOverCost(kmOver: number, rate: number = 1.50): number {
  return kmOver * rate;
}

/**
 * Calculate total cost for a service (frontend preview)
 * Mirrors backend _calcularCostosServicio logic
 */
export function calculateServiceCosts(service: Partial<Service>): { baseCost: number; kmOverCost: number; diariaCost: number; notturnoCost: number; festivo: number; totalCost: number } {
  // Use backend breakdown when available (from ServiceRevenueBreakdown / ServiceCostBreakdown)
  const revenueBreakdown = service.revenueBreakdown;
  const costBreakdown = service.costBreakdown;
  
  // If backend provides a breakdown with non-zero base, use it
  if (revenueBreakdown && revenueBreakdown.base > 0) {
    return {
      baseCost: revenueBreakdown.base,
      kmOverCost: revenueBreakdown.kmOver || 0,
      diariaCost: revenueBreakdown.diaria || 0,
      notturnoCost: revenueBreakdown.notturno || 0,
      festivo: 0, // Festivo is included in base from backend
      totalCost: revenueBreakdown.base + (revenueBreakdown.kmOver || 0) + (revenueBreakdown.diaria || 0) + (revenueBreakdown.notturno || 0) + (revenueBreakdown.hoursOver || 0)
    };
  }
  
  // Fallback: use costBreakdown if available
  if (costBreakdown && costBreakdown.base > 0) {
    return {
      baseCost: costBreakdown.base,
      kmOverCost: costBreakdown.kmOver || 0,
      diariaCost: costBreakdown.diaria || 0,
      notturnoCost: costBreakdown.notturno || 0,
      festivo: 0,
      totalCost: costBreakdown.base + (costBreakdown.kmOver || 0) + (costBreakdown.diaria || 0) + (costBreakdown.notturno || 0) + (costBreakdown.hoursOver || 0)
    };
  }
  
  // Last resort: frontend estimation (kept for backward compatibility)
  const vehicle = (service.vehicleType || '').toUpperCase();
  const isTransfer = vehicle.indexOf('TRANSFER') > -1 || vehicle.indexOf('AIRPORT') > -1;
  const isDispo = vehicle.indexOf('DISPO') > -1;
  
  let baseCost = 0;
  
  if (isTransfer) {
    if (vehicle.indexOf('VAN') > -1) {
      baseCost = 100;
    } else {
      baseCost = 80;
    }
  } else if (isDispo) {
    baseCost = 450;
  } else {
    if (vehicle.indexOf('VAN') > -1) {
      baseCost = 100;
    } else if (vehicle.indexOf('CAR') > -1) {
      baseCost = 80;
    } else {
      baseCost = 450;
    }
  }
  
  const kmOver = service.kmOver || 0;
  const kmOverCost = kmOver * 1.50;
  const diariaCost = getDiariaCost(service.diariaType || 'none');
  
  let notturnoCost = 0;
  if (service.startTime && service.endTime) {
    const notturnoHours = calculateNotturnoHours(service.startTime, service.endTime);
    notturnoCost = notturnoHours * 10;
  }
  
  const festivo = service.isFestivo ? baseCost * 0.5 : 0;
  const totalCost = baseCost + kmOverCost + diariaCost + notturnoCost + festivo;
  
  return { baseCost, kmOverCost, diariaCost, notturnoCost, festivo, totalCost };
}

/**
 * Calculate night hours (21:30 - 06:30)
 */
function calculateNotturnoHours(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  
  if (isNaN(start) || isNaN(end)) return 0;
  
  // Night period: 21:30 (1290 min) to 06:30 (390 min next day)
  let nightHours = 0;
  
  // Simple approximation: if shift spans night hours
  if (start < 390 || start >= 1290) {
    // Start is during night
    if (end <= 390) {
      nightHours = (end - start) / 60;
    } else {
      nightHours = (390 - start) / 60 + 0; // until morning
      if (nightHours < 0) nightHours = 0;
    }
  }
  
  return Math.max(0, nightHours);
}

function timeToMinutes(time: string): number {
  if (!time) return NaN;
  const parts = time.replace('.', ':').split(':');
  if (parts.length !== 2) return NaN;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

/**
 * Generate a placeholder avatar URL for a driver based on their name.
 * Uses ui-avatars.com service.
 */
export function getDriverAvatar(name: string): string {
  const encoded = encodeURIComponent(name || 'Driver');
  return `https://ui-avatars.com/api/?name=${encoded}&background=1a1a2e&color=fff&size=128&bold=true`;
}
