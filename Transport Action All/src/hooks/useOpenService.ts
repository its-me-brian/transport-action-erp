// ============================================================================
// useOpenService — Reusable hook for opening services from any screen
// ============================================================================

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes, groupToUrlParam, subSectionToQueryParam, type ServiceGroupId, type ServiceSubSection } from '../routes';

export function useOpenService() {
  const navigate = useNavigate();

  const openService = useCallback((serviceId: string, group?: ServiceGroupId | string, subSection?: ServiceSubSection | string) => {
    if (group && group !== 'overview') {
      const urlParam = groupToUrlParam[group as ServiceGroupId] || group;
      let url = `/service/${serviceId}/${urlParam}`;
      if (subSection) {
        const queryParam = subSectionToQueryParam[subSection as ServiceSubSection] || subSection;
        url += `?sub=${queryParam}`;
      }
      navigate(url);
    } else {
      navigate(routes.service(serviceId));
    }
  }, [navigate]);

  return openService;
}
