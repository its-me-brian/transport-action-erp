# FASE 3 P0 — PERMISSION SECURITY MATRIX

Matriz real de permisos por recurso y rol. Admin SIEMPRE tiene acceso (excepción en `_hasPermissionAction`).

---

## LEGENDA
- ✅ = Permitido
- ❌ = Denegado
- 🔒 = Admin only

---

## SERVICES

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | service.list |
| list_own | ✅ | ✅ | ✅ | ✅ | service.list_own |
| import | ✅ | ✅ | ❌ | ❌ | service.import |
| assign | ✅ | ✅ | ❌ | ❌ | service.assign |
| confirm | ✅ | ✅ | ❌ | ❌ | service.confirm |
| start | ✅ | ✅ | ❌ | ✅ | service.start |
| complete | ✅ | ✅ | ❌ | ✅ | service.complete |
| validate | ✅ | ✅ | ❌ | ❌ | service.validate |
| adjustRevenue | ✅ | ✅ | ❌ | ❌ | service.adjustRevenue |
| adjustCost | ✅ | ✅ | ❌ | ❌ | service.adjustCost |
| updateField | ✅ | ✅ | ❌ | ❌ | service.updateField |
| facturar | ✅ | ✅ | ✅ | ❌ | service.facturar |
| cobrar | ✅ | ✅ | ✅ | ❌ | service.cobrar |
| close | ✅ | ✅ | ❌ | ❌ | service.close |

**NOTE**: Driver can start/complete only their own services (ownership check in api.gs).

---

## PROJECTS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | project.list |
| create | ✅ | ✅ | ❌ | ❌ | project.create |
| update | ✅ | ✅ | ❌ | ❌ | project.update |
| delete | ✅ | ✅ | ❌ | ❌ | project.delete |
| archive | ✅ | ✅ | ❌ | ❌ | project.archive |
| preparar | ✅ | ✅ | ❌ | ❌ | project.preparar |
| activar | ✅ | ✅ | ❌ | ❌ | project.activar |
| pasarAFacturacion | ✅ | ✅ | ❌ | ❌ | project.pasarAFacturacion |
| pasarACobro | ✅ | ✅ | ❌ | ❌ | project.pasarACobro |
| cerrar | ✅ | ✅ | ❌ | ❌ | project.cerrar |

---

## DRIVERS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | driver.list |
| create | ✅ | ✅ | ❌ | ❌ | driver.create |
| update | ✅ | ✅ | ❌ | ❌ | driver.update |
| delete | ✅ | ✅ | ❌ | ❌ | driver.delete |
| cleanup | ✅ | ✅ | ❌ | ❌ | driver.cleanup |

---

## VEHICLES

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | vehicle.list |
| create | ✅ | ✅ | ❌ | ❌ | vehicle.create |
| update | ✅ | ✅ | ❌ | ❌ | vehicle.update |
| delete | ✅ | ✅ | ❌ | ❌ | vehicle.delete |

---

## DRIVER RATES

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ❌ | ❌ | driverRate.list |
| create | ✅ | ✅ | ❌ | ❌ | driverRate.create |
| update | ✅ | ✅ | ❌ | ❌ | driverRate.update |
| delete | ✅ | ✅ | ❌ | ❌ | driverRate.delete |

---

## COLLABORATORS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | collaborator.list |
| create | ✅ | ✅ | ❌ | ❌ | collaborator.create |
| update | ✅ | ✅ | ❌ | ❌ | collaborator.update |
| delete | ✅ | ✅ | ❌ | ❌ | collaborator.delete |

---

## SUPPLIER RATES

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ❌ | ❌ | supplierRate.list |
| create | ✅ | ✅ | ❌ | ❌ | supplierRate.create |
| update | ✅ | ✅ | ❌ | ❌ | supplierRate.update |
| delete | ✅ | ✅ | ❌ | ❌ | supplierRate.delete |

---

## RATE CARDS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ❌ | ❌ | rateCard.list |
| create | 🔒 | ❌ | ❌ | ❌ | rateCard.create |
| update | 🔒 | ❌ | ❌ | ❌ | rateCard.update |
| delete | 🔒 | ❌ | ❌ | ❌ | rateCard.delete |

---

## CLIENTS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | client.list |
| create | ✅ | ✅ | ❌ | ❌ | client.create |
| update | ✅ | ✅ | ❌ | ❌ | client.update |
| delete | ✅ | ✅ | ❌ | ❌ | client.delete |

