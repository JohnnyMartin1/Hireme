import React from 'react';

interface HireMeLogoProps {
  variant?: 'full' | 'mark';
  className?: string;
}

export default function HireMeLogo({ 
  variant = 'full', 
  className = '' 
}: HireMeLogoProps) {
  // Use the official asset as source of truth
  const logoSrc = variant === 'mark' ? '/brand/hireme-official-mark.svg' : '/brand/hireme-official.svg';

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
