/**
 * API Client para Transport Action Backend (Google Apps Script Web App)
 * 
 * Este servicio se comunica con el Code.gs que corre en Google Apps Script.
 * La URL del Web App se configura en .env como VITE_GAS_WEBAPP_URL
 */

const GAS_WEBAPP_URL = import.meta.env.VITE_GAS_WEBAPP_URL || '';

// ============================================================================
// TYPES
// ============================================================================

// Rich passenger data — never concatenate into strings
export interface Passenger {
  name: string;
  role: string;
}

export interface TransportService {
  id: string;
  importId: string;
  date: string;
  production: string;
  vehicle: string;
  driver: string;
  driverPhone: string;
  time: string;
  from: string;
  to: string;
  // Rich data — arrays of structured objects
  passengers: Passenger[];
  pickupLines: string[];
  dropoffLines: string[];
  pickupMapsUrl: string;
  dropoffMapsUrl: string;
  originalTransportDate: string;
  passengersList: string;
  flightInfo: string;
  notes: string;
  status: string;
  normalized: string;
  section?: string;
  servicio?: string;
  serviceType?: string;
  operatingCompany?: string;
  hasThenPickup?: boolean;
  financialStatus?: string;
}

/**
 * Normalize a TransportService from the backend.
 * Handles both old format (joined strings) and new format (arrays).
 * Always returns a service with passengers as Passenger[].
 */
export function normalizeTransportService(raw: Record<string, any>): TransportService {
  let passengers: Passenger[] = [];

  // Handle passengers: array of objects, array of strings, semicolon-joined string,
  // or single passenger object from backend DTO (raw.passenger = { name, role, phone })
  if (Array.isArray(raw.passengers) && raw.passengers.length > 0) {
    if (typeof raw.passengers[0] === 'object' && raw.passengers[0] !== null) {
      passengers = raw.passengers.map((p: any) => ({
        name: String(p.name || ''),
        role: String(p.role || '')
      }));
    } else {
      passengers = raw.passengers.map((name: string) => ({
        name: String(name || ''),
        role: ''
      }));
    }
  } else if (typeof raw.passengers === 'string' && raw.passengers) {
    // Old format: "Oliver; Ak; John"
    const names = raw.passengers.split(';').map((s: string) => s.trim()).filter(Boolean);
    const roles = (raw.passengerRoles || '').split(';').map((s: string) => s.trim());
    passengers = names.map((name: string, i: number) => ({
      name,
      role: roles[i] || ''
    }));
  } else if (raw.passenger && typeof raw.passenger === 'object' && raw.passenger.name) {
    // Backend DTO format: passenger = { name, role, phone, department }
    passengers = [{ name: String(raw.passenger.name || ''), role: String(raw.passenger.role || '') }];
  }

  // Handle pickupLines/dropoffLines: backend DTO nests in route.pickupLines,
  // upload preview uses top-level pickupLines or from/to strings
  let pickupLines: string[] = [];
  let dropoffLines: string[] = [];

  const srcPickup = raw.pickupLines || (raw.route && raw.route.pickupLines) || [];
  const srcDropoff = raw.dropoffLines || (raw.route && raw.route.dropoffLines) || [];

  if (Array.isArray(srcPickup)) {
    pickupLines = srcPickup.filter(Boolean);
  } else if (typeof raw.from === 'string' && raw.from) {
    pickupLines = [raw.from];
  }

  if (Array.isArray(srcDropoff)) {
    dropoffLines = srcDropoff.filter(Boolean);
  } else if (typeof raw.to === 'string' && raw.to) {
    dropoffLines = [raw.to];
  }

  // Backend DTO uses driverName/vehicleType; upload preview uses driver/vehicle
  const driver = raw.driver || raw.driverName || '';
  const vehicle = raw.vehicle || raw.vehicleType || '';

  // Backend DTO sends passenger.phone; upload preview sends driverPhone
  const driverPhone = raw.driverPhone || (raw.passenger && raw.passenger.phone) || '';

  // Backend DTO sends operationalStatus; upload preview sends status
  const status = raw.status || raw.operationalStatus || '';

  // Backend DTO sends transportListId; upload preview sends importId
  const importId = raw.importId || raw.transportListId || '';

  // Backend DTO nests flightInfo in route; upload preview has it at top level
  const flightInfo = raw.flightInfo || (raw.route && raw.route.flightInfo) || '';

  return {
    id: raw.id || '',
    importId,
    date: typeof raw.date === 'string' ? raw.date : '',
    production: raw.production || '',
    vehicle,
    driver,
    driverPhone,
    time: typeof raw.time === 'string' ? raw.time : '',
    from: pickupLines[0] || raw.from || '',
    to: dropoffLines[0] || raw.to || '',
    passengers,
    pickupLines,
    dropoffLines,
    pickupMapsUrl: raw.pickupMapsUrl || '',
    dropoffMapsUrl: raw.dropoffMapsUrl || '',
    originalTransportDate: raw.originalTransportDate || '',
    passengersList: raw.passengersList || '',
    flightInfo,
    notes: raw.notes || '',
    status,
    normalized: raw.normalized || '',
    section: raw.section,
    servicio: raw.servicio || '',
    serviceType: raw.serviceType || 'disposal',
    operatingCompany: raw.operatingCompany || '',
    hasThenPickup: raw.hasThenPickup || false
  };
}

/**
 * Normalize an array of raw transport services from the backend.
 */
export function normalizeTransportServices(rawServices: Record<string, any>[]): TransportService[] {
  return rawServices.map(normalizeTransportService);
}

/**
 * Display helpers — for views that need string representation
 */
export function passengerDisplay(passengers: Passenger[]): string {
  return passengers.map(p => p.name).filter(Boolean).join('; ');
}

export function passengerRolesDisplay(passengers: Passenger[]): string {
  return passengers.map(p => p.role).filter(Boolean).join('; ');
}

export function hasPassengerRole(passengers: Passenger[]): boolean {
  return passengers.some(p => p.role && p.role.trim() !== '');
}

export function pickupDisplay(pickupLines: string[]): string {
  return pickupLines.filter(Boolean).join('\n');
}

export function dropoffDisplay(dropoffLines: string[]): string {
  return dropoffLines.filter(Boolean).join('\n');
}


export interface AuditEntry {
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  field: string;
  oldValue: string;
  newValue: string;
  notes: string;
}

