import { readFileSync } from 'node:fs'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { bodyLimit } from 'hono/body-limit'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from 'hono/bun'
import type { ViteDevServer } from 'vite'
import { api } from './routes/api.ts'
import { notesRoutes } from './routes/notes.ts'
import { adminRoutes } from './routes/admin.ts'
import { auth } from './auth.ts'
import { envIsProd, envIsTest } from './env.ts'

/**
 * `vite` hanya diisi oleh @hono/vite-dev-server saat development.
 * Di production (bun src/server/index.ts) nilainya undefined.
 */
export type Bindings = {
  vite?: Pick<ViteDevServer, 'transformIndexHtml'>
}

export type App = Hono<{ Bindings: Bindings }>

export type AppOptions = {
  /** Mode production: serve `dist/` + HSTS. Default: NODE_ENV === 'production'. */
  isProd?: boolean
  /** Folder hasil build client. Default `./dist`. */
  distDir?: string
  /** Matikan logger request (default: mati saat NODE_ENV === 'test'). */
  silent?: boolean
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
  const silent = options.silent ?? envIsTest()

  const app: App = new Hono<{ Bindings: Bindings }>()

  // -------------------------------------------------------------------------
  // Middleware global
  // -------------------------------------------------------------------------
  app.use('*', requestId())
  if (!silent) app.use('*', logger())

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
      onError: (c) =>
        c.json({ error: 'Payload terlalu besar', code: 'PAYLOAD_TOO_LARGE' }, 413),
    }),
  )

  // Respons API tidak boleh di-cache oleh browser / proxy
  app.use('/api/*', async (c, next) => {
    await next()
    if (!c.res.headers.has('Cache-Control')) {
      c.res.headers.set('Cache-Control', 'no-store')
    }
  })

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
  app.all('/api/*', (c) => c.json({ error: 'Not Found', code: 'NOT_FOUND' }, 404))

  // Error handler: kembalikan JSON (bukan HTML), jangan bocorkan detail internal
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message || 'Request error', code: 'HTTP_ERROR' }, err.status)
    }
    console.error(`[api] error (request ${c.get('requestId')}):`, err)
    return c.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, 500)
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
      return c.json({ error: 'Not Found', code: 'NOT_FOUND' }, 404)
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
