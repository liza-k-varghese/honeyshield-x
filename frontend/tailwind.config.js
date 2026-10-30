/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#060913',
          card: '#0a1020',
          border: '#142036',
          muted: '#64748b',
          accent: '#00f0ff',
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#22c55e',
        },
        nexus: {
          dark: '#05070e',
          bg: '#060913',
          card: '#0a1020',
          panel: 'rgba(10, 16, 32, 0.85)',
          border: 'rgba(0, 240, 255, 0.16)',
          'border-bright': 'rgba(0, 240, 255, 0.45)',
          cyan: '#00f0ff',
          electric: '#38bdf8',
          purple: '#a855f7',
          'purple-light': '#c084fc',
          magenta: '#e879f9',
          green: '#10b981',
          crimson: '#f43f5e',
          amber: '#f59e0b',
        }
      },
      boxShadow: {
        'nexus-cyan': '0 0 20px -3px rgba(0, 240, 255, 0.15)',
        'nexus-purple': '0 0 20px -3px rgba(168, 85, 247, 0.15)',
        'nexus-glow': '0 0 15px -2px rgba(0, 240, 255, 0.25)',
      }
    },
  },
  plugins: [],
}
