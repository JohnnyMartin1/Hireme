/**
 * IconBadge Component
 * Rounded icon container with gradient background.
 * Matches the landing page icon badge pattern.
 */
import { ReactNode } from 'react';

interface IconBadgeProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'navy' | 'white';
}

export default function IconBadge({ 
  children, 
  className = '',
  size = 'md',
  variant = 'default'
}: IconBadgeProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  
  const variantClasses = {
    default: 'bg-gradient-to-br from-sky-100 to-sky-50 shadow-sm',
    navy: 'bg-gradient-to-br from-navy-800 to-navy-900 shadow-lg',
    white: 'bg-white shadow-md',
  };
  
  const iconColorClasses = {
    default: 'text-navy-800',
    navy: 'text-white',
    white: 'text-navy-800',
  };
  
  const iconSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };
  
  return (
    <div className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-xl flex items-center justify-center ${className}`}>
      <span className={`${iconColorClasses[variant]} ${iconSizeClasses[size]}`}>
        {children}
      </span>
    </div>
  );
}
