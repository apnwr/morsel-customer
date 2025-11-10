'use client';

import React, { useState } from 'react';
import { MenuItem as MenuItemType } from '@/types/menu';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/Skeleton';

interface MenuItemProps {
  item: MenuItemType;
  onAdd: (item: MenuItemType) => void;
}

export const MenuItem = React.memo(function MenuItem({ item, onAdd }: MenuItemProps) {
  const [imageLoading, setImageLoading] = useState(true);

  const handleClick = () => {
    onAdd(item);
  };

  return (
    <article 
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
      aria-label={`${item.name}, $${item.price.toFixed(2)}`}
    >
      {/* Food Image */}
      <div className="relative w-16 h-16 shrink-0">
        {imageLoading && (
          <Skeleton variant="circular" className="absolute inset-0" />
        )}
        <Image
          src={item.image}
          alt={`${item.name} dish`}
          fill
          className="rounded-full object-cover"
          sizes="64px"
          onLoad={() => setImageLoading(false)}
        />
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-base truncate">{item.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
        
        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap" role="list" aria-label="Item tags">
            {item.tags.map((tag) => (
              <span
                key={tag}
                role="listitem"
                className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-600 capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <p className="text-sm text-gray-600 mt-1" aria-label={`Price: ${item.price.toFixed(2)} dollars`}>
          ${item.price.toFixed(2)}
        </p>
      </div>

      {/* Add Button */}
      <button
        onClick={handleClick}
        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label={item.isCustomizable ? `Customize ${item.name}` : `Add ${item.name} to cart`}
      >
        {item.isCustomizable ? 'More' : 'Add'}
      </button>
    </article>
  );
});
