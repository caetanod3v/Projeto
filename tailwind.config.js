/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uvv: {
          blue: '#0D234A',
          yellow: '#F2B200',
          light: '#F8FAFC',
          dark: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}
