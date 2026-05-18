'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import type { OrderingSessionData, Timestamp, SessionOrder } from '@/types/api/session';
import type { SplitEntry, SplitConfig, SplitType } from '@/types/api/split';
import { sessionService } from '@/services/session.service';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { mapSessionOrderToAPIOrder } from '@/lib/order-mapping';
import { useLocale } from '@/contexts/LocaleContext';
import { STORAGE_KEYS, SESSION_SCOPED_KEYS, SPLIT_INITIATOR_PREFIX } from '@/lib/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.SESSION_DATA;
const STORAGE_KEY_USER_ID = STORAGE_KEYS.SESSION_USER_ID;
const STORAGE_KEY_ACTIVE_ORDER = STORAGE_KEYS.ACTIVE_ORDER_ID;

interface SessionState {
  // Preview session - ephemeral, not persisted (for QR scan preview before login)
  previewSession: OrderingSessionData | null;
  setPreviewSession: (data: OrderingSessionData | null) => void;

  // Active session - persistent, only set after user joins (after login)
  sessionData: OrderingSessionData | null;
  setSessionData: (data: OrderingSessionData) => void;
  clearSession: () => void;

  // Active order ID - tracks which order tab is currently active
  activeOrderId: string | null;
  setActiveOrderId: (orderId: string | null) => void;
  clearActiveOrder: () => void;

  /** Split entries from the server — includes payment status per split */
  splitPaymentStatus: SplitEntry[] | null;
  /** Split configuration from the server — legacy GET-only shape, may be null when only POST /split has run */
  serverSplitConfig: SplitConfig | null;
  /**
   * Effective split mode as reported by the server.
   * Prefers splits[0].type (newer responses carry it per-split); falls back to splitConfig.type.
   * Null when no participant has saved a split yet.
   */
  serverSplitType: SplitType | null;

  isLoading: boolean;
  isSessionActive: () => boolean;
  isSessionExpired: () => boolean;
  isUserParticipant: () => boolean;
  isParticipantPaid: (sessionUserId: string) => boolean;
  validateSession: () => { isValid: boolean; reason?: string };
  refreshSessionData: () => Promise<void>;
  endSession: (reason?: 'completed' | 'timeout' | 'left' | 'cancelled') => Promise<void>;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { setLocale } = useLocale();

  // Preview session: ephemeral state for QR scan preview (before login)
  const [previewSession, setPreviewSessionState] = useState<OrderingSessionData | null>(null);

  // Active session: persistent state for joined session (after login)
  const [sessionData, setSessionDataState] = useState<OrderingSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Split payment status from the server (not persisted — always fresh from API)
  const [splitPaymentStatus, setSplitPaymentStatus] = useState<SplitEntry[] | null>(null);
  const [serverSplitConfig, setServerSplitConfig] = useState<SplitConfig | null>(null);

  // Effective server-side split type. Newer POST /split responses no longer include splitConfig
  // but every entry in splits[] carries its own `type`. We pick the first one (all entries share
  // a type per session) and fall back to splitConfig.type for older GET shapes.
  const serverSplitType: SplitType | null = useMemo(() => {
    const fromSplits = splitPaymentStatus?.find((s) => !!s.type)?.type;
    return fromSplits ?? serverSplitConfig?.type ?? null;
  }, [splitPaymentStatus, serverSplitConfig]);

