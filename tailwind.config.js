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
        os: {
          bg: '#0b0f19',
          card: '#111827',
          border: '#1f2937',
          primary: '#3b82f6',
          accent: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
          muted: '#9ca3af'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
