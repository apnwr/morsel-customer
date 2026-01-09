'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { OrderingSessionData, Timestamp } from '@/types/api/session';
import { sessionService } from '@/services/session.service';

const STORAGE_KEY = 'morsel_session_data';
const STORAGE_KEY_USER_ID = 'morsel_session_user_id';

interface SessionState {
  // Preview session - ephemeral, not persisted (for QR scan preview before login)
  previewSession: OrderingSessionData | null;
  setPreviewSession: (data: OrderingSessionData | null) => void;

  // Active session - persistent, only set after user joins (after login)
  sessionData: OrderingSessionData | null;
  setSessionData: (data: OrderingSessionData) => void;
  clearSession: () => void;

  isLoading: boolean;
  isSessionActive: () => boolean;
  isSessionExpired: () => boolean;
  isUserParticipant: () => boolean;
  validateSession: () => { isValid: boolean; reason?: string };
  refreshSessionData: () => Promise<void>;
  endSession: (reason?: 'completed' | 'timeout' | 'left' | 'cancelled') => Promise<void>;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  // Preview session: ephemeral state for QR scan preview (before login)
  const [previewSession, setPreviewSessionState] = useState<OrderingSessionData | null>(null);

  // Active session: persistent state for joined session (after login)
  const [sessionData, setSessionDataState] = useState<OrderingSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const clearSession = useCallback(() => {
    try {
      console.log('[SessionContext] 🗑️ Clearing session data');
      setSessionDataState(null);
      setPreviewSessionState(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_USER_ID);
      localStorage.removeItem('morsel_customer_name');
      localStorage.removeItem('morsel_dining_type');
      localStorage.removeItem('morsel_auth_method');
      // Also clear restaurant context since it's tied to the session
      localStorage.removeItem('morsel_restaurant_context');
      console.log('[SessionContext] 🗑️ Cleared restaurant context (must scan QR again)');
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

      // Update session data with fresh data from API
      // Merge with existing business and space data
      const updatedSessionData: OrderingSessionData = {
        ...sessionData,
        session: {
          ...sessionData.session,
          orders: response.data.orders.map(o => o.orderId), // Update orders array
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
      });
    } catch (error) {
      console.error('[SessionContext] Failed to refresh session data:', error);
      // Don't throw - allow the app to continue even if refresh fails
    }
  }, [sessionData]);

  // End the current session
  // Used when session expires or after payment is complete
  const endSession = useCallback(async (reason?: 'completed' | 'timeout' | 'left' | 'cancelled'): Promise<void> => {
    if (!sessionData?.session?.id) {
      console.warn('[SessionContext] Cannot end session: no session ID available');
      return;
    }

    // Get sessionUserId from localStorage
    const sessionUserId = localStorage.getItem('morsel_session_user_id');
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

  const value: SessionState = useMemo(() => ({
    previewSession,
    setPreviewSession,
    sessionData,
    setSessionData,
    clearSession,
    isLoading,
    isSessionActive,
    isSessionExpired,
    isUserParticipant,
    validateSession,
    refreshSessionData,
    endSession,
  }), [previewSession, setPreviewSession, sessionData, setSessionData, clearSession, isLoading, isSessionActive, isSessionExpired, isUserParticipant, validateSession, refreshSessionData, endSession]);

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
