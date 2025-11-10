import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

// Predefined color palette for avatars
const avatarColors = [
  'bg-orange-200',
  'bg-blue-200',
  'bg-green-200',
  'bg-purple-200',
  'bg-pink-200',
  'bg-yellow-200',
  'bg-red-200',
  'bg-indigo-200',
  'bg-teal-200',
  'bg-cyan-200',
];

// Get initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Get consistent color for a name
const getColorForName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
};

export const Avatar: React.FC<AvatarProps> = ({
  name = '',
  src,
  size = 'md',
  color,
  className = '',
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  // Determine background color
  const bgColor = color || (name ? getColorForName(name) : 'bg-gray-200');

  // Get initials if no image
  const initials = name ? getInitials(name) : '?';

  const combinedClassName = `
    ${sizeClasses[size]}
    ${bgColor}
    rounded-full
    flex
    items-center
    justify-center
    font-medium
    text-gray-700
    flex-shrink-0
    ${className}
  `.trim().replace(/\s+/g, ' ');

  if (src) {
    return (
      <div className={`${combinedClassName} relative overflow-hidden`}>
        <Image
          src={src}
          alt={name || 'Avatar'}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className={combinedClassName}>
      <span>{initials}</span>
    </div>
  );
};
