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
  var sh = ss.insertSheet('Settings');
  sh.setTabColor('#455A64');
  var h = ['ID', 'Category', 'Key', 'Value', 'Description', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#455A64').setFontColor('#fff');
}

function _setupSequence(ss) {
  var sh = ss.insertSheet('Sequence');
  sh.setTabColor('#607D8B');
  var h = ['Entity', 'OperatingCompany', 'Year', 'Next'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#607D8B').setFontColor('#fff');
}

function _setupOperatingCompany(ss) {
  var sh = ss.insertSheet('OperatingCompany');
  sh.setTabColor('#1B5E20');
  var h = ['ID', 'Name', 'VAT', 'Address', 'Phone', 'Email', 'Currency', 'DefaultTaxRate', 'Active', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#1B5E20').setFontColor('#fff');
}

function _setupClients(ss) {
  var sh = ss.insertSheet('Clients');
  sh.setTabColor('#0D47A1');
  var h = ['ID', 'Name', 'Type', 'VAT', 'Address', 'Phone', 'Email', 'PaymentTerms', 'Notes', 'Active', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#0D47A1').setFontColor('#fff');
}

function _setupContacts(ss) {
  var sh = ss.insertSheet('Contacts');
  sh.setTabColor('#1565C0');
  var h = ['ID', 'ClientID', 'Name', 'Role', 'Phone', 'Email', 'WhatsApp', 'Notes', 'Active', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#1565C0').setFontColor('#fff');
}

function _setupProjects(ss) {
  var sh = ss.insertSheet('Projects');
  sh.setTabColor('#1B5E20');
  var h = ['ID', 'ClientID', 'Name', 'TransportCompany', 'OperatingCompany', 'Coordinator', 'Status', 'DateFrom', 'DateTo', 'Notes', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#1B5E20').setFontColor('#fff');
}

function _setupDrivers(ss) {
  var sh = ss.insertSheet('Drivers');
  sh.setTabColor('#4CAF50');
  var h = ['ID', 'Name', 'Type', 'CollaboratorID', 'Phone', 'WhatsApp', 'Email', 'IBAN', 'VehiclePreferred', 'LicenseType', 'LicenseExpiry', 'Status', 'OperatingCompany', 'Notes', 'Source', 'LastUsed', 'TotalRides', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#2E7D32').setFontColor('#fff');
  sh.getRange('E:E').setNumberFormat('@');
  sh.getRange('F:F').setNumberFormat('@');
}

function _setupVehicles(ss) {
  var sh = ss.insertSheet('Vehicles');
  sh.setTabColor('#006064');
  var h = ['ID', 'Plate', 'Brand', 'Model', 'Type', 'Ownership', 'InsuranceExpiry', 'InspectionExpiry', 'Capacity', 'Status', 'DriverDefault', 'OperatingCompany', 'Notes', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#006064').setFontColor('#fff');
}

function _setupDriverRates(ss) {
  var sh = ss.insertSheet('DriverRates');
  sh.setTabColor('#004D40');
  var h = ['ID', 'DriverID', 'VehicleType', 'TransferRate', 'HalfDayRate', 'FullDayRate', 'NightExtra', 'HolidayExtra', 'WaitHourRate', 'Active', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#004D40').setFontColor('#fff');
}

function _setupDriverAdvances(ss) {
  var sh = ss.insertSheet('DriverAdvances');
  sh.setTabColor('#B71C1C');
  var h = ['ID', 'DriverID', 'ProjectID', 'Amount', 'RemainingAmount', 'Date', 'Status', 'DeductedIn', 'Notes', 'CreatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#B71C1C').setFontColor('#fff');
}

function _setupCollaborators(ss) {
  var sh = ss.insertSheet('Collaborators');
  sh.setTabColor('#4A148C');
  var h = ['ID', 'Name', 'VAT', 'Address', 'Phone', 'Email', 'PaymentTerms', 'Active', 'Notes', 'OperatingCompany', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#4A148C').setFontColor('#fff');
}

function _setupSupplierRates(ss) {
  var sh = ss.insertSheet('SupplierRates');
  sh.setTabColor('#7B1FA2');
  var h = ['ID', 'SupplierType', 'SupplierID', 'ProjectID', 'ServiceType', 'VehicleType', 'BaseRate', 'IncludedKm', 'IncludedHours', 'ExtraKmRate', 'ExtraHourRate', 'DiariaPiena', 'DiariaMezza', 'NightExtra', 'HolidayExtra', 'WaitHourRate', 'ValidFrom', 'ValidTo', 'Active', 'OperatingCompany', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#7B1FA2').setFontColor('#fff');
}

function _setupRateCards(ss) {
  var sh = ss.insertSheet('RateCards');
  sh.setTabColor('#E65100');
  var h = ['ID', 'Name', 'Category', 'VehicleType', 'ServiceType', 'BasePrice', 'IncludedKm', 'IncludedHours', 'ExtraKmRate', 'ExtraHourRate', 'WaitRate', 'NightFee', 'HolidayFee', 'HalfDayPrice', 'FullDayPrice', 'AirportSurcharge', 'OperatingCompany', 'Active', 'Notes', 'ClientID', 'ProjectID', 'ValidFrom', 'ValidTo', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#E65100').setFontColor('#fff');
}

function _setupTransportLists(ss) {
  var sh = ss.insertSheet('TransportLists');
  sh.setTabColor('#2196F3');
  var h = ['ID', 'ProjectID', 'FileName', 'ImportDate', 'Production', 'ProjectName', 'TransportCompany', 'TotalServices', 'ImportedBy', 'Notes', 'CreatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#1565C0').setFontColor('#fff');
}

function _setupServices(ss) {
  var sh = ss.insertSheet('Services');
  sh.setTabColor('#FF6F00');
  // Extended columns: StartTime, EndTime, KmTotal, HasDiaria, IsFestivo, IsNotturno, DiariaType
  // New fields: ProviderType, ProviderID, ServiceType, SourceType, SourceReference, VehicleType
  var h = ['ID', 'ProjectID', 'TransportListID', 'Date', 'Time', 'Production', 'Section', 'PassengerName', 'PassengerRole', 'PassengerPhone', 'PassengerDepartment', 'PickupLines', 'DropoffLines', 'FlightInfo', 'Notes', 'DriverID', 'VehicleID', 'OperationalStatus', 'FinancialStatus', 'EstimatedRevenue', 'EstimatedCost', 'OperatingCompany', 'Normalized', 'CreatedAt', 'UpdatedAt', 'StartTime', 'EndTime', 'KmTotal', 'HasDiaria', 'IsFestivo', 'IsNotturno', 'DiariaType', 'ProviderType', 'ProviderID', 'ServiceType', 'SourceType', 'SourceReference', 'VehicleType'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#E65100').setFontColor('#fff');
}

function _setupServiceRevenueBreakdown(ss) {
  var sh = ss.insertSheet('ServiceRevenueBreakdown');
  sh.setTabColor('#1B5E20');
  var h = ['ID', 'ServiceID', 'ItemType', 'Description', 'Quantity', 'UnitPrice', 'Total', 'RateCardID', 'Source', 'ReferenceLineID', 'Locked', 'CreatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#1B5E20').setFontColor('#fff');
}

function _setupServiceCostBreakdown(ss) {
  var sh = ss.insertSheet('ServiceCostBreakdown');
  sh.setTabColor('#B71C1C');
  var h = ['ID', 'ServiceID', 'ItemType', 'Description', 'Amount', 'DriverID', 'Source', 'ReferenceLineID', 'Locked', 'CreatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#B71C1C').setFontColor('#fff');
}

function _setupDriverReports(ss) {
  var sh = ss.insertSheet('DriverReports');
  sh.setTabColor('#FF8F00');
  var h = ['ID', 'ServiceID', 'DriverID', 'Version', 'PreviousReportID', 'StartTime', 'EndTime', 'KmTotal', 'HasDiaria', 'IsFestivo', 'IsNotturno', 'DiariaType', 'KmExtra', 'HoursExtra', 'Parking', 'Tolls', 'Fuel', 'WaitMinutes', 'Notes', 'Status', 'ApprovedBy', 'ApprovedDate', 'RejectedReason', 'Locked', 'SubmittedAt', 'CreatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#FF8F00').setFontColor('#fff');
}

function _setupRapportinoClients(ss) {
  var sh = ss.insertSheet('RapportinoClients');
  sh.setTabColor('#4A148C');
  var h = ['ID', 'ProjectID', 'ClientID', 'PeriodType', 'PeriodStart', 'PeriodEnd', 'WeekStart', 'WeekEnd', 'Status', 'Notes', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'SentAt', 'AcceptedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#4A148C').setFontColor('#fff');
}

function _setupRapportinoItems(ss) {
  var sh = ss.insertSheet('RapportinoItems');
  sh.setTabColor('#6A1B9A');
  var h = ['ID', 'RapportinoClientID', 'ServiceID', 'Amount', 'LockedAmount', 'CreatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#6A1B9A').setFontColor('#fff');
}

function _setupRapportinoDrivers(ss) {
  var sh = ss.insertSheet('RapportinoDrivers');
  sh.setTabColor('#7B1FA2');
  var h = ['ID', 'ProjectID', 'DriverID', 'PeriodType', 'PeriodStart', 'PeriodEnd', 'WeekStart', 'WeekEnd', 'Status', 'Notes', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'SentAt', 'PaidAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#7B1FA2').setFontColor('#fff');
}

function _setupRapportinoCollaborators(ss) {
  var sh = ss.insertSheet('RapportinoCollaborators');
  sh.setTabColor('#6A1B9A');
  var h = ['ID', 'ProjectID', 'CollaboratorID', 'PeriodType', 'PeriodStart', 'PeriodEnd', 'Status', 'Notes', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'SentAt', 'AcceptedAt', 'PaidAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#6A1B9A').setFontColor('#fff');
}

function _setupRapportinoCollaboratorItems(ss) {
  var sh = ss.insertSheet('RapportinoCollaboratorItems');
  sh.setTabColor('#8E24AA');
  var h = ['ID', 'RapportinoCollaboratorID', 'ServiceID', 'DriverID', 'Amount', 'LockedAmount', 'CreatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#8E24AA').setFontColor('#fff');
}

function _setupInvoices(ss) {
  var sh = ss.insertSheet('Invoices');
  sh.setTabColor('#006064');
  var h = ['ID', 'InvoiceNumber', 'ProjectID', 'ClientID', 'Date', 'DueDate', 'Subtotal', 'TaxRate', 'TaxAmount', 'Total', 'Currency', 'Status', 'Notes', 'VoidReason', 'CreatedBy', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#006064').setFontColor('#fff');
}

function _setupInvoiceItems(ss) {
  var sh = ss.insertSheet('InvoiceItems');
  sh.setTabColor('#00838F');
  var h = ['ID', 'InvoiceID', 'RapportinoClientID', 'ServiceID', 'Amount', 'CreatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#00838F').setFontColor('#fff');
}

function _setupPayments(ss) {
  var sh = ss.insertSheet('Payments');
  sh.setTabColor('#00695C');
  var h = ['ID', 'InvoiceID', 'ClientID', 'Amount', 'PaymentMethod', 'PaymentDate', 'Reference', 'Notes', 'Status', 'CreatedBy', 'CreatedAt', 'ConfirmedAt', 'ReconciledAt', 'CashReceivedBy', 'CashDate', 'CashReference'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#00695C').setFontColor('#fff');
}

function _setupExpenses(ss) {
  var sh = ss.insertSheet('Expenses');
  sh.setTabColor('#880E4F');
  var h = ['ID', 'OwnerType', 'OwnerID', 'Category', 'Description', 'Amount', 'ExpenseDate', 'AccountingDate', 'Status', 'ProjectID', 'OperatingCompany', 'CreatedBy', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#880E4F').setFontColor('#fff');
}

function _setupChanges(ss) {
  var sh = ss.insertSheet('Changes');
  sh.setTabColor('#E65100');
  var h = ['ID', 'EntityType', 'EntityID', 'Type', 'Description', 'Priority', 'DueDate', 'Status', 'CreatedBy', 'CreatedAt', 'ResolvedAt', 'ResolvedBy', 'Notes', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#E65100').setFontColor('#fff');
}

function _setupDocuments(ss) {
  var sh = ss.insertSheet('Documents');
  sh.setTabColor('#455A64');
  var h = ['ID', 'EntityType', 'EntityID', 'DocumentType', 'Filename', 'URL', 'FileSize', 'MimeType', 'UploadedBy', 'CreatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#455A64').setFontColor('#fff');
}

function _setupAuditLog(ss) {
  var sh = ss.insertSheet('AuditLog');
  sh.setTabColor('#D32F2F');
  var h = ['ID', 'Timestamp', 'EntityType', 'EntityID', 'Action', 'Field', 'OldValue', 'NewValue', 'User', 'Source', 'Channel', 'CorrelationID'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#B71C1C').setFontColor('#fff');
}

function _setupActivityFeed(ss) {
  var sh = ss.insertSheet('ActivityFeed');
  sh.setTabColor('#C62828');
  var h = ['ID', 'Timestamp', 'EventType', 'EntityType', 'EntityID', 'Description', 'User', 'Metadata'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#C62828').setFontColor('#fff');
}

function _setupReconciliation(ss) {
  var sh = ss.insertSheet('Reconciliation');
  sh.setTabColor('#880E4F');
  var h = ['ID', 'ServiceID', 'ProjectID', 'ProductionStartTime', 'ProductionEndTime', 'ProductionKm', 'ProductionDiaria', 'ProductionFestivo', 'ProductionNotturno', 'DriverStartTime', 'DriverEndTime', 'DriverKm', 'DriverDiaria', 'DriverFestivo', 'DriverNotturno', 'FinalStartTime', 'FinalEndTime', 'FinalKm', 'FinalDiaria', 'FinalFestivo', 'FinalNotturno', 'Status', 'ResolvedBy', 'ResolvedAt', 'ResolutionNotes', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#880E4F').setFontColor('#fff');
}

function _setupUsers(ss) {
  var sh = ss.insertSheet('Users');
  sh.setTabColor('#1565C0');
  var h = ['ID', 'Username', 'PasswordHash', 'Salt', 'DisplayName', 'Email', 'Role', 'Status', 'LastLogin', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#1565C0').setFontColor('#fff');
}

function _setupDriverLinks(ss) {
  var sh = ss.insertSheet('DriverLinks');
  sh.setTabColor('#00796B');
  var h = ['Token', 'DriverID', 'ProjectID', 'DateFrom', 'DateTo', 'Status', 'FieldsSchema', 'CreatedAt', 'ExpiresAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#00796B').setFontColor('#fff');
}

function _setupDriverLinkResponses(ss) {
  var sh = ss.insertSheet('DriverLinkResponses');
  sh.setTabColor('#00695C');
  var h = ['ID', 'Token', 'DriverID', 'ProjectID', 'DataServizio', 'TipoServizio', 'OrarioInizio', 'OrarioFine', 'Descrizione', 'Clienti', 'Targa', 'KmTotali', 'Diaria', 'Note', 'SubmittedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#00695C').setFontColor('#fff');
}

function _setupDriverLinkEvents(ss) {
  var sh = ss.insertSheet('DriverLinkEvents');
  sh.setTabColor('#004D40');
  var h = ['ID', 'Token', 'EventType', 'Metadata', 'CreatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#004D40').setFontColor('#fff');
}

function _setupDriverReportInbox(ss) {
  var sh = ss.insertSheet('DriverReportInbox');
  sh.setTabColor('#BF360C');
  var h = ['ID', 'Source', 'Channel', 'DriverID', 'DriverName', 'ServiceDate', 'StartTime', 'EndTime', 'KmTotal', 'KmExtra', 'HoursExtra', 'Diaria', 'IsFestivo', 'IsNotturno', 'Parking', 'Tolls', 'Fuel', 'Notes', 'Status', 'NormalizedData', 'ServiceID', 'CorrelationID', 'ReviewedBy', 'ReviewedAt', 'RejectionReason', 'CreatedAt', 'UpdatedAt'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#BF360C').setFontColor('#fff');
}

function _setupPresence(ss) {
  var sh = ss.insertSheet('Presence');
  sh.setTabColor('#37474F');
  var h = ['UserID', 'SessionID', 'DisplayName', 'Role', 'LastSeen', 'UserAgent', 'IPAddress', 'IsActive'];
  sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#37474F').setFontColor('#fff');
}

function _setupDashboard(sh) {
  sh.setTabColor('#D32F2F');
  sh.getRange('A1').setValue('TRANSPORT ACTION — ERP').setFontWeight('bold').setFontSize(18).setBackground('#B71C1C').setFontColor('#fff');
}

// ============================================================================
// MENU
// ============================================================================


