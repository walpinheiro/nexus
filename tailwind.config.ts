/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      // NEXO aliases resolve directly to Nova Kit semantic tokens. CSS relative
      // colors preserve Tailwind opacity utilities without copying RGB values.
      colors: {
        nexo: {
          canvas: 'rgb(from var(--v-color-bg) r g b / <alpha-value>)',
          surface: 'rgb(from var(--v-color-surface) r g b / <alpha-value>)',
          primary: 'rgb(from var(--v-color-primary) r g b / <alpha-value>)',
          'primary-soft': 'rgb(from var(--v-color-primary-50) r g b / <alpha-value>)',
          'primary-border': 'var(--v-color-primary-200)',
          text: 'rgb(from var(--v-color-text) r g b / <alpha-value>)',
          muted: 'var(--v-color-text-muted)',
          border: 'rgb(from var(--v-color-border) r g b / <alpha-value>)',
          dots: 'var(--v-color-neutral-200)',
          approved: 'var(--v-color-success-strong)',
          'approved-bg': 'rgb(from var(--v-color-success-soft) r g b / <alpha-value>)',
          'approved-border': 'color-mix(in srgb, var(--v-color-success-soft) 65%, var(--v-color-success-strong))',
          draft: 'var(--v-color-neutral-600)',
          'draft-bg': 'var(--v-color-neutral-100)',
          stale: 'var(--v-color-warning-strong)',
          'stale-accent': 'var(--v-color-warning-base)',
          'stale-border': 'var(--v-color-warning-base)',
          'stale-bg': 'rgb(from var(--v-color-warning-soft) r g b / <alpha-value>)',
          'banner-border': 'color-mix(in srgb, var(--v-color-warning-base) 45%, transparent)',
          blocked: 'var(--v-color-error-strong)',
          'blocked-bg': 'rgb(from var(--v-color-error-soft) r g b / <alpha-value>)',
          'blocked-border': 'color-mix(in srgb, var(--v-color-error-soft) 65%, var(--v-color-error-strong))',
          teal: 'var(--v-color-teal-dark)',
          'teal-bg': 'var(--v-color-teal-light)'
        }
      },
      fontFamily: {
        sans: ['var(--v-font-family-sans)']
      },
      borderRadius: {
        card: 'var(--v-radius-12)',
        badge: 'var(--v-radius-8)',
        btn: 'var(--v-radius-8)'
      },
      boxShadow: {
        card: 'var(--v-shadow-sm)',
        'node-selected': '0 0 0 4px color-mix(in srgb, var(--v-color-primary) 12%, transparent)'
      },
      width: {
        sidebar: '232px',
        panel: 'var(--v-inspector-width-default)'
      }
    }
  },
  plugins: []
}
