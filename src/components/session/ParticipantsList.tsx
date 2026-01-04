'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Avatar } from '@/components/ui/Avatar';
import { useSplit } from '@/contexts/SplitContext';
import { useSession } from '@/contexts/SessionContext';
import { useCart } from '@/contexts/CartContext';
import { sessionService } from '@/services/session.service';
import type { SessionDetail } from '@/types/api/session';
import { SplitSettingsModal } from '@/components/order/SplitSettingsModal';
import { getFromStorage } from '@/mocks/mockStorage';
import type { Participant } from '@/types/cart';

// Cache for session data to avoid unnecessary API calls
let sessionCache: {
  sessionId: string | null;
  data: SessionDetail | null;
  timestamp: number;
} = {
  sessionId: null,
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 30000; // 30 seconds
const REFRESH_INTERVAL = 10000; // Refresh every 10 seconds to catch new participants

export function ParticipantsList() {
  const { split, calculateSplit, addParticipant, removeParticipant } = useSplit();
  const { sessionData } = useSession();
  const { cart } = useCart();
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasSyncedRef = useRef(false);

  const sessionId = sessionData?.session?.id;
  const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');

  // Recalculate split when cart total or participants change
  // This will automatically trigger when API participants are synced to split
  useEffect(() => {
    if (split.participants.length > 0) {
      console.log('[ParticipantsList] 🔄 Recalculating split:', {
        cartTotal: `$${cart.total.toFixed(2)}`,
        cartSubtotal: `$${cart.subtotal.toFixed(2)}`,
        cartTax: `$${cart.tax.toFixed(2)}`,
        participantsCount: split.participants.length,
        splitMode: split.mode
      });
      calculateSplit(cart.total);
    } else {
      console.log('[ParticipantsList] ⚠️ No participants yet, skipping split calculation');
    }
  }, [cart.total, cart.subtotal, cart.tax, split.participants.length, split.mode, calculateSplit]);

  // Sync API participants with split participants
  const syncParticipantsWithSplit = useCallback(
    (apiParticipants: SessionDetail['participants']) => {
      if (!apiParticipants || apiParticipants.length === 0) {
        console.log('[ParticipantsList] ⚠️ No API participants to sync');
        return;
      }

      // Get current sessionUserId to identify "You"
      const currentUserId = currentSessionUserId;

      console.log('[ParticipantsList] 🔄 Syncing participants:', {
        currentUserId,
        apiParticipantsCount: apiParticipants.length,
        apiParticipants: apiParticipants.map(p => ({ sessionUserId: p.sessionUserId, guestName: p.guestName })),
        currentSplitParticipantsCount: split.participants.length,
        currentSplitParticipants: split.participants.map(p => ({ id: p.id, name: p.name, isMock: p.isMock }))
      });

      // Step 1: Remove participants from split that are NOT in API response
      // Safety: Only remove if they're marked as mock OR if they're not in the current session
      const apiParticipantIds = new Set(apiParticipants.map(p => p.sessionUserId));
      const participantsToRemove: string[] = [];

      split.participants.forEach((splitParticipant) => {
        if (!apiParticipantIds.has(splitParticipant.id)) {
          // Determine if this participant should be removed
          const reason = splitParticipant.isMock
            ? 'Mock participant not in current session'
            : 'Participant not in current session (stale from previous session)';

          console.log('[ParticipantsList] 🗑️ Marking participant for removal:', {
            id: splitParticipant.id.substring(0, 8) + '...',
            name: splitParticipant.name,
            isMock: splitParticipant.isMock,
            reason
          });

          participantsToRemove.push(splitParticipant.id);
        }
      });

      // Remove all marked participants
      participantsToRemove.forEach(id => removeParticipant(id));

      // Step 2: Add participants from API that are NOT in split
      apiParticipants.forEach((apiParticipant) => {
        // Check if this participant already exists in split
        const existsInSplit = split.participants.some(
          (p) => p.id === apiParticipant.sessionUserId
        );

        if (!existsInSplit) {
          // Add API participant to split participants
          const newParticipant: Participant = {
            id: apiParticipant.sessionUserId,
            name: apiParticipant.guestName,
            avatar: '', // Will be generated by Avatar component
            isMock: false, // API participants are real, not mock
          };

          console.log('[ParticipantsList] ✅ Adding new participant to split:', {
            id: newParticipant.id.substring(0, 8) + '...',
            name: newParticipant.name
          });
          addParticipant(newParticipant);
        }
      });

      console.log('[ParticipantsList] ✓ Sync complete. Final split participants:', split.participants.length);
    },
    [split.participants, addParticipant, removeParticipant, currentSessionUserId]
  );

  // Fetch session details with caching
  const fetchSessionDetails = useCallback(
    async (forceRefresh = false) => {
      if (!sessionId) {
        setSessionDetail(null);
        return;
      }

      // Check cache first (unless forcing refresh)
      const now = Date.now();
      if (
        !forceRefresh &&
        sessionCache.sessionId === sessionId &&
        sessionCache.data &&
        now - sessionCache.timestamp < CACHE_DURATION
      ) {
        setSessionDetail(sessionCache.data);
        // Still sync participants even if using cache
        if (sessionCache.data.participants) {
          syncParticipantsWithSplit(sessionCache.data.participants);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await sessionService.getSessionById(sessionId);
        const data = response.data;

        // Update cache
        sessionCache = {
          sessionId,
          data,
          timestamp: now,
        };

        setSessionDetail(data);

        // Sync API participants with split participants
        if (data.participants && data.participants.length > 0) {
          syncParticipantsWithSplit(data.participants);
          hasSyncedRef.current = true;
        }
      } catch (err) {
        console.error('Failed to fetch session details:', err);
        setError('Failed to load participants');
        // Don't clear existing data on error
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, syncParticipantsWithSplit]
  );

  // Fetch on mount and when sessionId changes
  useEffect(() => {
    fetchSessionDetails();
  }, [fetchSessionDetails]);

  // Set up periodic refresh to catch new participants
  useEffect(() => {
    if (!sessionId) return;

    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up refresh interval
    refreshIntervalRef.current = setInterval(() => {
      fetchSessionDetails(true); // Force refresh to get new participants
    }, REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [sessionId, fetchSessionDetails]);

  // Refresh on window focus to catch new participants
  useEffect(() => {
    const handleFocus = () => {
      if (sessionId) {
        fetchSessionDetails(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [sessionId, fetchSessionDetails]);

  // Get participants from API, prioritizing API data but ensuring all are in split
  // Sort so current user appears first
  const participants = useMemo(() => {
    let participantsList: SessionDetail['participants'] = [];

    // Use API participants as source of truth
    if (sessionDetail?.participants && sessionDetail.participants.length > 0) {
      participantsList = [...sessionDetail.participants];
    }
    // Fallback to split participants if API data not available
    else if (split.participants.length > 0) {
      participantsList = split.participants.map((p) => ({
        sessionUserId: p.id,
        guestName: p.name,
        patronId: undefined,
        joinedAt: undefined,
      }));
    }

    // Sort to put current user first
    if (participantsList.length > 0 && currentSessionUserId) {
      participantsList.sort((a, b) => {
        const aIsCurrent = a.sessionUserId === currentSessionUserId;
        const bIsCurrent = b.sessionUserId === currentSessionUserId;

        if (aIsCurrent && !bIsCurrent) return -1;
        if (!aIsCurrent && bIsCurrent) return 1;
        return 0;
      });
    }

    return participantsList;
  }, [sessionDetail?.participants, split.participants, currentSessionUserId]);

  // Identify current user
  const isCurrentUser = useCallback(
    (sessionUserId: string) => {
      return sessionUserId === currentSessionUserId;
    },
    [currentSessionUserId]
  );

  // Get participants count
  // const participantsCount = useMemo(() => {
  //   return participants.length || 0;
  // }, [participants.length]);

  // Map session participants to split participants for amount display
  const getParticipantAmount = useCallback(
    (sessionUserId: string) => {
      // Try to find matching split participant
      const splitParticipant = split.participants.find(
        (p) => p.id === sessionUserId
      );

      const amount = splitParticipant ? (split.shares[splitParticipant.id] || 0) : 0;

      // Debug logging for ID matching
      if (amount === 0 && split.participants.length > 0) {
        console.warn('[ParticipantsList] ⚠️ Amount is $0 for participant:', {
          sessionUserId: sessionUserId.substring(0, 8) + '...',
          foundInSplit: !!splitParticipant,
          allSplitParticipantIds: split.participants.map(p => p.id.substring(0, 8) + '...'),
          allShareKeys: Object.keys(split.shares).map(k => k.substring(0, 8) + '...'),
          shareAmount: splitParticipant ? split.shares[splitParticipant.id] : 'N/A'
        });
      }

      return amount;
    },
    [split.participants, split.shares]
  );

  const getModeLabel = () => {
    switch (split.mode) {
      case 'even':
        return 'Split evenly';
      case 'custom':
        return 'Custom split';
      case 'all':
        return 'Pay for everyone';
      case 'self':
        return 'Pay for self';
      default:
        return 'Split bill';
    }
  };

  const getModeDescription = () => {
    switch (split.mode) {
      case 'even':
        return 'The bill will be divided equally among all participants.';
      case 'custom':
        return 'Each participant pays a custom amount.';
      case 'all':
        return 'You will pay for everyone in this session.';
      case 'self':
        return 'You will only pay for your own items.';
      default:
        return 'Choose how to split the bill.';
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share session');
  };

  const handleInvite = () => {
    // Open split settings modal to add participants
    setShowSettingsModal(true);
  };

  return (
    <>
      <div className="border-[3px] border-[#ECECEC] rounded-[30px] bg-white p-5 min-h-[200px] relative">
        {/* Loading Spinner - Bottom Right Corner */}
        {isLoading && (
          <div className="absolute bottom-3 right-3">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        )}

        {/* Header with Title and Share Icon */}
        <div className="flex items-start justify-between mb-4">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex flex-col gap-1 text-left hover:opacity-70 transition-opacity flex-1"
          >
            <h3 className="font-bold text-xl leading-tight text-black">
              {getModeLabel()}
            </h3>
            <p className="text-[10px] leading-tight text-black opacity-40">
              {getModeDescription()}
            </p>
          </button>
          <button
            onClick={handleShare}
            className="p-1 hover:opacity-70 transition-opacity shrink-0"
            aria-label="Share session"
          >
            <Share2 className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Participants Row */}
        <div className="flex items-start gap-5 overflow-x-auto pb-2 -mx-5 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {participants.length > 0 ? (
            <>
              {participants.map((participant) => {
                const amount = getParticipantAmount(participant.sessionUserId);
                const isYou = isCurrentUser(participant.sessionUserId);
                const displayName = isYou ? 'You' : participant.guestName;

                return (
                  <div
                    key={participant.sessionUserId}
                    className="flex flex-col items-center gap-2 min-w-[60px] flex-shrink-0"
                  >
                    <Avatar
                      name={participant.guestName}
                      className="w-[50px] h-[50px]"
                    />
                    <span className="text-xs font-black text-center text-black leading-tight">
                      {displayName}
                    </span>
                    <span className="text-lg font-black text-center text-black leading-tight">
                      ${amount.toFixed(2)}
                    </span>
                  </div>
                );
              })}

              {/* Invite Card */}
              <button
                onClick={handleInvite}
                className="flex flex-col items-center gap-2 min-w-[60px] flex-shrink-0"
              >
                <div className="w-[50px] h-[50px] rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <Image
                    src="/icons/Plus.png"
                    alt="Add participant"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <span className="text-xs font-black text-center text-black leading-tight opacity-40">
                  Invite
                </span>
                <span className="text-lg font-black text-center text-transparent leading-tight select-none">
                  $0.00
                </span>
              </button>
            </>
          ) : (
            <>
              {/* Empty state - show invite button */}
              <button
                onClick={handleInvite}
                className="flex flex-col items-center gap-2 min-w-[60px] flex-shrink-0"
              >
                <div className="w-[50px] h-[50px] rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <Image
                    src="/icons/Plus.png"
                    alt="Add participant"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <span className="text-xs font-black text-center text-black leading-tight opacity-40">
                  Invite
                </span>
                <span className="text-lg font-black text-center text-transparent leading-tight select-none">
                  $0.00
                </span>
              </button>
            </>
          )}
        </div>

        {/* Participants Count Text */}
        {/* {participantsCount > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            {participantsCount} {participantsCount === 1 ? 'person' : 'people'} in this session
          </div>
        )} */}

        {/* Error State */}
        {error && (
          <div className="mt-2 text-xs text-red-500">{error}</div>
        )}
      </div>

      {/* Split Settings Modal */}
      <SplitSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  );
}
