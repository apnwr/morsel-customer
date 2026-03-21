'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFromStorage, setInStorage } from '@/mocks/mockStorage';

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
}

export function TipSelector({ subtotal, onTipChange }: TipSelectorProps) {
  const [selectedTip, setSelectedTip] = useState<number>(() => {
    const stored = getFromStorage<TipState>(STORAGE_KEY);
    return stored?.percentage ?? 10;
  });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTip, setCustomTip] = useState('');

  // Calculate the actual tip amount
  const tipAmount = selectedTip === -1
    ? parseFloat(customTip) || 0
    : Math.round(subtotal * (selectedTip / 100) * 100) / 100;

  // Persist tip state and notify parent
  useEffect(() => {
    const state: TipState = { percentage: selectedTip, amount: tipAmount };
    setInStorage(STORAGE_KEY, state);
    onTipChange?.(state);
  }, [selectedTip, tipAmount, onTipChange]);

  const handleSelectPreset = useCallback((value: number) => {
    setSelectedTip(value);
    setShowCustomInput(false);
    setCustomTip('');
  }, []);

  return (
    <div className="flex flex-col gap-3 mt-6">
      <div className="flex gap-3 items-start justify-center w-full">
        {TIP_OPTIONS.map((option) => {
          const isSelected = !showCustomInput && selectedTip === option.value;
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
      {!showCustomInput ? (
        <button
          type="button"
          onClick={() => setShowCustomInput(true)}
          className="w-full px-5 py-2 rounded-[30px] border-2 border-[#ECECEC] bg-white text-[16px] font-bold text-black text-center transition-all hover:bg-gray-50"
          style={{ fontFamily: 'Lato, sans-serif' }}
        >
          Custom Tip
        </button>
      ) : (
        <div className="flex items-center gap-2 w-full">
          <input
            type="number"
            min="0"
            step="0.01"
            value={customTip}
            onChange={(e) => setCustomTip(e.target.value)}
            placeholder="Enter tip amount"
            className="flex-1 px-5 py-2 rounded-[30px] border-2 border-black bg-white text-[16px] font-bold text-black text-center focus:outline-none"
            style={{ fontFamily: 'Lato, sans-serif' }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              if (customTip) {
                setSelectedTip(-1);
              }
            }}
            className="px-4 py-2 rounded-[30px] bg-black text-white text-sm font-bold shrink-0"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}

/** Read the current tip state from localStorage */
export function getStoredTip(): TipState {
  return getFromStorage<TipState>(STORAGE_KEY) || { percentage: 10, amount: 0 };
}
