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

  // === SERVICE ROUTES ===
  service: (id: string) => `/service/${id}`,
  serviceOverview: (id: string) => `/service/${id}`,
  serviceMovements: (id: string) => `/service/${id}/movements`,
  serviceDriver: (id: string) => `/service/${id}/driver`,
  serviceDriverLink: (id: string) => `/service/${id}/driver-link`,
  serviceReport: (id: string) => `/service/${id}/report`,
  serviceWhatsApp: (id: string) => `/service/${id}/whatsapp`,
  serviceReconciliation: (id: string) => `/service/${id}/reconciliation`,
  serviceRapportino: (id: string) => `/service/${id}/rapportino`,
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

// === Service workspace tab IDs ===
export type ServiceTabId =
  | 'overview'
  | 'movements'
  | 'driver'
  | 'driverLink'
  | 'driverReport'
  | 'whatsapp'
  | 'reconciliation'
  | 'rapportino'
  | 'history';

export const tabToRouteParam: Record<ServiceTabId, string> = {
  overview: '',
  movements: 'movements',
  driver: 'driver',
  driverLink: 'driver-link',
  driverReport: 'report',
  whatsapp: 'whatsapp',
  reconciliation: 'reconciliation',
  rapportino: 'rapportino',
  history: 'history',
};

export const routeParamToTab: Record<string, ServiceTabId> = {
  '': 'overview',
  'movements': 'movements',
  'driver': 'driver',
  'driver-link': 'driverLink',
  'report': 'driverReport',
  'whatsapp': 'whatsapp',
  'reconciliation': 'reconciliation',
  'rapportino': 'rapportino',
  'history': 'history',
};
