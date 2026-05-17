'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Star, Settings, Download, Loader2 } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useSession } from '@/contexts/SessionContext';
import { useFlowType } from '@/hooks/useFlowType';
import { Avatar } from '@/components/ui/Avatar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getFromStorage } from '@/mocks/mockStorage';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { receiptService } from '@/services/receipt.service';
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
  const { sessionData, splitPaymentStatus, serverSplitType, isParticipantPaid } = useSession();
  const flowType = useFlowType();

  const currentSessionUserId = getFromStorage<string>(STORAGE_KEYS.SESSION_USER_ID);
  const isSuccess = result === 'success';
  const isAreaFlow = flowType === 'area';

  // Bill total WITHOUT tips — tip is shown separately and added per participant
  const billTotalWithoutTip = bill ? (bill.total - (bill.totalTip || 0)) : 0;

  const allPaid = splitPaymentStatus != null
    && splitPaymentStatus.length > 0
    && splitPaymentStatus.every(s => s.paid);

  // Participants from session API (server truth), sorted current user first
  const apiParticipants = sessionData?.session?.participants;
  const sortedParticipants = useMemo(() => {
    if (!apiParticipants || apiParticipants.length === 0) return [];
    return [...apiParticipants].sort((a, b) => {
      if (a.sessionUserId === currentSessionUserId) return -1;
      if (b.sessionUserId === currentSessionUserId) return 1;
      return 0;
    });
  }, [apiParticipants, currentSessionUserId]);

  // Server-first: resolve a participant's amount from splitPaymentStatus (cross-device truth).
  // Fallback to even split across API participants; ignore local split.shares (per-device stale).
  const getParticipantAmount = (sessionUserId: string): number => {
    if (splitPaymentStatus && splitPaymentStatus.length > 0) {
      const serverEntry = splitPaymentStatus.find((s) => s.sessionUserId === sessionUserId);
      if (serverEntry && typeof serverEntry.amount === 'number') {
        return serverEntry.amount;
      }
    }
    const count = apiParticipants?.length ?? 0;
    if (count > 1 && billTotalWithoutTip > 0) {
      return Math.round((billTotalWithoutTip / count) * 100) / 100;
    }
    return 0;
  };

  // Show participants card only in space flow with 2+ participants
  const showParticipantsCard = !isAreaFlow && sortedParticipants.length > 1;

  const [isReceiptLoading, setIsReceiptLoading] = useState(false);

  const handleGetReceipt = async () => {
    const sessionId = sessionData?.session?.id;
    if (!sessionId) return;

    setIsReceiptLoading(true);
    try {
      const html = await receiptService.getReceipt(sessionId, currentSessionUserId || undefined);

      // Inject a sticky download button that triggers print (Save as PDF)
      const downloadBtn = `
        <div id="receipt-actions" style="position:sticky;top:0;z-index:9999;background:#000;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;">
          <span style="color:#fff;font-family:Helvetica Neue,sans-serif;font-size:16px;font-weight:700;">Receipt</span>
          <button onclick="document.getElementById('receipt-actions').style.display='none';window.print();document.getElementById('receipt-actions').style.display='flex';"
            style="background:#fff;color:#000;border:none;padding:8px 20px;border-radius:20px;font-family:Helvetica Neue,sans-serif;font-size:14px;font-weight:700;cursor:pointer;">
            Download PDF
          </button>
        </div>`;

      // Insert button at start of body (or before existing content)
      const injectedHtml = html.includes('<body')
        ? html.replace(/(<body[^>]*>)/i, `$1${downloadBtn}`)
        : `${downloadBtn}${html}`;

      const blob = new Blob([injectedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('[PaymentResultView] Failed to get receipt:', err);
    } finally {
      setIsReceiptLoading(false);
    }
  };

  const getModeLabel = () => {
    // Server-first; when server has no type, always default to "Split evenly".
    // Deliberately ignore local split.mode — can be stale per-device.
    switch (serverSplitType) {
      case 'equal': return 'Split evenly';
      case 'custom': return 'Custom split';
      case 'participant': return 'Pay for self';
      case 'itemized': return 'Pay for items';
      default: return 'Split evenly';
    }
  };

  // Bill section title: area flow always "Bill", space flow depends on paid status
  const billSectionTitle = isAreaFlow ? 'Bill' : (isSuccess ? 'Pending Amount' : 'Bill');
  // Show bill section: always in area/failure, hide in space flow when all paid
  const showBillSection = isAreaFlow || !allPaid;

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

        {/* Participants Card — space flow only, 2+ participants */}
        {showParticipantsCard && (
          <div className="mb-6 rounded-[30px] bg-black p-5">
            {/* Participant Avatars Row */}
            <div className="flex items-start gap-5 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {sortedParticipants.map(participant => {
                const paid = isParticipantPaid(participant.sessionUserId);
                const isYou = participant.sessionUserId === currentSessionUserId;
                const displayName = isYou ? 'You' : participant.guestName;
                const shareAmount = getParticipantAmount(participant.sessionUserId);

                return (
                  <div key={participant.sessionUserId} className="flex flex-col items-center gap-2 min-w-[60px] flex-shrink-0">
                    {/* Avatar with Paid overlay */}
                    <div className="relative">
                      <div className={paid ? 'opacity-40' : ''}>
                        <Avatar
                          name={participant.guestName}
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

        {/* Bill Section */}
        {showBillSection && (
          <div className="mb-6">
            <h3
              className="text-black text-[20px] leading-[1.22] font-bold mb-3"
              style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 700 }}
            >
              {billSectionTitle}
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

              {/* Individual tax lines — skip zero-amount entries; a 0.00 row carries no info. */}
              {bill?.taxes && Object.entries(bill.taxes)
                .filter(([, tax]) => tax.amount > 0)
                .map(([taxId, tax]) => (
                  <div key={taxId} className="flex items-center justify-between w-full">
                    <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                      {tax.name} ({tax.percentage}%)
                    </span>
                    <span className="text-black text-[12px] font-normal" style={{ fontFamily: 'Lato, sans-serif' }}>
                      {formatPrice(tax.amount)}
                    </span>
                  </div>
                ))}

              {/* Individual charge lines — same zero-amount filter. */}
              {bill?.charges && Object.entries(bill.charges)
                .filter(([, charge]) => charge.amount > 0)
                .map(([chargeId, charge]) => (
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
            onClick={handleGetReceipt}
            disabled={isReceiptLoading}
            className="w-full max-w-2xl h-[70px] box-content bg-brand text-white flex items-center justify-between px-[22px] transition-all disabled:opacity-70"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
              fontFamily: 'Helvetica Neue, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              lineHeight: '1.22',
            }}
          >
            <span className="flex-shrink-0">{isReceiptLoading ? 'Loading...' : 'Get Receipt'}</span>
            <div className="w-[30px] h-[30px] rounded-[4px] flex items-center justify-center">
              {isReceiptLoading ? (
                <Loader2 className="w-[14px] h-[14px] text-white animate-spin" />
              ) : (
                <Download className="w-[30px] h-[30px] text-white" />
              )}
            </div>
          </button>
        ) : (
          <button
            onClick={onRetryPayment}
            className="w-full max-w-2xl h-[70px] box-content bg-black text-white flex items-center justify-between px-[22px] transition-all"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
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
