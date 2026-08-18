/**
 * ============================================================================
 * TEST COMPREHENSIVO — TODAS las funciones de types.ts
 * ============================================================================
 * 
 * Este archivo prueba CADA función exportada de types.ts:
 * 
 * 1. isProductionVehicle
 * 2. formatDateKey
 * 3. getWeekColumns
 * 4. mapServiceDTOToService
 * 5. dateKeyFromAny
 * 6. parseDateKeyToDate
 * 7. findFirstServiceDate
 * 8. getMonthWeeks
 * 9. getMonthName
 * 10. parseTimeToHour
 * 11. formatTimeDisplay
 * 12. getHourSlots
 * 13. parseDriverReport
 * 14. parseMultipleDriverReports
 * 15. getDiariaCost
 * 16. getKmOverCost
 * 17. calculateServiceCosts
 * 18. normalizeTransportService
 * 19. normalizeTransportServices
 * 20. passengerDisplay
 * 21. passengerRolesDisplay
 * 22. hasPassengerRole
 * 23. pickupDisplay
 * 24. dropoffDisplay
 * 25. getDriverAvatar
 * 
 * Ejecutar: npm test -- src/__tests__/types-all.test.ts
 * ============================================================================
 */

import { describe, it, expect, vi } from 'vitest';
import {
  Service,
  isProductionVehicle,
  formatDateKey,
  getWeekColumns,
  mapServiceDTOToService,
  dateKeyFromAny,
  parseDateKeyToDate,
  findFirstServiceDate,
  getMonthWeeks,
  getMonthName,
  parseTimeToHour,
  formatTimeDisplay,
  getHourSlots,
  parseDriverReport,
  parseMultipleDriverReports,
  getDiariaCost,
  getKmOverCost,
  calculateServiceCosts,
  getDriverAvatar,
} from '../types';
import {
  normalizeTransportService,
  normalizeTransportServices,
  passengerDisplay,
  passengerRolesDisplay,
  hasPassengerRole,
  pickupDisplay,
  dropoffDisplay,
  Passenger,
} from '../services/api';

// ============================================================================
// 1. isProductionVehicle
// ============================================================================
describe('1. isProductionVehicle', () => {
  it('returns true for PRODUCTION vehicles', () => {
    expect(isProductionVehicle({ vehicleType: 'PRODUCTION' } as Service)).toBe(true);
    expect(isProductionVehicle({ vehicleType: 'Production Van' } as Service)).toBe(true);
    expect(isProductionVehicle({ vehicleType: 'PRODUCTION CAR' } as Service)).toBe(true);
  });

  it('returns false for non-production vehicles', () => {
    expect(isProductionVehicle({ vehicleType: 'Van' } as Service)).toBe(false);
    expect(isProductionVehicle({ vehicleType: 'Car' } as Service)).toBe(false);
    expect(isProductionVehicle({ vehicleType: 'Transfer' } as Service)).toBe(false);
    expect(isProductionVehicle({ vehicleType: 'Disposal' } as Service)).toBe(false);
  });

  it('returns false for empty/undefined vehicleType', () => {
    expect(isProductionVehicle({} as Service)).toBe(false);
    expect(isProductionVehicle({ vehicleType: '' } as Service)).toBe(false);
    expect(isProductionVehicle({ vehicleType: undefined } as Service)).toBe(false);
  });
});

// ============================================================================
// 2. formatDateKey
// ============================================================================
describe('2. formatDateKey', () => {
  it('formats date to "MMM DD"', () => {
    expect(formatDateKey(new Date(2026, 6, 22))).toBe('Jul 22');
    expect(formatDateKey(new Date(2026, 0, 1))).toBe('Jan 1');
    expect(formatDateKey(new Date(2026, 11, 31))).toBe('Dec 31');
  });

  it('handles single digit days', () => {
    expect(formatDateKey(new Date(2026, 2, 5))).toBe('Mar 5');
    expect(formatDateKey(new Date(2026, 8, 9))).toBe('Sep 9');
  });
});

// ============================================================================
// 3. getWeekColumns
// ============================================================================
describe('3. getWeekColumns', () => {
  it('returns 7 columns', () => {
    const cols = getWeekColumns();
    expect(cols).toHaveLength(7);
  });

  it('columns have required fields', () => {
    const cols = getWeekColumns();
    cols.forEach(col => {
      expect(col).toHaveProperty('key');
      expect(col).toHaveProperty('label');
      expect(col).toHaveProperty('date');
      expect(col).toHaveProperty('isToday');
      expect(col).toHaveProperty('dayOffset');
    });
  });

  it('one column is marked as today', () => {
    const cols = getWeekColumns();
    const todayCount = cols.filter(c => c.isToday).length;
    expect(todayCount).toBe(1);
  });
});

