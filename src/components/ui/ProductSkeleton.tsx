import React from 'react';

export default function ProductSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl md:rounded-2xl bg-brand-100 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>
      <div className="space-y-2 md:space-y-3">
        <div className="h-4 md:h-6 w-3/4 bg-brand-100 rounded-lg animate-pulse" />
        <div className="h-2.5 md:h-3 w-1/4 bg-brand-50 rounded-lg animate-pulse" />
        <div className="flex justify-between items-center pt-1 md:pt-2">
          <div className="h-4 md:h-5 w-16 md:w-20 bg-brand-100 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
