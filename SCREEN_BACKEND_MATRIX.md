# SCREEN × BACKEND MATRIX — Transport Action ERP

Generated: 2026-08-24

## Table 1: SCREEN → BACKEND MAPPING

| Screen | File | Lines | Backend Endpoints Used | Service-Scoped? | Gaps |
|--------|------|-------|------------------------|-----------------|------|
| ExecutiveDashboardScreen | ExecutiveDashboardScreen.tsx | ~800 | getMainDashboard, getServices, getProfitByCompany | No | None |
| DashboardScreen (Calendar) | DashboardScreen.tsx | 2660 | getServices, getService, assignDriver, confirmService, startService, completeService, reportService, validateService, getDriverReports, getDriverLinks, getInboxItems, getReconciliations, parseWhatsApp, buildDriverWhatsAppMessage | Partial (SidePanel loads related data) | getDriverLinks doesn't pass serviceId, getInboxItems doesn't filter by serviceId |
| TransportListScreen | TransportListScreen.tsx | 3370 | getServices, updateServiceField, deleteService, cancelService, getTransportLists, buildDriverWhatsAppMessage, buildGroupWhatsAppMessage | No | None |
| DriverReportsScreen | DriverReportsScreen.tsx | ~400 | getDriverReports, getInboxItems, getDriverLinks | Partial (tabs) | None |
| DriverLinksScreen | DriverLinksScreen.tsx | ~600 | getDriverLinks, generateDriverLink, deactivateDriverLink, updateDriverLink | Partial | None |
| RapportinoScreen | RapportinoScreen.tsx | 1184 | getRapportinoClients, createRapportinoClient, addServiceToRapportino, removeServiceFromRapportino, reviewRapportinoClient, sendRapportinoClient, acceptRapportinoClient, rejectRapportinoClient, facturarRapportino, getServices, getProjects, getClients | No | getRapportinoByService doesn't exist |
| ReconciliationScreen | ReconciliationScreen.tsx | ~800 | getReconciliations, getReconciliationByService, createOrUpdateReconciliation, resolveReconciliation, autoResolveReconciliation | Partial | None |
| AccountingScreen | AccountingScreen.tsx | ~500 | getInvoices, createInvoice, editInvoice, emitInvoice, sendInvoice, voidInvoice, getPayments, registerPayment | No | None |
| FinancialDashboard | FinancialDashboard.tsx | ~600 | getMainDashboard, getProfitByCompany, getProfitByProject, getCashFlow | No | None |
| ClientScreen | ClientScreen.tsx | ~400 | getClients, createClient, updateClient, deleteClient, getContacts | No | None |
| CollaboratorScreen | CollaboratorScreen.tsx | ~500 | getCollaborators, createCollaborator, updateCollaborator, deleteCollaborator, getDrivers | No | None |
| DriverPanelScreen | DriverPanelScreen.tsx | 1035 | getDrivers, createDriver, updateDriver, deleteDriver, getDriverRates | No | None |
| VehicleScreen | VehicleScreen.tsx | ~400 | getVehicles, createVehicle, updateVehicle, deleteVehicle | No | None |
| ProjectScreen | ProjectScreen.tsx | ~500 | getProjects, createProject, updateProject, deleteProject, archiveProject | No | None |
| UserManagementScreen | UserManagementScreen.tsx | ~600 | getUsers, createUser, updateUser, deleteUser, approveUser, rejectUser, updateUserRole | No | None |
| ActiveUsersScreen | ActiveUsersScreen.tsx | ~300 | getActiveUsers, heartbeat | No | None |
| AuditCenterScreen | AuditCenterScreen.tsx | ~400 | getAuditLog, getActivityFeed | No | None |
| CompanySettingsScreen | CompanySettingsScreen.tsx | 1166 | getSettings, saveSettings, getVehicleTypes, saveVehicleTypes, getServiceTypes, saveServiceTypes, getOperatingCompanies, updateOperatingCompany | No | None |
| NewServiceScreen | NewServiceScreen.tsx | ~400 | createService, autoDetectImportTargets, getProjects, getClients, getDrivers | No | None |
| ReportsScreen | ReportsScreen.tsx | 1212 | getServiceSummaryByProject, getServiceSummaryByDriver, getPendingValidation, getPendingInvoicing, getProfitByProject, getProfitByDriver, getEstimatedVsActual | No | None |
| RateCardScreen | RateCardScreen.tsx | ~400 | getRateCards, createRateCard, updateRateCard, deleteRateCard, getClients | No | None |
| DocumentScreen | DocumentScreen.tsx | ~300 | getDocuments, createDocument, deleteDocument | No | None |
| WhatsAppCaptureScreen | WhatsAppCaptureScreen.tsx | ~400 | parseWhatsApp, captureWhatsAppReports, getServices | Partial | None |
| HistoryScreen | HistoryScreen.tsx | ~100 | (wrapper for Reports + Submissions) | No | None |