interface ImportResult {
  success?: boolean;
  error?: string;
  importId?: string;
  totalServices?: number;
  production?: string;
  projectName?: string;
  transportCompany?: string;
  dateStr?: string;
  footerContacts?: { name: string; role: string; phone: string; email: string }[];
  servicios?: TransportService[];
  _debug?: {
    headerScan: { value: string; row: number; col: number }[];
    row0: { col: number; value: string }[];
    row1: { col: number; value: string }[];
    production: string;
    projectName: string;
    transportCompany: string;
    dateStr: string;
    totalRows: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get stored session token from localStorage.
 */
function _getStoredToken(): string | null {
  try {
    return localStorage.getItem('transport_session_token');
  } catch {
    return null;
  }
}

/**
 * Llama a una función del Apps Script Web App via GET
 */
async function gasGet(action: string, params?: Record<string, string | number | boolean | undefined>): Promise<any> {
  if (!GAS_WEBAPP_URL) {
    throw new Error('VITE_GAS_WEBAPP_URL no está configurada. Creá un archivo .env con la URL del Web App.');
  }

  const url = new URL(GAS_WEBAPP_URL);
  url.searchParams.set('action', action);
  
  // Auto-inject token if not already provided
  const allParams = { ...params };
  if (!allParams.token) {
    const stored = _getStoredToken();
    if (stored) allParams.token = stored;
  }

  Object.entries(allParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  return _unwrapResponse(json);
}

/**
 * gasGet with exponential backoff retry.
 * Retries up to MAX_RETRIES times on network errors or 5xx responses.
 * Delays: 1s, 2s, 4s (exponential backoff).
 *
 * Why: GET calls can fail due to GAS cold starts, network blips, or
 * temporary 5xx from the Web App. Retrying avoids user-visible errors.
 */
export async function gasGetWithRetry(action: string, params?: Record<string, string | number | boolean | undefined>): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await gasGet(action, params);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on client errors (4xx) — only retry on network/5xx
      const isRetryable =
        lastError.message.includes('Failed to fetch') ||
        lastError.message.includes('NetworkError') ||
        lastError.message.includes('HTTP 5') ||
        lastError.message.includes('timeout');

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw lastError;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[gasGetWithRetry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('gasGetWithRetry: max retries exceeded');
}

/**
 * Normalize backend response: unwrap data, flatten error objects to string
 */
function _unwrapResponse(json: any): any {
  if (json && json.data !== undefined) {
    return json.data;
  }
  // Normalize error: if error is an object with .message, extract it
  if (json && json.error && typeof json.error === 'object') {
    json.error = json.error.message || json.error.code || JSON.stringify(json.error);
  }
  return json;
}

/**
 * Llama a una función del Apps Script Web App via POST
 */
export async function gasPost(action: string, data: Record<string, any>): Promise<any> {
  if (!GAS_WEBAPP_URL) {
    throw new Error('VITE_GAS_WEBAPP_URL no está configurada.');
  }

  const url = new URL(GAS_WEBAPP_URL);
  url.searchParams.set('action', action);

  // Auto-inject token if not already provided
  if (!data.token) {
    const stored = _getStoredToken();
    if (stored) data = { ...data, token: stored };
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  return _unwrapResponse(json);
}

/**
 * gasPost with exponential backoff retry.
 * Retries up to MAX_RETRIES times on network errors or 5xx responses.
 * Delays: 1s, 2s, 4s (exponential backoff).
 */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function gasPostWithRetry(action: string, data: Record<string, any> = {}): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await gasPost(action, data);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on client errors (4xx) — only retry on network/5xx/timeout
      const isRetryable =
        lastError.message.includes('Failed to fetch') ||
        lastError.message.includes('NetworkError') ||
        lastError.message.includes('HTTP 5') ||
        lastError.message.includes('timeout');

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[gasPostWithRetry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('gasPostWithRetry: max retries exceeded');
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Sube un archivo Excel y lo parsea como Transport List
 */
export async function uploadAndParseExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result?.toString().split(',')[1];
        if (!base64) {
          reject(new Error('No se pudo leer el archivo'));
          return;
        }

        const result = await gasPost('uploadTransportListFile', {
          fileData: base64,
          fileName: file.name,
        });

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Error leyendo el archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get all Transport List imports (domain entity).
 */
export async function getTransportLists(projectId?: string): Promise<any[]> {
  const params: Record<string, string> = {};
  if (projectId) params.projectId = projectId;
  return gasGetWithRetry('getTransportLists', params);
}

/**
 * Get services by Transport List ID.
 */
export async function getServicesByTransportListId(transportListId: string): Promise<any[]> {
  return gasGetWithRetry('getServices', { transportListId });
}

/**
 * Obtiene servicios desde la hoja Services (entidades con lifecycle).
 * Reemplaza getTransportList para calendar/dashboard.
 */
export async function getServices(filters?: {
  status?: string;
  driverId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<any[]> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.driverId) params.driverId = filters.driverId;
  if (filters?.projectId) params.projectId = filters.projectId;
  if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters?.dateTo) params.dateTo = filters.dateTo;

  return gasGetWithRetry('apiGetServices', params);
}

/**
 * Get a single service by ID (for comparison/reference in inbox normalization).
 */
export async function getServiceById(id: string): Promise<any> {
  return gasGetWithRetry('getService', { id });
}

/**
 * Update a single field on a Service entity.
 * Validates lock state (Validado/Cerrado) before allowing changes.
 */
export async function createService(data: {
  ProjectID: string;
  Date: string;
  Time?: string;
  OperatingCompany?: string;
  DriverID?: string;
  PassengerName?: string;
  PickupLines?: string[];
  DropoffLines?: string[];
  Notes?: string;
  ServiceType?: string;
  SourceType?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('createService', data);
}

export async function updateServiceField(serviceId: string, field: string, value: any): Promise<{ success: boolean; error?: string }> {
  return gasPostWithRetry('updateServiceField', { serviceId, field, value });
}

export async function facturarService(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('facturarService', { serviceId });
}

export async function cobrarService(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('cobrarService', { serviceId });
}

export async function closeService(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('closeService', { serviceId });
}

export async function cerrarComercialmente(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('cerrarComercialmente', { serviceId });
}

export async function confirmActuals(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('confirmActuals', { serviceId });
}

export async function approveFinancial(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('approveFinancial', { serviceId });
}

export async function markFacturable(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('markFacturable', { serviceId });
}

export async function calculateService(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('calculateService', { serviceId });
}

export async function moveToConfrontacion(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('moveToConfrontacion', { serviceId });
}

export async function moveToRevision(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('moveToRevision', { serviceId });
}

// Service lifecycle functions
export async function assignDriver(serviceId: string, driverId: string, vehicleId?: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('assignDriver', { serviceId, driverId, vehicleId });
}

export async function confirmService(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('confirmService', { serviceId });
}

export async function startService(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('startService', { serviceId });
}

export async function completeService(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('completeService', { serviceId });
}

export async function validateService(serviceId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('validateService', { serviceId });
}

export async function deleteService(serviceId: string, reason?: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('deleteService', { serviceId, reason: reason || '' });
}

export async function cancelService(serviceId: string, reason: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('cancelService', { serviceId, reason });
}

export async function adjustRevenue(serviceId: string, adjustment: {
  description?: string;
  amount?: number;
  quantity?: number;
  unitPrice?: number;
  referenceLineId?: string;
}): Promise<{ success?: boolean; error?: string; id?: string }> {
  return gasPostWithRetry('adjustRevenue', { serviceId, adjustment });
}

export async function adjustCost(serviceId: string, adjustment: {
  description?: string;
  amount?: number;
  driverId?: string;
  referenceLineId?: string;
}): Promise<{ success?: boolean; error?: string; id?: string }> {
  return gasPostWithRetry('adjustCost', { serviceId, adjustment });
}

export async function getEstimatedVsActual(projectId: string): Promise<{
  projectId: string;
  serviceCount: number;
  estimated: { revenue: number; cost: number; profit: number; margin: number };
  actual: { revenue: number; cost: number; profit: number; margin: number };
  variance: { revenuePercent: number; costPercent: number; profitPercent: number; revenueAbs: number; costAbs: number; profitAbs: number };
}> {
  return gasPost('getEstimatedVsActual', { projectId });
}

export async function getProjectDashboard(projectId: string): Promise<{
  project: any;
  services: { total: number; byStatus: Record<string, number> };
  financials: { projectId: string; serviceCount: number; totalRevenue: number; totalCost: number; profit: number; margin: number };
  rapportinos: { total: number; byStatus: Record<string, number> };
}> {
  return gasPost('getProjectDashboard', { projectId });
}

export async function getDriverDashboard(driverId: string, startDate?: string, endDate?: string): Promise<{
  driver: any;
  services: { total: number; byStatus: Record<string, number> };
  financials: { driverId: string; serviceCount: number; totalRevenue: number; totalCost: number; profit: number; margin: number };
  advances: { total: number; unpaid: number; totalUnpaid: number };
}> {
  return gasPost('getDriverDashboard', { driverId, startDate: startDate || '', endDate: endDate || '' });
}

export async function getCashFlow(filters?: { startDate?: string; endDate?: string; projectId?: string }): Promise<{
  movements: Array<{ type: string; category: string; description: string; amount: number; date: string; referenceId: string; referenceType: string; invoiceId?: string }>;
  summary: { totalIncome: number; totalExpense: number; balance: number };
}> {
  return gasPost('getCashFlow', filters || {});
}

export async function getProfitByProject(projectId: string): Promise<{
  projectId: string;
  serviceCount: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number;
}> {
  return gasPost('getProfitByProject', { projectId });
}

export async function getProfitByDriver(driverId: string, startDate?: string, endDate?: string): Promise<{
  driverId: string;
  serviceCount: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number;
}> {
  return gasPost('getProfitByDriver', { driverId, startDate: startDate || '', endDate: endDate || '' });
}

export async function getProfitByCompany(operatingCompany: string, startDate?: string, endDate?: string): Promise<{
  operatingCompany: string;
  serviceCount: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number;
}> {
  return gasPost('getProfitByCompany', { operatingCompany, startDate: startDate || '', endDate: endDate || '' });
}

/**
 * Import transport list with project linking.
 * Creates/links Client and Project, assigns ProjectID to all Services.
 */
export async function importTransportListWithProject(data: {
  services: any[];
  importId: string;
  production: string;
  projectName: string;
  clientId?: string;
  projectId?: string;
  operatingCompany: string;
  fileUrl?: string;
}): Promise<{ success: boolean; servicesCreated?: number; clientId?: string; projectId?: string; error?: string }> {
  return gasPostWithRetry('importTransportListWithProject', data);
}

/**
 * Auto-detect Client and Project from production name.
 * Returns suggestions for the import modal.
 */
export async function autoDetectImportTargets(production: string, projectName?: string): Promise<{
  client: any | null;
  project: any | null;
  clients: any[];
  projects: any[];
}> {
  return gasGetWithRetry('autoDetectImportTargets', { production, projectName: projectName || '' });
}

/**
 * Obtiene el audit log
 */
export async function getAuditLog(limit?: number): Promise<AuditEntry[]> {
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);

  const raw: any[] = await gasGetWithRetry('apiGetAuditLog', params);
  if (!Array.isArray(raw)) return [];

  // Map PascalCase backend fields → camelCase frontend fields
  return raw.map(row => ({
    timestamp: row.Timestamp || row.timestamp || '',
    user: row.User || row.user || '',
    action: row.Action || row.action || '',
    entity: row.EntityType || row.entity || '',
    entityId: row.EntityID || row.entityId || '',
    field: row.Field || row.field || '',
    oldValue: row.OldValue || row.oldValue || '',
    newValue: row.NewValue || row.newValue || '',
    notes: row.Notes || row.notes || ''
  }));
}

// --- Drivers API ---

export interface DriverRecord {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  vehiclePreferred: string;
  notes: string;
  source: string;
  lastUsed: string;
  totalRides: number;
  status: string;
  // Fields from backend not previously mapped
  collaboratorId: string;
  type: string;
  driverOwnership: string;
  email: string;
  iban: string;
  licenseType: string;
  licenseExpiry: string;
  operatingCompany: string;
  lastImportDate: string;
}

export async function getDrivers(): Promise<DriverRecord[]> {
  const result = await gasGetWithRetry('apiGetDrivers');
  // Backend may return { error: ... } if the sheet is missing
  if (result && result.error) {
    console.warn('getDrivers error:', result.error);
    return [];
  }
  if (!Array.isArray(result)) return [];
  return result.map(row => ({
    id: row.ID || row.id || '',
    name: row.Name || row.name || '',
    phone: row.Phone || row.phone || '',
    whatsapp: row.WhatsApp || row.whatsapp || '',
    vehiclePreferred: row.VehiclePreferred || row.vehiclePreferred || '',
    notes: row.Notes || row.notes || '',
    source: row.Source || row.source || '',
    lastUsed: row.LastUsed || row.lastUsed || '',
    totalRides: parseInt(row.TotalRides) || 0,
    status: row.Status || row.status || 'active',
    collaboratorId: row.CollaboratorID || row.collaboratorId || '',
    type: row.Type || row.type || 'internal',
    driverOwnership: row.DriverOwnership || row.driverOwnership || 'own',
    email: row.Email || row.email || '',
    iban: row.IBAN || row.iban || '',
    licenseType: row.LicenseType || row.licenseType || '',
    licenseExpiry: row.LicenseExpiry || row.licenseExpiry || '',
    operatingCompany: row.OperatingCompany || row.operatingCompany || '',
    lastImportDate: row.LastImportDate || row.lastImportDate || '',
  }));
}

export async function createDriver(name: string, phone: string, notes?: string): Promise<{ success: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('createDriver', { name, phone, notes });
}

/**
 * Crea un conductor al vuelo desde el formulario de servicios.
 * Verifica duplicados por teléfono.
 */
export async function createDriverOnTheFly(data: {
  name: string;
  phone: string;
  operatingCompany?: string;
}): Promise<{ success?: boolean; id?: string; name?: string; error?: string }> {
  return gasPostWithRetry('createDriverOnTheFly', data);
}

export async function updateDriver(id: string, fields: { name?: string; phone?: string; whatsapp?: string; vehiclePreferred?: string; notes?: string; status?: string; type?: string; collaboratorId?: string; driverOwnership?: string; email?: string; iban?: string; licenseType?: string; licenseExpiry?: string; operatingCompany?: string }): Promise<{ success: boolean; error?: string }> {
  return gasPostWithRetry('updateDriver', { id, fields });
}

export async function deleteDriver(id: string): Promise<{ success: boolean; error?: string }> {
  return gasPostWithRetry('deleteDriver', { id });
}

export async function getDriversByCollaborator(collaboratorId: string): Promise<DriverRecord[]> {
  const result = await gasGetWithRetry('getDriversByCollaborator', { collaboratorId });
  if (result && result.error) {
    console.warn('getDriversByCollaborator error:', result.error);
    return [];
  }
  if (!Array.isArray(result)) return [];
  return result.map(row => ({
    id: row.ID || row.id || '',
    name: row.Name || row.name || '',
    phone: row.Phone || row.phone || '',
    whatsapp: row.WhatsApp || row.whatsapp || '',
    vehiclePreferred: row.VehiclePreferred || row.vehiclePreferred || '',
    notes: row.Notes || row.notes || '',
    status: row.Status || row.status || 'Disponible',
    type: row.Type || row.type || 'interno',
    collaboratorId: row.CollaboratorID || row.collaboratorId || '',
    driverOwnership: row.DriverOwnership || row.driverOwnership || 'own',
    email: row.Email || row.email || '',
    iban: row.IBAN || row.iban || '',
    licenseType: row.LicenseType || row.licenseType || '',
    licenseExpiry: row.LicenseExpiry || row.licenseExpiry || '',
    operatingCompany: row.OperatingCompany || row.operatingCompany || '',
    source: row.Source || row.source || 'manual',
    lastImportDate: row.LastImportDate || row.lastImportDate || '',
  }));
}

export async function cleanupDrivers(): Promise<{ removed: number; error?: string }> {
  return gasGetWithRetry('apiCleanupDrivers');
}

// ============================================================================
// OPERATING COMPANY
// ============================================================================

export interface OperatingCompany {
  id: string;
  name: string;
  vat: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  defaultTaxRate: number;
  active: boolean;
}

export async function getOperatingCompanies(): Promise<OperatingCompany[]> {
  return gasGetWithRetry('getOperatingCompanies');
}

export interface ClientDTO {
  id: string;
  name: string;
  type: string;
  vat: string;
  address: string;
  phone: string;
  email: string;
  paymentTerms: number;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getClients(): Promise<ClientDTO[]> {
  return gasGetWithRetry('getClients');
}

export async function createClient(data: { name: string; type?: string; vat?: string; address?: string; phone?: string; email?: string; paymentTerms?: number; notes?: string }): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('createClient', data);
}

export async function updateClient(id: string, changes: Record<string, any>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('updateClient', { id, changes });
}

export async function deleteClient(id: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('deleteClient', { id });
}

export async function getClient(id: string): Promise<ClientDTO> {
  return gasGetWithRetry('getClient', { id });
}

export async function updateOperatingCompany(id: string, data: Partial<OperatingCompany>): Promise<{ success: boolean; error?: string }> {
  return gasPostWithRetry('updateOperatingCompany', { id, ...data });
}

// ============================================================================
// EXPORT — PDF y Excel
// ============================================================================

interface ExportResult {
  success?: boolean;
  error?: string;
  excelUrl?: string;
  excelDownloadUrl?: string;
  fileId?: string;
}

/**
 * Exporta servicios seleccionados como Excel
 */
export async function exportTransportListExcel(
  services: TransportService[],
  fileName?: string
): Promise<ExportResult> {
  return gasPostWithRetry('exportTransportListExcel', { services, fileName });
}

// ============================================================================
// WHATSAPP — Utilidades de infraestructura (no entity, solo formatting)
// ============================================================================

export function buildDriverWhatsAppMessage(
  driverName: string,
  services: TransportService[],
  dateStr: string
): string {
  let msg = `🚗 *Transport List — ${dateStr || 'Hoy'}*\n`;
  msg += `Hola ${driverName}, estos son tus servicios:\n\n`;
  services.forEach((s, i) => {
    msg += `*${i + 1}. ${s.time || 'N/A'}*\n`;
    if (s.vehicle) msg += `🚐 ${s.vehicle}\n`;
    if (s.from) msg += `📍 ${s.from}\n`;
    if (s.to) msg += `🏁 ${s.to}\n`;
    msg += '\n';
  });
  msg += '¡Buen trabajo! 💪';
  return msg;
}

export function buildGroupWhatsAppMessage(
  services: TransportService[],
  dateStr: string,
  production?: string
): string {
  let msg = `📋 *TRANSPORT LIST — ${production || ''} — ${dateStr || 'Hoy'}*\n`;
  msg += `Total: ${services.length} servicios\n\n`;
  const byDriver: Record<string, TransportService[]> = {};
  services.forEach(s => {
    const driver = s.driver || 'Sin conductor';
    if (!byDriver[driver]) byDriver[driver] = [];
    byDriver[driver].push(s);
  });
  Object.keys(byDriver).sort().forEach(driver => {
    msg += `━━━━━━━━━━━━━━━━\n`;
    msg += `*${driver}*`;
    if (byDriver[driver][0]?.driverPhone) msg += ` 📱 ${byDriver[driver][0].driverPhone}`;
    msg += '\n';
    byDriver[driver].forEach((s, i) => {
      msg += `  ${i + 1}. ${s.time || ''} | ${s.vehicle || ''}\n`;
      if (s.from || s.to) msg += `     📍 ${s.from || '?'} → ${s.to || '?'}\n`;
    });
    msg += '\n';
  });
  return msg;
}

export function buildAgencyWhatsAppMessage(
  services: TransportService[],
  agencyName: string,
  dateStr: string
): string {
  let msg = `👋 *${agencyName || 'Agencia'} — Solicitud de Servicios*\n`;
  msg += `Fecha: ${dateStr || 'Hoy'}\n`;
  msg += `Servicios: ${services.length}\n\n`;
  services.forEach((s, i) => {
    msg += `*${i + 1}*\n`;
    if (s.time) msg += `⏰ ${s.time}\n`;
    if (s.vehicle) msg += `🚐 ${s.vehicle}\n`;
    if (s.from) msg += `📍 ${s.from}\n`;
    if (s.to) msg += `🏁 ${s.to}\n`;
    msg += '\n';
  });
  msg += 'Por favor confirmar disponibilidad. ¡Gracias!';
  return msg;
}

// ============================================================================
// EMAIL — Utilidades de infraestructura
// ============================================================================

interface EmailResult {
  success?: boolean;
  error?: string;
  sentTo?: string[];
}

export async function sendTransportListEmail(
  recipients: string[],
  subject: string,
  services: TransportService[],
  dateStr: string,
  production?: string
): Promise<EmailResult> {
  return gasPostWithRetry('sendTransportListEmail', { recipients, subject, services, dateStr, production });
}

export async function sendServicesToAgency(
  recipients: string[],
  agencyName: string,
  services: TransportService[],
  dateStr: string,
  notes?: string
): Promise<EmailResult> {
  return gasPostWithRetry('sendServicesToAgency', { recipients, agencyName, services, dateStr, notes });
}

/** Auxiliary type for agency contacts (agencies are Clients with Type='agency' per ERD) */
export interface Agency {
  name: string;
  email: string;
  phone: string;
  contactPerson: string;
  notes: string;
  active: boolean;
}

/**
 * Get agency contacts — agencies are Clients with Type='agency' per ERD.
 * Fetches all clients and filters by type.
 */
export async function getAgencies(): Promise<{ agencies: Agency[]; error?: string }> {
  try {
    const result = await gasGetWithRetry('getClients');
    if (Array.isArray(result)) {
      const agencies = result
        .filter((c: any) => c.type === 'agency')
        .map((c: any) => ({
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          contactPerson: c.name || '',
          notes: c.notes || '',
          active: c.active !== false
        }));
      return { agencies };
    }
    return { agencies: [] };
  } catch (err: any) {
    return { agencies: [], error: err.message };
  }
}

// ============================================================================
// PROJECTS — Entidad principal de proyectos
// ============================================================================

export interface Project {
  id: string;
  clientId: string;
  name: string;
  transportCompany: string;
  operatingCompany: string;
  coordinator: string;
  status: 'Nuovo' | 'Preparazione' | 'Attivo' | 'Fatturazione' | 'Incasso' | 'Chiuso' | 'Archiviato';
  dateFrom: string;
  dateTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Obtiene todos los proyectos
 */
export async function getProjects(token?: string): Promise<Project[]> {
  return gasGetWithRetry('apiGetProjects', { token });
}

/**
 * Crea un nuevo proyecto
 */
export async function createProject(token: string, data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('apiCreateProject', { token, ...data });
}

/**
 * Actualiza un proyecto existente
 */
export async function updateProject(token: string, data: Partial<Project> & { id: string }): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiUpdateProject', { token, ...data });
}

/**
 * Elimina un proyecto
 */
export async function deleteProject(token: string, id: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiDeleteProject', { token, id });
}

// ============================================================================
// PROJECT STATE MACHINE — docs/04-STATE_MACHINES.md
// Nuovo → Preparazione → Attivo → Fatturazione → Incasso → Chiuso → Archiviato
// ============================================================================

export async function prepararProject(token: string, id: string): Promise<{ success?: boolean; project?: Project; error?: string }> {
  return gasPostWithRetry('prepararProject', { token, id });
}

export async function activarProject(token: string, id: string): Promise<{ success?: boolean; project?: Project; error?: string }> {
  return gasPostWithRetry('activarProject', { token, id });
}

export async function pasarAFacturacionProject(token: string, id: string): Promise<{ success?: boolean; project?: Project; error?: string }> {
  return gasPostWithRetry('pasarAFacturacionProject', { token, id });
}

export async function pasarACobroProject(token: string, id: string): Promise<{ success?: boolean; project?: Project; error?: string }> {
  return gasPostWithRetry('pasarACobroProject', { token, id });
}

export async function cerrarProject(token: string, id: string): Promise<{ success?: boolean; project?: Project; error?: string }> {
  return gasPostWithRetry('cerrarProject', { token, id });
}

export async function archiveProject(token: string, id: string): Promise<{ success?: boolean; project?: Project; error?: string }> {
  return gasPostWithRetry('archiveProject', { token, id });
}


// ============================================================================
// COLLABORATORS — Proveedores / empresas colaboradoras
// ============================================================================

export interface CollaboratorDTO {
  id: string;
  name: string;
  vat: string;
  address: string;
  phone: string;
  email: string;
  paymentTerms: number;
  active: boolean;
  notes: string;
  operatingCompany: string;
  createdAt: string;
  updatedAt: string;
}

export async function getCollaborators(filters?: { active?: boolean; operatingCompany?: string }): Promise<CollaboratorDTO[]> {
  return gasGetWithRetry('getCollaborators', filters);
}

export async function getCollaborator(id: string): Promise<CollaboratorDTO> {
  return gasGetWithRetry('getCollaborator', { id });
}

export async function createCollaborator(data: {
  name: string;
  vat?: string;
  address?: string;
  phone?: string;
  email?: string;
  paymentTerms?: number;
  notes?: string;
  active?: boolean;
  operatingCompany?: string;
}): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('createCollaborator', data);
}

export async function updateCollaborator(id: string, changes: Partial<CollaboratorDTO>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('updateCollaborator', { id, changes });
}

export async function deleteCollaborator(id: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('deleteCollaborator', { id });
}


// ============================================================================
// SUPPLIER RATES — Tarifas de proveedor
// ============================================================================

export interface SupplierRateDTO {
  id: string;
  supplierType: string;
  supplierId: string;
  projectId: string;
  serviceType: string;
  vehicleType: string;
  baseRate: number;
  includedKm: number;
  includedHours: number;
  extraKmRate: number;
  extraHourRate: number;
  diariaPiena: number;
  diariaMezza: number;
  nightExtra: number;
  holidayExtra: number;
  waitHourRate: number;
  validFrom: string;
  validTo: string;
  active: boolean;
  operatingCompany: string;
  createdAt: string;
  updatedAt: string;
}

export async function getSupplierRates(filters?: { supplierType?: string; supplierId?: string; projectId?: string }): Promise<SupplierRateDTO[]> {
  return gasGetWithRetry('getSupplierRates', filters);
}

export async function getSupplierRate(id: string): Promise<SupplierRateDTO> {
  return gasGetWithRetry('getSupplierRate', { id });
}

export async function createSupplierRate(data: {
  supplierType: string;
  supplierId: string;
  projectId?: string;
  serviceType?: string;
  vehicleType?: string;
  baseRate?: number;
  includedKm?: number;
  includedHours?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  diariaPiena?: number;
  diariaMezza?: number;
  nightExtra?: number;
  holidayExtra?: number;
  waitHourRate?: number;
  validFrom?: string;
  validTo?: string;
  operatingCompany?: string;
}): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('createSupplierRate', data);
}

export async function updateSupplierRate(id: string, changes: Partial<SupplierRateDTO>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('updateSupplierRate', { id, changes });
}

export async function deleteSupplierRate(id: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('deleteSupplierRate', { id });
}


// ============================================================================
// CHANGES — Cambios en cualquier entidad (entity per docs/01-ERD.md)
// ============================================================================

export interface Change {
  id: string;
  entityType: string;
  entityId: string;
  type: 'schedule' | 'driver' | 'vehicle' | 'route' | 'other';
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  status: 'Open' | 'Resolved';
  createdBy: string;
  createdAt: string;
  resolvedAt: string;
  resolvedBy: string;
  notes: string;
  updatedAt: string;
}

/**
 * Crea un nuevo cambio
 */
export async function createChange(data: {
  entityType: string;
  entityId: string;
  type: string;
  description: string;
  priority?: string;
  dueDate?: string;
  notes?: string;
}): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('createChange', data);
}

/**
 * Obtiene cambios (filtro opcional por status, entityType o entityId)
 */
export async function getChanges(filters?: { status?: string; entityType?: string; entityId?: string }): Promise<{ success?: boolean; changes?: Change[]; error?: string }> {
  return gasGetWithRetry('getChanges', filters || {});
}

/**
 * Actualiza un cambio (resolver, cancelar, agregar notas)
 */
export async function updateChange(data: Partial<Change> & { id: string }): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('updateChange', data);
}

