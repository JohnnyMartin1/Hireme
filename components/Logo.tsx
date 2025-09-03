import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Chat Bubble Icon */}
      <div className={`relative ${sizeClasses[size]} hireme-logo`}>
        {/* Chat bubble background */}
        <div className="absolute inset-0 bg-[var(--hireme-navy)] rounded-lg transform rotate-12"></div>
        
        {/* Chat bubble tail */}
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[var(--hireme-navy)] transform rotate-45"></div>
        
        {/* Person silhouette */}
        <div className="absolute inset-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            {/* Head */}
            <div className="w-2 h-2 bg-[var(--hireme-blue)] rounded-full mb-0.5"></div>
            {/* Body */}
            <div className="w-3 h-2 bg-[var(--hireme-blue)] rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* Text */}
      {showText && (
        <span className={`font-bold text-[var(--hireme-navy)] ${textSizes[size]}`}>
          HireMe
        </span>
      )}
    </div>
  );
}
