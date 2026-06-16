import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        ink: '#171717',
        muted: '#6b7280',
        line: '#d9dde3',
        canvas: '#f7f8fa'
      }
    }
  },
  plugins: []
} satisfies Config;
