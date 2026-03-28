/**
 * API Types for Menu and Items
 */

import type { Timestamp } from './session';

export interface MenuAvailability {
  startTime: string;
  endTime: string;
  days: string[] | string;
}

export interface Menu {
  id: string;
  businessId: string;
  name: string;
  description: string;
  type: 'food' | 'beverage' | 'dessert' | 'mixed' | string;
  availability: MenuAvailability | MenuAvailability[] | undefined;
  status: 'active' | 'inactive' | string;
  createdAt: Timestamp;
  tags?: string[];
  itemIds?: string[];
  updatedAt: Timestamp;
  items?: MenuItem[]; // API now returns populated items directly
  sections?: MenuSection[]; // Sections for organizing items
  showName?: boolean; // Controls whether to display the menu name (defaults to false if not provided)
  visibility?: 'active' | 'inactive' | string; // Controls menu name visibility (active = show, inactive/undefined = hide)
}

export interface MenuResponse {
  data: Menu[];
}

export interface ItemVariant {
  name: string;
  price: number;
  description?: string;
  images?: Array<{ url: string; path: string }>;
}

/**
 * ItemAddonOption - Individual addon option
 * Represents a selectable option within an addon group
 */
export interface ItemAddonOption {
  name: string;   // Option display name (e.g., "Mozzarella")
  price: number;  // Additional price for this option
}

/**
 * ItemAddon - Addon group for menu items
 * 
 * Structure:
 * - name: Display name for the addon group
 * - minOptions: Minimum required selections (0 = optional)
 * - maxOptions: Maximum allowed selections
 * - options: Array of available options
 */
export interface ItemAddon {
  name: string;
  minOptions: number;
  maxOptions: number;
  options: ItemAddonOption[];
}

export interface MenuItem {
  id: string;
  businessId: string;
  name: string;
  description: string;
  type: 'main' | 'dessert' | 'beverage' | 'appetizer' | string;
  price: number;
  preparationTime: string;
  category: string;
  allergens: string[];
  dietary: string[];
  variants: ItemVariant[];
  variant_title?: string; // Dynamic title for variants section (e.g., "Size", "Type", etc.)
  addons: ItemAddon[];
  createdAt: Timestamp;
  status: 'active' | 'inactive' | string;
  updatedAt: Timestamp;
  discountedPrice?: number;
  item_images?: Array<{ url: string; path: string }>;
  spiceLevels?: string[]; // Array of spice level options (e.g., ["None", "Mild", "Medium", "Hot", "Extra Hot"])
  spiceLevelEnabled?: boolean; // Whether spice level selection is enabled for this item
}

export interface MenuSection {
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
  items: string[] | MenuItem[]; // Array of item IDs or full item objects
  section_id?: string;
  category_type?: string;
}

export interface ItemsResponse {
  data: MenuItem[];
}

/**
 * Menu with populated items
 */
export interface MenuWithItems extends Menu {
  items: MenuItem[];
}
