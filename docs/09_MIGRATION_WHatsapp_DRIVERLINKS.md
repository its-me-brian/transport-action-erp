# Migration Documentation: WhatsApp Parser & DriverLinks System

**Date:** 2026-07-27
**Status:** IMPLEMENTED
**Target Files:** Backend infrastructure (Apps Script)

---

## 1. Executive Summary

Two critical functionalities were migrated to the new backend architecture:

1. **WhatsApp Parser** — ✅ IMPLEMENTED — Parses driver messages sent via WhatsApp to extract service data
2. **DriverLinks System** — ✅ IMPLEMENTED — Generates links for drivers to fill in service details via web form

Both systems capture the same data (driver reports) but through different channels:
- **WhatsApp**: Driver sends free-text message → system parses it
- **DriverLinks**: Driver fills structured web form → system receives JSON

**Why these are needed:** Without these, there's no way to capture driver-reported data (km, hours, diaria, etc.) to complete the raportino flow.

---

## 2. WhatsApp Parser Functions

### 2.1 Location
- **Frontend:** `Transport Action All/src/types.ts` (lines 434-688)
- **Backend:** `Transport Action Unified/infrastructure/whatsapp.gs` (migrated from frontend)

### 2.2 Functions

#### `parseWhatsAppText(text: string): Partial<Service>`
**Purpose:** Parses a single WhatsApp message to extract service data.

**Input formats supported:**
```
"8:30 - 21:30 | 73km | Van Disposal"
"Inizio 8:30 Fine 21:30 km 73"
"8.30/21.30 73km van"
"08:30-21:30 | km: 73 | diaria"
```

**Output fields:**
| Field | Description | Example |
|-------|-------------|---------|
| startTime | Service start time | "08:30" |
| endTime | Service end time | "21:30" |
| km | Total kilometers driven | 73 |
| overtimeHours | Extra hours beyond base | 1.5 |
| hasDiaria | Meal allowance included | true |
| isFestivo | Holiday surcharge | false |
| isNotturno | Night shift | false |
| vehicleType | Type of vehicle | "van" |
| routeDescription | Route description | "Airport Transfer" |

**Regex patterns used:**
- Time range: `/(\d{1,2}[.:]\d{2})\s*[-–/]\s*(\d{1,2}[.:]\d{2})/`
- KM: `/(\d+(?:[.,]\d+)?)\s*km/i` or `/km[:\s]*(\d+(?:[.,]\d+)?)/i`
- Overtime: `/(?:overtime|straordinario|ot)[:\s]*(\d+(?:[.,]\d+)?)/i`
- Diaria: `/diaria|pranzo|lunch|meal/i`
- Festivo: `/festivo|holiday|sunday|domenica|sabato|saturday/i`
- Notturno: `/notturno|night|nott/i`

---

#### `parseDriverReport(text: string): DriverReport | null`
**Purpose:** Parses a structured driver report message (more detailed than basic WhatsApp text).

**Input formats supported:**
```
"Isidoro dragone
22/7/26
Inizio 8:30
Fine 18:30
Km tot 488
Km over 388
Diaria piena"

"Marco Troccoli 22/07/2026 Inizio Dispo ore 10,30 Fine Dispo Ore 21,30 km 630 km Over 530 Diaria Piena"
```

**Output interface:**
```typescript
interface DriverReport {
  driverName: string;        // "Isidoro Dragone"
  date: string;              // "22/7/26" (raw)
  dateParsed?: string;       // "Jul 22" (formatted)
  startTime: string;         // "08:30"
  endTime: string;           // "18:30"
  kmTotal: number;           // 488
  kmOver: number;            // 388 (extra km over 100 included)
  diariaType: 'piena' | 'mezza' | 'none';
  rawText: string;           // Original message
}
```

**Name extraction patterns:**
1. Name on same line as date: `"7/7/26Isidoro dragone"`
2. Name on separate line (Title Case): `"Isidoro dragone"`
3. ALL CAPS name: `"EMANUELE ROCCHINI"` → `"Emanuele Rocchini"`
4. Name with company: `"Michele Bartolucci (Amadio)"`
5. Fallback: first line cleaned

**Time extraction patterns:**
- Start: `inizio`, `start`, `in` followed by time
- End: `fine`, `end`, `out` followed by time
- Supports `.` `:` `,` as separators

