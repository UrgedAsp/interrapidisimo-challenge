/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1C1917',
        secondary: '#B4654A',
        tertiary: '#C8A97E',
        neutral: '#F9F6F0',
        success: '#3F6B4F',
        error: '#B42318',
      },
      fontFamily: {
        headline: ['"Playfair Display"', 'serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
};
