'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Cart, CartItem, Customization } from '@/types/cart';
import { MenuItem } from '@/types/menu';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { sanitizeQuantity } from '@/lib/validation';
import { useSession } from '@/contexts/SessionContext';
import { orderService } from '@/services/order.service';
import { sessionService } from '@/services/session.service';
import type { QueueItem, OrderItemAddon } from '@/types/api/order';
import type { SessionQueueItem, SessionOrderQueue } from '@/types/api/session';
import { subscribeToOrderQueue, isFirebaseAvailable } from '@/lib/firebase';

const STORAGE_KEY = 'morsel_cart';
const MENU_ITEMS_CACHE_KEY = 'morsel_menu_items_cache'; // Cache for full menu items with customOptions
const TAX_RATE = 0.1; // 10% tax
const QUEUE_SYNC_INTERVAL = 15000; // Sync queue every 15 seconds (fallback)

interface CartState {
  cart: Cart;
  addItem: (menuItem: MenuItem, customizations?: Customization[], notes?: string, quantity?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  confirmOrder: (paymentType: 'cash' | 'card' | 'upi' | string) => Promise<{ orderId: string; success: boolean }>;
  syncCartFromQueue: () => Promise<void>;
  /** Set when user adds or removes via addItem/removeItem (not from sync). Consumed by Header to show "X item(s) added/removed" snackbar once. */
  lastCartAction: { type: 'added' | 'removed'; count: number } | null;
  clearLastCartAction: () => void;
}

const CartContext = createContext<CartState | undefined>(undefined);

function getEmptyCart(): Cart {
  return {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
  };
}

function calculateItemTotal(menuItem: MenuItem, customizations: Customization[], quantity: number): number {
  let total = menuItem.price;
  
  // Add customization price modifiers
  customizations.forEach((custom) => {
    total += custom.priceModifier;
  });
  
  return total * quantity;
}

function calculateCartTotals(items: CartItem[]): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const result = {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };

  console.log('[CartContext] 💵 Cart totals calculated:', {
    itemsCount: items.length,
    itemTotals: items.map(item => `${item.menuItem.name}: $${item.itemTotal.toFixed(2)} (qty: ${item.quantity})`),
    subtotal: `$${result.subtotal.toFixed(2)}`,
    tax: `$${result.tax.toFixed(2)} (${(TAX_RATE * 100).toFixed(0)}%)`,
    total: `$${result.total.toFixed(2)}`
  });

  return result;
}

function generateCartItemId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `cart_${timestamp}_${random}`;
}

/**
 * Cache a menu item with full customOptions for later retrieval
 * This allows us to restore customization options when syncing from API
 */
function cacheMenuItem(menuItem: MenuItem): void {
  try {
    const cache = getFromStorage<Record<string, MenuItem>>(MENU_ITEMS_CACHE_KEY) || {};
    cache[menuItem.id] = menuItem;
    setInStorage(MENU_ITEMS_CACHE_KEY, cache);
  } catch (error) {
    console.warn('[CartContext] Failed to cache menu item:', error);
  }
}

/**
 * Retrieve a cached menu item with full customOptions
 * Returns the cached item or undefined if not found
 */
