import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep Space & Gold palette
        gold: {
          DEFAULT: '#D4AF37',
          light:   '#F4CF47',
          dim:     '#A07D20',
        },
        space: {
          950: '#05050A',
          900: '#0A0A0F',
          800: '#111118',
          700: '#18181F',
          600: '#21212A',
          500: '#2A2A35',
        },
      },
      backgroundImage: {
        'radial-gold': 'radial-gradient(ellipse at 20% 50%, rgba(212,175,55,0.06) 0%, transparent 60%)',
        'radial-blue': 'radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.05) 0%, transparent 60%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'fade-in':    'fade-in 0.3s ease-out',
        'slide-in':   'slide-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,175,55,0)' },
          '50%':       { boxShadow: '0 0 0 6px rgba(212,175,55,0.15)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
