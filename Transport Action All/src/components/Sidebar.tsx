import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Users,
  Building,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  FolderOpen,
  Bell,
  DollarSign,
  BarChart3,
  Car,
  ClipboardCheck,
  Activity,
  Link2,
  Inbox,
  Settings,
  FileText,
  FileSpreadsheet,
  Handshake,
  UserRound,
  Building2,
  ArrowLeftRight,
  LayoutDashboard
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ScreenId } from '../types';
import { screenToRoute } from '../routes';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  onNavigate: (screen: ScreenId) => void;
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
}

type SidebarMode = 'full' | 'icons' | 'hidden';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: React.ElementType;
  permission: string;
  route: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const routeToScreen: Record<string, ScreenId> = {};
Object.entries(screenToRoute).forEach(([screen, route]) => {
  routeToScreen[route] = screen as ScreenId;
});

// ============================================================================
// NAVIGATION STRUCTURE — Organized by functional domain
// ============================================================================
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OPERATIONS',
    items: [
      { id: 'executive_dashboard', label: 'Dashboard',     icon: LayoutDashboard, permission: 'report.dashboard', route: '/dashboard' },
      { id: 'transport',           label: 'Transport',      icon: Calendar,        permission: 'service.list',     route: '/transport' },
      { id: 'driver_reports',      label: 'Driver Reports', icon: ClipboardCheck,  permission: 'driverReport.list', route: '/driver-reports' },
      { id: 'driver_links',        label: 'Driver Links',   icon: Link2,           permission: 'driverLink.list',  route: '/driver-links' },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { id: 'rapportinos', label: 'Rapportinos',       icon: FileSpreadsheet, permission: 'rapportinoClient.list', route: '/rapportinos' },
      { id: 'reconciliation', label: 'Reconciliation', icon: ArrowLeftRight,  permission: 'reconciliation.check',  route: '/reconciliation' },
      { id: 'accounting',  label: 'Accounting',         icon: DollarSign,      permission: 'invoice.list',          route: '/accounting' },
      { id: 'financial',   label: 'Financial Reports',  icon: BarChart3,       permission: 'invoice.list',          route: '/financial' },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { id: 'customers', label: 'Customers', icon: Building2,  permission: 'client.list',      route: '/customers' },
      { id: 'providers', label: 'Providers', icon: Handshake,  permission: 'collaborator.list', route: '/providers' },
      { id: 'drivers',   label: 'Drivers',   icon: UserRound,  permission: 'driver.list',       route: '/drivers' },
      { id: 'vehicles',  label: 'Vehicles',  icon: Car,        permission: 'vehicle.list',      route: '/vehicles' },
      { id: 'projects',  label: 'Projects',  icon: FolderOpen, permission: 'project.list',      route: '/projects' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'audit_center',    label: 'Audit Center',    icon: Activity,  permission: 'auditLog.read',   route: '/audit-center' },
      { id: 'active_users',    label: 'Active Users',    icon: Bell,      permission: 'presence.read',   route: '/active-users' },
      { id: 'user_management', label: 'Users & Roles',   icon: Users,     permission: 'userManagement',  route: '/user-management' },
      { id: 'settings',        label: 'Settings',        icon: Settings,  permission: 'settings.read',   route: '/settings' },
      { id: 'documents',       label: 'Documents',       icon: FileText,  permission: 'document.list',   route: '/documents' },
    ],
  },
];

export default function Sidebar({ onNavigate, mode, onModeChange }: SidebarProps) {
  const { user, logout, can } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentScreen: ScreenId = useMemo(() => {
    if (location.pathname.startsWith('/service/')) return 'transport';
    return routeToScreen[location.pathname] || 'executive_dashboard';
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('sidebarMode', mode);
  }, [mode]);

  // Filter sections by permission
  const visibleSections = NAV_SECTIONS
    .map(section => ({
      ...section,
      items: section.items.filter(item => can(item.permission)),
    }))
    .filter(section => section.items.length > 0);

  const toggleMode = () => {
    if (mode === 'full') onModeChange('icons');
    else if (mode === 'icons') onModeChange('hidden');
    else onModeChange('full');
  };

  // Hidden mode — floating toggle only
  if (mode === 'hidden' && !mobileOpen) {
    return (
      <>
        <button
          onClick={() => onModeChange('full')}
          className="hidden md:flex fixed top-4 left-4 z-50 w-10 h-10 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-md items-center justify-center hover:bg-surface-container-low transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5 text-on-surface" />
        </button>
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-md flex items-center justify-center hover:bg-surface-container-low transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 text-on-surface" />
        </button>
      </>
    );
  }

  const isCollapsed = mode === 'icons';
  const sidebarWidth = isCollapsed ? 'w-[68px]' : 'w-[260px]';

  return (
    <>
      {/* Mobile hamburger — visible on md:hidden when sidebar is closed */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-md flex items-center justify-center hover:bg-surface-container-low transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 text-on-surface" />
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer (full width on mobile, fixed sidebar on desktop) */}
      <aside
        id="sidebar-container"
        className={`fixed left-0 top-0 h-full border-r border-outline-variant z-40 px-3 py-4 transition-all duration-300 bg-surface-dim text-on-surface ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${sidebarWidth}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div id="sidebar-header" className={`flex items-center gap-3 px-2 mb-6 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-highest shrink-0">
              <img alt="Transport Action Logo" className="w-full h-full object-contain" src="/logo.jpg" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-headline-md text-primary font-bold text-sm">Transport Movie System</span>
                <span className="text-[11px] text-on-surface-variant">Action</span>
              </div>
            )}
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={toggleMode}
            className="flex items-center justify-center gap-2 mb-4 mx-2 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors text-[11px]"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>

          {/* Navigation — Section-based */}
          <nav id="sidebar-nav" className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
            {visibleSections.map((section) => (
              <div key={section.title}>
                {/* Section header */}
                {!isCollapsed && (
                  <div className="px-3 mb-1 text-[10px] font-semibold tracking-wider text-on-surface-variant/60 uppercase">
                    {section.title}
                  </div>
                )}
                {isCollapsed && (
                  <div className="mx-auto mb-1 w-4 h-px bg-outline-variant/50" />
                )}

                {/* Section items */}
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentScreen === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`sidebar-link-${item.id}`}
                        onClick={() => {
                          onNavigate(item.id);
                          setMobileOpen(false);
                        }}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 cursor-pointer font-sans text-[13px] font-medium ${
                          isCollapsed ? 'justify-center' : ''
                        } ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                        }`}
                        title={isCollapsed ? item.label : undefined}
                        aria-label={item.label}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`} />
                        {!isCollapsed && <span className="flex-1">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer — User info + Logout */}
          <div id="sidebar-footer" className={`mt-auto pt-3 border-t border-outline-variant/50 ${isCollapsed ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-3'}`}>
            {isCollapsed ? (
              <>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px] font-bold" title={user?.username || 'User'}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <button
                  onClick={() => logout()}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px] font-bold shrink-0">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-sans font-medium text-[13px] text-on-surface truncate">{user?.username || 'User'}</span>
                    <span className="text-[11px] text-on-surface-variant truncate">
                      {user?.role === 'admin' ? 'Administrator' :
                       user?.role === 'coordinator' ? 'Coordinator' :
                       user?.role === 'accounting' ? 'Accounting' :
                       user?.role === 'driver' ? 'Driver' : 'User'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors mx-1"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
