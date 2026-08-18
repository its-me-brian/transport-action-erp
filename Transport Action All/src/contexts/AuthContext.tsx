import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, logoutUser, validateSession } from '../services/api';

export type UserRole = 'admin' | 'coordinator' | 'accounting' | 'driver';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  status: string;
}

// ============================================================================
// PERMISSION MATRIX — Source of truth: docs/08-PERMISSIONS.md
// NO HIERARCHY. Each permission lists allowed roles explicitly.
// Admin ALWAYS has access (checked separately in can()).
// ============================================================================
const PERMISSION_MATRIX: Record<string, UserRole[]> = {
  // === SERVICES ===
  'service.list':              ['admin', 'coordinator', 'accounting'],
  'service.list_own':          ['admin', 'coordinator', 'accounting', 'driver'],
  'service.import':            ['admin', 'coordinator'],
  'service.assign':            ['admin', 'coordinator'],
  'service.confirm':           ['admin', 'coordinator'],
  'service.start':             ['admin', 'coordinator', 'driver'],
  'service.complete':          ['admin', 'coordinator', 'driver'],
  'service.validate':          ['admin', 'coordinator'],
  'service.adjustRevenue':     ['admin', 'coordinator'],
  'service.adjustCost':        ['admin', 'coordinator'],
  'service.updateField':       ['admin', 'coordinator'],
  'service.facturar':          ['admin', 'coordinator', 'accounting'],
  'service.cobrar':            ['admin', 'coordinator', 'accounting'],
  'service.close':             ['admin', 'coordinator'],
  'service.delete':            ['admin', 'coordinator'],
  'service.confirmActuals':    ['admin', 'coordinator', 'accounting'],
  'service.approveFinancial':  ['admin', 'accounting'],
  'service.markFacturable':    ['admin', 'coordinator', 'accounting'],

  // === PROJECTS ===
  'project.list':              ['admin', 'coordinator', 'accounting'],
  'project.create':            ['admin', 'coordinator'],
  'project.update':            ['admin', 'coordinator'],
  'project.delete':            ['admin', 'coordinator'],
  'project.archive':           ['admin', 'coordinator'],
  'project.preparar':          ['admin', 'coordinator'],
  'project.activar':           ['admin', 'coordinator'],
  'project.pasarAFacturacion': ['admin', 'coordinator'],
  'project.pasarACobro':       ['admin', 'coordinator'],
  'project.cerrar':            ['admin', 'coordinator'],

  // === DRIVERS ===
  'driver.list':               ['admin', 'coordinator', 'accounting'],
  'driver.create':             ['admin', 'coordinator'],
  'driver.update':             ['admin', 'coordinator'],
  'driver.delete':             ['admin', 'coordinator'],
  'driver.cleanup':            ['admin', 'coordinator'],

  // === VEHICLES ===
  'vehicle.list':              ['admin', 'coordinator', 'accounting'],
  'vehicle.create':            ['admin', 'coordinator'],
  'vehicle.update':            ['admin', 'coordinator'],
  'vehicle.delete':            ['admin', 'coordinator'],

  // === DRIVER RATES ===
  'driverRate.list':           ['admin', 'coordinator'],
  'driverRate.create':         ['admin', 'coordinator'],
  'driverRate.update':         ['admin', 'coordinator'],
  'driverRate.delete':         ['admin', 'coordinator'],

  // === RATE CARDS ===
  'rateCard.list':             ['admin', 'coordinator'],
  'rateCard.create':           ['admin'],
  'rateCard.update':           ['admin'],
  'rateCard.delete':           ['admin'],

  // === CLIENTS ===
  'client.list':               ['admin', 'coordinator', 'accounting'],
  'client.create':             ['admin', 'coordinator'],
  'client.update':             ['admin', 'coordinator'],
  'client.delete':             ['admin', 'coordinator'],

  // === CONTACTS ===
  'contact.list':              ['admin', 'coordinator', 'accounting'],
  'contact.create':            ['admin', 'coordinator'],
  'contact.update':            ['admin', 'coordinator'],
  'contact.delete':            ['admin', 'coordinator'],

  // === TRANSPORT LISTS ===
  'transportList.list':        ['admin', 'coordinator'],
  'transportList.upload':      ['admin', 'coordinator'],
  'transportList.import':      ['admin', 'coordinator'],
  'transportList.export':      ['admin', 'coordinator'],

  // === DRIVER REPORTS ===
  'driverReport.list':         ['admin', 'coordinator', 'driver'],
  'driverReport.create':       ['admin', 'driver'],
  'driverReport.submit':       ['admin', 'driver'],
  'driverReport.approve':      ['admin', 'coordinator'],
  'driverReport.reject':       ['admin', 'coordinator'],

  // === RAPPORTINO CLIENT ===
  'rapportinoClient.list':          ['admin', 'coordinator', 'accounting'],
  'rapportinoClient.create':        ['admin', 'coordinator'],
  'rapportinoClient.review':        ['admin', 'coordinator'],
  'rapportinoClient.send':          ['admin', 'coordinator'],
  'rapportinoClient.accept':        ['admin', 'coordinator'],
  'rapportinoClient.reject':        ['admin', 'coordinator'],
  'rapportinoClient.facturar':      ['admin', 'accounting'],
  'rapportinoClient.addService':    ['admin', 'coordinator'],
  'rapportinoClient.removeService': ['admin', 'coordinator'],

  // === RAPPORTINO DRIVER ===
  'rapportinoDriver.list':     ['admin', 'coordinator'],
  'rapportinoDriver.create':   ['admin', 'coordinator'],
  'rapportinoDriver.review':   ['admin', 'coordinator'],
  'rapportinoDriver.send':     ['admin', 'coordinator'],
  'rapportinoDriver.accept':   ['admin', 'coordinator'],
  'rapportinoDriver.reject':   ['admin', 'coordinator'],
  'rapportinoDriver.pay':      ['admin', 'accounting'],

  // === RAPPORTINO COLLABORATOR ===
  'rapportinoCollaborator.list':     ['admin', 'coordinator', 'accounting'],
  'rapportinoCollaborator.create':   ['admin', 'coordinator'],
  'rapportinoCollaborator.addService': ['admin', 'coordinator'],
  'rapportinoCollaborator.removeService': ['admin', 'coordinator'],
  'rapportinoCollaborator.send':     ['admin', 'coordinator'],
  'rapportinoCollaborator.accept':   ['admin', 'coordinator'],
  'rapportinoCollaborator.pay':      ['admin', 'accounting'],

  // === INVOICES ===
  'invoice.list':              ['admin', 'accounting'],
  'invoice.create':            ['admin', 'accounting'],
  'invoice.edit':              ['admin', 'accounting'],
  'invoice.emit':              ['admin', 'accounting'],
  'invoice.send':              ['admin', 'accounting'],
  'invoice.void':              ['admin', 'accounting'],

  // === PAYMENTS ===
  'payment.list':              ['admin', 'accounting'],
  'payment.register':          ['admin', 'accounting'],
  'payment.confirm':           ['admin', 'accounting'],
  'payment.reconcile':         ['admin', 'accounting'],
  'payment.void':              ['admin', 'accounting'],
  'payment.edit':              ['admin', 'accounting'],

  // === EXPENSES ===
  'expense.list':              ['admin', 'coordinator', 'accounting'],
  'expense.create':            ['admin', 'coordinator', 'accounting'],
  'expense.edit':              ['admin', 'coordinator', 'accounting'],
  'expense.confirm':           ['admin', 'accounting'],
  'expense.cancel':            ['admin', 'accounting'],
  'expense.correct':           ['admin', 'accounting'],

  // === CHANGES ===
  'change.list':               ['admin', 'coordinator', 'accounting', 'driver'],
  'change.create':             ['admin', 'coordinator', 'accounting', 'driver'],
  'change.update':             ['admin', 'coordinator', 'accounting', 'driver'],
  'change.delete':             ['admin', 'coordinator'],
  'change.resolve':            ['admin', 'coordinator'],

  // === DRIVER LINKS ===
  'driverLink.list':           ['admin', 'coordinator'],
  'driverLink.generate':       ['admin', 'coordinator'],
  'driverLink.update':         ['admin', 'coordinator'],
  'driverLink.deactivate':     ['admin', 'coordinator'],
  'driverLink.compare':        ['admin', 'coordinator'],

  // === DRIVER REPORT INBOX (FASE 15C) ===
  'inbox.list':                ['admin', 'coordinator'],
  'inbox.capture':             ['admin', 'coordinator', 'driver'],
  'inbox.normalize':           ['admin', 'coordinator'],
  'inbox.review':              ['admin', 'coordinator'],

  // === PRESENCE (FASE 15E) ===
  'presence.read':             ['admin', 'coordinator'],

  // === COLLABORATORS (providers / empresas colaboradoras) ===
  'collaborator.list':         ['admin', 'coordinator', 'accounting'],
  'collaborator.create':       ['admin', 'coordinator'],
  'collaborator.update':       ['admin', 'coordinator'],
  'collaborator.delete':       ['admin', 'coordinator'],

  // === SUPPLIER RATES (tarifas de proveedor) ===
  'supplierRate.list':         ['admin', 'coordinator'],
  'supplierRate.create':       ['admin', 'coordinator'],
  'supplierRate.update':       ['admin', 'coordinator'],
  'supplierRate.delete':       ['admin', 'coordinator'],

  // === RECONCILIATION ===
  'reconciliation.check':      ['admin', 'coordinator', 'accounting'],
  'reconciliation.update':     ['admin', 'coordinator'],

  // === OPERATING COMPANY ===
  'operatingCompany.list':     ['admin', 'coordinator', 'accounting'],
  'operatingCompany.update':   ['admin'],

  // === REVENUE / COST BREAKDOWN ===
  'revenueBreakdown.list':     ['admin', 'coordinator', 'accounting'],
  'costBreakdown.list':        ['admin', 'coordinator', 'accounting'],

  // === AUDIT LOG / ACTIVITY FEED ===
  'auditLog.read':             ['admin', 'accounting'],
  'activityFeed.read':         ['admin', 'coordinator', 'accounting', 'driver'],

  // === REPORTS (dashboards, profit analysis) ===
  'report.dashboard':          ['admin', 'coordinator', 'accounting'],
  'report.projectDashboard':   ['admin', 'coordinator', 'accounting'],
  'report.driverDashboard':    ['admin', 'coordinator', 'accounting'],
  'report.cashflow':           ['admin', 'accounting'],
  'report.profitProject':      ['admin', 'coordinator', 'accounting'],
  'report.profitDriver':       ['admin', 'coordinator', 'accounting'],
  'report.profitCompany':      ['admin', 'accounting'],
  'report.serviceSummary':     ['admin', 'coordinator', 'accounting'],
  'report.pendingValidation':  ['admin', 'coordinator'],
  'report.pendingInvoicing':   ['admin', 'accounting'],

  // === SERVICE ECONOMICS ===
  'service.economics':         ['admin', 'coordinator', 'accounting'],

  // === DOCUMENTS ===
  'document.list':             ['admin', 'coordinator', 'accounting', 'driver'],
  'document.create':           ['admin', 'coordinator', 'accounting', 'driver'],
  'document.delete':           ['admin', 'coordinator', 'accounting', 'driver'],

  // === DRIVER ADVANCES ===
  'driverAdvance.list':        ['admin', 'accounting'],
  'driverAdvance.create':      ['admin', 'accounting'],
  'driverAdvance.update':      ['admin', 'accounting'],

  // === SETTINGS (renamed from companySettings) ===
  'settings.read':             ['admin', 'coordinator', 'accounting'],
  'settings.write':            ['admin'],

  // === SYSTEM (admin-only tools) ===
  'invariantCheck':            ['admin'],
  'integrationTest':           ['admin'],

  // === DRIVER ADVANCE ===
};

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * Check if user has a specific permission (NO HIERARCHY).
   * Admin ALWAYS has access to everything.
   *
   * Usage: can('invoice.emit') or can('service.validate')
   */
  can: (permission: string) => boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { username: string; email: string; phone: string; password: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'transport_session_token';
const USER_KEY = 'transport_session_user';
const TOKEN_EXPIRY_KEY = 'transport_session_expiry';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    const savedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (savedToken && savedUser && savedExpiry) {
      const expiry = new Date(savedExpiry);
      if (expiry > new Date()) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setIsLoading(false);
        // Validate in background
        validateSession(savedToken).then(res => {
          if (!res.valid) {
            clearSession();
          }
        });
      } else {
        clearSession();
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const saveSession = useCallback((newToken: string, newUser: AuthUser) => {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 8);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toISOString());
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const result = await loginUser(username, password);
      if (result.success && result.token && result.user) {
        saveSession(result.token, result.user);
        return { success: true };
      }
      return { success: false, error: result.error || 'Login failed' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, [saveSession]);

  const register = useCallback(async (data: { username: string; email: string; phone: string; password: string }) => {
    try {
      const result = await registerUser(data);
      if (result.success) {
        return { success: true, message: result.message };
      }
      return { success: false, error: result.error || 'Registration failed' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      await logoutUser(token);
    }
    clearSession();
  }, [token, clearSession]);

  const refreshSession = useCallback(async () => {
    if (token) {
      const result = await validateSession(token);
      if (result.valid && result.user) {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 8);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toISOString());
      } else {
        clearSession();
      }
    }
  }, [token, clearSession]);

  /**
   * Check if user has a specific permission using the PERMISSION_MATRIX.
   * NO HIERARCHY — admin always has access, other roles are explicit.
   */
  const can = useCallback((permission: string): boolean => {
    if (!user) return false;
    // Admin always has access
    if (user.role === 'admin') return true;
    const allowedRoles = PERMISSION_MATRIX[permission];
    if (!allowedRoles) return false;
    return allowedRoles.includes(user.role);
  }, [user]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    can,
    login,
    register,
    logout,
    refreshSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
