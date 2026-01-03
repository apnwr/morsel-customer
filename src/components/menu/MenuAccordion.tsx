'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
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
      {/* Category Header */}
      {showCategoryName && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 w-full mb-4"
        >
          <motion.div
            className="shrink-0 w-5 h-5 relative"
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Image
              src="/icons/Chevron.png"
              alt={isExpanded ? 'Collapse' : 'Expand'}
              fill
              className="object-contain"
            />
          </motion.div>
          <span className="font-bold text-sm">
            {showItemCount ? `${category.name} (${items.length})` : category.name}
          </span>
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
            <div className="space-y-3 pb-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
