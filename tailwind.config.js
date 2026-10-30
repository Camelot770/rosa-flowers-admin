/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper:        '#F4EFE5',
        'paper-2':    '#EEE7D8',
        ink:          '#1A1612',
        'ink-soft':   '#4A4038',
        'ink-line':   '#D8CFBD',
        vermilion:    '#C8421E',
        'vermilion-dark': '#9F3516',
        taupe:        '#8E8172',
        primary:       '#C8421E',
        'primary-light': '#E06A47',
      },
      fontFamily: {
        display:  ['"DM Serif Display"', '"Italiana"', 'Georgia', 'serif'],
        italiana: ['"Italiana"', 'Georgia', 'serif'],
        mono:     ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        body:     ['"DM Sans"', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
