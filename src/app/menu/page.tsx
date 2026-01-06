"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MenuAccordion } from "@/components/menu/MenuAccordion";
import { MenuItem } from "@/components/menu/MenuItem";
import { MenuNavPopup } from "@/components/menu/MenuNavPopup";
import { SearchBar } from "@/components/menu/SearchBar";
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
    setSectionRef,
  }: {
    section: NonNullable<MenuWithItems["sections"]>[number];
    items: MenuItemType[];
    onAddItem: (item: MenuItemType) => void;
    setSectionRef?: (id: string, el: HTMLDivElement | null) => void;
  }) => {
    if (items.length === 0) return null;

    const sectionId = section.section_id || section.name;

    return (
      <div ref={(el) => setSectionRef?.(sectionId, el)}>
        <MenuAccordion
          category={{
            id: sectionId,
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
    setSectionRef,
    filterItemsBySearch,
    searchQuery,
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
    setSectionRef?: (id: string, el: HTMLDivElement | null) => void;
    filterItemsBySearch: (items: MenuItemType[], query: string) => MenuItemType[];
    searchQuery: string;
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

          // Filter section items by search query
          const filteredSectionItems = filterItemsBySearch(sectionItems, searchQuery);
          return { section, sectionItems: filteredSectionItems };
        })
        .filter(({ sectionItems }) => sectionItems.length > 0);

      if (sectionsWithItems.length === 0) return null;

      return (
        <MenuWithRef ref={(el) => setCategoryRef(category.id, el)}>
          <div className="mb-5 pb-3 border-b border-gray-200 last:border-b-0">
            {/* Menu Name Header - only show if visibility is active */}
            {menu.visibility === 'active' && (
              <div className="mb-4 pb-2 border-b-1 border-gray-300">
                <h2 className="font-bold text-xl text-gray-900">{category.name}</h2>
              </div>
            )}

            {/* Sections */}
            <div className="space-y-3">
              {sectionsWithItems.map(({ section, sectionItems }) => (
                <MenuSectionComponent
                  key={section.section_id || section.name}
                  section={section}
                  items={sectionItems}
                  onAddItem={handleAddItem}
                  setSectionRef={setSectionRef}
                />
              ))}
            </div>
          </div>
        </MenuWithRef>
      );
    } else {
      // Direct items flow: Menu -> Items
      const items = menu.items
        .filter((item) => item.status === "active")
        .map((item) => mapApiItemToMenuItem(item, category.id, restaurantId));

      // Filter items by search query
      const filteredItems = filterItemsBySearch(items, searchQuery);

      if (filteredItems.length === 0) return null;

      return (
        <MenuWithRef ref={(el) => setCategoryRef(category.id, el)}>
          <div className="mb-5 pb-3 border-b border-gray-200 last:border-b-0">
            {/* Menu Name Header - only show if visibility is active */}
            {menu.visibility === 'active' && (
              <div className="mb-4 pb-2 border-b-2 border-gray-400">
                <h2 className="font-bold text-xl text-gray-900">{category.name}</h2>
              </div>
            )}

            {/* Items */}
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <MenuItem key={item.id} item={item} onAdd={handleAddItem} />
              ))}
            </div>
          </div>
        </MenuWithRef>
      );
    }
  },
  (prevProps, nextProps) => {
    // Custom comparison - only rerender if menu, category, or search query changes
    return (
      prevProps.menu.id === nextProps.menu.id &&
      prevProps.category.id === nextProps.category.id &&
      prevProps.restaurantId === nextProps.restaurantId &&
      prevProps.searchQuery === nextProps.searchQuery
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
  const [searchQuery, setSearchQuery] = useState("");
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
  const menuUsesSections = React.useCallback((menu: MenuWithItems): boolean => {
    return !!(
      menu.sections &&
      menu.sections.length > 0 &&
      menu.sections.some(
        (section) =>
          section.items && section.items.length > 0 && section.isActive
      )
    );
  }, []);

  // Helper to check if section items are full objects or just IDs
  const areSectionItemsObjects = React.useCallback((
    items: string[] | MenuWithItems["items"]
  ): items is MenuWithItems["items"] => {
    return items.length > 0 && typeof items[0] !== "string";
  }, []);

  // Helper function to map API items to MenuItem type
  const mapApiItemToMenuItem = React.useCallback((
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
                  priceModifier: (v.price ?? 0) - apiItem.price, // Price difference, default to 0
                })),
              },
            ]
          : []),
        ...(apiItem.addons.length > 0
          ? apiItem.addons.map((addonGroup, groupIdx) => ({
              id: `addon-group-${groupIdx}`,
              name: addonGroup.name,
              type: addonGroup.maxOptions === 1 ? ("radio" as const) : ("checkbox" as const),
              required: addonGroup.minOptions > 0,
              minSelection: addonGroup.minOptions,
              maxSelection: addonGroup.maxOptions,
              choices: addonGroup.options.map((option, optIdx) => ({
                id: `addon-${groupIdx}-${optIdx}`,
                label: option.name,
                priceModifier: option.price ?? 0, // Default to 0 if undefined
              })),
            }))
          : []),
      ],
    };
  }, []);

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

  // Group sections by menu for navigation popup
  const menusWithSections = React.useMemo(() => {
    if (useApiData && apiMenus.length > 0) {
      return apiMenus
        .filter((menu) => menu.status === "active")
        .map((menu) => {
          const sections: Array<{ id: string; name: string; description?: string; order: number }> = [];

          if (menuUsesSections(menu)) {
            // Menu has sections
            const activeSections = (menu.sections || [])
              .filter((section) => section.isActive && section.items && section.items.length > 0)
              .sort((a, b) => a.order - b.order);

            activeSections.forEach((section) => {
              sections.push({
                id: section.section_id || section.name,
                name: section.name,
                description: section.description,
                order: section.order,
              });
            });
          }

          return {
            menuId: menu.id,
            menuName: menu.name,
            sections: sections,
          };
        })
        .filter((menu) => menu.sections.length > 0); // Only include menus with sections
    }
    return undefined;
  }, [useApiData, apiMenus, menuUsesSections]);

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
    // Try section refs first (for API data with sections), then fall back to category refs
    const element = sectionRefs.current[categoryId] || categoryRefs.current[categoryId];
    if (element) {
      // Get the element's position
      const headerHeight = 150; // Offset for fixed header + filter pills
      const y = element.getBoundingClientRect().top + window.pageYOffset - headerHeight;

      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }, []);

  // Helper function to filter items based on search query
  // Only matches items where name starts with the search query
  const filterItemsBySearch = React.useCallback(
    (items: MenuItemType[], query: string): MenuItemType[] => {
      if (!query.trim()) return items;

      const lowerQuery = query.toLowerCase().trim();
      return items.filter((item) =>
        item.name.toLowerCase().startsWith(lowerQuery)
      );
    },
    []
  );

  // Check if there are any items matching the search query
  // Must be before early returns (React Hook rules)
  const hasAnyFilteredItems = React.useMemo(() => {
    if (!context?.restaurant) return true;
    if (!searchQuery.trim()) return true; // No search means show all

    // Check across all categories for any matching items
    if (useApiData && apiMenus.length > 0) {
      return apiMenus.some((menu) => {
        if (menuUsesSections(menu)) {
          return (menu.sections || []).some((section) => {
            if (!section.isActive || !section.items) return false;
            const items = areSectionItemsObjects(section.items)
              ? section.items.map((item) => mapApiItemToMenuItem(item, menu.id, sessionData?.business.id || context.restaurant.id))
              : [];
            return filterItemsBySearch(items, searchQuery).length > 0;
          });
        } else {
          const items = menu.items.map((item) => mapApiItemToMenuItem(item, menu.id, sessionData?.business.id || context.restaurant.id));
          return filterItemsBySearch(items, searchQuery).length > 0;
        }
      });
    } else {
      return menuData.categories.some((category) => {
        const items = getItemsByCategory(context.restaurant.id, category.id);
        return filterItemsBySearch(items, searchQuery).length > 0;
      });
    }
  }, [searchQuery, useApiData, apiMenus, menuData.categories, menuUsesSections, areSectionItemsObjects, mapApiItemToMenuItem, filterItemsBySearch, sessionData?.business.id, context?.restaurant]);

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
    <div className="min-h-screen bg-white pb-[80px]">
      <Header showCart showFilters />

      <div className="p-4 bg-[#F7F8F8]">
        {menuData.categories.length === 0 ? (
          <EmptyState
            icon="🍽️"
            title="No menu available"
            description="We're currently updating our menu. Please check back soon!"
          />
        ) : searchQuery.trim() && !hasAnyFilteredItems ? (
          <EmptyState
            icon="🔍"
            title="No items found"
            description={`No menu items starting with "${searchQuery}". Please try a different search term.`}
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
                  setSectionRef={(id, el) => {
                    sectionRefs.current[id] = el;
                  }}
                  filterItemsBySearch={filterItemsBySearch}
                  searchQuery={searchQuery}
                />
              );
            } else {
              // Use mock data (existing flow)
              const items = getItemsByCategory(
                context.restaurant.id,
                category.id
              );

              // Filter items by search query
              const filteredItems = filterItemsBySearch(items, searchQuery);

              if (filteredItems.length === 0) return null;

              return (
                <div
                  key={category.id}
                  ref={(el) => {
                    categoryRefs.current[category.id] = el;
                  }}
                >
                  <MenuAccordion
                    category={category}
                    items={filteredItems}
                    showCategoryName={false}
                  >
                    {filteredItems.map((item) => (
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

      {/* Sticky Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuClick={() => setShowMenuNav(true)}
      />

      {/* Menu Navigation Popup */}
      <MenuNavPopup
        isOpen={showMenuNav}
        menusWithSections={menusWithSections}
        categories={menusWithSections ? undefined : menuData.categories}
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
