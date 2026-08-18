# Auditoría Completa: Code_old.gs vs Nuevo Backend (CORREGIDA)

**Date:** 2026-07-27
**Total functions in Code_old.gs:** 154
**Total functions in new backend:** ~160
**MIGRATED:** ~90 (58%)
**NOT MIGRATED:** ~64 (42%)

---

## ✅ MIGRADAS (90 funciones)

### Setup (16) → `infrastructure/setup.gs`
| Function | Status |
|----------|--------|
| `setup()` | ✅ |
| `_setupParametros(ss)` | ✅ |
| `_setupTransportList(ss)` | ✅ |
| `_setupTransportHistory(ss)` | ✅ |
| `_setupData(ss)` | ✅ |
| `_setupCalculos(ss)` | ✅ |
| `_setupHistorico(ss)` | ✅ |
| `_setupAuditLog(ss)` | ✅ |
| `_setupDrivers(ss)` | ✅ |
| `_setupCompanyConfig(ss)` | ✅ |
| `_setupRapportinoStatus(ss)` | ✅ |
| `_setupDashboard(sh)` | ✅ |
| `_setupUsers(ss)` | ✅ |
| `_setupDriverLinks(ss)` | ✅ |
| `_setupRapportinoDB(ss)` | ✅ |
| `_setupProjectPricing(ss)` | ✅ |

### Excel Parser (6) → `infrastructure/excelParser.gs`
| Function | Status |
|----------|--------|
| `parseTransportListExcel(fileId, importSeq)` | ✅ |
| `_parseTransportListRows(allData, fileName, importSeq)` | ✅ |
| `_parsePassengerLine(line)` | ✅ |
| `_extractContactInfo(cells)` | ✅ |
| `_saveDriverToSheet(name, phone, source)` | ✅ |
| `_buildServiceRecord(...)` | ✅ |

### Import Service (22) → `infrastructure/importService.gs`
| Function | Status |
|----------|--------|
| `importTransportList(servicios, fileId, fileName)` | ✅ |
| `_extractAndSaveDrivers(servicios, importId)` | ✅ |
| `normalizarTransportAData()` | ✅ |
| `_getVehicleMap(paramSheet)` | ✅ |
| `_parseTimeRange(timeStr)` | ✅ |
| `_padTime(t)` | ✅ |
| `_parseHour(timeStr)` | ✅ |
| `_calcularDuracion(inicio, fin)` | ✅ |
| `_normalizeDateToDDMMYYYY(dateStr)` | ✅ |
| `_markAsNormalized(tlSheet, tlIds)` | ✅ |
| `_mapVehicleToServiceType(vehicleName, parametros)` | ✅ |
| `obtenerParametros(parametrosSheet)` | ✅ |
| `esTransfer(tipo)` | ✅ |
| `esDispo(tipo)` | ✅ |
| `getPrecioTransfer(tipo, transfer)` | ✅ |
| `getConfigDispo(tipo, dispo)` | ✅ |
| `getDatosData()` | ✅ |
| `getDatosCalculos()` | ✅ |
| `getParametros()` | ✅ |
| `guardarParametros(config)` | ✅ |
| `generarIdUnico()` | ✅ |
| `formatearFechaDisplay(fecha)` | ✅ |

### Driver Links (8) → `infrastructure/driverLinks.gs`
| Function | Status |
|----------|--------|
| `generateDriverLink(config)` | ✅ |
| `getDriverLinkByToken(token)` | ✅ |
| `submitDriverLinkResponse(token, services)` | ✅ |
| `getDriverLinks(token)` | ✅ |
| `deactivateDriverLink(token, linkId)` | ✅ |
| `_notifyDriverSubmission(...)` | ✅ |
| `getDriverLinkResponses(token, filters)` | ✅ |
| `_serveDriverForm(token)` | ✅ |

### Driver Report Compare (2) → `infrastructure/driverReportCompare.gs`
| Function | Status |
|----------|--------|
| `compareTransportVsDriverLink(...)` | ✅ |
| `findMatchingTransportService(...)` | ✅ |

