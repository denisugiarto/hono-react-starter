import { app } from './app.ts'
import { client } from './db/index.ts'
import { readLogConfig, readPort } from './env.ts'
import { Logger } from './lib/logger.ts'

const log = new Logger({ ...readLogConfig(), base: { service: 'hono-react-starter' } })

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
  log.info('server started', { port: readPort(), nodeEnv: process.env.NODE_ENV ?? 'development' })

  const shutdown = async (signal: string) => {
    log.info('shutting down', { signal })
    await client.end({ timeout: 5 }).catch(() => {})
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  // Error di luar siklus request (timer, promise lepas) tetap tercatat terstruktur.
  process.on('unhandledRejection', (reason) => log.error('unhandled rejection', { err: reason }))
  process.on('uncaughtException', (err) => {
    log.error('uncaught exception', { err })
    process.exit(1)
  })
}
