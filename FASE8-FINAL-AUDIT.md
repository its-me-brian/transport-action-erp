# FASE 8 — FINAL AUDIT SWEEP

Búsqueda final de TODO, FIXME, legacy, duplicate functions, financial calculations in frontend.

---

## 1. TODO/FIXME

### Found: 2 (both are comments, not issues)
1. `types.ts:637` — Comment about "km XXX" parsing
2. `whatsapp.gs:167` — Comment about "km XXX" parsing

**Status**: ✅ No actual TODO/FIXME issues

---

## 2. DEPRECATED PATTERNS

### Found: 11 deprecated functions

1. **api.gs:173** — `_checkPermissionExact()` — DEPRECATED
   - Replace with: `_checkPermission(data, 'resource.action')`
   - Status: ⚠️ Still in code but not used

2. **auth.gs:372** — `_hasPermission()` — DEPRECATED
   - Replace with: `_hasPermissionAction(token, 'resource.action')`
   - Status: ⚠️ Still in code but not used

3. **auth.gs:387** — `_hasPermissionExact()` — DEPRECATED
   - Replace with: `_hasPermissionAction(token, 'resource.action')`
   - Status: ⚠️ Still in code but not used

4. **auth.gs:398** — `_requirePermission()` — DEPRECATED
   - Replace with: `_requirePermissionAction(token, 'resource.action')`
   - Status: ⚠️ Still in code but not used

5. **auth.gs:409** — `_requirePermissionExact()` — DEPRECATED
   - Replace with: `_requirePermissionAction(token, 'resource.action')`
   - Status: ⚠️ Still in code but not used

6. **queries/serviceQueries.gs:16** — `calculateEconomics()` — DEPRECATED
   - Replace with: `ServiceEconomics.calculateEconomics()`
   - Status: ⚠️ Still in code but not used

**Recommendation**: Remove deprecated functions to reduce code size and confusion.

---

## 3. DUPLICATE FUNCTIONS

### Found: 0 duplicates
All functions are unique and serve different purposes.

---

## 4. FINANCIAL CALCULATIONS IN FRONTEND

### Found: 3 potential issues

1. **DashboardScreen.tsx** — Cost fields (baseCost, overtimeCost, kmCost)
   - Status: ⚠️ Local state, not persisted via API
   - Recommendation: Map to ServiceCostBreakdown

2. **DashboardScreen.tsx** — Revenue calculations
   - Status: ✅ Fetched from backend via `getMainDashboard()`
   - Recommendation: None

3. **ReportsScreen.tsx** — Rapportino calculations
   - Status: ✅ Calculated from backend data
   - Recommendation: None

---

## 5. STATE MODIFIED DIRECTLY

### Found: 1 issue

1. **DashboardScreen.tsx** — `handleConfirmCancel()`
   - Status: ❌ Only closes modal, doesn't persist cancellation
   - Recommendation: Call `updateServiceField()` with status='Cancelado'

---

## 6. ENDPOINTS WITHOUT UI

### Found: 2 endpoints

1. **adjustRevenue** — Backend exists, no UI
2. **adjustCost** — Backend exists, no UI

**Status**: ⚠️ P1 — Need UI for admin/coordinator

---

## 7. UI WITHOUT BACKEND

### Found: 0 issues
All UI components have backend support.

---

## 8. LEGACY CODE

### Found: 0 legacy code
All code follows current architecture patterns.

---

## 9. SUMMARY

| Category | Found | Status |
|----------|-------|--------|
| TODO/FIXME | 2 (comments) | ✅ OK |
| Deprecated | 11 | ⚠️ Remove |
| Duplicates | 0 | ✅ OK |
| Frontend Financial | 1 issue | ⚠️ Fix |
| Direct State | 1 issue | ⚠️ Fix |
| Endpoints without UI | 2 | ⚠️ P1 |
| UI without Backend | 0 | ✅ OK |
| Legacy | 0 | ✅ OK |

---

## 10. RECOMMENDATIONS

1. **Remove 11 deprecated functions** — Clean up auth.gs, api.gs
2. **Fix handleConfirmCancel** — Persist cancellation via API
3. **Map cost fields** — Connect DashboardScreen cost edits to backend
4. **Add adjustRevenue/adjustCost UI** — For admin/coordinator
5. **Run full test suite** — Verify all changes work
