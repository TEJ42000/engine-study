import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// The v1 app imports the verified logic core ONLY through '@core'
// (v1-core/index.ts). It never imports from prototype-v0/ or experimental/.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./v1-core/index.ts', import.meta.url)),
    },
  },
})
