/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
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
