/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        nexo: {
          canvas: '#F7F8FB',
          surface: '#FFFFFF',
          primary: '#1D4ED8',
          'primary-soft': '#EFF6FF',
          'primary-border': '#BFDBFE',
          text: '#0F172A',
          muted: '#64748B',
          border: '#E2E8F0',
          dots: '#E5E7EB',
          approved: '#15803D',
          'approved-bg': '#F0FDF4',
          'approved-border': '#BBF7D0',
          draft: '#475569',
          'draft-bg': '#F1F5F9',
          stale: '#B45309',
          'stale-accent': '#D97706',
          'stale-border': '#F59E0B',
          'stale-bg': '#FFFBEB',
          'banner-border': '#FDE68A',
          blocked: '#B91C1C',
          'blocked-bg': '#FEF2F2',
          'blocked-border': '#FECACA',
          teal: '#0F766E',
          'teal-bg': '#F0FDF9'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif']
      },
      borderRadius: {
        card: '12px',
        badge: '8px',
        btn: '6px'
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.06), 0 4px 16px rgb(15 23 42 / 0.06)',
        'node-selected': '0 0 0 4px rgb(29 78 216 / 0.12)'
      },
      width: {
        sidebar: '220px',
        panel: '340px'
      }
    }
  },
  plugins: []
}
