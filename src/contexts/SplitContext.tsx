'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SplitBill, Participant, Cart } from '@/types/cart';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { calculateEvenSplit, validateSplit, generateMockParticipant } from '@/mocks/mockSplit';
import { sanitizeSplitAmount } from '@/lib/validation';
import { splitService } from '@/services/split.service';
import { useSession } from '@/contexts/SessionContext';
import type { SplitCalculateRequest, SplitEntry } from '@/types/api/split';

const STORAGE_KEY = 'morsel_split';
/**
 * Calculate the total amount for items added by the current user
 * No tax included - total is just the item prices
 */
function calculateUserItemsTotal(cart: Cart | null, currentSessionUserId: string | null): number {
  if (!cart || !currentSessionUserId) return 0;
  
  const userItemsSubtotal = cart.items
    .filter(item => item.sessionUserId === currentSessionUserId)
    .reduce((sum, item) => sum + item.itemTotal, 0);
  // No tax - return just the subtotal
  return Math.round(userItemsSubtotal * 100) / 100;
}

interface SplitState {
  split: SplitBill;
  /** Server-side split entries (includes paid status) */
  serverSplits: SplitEntry[] | null;
  /** Itemized mode: maps participantId → array of itemIds they chose to pay for */
  itemizedSelections: Record<string, string[]>;
  setSplitMode: (mode: 'even' | 'custom' | 'self' | 'all' | 'items') => void;
  setSplitForTotal: (total: number | null) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateShare: (participantId: string, amount: number) => void;
  /** Calculate split shares. For 'self' mode, pass cart to calculate user's own items total. */
  calculateSplit: (total: number, cart?: Cart | null) => void;
  validateSplitShares: (total: number) => boolean;
  clearSplit: () => void;
  addMockParticipant: () => void;
  /** Set which items a participant chose to pay for (itemized mode) */
  setItemizedSelection: (participantId: string, itemIds: string[]) => void;
  /** Clear all itemized selections */
  clearItemizedSelections: () => void;
  /** Sync split to server (fire-and-forget). Pass mode and shares explicitly to avoid stale closures. */
  syncSplitToServer: (sessionId: string, mode: SplitBill['mode'], shares: Record<string, number>, participants: Participant[]) => void;
}

const SplitContext = createContext<SplitState | undefined>(undefined);

function getEmptySplit(): SplitBill {
  return {
    mode: 'even',
    participants: [],
    shares: {},
    isValid: true,
    splitForTotal: null,
  };
}

/**
 * Map server split config type to local split mode.
 * Server uses: 'equal' | 'participant' | 'custom' | 'itemized'
 * Client uses: 'even' | 'self' | 'custom' | 'all' | 'items'
 */
function serverTypeToLocalMode(serverType: string): SplitBill['mode'] {
  switch (serverType) {
    case 'equal': return 'even';
    case 'participant': return 'self';
    case 'custom': return 'custom';
    case 'itemized': return 'items';
    default: return 'even';
  }
}

