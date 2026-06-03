'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Star, Settings, Download, Loader2, Bell } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useSession } from '@/contexts/SessionContext';
import { useSplit } from '@/contexts/SplitContext';
import { SplitSettingsModal } from '@/components/order/SplitSettingsModal';
import { useFlowType } from '@/hooks/useFlowType';
import { Avatar } from '@/components/ui/Avatar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getFromStorage } from '@/mocks/mockStorage';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { receiptService } from '@/services/receipt.service';
import type { SessionBill } from '@/types/api/bill';
import type { Participant } from '@/types/cart';

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
  const { split, addParticipant, removeParticipant } = useSplit();

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [remindingStatus, setRemindingStatus] = useState<Record<string, 'idle' | 'loading' | 'done'>>({});

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

  // Sync session participants into SplitContext
  useEffect(() => {
    if (!apiParticipants || apiParticipants.length === 0) return;

    const apiParticipantIds = new Set(apiParticipants.map(p => p.sessionUserId));

    // Remove stale participants from split
    split.participants.forEach(p => {
      if (!apiParticipantIds.has(p.id)) {
        removeParticipant(p.id);
      }
    });

    // Add new participants to split
    apiParticipants.forEach(apiP => {
      const existsInSplit = split.participants.some(p => p.id === apiP.sessionUserId);
      if (!existsInSplit) {
        const newParticipant: Participant = {
          id: apiP.sessionUserId,
          name: apiP.guestName,
          avatar: '',
          isMock: false,
        };
        addParticipant(newParticipant);
      }
    });
  }, [apiParticipants, split.participants, addParticipant, removeParticipant]);

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

  // Calculate total session bill, total collected, total pending, and progress percentage
  const totalSessionBill = useMemo(() => {
    if (sortedParticipants.length > 0) {
      return sortedParticipants.reduce((sum, p) => sum + getParticipantAmount(p.sessionUserId), 0);
    }
    return billTotalWithoutTip;
  }, [sortedParticipants, getParticipantAmount, billTotalWithoutTip]);

  const totalCollected = useMemo(() => {
    return sortedParticipants.reduce((sum, p) => {
      if (isParticipantPaid(p.sessionUserId)) {
        return sum + getParticipantAmount(p.sessionUserId);
      }
      return sum;
    }, 0);
  }, [sortedParticipants, isParticipantPaid, getParticipantAmount]);

  const totalPending = useMemo(() => {
    return Math.max(0, totalSessionBill - totalCollected);
  }, [totalSessionBill, totalCollected]);

  const collectedPercentage = useMemo(() => {
    return totalSessionBill > 0 ? (totalCollected / totalSessionBill) * 100 : 0;
  }, [totalCollected, totalSessionBill]);

  // Separate pending and paid participants
  const pendingParticipants = useMemo(() => {
    return sortedParticipants.filter(p => !isParticipantPaid(p.sessionUserId));
  }, [sortedParticipants, isParticipantPaid]);

  const paidParticipants = useMemo(() => {
    return sortedParticipants.filter(p => isParticipantPaid(p.sessionUserId));
  }, [sortedParticipants, isParticipantPaid]);

  const handleRemindParticipant = (sessionUserId: string) => {
    if (remindingStatus[sessionUserId] === 'loading' || remindingStatus[sessionUserId] === 'done') return;

    setRemindingStatus(prev => ({ ...prev, [sessionUserId]: 'loading' }));

    setTimeout(() => {
      setRemindingStatus(prev => ({ ...prev, [sessionUserId]: 'done' }));
      setTimeout(() => {
        setRemindingStatus(prev => ({ ...prev, [sessionUserId]: 'idle' }));
      }, 2000);
    }, 1000);
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
          <div className="mb-6 rounded-[24px] bg-black p-6 text-white shadow-xl">
            {/* Total Session Bill Header */}
            <h2 className="text-[22px] font-extrabold tracking-tight mb-2">
              Total Session Bill: {formatPrice(totalSessionBill)}
            </h2>

            {/* Participants Count and Mode */}
            <div className="flex flex-wrap items-center gap-2 mb-4 text-[13px] text-gray-300 font-medium">
              <span>Participants ({sortedParticipants.length})</span>
              <span>[{getModeLabel()}]</span>
            </div>

            {/* Progress Bar (Collected / Pending) */}
            {/* <div className="w-full h-[7px] rounded-full overflow-hidden flex bg-[#E05252] mb-3 relative">
              <div
                className="bg-[#3CD070] h-full transition-all duration-500 ease-out"
                style={{ width: `${collectedPercentage}%` }}
              />
            </div> */}

            {/* Session Status Summary */}
            {/* <div className="text-[13px] text-gray-400 font-semibold mb-6">
              <div>Session status • Split {pendingParticipants.length} pending</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[#3CD070] font-bold">{formatPrice(totalCollected)} Collected</span>
                <span className="text-gray-500 font-normal">•</span>
                <span className="text-[#E05252] font-bold">{formatPrice(totalPending)} Pending</span>
              </div>
            </div> */}

            {/* Lists: PENDING & PAID */}
            <div className="space-y-6">
              {/* PENDING list */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-gray-400 uppercase mb-3">
                  <span>Pending ({pendingParticipants.length})</span>
                </div>
                {pendingParticipants.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {pendingParticipants.map(participant => {
                      const isYou = participant.sessionUserId === currentSessionUserId;
                      const displayName = isYou ? 'You' : participant.guestName;
                      const shareAmount = getParticipantAmount(participant.sessionUserId);
                      const remindState = remindingStatus[participant.sessionUserId] || 'idle';

                      return (
                        <div key={participant.sessionUserId} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={participant.guestName} className="w-9 h-9 border border-white/10" />
                            <span className="font-semibold text-[15px]">{displayName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-[15px]">{formatPrice(shareAmount)}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded border border-[#E05252]/20 bg-[#E05252]/10 text-[#E05252]">
                              Pending
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[13px] text-gray-500 py-1">No pending payments</div>
                )}
              </div>

              {/* PAID list */}
              <div>
                <div className="text-[11px] font-black tracking-wider text-gray-400 uppercase mb-3">
                  Paid ({paidParticipants.length})
                </div>
                {paidParticipants.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {paidParticipants.map(participant => {
                      const isYou = participant.sessionUserId === currentSessionUserId;
                      const displayName = isYou ? 'You' : participant.guestName;
                      const shareAmount = getParticipantAmount(participant.sessionUserId);

                      return (
                        <div key={participant.sessionUserId} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={participant.guestName} className="w-9 h-9 border border-white/10" />
                            <span className="font-semibold text-[15px]">{displayName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-[15px]">{formatPrice(shareAmount)}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded border border-[#3CD070]/20 bg-[#3CD070]/10 text-[#3CD070]">
                              Paid
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[13px] text-gray-500 py-1">No paid payments yet</div>
                )}
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