  // Active order ID: tracks which order tab is currently active
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_ORDER);
    }
    return null;
  });

  // Load from localStorage on mount and clean stale data
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedUserId = localStorage.getItem(STORAGE_KEY_USER_ID);

      if (stored) {
        const parsed = JSON.parse(stored);

        // Check for stale data: session without userId = user scanned but never joined
        if (!storedUserId) {
          console.warn('[SessionContext] 🗑️ Clearing stale session data (no sessionUserId found)');
          console.warn('[SessionContext] This happens when user scanned QR but never logged in');
          localStorage.removeItem(STORAGE_KEY);
          setSessionDataState(null);
        } else {
          // Valid session with userId - load it
          console.log('[SessionContext] ✅ Loading saved session from localStorage');
          setSessionDataState(parsed);
        }
      }
    } catch (error) {
      console.error('[SessionContext] Error loading session data:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_USER_ID);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set preview session (ephemeral, NOT persisted to localStorage)
  const setPreviewSession = useCallback((data: OrderingSessionData | null) => {
    console.log('[SessionContext] 👁️ Setting preview session (ephemeral, not saved)');
    setPreviewSessionState(data);
  }, []);

  // Set active session (persistent, saved to localStorage)
  // Should only be called AFTER user successfully joins as participant
  const setSessionData = useCallback((data: OrderingSessionData) => {
    try {
      console.log('[SessionContext] ✅ Setting active session (saving to localStorage)');
      setSessionDataState(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[SessionContext] Error saving session data:', error);
    }
  }, []);

  // Set active order ID (persisted to localStorage)
  const setActiveOrderId = useCallback((orderId: string | null) => {
    try {
      console.log('[SessionContext] 📍 Setting active order ID:', orderId);
      setActiveOrderIdState(orderId);
      if (orderId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ORDER, orderId);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_ORDER);
      }
    } catch (error) {
      console.error('[SessionContext] Error saving active order ID:', error);
    }
  }, []);

  // Clear active order ID (convenience method)
  const clearActiveOrder = useCallback(() => {
    console.log('[SessionContext] 🗑️ Clearing active order ID');
    setActiveOrderId(null);
  }, [setActiveOrderId]);

  const clearSession = useCallback(() => {
    try {
      console.log('[SessionContext] 🗑️ Clearing session data');
      setSessionDataState(null);
      setPreviewSessionState(null);
      setActiveOrderIdState(null);
      // Iterate the registry so newly-added session-scoped keys are cleared
      // automatically. Persistent keys (e.g. ORDER, TABLE_NUMBER) are excluded
      // by SESSION_SCOPED_KEYS in src/lib/storage-keys.ts.
      for (const key of SESSION_SCOPED_KEYS) {
        localStorage.removeItem(key);
      }
      // Per-session keys (e.g. split initiator markers) live under a shared
      // prefix; sweep them all so device storage doesn't carry markers from
      // older sessions into a fresh one.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(SPLIT_INITIATOR_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('[SessionContext] Error clearing session data:', error);
    }
  }, []);

  // Helper function to convert Timestamp to milliseconds
  const timestampToMs = useCallback((timestamp: Timestamp | string | undefined): number | null => {
    if (!timestamp) return null;

    // If it's a Timestamp object
    if (typeof timestamp === 'object' && '_seconds' in timestamp) {
      return timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000;
    }

    // If it's a string (ISO date)
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return date.getTime();
    }

    return null;
  }, []);

  // Check if session status is 'active'
  const isSessionActive = useCallback((): boolean => {
    if (!sessionData?.session) return false;
    return sessionData.session.status === 'active';
  }, [sessionData]);

  // Check if session has expired based on expiresAt timestamp
  const isSessionExpired = useCallback((): boolean => {
    if (!sessionData?.session?.expiresAt) return false;

    const expiresAtMs = timestampToMs(sessionData.session.expiresAt);
    if (!expiresAtMs) return false;

    const now = Date.now();
    return now > expiresAtMs;
  }, [sessionData, timestampToMs]);

  // Check if current user is actually a participant in the session
  const isUserParticipant = useCallback((): boolean => {
    if (!sessionData?.session?.participants) return false;

    const sessionUserId = localStorage.getItem(STORAGE_KEY_USER_ID);
    if (!sessionUserId) return false;

    return sessionData.session.participants.some(
      (p) => p.sessionUserId === sessionUserId
    );
  }, [sessionData]);

  // Check if a participant's split has been marked as paid
  const isParticipantPaid = useCallback((sessionUserId: string): boolean => {
    if (!splitPaymentStatus) return false;
    return splitPaymentStatus.some(
      s => (s.sessionUserId === sessionUserId || s.paidBy === sessionUserId) && s.paid
    );
  }, [splitPaymentStatus]);

  // Validate session: combines status and expiry checks
  const validateSession = useCallback((): { isValid: boolean; reason?: string } => {
    // No session data
    if (!sessionData?.session) {
      return { isValid: false, reason: 'no_session' };
    }

    // Check if session is active
    if (!isSessionActive()) {
      return { isValid: false, reason: 'session_inactive' };
    }

    // Check if session has expired
    if (isSessionExpired()) {
      return { isValid: false, reason: 'session_expired' };
    }

    return { isValid: true };
  }, [sessionData, isSessionActive, isSessionExpired]);

  // Refresh session data from API
  // Used after order confirmation to get updated session with new orders
  const refreshSessionData = useCallback(async (): Promise<void> => {
    if (!sessionData?.session?.id) {
      console.warn('[SessionContext] Cannot refresh: no session ID available');
      return;
    }

    try {
      console.log('[SessionContext] Refreshing session data for session:', sessionData.session.id);

      // Fetch latest session detail from API
      const response = await sessionService.getSessionById(sessionData.session.id);

      // Apply branch currency / timezone if the API returns them
      if (response.data.currency || response.data.timezone) {
        setLocale({ currency: response.data.currency, timezone: response.data.timezone });
      }

      // Persist full order (with items) to localStorage when API returns it, so all participants can view any tab. Skip if key exists to avoid overwriting our own order (_placedAt, _itemParticipants).
      const sessionId = response.data.id;
      const businessId = response.data.businessId || sessionData?.business?.id || sessionData?.business?.businessId || '';
      const spaceId = response.data.spaceId || sessionData?.space?.id || '';
      for (const o of response.data.orders || []) {
        const order = typeof o === 'object' && o && 'orderId' in o ? (o as SessionOrder) : null;
        if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
          const key = `morsel_order_${order.orderId}`;
          if (!getFromStorage(key)) {
            const mapped = mapSessionOrderToAPIOrder(order, sessionId, businessId, spaceId);
            setInStorage(key, mapped);
          }
        }
      }

      // Update split payment status and config from API response
      setSplitPaymentStatus(response.data.splits || null);
      setServerSplitConfig(response.data.splitConfig || null);

      // Update session data with fresh data from API
      // Merge with existing business and space data
      const updatedSessionData: OrderingSessionData = {
        ...sessionData,
        session: {
          ...sessionData.session,
          orders: (response.data.orders || []).map((o: SessionOrder | string) =>
            typeof o === 'string' ? o : (o as SessionOrder).orderId
          ),
          participants: response.data.participants, // Update participants
        },
        participantsCount: response.data.participants.length,
      };

      setSessionDataState(updatedSessionData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessionData));

      console.log('[SessionContext] Session data refreshed successfully:', {
        sessionId: response.data.id,
        ordersCount: response.data.orders.length,
        participantsCount: response.data.participants.length,
        splitsCount: response.data.splits?.length || 0,
      });
    } catch (error) {
      console.error('[SessionContext] Failed to refresh session data:', error);
      // Don't throw - allow the app to continue even if refresh fails
    }
  }, [sessionData, setLocale]);

  // End the current session
  // Used when session expires or after payment is complete
  const endSession = useCallback(async (reason?: 'completed' | 'timeout' | 'left' | 'cancelled'): Promise<void> => {
    if (!sessionData?.session?.id) {
      console.warn('[SessionContext] Cannot end session: no session ID available');
      return;
    }

    // Get sessionUserId from localStorage
    const sessionUserId = localStorage.getItem(STORAGE_KEYS.SESSION_USER_ID);
    if (!sessionUserId) {
      console.warn('[SessionContext] Cannot end session: no sessionUserId found');
      // Still clear local data even if we can't call API
      clearSession();
      return;
    }

    try {
      console.log('[SessionContext] Ending session:', {
        sessionId: sessionData.session.id,
        reason: reason || 'unspecified',
      });

      // Call API to end session
      await sessionService.endSession(sessionData.session.id, {
        sessionUserId,
        reason,
      });

      console.log('[SessionContext] Session ended successfully');

      // Clear all local session data
      clearSession();
    } catch (error) {
      console.error('[SessionContext] Failed to end session via API:', error);
      // Clear local data anyway to prevent stale session
      clearSession();
    }
  }, [sessionData, clearSession]);

  // Polling refs
  // TODO: Add Firebase refs back when switching to realtime DB
  const sessionIdRef = useRef<string | null>(null);

  // Keep sessionId ref in sync
  useEffect(() => {
    sessionIdRef.current = sessionData?.session?.id || null;
  }, [sessionData?.session?.id]);

  // Polling function — uses ref to avoid recreating on every sessionData change
  const pollParticipants = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    try {
      const response = await sessionService.getSessionById(sid);
      const latestParticipants = response.data.participants;

      // Update split payment status and config from polling response
      setSplitPaymentStatus(response.data.splits || null);
      setServerSplitConfig(response.data.splitConfig || null);

      // Apply branch currency / timezone
      if (response.data.currency || response.data.timezone) {
        setLocale({ currency: response.data.currency, timezone: response.data.timezone });
      }

      // Update session data with latest participants
      setSessionDataState(prev => {
        if (!prev?.session) return prev;

        const updated: OrderingSessionData = {
          ...prev,
          session: {
            ...prev.session,
            participants: latestParticipants,
          },
          participantsCount: latestParticipants.length,
        };

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
          console.error('[SessionContext] Error saving to localStorage:', error);
        }

        return updated;
      });
    } catch (error) {
      console.error('[SessionContext] Polling error:', error);
    }
  }, [setLocale]);

  // Effect: Polling-only sync for session data (participants, splits, config),
  // with Page Visibility API integration. We pause the interval when the tab
  // is hidden (phone locked, app backgrounded, user on another tab) and
  // resume with an immediate fetch on `visibilitychange → visible`. This cuts
  // a meaningful chunk of GETs on every dining session — most realistic
  // sessions have long stretches where the tab is in the background.
  // TODO: Switch to Firebase Realtime DB once it includes split data.
  useEffect(() => {
    const sessionId = sessionData?.session?.id;
    const spaceId = sessionData?.space?.id;

    if (!sessionId || !spaceId) return;

    console.log('[SessionContext] 📡 Setting up polling sync', {
      sessionId: sessionId.substring(0, 8) + '...',
    });

    let intervalId: NodeJS.Timeout | null = null;

    const startInterval = () => {
      if (intervalId) return; // already running, don't double-start
      pollParticipants(); // immediate fetch
      intervalId = setInterval(pollParticipants, 10000);
    };

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Start only if currently visible (covers SSR + tab opened-then-hidden)
    if (typeof document === 'undefined' || !document.hidden) {
      startInterval();
    }

    const handleVisibility = () => {
      if (document.hidden) {
        console.log('[SessionContext] 🛌 Tab hidden — pausing polling');
        stopInterval();
      } else {
        console.log('[SessionContext] 👀 Tab visible — resuming polling');
        startInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      console.log('[SessionContext] 🔌 Stopping polling');
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.session?.id, sessionData?.space?.id]);

  const value: SessionState = useMemo(() => ({
    previewSession,
    setPreviewSession,
    sessionData,
    setSessionData,
    clearSession,
    activeOrderId,
    setActiveOrderId,
    clearActiveOrder,
    splitPaymentStatus,
    serverSplitConfig,
    serverSplitType,
    isLoading,
    isSessionActive,
    isSessionExpired,
    isUserParticipant,
    isParticipantPaid,
    validateSession,
    refreshSessionData,
    endSession,
  }), [previewSession, setPreviewSession, sessionData, setSessionData, clearSession, activeOrderId, setActiveOrderId, clearActiveOrder, splitPaymentStatus, serverSplitConfig, serverSplitType, isLoading, isSessionActive, isSessionExpired, isUserParticipant, isParticipantPaid, validateSession, refreshSessionData, endSession]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
