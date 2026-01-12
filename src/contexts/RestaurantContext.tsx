'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RestaurantContext as RestaurantContextType } from '@/types/restaurant';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { validateTableNumber } from '@/lib/validation';

const STORAGE_KEY = 'morsel_restaurant_context';

interface RestaurantState {
  context: RestaurantContextType | null;
  switchRestaurant: (restaurantId: string) => void;
  switchBranch: (branchId: string) => void;
  changeTable: (tableNumber: number) => void;
  setContext: (context: RestaurantContextType) => void;
  clearContext: () => void;
}

const RestaurantContext = createContext<RestaurantState | undefined>(undefined);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<RestaurantContextType | null>(() => {
    // ONLY initialize from localStorage if it exists
    // Do NOT use mock data as fallback - user must scan QR code
    const stored = getFromStorage<RestaurantContextType>(STORAGE_KEY);

    if (stored) {
      console.log('[RestaurantContext] ✅ Loading saved restaurant context from localStorage');

      // Trust the stored context directly (comes from API during login)
      // No need to validate against mock data since we're using real API data
      if (stored.restaurant && stored.branch) {
        console.log('[RestaurantContext] ✅ Valid context loaded:', {
          restaurant: stored.restaurant.name,
          branch: stored.branch.name,
          table: stored.table,
        });
        return stored;
      }
    }

    // Return null if no valid context - user MUST scan QR code
    console.log('[RestaurantContext] ⚠️ No valid context found - user must scan QR code');
    return null;
  });

  // Save to localStorage whenever context changes
  useEffect(() => {
    if (context) {
      setInStorage(STORAGE_KEY, context);
    }
  }, [context]);

  const switchRestaurant = (restaurantId: string) => {
    // Note: With API-based flow, restaurant switching is not supported
    // Users must scan QR code to change restaurant/branch
    console.warn('[RestaurantContext] switchRestaurant() is deprecated with API flow. User must scan new QR code.');
    console.warn('[RestaurantContext] Attempted restaurant switch to:', restaurantId);
  };

  const switchBranch = (branchId: string) => {
    // Note: With API-based flow, branch switching is not supported
    // Users must scan QR code to change restaurant/branch
    console.warn('[RestaurantContext] switchBranch() is deprecated with API flow. User must scan new QR code.');
    console.warn('[RestaurantContext] Attempted branch switch to:', branchId);
  };

  const changeTable = (tableNumber: number) => {
    if (!context) {
      console.warn('Cannot change table - no restaurant context available');
      return;
    }

    // Validate table number is within branch's table count
    const validation = validateTableNumber(tableNumber, context.branch.tables);

    if (!validation.isValid) {
      console.warn(`Invalid table number ${tableNumber} for branch ${context.branch.name}: ${validation.error}`);
      return;
    }

    setContextState({
      ...context,
      table: validation.validTableNumber,
    });
  };

  const setContext = (newContext: RestaurantContextType) => {
    console.log('[RestaurantContext] ✅ Setting restaurant context');
    setContextState(newContext);
  };

  const clearContext = () => {
    console.log('[RestaurantContext] 🗑️ Clearing restaurant context');
    setContextState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value: RestaurantState = {
    context,
    switchRestaurant,
    switchBranch,
    changeTable,
    setContext,
    clearContext,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}