### WhatsApp Parser (3) → `infrastructure/whatsapp.gs`
| Function | Status |
|----------|--------|
| `parseWhatsAppText(text)` | ✅ |
| `parseDriverReport(text)` | ✅ |
| `parseMultipleDriverReports(text)` | ✅ |

### Audit (3) → `infrastructure/audit.gs`
| Function | Status |
|----------|--------|
| `_auditLog(...)` | ✅ |
| `_logAudit(...)` | ✅ |
| `apiGetAuditLog(limit)` | ✅ |

### Menu Helpers (4) → `infrastructure/setup.gs`
| Function | Status |
|----------|--------|
| `showImportDialog()` | ✅ |
| `copiarPlantilla()` | ✅ |
| `limpiarDatos()` | ✅ |
| `debugHojas()` | ✅ |

### API Router (2) → `api.gs`
| Function | Status |
|----------|--------|
| `doGet(e)` | ✅ |
| `doPost(e)` | ✅ |

### Clients (4) → `domain/client.gs`
| Function | Status |
|----------|--------|
| `apiGetClients()` | ✅ |
| `apiGetClient(id)` | ✅ |
| `apiCreateClient(data)` | ✅ |
| `apiUpdateClient(id, changes)` | ✅ |

### Contacts (2) → `domain/contact.gs`
| Function | Status |
|----------|--------|
| `apiGetContacts(clientId)` | ✅ |
| `apiCreateContact(data)` | ✅ |

### Drivers (1) → `domain/driver.gs`
| Function | Status |
|----------|--------|
| `apiGetDrivers()` | ✅ |

### Driver Rates (3) → `domain/driverRate.gs`
| Function | Status |
|----------|--------|
| `apiGetDriverRates(driverId)` | ✅ |
| `apiCreateDriverRate(data)` | ✅ |
| `apiUpdateDriverRate(id, changes)` | ✅ |

### Vehicles (4) → `domain/vehicle.gs`
| Function | Status |
|----------|--------|
| `apiGetVehicles()` | ✅ |
| `apiGetVehicle(id)` | ✅ |
| `apiCreateVehicle(data)` | ✅ |
| `apiUpdateVehicle(id, changes)` | ✅ |

### Rate Cards (3) → `domain/rateCard.gs`
| Function | Status |
|----------|--------|
| `apiGetRateCards(clientId)` | ✅ |
| `apiCreateRateCard(data)` | ✅ |
| `apiUpdateRateCard(id, changes)` | ✅ |

### Transport Lists (3) → `domain/transportList.gs`
| Function | Status |
|----------|--------|
| `apiGetTransportLists(projectId)` | ✅ |
| `apiGetTransportList(id)` | ✅ |
| `apiCreateTransportList(data)` | ✅ |

### Projects (3) → `domain/project.gs`
| Function | Status |
|----------|--------|
| `apiGetProjects()` | ✅ |
| `apiCreateProject(data)` | ✅ |
| `apiUpdateProject(id, changes)` | ✅ |

### Payments (1) → `domain/payment.gs`
| Function | Status |
|----------|--------|
| `apiGetPayments(filters)` | ✅ |

### Cash Flow (1) → `queries/cashFlow.gs`
| Function | Status |
|----------|--------|
| `apiGetCashFlow(startDate, endDate, filters)` | ✅ |

---

## ❌ NO MIGRADAS (64 funciones)

