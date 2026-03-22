/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /* ─── Color tokens ─── */
      colors: {
        // Surfaces
        sidebar: '#181818',
        surface: {
          DEFAULT: '#161616',
          secondary: '#1B1B1B',
          tertiary: '#202020',
          warm: '#111111',
          hover: '#242424',
        },
        // Borders
        border: {
          DEFAULT: '#303030',
          light: '#3A3A3A',
          subtle: '#262626',
        },
        // Text
        primary: '#ECECEC',
        secondary: '#BBBBBB',
        muted: '#959595',
        placeholder: '#727272',
        subtle: '#8E8E8E',
        // Accent / semantic
        ink: '#0A0A0A',
        accent: '#008040',
        info: '#3B82F6',
        warning: '#F59E0B',
        danger: '#EF4444',
        // Legacy aliases (kept for backward compat)
        tasklist: '#1B1B1B',
        taskitem: '#242424',
        promptbg: '#1D1D1D',
        userbubble: '#222222',
      },
      /* ─── Typography ─── */
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['"Styrene A Web"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'ui-secondary': ['"Styrene B Thin Trial"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Courier New"', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '20px' }],
        md: ['15px', { lineHeight: '22px' }],
        lg: ['18px', { lineHeight: '26px' }],
        xl: ['22px', { lineHeight: '30px' }],
      },
      /* ─── Spacing ─── */
      spacing: {
        4.5: '18px',
        13: '52px',
        15: '60px',
        18: '72px',
      },
      /* ─── Border radius ─── */
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '18px',
        pill: '9999px',
      },
      /* ─── Box shadows ─── */
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.18)',
        sm: '0 2px 4px rgba(0,0,0,0.2)',
        DEFAULT: '0 2px 8px rgba(0,0,0,0.22)',
        md: '0 4px 12px rgba(0,0,0,0.28)',
        lg: '0 8px 24px rgba(0,0,0,0.34)',
        dropdown: '0 10px 32px rgba(0,0,0,0.45)',
        modal: '0 20px 64px rgba(0,0,0,0.5)',
      },
      /* ─── Transitions ─── */
      transitionDuration: {
        fast: '100ms',
        DEFAULT: '150ms',
        slow: '200ms',
      },
      /* ─── Max width ─── */
      maxWidth: {
        chat: '760px',
        content: '600px',
      },
      /* ─── Keyframes / animations ─── */
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.98) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 100ms ease-out',
        'slide-down': 'slide-down 100ms ease-out',
        'scale-in': 'scale-in 150ms ease-out',
      },
    },
  },
  plugins: [],
};
