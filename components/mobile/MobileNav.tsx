"use client";
import { useEffect, useRef, useState } from "react";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function MobileNav({ isOpen, onClose, children }: MobileNavProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(73);

  // Get header height dynamically
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Don't close if clicking the hamburger button
        if (!target.closest('button[aria-label="Open menu"]')) {
          onClose();
        }
      }
    };

    if (isOpen) {
      // Small delay to prevent immediate close on open
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Full screen to allow clicking outside to close */}
      <div 
        className="fixed inset-0 bg-black/30 z-[100] md:hidden transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
        style={{ 
          top: `${headerHeight}px`,
        }}
      />
      
      {/* Dropdown Menu - Appears below header, half width, auto height */}
      <div 
        ref={menuRef}
        className="fixed right-0 w-1/2 bg-white shadow-lg z-[101] md:hidden transform transition-all duration-200 ease-out border-b border-gray-200"
        style={{
          top: `${headerHeight}px`,
        }}
      >
        {/* Menu Content - Only takes height needed for items */}
        <div className="w-full" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </>
  );
}

