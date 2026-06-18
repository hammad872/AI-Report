/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pp: {
          green:    '#1a7a4a',
          greenDark:'#155e3a',
          greenLite:'#f0f7f3',
          greenMid: '#b0ddc5',
          sidebar:  '#0c1f14',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
