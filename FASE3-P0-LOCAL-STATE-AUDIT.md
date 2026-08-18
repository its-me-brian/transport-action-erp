# FASE 3 P0 — LOCAL STATE VS PERSISTENCE AUDIT

Verificación de que todas las operaciones de negocio persisten via API y no solo en estado local de React.

---

## ANALYSIS

### ✅ CORRECT Patterns (State + API)

1. **DashboardScreen editingService**: Uses `updateServiceField()` to persist each field change
2. **DashboardScreen dashboardSummary**: Fetched from backend via `getMainDashboard()`
3. **TransportListScreen services**: Local state for import preview, persisted via `importTransportListWithProject()`
4. **NewServiceScreen**: Calls `createService()` API on submit
5. **ProjectScreen**: Calls `createProject()`, `updateProject()` APIs
6. **ClientScreen**: Calls `createClient()`, `updateClient()` APIs
7. **VehicleScreen**: Calls `createVehicle()`, `updateVehicle()` APIs
8. **DriverPanelScreen**: Calls `createDriver()`, `updateDriver()` APIs
9. **InvoiceScreen**: Calls `createInvoice()`, `emitInvoice()` APIs
10. **PaymentsScreen**: Calls `registerPayment()`, `confirmPayment()` APIs
11. **ExpenseScreen**: Calls `createExpense()`, `confirmExpense()` APIs
12. **RapportinoScreen**: Calls `createRapportinoClient()`, `facturarRapportino()` APIs
13. **DocumentScreen**: Calls `createDocument()`, `deleteDocument()` APIs
14. **CompanySettingsScreen**: Calls `updateSettings()`, `updateOperatingCompany()` APIs
15. **UserManagementScreen**: Calls `createUser()`, `approveUser()` APIs

---

### ⚠️ ISSUES Found

#### Issue 1: handleConfirmCancel (DashboardScreen)
```typescript
const handleConfirmCancel = () => {
  if (!cancellingService || !cancelReason.trim()) return;
  // Here you would update the service status to 'Cancelled' and save the reason
  // For now, just close the modal
  setCancellingService(null);
  setCancelReason('');
};
```
**Problem**: Cancel service only closes modal, doesn't persist cancellation
**Impact**: P1 — Service cannot be cancelled from UI
**Fix**: Call `updateServiceField()` with status='Cancelado' and reason

#### Issue 2: Cost fields not persisted
```typescript
// In handleSaveEdit:
if (!mapping) continue; // Skip unmapped fields (costs, rapportino, po, etc.)
```
**Problem**: Cost fields (baseCost, overtimeCost, kmCost) are not mapped to backend fields
**Impact**: P1 — Cost edits don't persist
**Fix**: Map cost fields to ServiceCostBreakdown or Service entity

#### Issue 3: Rapportino fields partially mapped
```typescript
// Only these rapportino fields are mapped:
startTime: { field: 'StartTime' },
endTime: { field: 'EndTime' },
km: { field: 'KmTotal' },
overtimeHours: { field: 'HoursExtra' },
diariaType: { field: 'DiariaType' },
isFestivo: { field: 'IsFestivo' },
isNotturno: { field: 'IsNotturno' },
hasDiaria: { field: 'HasDiaria' },
```
**Problem**: Some rapportino fields (overtimeBefore, overtimeAfter) not mapped
**Impact**: P2 — Minor data loss
**Fix**: Map remaining fields or remove from UI

---

### ✅ CORRECT Patterns (UI-only State)

These state variables are correctly local-only (no persistence needed):

1. **Search/filter state**: searchQuery, statusFilter, driverFilter, etc.
2. **UI state**: isLoading, showImportModal, deleteConfirm, etc.
3. **Selection state**: selectedRows, selectedServiceIds, etc.
4. **Form state**: editForm, editValue, editingCell, etc.
5. **Modal state**: showWhatsAppParser, showAdvancedFilters, etc.

---

## SUMMARY

| Category | Count | Status |
|----------|-------|--------|
| Correct (State + API) | 15 | ✅ |
| Issues Found | 3 | ⚠️ |
| Correct (UI-only State) | 20+ | ✅ |

---

## RECOMMENDATIONS

1. **Fix handleConfirmCancel**: Persist service cancellation via API
2. **Map cost fields**: Connect cost edits to ServiceCostBreakdown
3. **Complete rapportino mapping**: Map all rapportino fields or remove from UI
4. **Add tests**: Verify all state changes persist via API
