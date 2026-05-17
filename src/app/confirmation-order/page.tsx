"use client";

import React, { useState } from "react";

export default function ConfirmationOrderPage() {
  const [email, setEmail] = useState("");

  const handleSendReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    // Receipt sending logic would go here
    console.log("Sending receipt to:", email);
  };

  return (
    <div className="w-full h-screen bg-foreground text-white p-5 font-sans">
      <div className="w-full h-full  mx-auto pt-2">
        {/* Header section with Table and Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-white font-semibold text-[15px]">Table 441</span>
          <span className="px-2.5 py-[2px] bg-[#143322] text-[#69E48D] text-[11px] font-medium rounded-full">
            Settled
          </span>
        </div>

        {/* Welcome Text */}
        <div className="flex flex-col gap-1.5 mb-5">
          <h1 className="text-[24px] font-medium tracking-tight">You're all set.</h1>
          <h2 className="text-[20px] font-normal tracking-tight text-[#EAEAEA]">Thanks for visiting us!</h2>
        </div>

        <p className="text-[#A1A1AA] text-[14px] mb-5">
          Thanks for visiting on 08.04.2026
        </p>

        <hr className="border-[#27272A] my-5" />

        {/* Amount Paid */}
        <div className="flex items-center justify-between my-5">
          <span className="text-[#A1A1AA] text-[11px] font-bold tracking-wider">AMOUNT PAID</span>
          <span className="text-white text-[15px] font-normal">1,136.00</span>
        </div>

        <hr className="border-[#27272A] my-5" />

        {/* Receipt Section */}
        <div className="mt-6">
          <h3 className="text-[#EAEAEA] text-[11px] font-bold tracking-wider mb-2.5">
            GET A RECEIPT
          </h3>
          <p className="text-[#D4D4D8] text-[14px] mb-4">
            Have a digital copy of your receipt sent by email.
          </p>

          <form onSubmit={handleSendReceipt} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full bg-transparent border border-[#3F3F46] text-white rounded-xl px-4 py-3.5 outline-none focus:border-gray-400 placeholder:text-[#71717A] text-[14px] transition-colors"
              required
            />

            <button
              type="submit"
              className="w-full bg-white text-black font-semibold rounded-xl py-3.5 mt-1 hover:bg-gray-100 transition-colors text-[15px]"
            >
              Send receipt
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
