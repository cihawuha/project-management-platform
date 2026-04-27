import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync, writeFileSync } from 'fs'

function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version',
    apply: 'build',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js')
      try {
        const content = readFileSync(swPath, 'utf-8')
        const updated = content.replace('__BUILD_HASH__', String(Date.now()))
        writeFileSync(swPath, updated, 'utf-8')
      } catch {
        // sw.js may not exist in dist if public dir is empty
      }
    },
  }
}

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/project-management-platform/' : '/',
  plugins: [react(), swVersionPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
