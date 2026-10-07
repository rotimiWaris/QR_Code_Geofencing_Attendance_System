/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {
    fontFamily: { sans: ['Inter','ui-sans-serif','system-ui'], display: ['Manrope','Inter','ui-sans-serif'], mono: ['"IBM Plex Mono"','ui-monospace'] },
    colors: {
      background: { DEFAULT: 'rgb(var(--background) / <alpha-value>)', elevated: 'rgb(var(--surface) / <alpha-value>)', card: 'rgb(var(--surface-raised) / <alpha-value>)' },
      primary: { DEFAULT: 'rgb(var(--primary) / <alpha-value>)', light: 'rgb(var(--primary-light) / <alpha-value>)', dark: 'rgb(var(--primary-dark) / <alpha-value>)' },
      accent: { cyan: 'rgb(var(--cobalt) / <alpha-value>)', violet: 'rgb(var(--terracotta) / <alpha-value>)' },
      success: 'rgb(var(--success) / <alpha-value>)', warning: 'rgb(var(--warning) / <alpha-value>)', danger: 'rgb(var(--danger) / <alpha-value>)', info: 'rgb(var(--cobalt) / <alpha-value>)',
      text: { main: 'rgb(var(--text-main) / <alpha-value>)', muted: 'rgb(var(--text-muted) / <alpha-value>)', dim: 'rgb(var(--text-dim) / <alpha-value>)' },
      glass: { DEFAULT: 'rgb(var(--surface) / <alpha-value>)', light: 'rgb(var(--surface-raised) / <alpha-value>)', border: 'rgb(var(--border) / <alpha-value>)' }
    },
    borderRadius: { '2xl': '.75rem', '3xl': '1rem' },
    boxShadow: { glass: 'var(--shadow-paper)', 'glow-blue': 'var(--shadow-paper)', 'glow-cyan': 'var(--shadow-paper)', 'glow-violet': 'var(--shadow-paper)' },
    animation: { 'spin-slow':'spin 3s linear infinite','pulse-slow':'pulse 3s cubic-bezier(.4,0,.6,1) infinite','bounce-slow':'bounce 2s infinite','fade-in':'fadeIn .24s ease-out','slide-up':'slideUp .24s ease-out','scale-in':'scaleIn .18s ease-out' },
    keyframes: { fadeIn:{'0%':{opacity:'0'},'100%':{opacity:'1'}}, slideUp:{'0%':{opacity:'0',transform:'translateY(8px)'},'100%':{opacity:'1',transform:'translateY(0)'}}, scaleIn:{'0%':{opacity:'0',transform:'scale(.98)'},'100%':{opacity:'1',transform:'scale(1)'}} }
  } }, plugins: []
}
