/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f5f0',
          100: '#d9e8d9',
          200: '#b3d1b3',
          300: '#8dba8d',
          400: '#5c9e5c',
          500: '#2d6a4f',
          600: '#245a42',
          700: '#1b4a35',
          800: '#133a28',
          900: '#0a2a1b',
          950: '#051a10',
        },
        gold: {
          50: '#fefaf0',
          100: '#fdf0d0',
          200: '#fbe0a0',
          300: '#f9d071',
          400: '#f0b429',
          500: '#d4960c',
          600: '#b07a09',
          700: '#8c6008',
          800: '#684806',
          900: '#443004',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdf9f0',
          200: '#faf3e0',
          300: '#f7edd0',
        },
        danger: {
          50: '#fef2f2',
          100: '#fce4e4',
          200: '#f9c9c9',
          300: '#f5a3a3',
          400: '#ee6b6b',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        serif: ['Source Serif 4', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Menlo', 'monospace'],
      },
      spacing: {
        sidebar: '220px',
        content: '780px',
      },
      borderRadius: {
        institutional: '3px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        elevated: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
