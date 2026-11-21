import { describe, it, expect } from 'vitest';
import { permissionForPath, firstAllowedRoute } from '../lib/access';

/**
 * Regression coverage for the "role pending" incident: an approved account
 * whose Role column still held the registration sentinel 'pending' logged in
 * successfully, saw an empty sidebar, and then crashed on the default route
 * because /dashboard answered 403.
 */
describe('access: permissionForPath', () => {
  it('maps a nav route to its permission', () => {
    expect(permissionForPath('/dashboard')).toBe('report.dashboard');
    expect(permissionForPath('/user-management')).toBe('userManagement');
  });

  it('leaves unknown and service-workspace routes ungated', () => {
    expect(permissionForPath('/service/SVC-001/margins')).toBeNull();
    expect(permissionForPath('/something-else')).toBeNull();
  });
});

describe('access: firstAllowedRoute', () => {
  const matrix: Record<string, string> = {
    'report.dashboard': 'admin,coordinator,accounting',
    'service.list': 'admin,coordinator,accounting',
    'driverReport.list': 'admin,coordinator,driver',
    'document.list': 'admin,coordinator,accounting,driver',
  };
  const canFor = (role: string) => (permission: string) =>
    (matrix[permission] || '').split(',').includes(role);

  it('sends admin to the executive dashboard', () => {
    expect(firstAllowedRoute(canFor('admin'))).toBe('/dashboard');
  });

  it('sends a driver to driver reports, never to the dashboard', () => {
    expect(firstAllowedRoute(canFor('driver'))).toBe('/driver-reports');
  });

  it('sends a user with no assigned role to the no-access screen', () => {
    expect(firstAllowedRoute(canFor('pending'))).toBe('/no-access');
  });
});
