'use client';

import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { useLocale } from '@/contexts/LocaleContext';

interface BillSectionProps {
  userAmount: number;
}

export function BillSection({ userAmount }: BillSectionProps) {
  const { cart } = useCart();
  const { formatPrice } = useLocale();

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Bill Title and Content */}
      <div className="flex flex-col gap-3 w-full">
        {/* Bill Title */}
        <h3
          className="text-black font-bold text-[20px] leading-[1.22]"
          style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
        >
          Bill
        </h3>

        {/* Bill Details */}
        <div className="flex flex-col gap-2 w-full">
          {/* Items total */}
          <div className="flex items-center justify-between w-full">
            <span
              className="text-black text-[12px] leading-[1.2] font-normal"
              style={{ fontFamily: 'Lato, sans-serif' }}
            >
              Items total
            </span>
            <span
              className="text-black text-[12px] leading-[1.2] font-normal"
              style={{ fontFamily: 'Lato, sans-serif' }}
            >
              {formatPrice(cart.subtotal)}
            </span>
          </div>

          {/* Taxes — hide when zero; a 0.00 line adds visual noise without info. */}
          {cart.tax > 0 && (
            <div className="flex items-center justify-between w-full">
              <span
                className="text-black text-[12px] leading-[1.2] font-normal"
                style={{ fontFamily: 'Lato, sans-serif' }}
              >
                Taxes
              </span>
              <span
                className="text-black text-[12px] leading-[1.2] font-normal"
                style={{ fontFamily: 'Lato, sans-serif' }}
              >
                {formatPrice(cart.tax)}
              </span>
            </div>
          )}

          {/* Grand total */}
          <div className="flex items-center justify-between w-full">
            <span
              className="text-black text-[16px] leading-[1.22] font-medium"
              style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
            >
              Grand total
            </span>
            <span
              className="text-black text-[16px] leading-[1.22] font-medium"
              style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
            >
              {formatPrice(cart.total)}
            </span>
          </div>
        </div>
      </div>

      {/* My Share */}
      <div className="flex items-center justify-between w-full">
        <span
          className="text-black text-[16px] leading-[1.22] font-bold"
          style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
        >
          My Share
        </span>
        <span
          className="text-black text-[20px] leading-[1.22] font-bold"
          style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
        >
          {formatPrice(userAmount)}
        </span>
      </div>
    </div>
  );
}