**KM extraction:**
- Total: `km tot`, `km totali`, `totale km`
- Over: `km over`, `over`
- Auto-calculation: If kmTotal > 100 and kmOver = 0, then kmOver = kmTotal - 100

---

#### `parseMultipleDriverReports(text: string): DriverReport[]`
**Purpose:** Parses multiple driver reports from a WhatsApp chat export.

**Input format:**
```
[10:30, 22/7/2026] +393331234567: Isidoro dragone
22/7/26
Inizio 8:30
Fine 18:30
Km tot 488

[11:15, 22/7/2026] +393337654321: Marco Troccoli
...
```

**Split logic:**
1. Try WhatsApp timestamp format: `[\d{1,2}:\d{2},\s*\d{1,2}\/\d{1,2}\/\d{4}]`
2. Fallback: split by double newlines

---

### 2.3 Helper Functions

#### `formatSingleTime(timeStr: string): string`
Normalizes time format: `"8.30"` → `"08:30"`, `"8,30"` → `"08:30"`

#### `getDiariaCost(type: 'piena' | 'mezza' | 'none'): number`
Returns cost: piena = €50, mezza = €35, none = €0

#### `getKmOverCost(kmOver: number, rate: number = 1.50): number`
Returns: kmOver × rate

---

## 3. DriverLinks System

### 3.1 Location
- **Backend:** `Transport Action Unified/domain/driverLinks.gs`
- **Infrastructure:** `Transport Action Unified/infrastructure/driverLinkRepository.gs`
- **API Router:** `Transport Action Unified/api.gs` (generateDriverLink, updateDriverLink, deactivateDriverLink)
- **Frontend:** `Transport Action All/src/components/DriverLinksScreen.tsx`
- **Frontend API:** `Transport Action All/src/services/api.ts` (generateDriverLink, updateDriverLink, deactivateDriverLink)
- **Status:** ✅ IMPLEMENTED — Full CRUD with state machine (ACTIVE → EXPIRED | REVOKED)

### 3.2 Functions

#### `generateDriverLink(driverId, projectId, date, baseUrl)`
**Purpose:** Generates a unique link for a driver to fill in their service details.

**Flow:**
1. Create token with expiration (24h default)
2. Store in `driver_links` sheet
3. Return link: `{baseUrl}?action=driverForm&token={token}`

**Data stored:**
```javascript
{
  token: "abc123...",
  driverId: "d-123",
  projectId: "p-456",
  date: "2026-07-22",
  status: "active",
  createdAt: "2026-07-22T10:00:00",
  expiresAt: "2026-07-23T10:00:00"
}
```

---

#### `_serveDriverForm(token)`
**Purpose:** Serves an HTML form to the driver when they click the link.

**Form fields:**
| Field | Type | Description |
|-------|------|-------------|
| dataServizio | date | Service date |
| tipoServizio | select | TRANSFER / DISPOSIZIONE |
| orarioInizio | time | Start time |
| orarioFine | time | End time |
| descrizione | text | Route description |
| clienti | text | Client names |
| targa | text | Vehicle plate |
| kmTotali | number | Total kilometers |
| diaria | select | nessuna / piena / mezza |
| note | textarea | Additional notes |

**Italian labels:**
```html
<h2>Compila il tuo rapportino</h2>
<label>Data Servizio</label>
<label>Tipo Servizio</label>
<label>Orario Inizio</label>
<label>Orario Fine</label>
<label>Descrizione</label>
<label>Clienti</label>
<label>Targa</label>
<label>KM Totali</label>
<label>Diaria</label>
<label>Note</label>
```

---

#### `submitDriverLinkResponse(token, services)`
**Purpose:** Receives the driver's submitted services.

**Flow:**
1. Validate token (exists, not expired)
2. Store each service in `driver_link_responses` sheet
3. Mark token as "completed"
4. Send notification email to admin

**Data stored per service:**
```javascript
{
  token: "abc123...",
  dataServizio: "2026-07-22",
  tipoServizio: "TRANSFER",
  orarioInizio: "08:30",
  orarioFine: "18:30",
  descrizione: "Fiumicino Airport",
  clienti: "Produzione XYZ",
  targa: "AB123CD",
  kmTotali: 488,
  diaria: "piena",
  note: ""
}
```

