'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  formatPrice as libFormatPrice,
} from '@/lib/currencies';

interface LocaleState {
  /** ISO 4217 currency code, e.g. "MUR" */
  currency: string;
  /** IANA timezone string, e.g. "Indian/Mauritius" */
  timezone: string;
  /**
   * Format an amount using the active currency.
   * e.g. formatPrice(250) → "₨ 250.00"
   */
  formatPrice: (amount: number) => string;
  /**
   * Override currency/timezone from the session API.
   * Missing fields are left unchanged.
   */
  setLocale: (params: { currency?: string; timezone?: string }) => void;
}

const LocaleContext = createContext<LocaleState | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);

  // Stable updater — no deps, so SessionContext can call this without circular re-render loops
  const setLocale = useCallback(
    ({ currency: newCurrency, timezone: newTimezone }: { currency?: string; timezone?: string }) => {
      if (newCurrency) setCurrency((prev) => (prev === newCurrency ? prev : newCurrency));
      if (newTimezone) setTimezone((prev) => (prev === newTimezone ? prev : newTimezone));
    },
    []
  );

  const value = useMemo<LocaleState>(
    () => ({
      currency,
      timezone,
      formatPrice: (amount: number) => libFormatPrice(amount, currency),
      setLocale,
    }),
    [currency, timezone, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleState {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}
