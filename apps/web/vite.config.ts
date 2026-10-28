import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Backend (apps/api) berjalan terpisah; saat dev semua /api/* diproxy ke sana
// sehingga frontend tetap same-origin (cookie sesi Better Auth ikut bekerja).
// Origin Vite (http://localhost:5173) dipercaya backend lewat TRUSTED_ORIGINS
// (default dev) — bila port di bawah diubah, sesuaikan TRUSTED_ORIGINS di apps/api/.env.
const API_URL = process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? 3000}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Alias untuk shadcn-ui & import dari folder src.
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT ?? 5173),
    proxy: {
      '/api': { target: API_URL, changeOrigin: false },
    },
  },
})
