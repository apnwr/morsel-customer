'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCart } from '@/contexts/CartContext';
import { useSplit } from '@/contexts/SplitContext';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceOrder: () => void;
}

export function BillModal({ isOpen, onClose, onPlaceOrder }: BillModalProps) {
  const { cart } = useCart();
  const { split } = useSplit();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bill">
      <div className="space-y-4">
        {/* Itemized List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-gray-600">Items</h3>
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.menuItem.name}</p>
                {item.customizations.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {item.customizations.map((c) => c.choiceLabel).join(', ')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm">
                  <span className="text-gray-500">×{item.quantity}</span>
                  <span className="ml-2 font-medium">${item.itemTotal.toFixed(2)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${cart.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Tax (10%)</span>
            <span className="font-medium">${cart.tax.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span>Total</span>
            <span>${cart.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Split Information */}
        {split.participants.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-sm text-gray-600 mb-3">Split ({split.mode})</h3>
            <div className="space-y-2">
              {split.participants.map((participant) => {
                const amount = split.shares[participant.id] || 0;
                return (
                  <div key={participant.id} className="flex items-center justify-between text-sm">
                    <span>{participant.name}</span>
                    <span className="font-medium">${amount.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-4">
          <button
            onClick={onPlaceOrder}
            className="w-full py-4 bg-black text-white rounded-xl font-medium hover:bg-gray-900 active:scale-95 transition-all"
          >
            Place Order
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors text-sm"
          >
            Edit Cart
          </button>
        </div>
      </div>
    </Modal>
  );
}
