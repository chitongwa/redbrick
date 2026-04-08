/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8edf4',
          100: '#c5d0e3',
          200: '#9bafc9',
          300: '#7190b0',
          400: '#4a6a8f',
          500: '#2a4f77',
          600: '#1E3A5F',
          700: '#182e4c',
          800: '#122339',
          900: '#0c1726',
        },
        brick: {
          50: '#fdeeed',
          100: '#fbd5d0',
          200: '#f5a99e',
          300: '#f0806f',
          400: '#ec6650',
          500: '#E8533A',
          600: '#d04832',
          700: '#b03c2a',
          800: '#8e3022',
          900: '#6c241a',
        },
      },
    },
  },
  plugins: [],
};
