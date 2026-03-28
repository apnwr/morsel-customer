/**
 * Application configuration
 * Centralized access to environment variables
 */

export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
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
