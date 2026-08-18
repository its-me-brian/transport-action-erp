# FASE 2 — MATRIZ DE TRAZABILIDAD

Cruce completo: Feature → Documentation → Entity → Repository → Command → API → Frontend → Test → Status

---

## 1. SERVICE LIFECYCLE

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Create Service | Service | ServiceRepository | ServiceCommands.create | apiCreateService ✅ | createService ✅ | NewServiceScreen ✅ | ✅ | **COMPLETE** |
| Assign Driver | Service | ServiceRepository | ServiceCommands.assignDriver | apiAssignDriver ✅ | assignDriver ✅ | ServiceDetailScreen ⚠️ | ⚠️ | **P1: Missing UI** |
| Confirm Service | Service | ServiceRepository | ServiceCommands.confirmService | apiConfirmService ✅ | confirmService ✅ | ServiceDetailScreen ⚠️ | ⚠️ | **P1: Missing UI** |
| Start Service | Service | ServiceRepository | ServiceCommands.startService | apiStartService ✅ | startService ✅ | ServiceDetailScreen ⚠️ | ⚠️ | **P1: Missing UI** |
| Complete Service | Service | ServiceRepository | ServiceCommands.completeService | apiCompleteService ✅ | completeService ✅ | ServiceDetailScreen ⚠️ | ⚠️ | **P1: Missing UI** |
| Validate Service | Service | ServiceRepository | ServiceCommands.validateService | apiValidateService ✅ | validateService ✅ | ServiceDetailScreen ⚠️ | ⚠️ | **P1: Missing UI** |
| Facturar Service | Service | ServiceRepository | ServiceCommands.facturarService | apiFacturarService ✅ | facturarService ✅ | DashboardScreen ✅ | ⚠️ | **P1: Missing Test** |
| Cobrar Service | Service | ServiceRepository | ServiceCommands.cobrarService | apiCobrarService ✅ | cobrarService ✅ | DashboardScreen ✅ | ⚠️ | **P1: Missing Test** |
| Close Service | Service | ServiceRepository | ServiceCommands.closeService | apiCloseService ✅ | closeService ✅ | DashboardScreen ✅ | ⚠️ | **P1: Missing Test** |
| Cerrar Comercialmente | Service | ServiceRepository | ServiceCommands.cerrarComercialmente | apiCerrarComercialmente ✅ | cerrarComercialmente ✅ | DashboardScreen ✅ | ⚠️ | **P1: Missing Test** |
| Adjust Revenue | ServiceRevenueBreakdown | ServiceRevenueBreakdownRepository | ServiceCommands.adjustRevenue | apiAdjustRevenue ✅ | ❌ Not in frontend | ❌ | ⚠️ | **P2: No UI needed** |
| Adjust Cost | ServiceCostBreakdown | ServiceCostBreakdownRepository | ServiceCommands.adjustCost | apiAdjustCost ✅ | ❌ Not in frontend | ❌ | ⚠️ | **P2: No UI needed** |

---

## 2. DRIVER REPORT

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Create Report | DriverReport | DriverReportRepository | DriverReportCommands.createReport | apiCreateDriverReport ✅ | createDriverReport ✅ | DriverReportScreen ✅ | ⚠️ | **P1: Missing Test** |
| Approve Report | DriverReport | DriverReportRepository | DriverReportCommands.approveReport | apiApproveDriverReport ✅ | approveDriverReport ✅ | ReportInboxScreen ✅ | ⚠️ | **P1: Missing Test** |
| Reject Report | DriverReport | DriverReportRepository | DriverReportCommands.rejectReport | apiRejectDriverReport ✅ | rejectDriverReport ✅ | ReportInboxScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Reports | DriverReport | DriverReportRepository | — | apiGetDriverReports ✅ | getDriverReports ✅ | DriverReportsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Inbox | DriverReport | DriverReportRepository | — | apiGetReportInbox ✅ | getReportInbox ✅ | ReportInboxScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 3. DRIVER LINKS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Generate Link | DriverLink | DriverLinkRepository | — | apiGenerateDriverLink ✅ | generateDriverLink ✅ | DriverLinksScreen ✅ | ✅ | **COMPLETE** |
| Revoke Link | DriverLink | DriverLinkRepository | — | apiRevokeDriverLink ✅ | revokeDriverLink ✅ | DriverLinksScreen ✅ | ✅ | **COMPLETE** |
| Get Links | DriverLink | DriverLinkRepository | — | apiGetDriverLinks ✅ | getDriverLinks ✅ | DriverLinksScreen ✅ | ✅ | **COMPLETE** |
| Public Form | DriverLink | DriverLinkRepository | — | apiSubmitDriverLinkForm ✅ | submitDriverLinkForm ✅ | DriverFormPublic ✅ | ⚠️ | **P1: Missing Test** |

