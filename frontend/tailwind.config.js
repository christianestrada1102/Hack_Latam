/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#131313',
          raised: '#1c1b1b',
          overlay: '#201f1f',
        },
        border: '#262626',
      },
      borderRadius: {
        card: '6px',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        hacklatam: {
          primary: '#ffc174',
          'primary-focus': '#f59e0b',
          'primary-content': '#131313',
          secondary: '#262626',
          'secondary-focus': '#2e2e2e',
          'secondary-content': '#a3a3a3',
          accent: '#f59e0b',
          'accent-focus': '#d97706',
          'accent-content': '#131313',
          neutral: '#262626',
          'neutral-focus': '#2e2e2e',
          'neutral-content': '#a3a3a3',
          'base-100': '#131313',
          'base-200': '#1c1b1b',
          'base-300': '#201f1f',
          'base-content': '#e5e5e5',
          info: '#38bdf8',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          '--rounded-box': '6px',
          '--rounded-btn': '4px',
          '--rounded-badge': '4px',
          '--tab-radius': '4px',
        },
      },
    ],
    darkTheme: 'hacklatam',
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
}
