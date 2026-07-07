/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta institucional Attivare (fonte canônica: DESIGN.md)
        brand: {
          // Azul escuro executivo — superfícies de marca (sidebar, capa)
          950: '#0B1E3B',
          900: '#0F2A52',
          800: '#143968',
          700: '#1B4A85',
          600: '#22599E',
          500: '#2C6BB8',
          100: '#E7EEF7',
          50: '#F2F6FB',
        },
        gold: {
          DEFAULT: '#C8A96B',
          soft: '#E4D3AC',
          deep: '#A98A4E',
        },
        ink: {
          DEFAULT: '#13201B',
          muted: '#586660',
          soft: '#7C8A84',
        },
        surface: '#FFFFFF',
        canvas: '#F5F7FA',
        line: '#DDE3E0',
        // Semânticos
        positive: {
          DEFAULT: '#1F7A4D',
          soft: '#E4F3EA',
        },
        danger: {
          DEFAULT: '#B4293B',
          soft: '#FBE7EA',
        },
        warning: {
          DEFAULT: '#B7791F',
          soft: '#FBF1DE',
        },
        info: {
          DEFAULT: '#22599E',
          soft: '#E7EEF7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(11,30,59,0.06)',
        md: '0 4px 12px rgba(11,30,59,0.10)',
        lg: '0 10px 30px rgba(11,30,59,0.12)',
      },
      fontSize: {
        display: ['clamp(1.75rem, 4vw, 2.4rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      },
    },
  },
  plugins: [],
};
