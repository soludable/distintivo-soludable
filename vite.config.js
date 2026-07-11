import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/logo-soludable.png', 'assets/logo-doncelproject.png'],
      manifest: {
        name: 'Distintivo Soludable',
        short_name: 'Soludable',
        description:
          'Autoevaluación y acreditación Distintivo Soludable — Fotoprotección y Prevención del Cáncer de Piel',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#F0FAFB',
        theme_color: '#00B8C8',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
});
