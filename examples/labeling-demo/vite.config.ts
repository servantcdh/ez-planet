import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const labelingDist = path.resolve(__dirname, '../../packages/labeling-canvas/dist')
const rootNodeModules = path.resolve(__dirname, '../../node_modules')

function fromRoot(pkg: string) {
  return path.join(rootNodeModules, pkg)
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@servantcdh/ez-planet-labeling/dist/style.css': path.join(labelingDist, 'style.css'),
      '@servantcdh/ez-planet-labeling': path.join(labelingDist, 'index.js'),
      'fabric': path.resolve(__dirname, '../../packages/labeling-canvas/node_modules/fabric'),
      '@erase2d/fabric': fromRoot('@erase2d/fabric'),
      '@tanstack/react-router': fromRoot('@tanstack/react-router'),
      '@tanstack/react-table': fromRoot('@tanstack/react-table'),
      '@tanstack/react-virtual': fromRoot('@tanstack/react-virtual'),
      'zundo': fromRoot('zundo'),
    },
  },
  server: {
    port: 3100,
    open: true,
  },
})
