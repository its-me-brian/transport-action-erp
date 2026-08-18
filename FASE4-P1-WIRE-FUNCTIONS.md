# FASE 4 P1 — WIRE REMAINING FUNCTIONS

Funciones backend existentes que necesitan conexión al frontend.

---

## 1. SERVICE ECONOMICS (P1)

### adjustRevenue
- **Backend**: ✅ `apiAdjustRevenue` in api.gs line 635
- **Frontend API**: ❌ **MISSING** — Not in api.ts
- **Frontend UI**: ❌ **MISSING** — No component calls it
- **Permission**: `service.adjustRevenue` → admin, coordinator
- **Use Case**: Post-validation revenue adjustments
- **Priority**: P1 — Needed for financial corrections

### adjustCost
- **Backend**: ✅ `apiAdjustCost` in api.gs line 639
- **Frontend API**: ❌ **MISSING** — Not in api.ts
- **Frontend UI**: ❌ **MISSING** — No component calls it
- **Permission**: `service.adjustCost` → admin, coordinator
- **Use Case**: Post-validation cost corrections
- **Priority**: P1 — Needed for financial corrections

---

## 2. DASHBOARDS (P1)

### getProjectDashboard
- **Backend**: ✅ Exists in api.gs
- **Frontend API**: ✅ `getProjectDashboard` in api.ts line 2310
- **Frontend UI**: ⚠️ **PARTIAL** — ProjectScreen exists but doesn't use getProjectDashboard
- **Priority**: P1 — ProjectScreen should show dashboard data

### getDriverDashboard
- **Backend**: ✅ Exists in api.gs
- **Frontend API**: ✅ `getDriverDashboard` in api.ts line 2314
- **Frontend UI**: ⚠️ **PARTIAL** — DriverPanelScreen exists but doesn't use getDriverDashboard
- **Priority**: P1 — DriverPanelScreen should show dashboard data

### getCashFlow
- **Backend**: ✅ Exists in api.gs
- **Frontend API**: ✅ `getCashFlow` in api.ts line 2318
- **Frontend UI**: ⚠️ **PARTIAL** — FinancialDashboard exists but may not use getCashFlow
- **Priority**: P1 — FinancialDashboard should show cash flow data

### getProfit
- **Backend**: ✅ Exists in api.gs
- **Frontend API**: ❌ **MISSING** — Not in api.ts
- **Frontend UI**: ❌ **MISSING** — No component calls it
- **Priority**: P1 — Needed for financial reporting

---

## 3. DOCUMENTS (P1)

### getDocuments
- **Backend**: ✅ `apiGetDocuments` in api.gs
- **Frontend API**: ✅ `getDocuments` in api.ts
- **Frontend UI**: ✅ DocumentScreen
- **Status**: **COMPLETE**

### createDocument
- **Backend**: ✅ `apiCreateDocument` in api.gs
- **Frontend API**: ✅ `createDocument` in api.ts
- **Frontend UI**: ✅ DocumentScreen
- **Status**: **COMPLETE**

### deleteDocument
- **Backend**: ✅ `apiDeleteDocument` in api.gs
- **Frontend API**: ✅ `deleteDocument` in api.ts
- **Frontend UI**: ✅ DocumentScreen
- **Status**: **COMPLETE**

---

## SUMMARY

| Function | Backend | Frontend API | Frontend UI | Status |
|----------|---------|--------------|-------------|--------|
| adjustRevenue | ✅ | ❌ | ❌ | **P1: Missing** |
| adjustCost | ✅ | ❌ | ❌ | **P1: Missing** |
| getProjectDashboard | ✅ | ✅ | ⚠️ | **P1: Partial** |
| getDriverDashboard | ✅ | ✅ | ⚠️ | **P1: Partial** |
| getCashFlow | ✅ | ✅ | ⚠️ | **P1: Partial** |
| getProfit | ✅ | ❌ | ❌ | **P1: Missing** |
| getDocuments | ✅ | ✅ | ✅ | **COMPLETE** |
| createDocument | ✅ | ✅ | ✅ | **COMPLETE** |
| deleteDocument | ✅ | ✅ | ✅ | **COMPLETE** |

---

## RECOMMENDATIONS

1. **Add adjustRevenue/adjustCost to api.ts**: Frontend API functions
2. **Add adjustRevenue/adjustCost UI**: Button in ServiceDetailScreen for admin/coordinator
3. **Wire getProjectDashboard**: ProjectScreen should call getProjectDashboard
4. **Wire getDriverDashboard**: DriverPanelScreen should call getDriverDashboard
5. **Wire getCashFlow**: FinancialDashboard should call getCashFlow
6. **Add getProfit to api.ts**: Frontend API function
7. **Add getProfit UI**: Button in ReportsScreen for admin/accounting
