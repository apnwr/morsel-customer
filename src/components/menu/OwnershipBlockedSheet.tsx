"use client";

import React from "react";
import { Lock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type OwnershipBlockedSheetProps = {
  isOpen: boolean;
  ownerName: string | null;
  onClose: () => void;
};

/**
 * Surfaced when a participant taps remove/decrement on another participant's
 * cart entry. Reuses the bottom-sheet `Modal` shell for consistency with
 * the other sheets on the menu/order surface.
 */
export function OwnershipBlockedSheet({
  isOpen,
  ownerName,
  onClose,
}: OwnershipBlockedSheetProps) {
  const heading = ownerName
    ? `Only ${ownerName} can edit this`
    : "Only the person who added this can edit it";

  const body = ownerName
    ? `${ownerName} added this to the order, so only they can change the quantity or remove it. You can still add your own from the menu.`
    : "They added this to the order, so only they can change the quantity or remove it. You can still add your own from the menu.";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="px-6 pt-7 pb-7 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-4">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
        <h2
          className="text-lg font-semibold text-black mb-2"
          style={{ fontFamily: "Lato, sans-serif" }}
        >
          {heading}
        </h2>
        <p
          className="text-sm text-gray-600 mb-6 leading-relaxed"
          style={{ fontFamily: "Lato, sans-serif" }}
        >
          {body}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full h-12 rounded-full bg-brand text-white font-semibold text-base active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          style={{ fontFamily: "Lato, sans-serif" }}
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}
