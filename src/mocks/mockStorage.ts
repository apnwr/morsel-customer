/**
 * localStorage utility functions with error handling and validation
 */

const STORAGE_PREFIX = 'morsel_';

export const STORAGE_KEYS = {
  RESTAURANT_CONTEXT: `${STORAGE_PREFIX}restaurant_context`,
  CART: `${STORAGE_PREFIX}cart`,
  ORDER: `${STORAGE_PREFIX}order`,
  SPLIT: `${STORAGE_PREFIX}split`,
  CUSTOMER_NAME: `${STORAGE_PREFIX}customer_name`,
  DINING_TYPE: `${STORAGE_PREFIX}dining_type`,
  DEBUG_PANEL_ENABLED: 'enableDebugPanel',
} as const;

// In-memory fallback storage when localStorage is unavailable
const memoryStorage = new Map<string, string>();
let localStorageAvailable: boolean | null = null;
let hasShownWarning = false;

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  // Cache the result to avoid repeated checks
  if (localStorageAvailable !== null) {
    return localStorageAvailable;
  }

  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    localStorageAvailable = true;
    return true;
  } catch {
    localStorageAvailable = false;
    if (!hasShownWarning) {
      console.warn('localStorage is not available. Using in-memory storage fallback. Data will not persist across sessions.');
      hasShownWarning = true;
    }
    return false;
  }
}

/**
 * Get item from localStorage with error handling and fallback to memory storage
 */
export function getFromStorage<T>(key: string): T | null {
  if (!isLocalStorageAvailable()) {
    // Use in-memory fallback
    try {
      const item = memoryStorage.get(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading from memory storage (key: ${key}):`, error);
      return null;
    }
  }

  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from localStorage (key: ${key}):`, error);
    // Try memory fallback as last resort
    try {
      const item = memoryStorage.get(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }
}

/**
 * Set item in localStorage with error handling and fallback to memory storage
 */
export function setInStorage<T>(key: string, value: T): boolean {
  const serialized = JSON.stringify(value);

  if (!isLocalStorageAvailable()) {
    // Use in-memory fallback
    try {
      memoryStorage.set(key, serialized);
      return true;
    } catch (error) {
      console.error(`Error writing to memory storage (key: ${key}):`, error);
      return false;
    }
  }

  try {
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (key: ${key}):`, error);
    // Fall back to memory storage
    try {
      memoryStorage.set(key, serialized);
      console.warn(`Falling back to memory storage for key: ${key}`);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Remove item from localStorage with fallback to memory storage
 */
export function removeFromStorage(key: string): boolean {
  if (!isLocalStorageAvailable()) {
    // Use in-memory fallback
    try {
      memoryStorage.delete(key);
      return true;
    } catch (error) {
      console.error(`Error removing from memory storage (key: ${key}):`, error);
      return false;
    }
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error);
    // Fall back to memory storage
    try {
      memoryStorage.delete(key);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Clear all MORSEL-related items from localStorage and memory storage
 */
export function clearMorselStorage(): boolean {
  if (!isLocalStorageAvailable()) {
    // Clear memory storage
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        memoryStorage.delete(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing memory storage:', error);
      return false;
    }
  }

  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    // Also clear memory storage to be safe
    Object.values(STORAGE_KEYS).forEach((key) => {
      memoryStorage.delete(key);
    });
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    // Try to clear memory storage at least
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        memoryStorage.delete(key);
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Validate and sanitize data before storage
 */
export function sanitizeString(value: string, maxLength: number = 255): string {
  return value.trim().slice(0, maxLength);
}

/**
 * Validate numeric value
 */
export function validateNumber(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

/**
 * Check if a storage key exists
 */
export function hasStorageKey(key: string): boolean {
  if (!isLocalStorageAvailable()) {
    return memoryStorage.has(key);
  }

  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking localStorage key (${key}):`, error);
    // Check memory storage as fallback
    return memoryStorage.has(key);
  }
}

/**
 * Get storage availability status
 */
export function getStorageStatus(): {
  available: boolean;
  usingMemoryFallback: boolean;
} {
  const available = isLocalStorageAvailable();
  return {
    available,
    usingMemoryFallback: !available,
  };
}