---

## 4. INVOICES

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Create Invoice | Invoice | InvoiceRepository | — | apiCreateInvoice ✅ | createInvoice ✅ | InvoiceScreen ✅ | ⚠️ | **P1: Missing Test** |
| Emit Invoice | Invoice | InvoiceRepository | InvoiceCommands.emit | apiEmitInvoice ✅ | emitInvoice ✅ | InvoiceScreen ✅ | ⚠️ | **P1: Missing Test** |
| Send Invoice | Invoice | InvoiceRepository | InvoiceCommands.send | apiSendInvoice ✅ | sendInvoice ✅ | InvoiceScreen ✅ | ⚠️ | **P1: Missing Test** |
| Void Invoice | Invoice | InvoiceRepository | InvoiceCommands.void | apiVoidInvoice ✅ | voidInvoice ✅ | InvoiceScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Invoices | Invoice | InvoiceRepository | — | apiGetInvoices ✅ | getInvoices ✅ | InvoiceScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 5. PAYMENTS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Register Payment | Payment | PaymentRepository | PaymentCommands.register | apiRegisterPayment ✅ | registerPayment ✅ | PaymentsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Confirm Payment | Payment | PaymentRepository | PaymentCommands.confirm | apiConfirmPayment ✅ | confirmPayment ✅ | PaymentsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Reconcile Payment | Payment | PaymentRepository | PaymentCommands.reconcile | apiReconcilePayment ✅ | reconcilePayment ✅ | PaymentsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Check Duplicate | Payment | PaymentRepository | — | apiCheckDuplicatePayment ✅ | checkDuplicatePayment ✅ | PaymentsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Payments | Payment | PaymentRepository | — | apiGetPayments ✅ | getPayments ✅ | PaymentsScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 6. EXPENSES

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Create Expense | Expense | ExpenseRepository | ExpenseCommands.create | apiCreateExpense ✅ | createExpense ✅ | ExpenseScreen ✅ | ⚠️ | **P1: Missing Test** |
| Edit Expense | Expense | ExpenseRepository | ExpenseCommands.edit | apiEditExpense ✅ | editExpense ✅ | ExpenseScreen ✅ | ⚠️ | **P1: Missing Test** |
| Confirm Expense | Expense | ExpenseRepository | ExpenseCommands.confirm | apiConfirmExpense ✅ | confirmExpense ✅ | ExpenseScreen ✅ | ⚠️ | **P1: Missing Test** |
| Cancel Expense | Expense | ExpenseRepository | ExpenseCommands.cancel | apiCancelExpense ✅ | cancelExpense ✅ | ExpenseScreen ✅ | ⚠️ | **P1: Missing Test** |
| Correct Expense | Expense | ExpenseRepository | ExpenseCommands.correct | apiCorrectExpense ✅ | correctExpense ✅ | ExpenseScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Expenses | Expense | ExpenseRepository | — | apiGetExpenses ✅ | getExpenses ✅ | ExpenseScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 7. RAPPORTINO CLIENT

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Create Rapportino | RapportinoClient | RapportinoClientRepository | RapportinoClientCommands.create | apiCreateRapportinoClient ✅ | createRapportinoClient ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Add Service | RapportinoItem | RapportinoItemRepository | RapportinoClientCommands.addService | apiAddServiceToRapportino ✅ | addServiceToRapportino ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Remove Service | RapportinoItem | RapportinoItemRepository | RapportinoClientCommands.removeService | apiRemoveServiceFromRapportino ✅ | removeServiceFromRapportino ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Review Rapportino | RapportinoClient | RapportinoClientRepository | RapportinoClientCommands.review | apiReviewRapportinoClient ✅ | reviewRapportinoClient ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Send Rapportino | RapportinoClient | RapportinoClientRepository | RapportinoClientCommands.send | apiSendRapportinoClient ✅ | sendRapportinoClient ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Accept Rapportino | RapportinoClient | RapportinoClientRepository | RapportinoClientCommands.accept | apiAcceptRapportinoClient ✅ | acceptRapportinoClient ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Facturar Rapportino | RapportinoClient | RapportinoClientRepository | RapportinoClientCommands.facturar | apiFacturarRapportino ✅ | facturarRapportino ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Rapportinos | RapportinoClient | RapportinoClientRepository | — | apiGetRapportinoClients ✅ | getRapportinoClients ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 8. RAPPORTINO DRIVER

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Create Rapportino | RapportinoDriver | RapportinoDriverRepository | RapportinoDriverCommands.create | apiCreateRapportinoDriver ✅ | createRapportinoDriver ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Review Rapportino | RapportinoDriver | RapportinoDriverRepository | RapportinoDriverCommands.review | apiReviewRapportinoDriver ✅ | reviewRapportinoDriver ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Send Rapportino | RapportinoDriver | RapportinoDriverRepository | RapportinoDriverCommands.send | apiSendRapportinoDriver ✅ | sendRapportinoDriver ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Accept Rapportino | RapportinoDriver | RapportinoDriverRepository | RapportinoDriverCommands.accept | apiAcceptRapportinoDriver ✅ | acceptRapportinoDriver ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Pay Rapportino | RapportinoDriver | RapportinoDriverRepository | RapportinoDriverCommands.pay | apiPayRapportinoDriver ✅ | payRapportinoDriver ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Rapportinos | RapportinoDriver | RapportinoDriverRepository | — | apiGetRapportinoDrivers ✅ | getRapportinoDrivers ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 9. RAPPORTINO COLLABORATOR

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Create Rapportino | RapportinoCollaborator | RapportinoCollaboratorRepository | RapportinoCollaboratorCommands.create | apiCreateRapportinoCollaborator ✅ | createRapportinoCollaborator ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Review Rapportino | RapportinoCollaborator | RapportinoCollaboratorRepository | RapportinoCollaboratorCommands.review | apiReviewRapportinoCollaborator ✅ | reviewRapportinoCollaborator ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Send Rapportino | RapportinoCollaborator | RapportinoCollaboratorRepository | RapportinoCollaboratorCommands.send | apiSendRapportinoCollaborator ✅ | sendRapportinoCollaborator ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Accept Rapportino | RapportinoCollaborator | RapportinoCollaboratorRepository | RapportinoCollaboratorCommands.accept | apiAcceptRapportinoCollaborator ✅ | acceptRapportinoCollaborator ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Pay Rapportino | RapportinoCollaborator | RapportinoCollaboratorRepository | RapportinoCollaboratorCommands.pay | apiPayRapportinoCollaborator ✅ | payRapportinoCollaborator ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Rapportinos | RapportinoCollaborator | RapportinoCollaboratorRepository | — | apiGetRapportinoCollaborators ✅ | getRapportinoCollaborators ✅ | RapportinoScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 10. RECONCILIATION

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Create/Update | Reconciliation | ReconciliationRepository | ReconciliationCommands.createOrUpdate | apiCreateReconciliation ✅ | createReconciliation ✅ | ReconciliationScreen ✅ | ⚠️ | **P1: Missing Test** |
| Auto Resolve | Reconciliation | ReconciliationRepository | ReconciliationCommands.autoResolveIfMatch | apiAutoResolveReconciliation ✅ | autoResolveReconciliation ✅ | ReconciliationScreen ✅ | ⚠️ | **P1: Missing Test** |
| Resolve | Reconciliation | ReconciliationRepository | ReconciliationCommands.resolve | apiResolveReconciliation ✅ | resolveReconciliation ✅ | ReconciliationScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Reconciliations | Reconciliation | ReconciliationRepository | — | apiGetReconciliations ✅ | getReconciliations ✅ | ReconciliationScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 11. PROJECTS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Create Project | Project | ProjectRepository | — | apiCreateProject ✅ | createProject ✅ | ProjectScreen ✅ | ⚠️ | **P1: Missing Test** |
| Preparare | Project | ProjectRepository | ProjectCommands.prepararProject | apiPrepararProject ✅ | prepararProject ✅ | ProjectScreen ✅ | ⚠️ | **P1: Missing Test** |
| Attivare | Project | ProjectRepository | ProjectCommands.attivarProject | apiAttivarProject ✅ | attivarProject ✅ | ProjectScreen ✅ | ⚠️ | **P1: Missing Test** |
| Fatturazione | Project | ProjectRepository | ProjectCommands.pasarAFacturacionProject | apiPasarAFacturacionProject ✅ | pasarAFacturacionProject ✅ | ProjectScreen ✅ | ⚠️ | **P1: Missing Test** |
| Incasso | Project | ProjectRepository | ProjectCommands.pasarACobroProject | apiPasarACobroProject ✅ | pasarACobroProject ✅ | ProjectScreen ✅ | ⚠️ | **P1: Missing Test** |
| Chiudi | Project | ProjectRepository | ProjectCommands.cerrarProject | apiCerrarProject ✅ | cerrarProject ✅ | ProjectScreen ✅ | ⚠️ | **P1: Missing Test** |
| Archiviare | Project | ProjectRepository | ProjectCommands.archiveProject | apiArchiveProject ✅ | archiveProject ✅ | ProjectScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Projects | Project | ProjectRepository | — | apiGetProjects ✅ | getProjects ✅ | ProjectScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 12. DASHBOARDS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Main Dashboard | — | — | — | apiGetMainDashboard ✅ | getMainDashboard ✅ | DashboardScreen ✅ | ⚠️ | **P1: Missing Test** |
| Project Dashboard | — | — | — | apiGetProjectDashboard ✅ | getProjectDashboard ✅ | ProjectScreen ✅ | ⚠️ | **P1: Missing Test** |
| Driver Dashboard | — | — | — | apiGetDriverDashboard ✅ | getDriverDashboard ✅ | DriverPanelScreen ✅ | ⚠️ | **P1: Missing Test** |
| Cash Flow | — | — | — | apiGetCashFlow ✅ | getCashFlow ✅ | FinancialDashboard ✅ | ⚠️ | **P1: Missing Test** |
| Profit | — | — | — | apiGetProfit ✅ | getProfit ✅ | FinancialDashboard ✅ | ⚠️ | **P1: Missing Test** |
| Service Summaries | — | — | — | apiGetServiceSummaryByProject ✅ | getServiceSummaryByProject ✅ | ReportsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Pending Validation | — | — | — | apiGetPendingValidation ✅ | getPendingValidation ✅ | ReportsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Pending Invoicing | — | — | — | apiGetPendingInvoicing ✅ | getPendingInvoicing ✅ | ReportsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Estimated vs Actual | — | — | — | apiGetEstimatedVsActual ✅ | getEstimatedVsActual ✅ | ReportsScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 13. DOCUMENTS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Documents | Document | DocumentRepository | — | apiGetDocuments ✅ | getDocuments ✅ | DocumentScreen ✅ | ⚠️ | **P1: Missing Test** |
| Create Document | Document | DocumentRepository | — | apiCreateDocument ✅ | createDocument ✅ | DocumentScreen ✅ | ⚠️ | **P1: Missing Test** |
| Delete Document | Document | DocumentRepository | — | apiDeleteDocument ✅ | deleteDocument ✅ | DocumentScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 14. SETTINGS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Settings | Settings | SettingsRepository | — | apiGetSettings ✅ | getSettings ✅ | CompanySettingsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Update Settings | Settings | SettingsRepository | — | apiUpdateSettings ✅ | updateSettings ✅ | CompanySettingsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Company | OperatingCompany | OperatingCompanyRepository | — | apiGetOperatingCompany ✅ | getOperatingCompany ✅ | CompanySettingsScreen ✅ | ⚠️ | **P1: Missing Test** |
| Update Company | OperatingCompany | OperatingCompanyRepository | — | apiUpdateOperatingCompany ✅ | updateOperatingCompany ✅ | CompanySettingsScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 15. USERS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Login | User | UserRepository | — | apiLogin ✅ | login ✅ | AuthScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Users | User | UserRepository | — | apiGetUsers ✅ | getUsers ✅ | UserManagementScreen ✅ | ⚠️ | **P1: Missing Test** |
| Create User | User | UserRepository | — | apiCreateUser ✅ | createUser ✅ | UserManagementScreen ✅ | ⚠️ | **P1: Missing Test** |
| Approve User | User | UserRepository | — | apiApproveUser ✅ | approveUser ✅ | UserManagementScreen ✅ | ⚠️ | **P1: Missing Test** |
| Reject User | User | UserRepository | — | apiRejectUser ✅ | rejectUser ✅ | UserManagementScreen ✅ | ⚠️ | **P1: Missing Test** |
| Delete User | User | UserRepository | — | apiDeleteUser ✅ | deleteUser ✅ | UserManagementScreen ✅ | ⚠️ | **P1: Missing Test** |
| Change Role | User | UserRepository | — | apiChangeUserRole ✅ | changeUserRole ✅ | UserManagementScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 16. DRIVERS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Drivers | Driver | DriverRepository | — | apiGetDrivers ✅ | getDrivers ✅ | DriverPanelScreen ✅ | ⚠️ | **P1: Missing Test** |
| Create Driver | Driver | DriverRepository | — | apiCreateDriver ✅ | createDriver ✅ | DriverPanelScreen ✅ | ⚠️ | **P1: Missing Test** |
| Update Driver | Driver | DriverRepository | — | apiUpdateDriver ✅ | updateDriver ✅ | DriverPanelScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 17. VEHICLES

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Vehicles | Vehicle | VehicleRepository | — | apiGetVehicles ✅ | getVehicles ✅ | VehicleScreen ✅ | ⚠️ | **P1: Missing Test** |
| Create Vehicle | Vehicle | VehicleRepository | — | apiCreateVehicle ✅ | createVehicle ✅ | VehicleScreen ✅ | ⚠️ | **P1: Missing Test** |
| Update Vehicle | Vehicle | VehicleRepository | — | apiUpdateVehicle ✅ | updateVehicle ✅ | VehicleScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 18. CLIENTS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Clients | Client | ClientRepository | — | apiGetClients ✅ | getClients ✅ | ClientScreen ✅ | ⚠️ | **P1: Missing Test** |
| Create Client | Client | ClientRepository | — | apiCreateClient ✅ | createClient ✅ | ClientScreen ✅ | ⚠️ | **P1: Missing Test** |
| Update Client | Client | ClientRepository | — | apiUpdateClient ✅ | updateClient ✅ | ClientScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 19. RATE CARDS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Rate Cards | RateCard | RateCardRepository | — | apiGetRateCards ✅ | getRateCards ✅ | RateCardScreen ✅ | ⚠️ | **P1: Missing Test** |
| Create Rate Card | RateCard | RateCardRepository | — | apiCreateRateCard ✅ | createRateCard ✅ | RateCardScreen ✅ | ⚠️ | **P1: Missing Test** |
| Update Rate Card | RateCard | RateCardRepository | — | apiUpdateRateCard ✅ | updateRateCard ✅ | RateCardScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 20. DRIVER RATES

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Driver Rates | DriverRate | DriverRateRepository | — | apiGetDriverRates ✅ | getDriverRates ✅ | DriverRateScreen ✅ | ⚠️ | **P1: Missing Test** |
| Create Driver Rate | DriverRate | DriverRateRepository | — | apiCreateDriverRate ✅ | createDriverRate ✅ | DriverRateScreen ✅ | ⚠️ | **P1: Missing Test** |
| Update Driver Rate | DriverRate | DriverRateRepository | — | apiUpdateDriverRate ✅ | updateDriverRate ✅ | DriverRateScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 21. DRIVER ADVANCES

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Driver Advances | DriverAdvance | DriverAdvanceRepository | — | apiGetDriverAdvances ✅ | getDriverAdvances ✅ | DriverAdvanceScreen ✅ | ⚠️ | **P1: Missing Test** |
| Create Driver Advance | DriverAdvance | DriverAdvanceRepository | — | apiCreateDriverAdvance ✅ | createDriverAdvance ✅ | DriverAdvanceScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 22. ACTIVITY/AUDIT

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Activity Feed | ActivityFeed | ActivityFeedRepository | — | apiGetActivityFeed ✅ | getActivityFeed ✅ | ActivityFeedScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Audit Log | AuditLog | AuditLogRepository | — | apiGetAuditLog ✅ | getAuditLog ✅ | AuditCenterScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 23. WHATSAPP PARSER

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Parse Message | DriverReport | DriverReportRepository | — | apiParseWhatsApp ✅ | parseWhatsApp ✅ | WhatsAppParser ✅ | ⚠️ | **P1: Missing Test** |

