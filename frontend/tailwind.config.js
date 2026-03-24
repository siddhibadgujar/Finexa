/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
