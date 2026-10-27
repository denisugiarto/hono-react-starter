import { app } from './app.ts'
import { client } from './db/index.ts'
import { readPort } from './env.ts'

/**
 * Entry server.
 * - Dev: diimpor @hono/vite-dev-server (pakai `fetch` di bawah).
 * - Prod: `bun src/server/index.ts` — Bun v1.2 otomatis menjalankan server
 *   dari default export `{ port, fetch }`.
 * Definisi app ada di ./app.ts agar bisa diimpor test tanpa membuka port.
 */
export default {
  port: readPort(),
  fetch: app.fetch,
}

// Graceful shutdown: tutup pool koneksi DB saat sinyal terminasi.
// (Hanya saat dieksekusi langsung oleh Bun — di dev via vite-dev-server
// import.meta.main bernilai false.)
if (import.meta.main) {
  console.log(`Server berjalan di http://localhost:${readPort()}`)
  const shutdown = async (signal: string) => {
    console.log(`${signal} diterima, menutup koneksi database...`)
    await client.end({ timeout: 5 }).catch(() => {})
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}
