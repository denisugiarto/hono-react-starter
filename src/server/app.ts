import { readFileSync } from 'node:fs'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { bodyLimit } from 'hono/body-limit'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from 'hono/bun'
import { api } from './routes/api.ts'
import { notesRoutes } from './routes/notes.ts'
import { adminRoutes } from './routes/admin.ts'
import { auth } from './auth.ts'
import { envIsProd, envIsTest, readApiRateLimit, readLogConfig, type ApiRateLimitConfig } from './env.ts'
import { Logger, serializeError } from './lib/logger.ts'
import { errorBody, fail } from './lib/response.ts'
import { requestLog } from './middleware/request-log.ts'
import type { AppEnv } from './types.ts'
import { createApiRateLimiter, type ApiRateLimitOptions } from './middleware/rate-limit.ts'

export type App = Hono<AppEnv>

export type AppOptions = {
  /** Mode production: serve `dist/` + HSTS. Default: NODE_ENV === 'production'. */
  isProd?: boolean
  /** Folder hasil build client. Default `./dist`. */
  distDir?: string
  /** Logger. Default dari env (LOG_LEVEL / LOG_FORMAT; lihat lib/logger.ts). */
  logger?: Logger
  /** Matikan semua log (setara logger level 'silent'). Default: NODE_ENV === 'test'. */
  silent?: boolean
  /**
   * Rate limit /api/* per IP. Default dari env (API_RATE_LIMIT_MAX / _WINDOW);
   * `false` menonaktifkan. Lihat middleware/rate-limit.ts.
   */
  rateLimit?: (ApiRateLimitConfig & Pick<ApiRateLimitOptions, 'store' | 'skip'>) | false
  /**
   * Hook untuk mendaftarkan route tambahan SETELAH API bawaan dan SEBELUM
   * catch-all (404 API / static / SPA fallback). Dipakai test untuk
   * menyuntik route khusus.
   */
  extend?: (app: App) => void
}

/**
 * Bangun aplikasi Hono. `app` (default export di bawah) adalah instance untuk
 * runtime; `createApp()` dipakai test untuk mencoba mode production tanpa
 * mengubah NODE_ENV.
 */
