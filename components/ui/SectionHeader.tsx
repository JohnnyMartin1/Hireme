/**
 * SectionHeader Component
 * Centered section title with optional subtitle.
 * Matches the landing page section header pattern.
 */
import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  className?: string;
  align?: 'center' | 'left';
}

export default function SectionHeader({ 
  title, 
  subtitle,
  className = '',
  align = 'center'
}: SectionHeaderProps) {
  return (
    <div className={`${align === 'center' ? 'text-center' : 'text-left'} mb-12 lg:mb-14 ${className}`}>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-4 tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className={`text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed ${align === 'center' ? 'max-w-2xl mx-auto' : ''}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
