import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'vite-prerender',
      closeBundle: async ({ dir }) => {
        // Only run in production builds
        if (process.env.NODE_ENV === 'production') {
          try {
            console.log('🚀 Starting prerendering...')
            const distDir = resolve(dir)
            // Run the standalone prerender script
            execSync('node prerender.js', { cwd: distDir, stdio: 'inherit' })
            console.log('✅ Prerendering completed')
          } catch (error) {
            console.error('❌ Prerendering failed:', error.message)
            // Exit with error to stop the build process
            process.exit(1)
          }
        }
      }
    }
  ],
  server: {
    host: true,
    port: 5173,
  }
})