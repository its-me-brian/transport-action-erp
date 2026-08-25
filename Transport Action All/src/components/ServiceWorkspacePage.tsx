// ============================================================================
// ServiceWorkspacePage — Routed version of ServiceWorkspace
// Accessible at /service/:serviceId and /service/:serviceId/:section
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Service, mapServiceDTOToService } from '../types';
import { getServiceById } from '../services/api';
import ServiceWorkspace from './ServiceWorkspace';
import { routeParamToTab, tabToRouteParam } from '../routes';

export default function ServiceWorkspacePage() {
  const { serviceId, section } = useParams<{ serviceId: string; section?: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTab = section ? (routeParamToTab[section] || 'overview') : 'overview';

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

  const handleTabChange = (tab: string) => {
    if (!serviceId) return;
    const param = tabToRouteParam[tab as keyof typeof tabToRouteParam];
    const path = param ? `/service/${serviceId}/${param}` : `/service/${serviceId}`;
    navigate(path, { replace: true });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 p-4 bg-background space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-surface-container-highest" />
          <div className="h-4 bg-surface-container-highest rounded w-48" />
          <div className="h-3 bg-surface-container-highest rounded w-20 ml-auto" />
        </div>
        <div className="flex gap-4">
          <div className="w-48 space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-9 bg-surface-container-highest rounded-lg" />
            ))}
          </div>
          <div className="flex-1 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-surface-container-highest rounded-xl" />
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
          initialTab={activeTab}
          mode="page"
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
}
