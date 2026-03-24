/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'finexa': '1.25rem',
      },
      boxShadow: {
        'finexa-soft': '0 10px 30px -5px rgba(0, 0, 0, 0.04), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'finexa-hover': '0 20px 40px -10px rgba(0, 0, 0, 0.08), 0 8px 16px -4px rgba(0, 0, 0, 0.04)',
      },
      colors: {
        finexa: {
          primary: '#2563eb',
          accent: '#7c3aed',
          profit: '#22c55e',
          loss: '#ef4444',
          warning: '#facc15',
          bg: '#f8fafc',
          card: '#ffffff',
          text: '#1e293b',
          muted: '#64748b'
        }
      }
    },
  },
  plugins: [],
}
