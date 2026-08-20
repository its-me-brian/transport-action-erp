import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Calendar, ClipboardList, FileSpreadsheet, Users, Building, LogOut } from 'lucide-react';
import { 
  ScreenId, 
  Service, 
  Driver, 
  ViewMode,
  findFirstServiceDate,
  mapServiceDTOToService
} from './types';
import { getServices, getDrivers, gasPost, DriverRecord } from './services/api';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar, { NAV_SECTIONS } from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import DashboardScreen from './components/DashboardScreen';
import ExecutiveDashboardScreen from './components/ExecutiveDashboardScreen';
import CompanySettingsScreen from './components/CompanySettingsScreen';
import ReportsScreen from './components/ReportsScreen';
import TransportListScreen from './components/TransportListScreen';
import NewServiceScreen from './components/NewServiceScreen';
import DriverPanelScreen from './components/DriverPanelScreen';
import ProjectScreen from './components/ProjectScreen';
import ContactScreen from './components/ContactScreen';
import ClientScreen from './components/ClientScreen';
import CollaboratorScreen from './components/CollaboratorScreen';
import VehicleScreen from './components/VehicleScreen';
import UserManagementScreen from './components/UserManagementScreen';
import FinancialDashboard from './components/FinancialDashboard';
import DriverLinksScreen from './components/DriverLinksScreen';
import ActiveUsersScreen from './components/ActiveUsersScreen';
import AccountingScreen from './components/AccountingScreen';
import AuditCenterScreen from './components/AuditCenterScreen';
import RapportinoScreen from './components/RapportinoScreen';
import DriverReportsScreen from './components/DriverReportsScreen';
import ReconciliationScreen from './components/ReconciliationScreen';
import DriverRateScreen from './components/DriverRateScreen';
import RateCardScreen from './components/RateCardScreen';
import DriverAdvanceScreen from './components/DriverAdvanceScreen';
import ChangesScreen from './components/ChangesScreen';
import ActivityFeedScreen from './components/ActivityFeedScreen';
import DocumentScreen from './components/DocumentScreen';

