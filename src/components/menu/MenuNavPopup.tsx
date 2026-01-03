'use client';

import React from 'react';
import { MenuCategory } from '@/types/menu';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface MenuNavPopupProps {
  isOpen: boolean;
  categories: MenuCategory[];
  onSelectCategory: (categoryId: string) => void;
  onClose: () => void;
}

export function MenuNavPopup({ isOpen, categories, onSelectCategory, onClose }: MenuNavPopupProps) {
  const handleCategoryClick = (categoryId: string) => {
    onSelectCategory(categoryId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
      {/* Backdrop */}
      <motion.div
        key="menu-nav-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Popup */}
      <motion.div
        key="menu-nav-popup"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white rounded-3xl shadow-2xl z-50 p-6 min-w-[320px] max-w-[90vw] border border-gray-100"
      >
        {/* Header */}
        <div className="mb-4">
          <h3 className="font-bold text-xl text-gray-900">Jump to Section</h3>
          <p className="text-sm text-gray-500 mt-1">Select a section to browse</p>
        </div>

        {/* Categories List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {categories.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleCategoryClick(category.id)}
              className="w-full group flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl hover:from-black hover:to-gray-900 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="font-medium text-gray-900 group-hover:text-white transition-colors">
                {category.name}
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </motion.button>
          ))}
        </div>

        {/* Close hint */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-center text-gray-400">Tap outside to close</p>
        </div>
      </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