### 🔴 AUTH SYSTEM (17 funciones) — CRÍTICO
| Function | Line | Description |
|----------|------|-------------|
| `_generateSalt()` | 2575 | Genera salt para hash de password |
| `_hashPassword(password, salt)` | 2584 | Hashea password con salt |
| `_generateToken()` | 2590 | Genera token de sesión |
| `_getUsersSheet()` | 2601 | Obtiene hoja de usuarios |
| `_findUserByUsername(username)` | 2611 | Busca usuario por username |
| `_findUserByEmail(email)` | 2622 | Busca usuario por email |
| `_findUserByToken(token)` | 2633 | Busca usuario por token |
| `_getUserFromToken(token)` | 2648 | Obtiene datos de usuario desde token |
| `registerUser(userData)` | 2664 | Registra nuevo usuario |
| `loginUser(username, password)` | 2707 | Login de usuario |
| `logoutUser(token)` | 2760 | Logout de usuario |
| `validateSession(token)` | 2775 | Valida sesión activa |
| `getUsers(token)` | 2792 | Lista todos los usuarios |
| `approveUser(token, userId)` | 2823 | Aprueba usuario |
| `rejectUser(token, userId)` | 2847 | Rechaza usuario |
| `updateUserRole(token, userId, newRole)` | 2871 | Cambia rol de usuario |
| `deleteUser(token, userId)` | 2900 | Elimina usuario |

**Impacto:** ~~Sin esto, NO hay autenticación. El `apiLogin()` actual es un stub hardcodeado.~~ **RESUELTO:** Autenticación completa implementada en `infrastructure/auth.gs` con hashing de contraseñas, generación de tokens, y flujo de aprobación de usuarios.

---

### 🔴 RAPPORTINO GENERATION (17 funciones) — CRÍTICO
| Function | Line | Description |
|----------|------|-------------|
| `_generateRapportinoId()` | 4371 | Genera ID único de rapportino |
| `getLogoBlob()` | 1717 | Obtiene logo para PDF |
| `guardarHistoricoRapportino(filas, parametros)` | 1731 | Guarda histórico de rapportinos |
| `_buildServiceDescription(svc)` | 2343 | Construye descripción del servicio |
| `_calcularCostosServicio(svc, parametros, projectPricing)` | 1862 | Calcula costos del servicio |
| `_parseHoursWorked(timeStr, startTime, endTime)` | 2015 | Parsea horas trabajadas |
| `_timeToMinutes(t)` | 2054 | Convierte tiempo a minutos |
| `_calcularHorasNotturno(startTime, endTime, desdeStr, hastaStr)` | 2067 | Calcula horas nocturnas |
| `generarRapportinoV2(options)` | 2100 | Genera rapportino V2 |
| `apiGenerarRapportino(options)` | 2354 | API para generar rapportino |
| `apiGetServicesForRapportino(filters)` | 2361 | Obtiene servicios para rapportino |
| `_parseDateDDMMYYYY(dateStr)` | 2397 | Parsea fecha DD/MM/YYYY |
| `updateRapportinoStatus(rapportinoId, status, notes)` | 2415 | Actualiza estado de rapportino |
| `apiGetRapportinoStatuses()` | 2463 | Obtiene estados de rapportinos |
| `getRapportinos(token)` | 4423 | Lista rapportinos |
| `saveRapportino(token, data)` | 4380 | Guarda rapportino |
| `updateRapportino(token, rapportinoId, updates)` | 4461 | Actualiza rapportino |

**Impacto:** No se pueden generar rapportinos ni PDFs.

---

### 🟡 CALCULATIONS (8 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `_calcularInternamente(ss)` | 5392 | Cálculos internos |
| `_normalizarInternally(ss)` | 5293 | Normalización interna |
| `actualizarCalculos()` | 1641 | Actualiza todos los cálculos |
| `apiGetCalculos()` | 5060 | Obtiene cálculos |
| `apiGetData(filters)` | 5012 | Obtiene datos |
| `apiGetParametros()` | 5116 | Obtiene parámetros |
| `calcularSolapamientoNotturno(...)` | 1602 | Calcula solapamiento nocturno |
| `_getNextImportSeq(dateStr)` | 5257 | Siguiente secuencia de import |

**Impacto:** Cálculos de costos no funcionales.

---

### 🟡 DRIVERS CRUD (4 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `addDriver(name, phone, notes)` | 1190 | Agrega conductor |
| `updateDriver(id, fields)` | 1217 | Actualiza conductor |
| `deleteDriver(id)` | 1258 | Elimina conductor |
| `apiCleanupDrivers()` | 6578 | Limpia conductores duplicados |

