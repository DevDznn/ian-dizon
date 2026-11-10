/** Tailwind config — colours map to CSS custom properties defined in css/styles.css,
 *  so light/dark themes are handled entirely by the variables (no `dark:` variants needed).
 *  Most of the design lives in css/styles.css; Tailwind supplies the reset and spacing utilities. */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--paper) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Archivo', '"Arial Narrow"', 'sans-serif'],
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      maxWidth: { page: '90rem' },
    },
  },
  plugins: [],
};
