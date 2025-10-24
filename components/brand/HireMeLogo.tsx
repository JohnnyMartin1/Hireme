import React from 'react';

interface HireMeLogoProps {
  variant?: 'full' | 'mark';
  className?: string;
}

export default function HireMeLogo({ 
  variant = 'full', 
  className = '' 
}: HireMeLogoProps) {
  // Use the new logo.svg file
  const logoSrc = '/logo.svg';

  return (
    <img
      src={logoSrc}
      alt="HireMe logo"
      className={className}
      role="img"
      aria-label="HireMe logo"
    />
  );
}
