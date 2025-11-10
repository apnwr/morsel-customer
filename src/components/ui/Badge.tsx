import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'timer';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  // Variant styles
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    timer: 'bg-gray-100 text-gray-700',
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const combinedClassName = `
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    rounded-full
    font-medium
    inline-flex
    items-center
    justify-center
    gap-1
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return <span className={combinedClassName}>{children}</span>;
};

// Timer Badge - specialized badge for countdown timer
interface TimerBadgeProps {
  time: string;
  isEditable?: boolean;
  isExpired?: boolean;
  className?: string;
}

export const TimerBadge: React.FC<TimerBadgeProps> = ({
  time,
  isEditable = true,
  isExpired = false,
  className = '',
}) => {
  // Determine variant based on state
  let variant: BadgeProps['variant'] = 'success';
  if (isExpired) {
    variant = 'error';
  } else if (!isEditable) {
    variant = 'warning';
  }

  return (
    <Badge variant={variant} size="sm" className={className}>
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{time}</span>
    </Badge>
  );
};
