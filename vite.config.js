import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo.svg', 'logo.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'JMT Public Higher Secondary School & College',
          short_name: 'JMT Fee LMS',
          description: 'College Admission, Student Ledger, and Fee Slip Management System',
          theme_color: '#0f172a',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          categories: ['education', 'finance', 'productivity'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Safe financial caching: Supabase live queries always prioritize Network
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                networkTimeoutSeconds: 4,
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets'
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            }
          ]
        }
      })
    ],
    envPrefix: ['VITE_', 'COLLEGE_', 'SUPABASE_'],
    define: {
      'import.meta.env.COLLEGE_NAME': JSON.stringify(env.COLLEGE_NAME || ''),
      'import.meta.env.COLLEGE_PHONE': JSON.stringify(env.COLLEGE_PHONE || ''),
      'import.meta.env.COLLEGE_ADDRESS': JSON.stringify(env.COLLEGE_ADDRESS || ''),
      'import.meta.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || ''),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || '')
    },
    server: {
      port: 3000,
      strictPort: false,
      host: true
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            icons: ['lucide-react']
          }
        }
      }
    }
  };
});
