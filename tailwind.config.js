/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A8A',
          light:   '#3B5DBE',
          pale:    '#EEF2FF',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body:    ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}