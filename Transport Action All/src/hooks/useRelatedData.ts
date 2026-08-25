import { useState, useEffect } from 'react';
import { getDriverReports, getDriverLinks, getInboxItems, getReconciliations } from '../services/api';

export interface RelatedData {
  driverReport: any | null;
  driverLink: any | null;
  inboxItem: any | null;
  reconciliation: any | null;
  loading: boolean;
}

export function useRelatedData(serviceId: string): RelatedData {
  const [relatedData, setRelatedData] = useState<RelatedData>({
    driverReport: null,
    driverLink: null,
    inboxItem: null,
    reconciliation: null,
    loading: false
  });

  useEffect(() => {
    let cancelled = false;

    const loadRelatedData = async () => {
      setRelatedData(prev => ({ ...prev, loading: true }));

      try {
        const results = await Promise.allSettled([
          getDriverReports(serviceId).then((reports: any[]) =>
            reports?.length > 0 ? reports[0] : null
          ).catch(() => null),
          getDriverLinks({ serviceId }).then((links: any[]) =>
            links?.length > 0 ? links[0] : null
          ).catch(() => null),
          getInboxItems({ serviceId }).then((items: any[]) =>
            items?.length > 0 ? items[0] : null
          ).catch(() => null),
          getReconciliations({ serviceId }).then((recs: any[]) =>
            recs?.length > 0 ? recs[0] : null
          ).catch(() => null),
        ]);

        if (!cancelled) {
          setRelatedData({
            driverReport: results[0].status === 'fulfilled' ? results[0].value : null,
            driverLink: results[1].status === 'fulfilled' ? results[1].value : null,
            inboxItem: results[2].status === 'fulfilled' ? results[2].value : null,
            reconciliation: results[3].status === 'fulfilled' ? results[3].value : null,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setRelatedData(prev => ({ ...prev, loading: false }));
        }
      }
    };

    loadRelatedData();

    return () => { cancelled = true; };
  }, [serviceId]);

  return relatedData;
}
