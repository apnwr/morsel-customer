import { Cart, SplitBill } from './cart';
import { RestaurantContext } from './restaurant';

export interface Order {
  id: string;
  restaurantContext: RestaurantContext;
  customerName: string;
  diningType: 'dine-in' | 'takeaway' | 'delivery';
  cart: Cart;
  split: SplitBill;
  status: 'pending' | 'placed' | 'locked' | 'completed';
  placedAt?: number;
  timerDuration: number;
  timerExpiresAt?: number;
  eta?: number;
  isEditable: boolean;
}
