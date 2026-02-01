'use client';

import React from 'react';

interface TruncatedDescriptionProps {
  description: string;
  maxLength?: number;
  className?: string;
}

export function TruncatedDescription({
  description,
  maxLength = 180,
  className = '',
}: TruncatedDescriptionProps) {
  if (!description) return null;

  const needsTruncation = description.length > maxLength;
  const displayText = needsTruncation
    ? description.slice(0, maxLength).trim() + '...'
    : description;

  return (
    <span className={className}>
      {displayText}
    </span>
  );
}
