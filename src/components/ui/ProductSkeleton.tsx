import React from 'react';
import { motion } from 'motion/react';

export default function ProductSkeleton() {
  return (
    <div className="space-y-6">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-brand-100 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>
      <div className="space-y-3">
        <div className="h-6 w-3/4 bg-brand-100 rounded-lg animate-pulse" />
        <div className="h-3 w-1/4 bg-brand-50 rounded-lg animate-pulse" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-5 w-20 bg-brand-100 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
