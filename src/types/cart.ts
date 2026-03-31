import { MenuItem } from './menu';

export interface Customization {
  optionId: string;
  optionName: string;
  choiceId: string;
  choiceLabel: string;
  priceModifier: number;
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  customizations: Customization[];
  notes?: string;
  itemTotal: number;
  sessionUserId?: string; // Track which participant added this item (for shared cart)
  spiceLevel?: string; // Selected spice level (e.g., "Mild", "Hot")
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  isMock: boolean;
}

export interface SplitBill {
  mode: 'even' | 'custom' | 'self' | 'all' | 'items';
  participants: Participant[];
  shares: Record<string, number>;
  isValid: boolean;
  /** Total (e.g. ordersTotal or order total) these shares were calculated for. Used to avoid applying cart/order split on my-tab and vice versa. */
  splitForTotal?: number | null;
}
