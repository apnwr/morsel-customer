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
    /**
     * Dev-only escape hatch: when on, the client trusts Peach's `result.code`
     * on the verify response even if backend returns `success: false`.
     * Opt-in via NEXT_PUBLIC_PEACH_TRUST_CLIENT=1. Hard-off in production builds.
     */
    trustClientResultCode:
      process.env.NODE_ENV !== 'production' &&
      process.env.NEXT_PUBLIC_PEACH_TRUST_CLIENT === '1',
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
