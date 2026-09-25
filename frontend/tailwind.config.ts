import type { Config } from 'tailwindcss';

// Paleta y tipografía tomadas del prototipo interactivo del equipo.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          100: '#fdead9',
          500: '#e2660a',
          700: '#8f3f05',
          900: '#402103',
        },
      },
      fontFamily: {
        heading: ['Archivo', 'system-ui', 'sans-serif'],
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '10px',
      },
    },
  },
  plugins: [],
} satisfies Config;
