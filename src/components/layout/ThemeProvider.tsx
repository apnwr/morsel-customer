'use client';

import { useEffect } from 'react';
import { useRestaurant } from '@/contexts/RestaurantContext';

/**
 * ThemeProvider component that dynamically updates the restaurant theme color
 * as a CSS variable when the restaurant context changes.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { context } = useRestaurant();

  useEffect(() => {
    // Update the CSS variable for restaurant theme color
    if (context?.restaurant?.themeColor) {
      document.documentElement.style.setProperty(
        '--restaurant-theme',
        context.restaurant.themeColor
      );
    }
  }, [context?.restaurant?.themeColor]);

  return <>{children}</>;
}