---

## CONTACTS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | contact.list |
| create | ✅ | ✅ | ❌ | ❌ | contact.create |
| update | ✅ | ✅ | ❌ | ❌ | contact.update |
| delete | ✅ | ✅ | ❌ | ❌ | contact.delete |

---

## TRANSPORT LISTS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ❌ | ❌ | transportList.list |
| upload | ✅ | ✅ | ❌ | ❌ | transportList.upload |
| import | ✅ | ✅ | ❌ | ❌ | transportList.import |
| export | ✅ | ✅ | ❌ | ❌ | transportList.export |

---

## DRIVER REPORTS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ❌ | ✅ | driverReport.list |
| create | ✅ | ❌ | ❌ | ✅ | driverReport.create |
| submit | ✅ | ❌ | ❌ | ✅ | driverReport.submit |
| approve | ✅ | ✅ | ❌ | ❌ | driverReport.approve |
| reject | ✅ | ✅ | ❌ | ❌ | driverReport.reject |

**NOTE**: Driver can only see/submit their own reports (ownership check in api.gs).

---

## RAPPORTINO CLIENT

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | rapportinoClient.list |
| create | ✅ | ✅ | ❌ | ❌ | rapportinoClient.create |
| addService | ✅ | ✅ | ❌ | ❌ | rapportinoClient.addService |
| removeService | ✅ | ✅ | ❌ | ❌ | rapportinoClient.removeService |
| review | ✅ | ✅ | ❌ | ❌ | rapportinoClient.review |
| send | ✅ | ✅ | ❌ | ❌ | rapportinoClient.send |
| accept | ✅ | ✅ | ✅ | ❌ | rapportinoClient.accept |
| facturar | ✅ | ❌ | ✅ | ❌ | rapportinoClient.facturar |

---

## RAPPORTINO DRIVER

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ❌ | ❌ | rapportinoDriver.list |
| create | ✅ | ✅ | ❌ | ❌ | rapportinoDriver.create |
| review | ✅ | ✅ | ❌ | ❌ | rapportinoDriver.review |
| send | ✅ | ✅ | ❌ | ❌ | rapportinoDriver.send |
| accept | ✅ | ✅ | ❌ | ❌ | rapportinoDriver.accept |
| pay | ✅ | ❌ | ✅ | ❌ | rapportinoDriver.pay |

---

## RAPPORTINO COLLABORATOR

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | rapportinoCollaborator.list |
| create | ✅ | ✅ | ❌ | ❌ | rapportinoCollaborator.create |
| addService | ✅ | ✅ | ❌ | ❌ | rapportinoCollaborator.addService |
| send | ✅ | ✅ | ❌ | ❌ | rapportinoCollaborator.send |
| accept | ✅ | ✅ | ❌ | ❌ | rapportinoCollaborator.accept |
| pay | ✅ | ❌ | ✅ | ❌ | rapportinoCollaborator.pay |

---

## INVOICES

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ❌ | ✅ | ❌ | invoice.list |
| create | ✅ | ❌ | ✅ | ❌ | invoice.create |
| emit | ✅ | ❌ | ✅ | ❌ | invoice.emit |
| send | ✅ | ❌ | ✅ | ❌ | invoice.send |
| void | ✅ | ❌ | ✅ | ❌ | invoice.void |

**NOTE**: Coordinator CANNOT access invoices — financial isolation.

---

## PAYMENTS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ❌ | ✅ | ❌ | payment.list |
| register | ✅ | ❌ | ✅ | ❌ | payment.register |
| confirm | ✅ | ❌ | ✅ | ❌ | payment.confirm |
| reconcile | ✅ | ❌ | ✅ | ❌ | payment.reconcile |

---

## EXPENSES

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | expense.list |
| create | ✅ | ✅ | ✅ | ❌ | expense.create |
| edit | ✅ | ✅ | ✅ | ❌ | expense.edit |
| confirm | ✅ | ❌ | ✅ | ❌ | expense.confirm |
| cancel | ✅ | ❌ | ✅ | ❌ | expense.cancel |
| correct | ✅ | ❌ | ✅ | ❌ | expense.correct |

---

