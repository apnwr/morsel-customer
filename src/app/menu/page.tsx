'use client';

import React, { useMemo, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { MenuAccordion } from '@/components/menu/MenuAccordion';
import { MenuItem } from '@/components/menu/MenuItem';
import { MenuNavPopup } from '@/components/menu/MenuNavPopup';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useCart } from '@/contexts/CartContext';
import { getMenuForRestaurant, getItemsByCategory } from '@/mocks/menuData';
import { MenuItem as MenuItemType } from '@/types/menu';
import { Customization } from '@/types/cart';
import { useRequireRestaurantContext } from '@/hooks/useNavigationGuard';

// Lazy load CustomizationModal since it's only shown on demand
const CustomizationModal = dynamic(
  () => import('@/components/order/CustomizationModal').then(mod => ({ default: mod.CustomizationModal })),
  { ssr: false }
);

export default function MenuPage() {
  // Navigation guard - redirect to login if no restaurant context
  const context = useRequireRestaurantContext();
  const { addItem } = useCart();
  const [showMenuNav, setShowMenuNav] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Don't render if no context (will redirect)
  if (!context || !context.restaurant) {
    return null;
  }

  // Load menu data for active restaurant
  const menuData = useMemo(() => {
    return getMenuForRestaurant(context.restaurant.id);
  }, [context.restaurant.id]);

  const handleAddItem = React.useCallback((item: MenuItemType) => {
    if (item.isCustomizable) {
      // Open customization modal
      setSelectedItem(item);
    } else {
      // Add directly to cart
      addItem(item);
    }
  }, [addItem]);

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
            const items = getItemsByCategory(context.restaurant.id, category.id);
            
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
      {showMenuNav && (
        <MenuNavPopup
          categories={menuData.categories}
          onSelectCategory={handleSelectCategory}
          onClose={() => setShowMenuNav(false)}
        />
      )}

      {/* Customization Modal */}
      {selectedItem && (
        <CustomizationModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddCustomizedItem}
        />
      )}
    </div>
  );
}
