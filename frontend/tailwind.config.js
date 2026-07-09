/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        calm: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6df',
          300: '#5ceaca',
          400: '#2dd4af',
          500: '#14b896',
          600: '#0d947c',
          700: '#0f7665',
          800: '#115e52',
          900: '#134e44',
          950: '#042f29',
        },
      },
    },
  },
  plugins: [],
};
