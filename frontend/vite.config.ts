import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/drishti-icon.svg', 'models/*', 'cactus/*', 'mediapipe/*'],
      manifest: {
        name: 'Drishti AI — दृष्टि',
        short_name: 'Drishti AI',
        description: 'See the path. Hear the world. Offline-capable assistive navigation powered by Cactus Mirage.',
        theme_color: '#0369A1',
        background_color: '#0F172A',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/drishti-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: [
          '**/*.{js,mjs,css,html,svg,json}',
          'cactus/*.{js,wasm}',
          'mediapipe/*.{js,wasm}',
          'models/*.{cact,tflite,json}',
        ],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
});
