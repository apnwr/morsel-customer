'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { OrderingSessionData } from '@/types/api/session';

const STORAGE_KEY = 'morsel_session_data';

interface SessionState {
  sessionData: OrderingSessionData | null;
  setSessionData: (data: OrderingSessionData) => void;
  clearSession: () => void;
  isLoading: boolean;
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

  const clearSession = () => {
    try {
      setSessionDataState(null);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing session data:', error);
    }
  };

  const value: SessionState = {
    sessionData,
    setSessionData,
    clearSession,
    isLoading,
  };

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
