'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { Button } from '../ui';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuClick: () => void;
  /** When true, shows a Confirm Order CTA below the search row. Same action as header cart (go to cart). */
  showConfirmOrder?: boolean;
  onConfirmOrder?: () => void;
  /** Cart subtotal to show in Confirm Order CTA when showConfirmOrder is true. */
  cartTotal?: number;
  /** Number of items in cart — displayed as a pill inside the Confirm Order CTA. */
  cartItemCount?: number;
}

function SearchBarComponent({
  searchQuery,
  onSearchChange,
  onMenuClick,
  showConfirmOrder = false,
  onConfirmOrder,
  cartTotal = 0,
  cartItemCount = 0,
}: SearchBarProps) {
  const { formatPrice } = useLocale();
  const hasQuery = searchQuery.length > 0;

  const safeAreaPadding = 'max(env(safe-area-inset-bottom, 0px), 16px)';

  return (
    <div
      className="fixed left-0 right-0 z-40 bg-white rounded-t-[30px] overflow-hidden border-t border-[#F1F1F1] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex flex-col"
      style={{
        bottom: 0,
        // Force GPU acceleration to prevent iOS Safari fixed positioning issues
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      {/* Search row - 60px. Absorbs safe-area when CTA is absent (white bg fills zone). */}
      <div
        className="h-[60px] box-content px-[22px] flex items-center gap-3 shrink-0"
        style={showConfirmOrder ? undefined : { paddingBottom: safeAreaPadding }}
      >
        <Search
          className="w-[20px] h-[20px] text-black/40 shrink-0"
          strokeWidth={2}
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          maxLength={60}
          aria-label="Search menu"
          className="flex-1 min-w-0 h-full text-[20px] font-normal text-black placeholder:text-black placeholder:opacity-30 focus:outline-none bg-transparent"
          style={{ fontFamily: 'Lato, sans-serif', lineHeight: '1.2em' }}
        />
        {hasQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-black/10 hover:bg-black/20 active:scale-95 transition-all shrink-0"
            aria-label="Clear search"
            type="button"
          >
            <X className="w-[16px] h-[16px] text-black/60" strokeWidth={2.5} />
          </button>
        )}
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center w-[44px] h-[44px] bg-black rounded-full border border-[#F1F1F1] hover:opacity-90 active:scale-95 transition-all shrink-0"
          aria-label="Open menu navigation"
          type="button"
        >
          <Image
            src="/icons/Hamburger_menu.png"
            alt=""
            width={18}
            height={18}
            className="shrink-0"
          />
        </button>
      </div>

      {/* Confirm Order CTA - 70px, separated by subtle divider. Absorbs safe-area (black bg fills zone). */}
      {showConfirmOrder && onConfirmOrder && (
        <div className='mx-1'>
          <Button
            onClick={onConfirmOrder}
            className="w-full justify-between mb-2 text-[20px] font-medium"
            // style={{ paddingBottom: safeAreaPadding }}
            aria-label={
              cartItemCount > 0
                ? `Confirm order, ${cartItemCount} item${cartItemCount === 1 ? '' : 's'}, total ${formatPrice(cartTotal)}`
                : `Confirm order, total ${formatPrice(cartTotal)}`
            }
            type="button"
          >
            <span>
              {/* Confirm order */}
              View Cart
            </span>
            <span className="flex items-center gap-[10px] shrink-0">
              {cartItemCount > 0 && (
                <span
                  className="text-[13px] font-semibold px-[10px] py-[2px] rounded-full bg-white/20"
                  style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
                  aria-hidden="true"
                >
                  {cartItemCount}
                </span>
              )}
              <span
                className="text-[20px] font-semibold">
                {formatPrice(cartTotal)}
              </span>
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Memoized to prevent re-renders when the parent updates for reasons unrelated
 * to the search bar (e.g. category scroll tracking). Pair with useCallback on
 * the parent's handlers for maximum effect.
 */
export const SearchBar = memo(SearchBarComponent);
