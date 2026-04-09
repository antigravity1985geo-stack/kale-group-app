import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['pwa-icon.svg', 'robots.txt', 'sitemap.xml'],
        manifest: {
          name: 'Kale Group | Premium Furniture',
          short_name: 'Kale Group',
          description: 'Premium quality furniture and interior design in Georgia.',
          theme_color: '#1a1714',
          background_color: '#1a1714',
          display: 'standalone',
          icons: [
            {
              src: '/pwa-icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    // GEMINI_API_KEY is intentionally NOT exposed to the client.
    // It is only used server-side in /api/ai/* routes.
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
