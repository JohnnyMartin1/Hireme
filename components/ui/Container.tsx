/**
 * Container Component
 * Provides consistent max-width and padding across pages.
 * Matches the landing page layout pattern.
 */
import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'narrow' | 'default' | 'wide';
}

export default function Container({ 
  children, 
  className = '',
  size = 'default' 
}: ContainerProps) {
  const sizeClasses = {
    narrow: 'max-w-3xl',
    default: 'max-w-6xl',
    wide: 'max-w-7xl',
  };

  return (
    <div className={`${sizeClasses[size]} mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
