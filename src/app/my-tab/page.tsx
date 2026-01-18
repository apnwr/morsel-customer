"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Share2 } from "lucide-react";
import { useRequireRestaurantContext } from "@/hooks/useNavigationGuard";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useSession } from "@/contexts/SessionContext";

// Static values per design
const TABLE_NUMBER = "15";
const PARTICIPANTS = [
  { name: "You", amount: "100.00", isYou: true },
  { name: "Angela", amount: "100.00", isYou: false },
  { name: "Toby", amount: "100.00", isYou: false },
];
const PAY_AMOUNT = "18.44";

function Avatar({ name, isYou }: { name: string; isYou: boolean }) {
  const initial = name[0];
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

export default function MyTabPage() {
  const router = useRouter();
  useRequireRestaurantContext();
  useSessionValidation();
  const { sessionData } = useSession();

  const tableLabel = sessionData?.space?.name ?? `Table ${TABLE_NUMBER}`;

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-[90px]">
      {/* Top bar: Back + Table circle — matches Figma Frame 78 */}
      <div className="sticky top-0 bg-[#F7F8F8] border-b border-gray-100 z-10">
        <div className="px-[18px] py-[10px] flex items-center gap-[10px]">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center shrink-0 rounded-full hover:bg-gray-100 active:opacity-80 transition-opacity"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-black" strokeWidth={2.5} />
          </button>
          <div className="relative w-[50px] h-[50px] flex items-center justify-center shrink-0">
            <div className="absolute inset-0 border-[3px] border-black rounded-full" />
            <span
              className="text-xl font-bold relative z-10"
              style={{
                fontFamily: "Lato, sans-serif",
                letterSpacing: "0.12em",
              }}
            >
              {TABLE_NUMBER}
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
            className="flex items-center gap-2 px-5 py-2 bg-white border-[2px] border-[#ECECEC] rounded-[30px] shrink-0 hover:bg-gray-50 active:opacity-90 transition-all"
          >
            <Share2 className="w-5 h-5 text-black" strokeWidth={2} />
            <span
              className="text-[16px] font-bold text-black"
              style={{ fontFamily: "Lato, sans-serif", lineHeight: 1.2 }}
            >
              Split evenly
            </span>
          </button>
        </div>

        {/* Participant cards — Frame 101, gap 12 */}
        <div className="flex flex-col gap-3">
          {PARTICIPANTS.map((p) => (
            <div
              key={p.name}
              className={`flex items-center justify-between rounded-[50px] py-2 pl-2 pr-4 border-[2px] ${p.isYou
                ? "bg-[#EAF8F8] border-[#D2EDED]"
                : "bg-white border-[#DEDEDE]"
                }`}
            >
              <div className="flex items-center gap-2">
                <Avatar name={p.name} isYou={p.isYou} />
                <span
                  className="text-[16px] font-bold text-black"
                  style={{
                    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
                    lineHeight: 1.22,
                  }}
                >
                  {p.name}
                </span>
              </div>
              <span
                className="text-[16px] font-bold text-black opacity-80"
                style={{
                  fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
                  lineHeight: 1.22,
                }}
              >
                $ {p.amount}
              </span>
            </div>
          ))}
        </div>

        {/* Image placeholder — image 4, 198×112 */}
        <div className="w-full max-w-[198px] h-[112px] rounded-xl bg-[#E8E8E8] border border-gray-200 flex items-center justify-center self-center">
          <span className="text-gray-400 text-xs">Image</span>
        </div>

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
        className="fixed bottom-0 rounded-t-[30px] left-0 right-0 h-[70px] flex items-center justify-between px-[22px] bg-black text-white hover:bg-gray-900 active:opacity-95 transition-all z-20"
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
            $ {PAY_AMOUNT}
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
    </div>
  );
}
