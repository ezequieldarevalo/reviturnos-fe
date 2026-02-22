/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#dce9ff',
          500: '#2d5bff',
          700: '#1c40c7',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(31, 57, 117, 0.10)',
      },
    },
  },
  plugins: [],
};
