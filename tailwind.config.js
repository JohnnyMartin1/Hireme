/** @type {import('tailwindcss').Config} */

/*
 * ==========================================================================
 * HireMe Design System - Tailwind Configuration v2.0
 * ==========================================================================
 * 
 * DESIGN SYSTEM SUMMARY (Extracted from Landing Page)
 * 
 * TYPOGRAPHY:
 * - Hero titles: text-3xl to text-5xl, font-bold, tracking-tight
 * - Section titles: text-3xl to text-5xl, font-bold, tracking-tight  
 * - Card titles: text-xl to text-2xl, font-bold
 * - Body text: text-sm to text-lg, leading-relaxed
 * - Small text: text-sm, font-medium
 * 
 * COLOR SYSTEM:
 * - Navy (Primary): Headings, primary buttons, dark UI elements
 *   - navy-900: Main headings, emphasis
 *   - navy-800: Primary buttons, key interactive elements
 *   - navy-700: Hover states on buttons
 *   - navy-50: Secondary button backgrounds
 * 
 * - Sky (Accent): Highlights, badges, soft backgrounds
 *   - sky-50: Subtle backgrounds, hero areas
 *   - sky-100: Light card backgrounds, hover states
 *   - sky-200: Badges, icon backgrounds
 *   - sky-300/400: Focus rings, accents
 * 
 * - Slate (Neutral): Text, borders, backgrounds
 *   - slate-50: Page backgrounds
 *   - slate-100/200: Borders, dividers
 *   - slate-500/600: Body text, muted text
 * 
 * SPACING:
 * - Section padding: py-16 lg:py-20
 * - Container max-width: max-w-6xl
 * - Container padding: px-4 sm:px-6 lg:px-8
 * - Card padding: p-6 lg:p-7
 * - Grid gaps: gap-5 lg:gap-6
 * 
 * EFFECTS:
 * - Border radius: rounded-lg (buttons), rounded-xl (inputs), rounded-2xl (cards)
 * - Shadows: shadow-sm (cards), shadow-lg (elevated), shadow-xl (hover)
 * - Card hover: translateY(-10px) + shadow-xl
 * - Transitions: duration-200 to duration-300, ease-out
 * - Focus: ring-2 ring-sky-300 ring-offset-2
 * 
 * COMPONENTS:
 * - Primary Button: bg-navy-800 text-white rounded-lg px-7 py-3
 * - Secondary Button: bg-navy-50 text-navy-800 rounded-lg px-5 py-2
 * - Cards: bg-white rounded-2xl border-2 border-slate-100 shadow-sm
 * - Icon badges: bg-gradient-to-br from-sky-100 to-sky-50 rounded-xl
 * - Tables: rounded-2xl border-2 border-slate-100 shadow-xl
 * - Tabs: bg-slate-100 rounded-lg p-1, active: bg-navy-800
 * 
 * ==========================================================================
 */

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Navy color scale - complete
    {
      pattern: /^(bg|text|border|from|to|via|ring)-(navy)-(50|100|200|300|400|500|600|700|800|900|950)$/,
      variants: ['hover', 'focus', 'active', 'group-hover'],
    },
    // Sky color scale - complete
    {
      pattern: /^(bg|text|border|from|to|via|ring)-(sky)-(50|100|200|300|400|500|600|700|800|900)$/,
      variants: ['hover', 'focus', 'active', 'group-hover'],
    },
    // Slate color scale - complete
    {
      pattern: /^(bg|text|border|from|to|via|ring)-(slate)-(50|100|200|300|400|500|600|700|800|900)$/,
      variants: ['hover', 'focus', 'active', 'group-hover'],
    },
    // Legacy brand colors
    'bg-navy', 'text-navy', 'border-navy',
    'bg-light-blue', 'text-light-blue', 'border-light-blue',
    'bg-brand-blue', 'text-brand-blue',
    // Common utility patterns used in landing page
    'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
    'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',
    'backdrop-blur-md', 'backdrop-blur-sm',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors - aligned with design system
        brand: {
          50:  "#eef7ff",
          100: "#d9edff",
          200: "#b6dbff",
          300: "#8cc4ff",
          400: "#5aa6ff",
          500: "#2f86ff",
          600: "#226af2",
          700: "#1d53c2",
          800: "#1c489b",
          900: "#1b3f7c",
        },
        // Navy scale - Primary brand color
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#061523',
          DEFAULT: '#102a43',
        },
        // Sky scale - Accent color (using Tailwind's sky scale)
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Legacy color aliases for backward compatibility
        'light-blue': '#ADD8E6',
        'light-gray': '#D3D3D3',
        'brand-blue': '#2563EB',
        'form-bg': '#F8FAFC',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        // Landing page typography scale
        'hero': ['clamp(1.875rem, 4vw, 3rem)', { lineHeight: '1.1', fontWeight: '700' }],
        'section': ['clamp(1.875rem, 3vw, 3rem)', { lineHeight: '1.2', fontWeight: '700' }],
        'card-title': ['clamp(1.125rem, 2vw, 1.5rem)', { lineHeight: '1.3', fontWeight: '700' }],
      },
      spacing: {
        // Section spacing from landing page
        'section': 'clamp(4rem, 5vw, 5rem)',
      },
      maxWidth: {
        // Container widths
        '6xl': '72rem',
        '7xl': '80rem',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 24px 48px rgba(16, 42, 67, 0.12)',
        'button': '0 4px 6px -1px rgba(16, 42, 67, 0.1)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionTimingFunction: {
        'card': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'slide-left': 'slideLeft 60s linear infinite',
        'slide-right': 'slideRight 120s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
