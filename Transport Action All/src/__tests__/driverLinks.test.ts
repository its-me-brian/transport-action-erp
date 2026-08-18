/**
 * Tests for Driver Links API functions
 * 
 * Tests: generateDriverLink, getDriverLinks, deactivateDriverLink
 * 
 * These functions communicate with the Google Apps Script backend.
 * gasGet sends params as URL query string, gasPost sends as JSON body.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateDriverLink,
  getDriverLinks,
  deactivateDriverLink,
  DriverLinkDTO
} from '../services/api';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

describe('Driver Links API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('generateDriverLink', () => {
    it('should send correct params via POST body', async () => {
      const mockResponse = {
        success: true,
        token: 'dl-ta-abc123',
        link: 'https://script.google.com/macros/s/test/exec?action=driverForm&token=dl-ta-abc123',
        expiresAt: '2026-07-23T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      });

      const result = await generateDriverLink('DRV-001', 'PRJ-001', '2026-07-22', '2026-07-28');

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledOnce();
      
      // Verify URL has action param
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('action=generateDriverLink');

      // Verify POST body has the params
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.driverId).toBe('DRV-001');
      expect(body.projectId).toBe('PRJ-001');
      expect(body.dateFrom).toBe('2026-07-22');
      expect(body.dateTo).toBe('2026-07-28');

      // Verify response
      expect((result as any).success).toBe(true);
      expect(result.token).toBe('dl-ta-abc123');
      expect(result.link).toContain('token=dl-ta-abc123');
      expect(result.expiresAt).toBeDefined();
    });

    it('should handle backend errors', async () => {
      const mockResponse = {
        success: false,
        error: 'driverId is required'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      });

      const result = await generateDriverLink('', 'PRJ-001', '2026-07-22', '2026-07-28');

      expect((result as any).success).toBe(false);
      expect((result as any).error).toBe('driverId is required');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        generateDriverLink('DRV-001', 'PRJ-001', '2026-07-22', '2026-07-28')
      ).rejects.toThrow('Network error');
    });
  });

  describe('getDriverLinks', () => {
    it('should fetch all links via GET with action param', async () => {
      const mockLinks = [
        { Token: 'token-1', DriverID: 'DRV-001', Status: 'active' },
        { Token: 'token-2', DriverID: 'DRV-002', Status: 'inactive' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockLinks })
      });

      const result = await getDriverLinks();

      expect(mockFetch).toHaveBeenCalledOnce();
      
      // gasGet sends params as URL query string
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('action=getDriverLinks');
      
      expect(result).toHaveLength(2);
    });

    it('should pass filters as URL params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

      await getDriverLinks({ driverId: 'DRV-001', status: 'active' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('driverId=DRV-001');
      expect(url).toContain('status=active');
    });
  });

  describe('deactivateDriverLink', () => {
    it('should send token via POST body', async () => {
      const mockResponse = { success: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      });

      const result = await deactivateDriverLink('token-to-revoke');

      expect(mockFetch).toHaveBeenCalledOnce();
      
      // Verify URL has action
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('action=deactivateDriverLink');
      
      // Verify POST body has linkToken
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.linkToken).toBe('token-to-revoke');
      
      expect(result.success).toBe(true);
    });

    it('should handle invalid token', async () => {
      const mockResponse = { success: false, error: 'Link not found' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      });

      const result = await deactivateDriverLink('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Link not found');
    });
  });
});
