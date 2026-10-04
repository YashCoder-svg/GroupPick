/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: 'var(--color-paper)',
          dark: '#12110E',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          dark: '#1B1A16',
          subtle: 'var(--color-surface-subtle)',
          subtleDark: '#24221C',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          dark: '#F4F0E6',
          muted: 'var(--color-muted)',
          mutedDark: '#B3AD9F',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          dark: '#B3AD9F',
        },
        tomato: {
          DEFAULT: 'var(--color-tomato)',
          hover: 'var(--color-tomato-hover)',
          tint: 'var(--color-tomato-soft)',
          soft: 'var(--color-tomato-soft)',
          darkTint: '#381C14',
          darkAccent: '#F2542D',
        },
        forest: {
          DEFAULT: 'var(--color-forest)',
          tint: 'var(--color-forest-soft)',
          soft: 'var(--color-forest-soft)',
          dark: '#1F6F54',
          darkTint: '#142820',
        },
        line: {
          DEFAULT: 'var(--color-line)',
          dark: '#2C2A24',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        display: '-0.01em',
      },
      lineHeight: {
        display: '1.08',
        relaxedBody: '1.6',
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(28, 27, 24, 0.06), 0 8px 24px -4px rgba(28, 27, 24, 0.08)',
        card: '0 1px 3px rgba(28, 27, 24, 0.04), 0 6px 16px rgba(28, 27, 24, 0.06)',
      },
      borderRadius: {
        card: '20px',
        btn: '12px',
      },
    },
  },
  plugins: [],
};
