import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ATA-TEX — Gestion',
        short_name: 'ATA-TEX',
        description: 'Gestion des commandes, du stock et des clients — ATA-TEX',
        lang: 'fr',
        theme_color: '#9a5a2c',
        background_color: '#f4efe6',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        // TODO : ajouter pwa-192.png / pwa-512.png générés depuis le logo ATA-TEX
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // V1 : en ligne, optimisé 4G. On met en cache l'app shell et les polices,
        // pas les données métier (toujours fraîches via Supabase).
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api/, /supabase/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
