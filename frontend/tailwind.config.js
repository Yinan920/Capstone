/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — used for UI chrome only (nav, buttons, gradients), never chart marks.
        ink: {
          DEFAULT: '#0C0C12',
          soft: '#16161F',
          muted: '#2A2A38',
        },
        brand: {
          50: '#EFEBFF',
          100: '#DAD0FF',
          200: '#B7A2FF',
          300: '#9573FB',
          400: '#7048F3',
          500: '#4F32E7', // primary indigo
          600: '#3F27C4',
          700: '#331FA0',
        },
        violet: {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        signal: {
          DEFAULT: '#D4FF4F', // lime CTA pop
          soft: '#E7FF9B',
          ink: '#1C2A00',
        },
        surface: {
          DEFAULT: '#F6F5FB',
          card: '#FFFFFF',
          sunken: '#EEECF7',
        },
        // Sentiment / status — aligned with the validated dataviz status palette.
        positive: '#0CA30C',
        neutral: '#898781',
        warning: '#FAB219',
        negative: '#D03B3B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        display: ['clamp(2.75rem, 6vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        hero: ['clamp(2rem, 4vw, 3.5rem)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(12,12,18,0.04), 0 12px 32px -12px rgba(12,12,18,0.12)',
        lift: '0 24px 60px -20px rgba(79,50,231,0.35)',
        glow: '0 0 0 1px rgba(139,92,246,0.25), 0 20px 60px -18px rgba(139,92,246,0.45)',
      },
      backgroundImage: {
        'brand-grad': 'linear-gradient(135deg, #4F32E7 0%, #8B5CF6 50%, #7048F3 100%)',
        'ink-grad': 'linear-gradient(160deg, #0C0C12 0%, #16161F 55%, #241E4A 100%)',
        'signal-grad': 'linear-gradient(120deg, #D4FF4F 0%, #A7F35A 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(208,59,59,0.45)' },
          '100%': { boxShadow: '0 0 0 12px rgba(208,59,59,0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both',
        float: 'float 6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
