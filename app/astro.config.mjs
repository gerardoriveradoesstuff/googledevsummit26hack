import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import AstroPWA from '@vite-pwa/astro';
import {
  APP_DESCRIPTION,
  APP_NAME_FULL,
  APP_NAME_SHORT,
  BRAND_THEME_COLOR,
} from './src/data/branding.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://demo.ouwap.com',
  server: {
    host: true,
    port: 4323,
  },
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    AstroPWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        id: '/',
        name: APP_NAME_FULL,
        short_name: APP_NAME_SHORT,
        description: APP_DESCRIPTION,
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#E7F3EA',
        theme_color: BRAND_THEME_COLOR,
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: null,
        globPatterns: ['**/*.{js,css,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  output: 'static',
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
  },
});