function getCachedMenuItem(itemId: string): MenuItem | undefined {
  try {
    const cache = getFromStorage<Record<string, MenuItem>>(MENU_ITEMS_CACHE_KEY) || {};
    return cache[itemId];
  } catch (error) {
    console.warn('[CartContext] Failed to retrieve cached menu item:', error);
    return undefined;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { sessionData, refreshSessionData } = useSession();
  const [cart, setCart] = useState<Cart>(() => {
    // Initialize from localStorage or use empty cart
    const stored = getFromStorage<Cart>(STORAGE_KEY);

    if (stored && Array.isArray(stored.items)) {
      return stored;
    }

    return getEmptyCart();
  });
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const firebaseUnsubscribeRef = useRef<(() => void) | null>(null);
  const isUsingFirebaseRef = useRef<boolean>(false);
  const [lastCartAction, setLastCartAction] = useState<{ type: 'added' | 'removed'; count: number } | null>(null);
  const clearLastCartAction = useCallback(() => setLastCartAction(null), []);
  /** Timestamp of our last addItem/removeItem; used to skip setting lastCartAction in processOrderQueueData when the update is our own sync echo. */
  const lastLocalCartActionAtRef = useRef<number | null>(null);
  const LOCAL_ECHO_MS = 2500;
  /** Ref to always read latest cart in processOrderQueueData; the Firebase/polling callback can close over a stale cart. */
  const cartRef = useRef<Cart>(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  /**
   * Sync Queue with API
   * Converts cart items to queue items and syncs with the backend
   * This is called after every cart operation
   *
   * IMPORTANT: Only syncs the CURRENT USER's items, not other participants' items
   * This prevents overwriting other users' queues
   */
  const syncQueueWithAPI = async (cartItems: CartItem[]) => {
    console.log('[CartContext] 🔄 syncQueueWithAPI called with', cartItems.length, 'items');

    // Only sync if we have an active session
    if (!sessionData?.session?.id) {
      console.warn('[CartContext] ⚠️ Active session not available, skipping queue sync');
      console.log('[CartContext] Session data:', sessionData);
      return;
    }

    console.log('[CartContext] ✅ Session available:', sessionData.session.id);

    // Get current user's sessionUserId
    const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');
    if (!currentSessionUserId) {
      console.warn('[CartContext] ⚠️ No sessionUserId found, skipping queue sync');
      return;
    }

    // CRITICAL FIX: Filter to only include THIS user's items
    // This prevents sending other participants' items and overwriting their queues
    const userItems = cartItems.filter(item =>
      !item.sessionUserId || item.sessionUserId === currentSessionUserId
    );

    console.log('[CartContext] 📦 Filtered items:', {
      totalItemsInCart: cartItems.length,
      userItemsToSync: userItems.length,
      otherUsersItems: cartItems.length - userItems.length
    });

    try {
      // Convert cart items to queue items format with variants and addons
      // Each cart item becomes a separate queue item (no grouping by itemId)
      const queueItems: QueueItem[] = userItems.map((cartItem) => {
        // Extract variant index from customizations
        let variantIndex = 0;
        const variantCustomization = cartItem.customizations.find(
          (c) => c.optionId === 'variant'
        );
        if (variantCustomization) {
          const match = variantCustomization.choiceId.match(/variant-(\d+)/);
          if (match) {
            variantIndex = parseInt(match[1], 10);
          }
        }

        // Group addons by addon index and collect selected options
        const addonsMap = new Map<number, Set<number>>();

        cartItem.customizations.forEach((customization) => {
          // Skip variant customizations
          if (customization.optionId === 'variant') {
            return;
          }

          // Parse addon group index from optionId (e.g., "addon-group-0" -> 0)
          const groupMatch = customization.optionId.match(/addon-group-(\d+)/);
          if (groupMatch) {
            const addonIndex = parseInt(groupMatch[1], 10);

            // Parse option index from choiceId (e.g., "addon-0-2" -> 2)
            const optionMatch = customization.choiceId.match(/addon-\d+-(\d+)/);
            if (optionMatch) {
              const optionIndex = parseInt(optionMatch[1], 10);

              // Add to map
              if (!addonsMap.has(addonIndex)) {
                addonsMap.set(addonIndex, new Set());
              }
              addonsMap.get(addonIndex)!.add(optionIndex);
            }
          }
        });

        // Convert map to array format, sorted by addon index
        const addOns: OrderItemAddon[] = Array.from(addonsMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([addonIndex, optionsSet]) => ({
            addonIndex,
            selectedOptions: Array.from(optionsSet).sort((a, b) => a - b),
          }));

        console.log('[CartContext] 📦 Adding to queue:', {
          itemId: cartItem.menuItem.id,
          name: cartItem.menuItem.name,
          quantity: cartItem.quantity,
          variantIndex,
          addOns: addOns.length > 0 ? addOns : []
        });

        return {
          itemId: cartItem.menuItem.id,
          quantity: cartItem.quantity,
          variantIndex,
          addOns,
        };
      });

      // Use the currentSessionUserId we already retrieved
      console.log('[CartContext] Using sessionUserId:', currentSessionUserId.substring(0, 8) + '...');

      // Log the complete payload structure
      const payload = {
        sessionUserId: currentSessionUserId,
        items: queueItems,
      };

      console.log('[CartContext] 📤 Queue API Payload Structure:', {
        sessionId: sessionData.session.id,
        itemsCount: queueItems.length,
      });

      console.log('[CartContext] 📋 Full Payload (matching API documentation):',
        JSON.stringify(payload, null, 2)
      );

      // Sync with API
      const response = await orderService.updateQueue(sessionData.session.id, payload);

      console.log('[CartContext] ✅ Queue synced successfully:', response);
    } catch (error) {
      console.error('[CartContext] ❌ Failed to sync queue with API:', error);
      if (error instanceof Error) {
        console.error('[CartContext] Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      // Continue working offline - don't block cart operations
    }
  };

  // Save to localStorage whenever cart changes
  useEffect(() => {
    setInStorage(STORAGE_KEY, cart);
  }, [cart]);

  // Hybrid Firebase + Polling sync for cart
  // Uses Firebase Realtime DB if available, falls back to polling
  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      // Unsubscribe from Firebase
      if (firebaseUnsubscribeRef.current) {
        console.log('[CartContext] 🔌 Cleaning up Firebase listener');
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }
      // Clear polling interval
      if (syncIntervalRef.current) {
        console.log('[CartContext] ⏰ Clearing polling interval');
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      isUsingFirebaseRef.current = false;
    };

    // Early exit if no session
    if (!sessionData?.session?.id || !sessionData?.space?.id) {
      cleanup();
      return;
    }

    // Validate session
    const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');
    if (!currentSessionUserId) {
      console.log('[CartContext] ⏭️ Skipping sync - user has not joined session yet');
      cleanup();
      return;
    }

    if (sessionData.session.status !== 'active') {
      console.log('[CartContext] ⏭️ Skipping sync - session not active');
      cleanup();
      return;
    }

    const isParticipant = sessionData.session.participants?.some(
      p => p.sessionUserId === currentSessionUserId
    );
    if (!isParticipant) {
      console.log('[CartContext] ⏭️ Skipping sync - user is not a participant');
      cleanup();
      return;
    }

    // Valid session - set up sync
    console.log('[CartContext] ✅ Valid session detected, setting up sync');
    console.log('[CartContext] 🔍 Session details:', {
      sessionId: sessionData.session.id.substring(0, 8) + '...',
      spaceId: sessionData.space.id.substring(0, 8) + '...',
      status: sessionData.session.status,
      participantsCount: sessionData.session.participants?.length || 0
    });

    // Try Firebase first
    const firebaseAvailable = isFirebaseAvailable();
    console.log('[CartContext] 🔍 Firebase availability check result:', firebaseAvailable);

    if (firebaseAvailable) {
      console.log('[CartContext] 🔥 Firebase available - setting up realtime listener');

      const unsubscribe = subscribeToOrderQueue(
        sessionData.space.id,
        sessionData.session.id,
        (orderQueue) => {
          console.log('[CartContext] 🔥 Firebase update received, processing data...');
          isUsingFirebaseRef.current = true; // Mark that we're using Firebase
          processOrderQueueData(orderQueue);
        },
        (error) => {
          console.error('[CartContext] 🔥❌ Firebase error, falling back to polling:', error);
          isUsingFirebaseRef.current = false;
          // Firebase failed, fall back to polling
          if (!syncIntervalRef.current) {
            console.log('[CartContext] 🔥❌ Setting up polling fallback due to Firebase error');
            setupPolling();
          }
        }
      );

      console.log('[CartContext] 🔍 subscribeToOrderQueue returned:', unsubscribe ? 'function' : 'null');

      if (unsubscribe) {
        firebaseUnsubscribeRef.current = unsubscribe;
        isUsingFirebaseRef.current = true;
        console.log('[CartContext] ✅ Firebase listener active - NO POLLING WILL BE USED');
        // Do initial sync via API to get data immediately
        syncCartFromQueue();
      } else {
        // Firebase subscription failed, use polling
        console.log('[CartContext] ⚠️ Firebase subscription returned null, using polling');
        isUsingFirebaseRef.current = false;
        setupPolling();
      }
    } else {
      // Firebase not available, use polling
      console.log('[CartContext] ℹ️ Firebase not available, using polling fallback');
      isUsingFirebaseRef.current = false;
      setupPolling();
    }

    // Helper function to set up polling
    function setupPolling() {
      console.log('[CartContext] 🔧 setupPolling called - initiating polling fallback');

      // Initial sync
      syncCartFromQueue();

      // Set up interval
      syncIntervalRef.current = setInterval(() => {
        if (sessionData?.session?.status === 'active') {
          console.log('[CartContext] ⏰ Polling sync triggered (Firebase not active)');
          console.log('[CartContext] 🔍 Polling state:', {
            isUsingFirebase: isUsingFirebaseRef.current,
            hasFirebaseUnsubscribe: !!firebaseUnsubscribeRef.current,
            hasPollInterval: !!syncIntervalRef.current
          });
          syncCartFromQueue();
        }
      }, QUEUE_SYNC_INTERVAL);

      console.log('[CartContext] ⏰ Polling active (every', QUEUE_SYNC_INTERVAL / 1000, 'seconds)');
      console.log('[CartContext] ⚠️ WARNING: Using polling instead of Firebase real-time sync');
    }

    // Cleanup on unmount or session change
    return cleanup;
  }, [sessionData?.session?.id, sessionData?.session?.status]);

  const addItem = (menuItem: MenuItem, customizations: Customization[] = [], notes?: string, quantity: number = 1) => {
    const validQuantity = sanitizeQuantity(quantity);
    const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');

    // Cache the full menu item (with customOptions) for later retrieval
    // This ensures we can restore customization options when syncing from API
    cacheMenuItem(menuItem);

    // Check if the same item (without customizations) already exists in cart FOR THIS USER
    // IMPORTANT: Only merge with user's own items, not other participants' items
    const existingItemIndex = cart.items.findIndex(
      item => item.menuItem.id === menuItem.id &&
              item.customizations.length === 0 &&
              customizations.length === 0 &&
              (!item.sessionUserId || item.sessionUserId === currentSessionUserId) // Same user
    );

    let newItems: CartItem[];

    if (existingItemIndex !== -1 && customizations.length === 0) {
      // Item exists and has no customizations - update quantity
      newItems = cart.items.map((item, index) => {
        if (index === existingItemIndex) {
          const newQuantity = item.quantity + validQuantity;
          return {
            ...item,
            quantity: newQuantity,
            itemTotal: calculateItemTotal(item.menuItem, item.customizations, newQuantity),
          };
        }
        return item;
      });
    } else {
      // New item or has customizations - add as new entry
      const newCartItem: CartItem = {
        id: generateCartItemId(),
        menuItem,
        quantity: validQuantity,
        customizations,
        notes,
        itemTotal: calculateItemTotal(menuItem, customizations, validQuantity),
        sessionUserId: currentSessionUserId || undefined, // Tag with current user's ID
      };
      newItems = [...cart.items, newCartItem];
    }

    const totals = calculateCartTotals(newItems);

    const newCart = {
      items: newItems,
      ...totals,
    };

    setCart(newCart);
    lastLocalCartActionAtRef.current = Date.now();
    setLastCartAction({ type: 'added', count: validQuantity });

    // Sync with queue API
    syncQueueWithAPI(newItems);
  };

  const removeItem = (cartItemId: string) => {
    // Check if user has permission to remove this item
    const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');
    const itemToRemove = cart.items.find((item) => item.id === cartItemId);

    if (itemToRemove?.sessionUserId && itemToRemove.sessionUserId !== currentSessionUserId) {
      console.warn('[CartContext] ⚠️ Cannot remove item - belongs to another user');
      return; // User can only remove their own items
    }

    const removedCount = itemToRemove?.quantity ?? 0;
    const newItems = cart.items.filter((item) => item.id !== cartItemId);
    const totals = calculateCartTotals(newItems);

    const newCart = {
      items: newItems,
      ...totals,
    };

    setCart(newCart);
    if (removedCount > 0) {
      lastLocalCartActionAtRef.current = Date.now();
      setLastCartAction({ type: 'removed', count: removedCount });
    }

    // Sync with queue API
    syncQueueWithAPI(newItems);
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    // Validate and sanitize quantity
    const validQuantity = sanitizeQuantity(quantity);

    // Check if user has permission to update this item
    const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');
    const itemToUpdate = cart.items.find((item) => item.id === cartItemId);

    if (itemToUpdate?.sessionUserId && itemToUpdate.sessionUserId !== currentSessionUserId) {
      console.warn('[CartContext] ⚠️ Cannot update item - belongs to another user');
      return; // User can only update their own items
    }

    const newItems = cart.items.map((item) => {
      if (item.id === cartItemId) {
        const itemTotal = calculateItemTotal(item.menuItem, item.customizations, validQuantity);
        return {
          ...item,
          quantity: validQuantity,
          itemTotal,
        };
      }
      return item;
    });

    const totals = calculateCartTotals(newItems);

    const newCart = {
      items: newItems,
      ...totals,
    };

    setCart(newCart);

    // Sync with queue API
    syncQueueWithAPI(newItems);
  };

  const clearCart = () => {
    setCart(getEmptyCart());

    // Sync with queue API (empty cart)
    syncQueueWithAPI([]);
  };

  const getItemCount = (): number => {
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  /**
   * Process order queue data and update cart
   * Helper function used by both Firebase listeners and polling fallback
   */
  const processOrderQueueData = (orderQueue: SessionOrderQueue[]) => {
    if (!sessionData?.session?.id) {
      return;
    }

    if (!orderQueue || orderQueue.length === 0) {
      console.log('[CartContext] ℹ️ No queue data to process');
      const prevTotal = cartRef.current.items.reduce((s, i) => s + i.quantity, 0);
      const isOwnEcho = lastLocalCartActionAtRef.current != null && Date.now() - lastLocalCartActionAtRef.current < LOCAL_ECHO_MS;
      if (isOwnEcho) lastLocalCartActionAtRef.current = null;
      else if (prevTotal > 0) setLastCartAction({ type: 'removed', count: prevTotal });
      setCart(getEmptyCart());
      return;
    }

    console.log('[CartContext] 📦 Processing queue data:', {
      queueEntries: orderQueue.length,
      participants: orderQueue.map(q => ({
        sessionUserId: q.sessionUserId.substring(0, 8) + '...',
        itemsCount: q.items.length
      }))
    });

    // Get business ID for MenuItem creation
    const businessId = sessionData.business?.id || 'unknown';

    // Merge ALL participants' items into shared cart (Option B: Shared Cart)
    const allCartItems: CartItem[] = [];

    orderQueue.forEach((participantQueue) => {
      const items = participantQueue.items ?? [];
      // Convert each participant's SessionQueueItem[] to CartItem[]
      const participantCartItems: CartItem[] = items.map((queueItem: SessionQueueItem) => {
        // Try to get the full menu item from cache (with customOptions)
        const cachedMenuItem = getCachedMenuItem(queueItem.itemId);

        // Create MenuItem from queue data
        // If cached item exists, use it but update price from API (to reflect variant price)
        // If not cached, create a basic MenuItem without customOptions
        const menuItem: MenuItem = cachedMenuItem ? {
          ...cachedMenuItem,
          price: queueItem.variantPrice, // Use API price (includes variant)
          name: queueItem.name, // Use API name in case it changed
        } : {
          id: queueItem.itemId,
          restaurantId: businessId,
          categoryId: 'unknown',
          name: queueItem.name,
          description: '',
          price: queueItem.variantPrice,
          image: '',
          tags: [],
          isCustomizable: (queueItem.addOns?.length || 0) > 0 || queueItem.variantIndex > 0,
          customOptions: [], // Empty if not cached
        };

        // Build customizations array from variant and addons
        const customizations: Customization[] = [];

        if (queueItem.variantIndex !== undefined && queueItem.variantName) {
          customizations.push({
            optionId: 'variant',
            optionName: 'Variant',
            choiceId: `variant-${queueItem.variantIndex}`,
            choiceLabel: queueItem.variantName,
            priceModifier: 0,
          });
        }

        // Reconstruct addon customizations with correct choiceId format
        queueItem.addOns?.forEach((queueAddon) => {
          queueAddon.selectedOptions?.forEach((optionData) => {
            // Try to find the correct choiceId from cached menu item's customOptions
            let choiceId = `addon-${queueAddon.addonIndex}-${optionData.name}`; // Fallback

            if (menuItem.customOptions) {
              const addonGroup = menuItem.customOptions.find(
                opt => opt.id === `addon-group-${queueAddon.addonIndex}`
              );

              if (addonGroup && addonGroup.choices) {
                // Find the choice by matching the label (option name)
                const choice = addonGroup.choices.find(
                  c => c.label === optionData.name
                );

                if (choice) {
                  // Use the actual choice.id from customOptions (correct format: addon-X-Y)
                  choiceId = choice.id;
                }
              }
            }

            customizations.push({
              optionId: `addon-group-${queueAddon.addonIndex}`,
              optionName: queueAddon.addonName,
              choiceId: choiceId,
              choiceLabel: optionData.name,
              priceModifier: optionData.price,
            });
          });
        });

        return {
          id: generateCartItemId(),
          menuItem,
          quantity: queueItem.quantity,
          customizations,
          itemTotal: queueItem.itemTotal,
          sessionUserId: participantQueue.sessionUserId,
        };
      });

      allCartItems.push(...participantCartItems);
    });

    // Update cart with merged items
    const totals = calculateCartTotals(allCartItems);
    const newCart = {
      items: allCartItems,
      ...totals,
    };

    // Notify "X item(s) added/removed" when sync reflects changes from other participants. Skip when likely our own sync echo (local add/remove within LOCAL_ECHO_MS). Skip when prevTotal===0 to avoid "X added" on first load.
    // Use cartRef.current so prevTotal is the latest cart; the Firebase/polling callback can close over a stale cart and miss nextTotal < prevTotal for removals.
    const prevTotal = cartRef.current.items.reduce((s, i) => s + i.quantity, 0);
    const nextTotal = allCartItems.reduce((s, i) => s + i.quantity, 0);
    const isOwnEcho = lastLocalCartActionAtRef.current != null && Date.now() - lastLocalCartActionAtRef.current < LOCAL_ECHO_MS;
    if (isOwnEcho) lastLocalCartActionAtRef.current = null;
    else {
      if (nextTotal < prevTotal) setLastCartAction({ type: 'removed', count: prevTotal - nextTotal });
      else if (nextTotal > prevTotal && prevTotal > 0) setLastCartAction({ type: 'added', count: nextTotal - prevTotal });
    }

    setCart(newCart);

    console.log('[CartContext] ✅ Shared cart processed:', {
      totalParticipants: orderQueue.length,
      totalItems: allCartItems.length,
      total: `$${totals.total.toFixed(2)}`
    });
  };

  /**
   * Sync Cart from Queue (Polling fallback)
   * Fetches the order queue from the session API and syncs it with the local cart
   * This allows participants to see items added by others in the same session
   */
  const syncCartFromQueue = async (): Promise<void> => {
    console.log('[CartContext] 🔄 syncCartFromQueue called');
    console.log('[CartContext] 🔍 Sync trigger context:', {
      isUsingFirebase: isUsingFirebaseRef.current,
      hasActiveFirebaseListener: !!firebaseUnsubscribeRef.current,
      hasPollingInterval: !!syncIntervalRef.current,
      reason: isUsingFirebaseRef.current ? 'Initial sync (Firebase active)' : 'Polling fallback (Firebase not active)'
    });

    // Only sync if we have an active session
    if (!sessionData?.session?.id) {
      console.warn('[CartContext] ⚠️ Active session not available, skipping cart sync from queue');
      return;
    }

    // Get current sessionUserId
    const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');
    if (!currentSessionUserId) {
      console.warn('[CartContext] ⚠️ Session user ID not found, skipping cart sync');
      return;
    }

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/ordering-session/session/${sessionData.session.id}`;
      console.log('[CartContext] 📡 API CALL:', apiUrl);
      console.log('[CartContext] 📥 Fetching session data via API...');

      // Fetch session details including orderQueue
      const sessionResponse = await sessionService.getSessionById(sessionData.session.id);
      const { orderQueue } = sessionResponse.data;

      console.log('[CartContext] ✅ API response received, processing queue data');

      // Process the queue data (cart items)
      processOrderQueueData(orderQueue);

      // Also refresh session data (participants, counts, etc.)
      // This ensures participant count and other session metadata stay in sync
      try {
        await refreshSessionData();
        console.log('[CartContext] ✅ Session metadata refreshed (participants synced)');
      } catch (refreshError) {
        console.warn('[CartContext] ⚠️ Failed to refresh session metadata:', refreshError);
        // Don't throw - cart sync is more critical
      }
    } catch (error) {
      console.error('[CartContext] ❌ Failed to sync cart from queue:', error);
      if (error instanceof Error) {
        console.error('[CartContext] Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      // Don't throw - continue working with local cart
    }
  };

  const confirmOrder = async (paymentType: 'cash' | 'card' | 'upi' | string): Promise<{ orderId: string; success: boolean }> => {
    // Validate session data
    if (!sessionData?.session?.id) {
      throw new Error('Active session not available. Please login again.');
    }

    // Validate cart is not empty
    if (cart.items.length === 0) {
      throw new Error('Cart is empty. Please add items before confirming order.');
    }

    try {
      // ✅ Get sessionUserId from storage (provided by API during login)
      const sessionUserId = getFromStorage<string>('morsel_session_user_id');
      if (!sessionUserId) {
        throw new Error('Session user ID not found. Please login again.');
      }

      // Log the order confirmation payload for debugging
      console.log('[CartContext] 📦 Confirming order with payload:', {
        sessionUserId: sessionUserId.substring(0, 8) + '...',
        paymentType
      });

      // Confirm the order via API (queue must already be synced)
      const response = await orderService.confirmOrder(sessionData.session.id, {
        sessionUserId,
        paymentType,
      });

      console.log('[CartContext] Order confirmed successfully:', {
        orderId: response.data.id,
        status: response.data.status,
        total: response.data.total,
      });

      // ✅ Refresh session data to get updated orders array
      try {
        await refreshSessionData();
        console.log('[CartContext] Session data refreshed after order confirmation');

        // Verify order appears in session (optional verification)
        // This will be logged in refreshSessionData
      } catch (refreshError) {
        console.warn('[CartContext] Failed to refresh session after order confirmation:', refreshError);
        // Don't throw - continue even if refresh fails
      }

      // Store order data temporarily for order-status page with timestamp
      // Also store participant mapping for each item
      const itemParticipantMap: Record<string, string> = {};
      cart.items.forEach(cartItem => {
        if (cartItem.sessionUserId) {
          itemParticipantMap[cartItem.menuItem.id] = cartItem.sessionUserId;
        }
      });

      const orderWithTimestamp = {
        ...response.data,
        _placedAt: Date.now(), // Store when order was placed for timer calculation
        _itemParticipants: itemParticipantMap, // Map itemId -> sessionUserId
      };
      setInStorage(`morsel_order_${response.data.id}`, orderWithTimestamp);

      // Clear the cart on successful order confirmation
      clearCart();

      return {
        orderId: response.data.id,
        success: true,
      };
    } catch (error) {
      console.error('Failed to confirm order:', error);
      throw new Error('Failed to confirm order. Please try again.');
    }
  };

  const value: CartState = {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemCount,
    confirmOrder,
    syncCartFromQueue,
    lastCartAction,
    clearLastCartAction,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
