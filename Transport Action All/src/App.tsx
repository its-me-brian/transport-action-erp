import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
import { screenToRoute } from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import DashboardScreen from './components/DashboardScreen';
import ExecutiveDashboardScreen from './components/ExecutiveDashboardScreen';
import CompanySettingsScreen from './components/CompanySettingsScreen';
import ReportsScreen from './components/ReportsScreen';
import TransportListScreen from './components/TransportListScreen';
import NewServiceScreen from './components/NewServiceScreen';
import DriverPanelScreen from './components/DriverPanelScreen';
import ProjectScreen from './components/ProjectScreen';
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
import RateCardScreen from './components/RateCardScreen';
import DocumentScreen from './components/DocumentScreen';
import ServiceWorkspacePage from './components/ServiceWorkspacePage';

type SidebarMode = 'full' | 'icons' | 'hidden';

export default function App() {
  const { user, token, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const location = useLocation();
  const routerNavigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    if (!token) { setDrivers([]); return; }
    getDrivers().then(data => {
      const raw: DriverRecord[] = Array.isArray(data) ? data : [];
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
        byId.set(id || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, { ...d, name });
      });
      const mapped: Driver[] = [];
      byId.forEach(d => {
        const key = d.name.toLowerCase().replace(/\s+/g, ' ').replace(/['']/g, "'").trim();
        const existing = byName.get(key);
        if (existing) {
          if (!existing.vehicle && d.vehiclePreferred) existing.vehicle = d.vehiclePreferred;
          return;
        }
        mapped.push({
          id: d.id || '', name: d.name, avatar: '',
          status: (d.status || 'Disponible') as 'Disponible' | 'Asignado' | 'Inactivo',
          vehicle: d.vehiclePreferred || '', nextShift: d.lastUsed || '—', currentLocation: '',
        });
        byName.set(key, mapped[mapped.length - 1]);
      });
      setDrivers(mapped);
    }).catch(err => console.warn('[App] Failed to load drivers:', err));
  }, [token]);

  const [baseDate, setBaseDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'month';
  });

  useEffect(() => { localStorage.setItem('viewMode', viewMode); }, [viewMode]);

  useEffect(() => {
    if (!token) { setServices([]); setIsLoadingServices(false); return; }
    setIsLoadingServices(true);
    getServices()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setServices(data.map(mapServiceDTOToService));
          setBaseDate(findFirstServiceDate(data.map(mapServiceDTOToService)));
        } else { setServices([]); }
      })
      .catch(e => { console.error('[App] Failed to load services:', e); setServices([]); })
      .finally(() => setIsLoadingServices(false));
  }, [token]);

  const refreshServices = useCallback(() => {
    setIsLoadingServices(true);
    getServices()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setServices(data.map(mapServiceDTOToService));
        } else { setServices([]); }
      })
      .catch(e => console.error('Failed to load services:', e))
      .finally(() => setIsLoadingServices(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    const sessionId = `ses-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sendHeartbeat = () => {
      gasPost('heartbeat', { token, userAgent: navigator.userAgent, sessionId }).catch(e => console.error('Heartbeat failed:', e));
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 25000);
    return () => clearInterval(interval);
  }, [token]);

  const handleNavigate = useCallback((screen: ScreenId, _transition?: string) => {
    const route = screenToRoute[screen];
    if (route) routerNavigate(route);
  }, [routerNavigate]);

  const handleAddService = (newService: Service) => {
    setServices(prev => [newService, ...prev]);
  };

  const handleServiceUpdate = (serviceId: string, updates: Partial<Service>) => {
    if ((updates as Record<string, unknown>).status === 'Deleted') {
      setServices(prev => prev.filter(s => s.id !== serviceId));
      return;
    }
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, ...updates } : s));
  };

  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    return (localStorage.getItem('sidebarMode') as SidebarMode) || 'full';
  });

  const hideSidebar = location.pathname === '/new-service';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-sm space-y-4 animate-pulse">
          <div className="h-8 bg-surface-container-highest rounded w-48 mx-auto" />
          <div className="h-4 bg-surface-container-highest rounded w-32 mx-auto" />
          <div className="space-y-3 mt-8">
            <div className="h-10 bg-surface-container-highest rounded-lg" />
            <div className="h-10 bg-surface-container-highest rounded-lg" />
            <div className="h-10 bg-surface-container-highest rounded-lg" />
          </div>
        </div>
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
          {!hideSidebar && (
            <Sidebar onNavigate={(scr) => handleNavigate(scr)} mode={sidebarMode} onModeChange={setSidebarMode} />
          )}

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
            <div id="content-viewport" className="flex-1 flex flex-col relative w-full h-full min-h-0">
              <Routes>
                <Route path="/service/:serviceId/:section?" element={<ServiceWorkspacePage />} />

                <Route path="/dashboard" element={
                  <ExecutiveDashboardScreen onNavigate={handleNavigate} />
                } />
                <Route path="/transport" element={
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
                } />
                <Route path="/transport-list" element={
                  <TransportListScreen onNavigate={handleNavigate} onImportComplete={refreshServices} />
                } />
                <Route path="/driver-reports" element={
                  <DriverReportsScreen onNavigate={handleNavigate} />
                } />
                <Route path="/driver-links" element={
                  <DriverLinksScreen onNavigate={handleNavigate} />
                } />
                <Route path="/rapportinos" element={
                  <RapportinoScreen onNavigate={handleNavigate} />
                } />
                <Route path="/reconciliation" element={
                  <ReconciliationScreen onNavigate={handleNavigate} />
                } />
                <Route path="/accounting" element={
                  <AccountingScreen onNavigate={handleNavigate} />
                } />
                <Route path="/financial" element={
                  <FinancialDashboard onNavigate={handleNavigate} />
                } />
                <Route path="/customers" element={
                  <ClientScreen onNavigate={handleNavigate} />
                } />
                <Route path="/providers" element={
                  <CollaboratorScreen onNavigate={handleNavigate} />
                } />
                <Route path="/drivers" element={
                  <DriverPanelScreen drivers={drivers} onNavigate={handleNavigate} />
                } />
                <Route path="/vehicles" element={
                  <VehicleScreen onNavigate={handleNavigate} />
                } />
                <Route path="/projects" element={
                  <ProjectScreen onNavigate={handleNavigate} />
                } />
                <Route path="/audit-center" element={
                  <AuditCenterScreen onNavigate={handleNavigate} />
                } />
                <Route path="/active-users" element={
                  <ActiveUsersScreen onNavigate={handleNavigate} />
                } />
                <Route path="/user-management" element={
                  <UserManagementScreen onNavigate={handleNavigate} />
                } />
                <Route path="/settings" element={
                  <CompanySettingsScreen onNavigate={handleNavigate} />
                } />
                <Route path="/new-service" element={
                  <NewServiceScreen onAddService={handleAddService} onNavigate={handleNavigate} />
                } />
                <Route path="/documents" element={
                  <DocumentScreen onNavigate={handleNavigate} />
                } />
                <Route path="/reports" element={
                  <ReportsScreen services={services} drivers={drivers} onNavigate={handleNavigate} onServiceUpdate={handleServiceUpdate} />
                } />
                <Route path="/rate_cards" element={
                  <RateCardScreen onNavigate={handleNavigate} />
                } />
                <Route path="/driver-submissions" element={
                  <DriverReportsScreen onNavigate={handleNavigate} />
                } />

                {/* Default: redirect to /dashboard */}
                <Route path="*" element={
                  <ExecutiveDashboardScreen onNavigate={handleNavigate} />
                } />
              </Routes>
            </div>
          </div>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}
