'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RestaurantContext as RestaurantContextType } from '@/types/restaurant';
import { restaurants, getRestaurantById, getBranchById } from '@/mocks/restaurants';
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
      // Validate stored data against mock data (for now, until API integration)
      const restaurant = getRestaurantById(stored.restaurant.id);
      if (restaurant) {
        const branch = getBranchById(restaurant, stored.branch.id);
        if (branch) {
          return {
            restaurant,
            branch,
            table: stored.table,
          };
        }
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
    const restaurant = getRestaurantById(restaurantId);
    if (!restaurant) {
      console.warn(`Restaurant with id ${restaurantId} not found`);
      return;
    }

    const branch = restaurant.branches[0];
    const table = 1;

    setContextState({
      restaurant,
      branch,
      table,
    });
  };

  const switchBranch = (branchId: string) => {
    if (!context) {
      console.warn('Cannot switch branch - no restaurant context available');
      return;
    }

    const branch = getBranchById(context.restaurant, branchId);
    if (!branch) {
      console.warn(`Branch with id ${branchId} not found`);
      return;
    }

    setContextState({
      ...context,
      branch,
      table: 1,
    });
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
