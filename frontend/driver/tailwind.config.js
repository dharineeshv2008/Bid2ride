/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0EA5E9',
          hover: '#0284C7',
          light: '#E0F2FE',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          dark: '#111827',
          secondaryDark: '#1F2937',
          card: '#FFFFFF',
          bg: '#F8FAFC',
          border: '#E5E7EB',
          textPrimary: '#111827',
          textSecondary: '#6B7280',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        sky: {
          500: '#0ea5e9',
          600: '#0284c7',
        },
        slate: {
          850: '#151e2e',
          950: '#0b0f17',
        }
      },
      borderRadius: {
        'card': '18px',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'soft-hover': '0 12px 35px rgba(0, 0, 0, 0.08)',
        'emerald-glow': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}

