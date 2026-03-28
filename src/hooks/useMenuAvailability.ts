import { useMemo, useState, useEffect, useRef } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { isMenuCurrentlyAvailable, getUnavailableMessage } from '@/lib/menu-availability';
import { config } from '@/lib/config';
import type { MenuWithItems } from '@/types/api/menu';

export interface MenuAvailabilityInfo {
  isAvailable: boolean;
  unavailableMessage: string | null;
}

/**
 * Returns a map of menu ID → availability info, recalculated every 60 s.
 * Pure derivation from menus + timezone; no side-effects on other state.
 */
export function useMenuAvailability(
  menus: MenuWithItems[],
): Map<string, MenuAvailabilityInfo> {
  const { timezone } = useLocale();
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh every 60 s so menus flip available/unavailable without reload
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return useMemo(() => {
    const map = new Map<string, MenuAvailabilityInfo>();
    for (const menu of menus) {
      // When feature toggle is off, treat all menus as always available
      if (!config.features.menuAvailabilityCheck) {
        map.set(menu.id, { isAvailable: true, unavailableMessage: null });
      } else {
        map.set(menu.id, {
          isAvailable: isMenuCurrentlyAvailable(menu.availability, timezone),
          unavailableMessage: getUnavailableMessage(menu.availability, timezone),
        });
      }
    }
    return map;
    // tick is intentionally included so the map recalculates every minute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menus, timezone, tick]);
}
