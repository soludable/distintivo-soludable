/** @type {import('tailwindcss').Config} */
export default {
  corePlugins: { preflight: false },
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta fiel al v6 (manual corporativo Soludable)
        turq: {
          DEFAULT: '#00B8C8',
          bright: '#00D4E6',
          light: '#E0F7FA',
        },
        sun: {
          DEFAULT: '#F5C800',
          bright: '#FFD740',
          light: '#FFFDE7',
        },
        ink: {
          DEFAULT: '#2C2C2C',
          soft: '#555555',
          faint: '#888888',
        },
        surface: {
          DEFAULT: '#F0FAFB',
          card: '#FFFFFF',
          gray: '#F5F5F5',
          gray2: '#EEEEEE',
          gray3: '#BDBDBD',
        },
        ok: '#4CAF50',
        danger: '#E53935',
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        soft: '10px',
      },
    },
  },
  plugins: [],
};
