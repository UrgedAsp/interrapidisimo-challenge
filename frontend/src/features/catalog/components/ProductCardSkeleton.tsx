import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton.js';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col justify-between bg-neutral border border-tertiary/20 rounded-[var(--radius-card)] p-4 space-y-4">
      <div className="space-y-3">
        <Skeleton className="aspect-square w-full rounded-[var(--radius-field)]" />
        <Skeleton className="h-3 w-1/4 rounded-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/4 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-[var(--radius-field)]" />
      </div>
    </div>
  );
};
