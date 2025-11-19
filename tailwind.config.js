/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        neurotype: {
          primary: '#2563eb',
          secondary: '#7c3aed',
          accent: '#06b6d4',
          warm: '#f59e0b',
          cool: '#10b981'
        }
      },
      fontFamily: {
        'dyslexia-friendly': ['OpenDyslexic', 'Comic Sans MS', 'sans-serif'],
        'system': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      },
      fontSize: {
        'accessible-base': '1.125rem',
        'accessible-lg': '1.25rem',
        'accessible-xl': '1.5rem'
      },
      spacing: {
        'touch-target': '44px'
      },
      animation: {
        'reduced-motion': 'none'
      }
    },
  },
  plugins: [],
  // Accessibility-first configuration
  corePlugins: {
    // Keep all core plugins enabled for maximum flexibility
  },
  // Custom utilities for neurotype adaptations
  safelist: [
    'bg-black',
    'text-white',
    'text-lg',
    'text-xl',
    'font-dyslexia-friendly',
    'motion-reduce:animate-none'
  ]
}