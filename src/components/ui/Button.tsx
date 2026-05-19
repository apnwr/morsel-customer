'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { scaleVariants } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'pill' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
  'aria-label'?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  style = { fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' },
  ...props
}) => {
  // Base styles
  const baseStyles = 'font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

  const variantStyles = {
    primary: 'bg-brand text-white',
    secondary: 'bg-white text-gray-700 border border-gray-200',
    pill: 'rounded-full',
    icon: 'border border-gray-200',
  };

  // Size styles - ensuring minimum 44x44px touch targets
  const sizeStyles = {
    sm: variant === 'icon' ? 'w-11 h-11' : 'px-4 py-2 text-sm min-h-[44px]',
    md: variant === 'icon' ? 'w-11 h-11' : 'px-6 py-3 text-base min-h-[44px]',
    lg: variant === 'icon' ? 'w-12 h-12' : 'px-8 py-4 text-lg min-h-[48px]',
  };

  // Border radius (except for pill and icon which have their own)
  const borderRadius = variant === 'pill' ? 'rounded-full' : variant === 'icon' ? 'rounded-lg' : 'rounded-xl';

  // Width
  const widthStyle = fullWidth ? 'w-full' : '';

  const combinedClassName = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    borderRadius,
    widthStyle,
    className
  );

  return (
    <motion.button
      className={combinedClassName}
      disabled={disabled || loading}
      onClick={props.onClick}
      type={props.type}
      aria-label={props['aria-label']}
      variants={scaleVariants}
      initial="initial"
      whileTap="tap"
      whileHover={disabled || loading ? undefined : "hover"}
      style={style}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};