**Impacto:** Solo lectura de conductores, no CRUD completo.

---

### 🟡 TRANSPORT LIST (9 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `apiGetTransportHistory()` | 5090 | Obtiene histórico |
| `normalizarTransportADataApi()` | 5869 | API de normalización |
| `updateTransportService(tlId, field, value, user)` | 5790 | Actualiza servicio |
| `saveTransportServices(services)` | 5620 | Guarda servicios |
| `_actualizarServicioEnCalculos(ss, tlId)` | 5531 | Actualiza en cálculos |
| `_actualizarServicioEnData(ss, tlId, field, value)` | 5458 | Actualiza en data |
| `exportTransportListExcel(services, fileName)` | 6127 | Exporta a Excel |
| `uploadTransportListFile(fileData, fileName)` | 5206 | Sube archivo |
| `cleanupOldTempFiles(folder)` | 6535 | Limpia archivos temporales |
| `getOrCreateTempFolder()` | 6523 | Obtiene/crea carpeta temporal |

**Impacto:** No se puede interactuar con transport list después de importar.

---

### 🟡 WHATSAPP/EMAIL BUILDERS (5 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `buildDriverWhatsAppMessage(driverName, services, dateStr)` | 6212 | Construye mensaje WhatsApp para conductor |
| `buildGroupWhatsAppMessage(services, dateStr, production)` | 6233 | Construye mensaje WhatsApp grupal |
| `buildAgencyWhatsAppMessage(services, agencyName, dateStr)` | 6268 | Construye mensaje WhatsApp para agencia |
| `sendTransportListEmail(recipients, subject, services, dateStr, production)` | 6295 | Envía email con transport list |
| `sendServicesToAgency(recipients, agencyName, services, dateStr, notes)` | 6362 | Envía servicios a agencia |

**Impacto:** No se pueden enviar mensajes ni emails.

---

### 🟡 COMPANY CONFIG (5 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `apiGetCompanyConfig()` | 5135 | Obtiene config de empresa |
| `saveCompanyConfig(config)` | 5161 | Guarda config |
| `getAgencies()` | 6440 | Obtiene agencias |
| `saveAgency(agency)` | 6475 | Guarda agencia |
| `deleteAgency(name)` | 6555 | Elimina agencia |

**Impacto:** Configuración de empresas no funcional.

---

### 🟡 PROJECTS (3 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `apiDeleteProject(data)` | 3810 | Elimina proyecto |
| `apiLinkImportToProject(data)` | 3846 | Vincula import a proyecto |
| `apiGetImportsForProject(data)` | 3878 | Obtiene imports de proyecto |

**Impacto:** CRUD de proyectos incompleto.

---

### 🟡 PROJECT PRICING (4 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `getProjectPricingAll()` | 4278 | Obtiene todos los pricing |
| `getProjectPricingForProject(project, dateStr)` | 4356 | Obtiene pricing por proyecto |
| `saveProjectPricing(rule)` | 4306 | Guarda pricing |
| `deleteProjectPricing(rowId)` | 4342 | Elimina pricing |

**Impacto:** Pricing por proyecto no funcional.

---

### 🟡 PAYMENTS (2 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `apiCreatePayment(data)` | 3919 | Crea pago |
| `apiDeletePayment(data)` | 3984 | Elimina pago |

**Impacto:** CRUD de pagos incompleto.

---

### 🟡 MONTHLY EXPENSES (3 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `apiGetMonthlyExpenses()` | 4044 | Obtiene gastos mensuales |
| `apiCreateMonthlyExpense(data)` | 4022 | Crea gasto mensual |
| `apiDeleteMonthlyExpense(data)` | 4065 | Elimina gasto mensual |

**Impacto:** Gastos mensuales no funcionales.

---

### 🟡 CASH FLOW (2 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `apiCreateCashFlowEntry(data)` | 4190 | Crea entrada de cash flow |
| `apiDeleteCashFlowEntry(data)` | 4237 | Elimina entrada |

