"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useRequireRestaurantContext } from "@/hooks/useNavigationGuard";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useSession } from "@/contexts/SessionContext";
import { useSplit } from "@/contexts/SplitContext";
import { getFromStorage } from "@/mocks/mockStorage";
import { billService } from "@/services/bill.service";
import { isSplitApplicableForTotal } from "@/lib/split-utils";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/contexts/LocaleContext";
import { ParticipantsList } from "@/components/session/ParticipantsList";
import { useFlowType } from "@/hooks/useFlowType";

/** Placeholder for Google Reviews; replace with API-driven URL when integrated. */
const GOOGLE_REVIEWS_URL = "https://maps.app.goo.gl/cyKBZ3Yn5qnS5c947";

export default function MyTabPage() {
  const router = useRouter();
  const { formatPrice } = useLocale();
  useRequireRestaurantContext();
  useSessionValidation();
  const { sessionData } = useSession();
  const { split } = useSplit();
  const flowType = useFlowType();
  const currentSessionUserId = getFromStorage<string>("morsel_session_user_id");

  const [billTotal, setBillTotal] = useState<number>(0);

  const sessionId = sessionData?.session?.id;
  const apiParticipants = useMemo(
    () => sessionData?.session?.participants ?? [],
    [sessionData?.session?.participants]
  );

  useEffect(() => {
    if (!sessionId) {
      queueMicrotask(() => setBillTotal(0));
      return;
    }
    billService
      .getSessionBill(sessionId)
      .then((bill) => {
        setBillTotal(bill.total ?? 0);
      })
      .catch(() => setBillTotal(0));
  }, [sessionId]);

  const n = Math.max(1, apiParticipants.length);
  const evenShare = billTotal / n;

  const tableLabel = sessionData?.space?.name ?? "Table";

  const useSplitShares = isSplitApplicableForTotal(split.splitForTotal, billTotal);

  const payNowAmount = flowType === 'area'
    ? billTotal
    : useSplitShares && typeof split.shares[currentSessionUserId ?? ""] === "number"
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
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center shrink-0">
            <Image
              src="/icons/morsel_text_logo.svg"
              alt="Morsel"
              width={76}
              height={17}
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* Main content — Figma Frame 103, 17px horizontal from edges, gap 20 */}
      <div className="px-[18px] pt-5 flex flex-col gap-5 max-w-[396px] mx-auto">
        {/* Table name */}
        <h1
          className="text-[20px] font-bold text-black opacity-80"
          style={{
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
            lineHeight: 1.22,
          }}
        >
          {tableLabel}
        </h1>

        {/* Split / Participants Card (hidden in area flow) */}
        {flowType !== 'area' && <ParticipantsList totalOverride={billTotal} />}

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

      </div>

      {/* Pay Now bar — fixed bottom, Figma Frame layout_Q5T055 */}
      <button
        type="button"
        className="fixed rounded-t-[30px] left-0 right-0 h-[70px] box-content flex items-center justify-between px-[22px] bg-black text-white hover:bg-gray-900 active:opacity-95 transition-all z-20"
        style={{
          bottom: 0,
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
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
            {formatPrice(payNowAmount)}
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

      <Footer />

    </div>
  );
}
