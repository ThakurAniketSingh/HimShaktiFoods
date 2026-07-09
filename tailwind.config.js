/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Fixed brand colors — identical in light & dark mode ──
        // These are used for solid chrome (Navbar/Footer/hero banners),
        // buttons, and badges that are deliberately always-dark-green or
        // always-amber regardless of theme, so they're plain hex values,
        // not CSS-variable-driven.
        forest:  '#0b2909',
        grove:   '#1c5216',
        sage:    '#3a8032',
        amber:   { DEFAULT: '#cc7908', lt: '#efa030' },
        gold:    '#f5c842',
        wa:      { DEFAULT: '#25d366', dk: '#1aa34a' },

        // ── Adaptive tokens — flip value when the <html> element has
        // the "dark" class (see src/context/ThemeContext.jsx). Defined
        // as CSS variables in index.css so changing them there is the
        // ONLY place the two palettes live.
        mist:    'rgb(var(--color-mist) / <alpha-value>)',
        earth:   'rgb(var(--color-earth) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        heading: 'rgb(var(--color-heading) / <alpha-value>)',
        edge:    'rgb(var(--color-edge) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          2: 'rgb(var(--color-ink-2) / <alpha-value>)',
          3: 'rgb(var(--color-ink-3) / <alpha-value>)',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:  ['"DM Sans"',          'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '20px', xl3: '28px' },
      animation: {
        'fade-up':    'fadeUp 0.55s ease both',
        'fade-up-d1': 'fadeUp 0.55s 0.12s ease both',
        'fade-up-d2': 'fadeUp 0.55s 0.24s ease both',
        'fade-up-d3': 'fadeUp 0.55s 0.36s ease both',
        'fade-in':    'fadeIn 0.3s ease both',
        'float':      'floatY 5.0s 0.0s ease-in-out infinite',
        'float-1':    'floatY 5.2s 0.6s ease-in-out infinite',
        'float-2':    'floatY 4.8s 1.2s ease-in-out infinite',
        'float-3':    'floatY 5.4s 1.8s ease-in-out infinite',
        'modal-in':   'modalIn 0.25s ease both',
        'spin-slow':  'spin 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(22px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        floatY: {
          '0%,100%': { transform: 'translateY(0)'    },
          '50%':     { transform: 'translateY(-10px)' },
        },
        modalIn: {
          from: { opacity: '0', transform: 'scale(0.94) translateY(10px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)'       },
        },
      },
    },
  },
  plugins: [],
}
