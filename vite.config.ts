import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable-512.png',
          'icons/apple-touch-icon.png',
          'icons/favicon-32.png',
          'SVG/favicon.svg',
          'SVG/company-name.svg',
          'images/icon.png',
          'font/The Seasons/*.ttf',
        ],
        manifest: {
          id: '/',
          name: 'Gold Reserve — Kiosk Harga Emas & Promosi',
          short_name: 'Gold Reserve',
          description: 'PWA sistem harga emas semasa (999, 916, 375), kalkulator jualan pantas, dan slaid promosi kaunter jualan.',
          lang: 'ms',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          display_override: ['standalone', 'fullscreen'],
          orientation: 'landscape',
          background_color: '#5d0d0d',
          theme_color: '#5d0d0d',
          categories: ['business', 'finance', 'shopping'],
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/SVG/favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
