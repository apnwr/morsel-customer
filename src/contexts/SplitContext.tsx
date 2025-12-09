'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SplitBill, Participant } from '@/types/cart';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { calculateEvenSplit, validateSplit, generateMockParticipant } from '@/mocks/mockSplit';
import { sanitizeSplitAmount } from '@/lib/validation';

const STORAGE_KEY = 'morsel_split';

interface SplitState {
  split: SplitBill;
  setSplitMode: (mode: 'even' | 'custom' | 'self' | 'all') => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateShare: (participantId: string, amount: number) => void;
  calculateSplit: (total: number) => void;
  validateSplitShares: (total: number) => boolean;
  clearSplit: () => void;
  addMockParticipant: () => void;
}

const SplitContext = createContext<SplitState | undefined>(undefined);

function getEmptySplit(): SplitBill {
  return {
    mode: 'even',
    participants: [],
    shares: {},
    isValid: true,
  };
}

export function SplitProvider({ children }: { children: ReactNode }) {
  const [split, setSplit] = useState<SplitBill>(() => {
    // Initialize from localStorage or use empty split
    const stored = getFromStorage<SplitBill>(STORAGE_KEY);
    
    if (stored && Array.isArray(stored.participants)) {
      return stored;
    }
    
    return getEmptySplit();
  });

  // Save to localStorage whenever split changes
  useEffect(() => {
    setInStorage(STORAGE_KEY, split);
  }, [split]);

  const setSplitMode = useCallback((mode: 'even' | 'custom' | 'self' | 'all') => {
    setSplit((prev) => ({
      ...prev,
      mode,
    }));
  }, []);

  const addParticipant = useCallback((participant: Participant) => {
    setSplit((prev) => {
      // Check if participant already exists
      if (prev.participants.some((p) => p.id === participant.id)) {
        console.warn(`Participant with id ${participant.id} already exists`);
        return prev;
      }

      return {
        ...prev,
        participants: [...prev.participants, participant],
      };
    });
  }, []);

  const removeParticipant = useCallback((participantId: string) => {
    setSplit((prev) => {
      const newParticipants = prev.participants.filter((p) => p.id !== participantId);
      const newShares = { ...prev.shares };
      delete newShares[participantId];

      return {
        ...prev,
        participants: newParticipants,
        shares: newShares,
      };
    });
  }, []);

  const updateShare = useCallback((participantId: string, amount: number) => {
    setSplit((prev) => ({
      ...prev,
      shares: {
        ...prev.shares,
        [participantId]: sanitizeSplitAmount(amount),
      },
    }));
  }, []);

  const calculateSplit = useCallback((total: number) => {
    setSplit((prev) => {
      if (prev.participants.length === 0) {
        return {
          ...prev,
          shares: {},
          isValid: true,
        };
      }

      // Get current user's sessionUserId to correctly identify them
      const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');

      // Debug logging to understand ID matching
      console.log('[SplitContext] calculateSplit called:', {
        mode: prev.mode,
        currentSessionUserId,
        participants: prev.participants.map(p => ({ id: p.id, name: p.name, isMock: p.isMock })),
        total
      });

      let newShares: Record<string, number> = {};

      switch (prev.mode) {
        case 'even':
          newShares = calculateEvenSplit(total, prev.participants);
          break;

        case 'self':
          // Current user pays nothing, others split evenly
          const currentUser = currentSessionUserId
            ? prev.participants.find((p) => p.id === currentSessionUserId)
            : prev.participants.find((p) => !p.isMock); // Fallback to first non-mock participant

          if (currentUser) {
            newShares[currentUser.id] = 0;
            const others = prev.participants.filter((p) => p.id !== currentUser.id);
            if (others.length > 0) {
              const othersShares = calculateEvenSplit(total, others);
              newShares = { ...newShares, ...othersShares };
            }
          } else {
            // Ultimate fallback: even split
            newShares = calculateEvenSplit(total, prev.participants);
          }
          break;

        case 'all':
          // Current user pays everything
          const currentUserAll = currentSessionUserId
            ? prev.participants.find((p) => p.id === currentSessionUserId)
            : prev.participants.find((p) => !p.isMock); // Fallback to first non-mock participant

          if (currentUserAll) {
            newShares[currentUserAll.id] = total;
            prev.participants.filter((p) => p.id !== currentUserAll.id).forEach((p) => {
              newShares[p.id] = 0;
            });
          } else {
            // Ultimate fallback: first participant pays all
            if (prev.participants.length > 0) {
              newShares[prev.participants[0].id] = total;
              prev.participants.slice(1).forEach((p) => {
                newShares[p.id] = 0;
              });
            }
          }
          break;

        case 'custom':
          // Keep existing shares, but validate
          newShares = prev.shares;
          break;

        default:
          newShares = calculateEvenSplit(total, prev.participants);
      }

      const isValid = validateSplit(newShares, total);

      // Debug logging to see the result
      console.log('[SplitContext] calculateSplit result:', {
        mode: prev.mode,
        newShares,
        isValid
      });

      return {
        ...prev,
        shares: newShares,
        isValid,
      };
    });
  }, []);

  const validateSplitShares = useCallback((total: number): boolean => {
    return validateSplit(split.shares, total);
  }, [split.shares]);

  const clearSplit = useCallback(() => {
    setSplit(getEmptySplit());
  }, []);

  const addMockParticipant = useCallback(() => {
    setSplit((prev) => {
      const mockParticipant = generateMockParticipant(prev.participants);
      
      // Check if participant already exists
      if (prev.participants.some((p) => p.id === mockParticipant.id)) {
        return prev;
      }

      return {
        ...prev,
        participants: [...prev.participants, mockParticipant],
      };
    });
  }, []);

  const value: SplitState = {
    split,
    setSplitMode,
    addParticipant,
    removeParticipant,
    updateShare,
    calculateSplit,
    validateSplitShares,
    clearSplit,
    addMockParticipant,
  };

  return (
    <SplitContext.Provider value={value}>
      {children}
    </SplitContext.Provider>
  );
}

export function useSplit() {
  const context = useContext(SplitContext);
  if (context === undefined) {
    throw new Error('useSplit must be used within a SplitProvider');
  }
  return context;
}
