/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        serif: ['"Crimson Pro"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bastion: {
          bg: '#12100e',
          stone: '#1c1917',
          wood: '#26211d',
          leather: '#1f1a16',
          parchment: '#e7dfd3',
          muted: '#a89b8c',
          bronze: '#574c3f',
          iron: '#3a322a',
          gold: '#c59b27',
          goldLight: '#e3c158',
          goldDark: '#785a12',
          crimson: '#8c2222',
        },
      },
    },
  },
  plugins: [],
};
