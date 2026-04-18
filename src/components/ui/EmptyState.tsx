'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = '📦',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-12 px-4 text-center w-full"
      role="status"
      aria-live="polite"
    >
      <div className="text-6xl mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-6 max-w-[280px] px-4 break-words">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-900 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
