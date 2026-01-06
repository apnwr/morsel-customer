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
  availability: MenuAvailability;
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

export interface ItemAddonOption {
  name: string;
  price: number;
}

export interface ItemAddon {
  id: string;
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
  addons: ItemAddon[];
  createdAt: Timestamp;
  status: 'active' | 'inactive' | string;
  updatedAt: Timestamp;
  discountedPrice?: number;
  item_images?: Array<{ url: string; path: string }>;
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
