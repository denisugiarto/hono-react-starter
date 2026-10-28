import { describe, expect, test } from 'bun:test'
import { call, json, readData, readJson } from './helpers.ts'

describe('API dasar', () => {
  test('GET /api/health → ok + database ok', async () => {
    const res = await call('/api/health')
    expect(res.status).toBe(200)
    const envelope = await readJson(res)
    expect(envelope.success).toBe(true)
    const body = envelope.data
    expect(body.status).toBe('ok')
    expect(body.database).toBe('ok')
    expect(typeof body.uptime).toBe('number')
  })

  test('GET /api/hello?name=Budi', async () => {
    const res = await call('/api/hello?name=Budi')
    expect(res.status).toBe(200)
    const envelope = await readJson(res)
    expect(envelope.data.greeting).toBe('Hello, Budi!')
    expect(envelope.message).toBe('Salam untuk Budi')
  })

  test('POST /api/echo mengembalikan body', async () => {
    const res = await call('/api/echo', { method: 'POST', body: json({ a: 1 }) })
    expect(res.status).toBe(201)
    expect(await readData<{ echoed: unknown }>(res)).toEqual({ echoed: { a: 1 } })
  })

  test('POST /api/echo body bukan JSON → 400', async () => {
    const res = await call('/api/echo', { method: 'POST', body: '{nope' })
    expect(res.status).toBe(400)
    const body = await readJson(res)
    expect(body.success).toBe(false)
    expect(body.code).toBe('INVALID_JSON')
    expect(typeof body.message).toBe('string')
  })

  test('endpoint /api tidak dikenal → 404 JSON', async () => {
    const res = await call('/api/tidak-ada')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect((await readJson(res)).code).toBe('NOT_FOUND')
  })

  test('header keamanan & cache terpasang', async () => {
    const res = await call('/api/health')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })

  test('body lebih dari 1 MB → 413', async () => {
    const big = 'x'.repeat(1024 * 1024 + 10)
    const res = await call('/api/echo', { method: 'POST', body: json({ big }) })
    expect(res.status).toBe(413)
  })
})

describe('GET /api/health — DB down', () => {
  test('ping gagal → 503 degraded', async () => {
    const { createApiRoutes } = await import('../../src/server/routes/api.ts')
    const api = createApiRoutes({
      ping: async () => {
        throw new Error('connection refused')
      },
    })
    {
      const res = await api.fetch(new Request('http://localhost/health'))
      expect(res.status).toBe(503)
      const body = (await res.json()) as {
        success: boolean
        code: string
        details: { status: string; database: string }
      }
      expect(body.success).toBe(false)
      expect(body.code).toBe('SERVICE_UNAVAILABLE')
      expect(body.details.status).toBe('degraded')
      expect(body.details.database).toBe('unreachable')
    }
  })

  test('GET /api/hello tanpa name → World', async () => {
    const res = await call('/api/hello')
    expect((await readData(res)).greeting).toBe('Hello, World!')
  })
})
