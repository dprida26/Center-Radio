/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00AEEF',
          50: '#E6F8FE',
          100: '#CCF1FD',
          200: '#99E3FB',
          300: '#66D5F9',
          400: '#33C7F7',
          500: '#00AEEF',
          600: '#008BC0',
          700: '#006890',
          800: '#004560',
          900: '#002330',
        },
        graphite: {
          DEFAULT: '#15181D',
          light: '#1E2229',
          dark: '#0B0D10',
        },
        secondary: '#64748b',
        accent: '#F97316',
      },
    },
  },
  plugins: [],
}
