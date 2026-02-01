'use client';

import { useEffect } from 'react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useKeyboardHeightCSSVar } from '@/hooks/useKeyboardHeight';

/**
 * ThemeProvider component that dynamically updates the restaurant theme color
 * as a CSS variable when the restaurant context changes.
 * Also handles keyboard height CSS variable for fixed bottom elements.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { context } = useRestaurant();

  // Set up keyboard height CSS variable for mobile keyboard handling
  useKeyboardHeightCSSVar();

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
