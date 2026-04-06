'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Star, Settings, Download } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useSession } from '@/contexts/SessionContext';
import { useSplit } from '@/contexts/SplitContext';
import { Avatar } from '@/components/ui/Avatar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getFromStorage } from '@/mocks/mockStorage';
import type { SessionBill } from '@/types/api/bill';

const GOOGLE_REVIEWS_URL = 'https://maps.app.goo.gl/cyKBZ3Yn5qnS5c947';

interface PaymentResultViewProps {
  result: 'success' | 'failure';
  amount: number;
  bill: SessionBill | null;
  tipAmount: number;
  onBackToMenu: () => void;
  onRetryPayment: () => void;
}

export function PaymentResultView({
  result,
  amount,
  bill,
  tipAmount,
  onBackToMenu,
  onRetryPayment,
}: PaymentResultViewProps) {
  const router = useRouter();
  const { formatPrice } = useLocale();
  const { splitPaymentStatus, isParticipantPaid } = useSession();
  const { split } = useSplit();

  const currentSessionUserId = getFromStorage<string>('morsel_session_user_id');
  const isSuccess = result === 'success';
  const allPaid = splitPaymentStatus != null
    && splitPaymentStatus.length > 0
    && splitPaymentStatus.every(s => s.paid);

  // Bill total WITHOUT tips — tip is shown separately and added per participant
  const billTotalWithoutTip = bill ? (bill.total - (bill.totalTip || 0)) : 0;

  // Sort participants: current user first
  const sortedParticipants = useMemo(() => {
    return [...split.participants].sort((a, b) => {
      if (a.id === currentSessionUserId) return -1;
      if (b.id === currentSessionUserId) return 1;
      return 0;
    });
  }, [split.participants, currentSessionUserId]);

  const hasValidShares = split.participants.length > 0
    && Object.values(split.shares).some(v => typeof v === 'number' && v > 0);

  const getModeLabel = () => {
    const effectiveMode = hasValidShares ? split.mode : 'even';
    switch (effectiveMode) {
      case 'even': return 'Split evenly';
      case 'custom': return 'Custom split';
      case 'all': return 'Pay for everyone';
      case 'self': return 'Pay for self';
      case 'items': return 'Pay for items';
      default: return 'Split bill';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F8] overflow-x-hidden">
      {/* Header — same component as orders page */}
      <Header
        showTimer={false}
        showCart={false}
        showFilters={false}
        onRightIconClick={() => router.push('/menu')}
        centerLabel={isSuccess ? 'Payment Done' : 'Payment Failed'}
      />

      {/* Content — matches PostOrderView layout: max-w-2xl mx-auto p-4 px-4 */}
      <div className="max-w-2xl mx-auto p-4 px-4 bg-[#F7F8F8]">
        {/* Payment Banner */}
        <div className="mb-6 w-full bg-[#FF2F55] rounded-[12px] flex flex-col gap-[8px] items-center px-[20px] py-[24px]">
          <div className="flex items-center gap-[16px]">
            <span
              className="text-[32px] text-white"
              style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
            >
              {formatPrice(amount)}
            </span>
            {isSuccess ? (
              <CheckCircle2 className="w-[26px] h-[26px] text-white fill-green-500" />
            ) : (
              <XCircle className="w-[26px] h-[26px] text-white fill-black/30" />
            )}
          </div>
          <p
            className="text-[16px] text-white text-center tracking-[0.32px]"
            style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
          >
            {isSuccess ? 'Payment Successful.' : 'Payment Failed.'}
          </p>
        </div>

        {/* Google Reviews (success only) */}
        {isSuccess && (
          <div className="mb-6 flex flex-col gap-[8px] items-center">
            <div className="h-[65px] w-[170px] rounded-[12px] bg-white flex items-center justify-center overflow-hidden border border-gray-100">
              <span
                className="text-[14px] text-gray-600 flex items-center gap-2"
                style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
              >
                <span className="text-[20px]">G</span> Google Reviews
              </span>
            </div>
            <div className="flex gap-[2px]">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="w-[24px] h-[24px] text-[#FBBC04] fill-[#FBBC04]" />
              ))}
            </div>
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#FBBC04] rounded-[20px] px-[8px] py-[4px]"
            >
              <span
                className="text-[12px] text-[#1A1A1A] opacity-80"
                style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
              >
                Review us on Google
              </span>
            </a>
          </div>
        )}

        {/* Participants Card — same structure as ParticipantsList dark card */}
        {sortedParticipants.length > 0 && (
          <div className="mb-6 rounded-[30px] bg-black p-5">
            {/* Participant Avatars Row */}
            <div className="flex items-start gap-5 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {sortedParticipants.map(participant => {
                const paid = isParticipantPaid(participant.id);
                const isYou = participant.id === currentSessionUserId;
                const displayName = isYou ? 'You' : participant.name;
                const shareAmount = split.shares[participant.id] || 0;

                return (
                  <div key={participant.id} className="flex flex-col items-center gap-2 min-w-[60px] flex-shrink-0">
                    {/* Avatar with Paid overlay */}
                    <div className="relative">
                      <div className={paid ? 'opacity-40' : ''}>
                        <Avatar
                          name={participant.name}
                          className="w-[50px] h-[50px]"
                        />
                      </div>
                      {paid && (
                        <span
                          className="absolute inset-0 flex items-center justify-center text-[18px] text-white"
                          style={{ fontFamily: 'Lato, sans-serif', fontWeight: 900 }}
                        >
                          Paid
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <span className="text-xs font-black text-center text-white leading-tight">
                      {displayName}
                    </span>

                    {/* Amount */}
                    <span
                      className={`text-lg font-black text-center text-white leading-tight ${paid ? 'line-through opacity-70' : ''}`}
                    >
                      {formatPrice(shareAmount)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Split Mode Label + Change */}
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-bold text-xl leading-tight text-white">
                {getModeLabel()}
              </h3>
              <span className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 text-xs font-bold text-white">
                <Settings className="w-3.5 h-3.5" />
                Change
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-white/80 leading-relaxed">
              The bill is going to be {getModeLabel().toLowerCase()}, click on this card to change these settings.
            </p>
          </div>
        )}

        {/* Bill Section (hidden when all paid on success) */}
        {!allPaid && (
          <div className="mb-6">
            <h3
              className="text-black text-[20px] leading-[1.22] font-bold mb-3"
              style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
            >
              {isSuccess ? 'Pending Amount' : 'Bill'}
            </h3>
            <div className="flex flex-col gap-2 w-full">
              {/* Items total */}
              <div className="flex items-center justify-between w-full">
                <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                  Items total
                </span>
                <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                  {formatPrice(bill?.subtotal ?? billTotalWithoutTip)}
                </span>
              </div>

              {/* Individual tax lines */}
              {bill?.taxes && Object.entries(bill.taxes).map(([taxId, tax]) => (
                <div key={taxId} className="flex items-center justify-between w-full">
                  <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                    {tax.name} ({tax.percentage}%)
                  </span>
                  <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                    {formatPrice(tax.amount)}
                  </span>
                </div>
              ))}

              {/* Individual charge lines */}
              {bill?.charges && Object.entries(bill.charges).map(([chargeId, charge]) => (
                <div key={chargeId} className="flex items-center justify-between w-full">
                  <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                    {charge.name}
                  </span>
                  <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                    {formatPrice(charge.amount)}
                  </span>
                </div>
              ))}

              {/* Discount */}
              {(bill?.totalDiscount ?? 0) > 0 && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-green-700 text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                    Discount
                  </span>
                  <span className="text-green-700 text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                    -{formatPrice(bill?.totalDiscount ?? 0)}
                  </span>
                </div>
              )}

              {/* Tip */}
              <div className="flex items-center justify-between w-full">
                <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                  Tip
                </span>
                <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                  {formatPrice(tipAmount)}
                </span>
              </div>

              {/* Grand total */}
              <div className="flex items-center justify-between w-full pt-2 border-t border-gray-200">
                <span
                  className="text-black text-[16px] font-medium"
                  style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
                >
                  Grand total
                </span>
                <span
                  className="text-black text-[16px] font-medium"
                  style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
                >
                  {formatPrice(billTotalWithoutTip + tipAmount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />

      {/* Fixed Bottom CTA — matches PostOrderView: h-[70px] px-[22px] rounded-t-[30px] */}
      <div
        className="fixed left-0 right-0 z-20 rounded-t-[30px] overflow-hidden flex justify-center"
        style={{
          bottom: 0,
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {isSuccess ? (
          <button
            onClick={onBackToMenu}
            className="w-full max-w-2xl h-[70px] bg-black text-white flex items-center justify-between px-[22px] transition-all"
            style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              lineHeight: '1.22',
            }}
          >
            <span className="flex-shrink-0">Get Receipt</span>
            <div className="w-[30px] h-[30px] rounded-[4px] border-2 border-[#4B4B4B] flex items-center justify-center">
              <Download className="w-[14px] h-[14px] text-white" />
            </div>
          </button>
        ) : (
          <button
            onClick={onRetryPayment}
            className="w-full max-w-2xl h-[70px] bg-black text-white flex items-center justify-between px-[22px] transition-all"
            style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              lineHeight: '1.22',
            }}
          >
            <span className="flex-shrink-0">Retry Payment</span>
            <span className="flex-shrink-0">{formatPrice(amount)}</span>
          </button>
        )}
      </div>
    </div>
  );
}