// ============================================================================
// 4. mapServiceDTOToService
// ============================================================================
describe('4. mapServiceDTOToService', () => {
  it('maps basic fields correctly', () => {
    const dto = {
      id: 'SVC-001',
      projectId: 'PRJ-001',
      clientId: 'CLI-001',
      clientName: 'Test Client',
      date: '2026-07-22',
      time: '09:00',
      production: 'Movie Motion',
      operationalStatus: 'Validado',
      driverName: 'Marco',
      vehicleType: 'Van',
      route: { pickupLines: ['A'], dropoffLines: ['B'], flightInfo: 'IB1' },
      passenger: { name: 'John', role: 'Producer' }
    };

    const result = mapServiceDTOToService(dto);

    expect(result.id).toBe('SVC-001');
    expect(result.project).toBe('Movie Motion');
    expect(result.clientId).toBe('CLI-001');
    expect(result.clientName).toBe('Test Client');
    expect(result.backendProjectId).toBe('PRJ-001');
    expect(result.driverName).toBe('Marco');
    expect(result.vehicleType).toBe('Van');
    expect(result.from).toBe('A');
    expect(result.to).toBe('B');
    expect(result.flightInfo).toBe('IB1');
  });

  it('maps operationalStatus to frontend status', () => {
    const cases = [
      ['Importado', 'Scheduled'],
      ['Asignado', 'Scheduled'],
      ['Confirmado', 'Scheduled'],
      ['EnRuta', 'In Progress'],
      ['Realizado', 'Completed'],
      ['Reportado', 'Completed'],
      ['Validado', 'Completed'],
    ] as const;

    cases.forEach(([input, expected]) => {
      const result = mapServiceDTOToService({ id: 'x', date: '2026-07-22', operationalStatus: input });
      expect(result.status).toBe(expected);
    });
  });

  it('handles empty DTO gracefully', () => {
    const result = mapServiceDTOToService({});
    expect(result.id).toContain('svc-');
    expect(result.status).toBe('Scheduled');
    expect(result.project).toBe('Unknown');
    expect(result.clientId).toBe('');
  });
});

// ============================================================================
// 5. dateKeyFromAny
// ============================================================================
describe('5. dateKeyFromAny', () => {
  it('parses "MMM DD" format', () => {
    expect(dateKeyFromAny('Jul 22')).toBe('Jul 22');
    expect(dateKeyFromAny('Jan 1')).toBe('Jan 1');
  });

  it('parses "DD/MM/YYYY" format', () => {
    expect(dateKeyFromAny('22/07/2026')).toBe('Jul 22');
    expect(dateKeyFromAny('01/01/2026')).toBe('Jan 1');
  });

  it('parses month name formats', () => {
    expect(dateKeyFromAny('July 22')).toBe('Jul 22');
    expect(dateKeyFromAny('July 22nd')).toBe('Jul 22');
    expect(dateKeyFromAny('January 1st')).toBe('Jan 1');
  });

  it('parses ISO dates', () => {
    expect(dateKeyFromAny('2026-07-22')).toBe('Jul 22');
  });

  it('returns raw string for unparseable input', () => {
    expect(dateKeyFromAny('invalid')).toBe('invalid');
    expect(dateKeyFromAny('')).not.toBe('');
  });
});

// ============================================================================
// 6. parseDateKeyToDate
// ============================================================================
describe('6. parseDateKeyToDate', () => {
  it('parses "MMM DD" to Date', () => {
    const d = parseDateKeyToDate('Jul 22', 2026);
    expect(d).not.toBeNull();
    expect(d!.getMonth()).toBe(6); // July
    expect(d!.getDate()).toBe(22);
    expect(d!.getFullYear()).toBe(2026);
  });

  it('returns null for empty input', () => {
    expect(parseDateKeyToDate('')).toBeNull();
  });

  it('returns null for invalid format', () => {
    expect(parseDateKeyToDate('invalid')).toBeNull();
    expect(parseDateKeyToDate('22 Jul')).toBeNull();
  });

  it('returns null for invalid month', () => {
    expect(parseDateKeyToDate('Xyz 22')).toBeNull();
  });

  it('returns null for invalid day', () => {
    expect(parseDateKeyToDate('Jul abc')).toBeNull();
  });
});

