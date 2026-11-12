/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D1117',
        surface: '#1C2730',
        'surface-dark': '#080B0F',
        'surface-elevated': '#24323D',
        accent: '#C8AA73',
        'accent-highlight': '#E6D2B0',
        'accent-shadow': '#8C6F34',
        'text-primary': '#F0E9DD',
        'text-secondary': '#AEB8BC',
        'ruby-jewel': '#9B111E',
        'blued-steel': '#1B3F7A',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'gold-subtle': '0 2px 12px rgba(200, 170, 115, 0.15)',
        'gold-medium': '0 4px 20px rgba(200, 170, 115, 0.25)',
        'inner-dark': 'inset 0 2px 6px rgba(0, 0, 0, 0.6)',
      },
      letterSpacing: {
        'extra-wide': '0.2em',
        'ultra-wide': '0.3em',
      },
    },
  },
  plugins: [],
}
