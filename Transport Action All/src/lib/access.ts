import { NAV_SECTIONS } from '../components/Sidebar';

/**
 * Route → permission map derived from the same NAV_SECTIONS the sidebar uses,
 * so a screen can never be hidden in the menu but reachable by URL (or the
 * other way around).
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {};
NAV_SECTIONS.forEach(section => {
  section.items.forEach(item => {
    ROUTE_PERMISSIONS[item.route] = item.permission;
  });
});

/**
 * Permission required for a concrete pathname, or null when the route is not
 * gated by the navigation matrix.
 *
 * /service/:id is intentionally ungated: drivers access their own service
 * workspace through it and ownership is enforced by the backend.
 */
export function permissionForPath(pathname: string): string | null {
  const exact = ROUTE_PERMISSIONS[pathname];
  if (exact) return exact;
  return null;
}

/**
 * First route the current user may open, used as the landing page after login
 * and as the target for unknown URLs. A pending/unknown role has no permitted
 * route, so it falls back to the "no access" screen instead of the dashboard.
 */
export function firstAllowedRoute(can: (permission: string) => boolean): string {
  for (const section of NAV_SECTIONS) {
    const item = section.items.find(entry => can(entry.permission));
    if (item) return item.route;
  }
  return '/no-access';
}