## Table 2: BACKEND ENDPOINT COVERAGE

| Backend Endpoint | Frontend Function | Used By Screens | Service-Scoped? |
|------------------|-------------------|-----------------|-----------------|
| getServices | getServices | DashboardScreen, TransportListScreen, NewServiceScreen, WhatsAppCaptureScreen | Yes (driver filter) |
| getService | getService | DashboardScreen | No |
| createService | createService | NewServiceScreen | No |
| assignDriver | assignDriver | DashboardScreen | Yes |
| confirmService | confirmService | DashboardScreen | Yes |
| startService | startService | DashboardScreen | Yes |
| completeService | completeService | DashboardScreen | Yes |
| reportService | reportService | DashboardScreen | Yes |
| validateService | validateService | DashboardScreen | Yes |
| updateServiceField | updateServiceField | TransportListScreen | Yes |
| deleteService | deleteService | TransportListScreen | Yes |
| cancelService | cancelService | TransportListScreen | Yes |
| facturarService | facturarService | (not used in frontend) | Yes |
| cobrarService | cobrarService | (not used in frontend) | Yes |
| closeService | closeService | (not used in frontend) | Yes |
| confirmActuals | confirmActuals | (not used in frontend) | Yes |
| approveFinancial | approveFinancial | (not used in frontend) | Yes |
| markFacturable | markFacturable | (not used in frontend) | Yes |
| calculateService | calculateService | (not used in frontend) | Yes |
| moveToConfrontacion | moveToConfrontacion | (not used in frontend) | Yes |
| moveToRevision | moveToRevision | (not used in frontend) | Yes |
| getDriverReports | getDriverReports | DashboardScreen, DriverReportsScreen | Yes (frontend doesn't pass serviceId) |
| getDriverReport | getDriverReport | (not used directly) | No |
| getActiveDriverReport | getActiveDriverReport | (not used in frontend) | Yes |
| submitDriverReport | submitDriverReport | (driver form) | Yes |
| approveDriverReport | approveDriverReport | (not used in frontend) | No |
| rejectDriverReport | rejectDriverReport | (not used in frontend) | No |
| linkReportToService | linkReportToService | (not used in frontend) | Yes |
| getDriverLinks | getDriverLinks | DashboardScreen, DriverLinksScreen | Yes (frontend doesn't pass serviceId) |
| generateDriverLink | generateDriverLink | DriverLinksScreen | No |
| deactivateDriverLink | deactivateDriverLink | DriverLinksScreen | No |
| updateDriverLink | updateDriverLink | DriverLinksScreen | No |
| getInboxItems | getInboxItems | DashboardScreen, DriverReportsScreen | No (no serviceId filter) |
| getInboxItem | getInboxItem | (not used in frontend) | No |
| captureReport | captureReport | (not used in frontend) | No |
| normalizeReport | normalizeReport | (not used in frontend) | No |
| submitToReview | submitToReview | (not used in frontend) | No |
| acceptReport | acceptReport | (not used in frontend) | No |
| rejectReport | rejectReport | (not used in frontend) | No |
| lockReport | lockReport | (not used in frontend) | No |
| getReconciliations | getReconciliations | DashboardScreen, ReconciliationScreen | Yes |
| getReconciliation | getReconciliation | (not used directly) | No |
| getReconciliationByService | getReconciliationByService | (not used in frontend) | Yes |
| getPendingReconciliations | getPendingReconciliations | (not used in frontend) | No |
| createOrUpdateReconciliation | createOrUpdateReconciliation | ReconciliationScreen | Yes |
| resolveReconciliation | resolveReconciliation | ReconciliationScreen | No |
| autoResolveReconciliation | autoResolveReconciliation | ReconciliationScreen | Yes |
| getRapportinoClients | getRapportinoClients | RapportinoScreen | No |
| createRapportinoClient | createRapportinoClient | RapportinoScreen | No |
| addServiceToRapportino | addServiceToRapportino | RapportinoScreen | Yes |
| removeServiceFromRapportino | removeServiceFromRapportino | RapportinoScreen | Yes |
| reviewRapportinoClient | reviewRapportinoClient | RapportinoScreen | No |
| sendRapportinoClient | sendRapportinoClient | RapportinoScreen | No |
| acceptRapportinoClient | acceptRapportinoClient | RapportinoScreen | No |
| rejectRapportinoClient | rejectRapportinoClient | RapportinoScreen | No |
| facturarRapportino | facturarRapportino | RapportinoScreen | No |
| getRapportinoDrivers | getRapportinoDrivers | (not used in frontend) | No |
| createRapportinoDriver | createRapportinoDriver | (not used in frontend) | No |
| parseWhatsApp | parseWhatsApp | DashboardScreen, WhatsAppCaptureScreen | No |
| captureWhatsAppReports | captureWhatsAppReports | WhatsAppCaptureScreen | No |
| buildDriverWhatsAppMessage | buildDriverWhatsAppMessage | DashboardScreen, TransportListScreen | No |
| buildGroupWhatsAppMessage | buildGroupWhatsAppMessage | TransportListScreen | No |
| buildAgencyWhatsAppMessage | buildAgencyWhatsAppMessage | (not used in frontend) | No |
| getMainDashboard | getMainDashboard | ExecutiveDashboardScreen, FinancialDashboard | No |
| getProjectDashboard | getProjectDashboard | (not used in frontend) | No |
| getDriverDashboard | getDriverDashboard | (not used in frontend) | No |
| getServiceSummaryByProject | getServiceSummaryByProject | ReportsScreen | No |
| getServiceSummaryByDriver | getServiceSummaryByDriver | ReportsScreen | No |
| getPendingValidation | getPendingValidation | ReportsScreen | No |
| getPendingInvoicing | getPendingInvoicing | ReportsScreen | No |
| getProfitByProject | getProfitByProject | ReportsScreen, FinancialDashboard | No |
| getProfitByDriver | getProfitByDriver | ReportsScreen | No |
| getProfitByCompany | getProfitByCompany | ExecutiveDashboardScreen, FinancialDashboard | No |
| getEstimatedVsActual | getEstimatedVsActual | ReportsScreen | No |
| getCashFlow | getCashFlow | FinancialDashboard | No |
| getClients | getClients | ClientScreen, RapportinoScreen, RateCardScreen, NewServiceScreen | No |
| createClient | createClient | ClientScreen | No |
| updateClient | updateClient | ClientScreen | No |
| deleteClient | deleteClient | ClientScreen | No |
| getContacts | getContacts | ClientScreen | No |
| getProjects | getProjects | ProjectScreen, RapportinoScreen, NewServiceScreen | No |
| createProject | createProject | ProjectScreen | No |
| updateProject | updateProject | ProjectScreen | No |
| deleteProject | deleteProject | ProjectScreen | No |
| getDrivers | getDrivers | DriverPanelScreen, CollaboratorScreen, DashboardScreen, App, NewServiceScreen | No |
| createDriver | createDriver | DriverPanelScreen | No |
| updateDriver | updateDriver | DriverPanelScreen | No |
| deleteDriver | deleteDriver | DriverPanelScreen | No |
| getVehicles | getVehicles | VehicleScreen | No |
| createVehicle | createVehicle | VehicleScreen | No |
| updateVehicle | updateVehicle | VehicleScreen | No |
| deleteVehicle | deleteVehicle | VehicleScreen | No |
| getCollaborators | getCollaborators | CollaboratorScreen | No |
| createCollaborator | createCollaborator | CollaboratorScreen | No |
| updateCollaborator | updateCollaborator | CollaboratorScreen | No |
| deleteCollaborator | deleteCollaborator | CollaboratorScreen | No |
| getUsers | getUsers | UserManagementScreen | No |
| createUser | createUser | UserManagementScreen | No |
| updateUser | updateUser | UserManagementScreen | No |
| deleteUser | deleteUser | UserManagementScreen | No |
| getActiveUsers | getActiveUsers | ActiveUsersScreen | No |
| getAuditLog | getAuditLog | AuditCenterScreen | No |
| getActivityFeed | getActivityFeed | AuditCenterScreen | No |
| getSettings | getSettings | CompanySettingsScreen, DashboardScreen | No |
| saveSettings | saveSettings | CompanySettingsScreen | No |
| getVehicleTypes | getVehicleTypes | CompanySettingsScreen | No |
| saveVehicleTypes | saveVehicleTypes | CompanySettingsScreen | No |
| getServiceTypes | getServiceTypes | CompanySettingsScreen | No |
| saveServiceTypes | saveServiceTypes | CompanySettingsScreen | No |
| getInvoices | getInvoices | AccountingScreen | No |
| createInvoice | createInvoice | AccountingScreen | No |
| getPayments | getPayments | AccountingScreen | No |
| registerPayment | registerPayment | AccountingScreen | No |
| getDocuments | getDocuments | DocumentScreen | No |
| createDocument | createDocument | DocumentScreen | No |
| getRateCards | getRateCards | RateCardScreen | No |
| createRateCard | createRateCard | RateCardScreen | No |
| getTransportLists | getTransportLists | TransportListScreen | No |
| autoDetectImportTargets | autoDetectImportTargets | NewServiceScreen | No |
| importTransportListWithProject | importTransportListWithProject | TransportListScreen | No |

## KEY FINDINGS

### 1. Screens Already Service-Scoped
- **DashboardScreen (SidePanel)**: Loads related data via Promise.allSettled
- **DriverReportsScreen**: Tabs show service-specific data
- **ReconciliationScreen**: Works with serviceId
- **WhatsAppCaptureScreen**: Has service selector

### 2. Screens Needing ServiceWorkspace Wrapper
- **TransportListScreen**: Click on service → ServiceWorkspace
- **ReportsScreen**: Click on service summary → ServiceWorkspace
- **RapportinoScreen**: Click on service in rapportino → ServiceWorkspace
- **DriverLinksScreen**: Click on link → ServiceWorkspace for linked services

### 3. Backend Gaps (Must Fix)
1. **getDriverLinks**: Backend supports serviceId (line 1001 of driverLinks.gs) but frontend api.ts doesn't pass it
2. **getInboxItems**: Backend doesn't filter by serviceId in function body
3. **getRapportinoByService**: Doesn't exist — needs creation
4. **getDriverReports**: Frontend doesn't pass serviceId to backend

### 4. Duplicate Screens to Consolidate
1. **WhatsAppParser + WhatsAppCaptureScreen**: Merge into single WhatsApp component
2. **DriverReport + ReportInbox**: Already partially consolidated
3. **DriverSubmissions + DriverLinks**: Already partially consolidated

### 5. Thin Tab-Container Wrappers (Candidates for Removal)
1. **HistoryScreen**: Just wraps Reports + Submissions tabs
2. **DriverReportsScreen**: Just wraps Inbox/History/Import tabs
3. Could be replaced by ServiceWorkspace sections
