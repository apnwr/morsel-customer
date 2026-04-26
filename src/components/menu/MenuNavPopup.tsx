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
            // Grouped by menu — black menu name band + pink section pills,
            // mirroring the menu page hierarchy at modal-appropriate scale.
            menusWithSections.map((menu) => (
              <div key={menu.menuId} className="space-y-2">
                {/* Menu name — scoped black band */}
                <div className="px-3 py-2 rounded-md bg-black">
                  <span className="font-bold text-sm text-white">{menu.menuName}</span>
                </div>

                {/* Sections under menu */}
                <div className="space-y-2">
                  {menu.sections.map((section, sectionIndex) => (
                    <motion.button
                      key={section.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: sectionIndex * 0.03 }}
                      onClick={() => handleCategoryClick(section.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#FFE7EC] rounded-[12px] active:bg-[#FFD0DA] active:scale-[0.98] transition-colors"
                    >
                      <span className="font-medium text-sm text-black text-left">
                        {section.name}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#FF2F55]" strokeWidth={2.5} />
                    </motion.button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Fallback: flat categories list — same pink-pill treatment.
            categories?.map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCategoryClick(category.id)}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#FFE7EC] rounded-[12px] active:bg-[#FFD0DA] active:scale-[0.98] transition-colors"
              >
                <span className="font-medium text-black text-left">
                  {category.name}
                </span>
                <ChevronRight className="w-5 h-5 text-[#FF2F55]" strokeWidth={2.5} />
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
