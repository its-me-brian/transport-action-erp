import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';

export const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
    {Array.from({ length: 7 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-outline-variant/30 p-3 space-y-3 animate-pulse">
        <div className="h-4 bg-surface-dim rounded w-2/3" />
        <div className="h-3 bg-surface-dim rounded w-1/2" />
        <div className="space-y-2">
          <div className="h-16 bg-surface-dim rounded-lg" />
          <div className="h-16 bg-surface-dim rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyDay = ({ onClick }: { onClick?: () => void }) => (
  <div className="flex flex-col items-center justify-center p-4 border border-dashed border-outline-variant rounded-lg text-center gap-2 bg-surface-dim/30 min-h-[100px]">
    <AlertCircle className="w-5 h-5 text-outline" />
    <span className="text-[12px] text-on-surface-variant">No services</span>
    {onClick && (
      <button onClick={onClick} className="text-primary text-[12px] font-medium hover:underline cursor-pointer flex items-center gap-1">
        Add <ArrowRight className="w-3 h-3" />
      </button>
    )}
  </div>
);