---

#### `compareTransportVsDriverLink(transportService, driverLinkService)`
**Purpose:** Compares what the transport list says vs what the driver reported.

**Comparison fields:**
| Field | Transport List Key | Driver Link Key |
|-------|-------------------|-----------------|
| Hora Inicio | timeStart | orarioInizio |
| Hora Fin | timeEnd | orarioFine |
| Targa | vehiclePlate | targa |
| KM | kmDriven | kmTotali |
| Tipo Servicio | service | tipoServizio |
| Diaria | diaria | diaria |

**Output:**
```javascript
[
  {
    field: "KM",
    transportValue: 450,
    driverValue: 488,
    difference: 38,
    type: "numeric"
  },
  {
    field: "Hora Inicio",
    transportValue: "08:00",
    driverValue: "08:30",
    type: "text"
  }
]
```

---

#### `findMatchingTransportService(driverLinkService, transportServices)`
**Purpose:** Finds which transport list service matches a driver link response.

**Matching priority:**
1. **Exact match:** date + time + production
2. **Multiple match:** date + production (multiple time slots)
3. **Date + driver:** date + production + driverName (dispo scenarios)
4. **No match:** returns `{ match: null, type: 'none' }`

---

### 3.3 Supporting Functions

#### `getDriverLinkByToken(token)`
Returns link data if valid and not expired.

#### `getDriverLinks(filters)`
Lists all links with optional filters (driverId, projectId, date range).

#### `deactivateDriverLink(token)`
Marks a link as "inactive" (no longer usable).

#### `_notifyDriverSubmission(token, services)`
Sends email notification when driver submits.

---

## 4. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DRIVER REPORT INPUT                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   WhatsApp    │      │ DriverLinks  │                    │
│  │   Message     │      │   Web Form   │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                     │                             │
│         ▼                     ▼                             │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │parseDriver   │      │submitDriver  │                    │
│  │Report()      │      │LinkResponse()│                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                     │                             │
│         └─────────┬───────────┘                             │
│                   ▼                                         │
│         ┌──────────────┐                                    │
│         │   DriverReport│                                   │
│         │   (standard)  │                                   │
│         └──────┬───────┘                                    │
│                │                                            │
│                ▼                                            │
│  ┌─────────────────────────────┐                           │
│  │compareTransportVsDriver    │                           │
│  │Link()                      │                           │
│  └──────┬──────────────────────┘                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ Rapportino   │      │  Discrepancy │                    │
│  │ (confirmed)  │      │  Report      │                    │
│  └──────────────┘      └──────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. New Backend Files to Create

### 5.1 `infrastructure/whatsapp.gs`
```javascript
// WhatsApp message parsing functions
function parseWhatsAppText(text) { ... }
function parseDriverReport(text) { ... }
function parseMultipleDriverReports(text) { ... }
function formatSingleTime(timeStr) { ... }
function getDiariaCost(type) { ... }
function getKmOverCost(kmOver, rate) { ... }
```

### 5.2 `infrastructure/driverLinks.gs`
```javascript
// DriverLinks system
function generateDriverLink(driverId, projectId, date, baseUrl) { ... }
function _serveDriverForm(token) { ... }
function submitDriverLinkResponse(token, services) { ... }
function getDriverLinkByToken(token) { ... }
function getDriverLinks(filters) { ... }
function deactivateDriverLink(token) { ... }
function _notifyDriverSubmission(token, services) { ... }
```

### 5.3 `infrastructure/driverReportCompare.gs`
```javascript
// Comparison functions
function compareTransportVsDriverLink(transportService, driverLinkService) { ... }
function findMatchingTransportService(driverLinkService, transportServices) { ... }
```

---

## 6. API Endpoints to Add

### 6.1 WhatsApp Parser Endpoint
```javascript
// In api.gs doPost()
case 'parseWhatsApp':
  return _jsonResponse(parseWhatsAppText(payload.text));
  
case 'parseDriverReport':
  return _jsonResponse(parseDriverReport(payload.text));
  
case 'parseMultipleDriverReports':
  return _jsonResponse(parseMultipleDriverReports(payload.text));
```

