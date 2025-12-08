/**
 * Menu Service
 * Handles all menu and items related API calls
 */

import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MenuResponse, ItemsResponse, MenuWithItems } from '@/types/api/menu';
import { HARDCODED_MENU_DATA } from '@/mocks/api/menuData';
import { HARDCODED_ITEMS_DATA } from '@/mocks/api/itemsData';

// Flag to toggle between hardcoded data and real API
const USE_HARDCODED_DATA = false;

export const menuService = {
  /**
   * Get all menus for a business
   * @param businessId - The business identifier
   * @returns Menu data
   */
  getMenuByBusinessId: async (businessId: string): Promise<MenuResponse> => {
    if (USE_HARDCODED_DATA) {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      return HARDCODED_MENU_DATA;
    }

    return apiClient.get<MenuResponse>(
      endpoints.menu.getByBusinessId(businessId)
    );
  },

  /**
   * Get all items for a business
   * @param businessId - The business identifier
   * @returns Items data
   */
  getItemsByBusinessId: async (businessId: string): Promise<ItemsResponse> => {
    if (USE_HARDCODED_DATA) {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      return HARDCODED_ITEMS_DATA;
    }

    return apiClient.get<ItemsResponse>(
      endpoints.items.getByBusinessId(businessId)
    );
  },

  /**
   * Get menus with populated items
   * The API now returns items already populated, so we just return the data directly
   * @param businessId - The business identifier
   * @returns Menus with their items populated
   */
  getMenusWithItems: async (businessId: string): Promise<MenuWithItems[]> => {
    // API returns menus with items already populated
    const menusResponse = await menuService.getMenuByBusinessId(businessId);

    // Cast to MenuWithItems since API includes items array
    return menusResponse.data as MenuWithItems[];
  },
};
