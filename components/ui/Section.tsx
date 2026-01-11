/**
 * Section Component
 * Consistent section wrapper with proper padding.
 * Matches the landing page section pattern.
 */
import { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  background?: 'white' | 'light' | 'dark';
}

export default function Section({ 
  children, 
  className = '',
  id,
  background = 'white'
}: SectionProps) {
  const backgroundClasses = {
    white: 'bg-white',
    light: 'bg-slate-50',
    dark: 'bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white',
  };
  
  return (
    <section 
      id={id}
      className={`py-16 lg:py-20 ${backgroundClasses[background]} ${className}`}
    >
      {children}
    </section>
  );
}
