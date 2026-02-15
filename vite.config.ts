import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa/icon-192.svg', 'pwa/icon-512.svg', 'pwa/icon-512-maskable.svg'],
      manifest: {
        id: '/',
        name: 'QuizTime Arena',
        short_name: 'QuizTime',
        description: 'QuizTime Arena: quiz estiloso com categorias, niveis e ranking.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#080915',
        theme_color: '#0a1024',
        lang: 'pt-BR',
        icons: [
          {
            src: '/pwa/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/pwa/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: '/pwa/icon-512-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,ico,json}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
