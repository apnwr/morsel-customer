'use client';

import React from 'react';
import { useCart } from '@/contexts/CartContext';

interface BillSectionProps {
  userAmount: number;
}

export function BillSection({ userAmount }: BillSectionProps) {
  const { cart } = useCart();

  // Delivery charge and packing fees are not currently implemented
  // Setting them to 0.00 as shown in the Figma design
  const deliveryCharge = 0.0;
  const packingFees = 0.0;

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
              ${cart.subtotal.toFixed(2)}
            </span>
          </div>

          {/* Taxes */}
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
              ${cart.tax.toFixed(2)}
            </span>
          </div>

          {/* Delivery charge */}
          <div className="flex items-center justify-between w-full">
            <span
              className="text-black text-[12px] leading-[1.2] font-normal"
              style={{ fontFamily: 'Lato, sans-serif' }}
            >
              Delivery charge
            </span>
            <span
              className="text-black text-[12px] leading-[1.2] font-normal"
              style={{ fontFamily: 'Lato, sans-serif' }}
            >
              ${deliveryCharge.toFixed(2)}
            </span>
          </div>

          {/* Restaurant Packing fees */}
          <div className="flex items-center justify-between w-full">
            <span
              className="text-black text-[12px] leading-[1.2] font-normal"
              style={{ fontFamily: 'Lato, sans-serif' }}
            >
              Restaurant Packing fees
            </span>
            <span
              className="text-black text-[12px] leading-[1.2] font-normal"
              style={{ fontFamily: 'Lato, sans-serif' }}
            >
              ${packingFees.toFixed(2)}
            </span>
          </div>

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
              ${cart.total.toFixed(2)}
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
          ${userAmount.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

