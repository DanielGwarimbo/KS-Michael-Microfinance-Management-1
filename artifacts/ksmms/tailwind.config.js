/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Roboto', 'system-ui', 'sans-serif'],
        sans:    ['Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#EEF2F5',
          100: '#D5E2E9',
          200: '#ABCAD5',
          300: '#7AADBF',
          400: '#4D8EA6',
          500: '#2A6E87',
          600: '#1B475B',
          700: '#163D50',
          800: '#113244',
          900: '#0B2333',
          950: '#071827',
        },
        gold: {
          50:  '#FAF5EC',
          100: '#F2E8D0',
          200: '#E4CFA1',
          300: '#D3B270',
          400: '#BB9B62',
          500: '#A07E48',
          600: '#816B3F',
          700: '#6B5633',
        },
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.05)',
        'card-lg': '0 10px 24px -4px rgba(0,0,0,0.10), 0 4px 10px -3px rgba(0,0,0,0.06)',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(1.5rem)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(-0.25rem)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.25s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':        'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
