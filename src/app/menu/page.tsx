"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MenuAccordion } from "@/components/menu/MenuAccordion";
import { MenuItem } from "@/components/menu/MenuItem";
import { MenuNavPopup } from "@/components/menu/MenuNavPopup";
import { useSession } from "@/contexts/SessionContext";
import { useCart } from "@/contexts/CartContext";
import { getMenuForRestaurant, getItemsByCategory } from "@/mocks/menuData";
import { menuService } from "@/services/menu.service";
import { MenuItem as MenuItemType } from "@/types/menu";
import { Customization } from "@/types/cart";
import { useRequireRestaurantContext } from "@/hooks/useNavigationGuard";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import type { MenuWithItems } from "@/types/api/menu";

// Lazy load CustomizationModal since it's only shown on demand
const CustomizationModal = dynamic(
  () =>
    import("@/components/order/CustomizationModal").then((mod) => ({
      default: mod.CustomizationModal,
    })),
  { ssr: false }
);

// Memoized Menu Section Component for performance
const MenuSectionComponent = React.memo(
  ({
    section,
    items,
    onAddItem,
  }: {
    section: NonNullable<MenuWithItems["sections"]>[number];
    items: MenuItemType[];
    onAddItem: (item: MenuItemType) => void;
  }) => {
    if (items.length === 0) return null;

    return (
      <div>
        <MenuAccordion
          category={{
            id: section.section_id || section.name,
            name: section.name,
            description: section.description,
            order: section.order,
          }}
          items={items}
        >
          {items.map((item) => (
            <MenuItem key={item.id} item={item} onAdd={onAddItem} />
          ))}
        </MenuAccordion>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    return (
      prevProps.section.section_id === nextProps.section.section_id &&
      prevProps.items.length === nextProps.items.length &&
      prevProps.items.every(
        (item, index) => item.id === nextProps.items[index]?.id
      )
    );
  }
);

MenuSectionComponent.displayName = "MenuSectionComponent";

// Helper component for menu rendering with refs
const MenuWithRef = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
  }
>(({ children }, ref) => {
  return <div ref={ref}>{children}</div>;
});

MenuWithRef.displayName = "MenuWithRef";

// Memoized Menu Renderer Component for better performance
const MenuRenderer = React.memo(
  ({
    menu,
    category,
    restaurantId,
    mapApiItemToMenuItem,
    menuUsesSections,
    areSectionItemsObjects,
    handleAddItem,
    setCategoryRef,
  }: {
    menu: MenuWithItems;
    category: { id: string; name: string; description?: string; order: number; showMenuName?: boolean };
    restaurantId: string;
    mapApiItemToMenuItem: (
      item: MenuWithItems["items"][0],
      categoryId: string,
      restaurantId: string
    ) => MenuItemType;
    menuUsesSections: (menu: MenuWithItems) => boolean;
    areSectionItemsObjects: (
      items: string[] | MenuWithItems["items"]
    ) => items is MenuWithItems["items"];
    handleAddItem: (item: MenuItemType) => void;
    setCategoryRef: (id: string, el: HTMLDivElement | null) => void;
  }) => {
    if (menuUsesSections(menu)) {
      // Sections flow: Items are directly in sections as full objects
      const activeSections = (menu.sections || [])
        .filter(
          (section) =>
            section.isActive && section.items && section.items.length > 0
        )
        .sort((a, b) => a.order - b.order);

      if (activeSections.length === 0) return null;

      const sectionsWithItems = activeSections
        .map((section) => {
          let sectionItems: MenuItemType[] = [];

          if (areSectionItemsObjects(section.items)) {
            // Items are full objects - use them directly
            sectionItems = section.items
              .filter((item) => item.status === "active")
              .map((item) =>
                mapApiItemToMenuItem(
                  item,
                  section.section_id || section.name,
                  restaurantId
                )
              );
          } else {
            // Fallback: Items are IDs - look them up from menu.items
            const itemsMap = new Map(
              (menu.items || [])
                .filter((item) => item.status === "active")
                .map((item) => [item.id, item])
            );

            sectionItems = (section.items as string[])
              .map((itemId) => itemsMap.get(itemId))
              .filter((item): item is MenuWithItems["items"][0] => !!item)
              .map((item) =>
                mapApiItemToMenuItem(
                  item,
                  section.section_id || section.name,
                  restaurantId
                )
              );
          }

          return { section, sectionItems };
        })
        .filter(({ sectionItems }) => sectionItems.length > 0);

      if (sectionsWithItems.length === 0) return null;

      // Calculate total items after filtering
      const totalMenuItems = sectionsWithItems.reduce(
        (sum, { sectionItems }) => sum + sectionItems.length,
        0
      );

      return (
        <MenuWithRef ref={(el) => setCategoryRef(category.id, el)}>
          <MenuAccordion
            category={category}
            items={Array(totalMenuItems).fill(null) as MenuItemType[]}
            showItemCount={false}
            showCategoryName={category.showMenuName ?? false}
          >
            {sectionsWithItems.map(({ section, sectionItems }) => (
              <MenuSectionComponent
                key={section.section_id || section.name}
                section={section}
                items={sectionItems}
                onAddItem={handleAddItem}
              />
            ))}
          </MenuAccordion>
        </MenuWithRef>
      );
    } else {
      // Direct items flow: Menu -> Items
      const items = menu.items
        .filter((item) => item.status === "active")
        .map((item) => mapApiItemToMenuItem(item, category.id, restaurantId));

      if (items.length === 0) return null;

      return (
        <MenuWithRef ref={(el) => setCategoryRef(category.id, el)}>
          <MenuAccordion
            category={category}
            items={items}
            showItemCount={false}
          >
            {items.map((item) => (
              <MenuItem key={item.id} item={item} onAdd={handleAddItem} />
            ))}
          </MenuAccordion>
        </MenuWithRef>
      );
    }
  },
  (prevProps, nextProps) => {
    // Custom comparison - only rerender if menu or category changes
    return (
      prevProps.menu.id === nextProps.menu.id &&
      prevProps.category.id === nextProps.category.id &&
      prevProps.restaurantId === nextProps.restaurantId
    );
  }
);

