/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#dc2638',
          600: '#c91f32',
          700: '#a91528',
          900: '#6f0f1d'
        },
        ink: {
          50: '#f7f7f8',
          100: '#eceef0',
          600: '#4b5563',
          800: '#1f2933',
          900: '#111827'
        }
      },
      boxShadow: {
        soft: '0 12px 35px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
}