## CHANGES

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ✅ | change.list |
| create | ✅ | ✅ | ✅ | ✅ | change.create |
| update | ✅ | ✅ | ✅ | ✅ | change.update |
| delete | ✅ | ✅ | ❌ | ❌ | change.delete |
| resolve | ✅ | ✅ | ❌ | ❌ | change.resolve |

---

## DOCUMENTS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ✅ | document.list |
| create | ✅ | ✅ | ✅ | ✅ | document.create |
| delete | ✅ | ✅ | ✅ | ✅ | document.delete |

---

## DRIVER ADVANCES

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ❌ | ✅ | ❌ | driverAdvance.list |
| create | ✅ | ❌ | ✅ | ❌ | driverAdvance.create |
| update | ✅ | ❌ | ✅ | ❌ | driverAdvance.update |

---

## DRIVER LINKS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ❌ | ❌ | driverLink.list |
| generate | ✅ | ✅ | ❌ | ❌ | driverLink.generate |
| deactivate | ✅ | ✅ | ❌ | ❌ | driverLink.deactivate |
| compare | ✅ | ✅ | ❌ | ❌ | driverLink.compare |

---

## DRIVER REPORT INBOX

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ❌ | ❌ | inbox.list |
| capture | ✅ | ✅ | ❌ | ✅ | inbox.capture |
| normalize | ✅ | ✅ | ❌ | ❌ | inbox.normalize |
| review | ✅ | ✅ | ❌ | ❌ | inbox.review |

---

## RECONCILIATION

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| check | ✅ | ✅ | ✅ | ❌ | reconciliation.check |
| update | ✅ | ✅ | ❌ | ❌ | reconciliation.update |

---

## REVENUE / COST BREAKDOWNS

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| list | ✅ | ✅ | ✅ | ❌ | revenueBreakdown.list |
| list | ✅ | ✅ | ✅ | ❌ | costBreakdown.list |

---

## REPORTS / QUERIES

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| dashboard | ✅ | ✅ | ✅ | ❌ | report.dashboard |
| projectDashboard | ✅ | ✅ | ✅ | ❌ | report.projectDashboard |
| driverDashboard | ✅ | ✅ | ✅ | ❌ | report.driverDashboard |
| serviceSummary | ✅ | ✅ | ✅ | ❌ | report.serviceSummary |
| pendingValidation | ✅ | ✅ | ❌ | ❌ | report.pendingValidation |
| pendingInvoicing | ✅ | ❌ | ✅ | ❌ | report.pendingInvoicing |
| profitProject | ✅ | ✅ | ✅ | ❌ | report.profitProject |
| profitDriver | ✅ | ✅ | ✅ | ❌ | report.profitDriver |
| profitCompany | ✅ | ❌ | ✅ | ❌ | report.profitCompany |
| cashflow | ✅ | ❌ | ✅ | ❌ | report.cashflow |

---

## SYSTEM

| Action | admin | coordinator | accounting | driver | Permission |
|--------|-------|-------------|------------|--------|------------|
| settings.read | ✅ | ✅ | ✅ | ❌ | settings.read |
| settings.write | 🔒 | ❌ | ❌ | ❌ | settings.write |
| auditLog.read | ✅ | ❌ | ✅ | ❌ | auditLog.read |
| activityFeed.read | ✅ | ✅ | ✅ | ✅ | activityFeed.read |
| userManagement | 🔒 | ❌ | ❌ | ❌ | userManagement |
| invariantCheck | 🔒 | ❌ | ❌ | ❌ | invariantCheck |
| integrationTest | 🔒 | ❌ | ❌ | ❌ | integrationTest |

---

## SECURITY ANALYSIS

### Strengths ✅
1. **No hierarchy**: Explicit permission matrix — no role escalation
2. **Admin always has access**: Checked separately in `_hasPermissionAction`
3. **Driver ownership**: `_assertDriverOwnership()` prevents cross-driver access
4. **Financial isolation**: Coordinator cannot access invoices/payments
5. **Backend enforcement**: All endpoints check `_checkPermission()` before execution

### Issues ⚠️
1. **No permission tests**: No automated tests verify permission enforcement
2. **No negative permission tests**: No tests verify denied access returns 403
3. **Frontend-only restrictions**: Some UI elements hidden by role but backend is the real gate

### Recommendations
1. **Add permission tests** for each endpoint with each role
2. **Add negative tests** verify denied access returns proper error
3. **Document exceptions** where driver can access coordinator functions (start/complete)
