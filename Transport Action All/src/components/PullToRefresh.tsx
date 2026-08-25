import React from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export default function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const { isRefreshing, pullDistance, shouldRefresh, handlers } = usePullToRefresh({ onRefresh });

  const opacity = Math.min(pullDistance / 80, 1);
  const rotation = (pullDistance / 80) * 360;

  return (
    <div
      className={`relative overflow-y-auto ${className}`}
      {...handlers}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          height: isRefreshing ? 48 : pullDistance,
          opacity: isRefreshing ? 1 : opacity,
        }}
      >
        <RefreshCw
          className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
          style={!isRefreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
        />
        <span className="ml-2 text-[12px] text-on-surface-variant">
          {isRefreshing ? 'Refreshing...' : shouldRefresh ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>

      {children}
    </div>
  );
}