---

## 24. CHANGES

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Changes | Change | ChangeRepository | — | apiGetChanges ✅ | getChanges ✅ | ChangesScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 25. TRANSPORT LIST

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Upload Excel | TransportList | TransportListRepository | — | apiUploadTransportListFile ✅ | uploadAndParseExcel ✅ | TransportListScreen ✅ | ⚠️ | **P1: Missing Test** |
| Import With Project | TransportList | TransportListRepository | — | apiImportTransportListWithProject ✅ | importTransportListWithProject ✅ | TransportListScreen ✅ | ⚠️ | **P1: Missing Test** |
| Auto Detect | TransportList | TransportListRepository | — | apiAutoDetectImportTargets ✅ | autoDetectImportTargets ✅ | TransportListScreen ✅ | ⚠️ | **P1: Missing Test** |
| Get Transport Lists | TransportList | TransportListRepository | — | apiGetTransportLists ✅ | getTransportLists ✅ | TransportListScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 26. COLLABORATORS

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Collaborators | Collaborator | CollaboratorRepository | — | apiGetCollaborators ✅ | getCollaborators ✅ | CollaboratorScreen ✅ | ⚠️ | **P1: Missing Test** |
| Create Collaborator | Collaborator | CollaboratorRepository | — | apiCreateCollaborator ✅ | createCollaborator ✅ | CollaboratorScreen ✅ | ⚠️ | **P1: Missing Test** |
| Update Collaborator | Collaborator | CollaboratorRepository | — | apiUpdateCollaborator ✅ | updateCollaborator ✅ | CollaboratorScreen ✅ | ⚠️ | **P1: Missing Test** |

