/**
 * Card Component
 * Consistent card styling matching the landing page design.
 * 
 * Variants:
 * - default: Standard card with subtle border
 * - elevated: Card with more prominent shadow
 * - interactive: Card with hover effect
 */
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({ 
  children, 
  className = '',
  variant = 'default',
  padding = 'md'
}: CardProps) {
  const baseClasses = 'bg-white rounded-2xl';
  
  const variantClasses = {
    default: 'shadow-sm border-2 border-slate-100',
    elevated: 'shadow-lg border-2 border-slate-100',
    interactive: 'shadow-sm border-2 border-slate-100 transition-all duration-300 hover:-translate-y-2.5 hover:shadow-[0_24px_48px_rgba(16,42,67,0.12)] cursor-pointer',
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6 lg:p-7',
    lg: 'p-8 lg:p-10',
  };
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

// Subcomponents for structured card layouts
export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-xl lg:text-2xl font-bold text-navy-900 ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-slate-600 leading-relaxed ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-4 pt-4 border-t border-slate-100 ${className}`}>{children}</div>;
}
