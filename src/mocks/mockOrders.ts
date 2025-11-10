import { Order } from '@/types/order';

/**
 * Timer duration in seconds (2 minutes)
 */
export const ORDER_TIMER_DURATION = 120;

/**
 * Generate random ETA between 15-25 minutes
 */
export function generateETA(): number {
  return Math.floor(Math.random() * (25 - 15 + 1)) + 15;
}

/**
 * Start order timer
 */
export function startOrderTimer(order: Order): Order {
  const now = Date.now();
  const expiresAt = now + ORDER_TIMER_DURATION * 1000;

  return {
    ...order,
    status: 'placed',
    placedAt: now,
    timerExpiresAt: expiresAt,
    eta: generateETA(),
    isEditable: true,
  };
}

/**
 * Check if timer has expired
 */
export function isTimerExpired(order: Order): boolean {
  if (!order.timerExpiresAt) {
    return false;
  }

  return Date.now() >= order.timerExpiresAt;
}

/**
 * Get remaining time in seconds
 */
export function getRemainingTime(order: Order): number {
  if (!order.timerExpiresAt) {
    return 0;
  }

  const remaining = Math.floor((order.timerExpiresAt - Date.now()) / 1000);
  return Math.max(0, remaining);
}

/**
 * Format remaining time as MM:SS
 */
export function formatRemainingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Synchronize timer state after page refresh
 */
export function syncOrderTimer(order: Order): Order {
  if (!order.timerExpiresAt || order.status !== 'placed') {
    return order;
  }

  const now = Date.now();

  if (now >= order.timerExpiresAt) {
    // Timer expired while app was closed
    return {
      ...order,
      status: 'locked',
      isEditable: false,
    };
  }

  // Timer still active
  return {
    ...order,
    isEditable: true,
  };
}

/**
 * Expire timer manually (for testing)
 */
export function expireTimer(order: Order): Order {
  return {
    ...order,
    status: 'locked',
    isEditable: false,
    timerExpiresAt: Date.now(),
  };
}

/**
 * Generate unique order ID
 */
export function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `order_${timestamp}_${random}`;
}

/**
 * Calculate time until timer expires (in milliseconds)
 */
export function getTimeUntilExpiry(order: Order): number {
  if (!order.timerExpiresAt) {
    return 0;
  }

  return Math.max(0, order.timerExpiresAt - Date.now());
}

/**
 * Check if order is editable based on timer
 */
export function canEditOrder(order: Order): boolean {
  if (order.status !== 'placed') {
    return false;
  }

  return !isTimerExpired(order);
}
