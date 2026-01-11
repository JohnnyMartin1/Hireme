/**
 * Badge Component
 * Small status indicators and labels.
 * Matches the landing page badge pattern.
 */
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}

export default function Badge({ 
  children, 
  variant = 'primary',
  className = '' 
}: BadgeProps) {
  const variantClasses = {
    primary: 'bg-sky-100 text-navy-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    neutral: 'bg-slate-100 text-slate-700',
  };
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
