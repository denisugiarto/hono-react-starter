import path from 'node:path'
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
import { withAuthAudit } from './auth-audit.ts'
import { maskSignUpConflict, withSignInLockout } from './auth-guards.ts'
import {
  envIsProd,
  envIsTest,
  readApiDocsEnabled,
  readApiRateLimit,
  readCspEnabled,
  readLogConfig,
  readServeWebDist,
  readTrustProxy,
  type ApiRateLimitConfig,
} from './env.ts'
import { buildCsp, createDocsRoutes } from './openapi.ts'
import { Logger, serializeError } from './lib/logger.ts'
import { errorBody, fail } from './lib/response.ts'
import { requestLog } from './middleware/request-log.ts'
import type { AppEnv } from './types.ts'
import { createApiRateLimiter, withClientIp, type ApiRateLimitOptions } from './middleware/rate-limit.ts'

export type App = Hono<AppEnv>

export type AppOptions = {
  /** Mode production: HSTS aktif dan (bila `serveWeb` tidak diisi) serve `dist/`. Default: NODE_ENV === 'production'. */
  isProd?: boolean
  /**
   * Sajikan hasil build frontend (dist) + SPA fallback dari server ini.
   * Default: `isProd` bila diberikan, selain itu env SERVE_WEB_DIST (true di production).
   */
  serveWeb?: boolean
  /** Folder hasil build frontend. Default: `defaultDistDir()` (apps/web/dist atau WEB_DIST_DIR). */
  distDir?: string
  /** Dokumentasi API (`/api/openapi.json`, `/api/docs`). Default: env API_DOCS_ENABLED (nonaktif di production). */
  docs?: boolean
  /** Percayai header IP dari reverse proxy. Default: env TRUST_PROXY (false). */
  trustProxy?: boolean
  /** Content-Security-Policy untuk halaman SPA & /api/docs. Default: env CSP_ENABLED (true). */
  csp?: boolean
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
 * Folder hasil build frontend (apps/web/dist) yang disajikan di production.
 * Dihitung relatif terhadap file ini (bukan cwd) agar sama di Docker/CI/lokal;
 * override dengan env WEB_DIST_DIR bila frontend di-build ke tempat lain.
 */
export function defaultDistDir(): string {
  return process.env.WEB_DIST_DIR ?? path.resolve(import.meta.dirname, '../../web/dist')
}

/**
 * Bangun aplikasi Hono. `app` (default export di bawah) adalah instance untuk
 * runtime; `createApp()` dipakai test untuk mencoba mode production tanpa
 * mengubah NODE_ENV.
 */
export function createApp(options: AppOptions = {}): App {
  const isProd = options.isProd ?? envIsProd()
  const serveWeb = options.serveWeb ?? options.isProd ?? readServeWebDist()
  const docs = options.docs ?? readApiDocsEnabled()
  const trustProxy = options.trustProxy ?? readTrustProxy()
  const csp = options.csp ?? readCspEnabled()
  const distDir = options.distDir ?? defaultDistDir()
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
  app.use('*', requestLog(logger, { trustProxy })) // satu baris log per request + c.get('log') + c.get('clientIp')

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
  // Dokumentasi: /api/openapi.json (spesifikasi) + /api/docs (UI). Lihat openapi.ts.
  if (docs) app.route('/api', createDocsRoutes({ csp }))
  app.route('/api/notes', notesRoutes)
  app.route('/api/admin', adminRoutes)

  // Better Auth — semua request /api/auth/* di-handle oleh auth. Lapisan dari luar ke dalam:
  //   maskSignUpConflict  → sembunyikan "email sudah terdaftar" (anti-enumerasi)
  //   withAuthAudit       → audit_log (sign-in/out, reset password, 2FA, aksi admin; sukses & gagal)
  //   withSignInLockout   → lockout per akun setelah N password salah
  //   withClientIp        → IP tepercaya diteruskan ke Better Auth lewat satu header internal
  app.on(
    ['POST', 'GET'],
    '/api/auth/*',
    maskSignUpConflict(withAuthAudit(withSignInLockout((req, c) => auth.handler(withClientIp(req, c.get('clientIp')))))),
  )

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
  // Frontend. Production (atau SERVE_WEB_DIST=true untuk E2E/staging lokal):
  // sajikan hasil build apps/web (dist). Asset ber-hash di /assets bersifat
  // immutable → cache agresif; file lain (favicon, dll) cache singkat;
  // index.html tidak di-cache (SPA fallback untuk semua route).
  // Development: frontend dilayani Vite (apps/web) yang memproxy /api ke sini.
  // -------------------------------------------------------------------------
  if (serveWeb) {
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

    // SPA fallback: semua route non-API → index.html (client-side routing /
    // refresh di path manapun tetap berfungsi). index.html jangan di-cache lama.
    // CSP: build Vite tidak punya inline script, jadi `script-src 'self'` cukup;
    // style 'unsafe-inline' dibutuhkan atribut style komponen (Base UI, sonner, QR).
    const spaHeaders: Record<string, string> = { 'Cache-Control': 'no-cache' }
    if (csp) spaHeaders['Content-Security-Policy'] = buildCsp()
    app.get('*', async (c) => {
      const file = Bun.file(`${distDir}/index.html`)
      if (await file.exists()) {
        return c.html(await file.text(), 200, spaHeaders)
      }
      return c.notFound()
    })
  } else {
    app.get('*', (c) =>
      fail(c, 404, 'NOT_FOUND', 'Frontend dilayani Vite saat development (apps/web) — API ada di /api/*'),
    )
  }

  return app
}

export const app = createApp()
