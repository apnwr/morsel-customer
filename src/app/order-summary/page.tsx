'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/contexts/OrderContext';
import { useCart } from '@/contexts/CartContext';
import { useSplit } from '@/contexts/SplitContext';
import { useSession } from '@/contexts/SessionContext';
import OrderStatusBanner from '@/components/order/OrderStatusBanner';
import RunningTabs from '@/components/order/RunningTabs';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { SplitSettingsModal } from '@/components/order/SplitSettingsModal';
import { PaymentModal } from '@/components/order/PaymentModal';
import { useTimerSync } from '@/hooks/useTimerSync';
import { useRequireActiveOrder } from '@/hooks/useNavigationGuard';
import { useSessionValidation } from '@/hooks/useSessionValidation';

export default function OrderSummaryPage() {
  const router = useRouter();
  // Navigation guard - redirect to cart if no active order
  const order = useRequireActiveOrder();
  const { remainingTime, resetOrder } = useOrder();
  const { clearCart } = useCart();
  const { clearSplit } = useSplit();
  const { endSession } = useSession();

  // Session validation - checks session status and expiry
  useSessionValidation();
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Sync timer on page load
  useTimerSync();

  // Don't render anything while redirecting
  if (!order || order.status === 'pending') {
    return null;
  }

  // Calculate the amount for the current user
  const currentUserAmount = order.split.shares[order.split.participants[0]?.id] || order.cart.total;

  // Handle payment click with simulated delay
  const handlePayNow = async () => {
    setIsProcessingPayment(true);

    // Simulate payment processing delay (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsProcessingPayment(false);

    // End session after successful payment
    // This marks the session as completed since payment is done
    try {
      await endSession('completed');
      console.log('[OrderSummary] Session ended after payment completion');
    } catch (error) {
      console.error('[OrderSummary] Failed to end session after payment:', error);
      // Continue anyway - don't block payment modal
    }

    setPaymentModalOpen(true);
  };

  // Handle starting a new order
  const handleStartNewOrder = () => {
    // Clear all state
    clearCart();
    resetOrder();
    clearSplit();
    
    // Navigate to menu
    router.push('/menu');
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
              order.isEditable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              ⏱
            </div>
            <span className={`text-sm font-medium ${
              order.isEditable ? 'text-green-600' : 'text-red-600'
            }`}>
              {Math.floor(remainingTime / 60)} mins
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">${order.cart.total.toFixed(2)}</span>
            <button onClick={() => router.push('/cart')}>→</button>
          </div>
        </div>
      </div>

      {/* Order Status Banner */}
      <OrderStatusBanner 
        isEditable={order.isEditable}
        remainingTime={remainingTime}
        eta={order.eta}
      />

      {/* Order Summary Section */}
      <div className="p-6 border-b border-gray-100">
        <h3 className="font-semibold mb-4">Order Summary</h3>
        
        <div className="space-y-3">
          {order.cart.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Avatar name={order.customerName} size="md" />
              <div className="flex-1">
                <h4 className="font-medium">{item.menuItem.name}</h4>
                <p className="text-sm text-gray-500">${item.menuItem.price.toFixed(2)}</p>
                {item.customizations && item.customizations.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {item.customizations.map(c => c.choiceLabel).join(', ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-gray-400 mt-1 italic">Note: {item.notes}</p>
                )}
              </div>
              <span className="text-sm text-gray-500">{item.quantity} item(s)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Running Tabs */}
      <RunningTabs 
        split={order.split}
        total={order.cart.total}
        onSplitClick={() => setIsSplitModalOpen(true)}
      />

      {/* Payment Section */}
      <div className="p-6">
        {/* Current User Payment Card */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar name={order.customerName} size="md" />
              <span className="font-semibold text-lg">
                ${(order.split.shares[order.split.participants[0]?.id] || order.cart.total).toFixed(2)}
              </span>
            </div>
            <Button 
              variant="primary"
              size="sm"
              onClick={handlePayNow}
              loading={isProcessingPayment}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? 'Processing...' : 'Pay now'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            You can pay now or pay later at the end of your dining session. 
            A receipt will be sent to your email.
          </p>
        </div>

        {/* Other Participants */}
        {order.split.participants.length > 1 && (
          <div className="space-y-3">
            {order.split.participants.slice(1).map((participant) => {
              const amount = order.split.shares[participant.id] || 0;
              return (
                <div 
                  key={participant.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={participant.name} size="sm" />
                    <span className="font-semibold">${amount.toFixed(2)}</span>
                  </div>
                  <Button 
                    variant="secondary"
                    size="sm"
                    disabled
                  >
                    Pay now
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order More Food Section */}
      <div className="p-6">
        <div className="p-4 bg-gray-50 rounded-xl text-center">
          <h4 className="font-semibold mb-1">Order more food?</h4>
          <p className="text-sm text-gray-600 mb-3">
            Going back doesn&apos;t cancel your order. You can add more items 
            or go back to the table again.
          </p>
          <Button 
            variant="secondary"
            fullWidth
            onClick={() => router.push('/menu')}
          >
            Back to Menu
          </Button>
        </div>
      </div>

      {/* Split Settings Modal */}
      {isSplitModalOpen && (
        <SplitSettingsModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
        />
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onStartNewOrder={handleStartNewOrder}
        amount={currentUserAmount}
      />
    </div>
  );
}
