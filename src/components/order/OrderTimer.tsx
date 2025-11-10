'use client';

import { useEffect, useState } from 'react';

interface OrderTimerProps {
  startTime: number;
  duration: number;
  onExpire: () => void;
  isEditable: boolean;
}

export default function OrderTimer({ startTime, duration, onExpire, isEditable }: OrderTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, duration - elapsed);
  });

  useEffect(() => {
    // Calculate initial remaining time
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, duration - elapsed);
    setRemainingSeconds(remaining);

    if (remaining <= 0) {
      onExpire();
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        onExpire();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, duration, onExpire]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  // Determine color based on remaining time
  const getColorClass = () => {
    if (!isEditable || remainingSeconds === 0) {
      return 'bg-red-100 text-red-600';
    }
    if (remainingSeconds < 60) {
      return 'bg-orange-100 text-orange-600';
    }
    return 'bg-green-100 text-green-600';
  };

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getColorClass()}`}>
      ⏱
    </div>
  );
}
