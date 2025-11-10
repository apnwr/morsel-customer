/**
 * Animation variants and utilities for Framer Motion
 * Provides consistent animations across the application
 */

import { Variants } from 'framer-motion';

/**
 * Modal slide-up animation (bottom sheet style)
 * Used for modals that appear from the bottom of the screen
 */
export const modalVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
      mass: 0.5,
    },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * Drawer slide-in animation (from right)
 * Used for side panels and drawers
 */
export const drawerVariants: Variants = {
  hidden: {
    x: '100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * Accordion expand/collapse animation
 * Used for expandable sections like menu categories
 */
export const accordionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
};

/**
 * Fade in animation
 * Used for page transitions and content appearing
 */
export const fadeVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * Fade in with slide up
 * Used for staggered list items
 */
export const fadeSlideUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

/**
 * Scale animation for buttons
 * Used for press/tap feedback
 */
export const scaleVariants: Variants = {
  initial: {
    scale: 1,
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: 'easeInOut',
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

/**
 * Backdrop fade animation
 * Used for modal/drawer backdrops
 */
export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Stagger children animation
 * Used for lists that animate in sequence
 */
export const staggerContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/**
 * Rotate animation for chevrons/arrows
 * Used for accordion indicators
 */
export const rotateVariants: Variants = {
  collapsed: {
    rotate: 0,
    transition: {
      duration: 0.2,
      ease: 'easeInOut',
    },
  },
  expanded: {
    rotate: 90,
    transition: {
      duration: 0.2,
      ease: 'easeInOut',
    },
  },
};

/**
 * Slide in from left
 * Used for navigation transitions
 */
export const slideInLeftVariants: Variants = {
  hidden: {
    x: '-100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Pop animation for notifications/badges
 * Used for attention-grabbing elements
 */
export const popVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 400,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
};

/**
 * Bounce animation
 * Used for success states or playful interactions
 */
export const bounceVariants: Variants = {
  initial: {
    scale: 1,
  },
  bounce: {
    scale: [1, 1.1, 0.9, 1.05, 1],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

/**
 * Shake animation
 * Used for error states or validation feedback
 */
export const shakeVariants: Variants = {
  initial: {
    x: 0,
  },
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
};

/**
 * Page transition variants
 * Used for route changes
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * Spring configuration presets
 */
export const springConfigs = {
  gentle: {
    type: 'spring' as const,
    damping: 25,
    stiffness: 300,
  },
  snappy: {
    type: 'spring' as const,
    damping: 20,
    stiffness: 400,
  },
  bouncy: {
    type: 'spring' as const,
    damping: 15,
    stiffness: 500,
  },
  slow: {
    type: 'spring' as const,
    damping: 30,
    stiffness: 200,
  },
};

/**
 * Easing presets
 */
export const easings = {
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  sharp: [0.4, 0, 0.6, 1],
};
