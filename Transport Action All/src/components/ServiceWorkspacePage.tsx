// ============================================================================
// ServiceWorkspacePage — Routed version of ServiceWorkspace
// Accessible at /service/:serviceId, /service/:serviceId/:group, etc.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Service, mapServiceDTOToService } from '../types';
import { getServiceById } from '../services/api';
import ServiceWorkspace from './ServiceWorkspace';
import {
  urlParamToGroup, groupToUrlParam,
  queryParamToSubSection, subSectionToQueryParam, legacyUrlRedirect,
  type ServiceGroupId, type ServiceSubSection
} from '../routes';
import { Skeleton } from './ui/Skeleton';
import { useToast } from '../contexts/ToastContext';

export default function ServiceWorkspacePage() {
  const { serviceId, section } = useParams<{ serviceId: string; section?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse URL → group + sub-section
  const parseUrlState = useCallback((): { group: ServiceGroupId; subSection?: ServiceSubSection } => {
    const rawSection = section || '';

    // Check for legacy flat URL → redirect to grouped URL
    if (rawSection && legacyUrlRedirect[rawSection]) {
      const redirect = legacyUrlRedirect[rawSection];
      const subParam = redirect.sub ? `?sub=${subSectionToQueryParam[redirect.sub]}` : '';
      const newUrl = `/service/${serviceId}/${groupToUrlParam[redirect.group]}${subParam}`;
      // Redirect in-place (replace to avoid back-button loop)
      navigate(newUrl, { replace: true });
      return { group: redirect.group, subSection: redirect.sub };
    }

    // Normal grouped URL
    const group = urlParamToGroup[rawSection] || 'overview';

    // Parse sub-section from query param
    const subParam = searchParams.get('sub');
    const subSection = subParam ? (queryParamToSubSection[subParam] || undefined) : undefined;

    return { group, subSection };
  }, [section, serviceId, searchParams, navigate]);

  const { group: activeGroup, subSection: activeSubSection } = parseUrlState();

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getServiceById(serviceId)
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setService(mapServiceDTOToService(data));
        } else {
          setError('Service not found');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load service');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [serviceId]);

  const handleClose = () => {
    navigate(-1);
  };

  const handleServiceUpdate = (id: string, updates: Partial<Service>) => {
    setService(prev => prev ? { ...prev, ...updates } : prev);
  };

  const handleRefresh = useCallback(() => {
    if (!serviceId) return;
    getServiceById(serviceId)
      .then((data) => {
        if (data) {
          setService(mapServiceDTOToService(data));
        }
      })
      .catch((err) => {
        showToast('Failed to refresh service data', 'error');
      });
  }, [serviceId, showToast]);

  const handleGroupChange = (group: ServiceGroupId, subSection?: ServiceSubSection) => {
    if (!serviceId) return;
    const urlParam = groupToUrlParam[group];
    let path = urlParam ? `/service/${serviceId}/${urlParam}` : `/service/${serviceId}`;
    if (subSection) {
      const queryParam = subSectionToQueryParam[subSection];
      path += `?sub=${queryParam}`;
    }
    navigate(path, { replace: true });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 p-4 bg-background space-y-4" role="status">
        <span className="sr-only">Loading service...</span>
        <div className="flex items-center gap-3">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
        <div className="flex gap-4">
          <div className="w-48 space-y-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-9 rounded-lg" />
            ))}
          </div>
          <div className="flex-1 space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !service) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-on-surface">Service not found</h2>
          <p className="text-sm text-on-surface-variant">
            {error || `Service ${serviceId} does not exist or you don't have access.`}
          </p>
          <button
            onClick={() => navigate('/transport')}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Go to Calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Back button bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant bg-surface shrink-0">
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-on-surface-variant font-mono">{service.id}</span>
      </div>

      {/* ServiceWorkspace — fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ServiceWorkspace
          service={service}
          onClose={handleClose}
          onServiceUpdate={handleServiceUpdate}
          onRefresh={handleRefresh}
          initialGroup={activeGroup}
          initialSubSection={activeSubSection}
          mode="page"
          onGroupChange={handleGroupChange}
        />
      </div>
    </div>
  );
}
