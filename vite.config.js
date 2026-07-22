import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        // Nombre genérico: cada congregación puede pisarlo más adelante
        // cambiando estos campos (o via VITE_APP_NAME si lo agregamos después).
        name: 'CONGRE-JW',
        short_name: 'CONGRE-JW',
        description: 'Programa y asignaciones de la congregación',
        theme_color: '#173d3d',
        background_color: '#173d3d',
        display: 'standalone',
        start_url: '/',
        lang: 'es',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // No cacheamos llamadas a Supabase: siempre queremos datos frescos.
        // Solo cacheamos el shell de la app (JS/CSS/HTML/íconos).
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
