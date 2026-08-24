// ============================================================================
// SETUP.GS — Creación de estructura de hojas de Google Sheets
// ============================================================================

// Helper functions for admin password hashing (used during setup only)
function _generateSaltForSetup() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var salt = '';
  for (var i = 0; i < 16; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

function _hashPasswordForSetup(password, salt) {
  var raw = salt + password + salt;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

/**
 * Helper: delete sheet if it exists, then create it fresh.
 * Makes all _setup* functions idempotent.
 */
function _safeInsertSheet(ss, name, tabColor, headers) {
  var existing = ss.getSheetByName(name);
  if (existing) ss.deleteSheet(existing);
  var sh = ss.insertSheet(name);
  sh.setTabColor(tabColor);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground(tabColor).setFontColor('#fff');
  return sh;
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Eliminar todas las hojas existentes
  var existing = ss.getSheets();
  for (var i = existing.length - 1; i >= 1; i--) {
    ss.deleteSheet(existing[i]);
  }
  if (existing[0].getName() !== 'Dashboard') {
    existing[0].setName('Dashboard');
  }
  
  // === ENTIDADES DEL ERD ===
  _setupSettings(ss);
  _setupSequence(ss);
  _setupOperatingCompany(ss);
  _setupClients(ss);
  _setupContacts(ss);
  _setupProjects(ss);
  _setupDrivers(ss);
  _setupVehicles(ss);
  _setupDriverRates(ss);
  _setupDriverAdvances(ss);
  _setupCollaborators(ss);
  _setupSupplierRates(ss);
  _setupRateCards(ss);
  _setupTransportLists(ss);
  _setupServices(ss);
  _setupServiceRevenueBreakdown(ss);
  _setupServiceCostBreakdown(ss);
  _setupDriverReports(ss);
  _setupRapportinoClients(ss);
  _setupRapportinoItems(ss);
  _setupRapportinoDrivers(ss);
  _setupRapportinoCollaborators(ss);
  _setupRapportinoCollaboratorItems(ss);
  _setupInvoices(ss);
  _setupInvoiceItems(ss);
  _setupPayments(ss);
  _setupExpenses(ss);
  _setupChanges(ss);
  _setupDocuments(ss);
  _setupAuditLog(ss);
  _setupActivityFeed(ss);
  
  _setupUsers(ss);
  _setupDriverLinks(ss);
  _setupDriverLinkResponses(ss);
  _setupDriverLinkEvents(ss);
  _setupDriverReportInbox(ss);
  _setupPresence(ss);
  _setupReconciliation(ss);
  
  _setupDashboard(ss.getSheetByName('Dashboard'));
  
  Logger.log('✅ Setup completado — todas las hojas creadas');
}

// ============================================================================
// ENTIDADES ERD
// ============================================================================

function _setupSettings(ss) {
  _safeInsertSheet(ss, 'Settings', '#455A64',
    ['ID', 'Category', 'Key', 'Value', 'Description', 'CreatedAt', 'UpdatedAt']);
}

function _setupSequence(ss) {
  _safeInsertSheet(ss, 'Sequence', '#607D8B',
    ['Entity', 'OperatingCompany', 'Year', 'Next']);
}

function _setupOperatingCompany(ss) {
  _safeInsertSheet(ss, 'OperatingCompany', '#1B5E20',
    ['ID', 'Name', 'VAT', 'Address', 'Phone', 'Email', 'Currency', 'DefaultTaxRate', 'Active', 'CreatedAt', 'UpdatedAt']);
}

function _setupClients(ss) {
  _safeInsertSheet(ss, 'Clients', '#0D47A1',
    ['ID', 'Name', 'Type', 'VAT', 'Address', 'Phone', 'Email', 'PaymentTerms', 'Notes', 'Active', 'CreatedAt', 'UpdatedAt']);
}

function _setupContacts(ss) {
  _safeInsertSheet(ss, 'Contacts', '#1565C0',
    ['ID', 'ClientID', 'Name', 'Role', 'Phone', 'Email', 'WhatsApp', 'Notes', 'Active', 'CreatedAt', 'UpdatedAt']);
}

function _setupProjects(ss) {
  _safeInsertSheet(ss, 'Projects', '#1B5E20',
    ['ID', 'ClientID', 'Name', 'TransportCompany', 'OperatingCompany', 'Coordinator', 'Status', 'DateFrom', 'DateTo', 'Notes', 'CreatedAt', 'UpdatedAt']);
}

function _setupDrivers(ss) {
  var sh = _safeInsertSheet(ss, 'Drivers', '#4CAF50',
    ['ID', 'Name', 'Type', 'DriverOwnership', 'CollaboratorID', 'Phone', 'WhatsApp', 'Email', 'IBAN', 'VehiclePreferred', 'LicenseType', 'LicenseExpiry', 'Status', 'OperatingCompany', 'Notes', 'Source', 'LastImportDate', 'LastUsed', 'TotalRides', 'CreatedAt', 'UpdatedAt']);
  sh.getRange('E:E').setNumberFormat('@');
  sh.getRange('F:F').setNumberFormat('@');
}

function _setupVehicles(ss) {
  _safeInsertSheet(ss, 'Vehicles', '#006064',
    ['ID', 'Plate', 'Brand', 'Model', 'Type', 'Ownership', 'InsuranceExpiry', 'InspectionExpiry', 'Capacity', 'Status', 'DriverDefault', 'OperatingCompany', 'Notes', 'CreatedAt', 'UpdatedAt']);
}

function _setupDriverRates(ss) {
  _safeInsertSheet(ss, 'DriverRates', '#004D40',
    ['ID', 'DriverID', 'VehicleType', 'TransferRate', 'HalfDayRate', 'FullDayRate', 'NightExtra', 'HolidayExtra', 'WaitHourRate', 'Active', 'CreatedAt', 'UpdatedAt']);
}

function _setupDriverAdvances(ss) {
  _safeInsertSheet(ss, 'DriverAdvances', '#B71C1C',
    ['ID', 'DriverID', 'ProjectID', 'ServiceID', 'Amount', 'RemainingAmount', 'Date', 'Status', 'DeductedIn', 'Notes', 'CreatedAt', 'UpdatedAt']);
}

function _setupCollaborators(ss) {
  _safeInsertSheet(ss, 'Collaborators', '#4A148C',
    ['ID', 'Name', 'VAT', 'Address', 'Phone', 'Email', 'PaymentTerms', 'Active', 'Notes', 'OperatingCompany', 'CreatedAt', 'UpdatedAt']);
}

function _setupSupplierRates(ss) {
  _safeInsertSheet(ss, 'SupplierRates', '#7B1FA2',
    ['ID', 'SupplierType', 'SupplierID', 'ProjectID', 'ServiceType', 'VehicleType', 'BaseRate', 'IncludedKm', 'IncludedHours', 'ExtraKmRate', 'ExtraHourRate', 'DiariaPiena', 'DiariaMezza', 'NightExtra', 'HolidayExtra', 'WaitHourRate', 'ValidFrom', 'ValidTo', 'Active', 'OperatingCompany', 'CreatedAt', 'UpdatedAt']);
}

function _setupRateCards(ss) {
  _safeInsertSheet(ss, 'RateCards', '#E65100',
    ['ID', 'Name', 'Category', 'VehicleType', 'ServiceType', 'BasePrice', 'IncludedKm', 'IncludedHours', 'ExtraKmRate', 'ExtraHourRate', 'WaitRate', 'NightFee', 'HolidayFee', 'HalfDayPrice', 'FullDayPrice', 'AirportSurcharge', 'OperatingCompany', 'Active', 'Notes', 'ClientID', 'ProjectID', 'ValidFrom', 'ValidTo', 'CreatedAt', 'UpdatedAt']);
}

function _setupTransportLists(ss) {
  _safeInsertSheet(ss, 'TransportLists', '#2196F3',
    ['ID', 'ProjectID', 'FileName', 'ImportDate', 'Production', 'ProjectName', 'TransportCompany', 'TotalServices', 'ImportedBy', 'Notes', 'FileURL', 'CreatedAt']);
}

function _setupServices(ss) {
  _safeInsertSheet(ss, 'Services', '#FF6F00',
    ['ID', 'ProjectID', 'TransportListID', 'Date', 'Time', 'Production', 'Section', 'PassengerName', 'PassengerRole', 'PassengerPhone', 'PassengerDepartment', 'PickupLines', 'DropoffLines', 'FlightInfo', 'Notes', 'DriverID', 'VehicleID', 'OperationalStatus', 'FinancialStatus', 'EstimatedRevenue', 'EstimatedCost', 'OperatingCompany', 'Normalized', 'CreatedAt', 'UpdatedAt', 'StartTime', 'EndTime', 'KmTotal', 'HasDiaria', 'IsFestivo', 'IsNotturno', 'DiariaType', 'ProviderType', 'ProviderID', 'ServiceType', 'SourceType', 'SourceReference', 'VehicleType', 'PickupMapsUrl', 'DropoffMapsUrl', 'OriginalTransportDate', 'PassengersList', 'Movements', 'ServiceTypeConfirmed', 'IsWalking']);
}

function _setupServiceRevenueBreakdown(ss) {
  _safeInsertSheet(ss, 'ServiceRevenueBreakdown', '#1B5E20',
    ['ID', 'ServiceID', 'ItemType', 'Description', 'Quantity', 'UnitPrice', 'Total', 'RateCardID', 'Source', 'ReferenceLineID', 'Locked', 'CreatedAt']);
}

function _setupServiceCostBreakdown(ss) {
  _safeInsertSheet(ss, 'ServiceCostBreakdown', '#B71C1C',
    ['ID', 'ServiceID', 'ItemType', 'Description', 'Amount', 'DriverID', 'Source', 'ReferenceLineID', 'Locked', 'CreatedAt']);
}

function _setupDriverReports(ss) {
  _safeInsertSheet(ss, 'DriverReports', '#FF8F00',
    ['ID', 'ServiceID', 'DriverID', 'Version', 'PreviousReportID', 'StartTime', 'EndTime', 'KmTotal', 'HasDiaria', 'IsFestivo', 'IsNotturno', 'DiariaType', 'KmExtra', 'HoursExtra', 'Parking', 'Tolls', 'Fuel', 'WaitMinutes', 'Notes', 'Status', 'ApprovedBy', 'ApprovedDate', 'RejectedReason', 'Locked', 'SubmittedAt', 'CreatedAt']);
}

function _setupRapportinoClients(ss) {
  _safeInsertSheet(ss, 'RapportinoClients', '#4A148C',
    ['ID', 'ProjectID', 'ClientID', 'PeriodType', 'PeriodStart', 'PeriodEnd', 'WeekStart', 'WeekEnd', 'Status', 'Notes', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'SentAt', 'AcceptedAt', 'RejectedAt', 'RejectedReason']);
}

function _setupRapportinoItems(ss) {
  _safeInsertSheet(ss, 'RapportinoItems', '#6A1B9A',
    ['ID', 'RapportinoClientID', 'ServiceID', 'Amount', 'LockedAmount', 'CreatedAt']);
}

function _setupRapportinoDrivers(ss) {
  _safeInsertSheet(ss, 'RapportinoDrivers', '#7B1FA2',
    ['ID', 'ProjectID', 'DriverID', 'PeriodType', 'PeriodStart', 'PeriodEnd', 'WeekStart', 'WeekEnd', 'Status', 'Notes', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'SentAt', 'PaidAt', 'RejectedAt', 'RejectedReason']);
}

function _setupRapportinoCollaborators(ss) {
  _safeInsertSheet(ss, 'RapportinoCollaborators', '#6A1B9A',
    ['ID', 'ProjectID', 'CollaboratorID', 'PeriodType', 'PeriodStart', 'PeriodEnd', 'Status', 'Notes', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'SentAt', 'AcceptedAt', 'PaidAt']);
}

function _setupRapportinoCollaboratorItems(ss) {
  _safeInsertSheet(ss, 'RapportinoCollaboratorItems', '#8E24AA',
    ['ID', 'RapportinoCollaboratorID', 'ServiceID', 'DriverID', 'Amount', 'LockedAmount', 'CreatedAt']);
}

function _setupInvoices(ss) {
  _safeInsertSheet(ss, 'Invoices', '#006064',
    ['ID', 'InvoiceNumber', 'ProjectID', 'ClientID', 'Date', 'DueDate', 'Subtotal', 'TaxRate', 'TaxAmount', 'Total', 'Currency', 'Status', 'Notes', 'VoidReason', 'CreatedBy', 'CreatedAt', 'UpdatedAt']);
}

function _setupInvoiceItems(ss) {
  _safeInsertSheet(ss, 'InvoiceItems', '#00838F',
    ['ID', 'InvoiceID', 'RapportinoClientID', 'ServiceID', 'Amount', 'CreatedAt']);
}

function _setupPayments(ss) {
  _safeInsertSheet(ss, 'Payments', '#00695C',
    ['ID', 'InvoiceID', 'ClientID', 'Amount', 'PaymentMethod', 'PaymentDate', 'Reference', 'Notes', 'Status', 'CreatedBy', 'CreatedAt', 'ConfirmedAt', 'ReconciledAt', 'VoidedAt', 'VoidReason', 'CashReceivedBy', 'CashDate', 'CashReference']);
}

function _setupExpenses(ss) {
  _safeInsertSheet(ss, 'Expenses', '#880E4F',
    ['ID', 'OwnerType', 'OwnerID', 'Category', 'Description', 'Amount', 'ExpenseDate', 'AccountingDate', 'Status', 'ProjectID', 'OperatingCompany', 'CreatedBy', 'Notes', 'CreatedAt', 'UpdatedAt']);
}

function _setupChanges(ss) {
  _safeInsertSheet(ss, 'Changes', '#E65100',
    ['ID', 'EntityType', 'EntityID', 'Type', 'Description', 'Priority', 'DueDate', 'Status', 'CreatedBy', 'CreatedAt', 'ResolvedAt', 'ResolvedBy', 'Notes', 'UpdatedAt']);
}

function _setupDocuments(ss) {
  _safeInsertSheet(ss, 'Documents', '#455A64',
    ['ID', 'EntityType', 'EntityID', 'DocumentType', 'Filename', 'URL', 'FileSize', 'MimeType', 'UploadedBy', 'CreatedAt']);
}

function _setupAuditLog(ss) {
  _safeInsertSheet(ss, 'AuditLog', '#D32F2F',
    ['ID', 'Timestamp', 'EntityType', 'EntityID', 'Action', 'Field', 'OldValue', 'NewValue', 'User', 'Source', 'Channel', 'CorrelationID']);
}

function _setupActivityFeed(ss) {
  _safeInsertSheet(ss, 'ActivityFeed', '#C62828',
    ['ID', 'Timestamp', 'EventType', 'EntityType', 'EntityID', 'Description', 'User', 'Metadata']);
}

function _setupReconciliation(ss) {
  _safeInsertSheet(ss, 'Reconciliation', '#880E4F',
    ['ID', 'ServiceID', 'ProjectID', 'ProductionStartTime', 'ProductionEndTime', 'ProductionKm', 'ProductionDiaria', 'ProductionFestivo', 'ProductionNotturno', 'DriverStartTime', 'DriverEndTime', 'DriverKm', 'DriverDiaria', 'DriverFestivo', 'DriverNotturno', 'FinalStartTime', 'FinalEndTime', 'FinalKm', 'FinalDiaria', 'FinalFestivo', 'FinalNotturno', 'Status', 'ResolvedBy', 'ResolvedAt', 'ResolutionNotes', 'CreatedAt', 'UpdatedAt']);
}

function _setupUsers(ss) {
  _safeInsertSheet(ss, 'Users', '#1565C0',
    ['ID', 'Username', 'PasswordHash', 'Salt', 'DisplayName', 'Email', 'Role', 'Status', 'LastLogin', 'CreatedAt', 'UpdatedAt']);
}

function _setupDriverLinks(ss) {
  _safeInsertSheet(ss, 'DriverLinks', '#00796B',
    ['Token', 'DriverID', 'ProjectID', 'DateFrom', 'DateTo', 'Status', 'FieldsSchema', 'CreatedAt', 'ExpiresAt']);
}

function _setupDriverLinkResponses(ss) {
  _safeInsertSheet(ss, 'DriverLinkResponses', '#00695C',
    ['ID', 'Token', 'DriverID', 'ProjectID', 'ServiceID', 'DataServizio', 'TipoServizio', 'OrarioInizio', 'OrarioFine', 'Descrizione', 'Clienti', 'Targa', 'KmTotali', 'Diaria', 'Note', 'SubmittedAt']);
}

function _setupDriverLinkEvents(ss) {
  _safeInsertSheet(ss, 'DriverLinkEvents', '#004D40',
    ['ID', 'Token', 'EventType', 'Metadata', 'CreatedAt']);
}

function _setupDriverReportInbox(ss) {
  // Aligned with migration 001: includes ServiceID column
  _safeInsertSheet(ss, 'DriverReportInbox', '#BF360C',
    ['ID', 'Source', 'Channel', 'DriverID', 'DriverName', 'ServiceDate', 'StartTime', 'EndTime', 'KmTotal', 'KmExtra', 'HoursExtra', 'Diaria', 'IsFestivo', 'IsNotturno', 'Parking', 'Tolls', 'Fuel', 'Notes', 'Status', 'NormalizedData', 'ServiceID', 'CorrelationID', 'ReviewedBy', 'ReviewedAt', 'RejectionReason', 'CreatedAt', 'UpdatedAt']);
}

function _setupPresence(ss) {
  _safeInsertSheet(ss, 'Presence', '#37474F',
    ['UserID', 'SessionID', 'DisplayName', 'Role', 'LastSeen', 'UserAgent', 'IPAddress', 'IsActive']);
}

function _setupDashboard(sh) {
  sh.setTabColor('#D32F2F');
  sh.getRange('A1').setValue('TRANSPORT ACTION — ERP').setFontWeight('bold').setFontSize(18).setBackground('#B71C1C').setFontColor('#fff');
}

// ============================================================================
// MENU
// ============================================================================
