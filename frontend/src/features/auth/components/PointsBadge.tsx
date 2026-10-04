import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import { formatPoints } from '../../../lib/format.js';
import { useMe } from '../hooks/useMe.js';

export const PointsBadge: React.FC = () => {
  const { data: user, isLoading, isError } = useMe();
  const [highlight, setHighlight] = useState(false);
  const prevPointsRef = useRef<number | undefined>(user?.pointsBalance);

  const points = user?.pointsBalance;

  useEffect(() => {
    if (prevPointsRef.current !== undefined && points !== undefined && points > prevPointsRef.current) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 1200);
      return () => clearTimeout(timer);
    }
    prevPointsRef.current = points;
  }, [points]);

  if (isLoading) {
    return <Skeleton className="h-8 w-24 rounded-full" />;
  }

  const displayPoints = isError ? '—' : points !== undefined ? formatPoints(points) : '0';

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Saldo actual: ${displayPoints} puntos`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors duration-300 ${
        highlight
          ? 'bg-tertiary/40 border-secondary text-primary scale-105 shadow-sm motion-reduce:transform-none'
          : 'bg-tertiary/15 border-tertiary/30 text-primary'
      }`}
    >
      <Sparkles size={16} className="text-secondary shrink-0" aria-hidden="true" />
      <span className="font-bold text-secondary">{displayPoints}</span>
      <span className="text-xs text-primary/70 hidden sm:inline">pts</span>
    </div>
  );
};
