/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'glass-bg': 'rgba(255, 255, 255, 0.1)',
        'glass-border': 'rgba(255, 255, 255, 0.2)',
        'brand-primary': '#6366f1',
        'brand-secondary': '#8b5cf6',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