### 6.2 DriverLinks Endpoints
```javascript
// In api.gs doGet()
case 'driverForm':
  return _serveDriverForm(e.parameter.token);
  
case 'submitResponse':
  return _jsonResponse(submitDriverLinkResponse(e.parameter.token, JSON.parse(e.parameter.data)));

// In api.gs doPost()
case 'generateDriverLink':
  return _jsonResponse(generateDriverLink(payload.driverId, payload.projectId, payload.date, payload.baseUrl));
  
case 'getDriverLinks':
  return _jsonResponse(getDriverLinks(payload.filters));
  
case 'deactivateDriverLink':
  return _jsonResponse(deactivateDriverLink(payload.token));
  
case 'compareTransportVsDriverLink':
  return _jsonResponse(compareTransportVsDriverLink(payload.transportService, payload.driverLinkService));
```

---

## 7. Sheet Schema Updates

### 7.1 New Sheet: `driver_links`
| Column | Type | Description |
|--------|------|-------------|
| Token | string | Unique link token |
| DriverID | string | Reference to driver |
| ProjectID | string | Reference to project |
| Date | string | Service date |
| Status | string | active/completed/inactive |
| CreatedAt | string | ISO timestamp |
| ExpiresAt | string | ISO timestamp |

### 7.2 New Sheet: `driver_link_responses`
| Column | Type | Description |
|--------|------|-------------|
| Token | string | Reference to link |
| DataServizio | string | Service date |
| TipoServizio | string | TRANSFER/DISPOSIZIONE |
| OrarioInizio | string | Start time |
| OrarioFine | string | End time |
| Descrizione | string | Route description |
| Clienti | string | Client names |
| Targa | string | Vehicle plate |
| KmTotali | number | Total kilometers |
| Diaria | string | piena/mezza/nessuna |
| Note | string | Additional notes |

---

## 8. Why These Are Needed

### 8.1 Without WhatsApp Parser
- Drivers can't report via WhatsApp (common in Italy)
- Manual data entry required for every service
- High risk of transcription errors
- No audit trail of original messages

### 8.2 Without DriverLinks System
- No structured way for drivers to report
- Can't generate unique links per driver/service
- No comparison between transport list and driver report
- Can't track discrepancies

### 8.3 Impact on Rapportino Flow
```
Current flow (BROKEN):
Transport List → Service → ??? → Rapportino → Invoice
                         ↑
                    MISSING: Driver Report

Fixed flow:
Transport List → Service → Driver Report (WhatsApp or DriverLink) → Rapportino → Invoice
```

---

## 9. Implementation Checklist

- [ ] Create `infrastructure/whatsapp.gs` with parser functions
- [ ] Create `infrastructure/driverLinks.gs` with link management
- [ ] Create `infrastructure/driverReportCompare.gs` with comparison logic
- [ ] Add new sheet schemas to `infrastructure/setup.gs`
- [ ] Update `api.gs` router with new endpoints
- [ ] Test WhatsApp parsing with sample messages
- [ ] Test DriverLinks flow end-to-end
- [ ] Update frontend to use new backend endpoints

---

## 10. Testing Data

### WhatsApp Parser Test Cases
```
Input 1: "8:30 - 21:30 | 73km | Van Disposal"
Expected: { startTime: "08:30", endTime: "21:30", km: 73, vehicleType: "van" }

Input 2: "Isidoro dragone\n22/7/26\nInizio 8:30\nFine 18:30\nKm tot 488\nKm over 388\nDiaria piena"
Expected: { driverName: "Isidoro Dragone", date: "22/7/26", startTime: "08:30", endTime: "18:30", kmTotal: 488, kmOver: 388, diariaType: "piena" }

Input 3: "Marco Troccoli 22/07/2026 Inizio Dispo ore 10,30 Fine Dispo Ore 21,30 km 630 km Over 530 Diaria Piena"
Expected: { driverName: "Marco Troccoli", date: "22/07/2026", startTime: "10:30", endTime: "21:30", kmTotal: 630, kmOver: 530, diariaType: "piena" }
```

### DriverLinks Test Cases
```
Test 1: Generate link → serve form → submit → compare
Test 2: Token expiration (should fail after 24h)
Test 3: Multiple services per link
Test 4: Comparison with discrepancies
```
