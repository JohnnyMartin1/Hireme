"use client";
import { useEffect } from 'react';

export default function FontAwesomeFallback() {
  useEffect(() => {
    // Check if FontAwesome is loaded
    const checkFontAwesome = () => {
      const testElement = document.createElement('i');
      testElement.className = 'fa-solid fa-check';
      testElement.style.visibility = 'hidden';
      testElement.style.position = 'absolute';
      document.body.appendChild(testElement);
      
      const isLoaded = window.getComputedStyle(testElement, '::before').content !== 'none';
      document.body.removeChild(testElement);
      
      if (!isLoaded) {
        console.warn('FontAwesome failed to load, using fallback icons');
        // Add fallback styles for missing icons
        const style = document.createElement('style');
        style.textContent = `
          .fa-solid::before {
            content: '●';
            font-family: Arial, sans-serif;
            font-weight: bold;
          }
          .fa-user::before { content: '👤'; }
          .fa-building::before { content: '🏢'; }
          .fa-bullseye::before { content: '🎯'; }
          .fa-rocket::before { content: '🚀'; }
          .fa-arrow-left::before { content: '←'; }
          .fa-arrow-right::before { content: '→'; }
          .fa-check-circle::before { content: '✓'; }
          .fa-handshake-angle::before { content: '🤝'; }
          .fa-lightbulb::before { content: '💡'; }
          .fa-hammer::before { content: '🔨'; }
          .fa-feather-pointed::before { content: '✍️'; }
          .fa-comments::before { content: '💬'; }
        `;
        document.head.appendChild(style);
      }
    };

    // Check after a short delay to allow FontAwesome to load
    const timer = setTimeout(checkFontAwesome, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
}
