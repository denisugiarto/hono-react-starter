import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import devServer from '@hono/vite-dev-server'
import bunAdapter from '@hono/vite-dev-server/bun'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devServer({
      // Entry Hono app. Handler untuk /api/* ada di sini.
      entry: 'src/server/index.ts',
      // Jalankan dev server di atas runtime Bun.
      adapter: bunAdapter(),
      // index.html di-transform manual di src/server/index.ts,
      // jadi kita nonaktifkan injeksi script otomatis.
      injectClientScript: false,
    }),
  ],
  resolve: {
    alias: {
      // Alias untuk shadcn-ui & import dari folder src.
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
  },
})
