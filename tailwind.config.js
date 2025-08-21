/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // From the HireMe logo: navy + blue
        brand: {
          900: "#0B1B2B", // deep navy
          800: "#0E2236",
          700: "#12304D",
          600: "#173E66",
          500: "#1E3A8A", // slate-ish
          400: "#2563EB", // primary blue
          300: "#3B82F6",
          200: "#93C5FD",
        },
      },
      boxShadow: {
        card: "0 6px 20px rgba(0,0,0,0.08)",
      },
      fontFamily: {
        // Uses system font stack (fast). If you want a Google font later, easy to swap.
        sans: ["ui-sans-serif", "system-ui", "Inter", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(1200px 600px at 50% -10%, rgba(37, 99, 235, 0.20), rgba(37, 99, 235, 0) 60%)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
