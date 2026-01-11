/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Navy colors - ensure all shades are included
    'bg-navy-50', 'bg-navy-100', 'bg-navy-200', 'bg-navy-300', 'bg-navy-400',
    'bg-navy-500', 'bg-navy-600', 'bg-navy-700', 'bg-navy-800', 'bg-navy-900', 'bg-navy-950',
    'text-navy-50', 'text-navy-100', 'text-navy-200', 'text-navy-300', 'text-navy-400',
    'text-navy-500', 'text-navy-600', 'text-navy-700', 'text-navy-800', 'text-navy-900', 'text-navy-950',
    'border-navy-100', 'border-navy-200', 'border-navy-800',
    'hover:bg-navy-100', 'hover:bg-navy-700', 'hover:text-navy-700', 'hover:text-navy-900',
    // Sky colors
    'bg-sky-50', 'bg-sky-100', 'bg-sky-200', 'bg-sky-300', 'bg-sky-400', 'bg-sky-500',
    'text-sky-300', 'text-sky-500', 'text-sky-600',
    'border-sky-100', 'border-sky-200',
    // Gradient classes
    'from-sky-100', 'from-sky-300', 'from-sky-400', 'to-sky-50', 'to-sky-500', 'via-sky-400',
    'from-navy-500', 'from-navy-600', 'from-navy-800', 'to-navy-600', 'to-navy-900', 'via-white',
    'from-cyan-500', 'to-cyan-500',
  ],
  theme: {
    extend: {
      colors: {
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
          DEFAULT: '#000080',
        },
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
        'light-blue': '#ADD8E6',
        'light-gray': '#D3D3D3',
        'brand-blue': '#2563EB',
        'form-bg': '#F8FAFC',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: "0 6px 24px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