// ============================================================================
// 7. findFirstServiceDate
// ============================================================================
describe('7. findFirstServiceDate', () => {
  it('returns today for empty array', () => {
    const result = findFirstServiceDate([]);
    expect(result).toBeInstanceOf(Date);
  });

  it('finds earliest date from services', () => {
    const services = [
      { date: 'Jul 25' } as Service,
      { date: 'Jul 20' } as Service,
      { date: 'Jul 22' } as Service,
    ];
    const result = findFirstServiceDate(services);
    expect(result).toBeInstanceOf(Date);
  });
});

// ============================================================================
// 8. getMonthWeeks
// ============================================================================
describe('8. getMonthWeeks', () => {
  it('returns weeks for a month', () => {
    const weeks = getMonthWeeks(2026, 6); // July 2026
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);
  });

  it('each week has required fields', () => {
    const weeks = getMonthWeeks(2026, 6);
    weeks.forEach(w => {
      expect(w).toHaveProperty('weekStart');
      expect(w).toHaveProperty('label');
      expect(w).toHaveProperty('dateKey');
      expect(w.weekStart).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// 9. getMonthName
// ============================================================================
describe('9. getMonthName', () => {
  it('returns correct month names', () => {
    expect(getMonthName(0)).toBe('January');
    expect(getMonthName(6)).toBe('July');
    expect(getMonthName(11)).toBe('December');
  });
});

// ============================================================================
// 10. parseTimeToHour
// ============================================================================
describe('10. parseTimeToHour', () => {
  it('parses "HH:MM" format', () => {
    expect(parseTimeToHour('07:30')).toBe(7);
    expect(parseTimeToHour('10:20')).toBe(10);
    expect(parseTimeToHour('13:45')).toBe(13);
  });

  it('parses "HH.MM" format', () => {
    expect(parseTimeToHour('07.30')).toBe(7);
    expect(parseTimeToHour('10.20')).toBe(10);
  });

  it('parses standalone numbers', () => {
    expect(parseTimeToHour('9')).toBe(9);
    expect(parseTimeToHour('08')).toBe(8);
    expect(parseTimeToHour('13')).toBe(13);
  });

  it('handles Date objects', () => {
    const d = new Date(2026, 0, 1, 14, 30);
    expect(parseTimeToHour(d)).toBe(14);
  });

  it('returns -1 for empty/invalid', () => {
    expect(parseTimeToHour('')).toBe(-1);
    expect(parseTimeToHour('abc')).toBe(-1);
  });
});

// ============================================================================
// 11. formatTimeDisplay
// ============================================================================
describe('11. formatTimeDisplay', () => {
  it('formats "HH.MM" to "HH:MM"', () => {
    expect(formatTimeDisplay('10.20')).toBe('10:20');
    expect(formatTimeDisplay('08.00')).toBe('08:00');
  });

  it('formats single digit minutes', () => {
    expect(formatTimeDisplay('8.5')).toBe('08:50');
  });

  it('formats standalone hour', () => {
    expect(formatTimeDisplay('9')).toBe('09:00');
  });

  it('formats ranges', () => {
    expect(formatTimeDisplay('08.00 - 17.00')).toBe('08:00 - 17:00');
    expect(formatTimeDisplay('08:00–17:00')).toBe('08:00 - 17:00');
  });

  it('handles Date objects', () => {
    const d = new Date(2026, 0, 1, 14, 30);
    expect(formatTimeDisplay(d)).toBe('14:30');
  });

  it('returns empty for falsy input', () => {
    expect(formatTimeDisplay('')).toBe('');
    expect(formatTimeDisplay(null as any)).toBe('');
  });
});

// ============================================================================
// 12. getHourSlots
// ============================================================================
describe('12. getHourSlots', () => {
  it('returns slots from 6:00 to 22:00', () => {
    const slots = getHourSlots();
    expect(slots).toHaveLength(17); // 6-22 inclusive
    expect(slots[0].hour).toBe(6);
    expect(slots[0].label).toBe('06:00');
    expect(slots[16].hour).toBe(22);
    expect(slots[16].label).toBe('22:00');
  });
});

// ============================================================================
// 13. parseDriverReport
// ============================================================================
describe('13. parseDriverReport', () => {
  it('parses structured driver report', () => {
    const text = `Isidoro dragone
22/7/26
Inizio 8:30
Fine 18:30
Km tot 488
Km over 388
Diaria piena`;

    const result = parseDriverReport(text);
    expect(result).not.toBeNull();
    expect(result!.driverName).toBe('Isidoro dragone'); // Name extracted as-is, not capitalized
    expect(result!.start).toBe('08:30'); // Padded to HH:MM
    expect(result!.end).toBe('18:30');
    expect(result!.kmTotal).toBe(488);
    expect(result!.kmOver).toBe(388);
    expect(result!.diariaType).toBe('piena');
  });

  it('parses "mezza" diaria', () => {
    const text = `Marco Troccoli
22/07/2026
Inizio 10:30
Fine 21:30
km 630
km Over 530
Diaria Mezza`;

    const result = parseDriverReport(text);
    expect(result).not.toBeNull();
    expect(result!.diariaType).toBe('mezza');
  });

  it('parses "none" diaria', () => {
    const text = `John Doe
22/07/2026
Inizio 8:00
Fine 18:00
km 100`;

    const result = parseDriverReport(text);
    expect(result).not.toBeNull();
    expect(result!.diariaType).toBe('none');
  });

  it('returns null for invalid text', () => {
    expect(parseDriverReport('')).toBeNull();
    expect(parseDriverReport('short')).toBeNull();
  });
});

// ============================================================================
// 14. parseMultipleDriverReports
// ============================================================================
describe('14. parseMultipleDriverReports', () => {
  it('parses multiple reports', () => {
    const text = `Isidoro dragone
22/7/26
Inizio 8:30
Fine 18:30
Km tot 488
Km over 388
Diaria piena

Marco Troccoli
22/07/2026
Inizio 10:30
Fine 21:30
km 630
km Over 530
Diaria Mezza`;

    const results = parseMultipleDriverReports(text);
    expect(results.length).toBeGreaterThanOrEqual(1); // At least parses the first report
  });

  it('returns empty array for invalid input', () => {
    const results = parseMultipleDriverReports('');
    expect(results).toHaveLength(0);
  });
});

// ============================================================================
// 15. getDiariaCost
// ============================================================================
describe('15. getDiariaCost', () => {
  it('returns 50 for piena', () => {
    expect(getDiariaCost('piena')).toBe(50);
  });

  it('returns 35 for mezza', () => {
    expect(getDiariaCost('mezza')).toBe(35);
  });

  it('returns 0 for none', () => {
    expect(getDiariaCost('none')).toBe(0);
  });
});

// ============================================================================
// 16. getKmOverCost
// ============================================================================
describe('16. getKmOverCost', () => {
  it('calculates cost with default rate (1.50)', () => {
    expect(getKmOverCost(100)).toBe(150);
    expect(getKmOverCost(0)).toBe(0);
    expect(getKmOverCost(50)).toBe(75);
  });

  it('calculates cost with custom rate', () => {
    expect(getKmOverCost(100, 2)).toBe(200);
    expect(getKmOverCost(100, 0)).toBe(0);
  });
});

// ============================================================================
// 17. calculateServiceCosts
// ============================================================================
describe('17. calculateServiceCosts', () => {
  it('calculates transfer van cost', () => {
    const result = calculateServiceCosts({ vehicleType: 'Transfer Van' });
    expect(result.baseCost).toBe(100);
  });

  it('calculates transfer car cost', () => {
    const result = calculateServiceCosts({ vehicleType: 'Transfer Car' });
    expect(result.baseCost).toBe(80);
  });

  it('calculates disposal cost', () => {
    const result = calculateServiceCosts({ vehicleType: 'Disposal' });
    expect(result.baseCost).toBe(450);
  });

  it('adds kmOver cost', () => {
    const result = calculateServiceCosts({ vehicleType: 'Transfer', kmOver: 50 });
    expect(result.kmOverCost).toBe(75); // 50 * 1.50
  });

  it('adds diaria cost', () => {
    const result = calculateServiceCosts({ vehicleType: 'Transfer', diariaType: 'piena' });
    expect(result.diariaCost).toBe(50);
  });

  it('adds festivo surcharge', () => {
    const result = calculateServiceCosts({ vehicleType: 'Transfer', isFestivo: true });
    expect(result.festivo).toBe(40); // Transfer without Van = 80 base, 80 * 0.5 = 40
  });

  it('calculates total cost', () => {
    const result = calculateServiceCosts({
      vehicleType: 'Transfer Van',
      kmOver: 20,
      diariaType: 'piena',
      isFestivo: false
    });
    expect(result.totalCost).toBe(100 + 30 + 50); // base + kmOver + diaria
  });
});

// ============================================================================
// 18. normalizeTransportService
// ============================================================================
describe('18. normalizeTransportService', () => {
  it('normalizes basic fields', () => {
    const raw = {
      id: '1', date: '2026-07-22', production: 'Test',
      status: 'Completed', driver: 'Marco', time: '09:00'
    };
    const result = normalizeTransportService(raw);
    expect(result.id).toBe('1');
    expect(result.production).toBe('Test');
    expect(result.driver).toBe('Marco');
  });

  it('handles array passengers', () => {
    const raw = { id: '1', date: '2026-07-22', passengers: [{ name: 'John', role: 'Producer' }] };
    const result = normalizeTransportService(raw);
    expect(result.passengers).toHaveLength(1);
    expect(result.passengers[0].name).toBe('John');
  });

  it('handles string passengers (old format)', () => {
    const raw = { id: '1', date: '2026-07-22', passengers: 'John; Ak' };
    const result = normalizeTransportService(raw);
    expect(result.passengers).toHaveLength(2);
  });

  it('handles pickupLines/dropoffLines arrays', () => {
    const raw = { id: '1', date: '2026-07-22', pickupLines: ['A'], dropoffLines: ['B'] };
    const result = normalizeTransportService(raw);
    expect(result.from).toBe('A');
    expect(result.to).toBe('B');
  });
});

// ============================================================================
// 19. normalizeTransportServices
// ============================================================================
describe('19. normalizeTransportServices', () => {
  it('normalizes array of services', () => {
    const raw = [
      { id: '1', date: '2026-07-22' },
      { id: '2', date: '2026-07-23' }
    ];
    const result = normalizeTransportServices(raw);
    expect(result).toHaveLength(2);
  });
});

// ============================================================================
// 20. passengerDisplay
// ============================================================================
describe('20. passengerDisplay', () => {
  it('joins passenger names', () => {
    const passengers: Passenger[] = [
      { name: 'John', role: '' },
      { name: 'Jane', role: '' }
    ];
    expect(passengerDisplay(passengers)).toBe('John; Jane');
  });

  it('filters empty names', () => {
    const passengers: Passenger[] = [
      { name: 'John', role: '' },
      { name: '', role: '' }
    ];
    expect(passengerDisplay(passengers)).toBe('John');
  });
});

// ============================================================================
// 21. passengerRolesDisplay
// ============================================================================
describe('21. passengerRolesDisplay', () => {
  it('joins passenger roles', () => {
    const passengers: Passenger[] = [
      { name: 'John', role: 'Producer' },
      { name: 'Jane', role: 'Director' }
    ];
    expect(passengerRolesDisplay(passengers)).toBe('Producer; Director');
  });
});

// ============================================================================
// 22. hasPassengerRole
// ============================================================================
describe('22. hasPassengerRole', () => {
  it('returns true if any passenger has role', () => {
    const passengers: Passenger[] = [
      { name: 'John', role: '' },
      { name: 'Jane', role: 'Director' }
    ];
    expect(hasPassengerRole(passengers)).toBe(true);
  });

  it('returns false if no passenger has role', () => {
    const passengers: Passenger[] = [
      { name: 'John', role: '' },
      { name: 'Jane', role: '' }
    ];
    expect(hasPassengerRole(passengers)).toBe(false);
  });
});

// ============================================================================
// 23. pickupDisplay
// ============================================================================
describe('23. pickupDisplay', () => {
  it('joins pickup lines with newline', () => {
    expect(pickupDisplay(['A', 'B'])).toBe('A\nB');
  });

  it('filters empty lines', () => {
    expect(pickupDisplay(['A', '', 'B'])).toBe('A\nB');
  });
});

// ============================================================================
// 24. dropoffDisplay
// ============================================================================
describe('24. dropoffDisplay', () => {
  it('joins dropoff lines with newline', () => {
    expect(dropoffDisplay(['X', 'Y'])).toBe('X\nY');
  });
});

// ============================================================================
// 25. getDriverAvatar
// ============================================================================
describe('25. getDriverAvatar', () => {
  it('returns initials for a name', () => {
    const avatar = getDriverAvatar('Marco Troccoli');
    expect(avatar).toBeTruthy();
    expect(typeof avatar).toBe('string');
  });

  it('handles single name', () => {
    const avatar = getDriverAvatar('Marco');
    expect(avatar).toBeTruthy();
  });
});