/**
 * Elimina un cambio
 */
export async function deleteChange(id: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('deleteChange', { id });
}

/**
 * Resuelve un cambio (docs/10-COMMANDS.md)
 * Precondición: Status=Open
 */
export async function resolveChange(id: string): Promise<{ success?: boolean; change?: Change; error?: string }> {
  return gasPostWithRetry('resolveChange', { id });
}

// ============================================================================
// PAYMENTS — Pagos de facturas (entity per docs/01-ERD.md)
// ============================================================================

export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  paymentMethod: 'transfer' | 'cash' | 'card' | 'check';
  paymentDate: string;
  reference: string;
  notes: string;
  status: 'Registrado' | 'Confirmado' | 'Conciliado';
  createdBy: string;
  createdAt: string;
  confirmedAt: string;
  reconciledAt: string;
}

/**
 * Registrar un pago para una factura (Registrado status)
 */
export async function registerPayment(invoiceId: string, paymentData: {
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
  notes?: string;
  cashReceivedBy?: string;
  cashDate?: string;
  cashReference?: string;
}): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('registerPayment', { invoiceId, paymentData });
}

export async function editPayment(paymentId: string, changes: {
  Amount?: number;
  PaymentMethod?: string;
  PaymentDate?: string;
  Reference?: string;
  Notes?: string;
}): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('editPayment', { paymentId, changes });
}

