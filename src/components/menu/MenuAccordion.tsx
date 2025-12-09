'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuCategory, MenuItem } from '@/types/menu';
import { accordionVariants, rotateVariants } from '@/lib/animations';

interface MenuAccordionProps {
  category: MenuCategory;
  items: MenuItem[];
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function MenuAccordion({ 
  category, 
  items, 
  children,
  defaultExpanded = true 
}: MenuAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-6">
      {/* Category Header */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 w-full mb-3 hover:opacity-70 transition-opacity"
        whileTap={{ scale: 0.98 }}
      >
        <motion.span 
          className="text-black font-bold text-xl shrink-0"
          variants={rotateVariants}
          animate={isExpanded ? 'expanded' : 'collapsed'}
        >
          ›
        </motion.span>
        <span className="font-semibold text-lg">
          {category.name} ({items.length})
        </span>
      </motion.button>

      {/* Category Items */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            variants={accordionVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
