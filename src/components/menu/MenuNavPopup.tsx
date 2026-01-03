'use client';

import React from 'react';
import { MenuCategory } from '@/types/menu';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface MenuWithSections {
  menuId: string;
  menuName: string;
  sections: MenuCategory[];
}

interface MenuNavPopupProps {
  isOpen: boolean;
  categories?: MenuCategory[]; // Fallback for flat categories
  menusWithSections?: MenuWithSections[]; // Grouped by menu
  onSelectCategory: (categoryId: string) => void;
  onClose: () => void;
}

export function MenuNavPopup({ isOpen, categories, menusWithSections, onSelectCategory, onClose }: MenuNavPopupProps) {
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
        className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white rounded-[12px] shadow-2xl z-50 p-6 min-w-[320px] max-w-[90vw] border border-gray-100"
      >
        {/* Header */}
        <div className="mb-4">
          <h3 className="font-bold text-xl text-gray-900">Browse Menu</h3>
          <p className="text-sm text-gray-500 mt-1">Select a section to jump to</p>
        </div>

        {/* Content */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide">
          {menusWithSections ? (
            // Grouped by menu
            menusWithSections.map((menu) => (
              <div key={menu.menuId} className="space-y-2">
                {/* Menu Header */}
                <div className="px-4 py-3">
                  <span className="font-bold text-base text-gray-900">{menu.menuName}</span>
                </div>

                {/* Sections under menu */}
                <div className="space-y-2 pl-2">
                  {menu.sections.map((section, sectionIndex) => (
                    <motion.button
                      key={section.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: sectionIndex * 0.03 }}
                      onClick={() => handleCategoryClick(section.id)}
                      className="w-full group flex items-center justify-between px-4 py-3 bg-gray-100 rounded-[12px] hover:from-black hover:to-gray-900 transition-all duration-300 hover:shadow-md hover:scale-[1.01] active:scale-[0.98]"
                    >
                      <span className="font-medium text-sm text-gray-900 group-hover:text-white transition-colors">
                        {section.name}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </motion.button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Fallback: Flat categories list
            categories?.map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCategoryClick(category.id)}
                className="w-full group flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-[12px] hover:from-black hover:to-gray-900 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="font-medium text-gray-900 group-hover:text-white transition-colors">
                  {category.name}
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </motion.button>
            ))
          )}
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
