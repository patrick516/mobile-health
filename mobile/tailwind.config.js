/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AnzathuConnect brand palette
        brand: {
          // Purples
          50: "#FAF5FF",
          100: "#F3E8FF",
          200: "#E9D5FF",
          300: "#D8B4FE",
          400: "#C084FC",
          500: "#A855F7",
          600: "#9333EA",
          700: "#7C3AED", // primary button
          800: "#6D28D9", // primary dark
          900: "#4C1D95", // deep violet bg
          950: "#2D0A5E", // darkest bg
        },
        pink: {
          400: "#F472B6",
          500: "#EC4899", // accent / secondary
          600: "#DB2777",
          700: "#BE185D",
        },
        // Semantic
        primary: "#7C3AED",
        secondary: "#EC4899",
        surface: "#FFFFFF",
        background: "#FAF7FF",
        darkBg: "#3B0764",
      },
      fontFamily: {
        sans: ["System", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};
