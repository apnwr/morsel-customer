'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Settings, Check } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useSplit } from '@/contexts/SplitContext';
import { useSession } from '@/contexts/SessionContext';
import { useCart } from '@/contexts/CartContext';
import { SplitSettingsModal } from '@/components/order/SplitSettingsModal';
import { getFromStorage } from '@/mocks/mockStorage';
import type { Participant } from '@/types/cart';

interface ParticipantsListProps {
  /** When set, used instead of cart.total for split calculations (e.g. bill total with taxes/charges) */
  totalOverride?: number;
}

export function ParticipantsList({ totalOverride }: ParticipantsListProps = {}) {
  const { split, calculateSplit, addParticipant, removeParticipant } = useSplit();
  const { sessionData, isParticipantPaid } = useSession();
  const { formatPrice } = useLocale();
  const { cart } = useCart();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const sessionId = sessionData?.session?.id;
  const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');

  // The effective total for split — bill total (with taxes/charges) takes priority over cart total
  const splitTotal = typeof totalOverride === 'number' ? totalOverride : cart.total;

  // Recalculate split when total, participants, or mode change.
  // cart.items.length is used as a proxy for cart content changes (needed for "self" mode).
  const cartItemsLength = cart.items.length;
  useEffect(() => {
    if (split.participants.length > 0) {
      calculateSplit(splitTotal, cart);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cart passed for "self" mode; cartItemsLength + splitTotal cover meaningful changes
  }, [splitTotal, cartItemsLength, split.participants.length, split.mode, calculateSplit]);

  // Sync session participants (from SessionContext polling) into SplitContext.
  // SessionContext polls GET /session/{id} every 10s — we just react to the data.
  // TODO: Switch to Firebase Realtime DB once it includes all session data.
  const apiParticipants = sessionData?.session?.participants;

  useEffect(() => {
    if (!apiParticipants || apiParticipants.length === 0) return;

    const apiParticipantIds = new Set(apiParticipants.map(p => p.sessionUserId));

    // Remove stale participants from split
    split.participants.forEach(p => {
      if (!apiParticipantIds.has(p.id)) {
        removeParticipant(p.id);
      }
    });

    // Add new participants to split
    apiParticipants.forEach(apiP => {
      const existsInSplit = split.participants.some(p => p.id === apiP.sessionUserId);
      if (!existsInSplit) {
        const newParticipant: Participant = {
          id: apiP.sessionUserId,
          name: apiP.guestName,
          avatar: '',
          isMock: false,
        };
        addParticipant(newParticipant);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiParticipants]);

  // Get participants from API, prioritizing API data but ensuring all are in split
  // Sort so current user appears first
  const participants = useMemo(() => {
    let participantsList: { sessionUserId: string; guestName: string }[] = [];

    // Use session participants from SessionContext (polled every 10s)
    if (apiParticipants && apiParticipants.length > 0) {
      participantsList = [...apiParticipants];
    }
    // Fallback to split participants if session data not available yet
    else if (split.participants.length > 0) {
      participantsList = split.participants.map((p) => ({
        sessionUserId: p.id,
        guestName: p.name,
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
  }, [apiParticipants, split.participants, currentSessionUserId]);

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

  // Check if shares are valid (at least one participant has a non-zero share)
  const hasValidShares = split.participants.length > 0
    && Object.values(split.shares).some(v => typeof v === 'number' && v > 0);

  // Map session participants to split participants for amount display.
  // Falls back to even split ONLY when NO shares are configured at all.
  const getParticipantAmount = useCallback(
    (sessionUserId: string) => {
      const splitParticipant = split.participants.find(
        (p) => p.id === sessionUserId
      );

      // If valid shares exist, use them as-is (even if this participant's share is 0)
      if (hasValidShares) {
        return splitParticipant ? (split.shares[splitParticipant.id] || 0) : 0;
      }

      // No shares configured at all — fall back to even split
      if (split.participants.length > 0 && splitTotal > 0) {
        return Math.round((splitTotal / split.participants.length) * 100) / 100;
      }

      return 0;
    },
    [split.participants, split.shares, splitTotal, hasValidShares]
  );

  // Show the effective mode — fall back to "Split evenly" when shares are empty/zero
  const getModeLabel = () => {
    const effectiveMode = hasValidShares ? split.mode : 'even';
    switch (effectiveMode) {
      case 'even':
        return 'Split evenly';
      case 'custom':
        return 'Custom split';
      case 'all':
        return 'Pay for everyone';
      case 'self':
        return 'Pay for self';
      case 'items':
        return 'Pay for items';
      default:
        return 'Split bill';
    }
  };

  // const getModeDescription = () => {
  //   switch (split.mode) {
  //     case 'even':
  //       return 'The bill will be divided equally among all participants.';
  //     case 'custom':
  //       return 'Each participant pays a custom amount.';
  //     case 'all':
  //       return 'You will pay for everyone in this session.';
  //     case 'self':
  //       return 'You will only pay for your own items.';
  //     default:
  //       return 'Choose how to split the bill.';
  //   }
  // };

  const handleInvite = () => {
    // Open split settings modal to add participants
    setShowSettingsModal(true);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowSettingsModal(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowSettingsModal(true);
          }
        }}
        className="rounded-[30px] bg-black p-5 min-h-[200px] relative cursor-pointer hover:bg-gray-900 active:bg-gray-800 transition-colors"
        aria-label={`${getModeLabel()}. Open to edit split settings.`}
      >

        {/* Participants Row */}
        <div className="flex items-start gap-5 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {participants.length > 0 ? (
            <>
              {participants.map((participant) => {
                const amount = getParticipantAmount(participant.sessionUserId);
                const isYou = isCurrentUser(participant.sessionUserId);
                const displayName = isYou ? 'You' : participant.guestName;
                const paid = isParticipantPaid(participant.sessionUserId);

                return (
                  <div
                    key={participant.sessionUserId}
                    className="flex flex-col items-center gap-2 min-w-[60px] flex-shrink-0"
                  >
                    <div className="relative">
                      <Avatar
                        name={participant.guestName}
                        className={`w-[50px] h-[50px] ${paid ? 'ring-2 ring-green-400' : ''}`}
                      />
                      {paid && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-black">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-black text-center text-white leading-tight">
                      {displayName}
                    </span>
                    {paid ? (
                      <span className="text-sm font-bold text-center text-green-400 leading-tight">
                        Paid
                      </span>
                    ) : (
                      <span className="text-lg font-black text-center text-white leading-tight">
                        {formatPrice(amount)}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Invite Card */}
              {/* <button
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
              </button> */}
            </>
          ) : (
            <>
              {/* Empty state - show invite button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInvite();
                }}
                className="flex flex-col items-center gap-2 min-w-[60px] flex-shrink-0"
              >
                <div className="w-[50px] h-[50px] rounded-full bg-white/10 flex items-center justify-center border-2 border-dashed border-white/30">
                  <span className="text-white/40 text-xl">+</span>
                </div>
                <span className="text-xs font-black text-center text-white/40 leading-tight">
                  Invite
                </span>
                <span className="text-lg font-black text-center text-transparent leading-tight select-none">
                  $0.00
                </span>
              </button>
            </>
          )}
        </div>

        {/* Split label + Change button */}
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-bold text-xl leading-tight text-white">
            {getModeLabel()}
          </h3>
          <span className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 text-xs font-bold text-white">
            <Settings className="w-3.5 h-3.5" />
            Change
          </span>
        </div>

        {/* Description text */}
        <p className="text-xs text-white/80 leading-relaxed">
          The bill is going to be {getModeLabel().toLowerCase()}, click on this card to change these settings.
        </p>

      </div>

      {/* Split Settings Modal */}
      <SplitSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        total={splitTotal}
      />
    </>
  );
}