export function SplitProvider({ children }: { children: ReactNode }) {
  const { serverSplitConfig, splitPaymentStatus, refreshSessionData } = useSession();

  const [split, setSplit] = useState<SplitBill>(() => {
    // Initialize from localStorage or use empty split
    const stored = getFromStorage<SplitBill>(STORAGE_KEY);

    if (stored && Array.isArray(stored.participants)) {
      return stored;
    }

    return getEmptySplit();
  });

  const [serverSplits, setServerSplits] = useState<SplitEntry[] | null>(null);
  const [itemizedSelections, setItemizedSelectionsState] = useState<Record<string, string[]>>(() => {
    return getFromStorage<Record<string, string[]>>('morsel_itemized_selections') || {};
  });

  // Save to localStorage whenever split changes
  useEffect(() => {
    setInStorage(STORAGE_KEY, split);
  }, [split]);

  // Hydrate split mode AND shares from server.
  // serverSplitConfig has the mode; splitPaymentStatus has the per-participant amounts.
  // Server splits are ordered by index (0, 1, 2...) matching participant order.
  // sessionUserId may be null, so we map by index to split.participants.
  useEffect(() => {
    if (!serverSplitConfig?.type) return;
    if (!splitPaymentStatus || splitPaymentStatus.length === 0) return;

    const serverMode = serverTypeToLocalMode(serverSplitConfig.type);

    setSplit(prev => {
      if (prev.participants.length === 0) return prev;

      // Map server splits to participants by index order
      const serverShares: Record<string, number> = {};
      const sortedSplits = [...splitPaymentStatus].sort((a, b) => a.index - b.index);

      for (let i = 0; i < sortedSplits.length && i < prev.participants.length; i++) {
        const entry = sortedSplits[i];
        const participant = prev.participants[i];
        // Use sessionUserId if available, otherwise map by index
        const id = entry.sessionUserId || participant.id;
        serverShares[id] = entry.amount;
      }

      const serverTotal = sortedSplits.reduce((sum, e) => sum + e.amount, 0);

      // Check if local state already matches server
      const modeMatches = prev.mode === serverMode;
      const sharesMatch = modeMatches && Object.keys(serverShares).length > 0
        && Object.entries(serverShares).every(([id, amt]) =>
          typeof prev.shares[id] === 'number' && Math.abs(prev.shares[id] - amt) < 0.01
        );

      if (modeMatches && sharesMatch) return prev;

      console.log(`[SplitContext] Hydrating from server: mode ${prev.mode} → ${serverMode}, shares:`, serverShares);
      return {
        ...prev,
        mode: serverMode,
        shares: { ...prev.shares, ...serverShares },
        splitForTotal: serverTotal > 0 ? serverTotal : prev.splitForTotal,
        isValid: true,
      };
    });
  }, [serverSplitConfig, splitPaymentStatus]);

  const setSplitMode = useCallback((mode: 'even' | 'custom' | 'self' | 'all' | 'items') => {
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

  const calculateSplit = useCallback((total: number, cart?: Cart | null) => {
    // Validate input
    if (typeof total !== 'number' || isNaN(total) || total < 0) {
      console.error('[SplitContext] ❌ Invalid total provided to calculateSplit:', total);
      return;
    }

    setSplit((prev) => {
      if (prev.participants.length === 0) {
        console.log('[SplitContext] No participants, clearing shares');
        return {
          ...prev,
          shares: {},
          isValid: true,
          splitForTotal: null,
        };
      }

      // Get current user's sessionUserId to correctly identify them
      const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');

      // Debug logging to understand ID matching
      console.log('[SplitContext] ✓ calculateSplit called:', {
        mode: prev.mode,
        currentSessionUserId,
        participantsCount: prev.participants.length,
        participants: prev.participants.map(p => ({ id: p.id, name: p.name, isMock: p.isMock })),
        total,
        formattedTotal: `$${total.toFixed(2)}`
      });

      let newShares: Record<string, number> = {};

      switch (prev.mode) {
        case 'even':
          newShares = calculateEvenSplit(total, prev.participants);
          console.log('[SplitContext] 💰 Even split calculated:', {
            total: `$${total.toFixed(2)}`,
            participantsCount: prev.participants.length,
            perPersonCalculated: `$${(total / prev.participants.length).toFixed(2)}`,
            shares: Object.entries(newShares).map(([id, amount]) => ({
              id: id.substring(0, 8) + '...',
              name: prev.participants.find(p => p.id === id)?.name || 'Unknown',
              amount: `$${amount.toFixed(2)}`
            })),
            totalOfShares: `$${Object.values(newShares).reduce((sum, val) => sum + val, 0).toFixed(2)}`
          });
          break;

        case 'self': {
          // "Pay for self" - Current user pays for their own items only
          // Others split the remaining amount evenly
          const currentUser = currentSessionUserId
            ? prev.participants.find((p) => p.id === currentSessionUserId)
            : prev.participants.find((p) => !p.isMock); // Fallback to first non-mock participant

          if (currentUser) {
            // Calculate user's items total if cart is provided
            const userItemsTotal = calculateUserItemsTotal(cart ?? null, currentSessionUserId);
            const remainingTotal = total - userItemsTotal;
            
            newShares[currentUser.id] = userItemsTotal;
            const others = prev.participants.filter((p) => p.id !== currentUser.id);
            if (others.length > 0) {
              const amountPerOther = remainingTotal / others.length;
              others.forEach((p) => {
                newShares[p.id] = Math.round(amountPerOther * 100) / 100;
              });
            }
            
            console.log('[SplitContext] 💰 Pay for self calculated:', {
              userItemsTotal: `$${userItemsTotal.toFixed(2)}`,
              remainingTotal: `$${remainingTotal.toFixed(2)}`,
              othersCount: others.length
            });
          } else {
            // Ultimate fallback: even split
            newShares = calculateEvenSplit(total, prev.participants);
          }
          break;
        }

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

        case 'items': {
          // "Pay for items" — shares are exclusively managed by ItemizedPickerSheet.
          // Never overwrite them here. Return existing shares as-is.
          newShares = prev.shares;
          console.log('[SplitContext] 💰 Pay for items — shares managed by picker (preserved)');
          break;
        }

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
        splitForTotal: total,
      };
    });
  }, [itemizedSelections]);

  const setSplitForTotal = useCallback((total: number | null) => {
    setSplit((prev) => ({ ...prev, splitForTotal: total }));
  }, []);

  const validateSplitShares = useCallback((total: number): boolean => {
    return validateSplit(split.shares, total);
  }, [split.shares]);

  const clearSplit = useCallback(() => {
    setSplit(getEmptySplit());
  }, []);

  // Persist itemized selections to localStorage
  useEffect(() => {
    setInStorage('morsel_itemized_selections', itemizedSelections);
  }, [itemizedSelections]);

  const setItemizedSelection = useCallback((participantId: string, itemIds: string[]) => {
    setItemizedSelectionsState((prev) => ({
      ...prev,
      [participantId]: itemIds,
    }));
  }, []);

  const clearItemizedSelections = useCallback(() => {
    setItemizedSelectionsState({});
  }, []);

  const syncSplitToServer = useCallback((
    sessionId: string,
    mode: SplitBill['mode'],
    shares: Record<string, number>,
    participants: Participant[]
  ) => {
    if (!sessionId || participants.length === 0) return;

    // Always send numberOfSplits and amounts. itemIds only for 'itemized' (flat array).
    const amounts = participants.map((p) => shares[p.id] || 0);

    let payload: SplitCalculateRequest;

    switch (mode) {
      case 'even':
        payload = {
          type: 'equal',
          numberOfSplits: participants.length,
          amounts,
        };
        break;

      case 'all':
      case 'custom':
        payload = {
          type: 'custom',
          numberOfSplits: participants.length,
          amounts,
        };
        break;

      case 'self':
        payload = {
          type: 'participant',
          numberOfSplits: participants.length,
          amounts,
        };
        break;

      case 'items': {
        // Flat array of all claimed item IDs across participants
        const itemIds: string[] = [];
        for (const p of participants) {
          const pItems = itemizedSelections[p.id] || [];
          itemIds.push(...pItems);
        }
        payload = {
          type: 'itemized',
          numberOfSplits: participants.length,
          amounts,
          itemIds,
        };
        break;
      }

      default:
        payload = {
          type: 'equal',
          numberOfSplits: participants.length,
          amounts,
        };
    }

    splitService
      .calculateSplit(sessionId, payload)
      .then((response) => {
        console.log('[SplitContext] Split synced to server:', response.data);
        setServerSplits(response.data?.splits || null);
        // Refresh session so splitPaymentStatus + serverSplitConfig update for all participants
        refreshSessionData();
      })
      .catch((error) => {
        console.error('[SplitContext] Failed to sync split to server:', error);
      });
  }, [itemizedSelections, refreshSessionData]);

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
    serverSplits,
    itemizedSelections,
    setSplitMode,
    setSplitForTotal,
    addParticipant,
    removeParticipant,
    updateShare,
    calculateSplit,
    validateSplitShares,
    clearSplit,
    addMockParticipant,
    setItemizedSelection,
    clearItemizedSelections,
    syncSplitToServer,
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
