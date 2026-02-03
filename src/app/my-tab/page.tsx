"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Share2 } from "lucide-react";
import { useRequireRestaurantContext } from "@/hooks/useNavigationGuard";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useSession } from "@/contexts/SessionContext";
import { useSplit } from "@/contexts/SplitContext";
import { sessionService } from "@/services/session.service";
import { getFromStorage } from "@/mocks/mockStorage";
import { SplitSettingsModal } from "@/components/order/SplitSettingsModal";
import type { SessionParticipant, SessionOrder } from "@/types/api/session";
import type { Participant } from "@/types/cart";
import { isSplitApplicableForTotal } from "@/lib/split-utils";

const SPLIT_MODE_LABELS: Record<string, string> = {
  even: "Split evenly",
  custom: "Custom split",
  self: "Pay for self",
  all: "Pay for everyone",
};

/** Placeholder for Google Reviews; replace with API-driven URL when integrated. */
const GOOGLE_REVIEWS_URL = "https://maps.app.goo.gl/cyKBZ3Yn5qnS5c947";

function Avatar({ name, isYou }: { name: string; isYou: boolean }) {
  const initial = (name || "?").charAt(0);
  const bg = isYou ? "bg-[#EAF8F8]" : "bg-gray-100";
  return (
    <div
      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 ${bg}`}
    >
      <span
        className="text-sm font-bold text-black"
        style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}
      >
        {initial}
      </span>
    </div>
  );
}

function getParticipantDisplayName(
  p: SessionParticipant,
  currentSessionUserId: string | null
): string {
  if (currentSessionUserId && p.sessionUserId === currentSessionUserId) return "You";
  if (p.guestName && p.guestName.trim()) {
    const parts = p.guestName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
  }
  return "Guest";
}

export default function MyTabPage() {
  const router = useRouter();
  useRequireRestaurantContext();
  useSessionValidation();
  const { sessionData } = useSession();
  const { split, calculateSplit, addParticipant, removeParticipant } = useSplit();
  const currentSessionUserId = getFromStorage<string>("morsel_session_user_id");

  const [ordersTotal, setOrdersTotal] = useState<number>(0);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  const sessionId = sessionData?.session?.id;
  const apiParticipants = useMemo(
    () => sessionData?.session?.participants ?? [],
    [sessionData?.session?.participants]
  );

  // Sync session participants (from API/Firebase) into SplitContext so the split modal and the rest of the app use the same list. Keeps flow synced with real-time DB.
  const syncParticipantsWithSplit = useCallback(
    (participants: SessionParticipant[]) => {
      if (!participants.length) return;
      const apiIds = new Set(participants.map((p) => p.sessionUserId));
      split.participants.forEach((sp) => {
        if (!apiIds.has(sp.id)) removeParticipant(sp.id);
      });
      participants.forEach((p) => {
        if (!split.participants.some((sp) => sp.id === p.sessionUserId)) {
          const np: Participant = {
            id: p.sessionUserId,
            name: p.guestName || "Guest",
            avatar: "",
            isMock: false,
          };
          addParticipant(np);
        }
      });
    },
    [split.participants, addParticipant, removeParticipant]
  );

  useEffect(() => {
    if (apiParticipants.length > 0) syncParticipantsWithSplit(apiParticipants);
  }, [apiParticipants, syncParticipantsWithSplit]);

  useEffect(() => {
    if (!sessionId) {
      queueMicrotask(() => setOrdersTotal(0));
      return;
    }
    sessionService
      .getSessionById(sessionId)
      .then((res) => {
        const orders = res.data?.orders ?? [];
        const total = orders.reduce((sum: number, o: SessionOrder | string) => {
          if (typeof o === "object" && o != null && "total" in o) {
            return sum + (Number((o as SessionOrder).total) || 0);
          }
          return sum;
        }, 0);
        setOrdersTotal(total);
      })
      .catch(() => setOrdersTotal(0));
  }, [sessionId]);

  const n = Math.max(1, apiParticipants.length);
  const evenShare = ordersTotal / n;

  const tableLabel = sessionData?.space?.name ?? "Table";

  const useSplitShares = isSplitApplicableForTotal(split.splitForTotal, ordersTotal);

  const payNowAmount = useSplitShares && typeof split.shares[currentSessionUserId ?? ""] === "number"
    ? split.shares[currentSessionUserId!]
    : evenShare;

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-[90px]">
      {/* Top bar: Back + Table circle — matches Figma Frame 78 */}
      <div className="sticky top-0 bg-[#F7F8F8] border-b border-gray-100 z-10">
        <div className="relative flex items-center px-[18px] py-[20px]">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center shrink-0 rounded-full hover:bg-gray-100 active:opacity-80 transition-opacity"
            aria-label="Go back"
          >
            <ChevronLeft className="w-8 h-8 text-black" strokeWidth={2.5} />
          </button>
          <div className="absolute left-1/2 -translate-x-1/2 w-[50px] h-[50px] flex items-center justify-center shrink-0">
            <div className="absolute inset-0 border-[3px] border-black rounded-full" />
            <span
              className="text-xl font-bold relative z-10"
              style={{
                fontFamily: "Lato, sans-serif",
                letterSpacing: "0.12em",
              }}
            >
              {tableLabel?.split(" ")[1] ?? "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Main content — Figma Frame 103, 17px horizontal from edges, gap 20 */}
      <div className="px-[18px] pt-5 flex flex-col gap-5 max-w-[396px] mx-auto">
        {/* Row: "Table 15" + Split evenly — Frame 83 */}
        <div className="flex flex-row items-center justify-between gap-4">
          <h1
            className="text-[20px] font-bold text-black opacity-80"
            style={{
              fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
              lineHeight: 1.22,
            }}
          >
            {tableLabel}
          </h1>
          <button
            type="button"
            onClick={() => {
              syncParticipantsWithSplit(apiParticipants);
              calculateSplit(ordersTotal);
              setIsSplitModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2 bg-white border-[2px] border-[#ECECEC] rounded-[30px] shrink-0 hover:bg-gray-50 active:opacity-90 transition-all"
          >
            <Share2 className="w-5 h-5 text-black" strokeWidth={2} />
            <span
              className="text-[16px] font-bold text-black"
              style={{ fontFamily: "Lato, sans-serif", lineHeight: 1.2 }}
            >
              {SPLIT_MODE_LABELS[split.mode] ?? "Split evenly"}
            </span>
          </button>
        </div>

        {/* Participant cards — use split.shares when set from SplitSettingsModal, else even split */}
        <div className="flex flex-col gap-3">
          {apiParticipants.map((p) => {
            const isYou = currentSessionUserId != null && p.sessionUserId === currentSessionUserId;
            const name = getParticipantDisplayName(p, currentSessionUserId);
            const amount =
              useSplitShares && typeof split.shares[p.sessionUserId] === "number"
                ? split.shares[p.sessionUserId]
                : evenShare;
            return (
              <div
                key={p.sessionUserId}
                className={`flex items-center justify-between rounded-[50px] py-2 pl-2 pr-4 border-[2px] ${isYou
                  ? "bg-[#EAF8F8] border-[#D2EDED]"
                  : "bg-white border-[#DEDEDE]"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Avatar name={name} isYou={isYou} />
                  <span
                    className="text-[16px] font-bold text-black"
                    style={{
                      fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
                      lineHeight: 1.22,
                    }}
                  >
                    {name}
                  </span>
                </div>
                <span
                  className="text-[16px] font-bold text-black opacity-80"
                  style={{
                    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
                    lineHeight: 1.22,
                  }}
                >
                  $ {amount.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Google Reviews — links to Maps; replace URL with API when integrated */}
        <a
          href={GOOGLE_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-[198px] h-[112px] rounded-xl bg-[#E8E8E8] border border-gray-200 flex items-center justify-center self-center hover:bg-gray-200/80 active:opacity-90 transition-colors"
          aria-label="View Google Reviews"
        >
          <span className="text-gray-600 text-sm font-medium" style={{ fontFamily: "Lato, sans-serif" }}>
            Google Reviews
          </span>
        </a>

        {/* Browse Menu CTA — same action as menu nav (e.g. cart EmptyState, right icon on cart): go to /menu */}
        <button
          type="button"
          onClick={() => router.push("/menu")}
          className="w-full rounded-[12px] py-4 px-5 bg-white border-[2px] border-black text-black text-[18px] font-bold hover:bg-gray-50 active:opacity-90 transition-all text-center"
          style={{ fontFamily: "Lato, sans-serif", lineHeight: 1.2 }}
          aria-label="Browse menu"
        >
          Browse Menu
        </button>

        {/* Restaurant details — Frame 195 */}
        <div className="rounded-[30px] border-[3px] border-[#ECECEC] bg-white p-5">
          <h2
            className="text-[20px] font-bold text-black mb-1"
            style={{ fontFamily: "Lato, sans-serif", lineHeight: 1.2 }}
          >
            Restaurant details
          </h2>
          <p
            className="text-[10px] font-normal text-black opacity-40 mb-5"
            style={{ fontFamily: "Lato, sans-serif", lineHeight: 1.2 }}
          >
            Norem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
          <div className="flex gap-3 flex-wrap">
            <div className="w-[94px] h-[76px] rounded-lg bg-[#9C82F8]/10" />
            <div className="w-[94px] h-[76px] rounded-lg bg-[#9C82F8]/10" />
            <div className="w-[62px] h-[76px] rounded-lg bg-[#9C82F8]/10" />
          </div>
        </div>
      </div>

      {/* Pay Now bar — fixed bottom, Figma Frame layout_Q5T055 */}
      <button
        type="button"
        className="fixed rounded-t-[30px] left-0 right-0 h-[70px] flex items-center justify-between px-[22px] bg-black text-white hover:bg-gray-900 active:opacity-95 transition-all z-20"
        style={{ 
          bottom: 0,
          // iOS Safari fixed positioning fix
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
        aria-label="Pay now"
      >
        <span
          className="text-[20px] font-medium"
          style={{
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
            lineHeight: 1.22,
          }}
        >
          Pay Now
          <span
            className="text-[20px] font-medium ml-3"
            style={{
              fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
              lineHeight: 1.22,
            }}
          >
            $ {payNowAmount.toFixed(2)}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <Image
            src="/icons/Diagonal_Arrow.png"
            alt=""
            width={24}
            height={24}
            className="shrink-0 invert"
          />
        </div>
      </button>

      <SplitSettingsModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        total={ordersTotal}
      />
    </div>
  );
}
