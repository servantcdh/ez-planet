import path from 'node:path'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    dts({ rollupTypes: true }),
    cssInjectedByJsPlugin(),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'fabric',
        '@tanstack/react-router',
        '@tanstack/react-table',
        '@tanstack/react-virtual',
        'zustand',
        'zustand/middleware',
        'zundo',
        'react-router-dom',
        'echarts',
        'echarts-for-react',
      ],
    },
    cssCodeSplit: false,
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: 'lc-[local]-[hash:base64:5]',
    },
  },
})
