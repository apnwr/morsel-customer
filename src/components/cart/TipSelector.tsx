'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Modal } from '@/components/ui/Modal';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';
import { tipService } from '@/services/tip.service';

const STORAGE_KEY = 'morsel_tip';

export interface TipState {
  /** Selected percentage (10, 5, 0) or -1 for custom */
  percentage: number;
  /** Absolute tip amount */
  amount: number;
}

const TIP_OPTIONS = [
  { label: '10%', value: 10 },
  { label: '5%', value: 5 },
  { label: '0%', value: 0 },
];

interface TipSelectorProps {
  /** Order/cart subtotal to calculate percentage-based tips */
  subtotal: number;
  /** Called whenever the tip amount changes */
  onTipChange?: (tip: TipState) => void;
  /** Session ID for server sync */
  sessionId?: string;
  /** Current participant's session user ID */
  sessionUserId?: string;
}

export function TipSelector({ subtotal, onTipChange, sessionId, sessionUserId }: TipSelectorProps) {
  const { formatPrice } = useLocale();
  const [selectedTip, setSelectedTip] = useState<number>(() => {
    const stored = getFromStorage<TipState>(STORAGE_KEY);
    return stored?.percentage ?? 10;
  });
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTipInput, setCustomTipInput] = useState('');

  // Calculate the actual tip amount
  const tipAmount = selectedTip === -1
    ? parseFloat(getFromStorage<TipState>(STORAGE_KEY)?.amount?.toString() || '0') || 0
    : Math.round(subtotal * (selectedTip / 100) * 100) / 100;

  // Sync tip to server (fire-and-forget, debounced)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTipToServer = useCallback((amount: number) => {
    if (!sessionId || !sessionUserId) return;

    // Debounce: wait 500ms before sending to avoid rapid-fire API calls
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (amount > 0) {
        tipService.addOrUpdateParticipantTip(sessionId, sessionUserId, amount)
          .catch(err => console.error('[TipSelector] Failed to sync tip:', err));
      } else {
        tipService.removeParticipantTip(sessionId, sessionUserId)
          .catch(err => console.error('[TipSelector] Failed to remove tip:', err));
      }
    }, 500);
  }, [sessionId, sessionUserId]);

  // Persist tip state and notify parent (NO server sync here — that happens only on user action)
  useEffect(() => {
    const state: TipState = { percentage: selectedTip, amount: tipAmount };
    setInStorage(STORAGE_KEY, state);
    onTipChange?.(state);
  }, [selectedTip, tipAmount, onTipChange]);

  const handleSelectPreset = useCallback((value: number) => {
    setSelectedTip(value);
    const amount = Math.round(subtotal * (value / 100) * 100) / 100;
    syncTipToServer(amount);
  }, [subtotal, syncTipToServer]);

  // Get current tip label for the confirm button
  const getTipLabel = () => {
    if (selectedTip === -1) return 'Custom Tip';
    return `Tip ${selectedTip}%`;
  };

  const handleConfirmCustomTip = useCallback(() => {
    const amount = parseFloat(customTipInput) || 0;
    setSelectedTip(-1);
    const state: TipState = { percentage: -1, amount };
    setInStorage(STORAGE_KEY, state);
    onTipChange?.(state);
    syncTipToServer(amount);
    setShowCustomModal(false);
    setCustomTipInput('');
  }, [customTipInput, onTipChange, syncTipToServer]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex gap-3 items-start justify-center w-full">
          {TIP_OPTIONS.map((option) => {
            const isSelected = selectedTip === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelectPreset(option.value)}
                className={`flex-1 px-5 py-2 rounded-[30px] border-2 text-[16px] font-bold text-center transition-all ${
                  isSelected
                    ? 'bg-black border-[#595959] text-white'
                    : 'bg-white border-[#ECECEC] text-black'
                }`}
                style={{ fontFamily: 'Lato, sans-serif' }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowCustomModal(true)}
          className={`w-full px-5 py-2 rounded-[30px] border-2 text-[16px] font-bold text-center transition-all ${
            selectedTip === -1
              ? 'bg-black border-[#595959] text-white'
              : 'bg-white border-[#ECECEC] text-black hover:bg-gray-50'
          }`}
          style={{ fontFamily: 'Lato, sans-serif' }}
        >
          Custom Tip
        </button>
      </div>

      {/* Custom Tip Bottom Sheet */}
      <Modal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        size="sm"
        showCloseButton={false}
      >
        <div className="p-6">
          <h3
            className="text-[22px] font-bold text-black mb-5"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            Custom Tip
          </h3>

          {/* Input */}
          <input
            type="number"
            min="0"
            step="0.01"
            value={customTipInput}
            onChange={(e) => setCustomTipInput(e.target.value)}
            placeholder="Enter Custom Tip amount"
            className="w-full px-5 py-3 rounded-[30px] border-2 border-[#ECECEC] bg-white text-[16px] text-black text-center focus:outline-none focus:border-black"
            style={{ fontFamily: 'Lato, sans-serif' }}
            autoFocus
          />

          {/* Bill summary */}
          <div className="flex flex-col gap-1 mt-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-black opacity-60" style={{ fontFamily: 'Lato, sans-serif' }}>
                Total Bill
              </span>
              <span className="text-[13px] text-black opacity-60" style={{ fontFamily: 'Lato, sans-serif' }}>
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold text-black" style={{ fontFamily: 'Lato, sans-serif' }}>
                Tip
              </span>
              <span className="text-[20px] font-bold text-black" style={{ fontFamily: 'Lato, sans-serif' }}>
                {formatPrice(parseFloat(customTipInput) || 0)}
              </span>
            </div>
          </div>

          {/* Confirm button */}
          <button
            type="button"
            onClick={handleConfirmCustomTip}
            className="w-full mt-5 py-4 rounded-[30px] bg-black text-white text-[18px] font-bold text-center transition-all active:opacity-90"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            {customTipInput && parseFloat(customTipInput) > 0
              ? `Tip ${formatPrice(parseFloat(customTipInput))}`
              : getTipLabel()
            }
          </button>
        </div>
      </Modal>
    </>
  );
}

/** Read the current tip state from localStorage */
export function getStoredTip(): TipState {
  return getFromStorage<TipState>(STORAGE_KEY) || { percentage: 10, amount: 0 };
}
