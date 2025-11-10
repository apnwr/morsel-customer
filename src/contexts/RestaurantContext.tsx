'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RestaurantContext as RestaurantContextType } from '@/types/restaurant';
import { restaurants, getRestaurantById, getBranchById } from '@/mocks/restaurants';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { validateTableNumber } from '@/lib/validation';

const STORAGE_KEY = 'morsel_restaurant_context';

interface RestaurantState {
  context: RestaurantContextType;
  switchRestaurant: (restaurantId: string) => void;
  switchBranch: (branchId: string) => void;
  changeTable: (tableNumber: number) => void;
  setContext: (context: RestaurantContextType) => void;
}

const RestaurantContext = createContext<RestaurantState | undefined>(undefined);

function getDefaultContext(): RestaurantContextType {
  const defaultRestaurant = restaurants[0];
  const defaultBranch = defaultRestaurant.branches[0];
  const defaultTable = 1;

  return {
    restaurant: defaultRestaurant,
    branch: defaultBranch,
    table: defaultTable,
  };
}

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<RestaurantContextType>(() => {
    // Initialize from localStorage or use default
    const stored = getFromStorage<RestaurantContextType>(STORAGE_KEY);
    
    if (stored) {
      // Validate stored data
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
    
    // Use default if no valid stored data
    return getDefaultContext();
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
    setContextState(newContext);
  };

  const value: RestaurantState = {
    context,
    switchRestaurant,
    switchBranch,
    changeTable,
    setContext,
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
