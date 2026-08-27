// ============================================================================
// ENUMS.GS — Todas las enumeraciones del sistema
// Fuente única de verdad para backend y frontend
// ============================================================================

const ENUMS = {

  // === SERVICE ===
  ServiceOperationalStatus: [
    'Importado',
    'Asignado',
    'Confirmado',
    'EnRuta',
    'Realizado',
    'Reportado',
    'Revision',
    'Validado',
    'Cancelado'
  ],

  ServiceFinancialStatus: [
    'Pendiente',
    'Calculado',
    'Confrontacion',
    'ActualsConfirmados',
    'Aprobado',
    'Facturable',
    'Facturado',
    'Cobrado',
    'Cerrado',
    'CerradoComercial'
  ],

  // === DRIVER REPORT ===
  DriverReportStatus: [
    'Pendiente',
    'Aceptado',
    'Rechazado'
  ],

  // === RAPPORTINO CLIENT ===
  RapportinoClientStatus: [
    'Borrador',
    'Revisado',
    'Enviado',
    'Aceptado',
    'Facturado',
    'Rechazado'
  ],

  // === RAPPORTINO DRIVER ===
  RapportinoDriverStatus: [
    'Borrador',
    'Revisado',
    'Enviado',
    'Aceptado',
    'Pagado',
    'Rechazado'
  ],

  // === INVOICE ===
  InvoiceStatus: [
    'Borrador',
    'Emitida',
    'Enviada',
    'PagoParcial',
    'Pagada',
    'Vencida',
    'Anulada'
  ],

  // === PAYMENT ===
  PaymentStatus: [
    'Registrado',
    'Confirmado',
    'Conciliado',
    'Anulado'
  ],

  PaymentMethod: [
    'transfer',
    'cash',
    'card',
    'check'
  ],

  // === EXPENSE ===
  ExpenseStatus: [
    'Draft',
    'Confirmed',
    'Cancelled'
  ],

  ExpenseOwnerType: [
    'empresa',
    'proyecto',
    'vehiculo',
    'servicio',
    'conductor'
  ],

  // === BREAKDOWN ===
  RevenueBreakdownSource: [
    'rate_card',
    'driver_report',
    'manual',
    'adjustment',
    'imported'
  ],

  CostBreakdownSource: [
    'driver_rate',
    'driver_report',
    'manual',
    'adjustment'
  ],

  // === DRIVER ===
  DriverStatus: [
    'Disponible',
    'Asignado',
    'Inactivo'
  ],

  DriverType: [
    'interno',
    'freelance'
  ],

  // === VEHICLE ===
  VehicleStatus: [
    'Disponible',
    'Asignado',
    'Mantenimiento',
    'Inactivo'
  ],

  VehicleType: [
    'Car',
    'Van',
    'Minibus',
    'Bus'
  ],

  VehicleOwnership: [
    'propio',
    'alquilado',
    'tercero'
  ],

  // === SERVICE TYPE ===
  ServiceType: [
    'Dispo',
    'Transfer Airport',
    'Transfer City',
    'Extra',
    'Shuttle',
    'Other'
  ],

  // === SOURCE TYPE ===
  SourceType: [
    'transport_list',
    'extra',
    'manual',
    'external'
  ],

  // === PROVIDER TYPE ===
  ProviderType: [
    'internal_driver',
    'collaborator',
    'external'
  ],

  // === SUPPLIER TYPE ===
  SupplierType: [
    'internal_driver',
    'collaborator'
  ],

  // === RAPPORTINO PERIOD TYPE ===
  RapportinoPeriodType: [
    'weekly',
    'monthly',
    'custom'
  ],

  // === PROJECT ===
  ProjectStatus: [
    'Nuovo',
    'Preparazione',
    'Attivo',
    'Fatturazione',
    'Incasso',
    'Chiuso',
    'Archiviato'
  ],

  // === CLIENT ===
  ClientType: [
    'production',
    'direct',
    'agency'
  ],

  // === CHANGE ===
  ChangeStatus: [
    'Open',
    'Resolved'
  ],

  ChangeType: [
    'schedule',
    'driver',
    'vehicle',
    'route',
    'other'
  ],

  ChangePriority: [
    'Low',
    'Medium',
    'High',
    'Critical'
  ],

  // === DOCUMENT ===
  DocumentType: [
    'Invoice',
    'CMR',
    'DriverLicense',
    'Insurance',
    'VehiclePhoto',
    'Contract',
    'Rapportino',
    'Other'
  ],

  // === DRIVER ADVANCE ===
  DriverAdvanceStatus: [
    'Pendiente',
    'ParcialmenteDescontado',
    'Descontado'
  ],

  // === RATE CARD ===
  RateCardCategory: [
    'Transfer',
    'Dispo',
    'Airport',
    'City',
    'Night',
    'Holiday'
  ]
};
