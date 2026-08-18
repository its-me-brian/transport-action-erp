// ============================================================================
// _CONSTANTS.GS — Constants loaded FIRST (alphabetically before domain/)
// ============================================================================

// ID del Google Sheet principal
const DB_SHEET_ID = '1gYAATy3eZWu8rgWUKp80BF43FGimhnnqTaLUY8pROmI';

// Config object (used as CONFIG.DB_SHEET_ID throughout codebase)
const CONFIG = {
  DB_SHEET_ID: DB_SHEET_ID
};

// Nombres de las hojas — ENTIDADES ERD
const SHEETS = {
  Settings: 'Settings',
  Sequence: 'Sequence',
  OperatingCompany: 'OperatingCompany',
  Clients: 'Clients',
  Contacts: 'Contacts',
  Projects: 'Projects',
  TransportLists: 'TransportLists',
  Services: 'Services',
  ServiceRevenueBreakdown: 'ServiceRevenueBreakdown',
  ServiceCostBreakdown: 'ServiceCostBreakdown',
  DriverReports: 'DriverReports',
  Drivers: 'Drivers',
  DriverRates: 'DriverRates',
  DriverAdvances: 'DriverAdvances',
  Collaborators: 'Collaborators',
  SupplierRates: 'SupplierRates',
  Vehicles: 'Vehicles',
  RateCards: 'RateCards',
  RapportinoClients: 'RapportinoClients',
  RapportinoItems: 'RapportinoItems',
  RapportinoDrivers: 'RapportinoDrivers',
  RapportinoCollaborators: 'RapportinoCollaborators',
  RapportinoCollaboratorItems: 'RapportinoCollaboratorItems',
  Invoices: 'Invoices',
  InvoiceItems: 'InvoiceItems',
  Payments: 'Payments',
  Expenses: 'Expenses',
  Changes: 'Changes',
  Documents: 'Documents',
  AuditLog: 'AuditLog',
  ActivityFeed: 'ActivityFeed',
  Users: 'Users',
  Reconciliation: 'Reconciliation',
  // DriverLinks system (not in ERD — infra for driver reporting)
  DriverLinks: 'DriverLinks',
  DriverLinkResponses: 'DriverLinkResponses',
  DriverLinkEvents: 'DriverLinkEvents',
  // Report Inbox — unified capture layer (WhatsApp + DriverLink + Backoffice)
  DriverReportInbox: 'DriverReportInbox',
  // Presence — heartbeat-based active users tracking
  Presence: 'Presence',
};

// Configuración por defecto
const DEFAULTS = {
  IVA: 21,
  Currency: 'EUR',
  TimeZone: 'Europe/Rome',
  ActiveCompany: 'TA',
  InvoicePrefix: 'INV',
  PaymentTerms: 30
};

// Timeout para LockService
const LOCK_TIMEOUT = 5000;

// Formato de IDs
const ID_PAD_LENGTH = 5;
