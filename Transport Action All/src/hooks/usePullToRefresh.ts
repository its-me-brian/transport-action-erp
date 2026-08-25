import { useState, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  shouldRefresh: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handlers = {
    onTouchStart: useCallback((e: React.TouchEvent) => {
      const target = e.currentTarget as HTMLElement;
      if (target.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    }, []),

    onTouchMove: useCallback((e: React.TouchEvent) => {
      if (!isPulling.current) return;

      const currentY = e.touches[0].clientY;
      const distance = (currentY - startY.current) / resistance;

      if (distance > 0) {
        setPullDistance(Math.min(distance, threshold * 1.5));
        setShouldRefresh(distance >= threshold);
      }
    }, [threshold, resistance]),

    onTouchEnd: useCallback(async () => {
      if (shouldRefresh && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setPullDistance(0);
      setShouldRefresh(false);
      isPulling.current = false;
    }, [shouldRefresh, isRefreshing, onRefresh]),
  };

  return { isRefreshing, pullDistance, shouldRefresh, handlers };
}