MenuRenderer.displayName = "MenuRenderer";

export default function MenuPage() {
  // Navigation guard - redirect to login if no restaurant context
  const context = useRequireRestaurantContext();
  const { sessionData } = useSession();
  const { cart, addItem } = useCart();

  // Session validation - checks session status and expiry
  useSessionValidation();
  const [showMenuNav, setShowMenuNav] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null);
  const [apiMenus, setApiMenus] = useState<MenuWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useApiData, setUseApiData] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
          console.error("Error fetching menu data:", error);
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

  // Helper function to check if menu uses sections flow
  const menuUsesSections = (menu: MenuWithItems): boolean => {
    return !!(
      menu.sections &&
      menu.sections.length > 0 &&
      menu.sections.some(
        (section) =>
          section.items && section.items.length > 0 && section.isActive
      )
    );
  };

  // Helper to check if section items are full objects or just IDs
  const areSectionItemsObjects = (
    items: string[] | MenuWithItems["items"]
  ): items is MenuWithItems["items"] => {
    return items.length > 0 && typeof items[0] !== "string";
  };

  // Helper function to map API items to MenuItem type
  const mapApiItemToMenuItem = (
    apiItem: MenuWithItems["items"][0],
    categoryId: string,
    restaurantId: string
  ): MenuItemType => {
    // Get first image URL if available
    const imageUrl =
      apiItem.item_images && apiItem.item_images.length > 0
        ? apiItem.item_images[0].url
        : "";

    return {
      id: apiItem.id,
      restaurantId: restaurantId,
      categoryId: categoryId,
      name: apiItem.name,
      description: apiItem.description || "",
      price: apiItem.discountedPrice ?? apiItem.price,
      image: imageUrl,
      tags: [], // API doesn't provide tags yet
      allergens: apiItem.allergens || [],
      dietary: apiItem.dietary || [],
      preparationTime: apiItem.preparationTime,
      isCustomizable: apiItem.variants.length > 0 || apiItem.addons.length > 0,
      customOptions: [
        ...(apiItem.variants.length > 0
          ? [
              {
                id: "variant",
                name: "Size",
                type: "radio" as const,
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
                id: "addons",
                name: "Add-ons",
                type: "checkbox" as const,
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
          .filter((menu) => menu.status === "active") // Only show active menus
          .map((menu, index) => ({
            id: menu.id,
            name: menu.name,
            description: menu.description,
            order: index + 1, // Add order property
            showMenuName: menu.showName ?? false, // Map API property, default to false
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
  }, []);

  const handleAddCustomizedItem = React.useCallback(
    (customizations: Customization[], quantity: number) => {
      if (selectedItem) {
        addItem(selectedItem, customizations, undefined, quantity);
      }
    },
    [selectedItem, addItem]
  );

  const handleSelectCategory = React.useCallback((categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Don't render if no context (will redirect) - must be after ALL hooks
  if (!context || !context.restaurant) {
    return null;
  }

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
            if (useApiData && apiMenus.length > 0) {
              // Use API data - find the menu
              const menu = apiMenus.find((m) => m.id === category.id);
              if (!menu) return null;

              const restaurantId =
                sessionData?.business.id || context.restaurant.id;

              return (
                <MenuRenderer
                  key={category.id}
                  menu={menu}
                  category={category}
                  restaurantId={restaurantId}
                  mapApiItemToMenuItem={mapApiItemToMenuItem}
                  menuUsesSections={menuUsesSections}
                  areSectionItemsObjects={areSectionItemsObjects}
                  handleAddItem={handleAddItem}
                  setCategoryRef={(id, el) => {
                    categoryRefs.current[id] = el;
                  }}
                />
              );
            } else {
              // Use mock data (existing flow)
              const items = getItemsByCategory(
                context.restaurant.id,
                category.id
              );

              if (items.length === 0) return null;

              return (
                <div
                  key={category.id}
                  ref={(el) => {
                    categoryRefs.current[category.id] = el;
                  }}
                >
                  <MenuAccordion category={category} items={items}>
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
            }
          })
        )}
      </div>

      {/* Floating Menu Button */}
      <button
        onClick={() => setShowMenuNav(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-black text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
      >
        <Image
          src="/icons/Hamburger_menu.png"
          alt="Menu"
          width={20}
          height={20}
          className="shrink-0"
        />
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
      {selectedItem &&
        (() => {
          // Find all cart items for this menu item
          const cartItemsForThisItem = cart.items.filter(
            (ci) => ci.menuItem.id === selectedItem.id
          );
          // Get the last added item to pre-fill customizations
          const lastCartItem =
            cartItemsForThisItem[cartItemsForThisItem.length - 1];

          return (
            <CustomizationModal
              item={selectedItem}
              isOpen={!!selectedItem}
              onClose={() => setSelectedItem(null)}
              onAddToCart={handleAddCustomizedItem}
              existingQuantityInCart={cartItemsForThisItem.reduce(
                (sum, ci) => sum + ci.quantity,
                0
              )}
              lastCustomizations={lastCartItem?.customizations}
            />
          );
        })()}
    </div>
  );
}
