'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MenuAccordion } from '@/components/menu/MenuAccordion';
import { MenuItem } from '@/components/menu/MenuItem';
import { MenuNavPopup } from '@/components/menu/MenuNavPopup';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useSession } from '@/contexts/SessionContext';
import { useCart } from '@/contexts/CartContext';
import { getMenuForRestaurant, getItemsByCategory } from '@/mocks/menuData';
import { menuService } from '@/services/menu.service';
import { MenuItem as MenuItemType } from '@/types/menu';
import { Customization } from '@/types/cart';
import { useRequireRestaurantContext } from '@/hooks/useNavigationGuard';
import type { MenuWithItems } from '@/types/api/menu';

// Lazy load CustomizationModal since it's only shown on demand
const CustomizationModal = dynamic(
  () => import('@/components/order/CustomizationModal').then(mod => ({ default: mod.CustomizationModal })),
  { ssr: false }
);

export default function MenuPage() {
  // Navigation guard - redirect to login if no restaurant context
  const context = useRequireRestaurantContext();
  const { sessionData } = useSession();
  const { cart, addItem } = useCart();
  const [showMenuNav, setShowMenuNav] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null);
  const [apiMenus, setApiMenus] = useState<MenuWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useApiData, setUseApiData] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Don't render if no context (will redirect)
  if (!context || !context.restaurant) {
    return null;
  }

  // Fetch menu data from API if session data is available
  useEffect(() => {
    const fetchMenuData = async () => {
      if (sessionData?.business.id) {
        try {
          setIsLoading(true);
          const menusWithItems = await menuService.getMenusWithItems(
            sessionData.business.id
          );
          setApiMenus(menusWithItems);
          setUseApiData(true);
        } catch (error) {
          console.error('Error fetching menu data:', error);
          // Fall back to mock data on error
          setUseApiData(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchMenuData();
  }, [sessionData?.business.id]);

  // Helper function to get icon based on menu type
  function getIconForMenuType(type: string): string {
    const iconMap: Record<string, string> = {
      food: '🍽️',
      beverage: '🥤',
      dessert: '🍰',
      mixed: '🍴',
    };
    return iconMap[type] || '🍽️';
  }

  // Helper function to map API items to MenuItem type
  const mapApiItemToMenuItem = (
    apiItem: MenuWithItems['items'][0],
    categoryId: string,
    restaurantId: string
  ): MenuItemType => {
    return {
      id: apiItem.id,
      restaurantId: restaurantId,
      categoryId: categoryId,
      name: apiItem.name,
      description: apiItem.description,
      price: apiItem.price,
      image: '', // API doesn't provide images yet
      tags: [], // API doesn't provide tags yet
      allergens: apiItem.allergens || [],
      dietary: apiItem.dietary || [],
      isCustomizable: apiItem.variants.length > 0 || apiItem.addons.length > 0,
      customOptions: [
        ...(apiItem.variants.length > 0
          ? [
              {
                id: 'variant',
                name: 'Size',
                type: 'radio' as const,
                required: true,
                choices: apiItem.variants.map((v, idx) => ({
                  id: `variant-${idx}`,
                  label: v.name,
                  priceModifier: v.price - apiItem.price, // Price difference
                })),
              },
            ]
          : []),
        ...(apiItem.addons.length > 0
          ? [
              {
                id: 'addons',
                name: 'Add-ons',
                type: 'checkbox' as const,
                required: false,
                choices: apiItem.addons.map((a, idx) => ({
                  id: `addon-${idx}`,
                  label: a.name,
                  priceModifier: a.price,
                })),
              },
            ]
          : []),
      ],
    };
  };

  // Load menu data - use API data if available, otherwise fallback to mock data
  const menuData = useMemo(() => {
    if (useApiData && apiMenus.length > 0) {
      // Transform API menus to match existing structure
      return {
        categories: apiMenus
          .filter((menu) => menu.status === 'active') // Only show active menus
          .map((menu, index) => ({
            id: menu.id,
            name: menu.name,
            description: menu.description,
            order: index + 1, // Add order property
          })),
      };
    }
    // Fallback to mock data
    return getMenuForRestaurant(context.restaurant.id);
  }, [useApiData, apiMenus, context.restaurant.id]);

  const handleAddItem = React.useCallback((item: MenuItemType) => {
    // Always open modal to show full item details
    // User can see description, allergens, dietary info, and customize if needed
    setSelectedItem(item);
  }, [cart.items]);

  const handleAddCustomizedItem = React.useCallback((customizations: Customization[], quantity: number) => {
    if (selectedItem) {
      addItem(selectedItem, customizations, undefined, quantity);
    }
  }, [selectedItem, addItem]);

  const handleSelectCategory = React.useCallback((categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header showCart showFilters />
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <Header showCart showFilters />

      <div className="p-4">
        {menuData.categories.length === 0 ? (
          <EmptyState
            icon="🍽️"
            title="No menu available"
            description="We're currently updating our menu. Please check back soon!"
          />
        ) : (
          menuData.categories.map((category) => {
            // Get items for this category
            let items: MenuItemType[];

            if (useApiData && apiMenus.length > 0) {
              // Use API data - find the menu and map its items
              const menu = apiMenus.find((m) => m.id === category.id);
              const restaurantId = sessionData?.business.id || context.restaurant.id;
              items = menu
                ? menu.items
                    .filter((item) => item.status === 'active') // Only show active items
                    .map((item) => mapApiItemToMenuItem(item, category.id, restaurantId))
                : [];
            } else {
              // Use mock data
              items = getItemsByCategory(context.restaurant.id, category.id);
            }

            if (items.length === 0) return null;

            return (
              <div
                key={category.id}
                ref={(el) => {
                  categoryRefs.current[category.id] = el;
                }}
              >
                <MenuAccordion
                  category={category}
                  items={items}
                >
                  {items.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      onAdd={handleAddItem}
                    />
                  ))}
                </MenuAccordion>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Menu Button */}
      <button
        onClick={() => setShowMenuNav(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-black text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
      >
        <span className="text-lg">☰</span>
        <span className="font-medium">Menu</span>
      </button>

      {/* Menu Navigation Popup */}
      <MenuNavPopup
        isOpen={showMenuNav}
        categories={menuData.categories}
        onSelectCategory={handleSelectCategory}
        onClose={() => setShowMenuNav(false)}
      />

      {/* Customization Modal */}
      {selectedItem && (() => {
        // Find all cart items for this menu item
        const cartItemsForThisItem = cart.items.filter(ci => ci.menuItem.id === selectedItem.id);
        // Get the last added item to pre-fill customizations
        const lastCartItem = cartItemsForThisItem[cartItemsForThisItem.length - 1];

        return (
          <CustomizationModal
            item={selectedItem}
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            onAddToCart={handleAddCustomizedItem}
            existingQuantityInCart={
              cartItemsForThisItem.reduce((sum, ci) => sum + ci.quantity, 0)
            }
            lastCustomizations={lastCartItem?.customizations}
          />
        );
      })()}
    </div>
  );
}
