/**
 * Application configuration
 * Centralized access to environment variables
 */

export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  },
  peachPayments: {
    entityKey: process.env.NEXT_PUBLIC_PEACH_PAYMENTS_ENTITY_KEY || '',
    sandbox: process.env.NEXT_PUBLIC_PEACH_PAYMENTS_SANDBOX !== 'false',
  },
  features: {
    /** When false, all menus are treated as always available (ignores availability field) */
    menuAvailabilityCheck: false,
  },
};

/**
 * Validate that required environment variables are set
 */
export function validateConfig() {
  if (!config.api.baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined in environment variables');
  }
}
