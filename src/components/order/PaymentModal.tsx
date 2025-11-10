'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { CheckCircle } from 'lucide-react';
import { modalVariants, backdropVariants } from '@/lib/animations';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartNewOrder: () => void;
  amount: number;
}

export function PaymentModal({ isOpen, onClose, onStartNewOrder, amount }: PaymentModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          {/* Modal content - bottom sheet style */}
          <motion.div
            className="relative w-full bg-white rounded-t-3xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Payment Successful!</h2>
            <p className="text-lg text-gray-600">
              ${amount.toFixed(2)} paid
            </p>
          </div>

          {/* Mock Payment Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800 text-center">
              <span className="font-semibold">Payment simulated successfully.</span>
              <br />
              Backend integration coming soon.
            </p>
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-gray-500">
            <p>A receipt will be sent to your email.</p>
            <p className="mt-1">Thank you for dining with us!</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={onStartNewOrder}
              variant="primary"
              fullWidth
              size="lg"
            >
              Start New Order
            </Button>
            <Button
              onClick={onClose}
              variant="secondary"
              fullWidth
              size="lg"
            >
              Close
            </Button>
          </div>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
