import type { Config } from 'tailwindcss'

/**
 * Every colour, radius and shadow here is a CSS variable defined in
 * globals.css. That indirection is what lets an institution restyle the whole
 * product from its own branding settings — the tokens are swapped at runtime,
 * not rebuilt.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--ink-soft) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        butter: 'rgb(var(--butter) / <alpha-value>)',
        blush: 'rgb(var(--blush) / <alpha-value>)',
        lilac: 'rgb(var(--lilac) / <alpha-value>)',
        mint: 'rgb(var(--mint) / <alpha-value>)',
        sky: 'rgb(var(--sky) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.5rem',
        panel: '1.75rem',
        field: '0.875rem',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 24 40 / 0.04), 0 10px 28px -12px rgb(16 24 40 / 0.10)',
        raised: '0 2px 4px rgb(16 24 40 / 0.05), 0 18px 44px -16px rgb(16 24 40 / 0.16)',
        pop: '0 24px 60px -20px rgb(16 24 40 / 0.28)',
      },
      fontSize: {
        display: ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        stat: ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '700' }],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}
export default config