/**
 * Confirmar un pago (Registrado → Confirmado, recalcula saldo de Invoice)
 */
export async function confirmPayment(paymentId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('confirmPayment', { paymentId });
}

/**
 * Conciliar pago (Confirmado → Conciliado)
 */
export async function reconcilePayment(paymentId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('reconcilePayment', { paymentId });
}

/**
 * Anular pago (Registrado → Anulado)
 */
export async function voidPayment(paymentId: string, reason: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('voidPayment', { paymentId, reason });
}

/**
 * Obtiene pagos (filtro opcional por invoiceId, clientId o status)
 */
export async function getPayments(filters?: { invoiceId?: string; clientId?: string; status?: string; dateFrom?: string; dateTo?: string }): Promise<Payment[]> {
  const raw = await gasGetWithRetry('apiGetPayments', filters);
  if (!Array.isArray(raw)) return [];
  return raw.map(row => ({
    id: row.ID || row.id || '',
    invoiceId: row.InvoiceID || row.invoiceId || '',
    clientId: row.ClientID || row.clientId || '',
    amount: parseFloat(row.Amount) || 0,
    paymentMethod: row.PaymentMethod || row.paymentMethod || 'transfer',
    paymentDate: row.PaymentDate || row.paymentDate || '',
    reference: row.Reference || row.reference || '',
    notes: row.Notes || row.notes || '',
    status: row.Status || row.status || 'Registrado',
    createdBy: row.CreatedBy || row.createdBy || '',
    createdAt: row.CreatedAt || row.createdAt || '',
    confirmedAt: row.ConfirmedAt || row.confirmedAt || '',
    reconciledAt: row.ReconciledAt || row.reconciledAt || '',
  }));
}

