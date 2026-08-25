// ============================================================================
// useOpenService — Reusable hook for opening services from any screen
// ============================================================================

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../routes';

export function useOpenService() {
  const navigate = useNavigate();

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
      navigate(`/service/${serviceId}/${param}`);
    } else {
      navigate(routes.service(serviceId));
    }
  }, [navigate]);

  return openService;
}
