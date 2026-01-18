'use client';

import React from 'react';
import Image from 'next/image';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuClick: () => void;
  /** When true, shows a Confirm Order CTA below the search row. Same action as header cart (go to cart). */
  showConfirmOrder?: boolean;
  onConfirmOrder?: () => void;
  /** Cart subtotal to show in Confirm Order CTA when showConfirmOrder is true. */
  cartTotal?: number;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  onMenuClick,
  showConfirmOrder = false,
  onConfirmOrder,
  cartTotal = 0,
}: SearchBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-[3px] border-[#F1F1F1] rounded-t-[30px] z-20 flex flex-col">
      {/* Search row - 60px, matches Figma Rectangle 2 */}
      <div className="h-[60px] px-[22px] flex items-center gap-4 shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="flex-1 h-full text-[20px] font-normal text-black placeholder:text-black placeholder:opacity-30 focus:outline-none bg-transparent"
          style={{ fontFamily: 'Lato, sans-serif', lineHeight: '1.2em' }}
        />
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center gap-[10px] w-[120px] h-[44px] px-[40px] py-[20px] bg-black rounded-[42px] hover:opacity-90 active:scale-95 transition-all shrink-0"
          aria-label="Open menu navigation"
        >
          <Image
            src="/icons/Hamburger_menu.png"
            alt="Menu"
            width={18}
            height={18}
            className="shrink-0"
          />
          <span
            className="text-[18px] font-bold text-white whitespace-nowrap"
            style={{ fontFamily: 'Lato, sans-serif', lineHeight: '1.2em' }}
          >
            Menu
          </span>
        </button>
      </div>

      {/* Confirm Order CTA - 70px, black, same action as header cart. Figma: Frame 2164-29003. */}
      {showConfirmOrder && onConfirmOrder && (
        <button
          onClick={onConfirmOrder}
          className="h-[70px] w-full flex items-center gap-3 justify-center px-[22px] rounded-t-[30px] bg-black text-white hover:bg-gray-900 active:opacity-95 transition-all shrink-0"
          aria-label="Confirm order / Go to cart"
        >
          <span
            className="text-[20px] font-medium"
            style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', lineHeight: 1.22 }}
          >
            Confirm order
          </span>
          <span
              className="text-[20px] font-medium"
              style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', lineHeight: 1.22 }}
            >
              $ {cartTotal.toFixed(2)}
            </span>
          {/* <div className=" justify-self-end">           
            <Image
              src="/icons/Diagonal_Arrow.png"
              alt=""
              width={24}
              height={24}
              className="shrink-0 invert"
            />
          </div> */}
        </button>
      )}
    </div>
  );
}