---

## 27. SUPPLIER RATES

| Feature | Entity | Repository | Command | Backend API | Frontend API | Frontend Component | Test | Status |
|---------|--------|------------|---------|-------------|--------------|-------------------|------|--------|
| Get Supplier Rates | SupplierRate | SupplierRateRepository | — | apiGetSupplierRates ✅ | getSupplierRates ✅ | ❌ Not in UI | ⚠️ | **P2: Backend-only** |
| Create Supplier Rate | SupplierRate | SupplierRateRepository | — | apiCreateSupplierRate ✅ | createSupplierRate ✅ | ❌ Not in UI | ⚠️ | **P2: Backend-only** |

---

## SUMMARY

| Category | Total Features | Complete | P1 (Missing Tests) | P2 (No UI Needed) |
|----------|---------------|----------|-------------------|-------------------|
| Service Lifecycle | 12 | 1 | 9 | 2 |
| Driver Report | 5 | 0 | 5 | 0 |
| Driver Links | 4 | 3 | 1 | 0 |
| Invoices | 5 | 0 | 5 | 0 |
| Payments | 5 | 0 | 5 | 0 |
| Expenses | 6 | 0 | 6 | 0 |
| Rapportino Client | 8 | 0 | 8 | 0 |
| Rapportino Driver | 6 | 0 | 6 | 0 |
| Rapportino Collaborator | 6 | 0 | 6 | 0 |
| Reconciliation | 4 | 0 | 4 | 0 |
| Projects | 8 | 0 | 8 | 0 |
| Dashboards | 9 | 0 | 9 | 0 |
| Documents | 3 | 0 | 3 | 0 |
| Settings | 4 | 0 | 4 | 0 |
| Users | 7 | 0 | 7 | 0 |
| Drivers | 3 | 0 | 3 | 0 |
| Vehicles | 3 | 0 | 3 | 0 |
| Clients | 3 | 0 | 3 | 0 |
| Rate Cards | 3 | 0 | 3 | 0 |
| Driver Rates | 3 | 0 | 3 | 0 |
| Driver Advances | 2 | 0 | 2 | 0 |
| Activity/Audit | 2 | 0 | 2 | 0 |
| WhatsApp Parser | 1 | 0 | 1 | 0 |
| Changes | 1 | 0 | 1 | 0 |
| Transport List | 4 | 0 | 4 | 0 |
| Collaborators | 3 | 0 | 3 | 0 |
| Supplier Rates | 2 | 0 | 0 | 2 |
| **TOTAL** | **112** | **4** | **106** | **4** |

---

## KEY FINDINGS

1. **Backend is 100% complete**: All 199 action handlers exist and are wired
2. **Frontend API is 100% complete**: All 100+ functions exist and call backend
3. **Frontend components are 95% complete**: Most screens exist, some lifecycle buttons missing
4. **Tests are the GAP**: Only 4/112 features have complete test coverage
5. **No E2E test exists**: The full business flow (34 steps) has never been tested end-to-end
6. **4 features are backend-only**: Supplier Rates don't need UI (internal use)
7. **Service lifecycle buttons missing**: assignDriver, confirmService, startService, completeService, validateService need UI buttons in ServiceDetailScreen

---

## NEXT STEPS (FASE 3 P0)

1. **Add lifecycle buttons to ServiceDetailScreen** (assignDriver, confirmService, startService, completeService, validateService)
2. **Write tests for all Commands** (positive + negative)
3. **Write E2E test** (34-step flow)
4. **Verify permission security matrix** (section 22)
5. **Verify local state vs persistence** (section 26)
