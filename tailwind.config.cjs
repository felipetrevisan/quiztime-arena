/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 2px rgba(255,255,255,0.15), 0 0 30px rgba(99, 102, 241, 0.35)',
      },
      fontFamily: {
        display: ['Trebuchet MS', 'Arial Black', 'sans-serif'],
        body: ['Verdana', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
