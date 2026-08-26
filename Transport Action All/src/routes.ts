// ============================================================================
// ROUTE CONSTANTS — Single source of truth for all navigation paths
// ============================================================================

export const routes = {
  // === GLOBAL SCREENS ===
  dashboard: '/dashboard',
  transport: '/transport',
  transportList: '/transport-list',
  driverReports: '/driver-reports',
  driverLinks: '/driver-links',
  rapportinos: '/rapportinos',
  reconciliation: '/reconciliation',
  accounting: '/accounting',
  financial: '/financial',
  customers: '/customers',
  providers: '/providers',
  drivers: '/drivers',
  vehicles: '/vehicles',
  projects: '/projects',
  auditCenter: '/audit-center',
  activeUsers: '/active-users',
  userManagement: '/user-management',
  settings: '/settings',
  newService: '/new-service',
  documents: '/documents',
  reports: '/reports',
  rateCards: '/rate_cards',
  driverSubmissions: '/driver-submissions',

  // === SERVICE ROUTES (grouped sections) ===
  service: (id: string) => `/service/${id}`,
  serviceOverview: (id: string) => `/service/${id}`,
  serviceMovements: (id: string) => `/service/${id}/movements`,
  serviceOperations: (id: string) => `/service/${id}/operations`,
  serviceCommunication: (id: string) => `/service/${id}/communication`,
  serviceFinance: (id: string) => `/service/${id}/finance`,
  serviceHistory: (id: string) => `/service/${id}/history`,
} as const;

// === SCREEN ID → ROUTE mapping (for backward compatibility) ===
export const screenToRoute: Record<string, string> = {
  executive_dashboard: routes.dashboard,
  transport: routes.transport,
  transport_list: routes.transportList,
  driver_reports: routes.driverReports,
  driver_links: routes.driverLinks,
  rapportinos: routes.rapportinos,
  reconciliation: routes.reconciliation,
  accounting: routes.accounting,
  financial: routes.financial,
  customers: routes.customers,
  providers: routes.providers,
  drivers: routes.drivers,
  driver_panel: routes.drivers,
  vehicles: routes.vehicles,
  projects: routes.projects,
  audit_center: routes.auditCenter,
  active_users: routes.activeUsers,
  user_management: routes.userManagement,
  settings: routes.settings,
  new_service: routes.newService,
  documents: routes.documents,
  reports: routes.reports,
  rate_cards: routes.rateCards,
};

// ============================================================================
// SERVICE WORKSPACE — Grouped tabs (ERG Phase 3)
// ============================================================================

export type ServiceGroupId =
  | 'overview'
  | 'movements'
  | 'operations'
  | 'communication'
  | 'finance'
  | 'history';

export type ServiceSubSection =
  | 'driver'
  | 'driverLink'
  | 'driverReport'
  | 'reconciliation'
  | 'whatsapp'
  | 'rapportino'
  | 'finance';

export const SERVICE_GROUPS: { id: ServiceGroupId; label: string; subSections: ServiceSubSection[] }[] = [
  { id: 'overview', label: 'Overview', subSections: [] },
  { id: 'movements', label: 'Movements', subSections: [] },
  { id: 'operations', label: 'Operations', subSections: ['driver', 'driverLink', 'driverReport', 'reconciliation'] },
  { id: 'communication', label: 'Communication', subSections: ['whatsapp'] },
  { id: 'finance', label: 'Finance', subSections: ['rapportino'] },
  { id: 'history', label: 'History', subSections: [] },
];

// === URL param → Group mapping ===
export const urlParamToGroup: Record<string, ServiceGroupId> = {
  '': 'overview',
  'movements': 'movements',
  'operations': 'operations',
  'communication': 'communication',
  'finance': 'finance',
  'history': 'history',
};

// === Group → URL param ===
export const groupToUrlParam: Record<ServiceGroupId, string> = {
  overview: '',
  movements: 'movements',
  operations: 'operations',
  communication: 'communication',
  finance: 'finance',
  history: 'history',
};

// === Sub-section → URL query param ===
export const subSectionToQueryParam: Record<ServiceSubSection, string> = {
  driver: 'driver',
  driverLink: 'driver-link',
  driverReport: 'report',
  reconciliation: 'reconciliation',
  whatsapp: 'whatsapp',
  rapportino: 'rapportino',
};

// === URL query param → Sub-section ===
export const queryParamToSubSection: Record<string, ServiceSubSection> = {
  'driver': 'driver',
  'driver-link': 'driverLink',
  'report': 'driverReport',
  'reconciliation': 'reconciliation',
  'whatsapp': 'whatsapp',
  'rapportino': 'rapportino',
  'finance': 'finance',
};

// === Legacy flat URL param → new grouped navigation ===
// Backward compatibility for old URLs like /service/:id/driver-link
export const legacyUrlRedirect: Record<string, { group: ServiceGroupId; sub?: ServiceSubSection }> = {
  'driver': { group: 'operations', sub: 'driver' },
  'driver-link': { group: 'operations', sub: 'driverLink' },
  'report': { group: 'operations', sub: 'driverReport' },
  'reconciliation': { group: 'operations', sub: 'reconciliation' },
  'whatsapp': { group: 'communication', sub: 'whatsapp' },
  'rapportino': { group: 'finance', sub: 'rapportino' },
};
