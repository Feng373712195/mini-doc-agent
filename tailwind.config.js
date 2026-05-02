/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/components/**/*.{js,vue,ts}",
    "./app/layouts/**/*.vue",
    "./app/pages/**/*.vue",
    "./app/plugins/**/*.{js,ts}",
    "./app/app.vue",
  ],
  theme: {
    extend: {
      colors: {
        'primary-navy': '#0F172A',
        'secondary-slate': '#64748B',
        'tertiary-sage': '#059669',
        'surface': '#FFFFFF',
        'border-default': '#E2E8F0',
        'border-hover': '#CBD5E1',
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        'text-muted': '#64748B',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(15, 23, 42, 0.03)',
        'DEFAULT': '0 2px 6px rgba(15, 23, 42, 0.05)',
        'md': '0 4px 16px rgba(15, 23, 42, 0.07)',
        'lg': '0 8px 32px rgba(15, 23, 42, 0.10)',
      },
    },
  },
  plugins: [],
}