// ============================================================================
// DRIVER ADVANCES — Anticipos a conductores (entity per docs/01-ERD.md)
// ============================================================================

export interface DriverAdvanceDTO {
  id: string;
  driverId: string;
  projectId: string;
  amount: number;
  remainingAmount: number;
  date: string;
  status: string;
  deductedIn: string;
  notes: string;
  createdAt: string;
}

export async function getDriverAdvances(filters?: { driverId?: string; status?: string }): Promise<DriverAdvanceDTO[]> {
  const params: Record<string, string> = {};
  if (filters?.driverId) params.driverId = filters.driverId;
  if (filters?.status) params.status = filters.status;
  const raw: any[] = await gasGetWithRetry('getDriverAdvances', params);
  if (!Array.isArray(raw)) return [];
  return raw.map(row => ({
    id: row.ID || row.id || '',
    driverId: row.DriverID || row.driverId || '',
    projectId: row.ProjectID || row.projectId || '',
    amount: parseFloat(row.Amount) || 0,
    remainingAmount: parseFloat(row.RemainingAmount) || 0,
    date: row.Date || row.date || '',
    status: row.Status || row.status || '',
    deductedIn: row.DeductedIn || row.deductedIn || '',
    notes: row.Notes || row.notes || '',
    createdAt: row.CreatedAt || row.createdAt || '',
  }));
}

export async function getDriverAdvance(id: string): Promise<DriverAdvanceDTO | null> {
  const raw: any = await gasGetWithRetry('getDriverAdvance', { id });
  if (!raw || raw.error) return null;
  return {
    id: raw.ID || raw.id || '',
    driverId: raw.DriverID || '',
    projectId: raw.ProjectID || '',
    amount: parseFloat(raw.Amount) || 0,
    remainingAmount: parseFloat(raw.RemainingAmount) || 0,
    date: raw.Date || '',
    status: raw.Status || '',
    deductedIn: raw.DeductedIn || '',
    notes: raw.Notes || '',
    createdAt: raw.CreatedAt || '',
  };
}

export async function createDriverAdvance(data: { driverId: string; projectId?: string; amount: number; notes?: string }): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('createDriverAdvance', { DriverID: data.driverId, ProjectID: data.projectId, Amount: data.amount, Notes: data.notes });
}

export async function updateDriverAdvance(id: string, changes: Record<string, any>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('updateDriverAdvance', { id, changes });
}

// ============================================================================
// EXPENSES — Gastos operativos (entity per docs/01-ERD.md)
// ============================================================================

export interface ExpenseDTO {
  id: string;
  ownerType: string;   // "empresa" | "proyecto" | "vehiculo" | "servicio" | "conductor"
  ownerId: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  accountingDate: string;
  status: string;      // "Draft" | "Confirmed" | "Cancelled"
  projectId: string;
  operatingCompany: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function getExpenses(filters?: { projectId?: string; status?: string; company?: string; dateFrom?: string; dateTo?: string }): Promise<ExpenseDTO[]> {
  const params: Record<string, string> = {};
  if (filters?.projectId) params.projectId = filters.projectId;
  if (filters?.status) params.status = filters.status;
  if (filters?.company) params.company = filters.company;
  if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters?.dateTo) params.dateTo = filters.dateTo;
  const raw: any[] = await gasGetWithRetry('getExpenses', params);
  if (!Array.isArray(raw)) return [];
  return raw.map(row => ({
    id: row.ID || row.id || '',
    ownerType: row.OwnerType || row.ownerType || '',
    ownerId: row.OwnerID || row.ownerId || '',
    category: row.Category || row.category || '',
    description: row.Description || row.description || '',
    amount: parseFloat(row.Amount) || 0,
    expenseDate: row.ExpenseDate || row.expenseDate || '',
    accountingDate: row.AccountingDate || row.accountingDate || '',
    status: row.Status || row.status || '',
    projectId: row.ProjectID || row.projectId || '',
    operatingCompany: row.OperatingCompany || row.operatingCompany || '',
    createdBy: row.CreatedBy || row.createdBy || '',
    createdAt: row.CreatedAt || row.createdAt || '',
    updatedAt: row.UpdatedAt || row.updatedAt || '',
  }));
}

export async function createExpense(token: string, data: { ownerType: string; ownerId: string; category: string; description: string; amount: number; expenseDate: string; accountingDate?: string; projectId?: string; operatingCompany?: string }): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('apiCreateExpense', { token, ...data });
}

export async function editExpense(token: string, id: string, changes: Record<string, any>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiEditExpense', { token, id, changes });
}

export async function confirmExpense(token: string, id: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiConfirmExpense', { token, id });
}

export async function cancelExpense(token: string, id: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiCancelExpense', { token, id });
}

/**
 * Corregir gasto confirmado (Confirmed → cancelar + crear nuevo Draft)
 */
export async function correctExpense(id: string): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('apiCorrectExpense', { id });
}

// ============================================================================
// AUTH API
// ============================================================================

interface AuthUser {
  email: string;
  role: string;
  username: string;
}

interface AuthResponse {
  success?: boolean;
  error?: string;
  token?: string;
  user?: AuthUser;
  message?: string;
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin: string;
  createdBy: string;
}

/**
 * Register a new user
 */
export async function registerUser(data: {
  username: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  return gasPostWithRetry('registerUser', data);
}

/**
 * Login with username and password
 */
export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  return gasPostWithRetry('loginUser', { username, password });
}

/**
 * Logout and invalidate session
 */
export async function logoutUser(token: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('logoutUser', { token });
}

/**
 * Validate session token
 */
export async function validateSession(token: string): Promise<{ valid: boolean; user?: AuthUser; error?: string }> {
  return gasPost('validateSession', { token });
}

/**
 * Get all users (admin only)
 */
export async function getUsers(token: string): Promise<{ success?: boolean; users?: UserRecord[]; error?: string }> {
  return gasGetWithRetry('apiGetUsers', { token });
}

/**
 * Approve a user (admin only)
 */
export async function approveUser(token: string, userId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('approveUser', { token, userId });
}

/**
 * Reject a user (admin only)
 */
export async function rejectUser(token: string, userId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('rejectUser', { token, userId });
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(token: string, userId: string, newRole: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('updateUserRole', { token, userId, newRole });
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(token: string, userId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('deleteUser', { token, userId });
}

/**
 * Create a user (admin only). Sets status to 'approved' directly.
 */
export async function createUser(token: string, data: {
  username: string;
  email: string;
  password: string;
  name?: string;
  role?: string;
}): Promise<{ success?: boolean; userId?: string; error?: string }> {
  return gasPostWithRetry('createUser', { token, ...data });
}

/**
 * Update user fields (admin only). Can change name, email, role.
 */
export async function updateUser(token: string, userId: string, updates: {
  name?: string;
  email?: string;
  role?: string;
}): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('updateUser', { token, userId, updates });
}

// ============================================================================
// SETTINGS — Configuración del sistema (docs/02-DOMAIN.md Settings entity)
// ============================================================================

export async function getSettings(): Promise<Record<string, string>> {
  const result = await gasGetWithRetry('getSettings');
  if (result && result.error) {
    console.warn('getSettings error:', result.error);
    return {};
  }
  return result || {};
}

export async function saveSettings(settings: Record<string, string>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('saveSettings', { settings });
}

// ============================================================================
// ENUM OPTIONS — Vehicle Types & Service Types (admin-configurable)
// ============================================================================

const DEFAULT_VEHICLE_TYPES = ['Van', 'Car'];
const DEFAULT_SERVICE_TYPES = ['Dispo', 'Transfer Airport', 'Transfer City'];

export async function getVehicleTypes(): Promise<string[]> {
  const result = await gasGetWithRetry('getVehicleTypes');
  if (Array.isArray(result) && result.length > 0) return result;
  return DEFAULT_VEHICLE_TYPES;
}

export async function saveVehicleTypes(types: string[]): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('saveVehicleTypes', { types });
}

export async function getServiceTypes(): Promise<string[]> {
  const result = await gasGetWithRetry('getServiceTypes');
  if (Array.isArray(result) && result.length > 0) return result;
  return DEFAULT_SERVICE_TYPES;
}

export async function saveServiceTypes(types: string[]): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('saveServiceTypes', { types });
}

// ============================================================================
// RAPPORTINO DOMAIN API — Nuevo dominio (docs/02-DOMAIN.md)
// ============================================================================

export interface RapportinoClientDTO {
  id: string;
  projectId: string;
  clientId: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string;
  acceptedAt: string;
}

export interface RapportinoDriverDTO {
  id: string;
  projectId: string;
  driverId: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string;
  paidAt: string;
}

export interface RapportinoItemDTO {
  id: string;
  rapportinoClientId: string;
  serviceId: string;
  amount: number;
  lockedAmount: number;
  locked: boolean;
  createdAt: string;
}

// --- Rapportino Client ---

