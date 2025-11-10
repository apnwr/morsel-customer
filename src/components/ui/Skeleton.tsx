'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`bg-gray-200 animate-pulse ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// Skeleton for menu item
export function MenuItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <Skeleton variant="circular" width="64px" height="64px" className="shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" height="20px" width="60%" />
        <Skeleton variant="text" height="16px" width="80%" />
        <Skeleton variant="text" height="16px" width="40%" />
      </div>
      <Skeleton variant="rectangular" width="60px" height="36px" />
    </div>
  );
}

// Skeleton for cart item
export function CartItemSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3">
      <Skeleton variant="circular" width="40px" height="40px" className="shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" height="20px" width="70%" />
        <Skeleton variant="text" height="16px" width="40%" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton variant="rectangular" width="32px" height="32px" />
        <Skeleton variant="text" width="20px" height="20px" />
        <Skeleton variant="rectangular" width="32px" height="32px" />
      </div>
    </div>
  );
}

// Skeleton for category section
export function CategorySkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <Skeleton variant="text" height="24px" width="40%" />
        <Skeleton variant="text" height="20px" width="20px" />
      </div>
      <div className="space-y-3">
        <MenuItemSkeleton />
        <MenuItemSkeleton />
        <MenuItemSkeleton />
      </div>
    </div>
  );
}
