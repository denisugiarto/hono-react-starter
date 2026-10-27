import { describe, expect, test } from 'bun:test'
import { HTTPException } from 'hono/http-exception'
import { createApp } from '../../src/server/app.ts'
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
    const original = console.error
    const logged: unknown[] = []
    console.error = (...args: unknown[]) => void logged.push(args)
    try {
      const res = await app.fetch(req('/api/__test/boom'))
      expect(res.status).toBe(500)
      const body = (await res.json()) as Record<string, unknown>
      expect(body).toEqual({
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan internal',
        details: { requestId: expect.any(String) },
      })
      expect(logged.length).toBe(1)
    } finally {
      console.error = original
    }
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
