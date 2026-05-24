/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00f5ff',
          pink: '#ff00aa',
          purple: '#a855f7',
          green: '#39ff14',
        },
        surface: {
          DEFAULT: 'rgba(15, 23, 42, 0.75)',
          light: 'rgba(30, 41, 59, 0.85)',
          card: 'rgba(30, 41, 59, 0.6)',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        body: ['Rajdhani', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 20px rgba(0, 245, 255, 0.4), 0 0 40px rgba(0, 245, 255, 0.1)',
        'neon-pink': '0 0 20px rgba(255, 0, 170, 0.4)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0,245,255,0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0,245,255,0.6)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
