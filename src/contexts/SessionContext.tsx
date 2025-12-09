'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { OrderingSessionData, Timestamp } from '@/types/api/session';
import { sessionService } from '@/services/session.service';

const STORAGE_KEY = 'morsel_session_data';

interface SessionState {
  sessionData: OrderingSessionData | null;
  setSessionData: (data: OrderingSessionData) => void;
  clearSession: () => void;
  isLoading: boolean;
  isSessionActive: () => boolean;
  isSessionExpired: () => boolean;
  validateSession: () => { isValid: boolean; reason?: string };
  refreshSessionData: () => Promise<void>;
  endSession: (reason?: 'completed' | 'timeout' | 'left' | 'cancelled') => Promise<void>;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionData, setSessionDataState] = useState<OrderingSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSessionDataState(parsed);
      }
    } catch (error) {
      console.error('Error loading session data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSessionData = (data: OrderingSessionData) => {
    try {
      setSessionDataState(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  };

  const clearSession = useCallback(() => {
    try {
      setSessionDataState(null);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing session data:', error);
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
    sessionData,
    setSessionData,
    clearSession,
    isLoading,
    isSessionActive,
    isSessionExpired,
    validateSession,
    refreshSessionData,
    endSession,
  }), [sessionData, setSessionData, clearSession, isLoading, isSessionActive, isSessionExpired, validateSession, refreshSessionData, endSession]);

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
