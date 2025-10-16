"use client";
import React from 'react';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white';
  className?: string;
  showText?: boolean;
}

export default function AnimatedLogo({ 
  size = 'md', 
  variant = 'default', 
  className = '', 
  showText = true 
}: AnimatedLogoProps) {
  const sizeConfig = {
    sm: { 
      logoSize: 24, 
      wordmarkSize: 16, 
      glassSize: 18, 
      handleSize: 9, 
      personSize: 9,
      shineSize: 4
    },
    md: { 
      logoSize: 32, 
      wordmarkSize: 24, 
      glassSize: 24, 
      handleSize: 12, 
      personSize: 12,
      shineSize: 6
    },
    lg: { 
      logoSize: 48, 
      wordmarkSize: 32, 
      glassSize: 36, 
      handleSize: 18, 
      personSize: 18,
      shineSize: 8
    },
    xl: { 
      logoSize: 64, 
      wordmarkSize: 40, 
      glassSize: 48, 
      handleSize: 24, 
      personSize: 24,
      shineSize: 10
    }
  };

  const config = sizeConfig[size];
  const isWhite = variant === 'white';
  
  const colors = {
    primary: isWhite ? '#FFFFFF' : '#000080',
    accent: isWhite ? '#FFFFFF' : '#ADD8E6',
    white: '#FFFFFF'
  };

  return (
    <div className={`hireme-logo inline-flex items-center gap-3 cursor-pointer transition-all duration-300 ${className}`}>
      <div className="logo-magnifier relative transition-all duration-300" style={{ width: config.logoSize, height: config.logoSize }}>
        <div 
          className="logo-glass relative rounded-full border-2 transition-all duration-300"
          style={{ 
            width: config.glassSize, 
            height: config.glassSize, 
            borderColor: colors.primary,
            background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(173,216,230,0.1))`
          }}
        >
          <div 
            className="logo-shine absolute rounded-full transition-all duration-300"
            style={{ 
              width: config.shineSize, 
              height: config.shineSize, 
              top: 3, 
              left: 3,
              background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent)',
              opacity: 0.7
            }}
          />
          <div 
            className="logo-person absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
            style={{ width: config.personSize, height: config.personSize }}
          >
            <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path 
                d="M6 2C6.55 2 7 2.45 7 3C7 3.55 6.55 4 6 4C5.45 4 5 3.55 5 3C5 2.45 5.45 2 6 2ZM6 9.5C7.5 9.5 9 8.5 9 7.5V7C9 6.45 8.55 6 8 6H4C3.45 6 3 6.45 3 7V7.5C3 8.5 4.5 9.5 6 9.5Z" 
                fill={colors.primary}
              />
            </svg>
          </div>
        </div>
        <div 
          className="logo-handle absolute rounded-sm transition-all duration-300"
          style={{ 
            width: config.handleSize, 
            height: 3, 
            bottom: -2, 
            right: -2,
            backgroundColor: colors.primary,
            transformOrigin: 'left center',
            transform: 'rotate(45deg)'
          }}
        />
      </div>
      
      {showText && (
        <span 
          className="logo-wordmark font-bold transition-all duration-300"
          style={{ 
            fontSize: config.wordmarkSize, 
            color: colors.primary,
            letterSpacing: '-0.02em'
          }}
        >
          HireMe
        </span>
      )}
      
      <style jsx>{`
        .hireme-logo:hover .logo-magnifier {
          transform: rotate(-6deg) scale(1.03);
        }
        
        .hireme-logo:hover .logo-handle {
          transform: rotate(35deg) translateY(-2px);
        }
        
        .hireme-logo:hover .logo-person {
          transform: translate(-50%, -50%) scale(1.08);
        }
        
        .hireme-logo:hover .logo-shine {
          opacity: 1;
          transform: translate(2px, -2px) scale(1.2);
        }
        
        .hireme-logo:hover .logo-glass {
          box-shadow: 0 0 15px rgba(173, 216, 230, 0.4);
        }
        
        @media (prefers-reduced-motion: reduce) {
          .hireme-logo,
          .logo-magnifier,
          .logo-glass,
          .logo-handle,
          .logo-person,
          .logo-shine {
            transition: none !important;
          }
          
          .hireme-logo:hover .logo-magnifier {
            transform: none;
          }
          
          .hireme-logo:hover .logo-handle {
            transform: rotate(45deg);
          }
          
          .hireme-logo:hover .logo-person {
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}
