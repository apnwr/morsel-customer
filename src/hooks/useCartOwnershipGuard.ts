"use client";

import { useCallback, useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { getFromStorage } from "@/mocks/mockStorage";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { CartItem } from "@/types/cart";

type OwnedLike = Pick<CartItem, "sessionUserId">;

type SheetState =
  | { open: true; ownerName: string | null }
  | { open: false; ownerName: null };

export type CartOwnershipGuard = {
  isMine: (item: OwnedLike) => boolean;
  blockWith: (ownerSessionUserId: string | undefined) => void;
  sheet: SheetState;
  close: () => void;
};

/**
 * Ownership awareness for shared-cart interactions.
 *
 * - `isMine` mirrors CartContext.removeItem/updateQuantity guards
 *   (src/contexts/CartContext.tsx:623,657): legacy items without a
 *   `sessionUserId` tag are treated as the current user's.
 * - `blockWith` resolves the participant name via SessionContext and opens
 *   the ownership-blocked sheet; pass `undefined` (or a sessionUserId for a
 *   participant who has since left the session) to render no-name copy.
 */
export function useCartOwnershipGuard(): CartOwnershipGuard {
  const { sessionData } = useSession();
  const [sheet, setSheet] = useState<SheetState>({
    open: false,
    ownerName: null,
  });

  const currentSessionUserId =
    getFromStorage<string>(STORAGE_KEYS.SESSION_USER_ID) ?? "";

  const isMine = useCallback(
    (item: OwnedLike) =>
      !item.sessionUserId || item.sessionUserId === currentSessionUserId,
    [currentSessionUserId],
  );

  const blockWith = useCallback(
    (ownerSessionUserId: string | undefined) => {
      if (!ownerSessionUserId) {
        setSheet({ open: true, ownerName: null });
        return;
      }
      const participant = sessionData?.session?.participants?.find(
        (p) => p.sessionUserId === ownerSessionUserId,
      );
      setSheet({ open: true, ownerName: participant?.guestName ?? null });
    },
    [sessionData?.session?.participants],
  );

  const close = useCallback(
    () => setSheet({ open: false, ownerName: null }),
    [],
  );

  return { isMine, blockWith, sheet, close };
}
