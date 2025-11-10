'use client';

import React from 'react';
import { MenuCategory } from '@/types/menu';

interface MenuNavPopupProps {
  categories: MenuCategory[];
  onSelectCategory: (categoryId: string) => void;
  onClose: () => void;
}

export function MenuNavPopup({ categories, onSelectCategory, onClose }: MenuNavPopupProps) {
  const handleCategoryClick = (categoryId: string) => {
    onSelectCategory(categoryId);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl z-50 p-4 min-w-[280px] max-w-[90vw]">
        <h3 className="font-semibold text-lg mb-3">Jump to Category</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className="w-full text-left px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
