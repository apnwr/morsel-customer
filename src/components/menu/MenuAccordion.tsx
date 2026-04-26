'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { MenuCategory, MenuItem } from '@/types/menu';
import { accordionVariants } from '@/lib/animations';

interface MenuAccordionProps {
  category: MenuCategory;
  items: MenuItem[];
  children: React.ReactNode;
  defaultExpanded?: boolean;
  showItemCount?: boolean; // Whether to show item count (true for sections, false for menus)
  showCategoryName?: boolean; // Whether to show the category name header (defaults to true)
}

export function MenuAccordion({
  category,
  items,
  children,
  defaultExpanded = true,
  showItemCount = true,
  showCategoryName = true
}: MenuAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div>
      {/* Category Header — full-bleed brand-tinted band so categories chunk the menu
          visually without competing with item imagery. Full row is the tap target.
          Width is anchored to the viewport (not the parent) via `w-screen` +
          `mx-[calc(50%-50vw)]` so it stays symmetric regardless of any parent
          padding or scrollbar gutter. The page wrapper has `overflow-x-hidden`
          to clip the scrollbar-width slop on desktop browsers. */}
      {showCategoryName && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="flex items-center justify-between w-screen mx-[calc(50%-50vw)] mb-3 px-4 py-3.5 bg-[#FFE7EC] active:bg-[#FFD0DA] transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-lg text-black truncate">
              {category.name}
            </span>
            {showItemCount && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-white/80 text-[#FF2F55] text-xs font-bold">
                {items.length}
              </span>
            )}
          </div>
          <motion.div
            className="shrink-0"
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <ChevronRight className="w-5 h-5 text-[#FF2F55]" strokeWidth={2.5} />
          </motion.div>
        </button>
      )}

      {/* Category Items */}
      <AnimatePresence initial={false}>
        {(showCategoryName ? isExpanded : true) && (
          <motion.div
            variants={accordionVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            <div className="divide-y divide-gray-200">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
