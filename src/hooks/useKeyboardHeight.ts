'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile keyboard visibility and height.
 * Uses the visualViewport API to detect when the keyboard opens/closes.
 * Returns the keyboard height so fixed bottom elements can adjust their position.
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    // Store the initial viewport height (without keyboard)
    let initialHeight = visualViewport.height;

    const handleResize = () => {
      // Calculate the difference between initial height and current height
      // This difference is approximately the keyboard height
      const currentHeight = visualViewport.height;
      const heightDiff = initialHeight - currentHeight;

      // Consider keyboard visible if height difference is significant (> 100px)
      // This helps avoid false positives from address bar changes
      if (heightDiff > 100) {
        setKeyboardHeight(heightDiff);
        setIsKeyboardVisible(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        // Update initial height when keyboard is closed
        // (in case orientation changed)
        initialHeight = currentHeight;
      }
    };

    // Handle scroll to keep fixed elements properly positioned
    const handleScroll = () => {
      // Force a re-check of position when viewport scrolls
      handleResize();
    };

    visualViewport.addEventListener('resize', handleResize);
    visualViewport.addEventListener('scroll', handleScroll);

    // Initial check
    handleResize();

    return () => {
      visualViewport.removeEventListener('resize', handleResize);
      visualViewport.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}

/**
 * CSS variable approach - sets a CSS variable on the document root
 * that can be used in CSS for bottom positioning.
 * Usage in CSS: bottom: calc(0px + var(--keyboard-height, 0px));
 */
export function useKeyboardHeightCSSVar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    let initialHeight = visualViewport.height;

    const updateCSSVar = () => {
      const currentHeight = visualViewport.height;
      const heightDiff = initialHeight - currentHeight;

      if (heightDiff > 100) {
        document.documentElement.style.setProperty('--keyboard-height', `${heightDiff}px`);
      } else {
        document.documentElement.style.setProperty('--keyboard-height', '0px');
        initialHeight = currentHeight;
      }
    };

    visualViewport.addEventListener('resize', updateCSSVar);
    updateCSSVar();

    return () => {
      visualViewport.removeEventListener('resize', updateCSSVar);
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };
  }, []);
}
