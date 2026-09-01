import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Deux cibles de build TOTALEMENT séparées :
 *   - défaut       → app de gestion (privée)      → dist/
 *   - --mode shop  → boutique publique ata-tex.be → dist-shop/
 * Aucune des deux ne contient le code de l'autre (points d'entrée distincts).
 */
export default defineConfig(({ mode }) => {
  const isShop = mode === 'shop';

  /** Renomme dist-shop/boutique.html → index.html pour la règle SPA de Netlify. */
  const renameShopEntry = {
    name: 'rename-shop-entry',
    closeBundle() {
      const dir = path.resolve(__dirname, 'dist-shop');
      const src = path.join(dir, 'boutique.html');
      if (fs.existsSync(src)) fs.renameSync(src, path.join(dir, 'index.html'));
    },
  };

  return {
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    build: {
      outDir: isShop ? 'dist-shop' : 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: isShop
          ? path.resolve(__dirname, 'boutique.html')
          : path.resolve(__dirname, 'index.html'),
        output: {
          manualChunks(id) {
            if (id.includes('@zxing')) return 'zxing';
          },
        },
      },
    },
    plugins: [
      react(),
      ...(isShop
        ? [renameShopEntry]
        : [
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
                icons: [
                  { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,svg,woff2}'],
                globIgnores: ['**/zxing*.js'],
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
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
          ]),
    ],
  };
});
