/**
 * Tests for mapServiceDTOToService function
 * 
 * Tests the mapping from backend Service DTO to frontend Service type,
 * specifically the clientId, clientName, and backendProjectId resolution.
 */
import { describe, it, expect } from 'vitest';
import { mapServiceDTOToService } from '../types';

describe('mapServiceDTOToService', () => {
  it('should map clientId and clientName from DTO', () => {
    const dto = {
      id: 'SVC-001',
      projectId: 'PRJ-001',
      clientId: 'CLI-001',
      clientName: 'Test Client Corp',
      date: '2026-07-22',
      time: '09:00',
      production: 'Movie Motion',
      operationalStatus: 'Validado',
      driverName: 'Marco Troccoli',
      vehicleType: 'Van',
      route: {
        pickupLines: ['Aeropuerto T4'],
        dropoffLines: ['Hotel Ritz'],
        flightInfo: 'IB1234'
      },
      passenger: {
        name: 'John Doe',
        role: 'Producer'
      }
    };

    const result = mapServiceDTOToService(dto);

    expect(result.id).toBe('SVC-001');
    expect(result.clientId).toBe('CLI-001');
    expect(result.clientName).toBe('Test Client Corp');
    expect(result.backendProjectId).toBe('PRJ-001');
    expect(result.project).toBe('Movie Motion'); // production name
  });

  it('should handle missing clientId/clientName', () => {
    const dto = {
      id: 'SVC-002',
      projectId: 'PRJ-002',
      date: '2026-07-22',
      operationalStatus: 'Importado'
    };

    const result = mapServiceDTOToService(dto);

    expect(result.clientId).toBe('');
    expect(result.clientName).toBe('');
    expect(result.backendProjectId).toBe('PRJ-002');
  });

  it('should map operationalStatus to frontend status', () => {
    const testCases = [
      { operationalStatus: 'Importado', expected: 'Scheduled' },
      { operationalStatus: 'Asignado', expected: 'Scheduled' },
      { operationalStatus: 'Confirmado', expected: 'Scheduled' },
      { operationalStatus: 'EnRuta', expected: 'In Progress' },
      { operationalStatus: 'Realizado', expected: 'Completed' },
      { operationalStatus: 'Reportado', expected: 'Completed' },
      { operationalStatus: 'Validado', expected: 'Completed' },
    ];

    testCases.forEach(({ operationalStatus, expected }) => {
      const dto = {
        id: 'SVC-003',
        operationalStatus,
        date: '2026-07-22'
      };
      const result = mapServiceDTOToService(dto);
      expect(result.status).toBe(expected);
    });
  });

  it('should map route data correctly', () => {
    const dto = {
      id: 'SVC-004',
      date: '2026-07-22',
      route: {
        pickupLines: ['Aeropuerto T4', 'Terminal 1'],
        dropoffLines: ['Hotel Ritz', 'Paseo del Prado'],
        flightInfo: 'IB1234'
      }
    };

    const result = mapServiceDTOToService(dto);

    expect(result.from).toBe('Aeropuerto T4');
    expect(result.to).toBe('Hotel Ritz');
    expect(result.flightInfo).toBe('IB1234');
  });

  it('should map driver and vehicle info', () => {
    const dto = {
      id: 'SVC-005',
      date: '2026-07-22',
      driverName: 'Marco Troccoli',
      vehicleType: 'Van',
      operatingCompany: 'Transport Action'
    };

    const result = mapServiceDTOToService(dto);

    expect(result.driverName).toBe('Marco Troccoli');
    expect(result.vehicleType).toBe('Van');
    expect(result.company).toBe('Transport Action');
  });

  it('should handle empty DTO gracefully', () => {
    const dto = {};
    const result = mapServiceDTOToService(dto);

    expect(result.id).toContain('svc-');
    expect(result.status).toBe('Scheduled');
    expect(result.project).toBe('Unknown');
    expect(result.clientId).toBe('');
    expect(result.clientName).toBe('');
  });
});
