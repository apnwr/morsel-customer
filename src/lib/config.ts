/**
 * Application configuration
 * Centralized access to environment variables
 */

export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  },
} as const;

/**
 * Validate that required environment variables are set
 */
export function validateConfig() {
  if (!config.api.baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined in environment variables');
  }
}
