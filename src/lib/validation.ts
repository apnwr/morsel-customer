/**
 * Input validation utilities
 */

/**
 * Validate customer name
 * Requirements: non-empty, max 60 characters
 */
export function validateCustomerName(name: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return {
      isValid: false,
      error: 'Please enter your name',
    };
  }

  if (trimmedName.length > 60) {
    return {
      isValid: false,
      error: 'Name must be 60 characters or less',
    };
  }

  // Check for invalid characters (optional - basic sanitization)
  const validNamePattern = /^[a-zA-Z0-9\s\-'.]+$/;
  if (!validNamePattern.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Name contains invalid characters',
    };
  }

  return { isValid: true };
}

/**
 * Sanitize customer name
 */
export function sanitizeCustomerName(name: string): string {
  return name.trim().slice(0, 60);
}

/**
 * Validate quantity
 * Requirements: 1-99
 */
export function validateQuantity(quantity: number): {
  isValid: boolean;
  validQuantity: number;
  error?: string;
} {
  // Ensure it's a number
  if (typeof quantity !== 'number' || isNaN(quantity)) {
    return {
      isValid: false,
      validQuantity: 1,
      error: 'Quantity must be a number',
    };
  }

  // Floor to integer
  const intQuantity = Math.floor(quantity);

  // Validate range
  if (intQuantity < 1) {
    return {
      isValid: false,
      validQuantity: 1,
      error: 'Quantity must be at least 1',
    };
  }

  if (intQuantity > 99) {
    return {
      isValid: false,
      validQuantity: 99,
      error: 'Quantity cannot exceed 99',
    };
  }

  return {
    isValid: true,
    validQuantity: intQuantity,
  };
}

/**
 * Sanitize quantity to valid range
 */
export function sanitizeQuantity(quantity: number): number {
  const intQuantity = Math.floor(quantity);
  return Math.max(1, Math.min(99, intQuantity));
}

/**
 * Validate split amounts
 * Requirements: sum must equal total (with tolerance for rounding)
 */
export function validateSplitAmounts(
  shares: Record<string, number>,
  total: number
): {
  isValid: boolean;
  error?: string;
  difference?: number;
} {
  const sum = Object.values(shares).reduce((acc, val) => acc + val, 0);
  const tolerance = 0.01; // 1 cent tolerance for rounding
  const difference = Math.abs(sum - total);

  if (difference > tolerance) {
    return {
      isValid: false,
      error: `Split amounts must equal total. Difference: $${difference.toFixed(2)}`,
      difference,
    };
  }

  // Check for negative amounts
  const hasNegative = Object.values(shares).some((val) => val < 0);
  if (hasNegative) {
    return {
      isValid: false,
      error: 'Split amounts cannot be negative',
    };
  }

  return { isValid: true };
}

/**
 * Sanitize split amount
 */
export function sanitizeSplitAmount(amount: number): number {
  // Ensure non-negative and round to 2 decimal places
  return Math.max(0, Math.round(amount * 100) / 100);
}

/**
 * Validate table number
 */
export function validateTableNumber(
  tableNumber: number,
  maxTables: number
): {
  isValid: boolean;
  validTableNumber: number;
  error?: string;
} {
  if (typeof tableNumber !== 'number' || isNaN(tableNumber)) {
    return {
      isValid: false,
      validTableNumber: 1,
      error: 'Table number must be a number',
    };
  }

  const intTableNumber = Math.floor(tableNumber);

  if (intTableNumber < 1) {
    return {
      isValid: false,
      validTableNumber: 1,
      error: 'Table number must be at least 1',
    };
  }

  if (intTableNumber > maxTables) {
    return {
      isValid: false,
      validTableNumber: maxTables,
      error: `Table number cannot exceed ${maxTables}`,
    };
  }

  return {
    isValid: true,
    validTableNumber: intTableNumber,
  };
}

/**
 * Sanitize general text input
 */
export function sanitizeTextInput(
  text: string,
  maxLength: number = 255
): string {
  return text.trim().slice(0, maxLength);
}

/**
 * Validate notes/comments
 */
export function validateNotes(notes: string): {
  isValid: boolean;
  sanitizedNotes: string;
  error?: string;
} {
  const maxLength = 500;
  const trimmedNotes = notes.trim();

  if (trimmedNotes.length > maxLength) {
    return {
      isValid: false,
      sanitizedNotes: trimmedNotes.slice(0, maxLength),
      error: `Notes must be ${maxLength} characters or less`,
    };
  }

  return {
    isValid: true,
    sanitizedNotes: trimmedNotes,
  };
}
