# Theme System and Animations Guide

This document explains how to use the theme system and animations in the MORSEL Customer App.

## Theme System

### Dynamic Restaurant Theming

The app automatically applies the active restaurant's theme color throughout the UI. The theme color is managed by the `ThemeProvider` component and stored as a CSS variable `--restaurant-theme`.

#### Using Theme Colors in Components

```tsx
// Using utility classes
<div className="restaurant-theme-bg">Background with theme color</div>
<div className="restaurant-theme-text">Text with theme color</div>
<div className="restaurant-theme-border">Border with theme color</div>

// Using with opacity
<div className="restaurant-theme-bg-light">10% opacity background</div>
<div className="restaurant-theme-bg-medium">20% opacity background</div>

// Using in inline styles
<div style={{ backgroundColor: 'var(--restaurant-theme)' }}>Custom element</div>
```

### Design System Styles

#### Button Styles

Pre-built button classes are available:

```tsx
// Primary button (black)
<button className="btn btn-primary">Primary Action</button>

// Secondary button (white with border)
<button className="btn btn-secondary">Secondary Action</button>

// Pill button (toggle style)
<button className="btn btn-pill btn-pill-active">Active</button>
<button className="btn btn-pill btn-pill-inactive">Inactive</button>

// Icon button
<button className="btn btn-icon">
  <Icon />
</button>

// Floating action button
<button className="btn btn-floating">Floating</button>
```

#### Typography Scale

```tsx
<h1 className="text-display">Display Text</h1>
<h2 className="text-heading-1">Heading 1</h2>
<h3 className="text-heading-2">Heading 2</h3>
<h4 className="text-heading-3">Heading 3</h4>
<p className="text-body-lg">Large Body</p>
<p className="text-body">Body Text</p>
<p className="text-body-sm">Small Body</p>
<p className="text-caption">Caption</p>
```

#### Card Styles

```tsx
// Basic card
<div className="card">Card content</div>

// Hoverable card
<div className="card card-hover">Interactive card</div>

// Surface card (gray background)
<div className="card-surface">Surface content</div>
```

#### Input Styles

```tsx
<input className="input" placeholder="Enter text" />
```

#### Avatar Styles

```tsx
<div className="avatar avatar-sm">SM</div>
<div className="avatar avatar-md">MD</div>
<div className="avatar avatar-lg">LG</div>
```

#### Badge Styles

```tsx
<span className="badge badge-green">Success</span>
<span className="badge badge-orange">Warning</span>
<span className="badge badge-red">Error</span>
<span className="badge badge-gray">Neutral</span>
```

## Animations

### Framer Motion Variants

Import animation variants from `@/lib/animations`:

```tsx
import { modalVariants, fadeVariants, scaleVariants } from '@/lib/animations';
import { motion } from 'framer-motion';
```

#### Available Variants

1. **modalVariants** - Bottom sheet slide-up animation
2. **drawerVariants** - Side drawer slide-in animation
3. **accordionVariants** - Expand/collapse animation
4. **fadeVariants** - Simple fade in/out
5. **fadeSlideUpVariants** - Fade with slide up
6. **scaleVariants** - Scale animation for buttons
7. **backdropVariants** - Backdrop fade
8. **staggerContainerVariants** - Stagger children
9. **rotateVariants** - Rotate animation (for chevrons)
10. **slideInLeftVariants** - Slide from left
11. **popVariants** - Pop animation
12. **bounceVariants** - Bounce animation
13. **shakeVariants** - Shake animation (for errors)
14. **pageVariants** - Page transition

#### Usage Examples

**Modal Animation:**
```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      Modal content
    </motion.div>
  )}
</AnimatePresence>
```

**Button Press Animation:**
```tsx
<motion.button
  variants={scaleVariants}
  initial="initial"
  whileTap="tap"
  whileHover="hover"
>
  Click me
</motion.button>
```

**Accordion Animation:**
```tsx
<AnimatePresence>
  {isExpanded && (
    <motion.div
      variants={accordionVariants}
      initial="collapsed"
      animate="expanded"
      exit="collapsed"
    >
      Expandable content
    </motion.div>
  )}
</AnimatePresence>
```

**Page Transition:**
```tsx
import { PageTransition } from '@/components/layout/PageTransition';

export default function MyPage() {
  return (
    <PageTransition>
      <div>Page content</div>
    </PageTransition>
  );
}
```

### CSS Animations

For simpler animations, use CSS animation classes:

```tsx
// Slide animations
<div className="animate-slide-up">Slides up</div>
<div className="animate-slide-in">Slides in from right</div>

// Fade animations
<div className="animate-fade-in">Fades in</div>
<div className="animate-fade-in-up">Fades in with slide up</div>

// Scale animation
<div className="animate-scale-in">Scales in</div>

// Loading animations
<div className="animate-spin">Spinning loader</div>
<div className="animate-pulse">Pulsing element</div>
<div className="animate-bounce">Bouncing element</div>

// Staggered animations with delays
<div className="animate-fade-in animate-delay-100">Delayed 100ms</div>
<div className="animate-fade-in animate-delay-200">Delayed 200ms</div>
<div className="animate-fade-in animate-delay-300">Delayed 300ms</div>
```

### Interactive States

Add interactive states to elements:

```tsx
// Generic interactive element
<div className="interactive">Hover and tap effects</div>

// Focus ring for accessibility
<button className="focus-ring">Accessible button</button>

// Touch target (minimum 44x44px)
<button className="touch-target">Touch-friendly</button>
```

## Best Practices

1. **Use the Button component** instead of raw buttons for consistent animations
2. **Use the Modal component** for all modals to get consistent slide-up animations
3. **Wrap pages with PageTransition** for smooth page transitions
4. **Use AnimatePresence** when conditionally rendering animated components
5. **Apply theme colors** using utility classes rather than hardcoding colors
6. **Use typography classes** for consistent text styling
7. **Add focus-ring class** to interactive elements for accessibility
8. **Ensure touch targets** are at least 44x44px using the touch-target class

## Theme Color Updates

The theme color automatically updates when the restaurant context changes. No manual intervention needed. The `ThemeProvider` component handles this automatically.

## Performance Tips

1. Use CSS animations for simple effects (fade, slide)
2. Use Framer Motion for complex, interactive animations
3. Avoid animating expensive properties (use transform and opacity)
4. Use `AnimatePresence` with `mode="wait"` for sequential animations
5. Memoize animation variants if they're computed dynamically