export default function App() {
  const { user, token, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  // Navigation states - with persistence
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    const saved = localStorage.getItem('currentScreen');
    return (saved as ScreenId) || 'executive_dashboard';
  });
  const [transitionType, setTransitionType] = useState<'none' | 'slide_up' | 'push' | 'push_back'>('none');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Master Data states
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Load drivers from API — only when authenticated
  useEffect(() => {
    if (!token) {
      setDrivers([]);
      return;
    }
    getDrivers().then(data => {
      const raw: DriverRecord[] = Array.isArray(data) ? data : [];
      // Dedup by ID first, then by name
      const byId = new Map<string, DriverRecord>();
      const byName = new Map<string, Driver>();
      raw.forEach(d => {
        const name = (d.name || '').trim();
        if (!name) return;
        const id = (d.id || '').trim();
        if (id && byId.has(id)) {
          const existing = byId.get(id)!;
          if (!existing.vehiclePreferred && d.vehiclePreferred) existing.vehiclePreferred = d.vehiclePreferred;
          if (!existing.phone && d.phone) existing.phone = d.phone;
          return;
        }
        byId.set(id || `gen-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, { ...d, name });
      });
      const mapped: Driver[] = [];
      byId.forEach(d => {
        const key = d.name.toLowerCase().replace(/\s+/g, ' ').replace(/['']/g, "'").trim();
        const existing = byName.get(key);
        if (existing) {
          if (!existing.vehicle && d.vehiclePreferred) existing.vehicle = d.vehiclePreferred;
          return;
        }
        const driver: Driver = {
          id: d.id || '',
          name: d.name,
          avatar: '',
          status: (d.status || 'Disponible') as 'Disponible' | 'Asignado' | 'Inactivo',
          vehicle: d.vehiclePreferred || '',
          nextShift: d.lastUsed || '—',
          currentLocation: '',
        };
        byName.set(key, driver);
        mapped.push(driver);
      });
      setDrivers(mapped);
    }).catch(err => {
      console.warn('[App] Failed to load drivers:', err);
    });
  }, [token]);

  // Calendar base date — always starts on today
  const [baseDate, setBaseDate] = useState<Date>(() => {
    return new Date();
  });
  
  // Calendar view mode: 'week' or 'month'
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('viewMode');
    return (saved as ViewMode) || 'month';
  });

  // Persist navigation state
  useEffect(() => {
    localStorage.setItem('currentScreen', currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    localStorage.setItem('baseDate', baseDate.toISOString());
  }, [baseDate]);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  // Fetch real data from API — only when authenticated
  useEffect(() => {
    if (!token) {
      setServices([]);
      setIsLoadingServices(false);
      return;
    }
    setIsLoadingServices(true);
    getServices()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(mapServiceDTOToService);
          setServices(mapped);
          // Auto-navigate to the week containing the earliest service
          setBaseDate(findFirstServiceDate(mapped));
        } else {
          setServices([]);
        }
      })
      .catch(e => {
        console.error('[App] Failed to load services:', e);
        setServices([]);
      })
      .finally(() => setIsLoadingServices(false));
  }, [token]);

  // Refresh services function (called after import)
  const refreshServices = useCallback(() => {
    setIsLoadingServices(true);
    getServices()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(mapServiceDTOToService);
          setServices(mapped);
        } else {
          setServices([]);
        }
      })
      .catch(e => console.error('Failed to load services:', e))
      .finally(() => setIsLoadingServices(false));
  }, []);

  // Presence heartbeat — runs globally while authenticated
  useEffect(() => {
    if (!token) return;
    // Generate a unique session ID for this browser tab (persists across heartbeats)
    const sessionId = `ses-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sendHeartbeat = () => {
      gasPost('heartbeat', { token, userAgent: navigator.userAgent, sessionId }).catch(e => console.error('Heartbeat failed:', e));
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 25 * 1000); // every 25s (backend timeout: 90s)
    return () => clearInterval(interval);
  }, [token]);

  // Handle navigation
  const handleNavigate = (screen: ScreenId, transition: 'none' | 'slide_up' | 'push' | 'push_back' = 'none') => {
    setTransitionType(transition);
    setCurrentScreen(screen);
    setMobileMenuOpen(false);
  };

  // Add manually created services
  const handleAddService = (newService: Service) => {
    // Use the ID from the service (may be real backend ID or fallback man-* ID)
    setServices(prev => [newService, ...prev]);
  };

  // Update a service in the local state (after editing)
  const handleServiceUpdate = (serviceId: string, updates: Partial<Service>) => {
    // Special case: 'Deleted' status means remove from list
    if ((updates as Record<string, unknown>).status === 'Deleted') {
      setServices(prev => prev.filter(s => s.id !== serviceId));
      return;
    }
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, ...updates } : s));
  };

  // Define motion variables dynamically based on transitionType
  const getMotionProps = () => {
    switch (transitionType) {
      case 'slide_up':
        return {
          initial: { y: '50px', opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: '-50px', opacity: 0 },
          transition: { ease: 'easeInOut', duration: 0.25 }
        };
      case 'push':
        return {
          initial: { x: '80px', opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: '-80px', opacity: 0 },
          transition: { ease: 'easeInOut', duration: 0.25 }
        };
      case 'push_back':
        return {
          initial: { x: '-80px', opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: '80px', opacity: 0 },
          transition: { ease: 'easeInOut', duration: 0.25 }
        };
      case 'none':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0 }
        };
    }
  };

  // Render correct active screen
  const renderScreen = () => {
    switch (currentScreen) {
      // === NEW SIDEBAR ROUTING (14 items in 4 sections) ===

      // OPERATIONS
      case 'executive_dashboard':
        return <ExecutiveDashboardScreen onNavigate={handleNavigate} />;
      case 'transport':
        return (
          <DashboardScreen 
            services={services} 
            isLoading={isLoadingServices}
            baseDate={baseDate}
            onBaseDateChange={setBaseDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNavigate={handleNavigate}
            onServiceUpdate={handleServiceUpdate}
          />
        );
      case 'transport_list':
        return (
          <TransportListScreen 
            onNavigate={handleNavigate}
            onImportComplete={refreshServices}
          />
        );
      case 'driver_reports':
        return <DriverReportsScreen onNavigate={handleNavigate} />;
      case 'driver_links':
        return <DriverLinksScreen onNavigate={handleNavigate} />;

      // FINANCE
      case 'rapportinos':
        return <RapportinoScreen onNavigate={handleNavigate} />;
      case 'reconciliation':
        return <ReconciliationScreen onNavigate={handleNavigate} />;
      case 'accounting':
        return <AccountingScreen onNavigate={handleNavigate} />;
      case 'financial':
        return <FinancialDashboard onNavigate={handleNavigate} />;

      // MANAGEMENT
      case 'customers':
        return <ClientScreen onNavigate={handleNavigate} />;
      case 'providers':
        return <CollaboratorScreen onNavigate={handleNavigate} />;
      case 'drivers':
      case 'driver_panel':
        return <DriverPanelScreen drivers={drivers} onNavigate={handleNavigate} />;
      case 'vehicles':
        return <VehicleScreen onNavigate={handleNavigate} />;
      case 'projects':
        return <ProjectScreen onNavigate={handleNavigate} />;

      // SYSTEM
      case 'audit_center':
        return <AuditCenterScreen onNavigate={handleNavigate} />;
      case 'active_users':
        return <ActiveUsersScreen onNavigate={handleNavigate} />;
      case 'user_management':
        return <UserManagementScreen onNavigate={handleNavigate} />;
      case 'settings':
        return <CompanySettingsScreen onNavigate={handleNavigate} />;

      // INTERNAL (hidden from sidebar)
      case 'new_service':
        return <NewServiceScreen onAddService={handleAddService} onNavigate={handleNavigate} />;

      // === BACKWARDS-COMPAT REDIRECTS (old bookmarks / deep links) ===
      case 'dashboard':
        return <DashboardScreen services={services} isLoading={isLoadingServices} baseDate={baseDate} onBaseDateChange={setBaseDate} viewMode={viewMode} onViewModeChange={setViewMode} onNavigate={handleNavigate} onServiceUpdate={handleServiceUpdate} />;
      case 'reports':
        return <ReportsScreen services={services} drivers={drivers} onNavigate={handleNavigate} onServiceUpdate={handleServiceUpdate} />;
      case 'changes':
        return <ChangesScreen onNavigate={handleNavigate} />;
      case 'activity_feed':
        return <ActivityFeedScreen onNavigate={handleNavigate} />;
      case 'documents':
        return <DocumentScreen onNavigate={handleNavigate} />;
      case 'invoices':
      case 'payments':
      case 'expenses':
        // Redirect to Accounting
        return <AccountingScreen onNavigate={handleNavigate} />;
      case 'contacts':
        return <ContactScreen onNavigate={handleNavigate} />;
      case 'driver_rates':
        return <DriverRateScreen onNavigate={handleNavigate} />;
      case 'rate_cards':
        return <RateCardScreen onNavigate={handleNavigate} />;
      case 'driver_advances':
        return <DriverAdvanceScreen onNavigate={handleNavigate} />;
      case 'report_inbox':
        // Redirect to Driver Reports
        return <DriverReportsScreen onNavigate={handleNavigate} />;
      case 'company_settings':
        return <CompanySettingsScreen onNavigate={handleNavigate} />;

      default:
        return (
          <DashboardScreen 
            services={services} 
            isLoading={isLoadingServices}
            baseDate={baseDate}
            onBaseDateChange={setBaseDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNavigate={handleNavigate}
            onServiceUpdate={handleServiceUpdate}
          />
        );
    }
  };

  // Sidebar mode state - lifted from Sidebar for layout sync
  type SidebarMode = 'full' | 'icons' | 'hidden';
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    const saved = localStorage.getItem('sidebarMode');
    return (saved as SidebarMode) || 'full';
  });

  // Suppress side navigation entirely for New Service Transaction flow
  const hideSidebar = currentScreen === 'new_service';

  // Auth guard - show login if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-on-surface-variant text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <ToastProvider>
          <AuthScreen />
        </ToastProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div id="application-container" className="min-h-screen bg-background text-on-surface font-sans flex">
      {/* Desktop Sidebar Nav */}
      {!hideSidebar && (
        <Sidebar currentScreen={currentScreen} onNavigate={(scr) => handleNavigate(scr, 'none')} mode={sidebarMode} onModeChange={setSidebarMode} />
      )}

      {/* Main Body Column */}
      <div 
        id="main-body-column" 
        className={`flex-1 flex flex-col h-dvh overflow-hidden transition-all duration-300 ${
          !hideSidebar 
            ? sidebarMode === 'hidden' 
              ? 'md:pl-0' 
              : sidebarMode === 'icons' 
                ? 'md:pl-[88px]' 
                : 'md:pl-[280px]'
            : ''
        }`}
      >
        {/* Mobile Header Nav */}
        {!hideSidebar && (
          <header id="mobile-navigation-header" className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-outline-variant z-40 shrink-0 sticky top-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container border border-outline-variant">
                <img 
                  alt="Transport Action Logo" 
                  className="w-full h-full object-contain" 
                  src="/logo.jpg"
                />
              </div>
              <span className="font-headline-md text-base text-primary font-bold">Transport Movie System</span>
            </div>
            
            <button 
              id="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 hover:bg-surface-container rounded-lg text-on-surface transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </header>
        )}

        {/* Mobile Nav Drawer — mirrors desktop Sidebar NAV_SECTIONS */}
        {mobileMenuOpen && !hideSidebar && (
          <div id="mobile-nav-drawer" className="md:hidden fixed inset-x-0 top-[61px] bottom-0 bg-black/50 z-50 backdrop-blur-xs">
            <div className="bg-surface border-b border-outline-variant p-4 flex flex-col gap-3 shadow-lg max-h-[80vh] overflow-y-auto">
              {NAV_SECTIONS.map(section => (
                <div key={section.title}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60 px-3 mb-1">
                    {section.title}
                  </p>
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const isActive = currentScreen === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id, 'none')}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Screen Content Window */}
        <div id="content-viewport" className="flex-1 flex flex-col relative w-full h-full min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              id={`motion-screen-wrapper-${currentScreen}`}
              className="flex-1 flex flex-col h-full w-full"
              {...getMotionProps()}
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}
