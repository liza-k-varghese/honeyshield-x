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
          bg: '#080D14',
          surface: '#111C29',
          elevated: '#192737',
          card: '#111C29',
          border: '#1E2D3D',
          'border-subtle': 'rgba(255, 255, 255, 0.07)',
          accent: '#00D6C9',
          'accent-hover': '#00BFB3',
          'accent-muted': 'rgba(0, 214, 201, 0.12)',
          text: '#F0F5F8',
          muted: '#94A6B8',
          dim: '#5A6E82',
          critical: '#EF6268',
          'critical-muted': 'rgba(239, 98, 104, 0.12)',
          warning: '#E5B65A',
          'warning-muted': 'rgba(229, 182, 90, 0.12)',
          healthy: '#48C99B',
          'healthy-muted': 'rgba(72, 201, 155, 0.12)',
          high: '#E5B65A',
          medium: '#E5B65A',
          low: '#48C99B',
        },
        nexus: {
          dark: '#080D14',
          bg: '#080D14',
          card: '#111C29',
          panel: 'rgba(17, 28, 41, 0.92)',
          border: '#1E2D3D',
          'border-bright': 'rgba(0, 214, 201, 0.40)',
          cyan: '#00D6C9',
          electric: '#00D6C9',
          purple: '#8B5CF6',
          'purple-light': '#A78BFA',
          magenta: '#EC4899',
          green: '#48C99B',
          crimson: '#EF6268',
          amber: '#E5B65A',
        }
      },
      boxShadow: {
        'soc-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.4)',
        'soc-md': '0 4px 16px -2px rgba(0, 0, 0, 0.5)',
        'soc-lg': '0 12px 32px -4px rgba(0, 0, 0, 0.65)',
        'soc-accent': '0 0 16px -2px rgba(0, 214, 201, 0.18)',
        'nexus-cyan': '0 0 16px -2px rgba(0, 214, 201, 0.18)',
        'nexus-purple': '0 0 16px -2px rgba(139, 92, 246, 0.18)',
        'nexus-glow': '0 0 16px -2px rgba(0, 214, 201, 0.18)',
      }
    },
  },
  plugins: [],
}
