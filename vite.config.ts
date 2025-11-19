import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Universal Neurotype Planner',
        short_name: 'NeuroPlanner',
        description: 'Adaptive executive function support tool for neurodivergent users',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react'
            }
            if (id.includes('dnd-kit') || id.includes('@motionone')) {
              return 'vendor-dnd'
            }
            if (id.includes('zustand') || id.includes('@supabase')) {
              return 'vendor-state'
            }
            return 'vendor'
          }

          if (id.includes('src/components/PriorityMatrix') || id.includes('src/stores/useMatrixStore')) {
            return 'priority-matrix'
          }
          if (id.includes('src/features/collaboration')) {
            return 'collaboration'
          }
          if (id.includes('src/features/adaptiveSmart') || id.includes('src/features/visualSensoryTools')) {
            return 'sensory-suite'
          }
          if (id.includes('src/pages/AIAssistant') || id.includes('src/services/ai')) {
            return 'ai-suite'
          }
          if (id.includes('src/components/Routines') || id.includes('src/stores/routine')) {
            return 'routines'
          }

          return undefined
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
})