export async function getRapportinoClients(filters?: {
  projectId?: string;
  clientId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<RapportinoClientDTO[]> {
  return gasGetWithRetry('apiGetRapportinoClients', filters as any);
}

export async function createRapportinoClient(
  projectId: string,
  clientId: string,
  weekStart: string,
  weekEnd: string,
  periodType: string = 'weekly'
): Promise<RapportinoClientDTO> {
  return gasPostWithRetry('apiCreateRapportinoClient', { projectId, clientId, weekStart, weekEnd, periodType });
}

export async function addServiceToRapportino(
  rapportinoId: string,
  serviceId: string
): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiAddServiceToRapportino', { rapportinoId, serviceId });
}

export async function removeServiceFromRapportino(
  rapportinoId: string,
  serviceId: string
): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiRemoveServiceFromRapportino', { rapportinoId, serviceId });
}

export async function reviewRapportinoClient(rapportinoId: string): Promise<RapportinoClientDTO> {
  return gasPostWithRetry('apiReviewRapportinoClient', { rapportinoId });
}

export async function sendRapportinoClient(rapportinoId: string): Promise<RapportinoClientDTO> {
  return gasPostWithRetry('apiSendRapportinoClient', { rapportinoId });
}

export async function acceptRapportinoClient(rapportinoId: string): Promise<RapportinoClientDTO> {
  return gasPostWithRetry('apiAcceptRapportinoClient', { rapportinoId });
}

export async function rejectRapportinoClient(rapportinoId: string, reason: string): Promise<RapportinoClientDTO> {
  return gasPostWithRetry('apiRejectRapportinoClient', { rapportinoId, reason });
}

export async function facturarRapportino(rapportinoId: string): Promise<RapportinoClientDTO> {
  return gasPostWithRetry('apiFacturarRapportino', { rapportinoId });
}

// --- Rapportino Driver ---

