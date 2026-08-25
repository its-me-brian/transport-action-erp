// ============================================================================
// NAVIGATION CONTEXT — Unified navigation for all screens
// Bridges old ScreenId-based navigation with new React Router
// ============================================================================

import React, { createContext, useContext, useCallback } from 'react';
import { useNavigate as useReactRouterNavigate } from 'react-router-dom';
import { ScreenId } from '../types';
import { routes, screenToRoute } from '../routes';

interface NavigationContextType {
  /** Navigate to a screen by ScreenId (backward compatible) */
  navigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
  /** Navigate to a service workspace */
  openService: (serviceId: string, section?: string) => void;
  /** Go back in browser history */
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const routerNavigate = useReactRouterNavigate();

  const navigate = useCallback((screen: ScreenId, _transition: 'none' | 'slide_up' | 'push' | 'push_back' = 'none') => {
    const route = screenToRoute[screen];
    if (route) {
      routerNavigate(route);
    }
  }, [routerNavigate]);

  const openService = useCallback((serviceId: string, section?: string) => {
    if (section) {
      const tabMap: Record<string, string> = {
        movements: 'movements',
        driver: 'driver',
        driverLink: 'driver-link',
        driverReport: 'report',
        whatsapp: 'whatsapp',
        reconciliation: 'reconciliation',
        rapportino: 'rapportino',
        history: 'history',
      };
      const param = tabMap[section] || section;
      routerNavigate(`/service/${serviceId}/${param}`);
    } else {
      routerNavigate(routes.service(serviceId));
    }
  }, [routerNavigate]);

  const goBack = useCallback(() => {
    routerNavigate(-1 as any);
  }, [routerNavigate]);

  return (
    <NavigationContext.Provider value={{ navigate, openService, goBack }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return ctx;
}
