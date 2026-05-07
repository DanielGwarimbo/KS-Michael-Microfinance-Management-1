/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
    },
  },
  plugins: [],
};