export async function getRapportinoDrivers(filters?: {
  projectId?: string;
  driverId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<RapportinoDriverDTO[]> {
  return gasGetWithRetry('apiGetRapportinoDrivers', filters as any);
}

export async function createRapportinoDriver(
  projectId: string,
  driverId: string,
  weekStart: string,
  weekEnd: string,
  periodType: string = 'weekly'
): Promise<RapportinoDriverDTO> {
  return gasPostWithRetry('apiCreateRapportinoDriver', { projectId, driverId, weekStart, weekEnd, periodType });
}

export async function reviewRapportinoDriver(rapportinoId: string): Promise<RapportinoDriverDTO> {
  return gasPostWithRetry('apiReviewRapportinoDriver', { rapportinoId });
}

export async function sendRapportinoDriver(rapportinoId: string): Promise<RapportinoDriverDTO> {
  return gasPostWithRetry('apiSendRapportinoDriver', { rapportinoId });
}

export async function acceptRapportinoDriver(rapportinoId: string): Promise<RapportinoDriverDTO> {
  return gasPostWithRetry('apiAcceptRapportinoDriver', { rapportinoId });
}

export async function rejectRapportinoDriver(rapportinoId: string, reason: string): Promise<RapportinoDriverDTO> {
  return gasPostWithRetry('apiRejectRapportinoDriver', { rapportinoId, reason });
}

export async function payRapportinoDriver(
  rapportinoId: string,
  amount?: number
): Promise<RapportinoDriverDTO> {
  return gasPostWithRetry('apiPayRapportinoDriver', { rapportinoId, amount });
}

// --- Rapportino Collaborator ---

export interface RapportinoCollaboratorDTO {
  id: string;
  projectId: string;
  collaboratorId: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string;
  acceptedAt: string;
  paidAt: string;
}

export async function getRapportinoCollaborators(filters?: {
  projectId?: string;
  collaboratorId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<RapportinoCollaboratorDTO[]> {
  return gasGetWithRetry('apiGetRapportinoCollaborators', filters as any);
}

export async function createRapportinoCollaborator(
  projectId: string,
  collaboratorId: string,
  periodStart: string,
  periodEnd: string,
  periodType: string = 'weekly'
): Promise<RapportinoCollaboratorDTO> {
  return gasPostWithRetry('apiCreateRapportinoCollaborator', { projectId, collaboratorId, periodStart, periodEnd, periodType });
}

export async function addServiceToRapportinoCollaborator(
  rapportinoId: string,
  serviceId: string
): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiAddServiceToRapportinoCollaborator', { rapportinoId, serviceId });
}

export async function sendRapportinoCollaborator(rapportinoId: string): Promise<RapportinoCollaboratorDTO> {
  return gasPostWithRetry('apiSendRapportinoCollaborator', { rapportinoId });
}

export async function acceptRapportinoCollaborator(rapportinoId: string): Promise<RapportinoCollaboratorDTO> {
  return gasPostWithRetry('apiAcceptRapportinoCollaborator', { rapportinoId });
}

export async function payRapportinoCollaborator(
  rapportinoId: string,
  amount?: number
): Promise<RapportinoCollaboratorDTO> {
  return gasPostWithRetry('apiPayRapportinoCollaborator', { rapportinoId, amount });
}

// ============================================================================
// INVOICE DOMAIN API — docs/02-DOMAIN.md, docs/04-STATE_MACHINES.md
// ============================================================================

export interface InvoiceDTO {
  id: string;
  invoiceNumber: string;
  projectId: string;
  clientId: string;
  date: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  balance: number;
  currency: string;
  status: string;
  notes: string;
  voidReason: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItemDTO {
  id: string;
  invoiceId: string;
  rapportinoClientId: string;
  serviceId?: string;
  amount: number;
  createdAt: string;
}

export async function getInvoices(filters?: {
  projectId?: string;
  clientId?: string;
  status?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<InvoiceDTO[]> {
  return gasGetWithRetry('getInvoices', filters as any);
}

export async function getInvoiceItems(invoiceId?: string): Promise<InvoiceItemDTO[]> {
  return gasGetWithRetry('getInvoiceItems', { invoiceId });
}

export async function createInvoice(data: {
  projectId: string;
  clientId: string;
  dueDate?: string;
  notes?: string;
}): Promise<InvoiceDTO & { error?: string }> {
  return gasPostWithRetry('createInvoice', data);
}

export async function emitInvoice(invoiceId: string): Promise<InvoiceDTO & { error?: string }> {
  return gasPostWithRetry('emitInvoice', { invoiceId });
}

export async function editInvoice(invoiceId: string, changes: {
  ClientID?: string;
  ProjectID?: string;
  DueDate?: string;
  Notes?: string;
}): Promise<InvoiceDTO & { error?: string }> {
  return gasPostWithRetry('editInvoice', { invoiceId, changes });
}

export async function sendInvoice(invoiceId: string): Promise<InvoiceDTO & { error?: string }> {
  return gasPostWithRetry('sendInvoice', { invoiceId });
}

export async function voidInvoice(invoiceId: string, reason: string): Promise<InvoiceDTO & { error?: string }> {
  return gasPostWithRetry('voidInvoice', { invoiceId, reason });
}

// ============================================================================
// CONTACTS — Contactos de clientes (docs/01-ERD.md)
// ============================================================================

export interface ContactDTO {
  id: string;
  clientId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  whatsapp: string;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getContacts(clientId?: string): Promise<ContactDTO[]> {
  const params: Record<string, string> = {};
  if (clientId) params.clientId = clientId;
  const raw: any[] = await gasGetWithRetry('apiGetContacts', params);
  if (!Array.isArray(raw)) return [];
  return raw.map(row => ({
    id: row.ID || row.id || '',
    clientId: row.ClientID || row.clientId || '',
    name: row.Name || row.name || '',
    role: row.Role || row.role || '',
    phone: row.Phone || row.phone || '',
    email: row.Email || row.email || '',
    whatsapp: row.WhatsApp || row.whatsapp || '',
    notes: row.Notes || row.notes || '',
    active: row.Active === true || row.Active === 'true',
    createdAt: row.CreatedAt || row.createdAt || '',
    updatedAt: row.UpdatedAt || row.updatedAt || '',
  }));
}

export async function createContact(data: { clientId: string; name: string; role?: string; phone?: string; email?: string; whatsapp?: string; notes?: string }): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('apiCreateContact', data);
}

export async function updateContact(id: string, changes: Record<string, any>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiUpdateContact', { id, changes });
}

export async function deleteContact(id: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('deleteContact', { id });
}

// ============================================================================
// VEHICLES — Vehículos (docs/01-ERD.md)
// ============================================================================

export interface VehicleDTO {
  id: string;
  plate: string;
  brand: string;
  model: string;
  type: string;
  ownership: string;
  insuranceExpiry: string;
  inspectionExpiry: string;
  capacity: number;
  status: string;
  driverDefault: string;
  operatingCompany: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export async function getVehicles(): Promise<VehicleDTO[]> {
  const raw: any[] = await gasGetWithRetry('apiGetVehicles');
  if (!Array.isArray(raw)) return [];
  return raw.map(row => ({
    id: row.ID || row.id || '',
    plate: row.Plate || row.plate || '',
    brand: row.Brand || row.brand || '',
    model: row.Model || row.model || '',
    type: row.Type || row.type || '',
    ownership: row.Ownership || row.ownership || '',
    insuranceExpiry: row.InsuranceExpiry || row.insuranceExpiry || '',
    inspectionExpiry: row.InspectionExpiry || row.inspectionExpiry || '',
    capacity: parseInt(row.Capacity) || 0,
    status: row.Status || row.status || '',
    driverDefault: row.DriverDefault || row.driverDefault || '',
    operatingCompany: row.OperatingCompany || row.operatingCompany || '',
    notes: row.Notes || row.notes || '',
    createdAt: row.CreatedAt || row.createdAt || '',
    updatedAt: row.UpdatedAt || row.updatedAt || '',
  }));
}

export async function createVehicle(data: { plate: string; brand?: string; model?: string; type?: string; ownership?: string; capacity?: number; operatingCompany?: string; notes?: string }): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('apiCreateVehicle', data);
}

export async function updateVehicle(id: string, changes: Record<string, any>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiUpdateVehicle', { id, changes });
}

export async function deleteVehicle(id: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('deleteVehicle', { id });
}

export async function getVehicle(id: string): Promise<VehicleDTO> {
  return gasGetWithRetry('getVehicle', { id });
}

// ============================================================================
// DRIVER RATES — Tarifas de conductores (docs/01-ERD.md)
// ============================================================================

export interface DriverRateDTO {
  id: string;
  driverId: string;
  vehicleType: string;
  transferRate: number;
  halfDayRate: number;
  fullDayRate: number;
  nightExtra: number;
  holidayExtra: number;
  waitHourRate: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getDriverRates(driverId?: string): Promise<DriverRateDTO[]> {
  const params: Record<string, string> = {};
  if (driverId) params.driverId = driverId;
  const raw: any[] = await gasGetWithRetry('apiGetDriverRates', params);
  if (!Array.isArray(raw)) return [];
  return raw.map(row => ({
    id: row.ID || row.id || '',
    driverId: row.DriverID || row.driverId || '',
    vehicleType: row.VehicleType || row.vehicleType || '',
    transferRate: parseFloat(row.TransferRate) || 0,
    halfDayRate: parseFloat(row.HalfDayRate) || 0,
    fullDayRate: parseFloat(row.FullDayRate) || 0,
    nightExtra: parseFloat(row.NightExtra) || 0,
    holidayExtra: parseFloat(row.HolidayExtra) || 0,
    waitHourRate: parseFloat(row.WaitHourRate) || 0,
    active: row.Active === true || row.Active === 'true',
    createdAt: row.CreatedAt || row.createdAt || '',
    updatedAt: row.UpdatedAt || row.updatedAt || '',
  }));
}

export async function createDriverRate(data: { driverId: string; vehicleType?: string; transferRate?: number; halfDayRate?: number; fullDayRate?: number; nightExtra?: number; holidayExtra?: number; waitHourRate?: number }): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('apiCreateDriverRate', data);
}

export async function updateDriverRate(id: string, changes: Record<string, any>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiUpdateDriverRate', { id, changes });
}

// ============================================================================
// RATE CARDS — Tarifario de clientes (docs/01-ERD.md)
// ============================================================================

export interface RateCardDTO {
  id: string;
  name: string;
  category: string;
  vehicleType: string;
  basePrice: number;
  extraKmRate: number;
  extraHourRate: number;
  waitRate: number;
  nightFee: number;
  holidayFee: number;
  halfDayPrice: number;
  fullDayPrice: number;
  airportSurcharge: number;
  operatingCompany: string;
  active: boolean;
  notes: string;
  clientId: string;
  projectId: string;
  validFrom: string;
  validTo: string;
  createdAt: string;
  updatedAt: string;
}

export async function getRateCards(clientId?: string): Promise<RateCardDTO[]> {
  const params: Record<string, string> = {};
  if (clientId) params.clientId = clientId;
  const raw: any[] = await gasGetWithRetry('apiGetRateCards', params);
  if (!Array.isArray(raw)) return [];
  return raw.map(row => ({
    id: row.ID || row.id || '',
    name: row.Name || row.name || '',
    category: row.Category || row.category || '',
    vehicleType: row.VehicleType || row.vehicleType || '',
    basePrice: parseFloat(row.BasePrice) || 0,
    extraKmRate: parseFloat(row.ExtraKmRate) || 0,
    extraHourRate: parseFloat(row.ExtraHourRate) || 0,
    waitRate: parseFloat(row.WaitRate) || 0,
    nightFee: parseFloat(row.NightFee) || 0,
    holidayFee: parseFloat(row.HolidayFee) || 0,
    halfDayPrice: parseFloat(row.HalfDayPrice) || 0,
    fullDayPrice: parseFloat(row.FullDayPrice) || 0,
    airportSurcharge: parseFloat(row.AirportSurcharge) || 0,
    operatingCompany: row.OperatingCompany || row.operatingCompany || '',
    active: row.Active === true || row.Active === 'true',
    notes: row.Notes || row.notes || '',
    clientId: row.ClientID || row.clientId || '',
    projectId: row.ProjectID || row.projectId || '',
    validFrom: row.ValidFrom || row.validFrom || '',
    validTo: row.ValidTo || row.validTo || '',
    createdAt: row.CreatedAt || row.createdAt || '',
    updatedAt: row.UpdatedAt || row.updatedAt || '',
  }));
}

export async function createRateCard(data: { name: string; category?: string; vehicleType?: string; basePrice?: number; clientId?: string; projectId?: string }): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPostWithRetry('apiCreateRateCard', data);
}

export async function updateRateCard(id: string, changes: Record<string, any>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiUpdateRateCard', { id, changes });
}

// ============================================================================
// DRIVER REPORTS — Reportes de conductores (docs/01-ERD.md)
// ============================================================================

export interface DriverReportDTO {
  id: string;
  serviceId: string;
  driverId: string;
  version: number;
  previousReportId: string;
  kmExtra: number;
  hoursExtra: number;
  parking: number;
  tolls: number;
  fuel: number;
  waitMinutes: number;
  notes: string;
  status: string;
  approvedBy: string;
  approvedDate: string;
  rejectedReason: string;
  locked: boolean;
  submittedAt: string;
  createdAt: string;
  totalExtras: number;
}

export async function getDriverReports(serviceId?: string): Promise<DriverReportDTO[]> {
  const params: Record<string, string> = {};
  if (serviceId) params.serviceId = serviceId;
  const raw: any[] = await gasGetWithRetry('apiGetDriverReports', params);
  if (!Array.isArray(raw)) return [];
  return raw.map(row => ({
    id: row.ID || row.id || '',
    serviceId: row.ServiceID || row.serviceId || '',
    driverId: row.DriverID || row.driverId || '',
    version: parseInt(row.Version) || 1,
    previousReportId: row.PreviousReportID || row.previousReportId || '',
    kmExtra: parseFloat(row.KmExtra) || 0,
    hoursExtra: parseFloat(row.HoursExtra) || 0,
    parking: parseFloat(row.Parking) || 0,
    tolls: parseFloat(row.Tolls) || 0,
    fuel: parseFloat(row.Fuel) || 0,
    waitMinutes: parseFloat(row.WaitMinutes) || 0,
    notes: row.Notes || row.notes || '',
    status: row.Status || row.status || '',
    approvedBy: row.ApprovedBy || row.approvedBy || '',
    approvedDate: row.ApprovedDate || row.approvedDate || '',
    rejectedReason: row.RejectedReason || row.rejectedReason || '',
    locked: row.Locked === true || row.Locked === 'true',
    submittedAt: row.SubmittedAt || row.submittedAt || '',
    createdAt: row.CreatedAt || row.createdAt || '',
    totalExtras: (parseFloat(row.KmExtra) || 0) + (parseFloat(row.HoursExtra) || 0) + (parseFloat(row.Parking) || 0) + (parseFloat(row.Tolls) || 0) + (parseFloat(row.Fuel) || 0),
  }));
}

export async function getDriverReport(id: string): Promise<DriverReportDTO | null> {
  const raw: any = await gasGetWithRetry('apiGetDriverReport', { id });
  if (!raw || raw.error) return null;
  return {
    id: raw.ID || raw.id || '',
    serviceId: raw.ServiceID || '',
    driverId: raw.DriverID || '',
    version: parseInt(raw.Version) || 1,
    previousReportId: raw.PreviousReportID || '',
    kmExtra: parseFloat(raw.KmExtra) || 0,
    hoursExtra: parseFloat(raw.HoursExtra) || 0,
    parking: parseFloat(raw.Parking) || 0,
    tolls: parseFloat(raw.Tolls) || 0,
    fuel: parseFloat(raw.Fuel) || 0,
    waitMinutes: parseFloat(raw.WaitMinutes) || 0,
    notes: raw.Notes || '',
    status: raw.Status || '',
    approvedBy: raw.ApprovedBy || '',
    approvedDate: raw.ApprovedDate || '',
    rejectedReason: raw.RejectedReason || '',
    locked: raw.Locked === true || raw.Locked === 'true',
    submittedAt: raw.SubmittedAt || '',
    createdAt: raw.CreatedAt || '',
    totalExtras: (parseFloat(raw.KmExtra) || 0) + (parseFloat(raw.HoursExtra) || 0) + (parseFloat(raw.Parking) || 0) + (parseFloat(raw.Tolls) || 0) + (parseFloat(raw.Fuel) || 0),
  };
}

export async function submitDriverReport(serviceId: string, driverId: string, reportData: Record<string, any>): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('submitDriverReport', { serviceId, driverId, reportData });
}

export async function approveDriverReport(reportId: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiApproveDriverReport', { reportId });
}

export async function rejectDriverReport(reportId: string, reason: string): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('apiRejectDriverReport', { reportId, reason });
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface ActivityFeedEntry {
  id: string;
  timestamp: string;
  eventType: string;
  entityType: string;
  entityId: string;
  description: string;
  user: string;
  metadata: string;
}

export async function getActivityFeed(limit?: number): Promise<ActivityFeedEntry[]> {
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);
  const raw: any[] = await gasGetWithRetry('apiGetActivityFeed', params);
  if (!Array.isArray(raw)) return [];
  return raw.map(row => ({
    id: row.ID || row.id || '',
    timestamp: row.Timestamp || row.timestamp || '',
    eventType: row.EventType || row.eventType || '',
    entityType: row.EntityType || row.entityType || '',
    entityId: row.EntityID || row.entityId || '',
    description: row.Description || row.description || '',
    user: row.User || row.user || '',
    metadata: row.Metadata || row.metadata || '',
  }));
}

// ============================================================================
// DRIVER LINKS
// ============================================================================

export interface DriverLinkDTO {
  token: string;
  driverId: string;
  projectId: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  fieldsSchema: string;
  createdAt: string;
  expiresAt: string;
  link?: string;
}

/**
 * Generate a unique link for a driver to fill in their rapportino via web form.
 * @param driverId - Driver ID
 * @param projectId - Project ID
 * @param dateFrom - Start date (YYYY-MM-DD)
 * @param dateTo - End date (YYYY-MM-DD)
 * @param baseUrl - Optional base URL for the link
 * @returns DriverLinkDTO with token and link URL
 */
export async function generateDriverLink(
  driverId: string,
  projectId: string,
  dateFrom: string,
  dateTo: string,
  options?: { baseUrl?: string; fieldsSchema?: string; linkDurationDays?: number }
): Promise<DriverLinkDTO> {
  return gasPostWithRetry('generateDriverLink', { driverId, projectId, dateFrom, dateTo, ...options });
}

/**
 * Get all driver links, optionally filtered.
 */
export async function getDriverLinks(filters?: {
  driverId?: string;
  projectId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DriverLinkDTO[]> {
  return gasGetWithRetry('getDriverLinks', filters as any);
}

/**
 * Deactivate (revoke) a driver link by token.
 */
export async function deactivateDriverLink(
  token: string
): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('deactivateDriverLink', { linkToken: token });
}

export async function updateDriverLink(
  token: string,
  updates: {
    DriverID?: string;
    ProjectID?: string;
    DateFrom?: string;
    DateTo?: string;
    FieldsSchema?: string;
  }
): Promise<{ success?: boolean; error?: string; changes?: Record<string, any> }> {
  return gasPostWithRetry('updateDriverLink', { linkToken: token, updates });
}

// ============================================================================
// REPORT INBOX
// ============================================================================

export interface InboxItem {
  ID: string;
  Source: string;
  Channel: string;
  DriverID: string;
  ProjectID: string;
  ServiceDate: string;
  RawData: string;
  NormalizedData: string;
  Status: string;
  CorrelationID: string;
  ReviewedBy: string;
  ReviewedAt: string;
  RejectionReason: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export async function getInboxItems(filters?: {
  source?: string;
  channel?: string;
  driverId?: string;
  status?: string;
}): Promise<InboxItem[]> {
  return gasPost('getInboxItems', { filters });
}

export async function normalizeReport(
  inboxId: string,
  normalizedData: Record<string, any>
): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('normalizeReport', { inboxId, normalizedData });
}

export async function submitToReview(
  inboxId: string
): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('submitToReview', { inboxId });
}

export async function acceptReport(
  inboxId: string,
  reviewedBy?: string
): Promise<{ success?: boolean; error?: string }> {
  const result = await gasPostWithRetry('acceptReport', { inboxId, reviewedBy });
  if (result && result.success === false) {
    throw new Error(result.error || 'acceptReport failed');
  }
  return result;
}

export async function rejectReport(
  inboxId: string,
  reason?: string,
  reviewedBy?: string
): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('rejectReport', { inboxId, reason, reviewedBy });
}

export async function lockReport(
  inboxId: string
): Promise<{ success?: boolean; error?: string }> {
  return gasPostWithRetry('lockReport', { inboxId });
}

// ============================================================================
// DRIVER LINK RESPONSES — Raw submissions from Rapportino form
// ============================================================================

export interface DriverLinkResponse {
  ID: string;
  Token: string;
  DriverID: string;
  ProjectID: string;
  ServiceID: string;
  DataServizio: string;
  TipoServizio: string;
  OrarioInizio: string;
  OrarioFine: string;
  Descrizione: string;
  Clienti: string;
  Targa: string;
  KmTotali: number;
  Diaria: string;
  Note: string;
  SubmittedAt: string;
}

export async function getDriverLinkResponses(
  filters?: { driverId?: string; projectId?: string; serviceId?: string; token?: string }
): Promise<DriverLinkResponse[]> {
  return gasPostWithRetry('getDriverLinkResponses', { filters: filters || {} });
}

// ============================================================================
// WHATSAPP — Parse and capture driver messages
// ============================================================================

export interface WhatsAppParsedReport {
  driverName: string;
  date: string;
  dateParsed: string;
  startTime: string;
  endTime: string;
  kmTotal: number;
  kmOver: number;
  diariaType: string;
  rawText: string;
  matchedDriverId: string;
  serviceId?: string;
  driverId?: string;
}

export interface WhatsAppParseResult {
  success: boolean;
  reports?: WhatsAppParsedReport[];
  drivers?: { id: string; name: string }[];
  reportCount?: number;
  error?: string;
}

export interface WhatsAppCaptureResult {
  success: boolean;
  captured: number;
  total: number;
  results: { success: boolean; inboxId: string | null; driverName: string; error: string | null }[];
}

export async function parseWhatsApp(text: string): Promise<WhatsAppParseResult> {
  return gasPostWithRetry('parseWhatsApp', { text });
}

export async function captureWhatsAppReports(
  reports: WhatsAppParsedReport[],
  projectId: string
): Promise<WhatsAppCaptureResult> {
  return gasPostWithRetry('captureWhatsAppReports', { reports, projectId });
}


// ============================================================================
// RECONCILIATION — docs/05-WORKFLOWS.md
// ============================================================================

export interface ReconciliationData {
  startTime: string;
  endTime: string;
  km: number;
  diaria: string;
  festivo: boolean;
  notturno: boolean;
}

export interface ReconciliationDTO {
  id: string;
  serviceId: string;
  projectId: string;
  production: ReconciliationData;
  driver: ReconciliationData;
  final: ReconciliationData;
  status: string; // Pendiente | EnProceso | Resuelto
  resolvedBy: string;
  resolvedAt: string;
  resolutionNotes: string;
  createdAt: string;
  updatedAt: string;
}

export async function getReconciliations(filters?: { status?: string; projectId?: string; serviceId?: string; company?: string }): Promise<ReconciliationDTO[]> {
  return gasGetWithRetry('getReconciliations', filters || {});
}

export async function getReconciliation(id: string): Promise<ReconciliationDTO> {
  return gasGetWithRetry('getReconciliation', { id });
}

export async function resolveReconciliation(id: string, resolution: {
  FinalStartTime?: string;
  FinalEndTime?: string;
  FinalKm?: number;
  FinalDiaria?: string;
  FinalFestivo?: boolean;
  FinalNotturno?: boolean;
  Notes?: string;
}): Promise<ReconciliationDTO> {
  return gasPost('resolveReconciliation', { id, resolution });
}

// ============================================================================
// DOCUMENTS — Documentos adjuntos
// ============================================================================

export interface DocumentDTO {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

export async function getDocuments(entityType?: string, entityId?: string): Promise<DocumentDTO[]> {
  const params: Record<string, string> = {};
  if (entityType) params.entityType = entityType;
  if (entityId) params.entityId = entityId;
  return gasGetWithRetry('getDocuments', params);
}



export async function createDocument(data: { entityType: string; entityId: string; fileName: string; fileUrl: string; mimeType?: string }): Promise<{ success?: boolean; id?: string; error?: string }> {
  return gasPost('createDocument', data);
}

export async function deleteDocument(id: string): Promise<{ success?: boolean; error?: string }> {
  return gasPost('deleteDocument', { id });
}


// ============================================================================
// DASHBOARDS — Resúmenes
// ============================================================================

export interface DashboardSummary {
  services: {
    total: number;
    validated: number;
    pendingValidation: number;
  };
  financials: {
    totalRevenue: number;
    totalCost: number;
    profit: number;
    margin: number;
  };
  invoicing: {
    pending: number;
    sent: number;
    totalInvoiced: number;
    totalPaid: number;
    pendingAmount: number;
  };
  expenses: {
    total: number;
  };
  resources: {
    drivers: { total: number; available: number; assigned: number };
    vehicles: { total: number; available: number };
  };
}

export interface ServiceSummary {
  serviceId: string;
  date: string;
  production: string;
  driver: string;
  status: string;
  revenue: number;
  cost: number;
}

export async function getMainDashboard(operatingCompany?: string, startDate?: string, endDate?: string): Promise<DashboardSummary> {
  return gasGetWithRetry('getMainDashboard', { operatingCompany: operatingCompany || '', startDate: startDate || '', endDate: endDate || '' });
}


// ============================================================================
// SERVICE SUMMARIES — Resúmenes de servicios
// ============================================================================

export async function getPendingValidation(): Promise<ServiceSummary[]> {
  return gasGetWithRetry('getPendingValidation');
}

export async function getPendingInvoicing(): Promise<ServiceSummary[]> {
  return gasGetWithRetry('getPendingInvoicing');
}