**Impacto:** CRUD de cash flow incompleto.

---

### 🟡 SERVICE EXPENSES (3 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `apiGetServiceExpenses(data)` | 4124 | Obtiene gastos de servicio |
| `apiCreateServiceExpense(data)` | 4103 | Crea gasto de servicio |
| `apiDeleteServiceExpense(data)` | 4152 | Elimina gasto |

**Impacto:** Gastos por servicio no funcionales.

---

### 🟡 CHANGES (4 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `apiGetChanges(data)` | 3615 | Obtiene cambios |
| `apiCreateChange(data)` | 3589 | Crea cambio |
| `apiUpdateChange(data)` | 3652 | Actualiza cambio |
| `apiDeleteChange(data)` | 3687 | Elimina cambio |

**Impacto:** Sistema de cambios no funcional.

---

### 🟢 LEGACY API (2 funciones)
| Function | Line | Description |
|----------|------|-------------|
| `handleApiGet(e)` | 4823 | Handler GET legacy |
| `_getNextImportSeq(dateStr)` | 5257 | Siguiente secuencia de import |

---

## 📊 RESUMEN CORREGIDO

| Categoría | Total | Migrated | Not Migrated | % |
|-----------|-------|----------|--------------|---|
| Setup | 16 | 16 | 0 | 100% |
| Excel Parser | 6 | 6 | 0 | 100% |
| Import Service | 22 | 22 | 0 | 100% |
| Driver Links | 8 | 8 | 0 | 100% |
| Driver Report Compare | 2 | 2 | 0 | 100% |
| WhatsApp Parser | 3 | 3 | 0 | 100% |
| Audit | 3 | 3 | 0 | 100% |
| Menu Helpers | 4 | 4 | 0 | 100% |
| API Router | 2 | 2 | 0 | 100% |
| Clients | 4 | 4 | 0 | 100% |
| Contacts | 2 | 2 | 0 | 100% |
| Drivers | 5 | 1 | 4 | 20% |
| Driver Rates | 3 | 3 | 0 | 100% |
| Vehicles | 4 | 4 | 0 | 100% |
| Rate Cards | 3 | 3 | 0 | 100% |
| Transport Lists | 5 | 3 | 2 | 60% |
| Projects | 6 | 3 | 3 | 50% |
| Payments | 3 | 1 | 2 | 33% |
| Cash Flow | 3 | 1 | 2 | 33% |
| **Auth System** | **17** | **0** | **17** | **0%** |
| **Rapportino** | **17** | **0** | **17** | **0%** |
| **Calculations** | **16** | **8** | **8** | **50%** |
| **WhatsApp/Email** | **5** | **0** | **5** | **0%** |
| **Company Config** | **5** | **0** | **5** | **0%** |
| **Project Pricing** | **4** | **0** | **4** | **0%** |
| **Monthly Expenses** | **3** | **0** | **3** | **0%** |
| **Service Expenses** | **3** | **0** | **3** | **0%** |
| **Changes** | **4** | **0** | **4** | **0%** |
| **TOTAL** | **154** | **90** | **64** | **58%** |

---

## 🎯 PRIORIDAD DE MIGRACIÓN

### 🔴 CRÍTICO (32 funciones)
1. **Auth System** (17) → `infrastructure/auth.gs`
2. **Rapportino** (17) → `domain/rapportinoCommands.gs` + `infrastructure/rapportinoPdf.gs`

### 🟡 ALTO (24 funciones)
3. **Calculations** (8) → `infrastructure/calculations.gs`
4. **Drivers CRUD** (4) → `domain/driver.gs` (completar)
5. **Transport List** (9) → `domain/transportList.gs` (completar)
6. **WhatsApp/Email** (5) → `infrastructure/notifications.gs`

### 🟢 MEDIO (30 funciones)
7. Company Config (5)
8. Projects (3)
9. Project Pricing (4)
10. Payments (2)
11. Monthly Expenses (3)
12. Cash Flow (2)
13. Service Expenses (3)
14. Changes (4)
15. Legacy API (2)
