import { describe, expect, test } from 'bun:test'
import { HTTPException } from 'hono/http-exception'
import { createApp } from '../../src/server/app.ts'
import { Logger, createCapturingSink } from '../../src/server/lib/logger.ts'
import { requireAuth, requireRole } from '../../src/server/middleware/auth.ts'
import { ORIGIN, signUp } from './helpers.ts'

const DIST = 'tests/fixtures/build'

const req = (path: string, init?: RequestInit) => new Request(`${ORIGIN}${path}`, init)

describe('createApp — mode production (static + SPA fallback)', () => {
  const prod = createApp({ isProd: true, distDir: DIST, silent: true })

  test('/ → index.html hasil build, no-cache, HSTS aktif', async () => {
    const res = await prod.fetch(req('/'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(res.headers.get('cache-control')).toBe('no-cache')
    expect(res.headers.get('strict-transport-security')).toContain('max-age=31536000')
    expect(await res.text()).toContain('id="root"')
  })

  test('/index.html juga lewat SPA fallback (no-cache)', async () => {
    const res = await prod.fetch(req('/index.html'))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache')
  })

  test('deep route → index.html (client-side routing)', async () => {
    const res = await prod.fetch(req('/dashboard/settings'))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('id="root"')
  })

  test('/assets/* → immutable 1 tahun', async () => {
    const res = await prod.fetch(req('/assets/app-abc123.js'))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(await res.text()).toContain('fixture asset')
  })

  test('/assets yang tidak ada → 404 JSON, bukan index.html ber-cache immutable', async () => {
    const res = await prod.fetch(req('/assets/missing.js'))
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('cache-control') ?? '').not.toContain('immutable')
  })

  test('file dist lain (favicon) → 200 + cache 1 jam', async () => {
    const res = await prod.fetch(req('/favicon.svg'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
  })

  test('/api/* tetap 404 JSON di production (bukan index.html)', async () => {
    const res = await prod.fetch(req('/api/nope'))
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  test('dist tanpa index.html → 404', async () => {
    const empty = createApp({ isProd: true, distDir: 'tests/fixtures/kosong', silent: true })
    const res = await empty.fetch(req('/'))
    expect(res.status).toBe(404)
  })
})

describe('createApp — mode development (Vite)', () => {
  test('index.html ditransform oleh vite.transformIndexHtml', async () => {
    const dev = createApp({ isProd: false, silent: true })
    const calls: string[] = []
    const vite = {
      transformIndexHtml: async (url: string, html: string) => {
        calls.push(url)
        return html.replace('<head>', '<head><script type="module" src="/@vite/client"></script>')
      },
    }
    const res = await dev.fetch(req('/halaman'), { vite })
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache')
    expect(res.headers.get('strict-transport-security')).toBeNull()
    expect(await res.text()).toContain('/@vite/client')
    expect(calls[0]).toBe(`${ORIGIN}/halaman`)
  })
})

describe('createApp — error handler & middleware role', () => {
  const app = createApp({
    isProd: false,
    silent: true,
    extend: (a) => {
      a.get('/api/__test/boom', () => {
        throw new Error('meledak')
      })
      a.get('/api/__test/teapot', () => {
        throw new HTTPException(418, { message: 'Saya teko' })
      })
      a.get('/api/__test/http-no-msg', () => {
        throw new HTTPException(400)
      })
      a.get('/api/__test/admin-only', requireRole('admin'), (c) => c.json({ ok: true }))
      a.get('/api/__test/chained', requireAuth, requireRole('user', 'admin'), (c) =>
        c.json({ role: c.get('user').role }),
      )
    },
  })

  test('error tak terduga → 500 JSON generik (tanpa stack)', async () => {
    const res = await app.fetch(req('/api/__test/boom'))
    expect(res.status).toBe(500)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toEqual({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan internal',
      details: { requestId: expect.any(String) },
    })
    expect(JSON.stringify(body)).not.toContain('meledak') // pesan internal tidak bocor
  })

  test('HTTPException → status & pesan asli', async () => {
    const res = await app.fetch(req('/api/__test/teapot'))
    expect(res.status).toBe(418)
    expect(((await res.json()) as { message: string }).message).toBe('Saya teko')

    const noMsg = await app.fetch(req('/api/__test/http-no-msg'))
    expect(noMsg.status).toBe(400)
    expect(((await noMsg.json()) as { message: string }).message).toBe('Request error')
  })

  test('requireRole tanpa identitas → 401, role salah → 403, role benar → 200', async () => {
    const anon = await app.fetch(req('/api/__test/admin-only'))
    expect(anon.status).toBe(401)

    const u = await signUp()
    const wrong = await app.fetch(req('/api/__test/admin-only', { headers: { Cookie: u.cookie } }))
    expect(wrong.status).toBe(403)
    expect(((await wrong.json()) as { message: string }).message).toContain('admin')

    const ok = await app.fetch(req('/api/__test/chained', { headers: { Cookie: u.cookie } }))
    expect(ok.status).toBe(200)
    expect(((await ok.json()) as { role: string }).role).toBe('user') // route test mengembalikan JSON mentah
  })
})

describe('createApp — request log & error log (tracing)', () => {
  const { sink, lines } = createCapturingSink()
  const logger = new Logger({ level: 'debug', sink, base: { service: 'test' } })
  const app = createApp({
    logger,
    extend: (a) => {
      a.get('/api/__log/ok', (c) => {
        c.get('log').info('custom event', { foo: 'bar' })
        return c.json({ ok: true })
      })
      a.get('/api/__log/boom', () => {
        throw Object.assign(new Error('db exploded'), { code: '23505', detail: 'dup' })
      })
      a.get('/api/__log/teapot', () => {
        throw new HTTPException(418, { message: 'teko' })
      })
    },
  })
  const last = () => lines[lines.length - 1]!.json()

  test('setiap request → satu baris "request" dengan requestId = header X-Request-Id', async () => {
    lines.length = 0
    const res = await app.fetch(req('/api/__log/ok', { headers: { 'user-agent': 'bun-test' } }))
    expect(res.status).toBe(200)
    const requestId = res.headers.get('x-request-id')
    expect(requestId).toBeTruthy()

    const custom = lines.find((l) => l.json().msg === 'custom event')!.json()
    expect(custom.requestId).toBe(requestId)
    expect(custom.foo).toBe('bar')
    expect(custom.service).toBe('test')

    const row = last()
    expect(row.msg).toBe('request')
    expect(row.level).toBe('info')
    expect(row.requestId).toBe(requestId)
    expect(row.method).toBe('GET')
    expect(row.path).toBe('/api/__log/ok')
    expect(row.status).toBe(200)
    expect(typeof row.durationMs).toBe('number')
    expect(row.ip).toBe('unknown')
    expect(row.userAgent).toBe('bun-test')
  })

  test('500 → log error dengan stack + kode Postgres, requestId sama dengan details.requestId', async () => {
    lines.length = 0
    const res = await app.fetch(req('/api/__log/boom'))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { details: { requestId: string } }

    const errLine = lines.find((l) => l.json().msg === 'unhandled error')!.json()
    expect(errLine.level).toBe('error')
    expect(errLine.requestId).toBe(body.details.requestId)
    expect(errLine.path).toBe('/api/__log/boom')
    const err = errLine.err as { message: string; stack: string; code: string; detail: string }
    expect(err.message).toBe('db exploded')
    expect(err.stack).toContain('db exploded')
    expect(err.code).toBe('23505')
    expect(err.detail).toBe('dup')

    expect(last().msg).toBe('request')
    expect(last().level).toBe('error')
    expect(last().status).toBe(500)
  })

  test('HTTPException → warn "http exception"; 4xx request → warn; userId tercatat saat login', async () => {
    lines.length = 0
    await app.fetch(req('/api/__log/teapot'))
    expect(lines.find((l) => l.json().msg === 'http exception')!.json().status).toBe(418)
    expect(last().level).toBe('warn')

    const u = await signUp()
    lines.length = 0
    await app.fetch(req('/api/notes', { headers: { Cookie: u.cookie, 'x-real-ip': '9.9.9.9' } }))
    expect(last().userId).toBe(u.user.id)
    expect(last().ip).toBe('9.9.9.9')
  })

  test('silent: true → tidak ada log sama sekali', async () => {
    const { sink: s2, lines: l2 } = createCapturingSink()
    const quiet = createApp({ silent: true, logger: new Logger({ sink: s2 }) })
    await quiet.fetch(req('/api/health'))
    expect(l2.length).toBe(0)
  })
})
