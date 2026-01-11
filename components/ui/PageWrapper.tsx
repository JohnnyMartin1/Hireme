/**
 * PageWrapper Component
 * Provides consistent page background and layout structure.
 * Matches the landing page styling patterns.
 */
import { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
  background?: 'default' | 'light' | 'white' | 'gradient';
}

export default function PageWrapper({ 
  children, 
  className = '',
  background = 'default'
}: PageWrapperProps) {
  const backgroundClasses = {
    default: 'min-h-screen',
    light: 'min-h-screen bg-slate-50',
    white: 'min-h-screen bg-white',
    gradient: 'min-h-screen',
  };
  
  const backgroundStyles = {
    default: { background: 'linear-gradient(180deg, #E6F0FF 0%, #F8FAFC 100%)' },
    light: {},
    white: {},
    gradient: { background: 'linear-gradient(170deg, #F3F7FF 0%, #E6F2FF 40%, #F8FAFC 100%)' },
  };
  
  return (
    <main 
      className={`${backgroundClasses[background]} mobile-safe-top mobile-safe-bottom ${className}`}
      style={backgroundStyles[background]}
    >
      {children}
    </main>
  );
}