export function createApp(options: AppOptions = {}): App {
  const isProd = options.isProd ?? envIsProd()
  const distDir = options.distDir ?? './dist'
  const silent = options.silent ?? (options.logger ? false : envIsTest())
  const logger = silent
    ? new Logger({ level: 'silent' })
    : (options.logger ?? new Logger({ ...readLogConfig(), base: { service: 'hono-react-starter' } }))
  const rateLimit = options.rateLimit ?? readApiRateLimit()

  const app: App = new Hono<AppEnv>()

  // -------------------------------------------------------------------------
  // Middleware global
  // -------------------------------------------------------------------------
  app.use('*', requestId()) // header X-Request-Id (dipakai log + details.requestId saat 500)
  app.use('*', requestLog(logger)) // satu baris log per request + c.get('log')

  // Header keamanan (X-Frame-Options, nosniff, Referrer-Policy, HSTS di prod, dll).
  // CSP tidak dipasang default agar tidak memblokir HMR Vite — sesuaikan bila perlu.
  app.use(
    '*',
    secureHeaders({
      strictTransportSecurity: isProd ? 'max-age=31536000; includeSubDomains' : false,
      xFrameOptions: 'DENY',
      referrerPolicy: 'strict-origin-when-cross-origin',
    }),
  )

  // Batasi ukuran body request API (default 1 MB) — cegah payload abuse.
  app.use(
    '/api/*',
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: (c) => c.json(errorBody('PAYLOAD_TOO_LARGE', 'Payload terlalu besar (maks 1 MB)'), 413),
    }),
  )

  // Respons API tidak boleh di-cache oleh browser / proxy
  app.use('/api/*', async (c, next) => {
    await next()
    if (!c.res.headers.has('Cache-Control')) {
      c.res.headers.set('Cache-Control', 'no-store')
    }
  })

  // Rate limit per IP untuk API umum (store PostgreSQL, dibagi antar instance).
  // Dipasang SETELAH middleware no-store agar respons 429 juga tidak di-cache.
  // /api/auth/* dilewati karena Better Auth punya limiter sendiri.
  if (rateLimit) app.use('/api/*', createApiRateLimiter(rateLimit))

  // -------------------------------------------------------------------------
  // API
  // -------------------------------------------------------------------------
  app.route('/api', api)
  app.route('/api/notes', notesRoutes)
  app.route('/api/admin', adminRoutes)

  // Better Auth — semua request /api/auth/* di-handle oleh auth
  app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

  options.extend?.(app)

  // Endpoint /api yang tidak dikenal → 404 JSON, bukan index.html
  app.all('/api/*', (c) => fail(c, 404, 'NOT_FOUND', `Endpoint ${c.req.method} ${c.req.path} tidak ada`))

  // Error handler: kembalikan JSON (bukan HTML), jangan bocorkan detail internal.
  // Detail lengkap (stack, cause, kode Postgres) masuk log dengan requestId yang
  // sama dengan yang dikirim ke client (details.requestId) → mudah ditrace.
  app.onError((err, c) => {
    const log = c.get('log') ?? logger
    const context = { method: c.req.method, path: c.req.path, userId: c.get('user')?.id }
    if (err instanceof HTTPException) {
      log.warn('http exception', { ...context, status: err.status, err: serializeError(err) })
      return fail(c, err.status, 'HTTP_ERROR', err.message || 'Request error')
    }
    log.error('unhandled error', { ...context, err: serializeError(err) })
    return fail(c, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan internal', {
      requestId: c.get('requestId'),
    })
  })

  // -------------------------------------------------------------------------
  // Asset hasil build (production). Tidak ada di dev karena Vite yang melayani.
  // Asset ber-hash di /assets bersifat immutable → cache agresif.
  // File lain di dist (favicon, robots.txt, dll) → cache singkat.
  // -------------------------------------------------------------------------
  if (isProd) {
    const serveDist = serveStatic({ root: distDir })
    const noop = async () => {}

    // Asset ber-hash: ada → immutable; tidak ada → 404 (jangan jatuh ke index.html,
    // supaya respons HTML tidak pernah ter-cache sebagai asset).
    app.get('/assets/*', async (c) => {
      const res = await serveDist(c, noop)
      if (res) {
        res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
        return res
      }
      return fail(c, 404, 'NOT_FOUND', 'Asset tidak ditemukan')
    })

    // File lain di dist (favicon, robots.txt, …). `/` dan `/index.html` selalu
    // lewat SPA fallback di bawah agar mendapat Cache-Control: no-cache.
    app.get('*', async (c, next) => {
      if (c.req.path === '/' || c.req.path === '/index.html') return next()
      const res = await serveDist(c, noop)
      if (res) {
        if (!res.headers.has('Cache-Control')) {
          res.headers.set('Cache-Control', 'public, max-age=3600')
        }
        return res
      }
      return next()
    })
  }

  // -------------------------------------------------------------------------
  // SPA fallback: semua route non-API diserahkan ke index.html
  // (agar client-side routing / refresh di path manapun tetap berfungsi).
  // -------------------------------------------------------------------------
  app.get('*', async (c) => {
    // Development: transform index.html lewat Vite (inject /@vite/client + HMR)
    const vite = c.env?.vite
    if (vite) {
      const html = readFileSync('./index.html', 'utf-8')
      const transformed = await vite.transformIndexHtml(c.req.url, html)
      return c.html(transformed, 200, { 'Cache-Control': 'no-cache' })
    }

    // Production: serve hasil build (index.html jangan di-cache lama)
    const file = Bun.file(`${distDir}/index.html`)
    if (await file.exists()) {
      return c.html(await file.text(), 200, { 'Cache-Control': 'no-cache' })
    }
    return c.notFound()
  })

  return app
}

export const app = createApp()
