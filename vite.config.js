import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ============================================================================
// KONFIGURASI VITE
// Vite adalah "build tool" yang mengubah kode React kita menjadi file
// HTML/CSS/JS statis yang siap dipasang ke internet (deploy ke Vercel).
//
// Plugin VitePWA secara otomatis:
//   1. Membuat file manifest.json (syarat wajib PWA, PRD §26).
//   2. Membuat service worker (syarat wajib PWA, PRD §26) agar app bisa
//      di-install ke Home Screen dan tetap berfungsi walau sinyal hilang
//      sebentar (cache aset statis).
// ============================================================================

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'YAGUNTILA',
        short_name: 'YAGUNTILA',
        description: 'Ganmet Afif Man - Aplikasi pelaporan penggantian kWh meter',
        theme_color: '#0F4C81',
        background_color: '#F7F9FC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cache semua aset statis agar app tetap bisa dibuka walau
        // sinyal internet lemah di lapangan (hanya tampilan, bukan
        // pengiriman data — pengiriman data tetap butuh internet aktif).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Jangan cache request ke Apps Script — data harus selalu fresh
            urlPattern: ({ url }) => url.href.includes('script.google.com'),
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
