'use client';

import { useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Avatar } from '@/components/ui/Avatar';
import { SplitBill } from '@/types/cart';

interface RunningTabsProps {
  split: SplitBill;
  total: number;
  onSplitClick: () => void;
}

export default function RunningTabs({ split, total, onSplitClick }: RunningTabsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { formatPrice } = useLocale();

  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Running Tabs</h3>
        <button 
          onClick={onSplitClick}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <span>Split evenly</span>
          <span>›</span>
        </button>
      </div>

      {/* Participants List */}
      {isExpanded && (
        <div className="space-y-3">
          {split.participants.map((participant) => {
            const amount = split.shares[participant.id] || 0;
            return (
              <div 
                key={participant.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={participant.name} size="md" />
                  <span className="font-medium">{participant.name}</span>
                </div>
                <span className="font-semibold">{formatPrice(amount)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
