import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { fail, ok } from '../lib/response.ts'

export type ApiOptions = {
  /** Pengecekan kesiapan DB; default `select 1`. Bisa diganti di test. */
  ping?: () => Promise<unknown>
}

const defaultPing = () => db.execute(sql`select 1`)

/**
 * Route API umum (health, contoh hello/echo). `api` di bawah adalah instance
 * runtime; `createApiRoutes()` dipakai test untuk menyimulasikan DB down.
 */
export function createApiRoutes({ ping = defaultPing }: ApiOptions = {}) {
  const api = new Hono()

  /**
   * GET /api/health — liveness + readiness.
   * Mengecek koneksi database; 503 bila DB tidak bisa dihubungi
   * agar load balancer / orchestrator tidak mengarahkan traffic.
   */
  api.get('/health', async (c) => {
    const timestamp = new Date().toISOString()
    try {
      await ping()
      return ok(c, { status: 'ok', database: 'ok', uptime: process.uptime(), timestamp })
    } catch (err) {
      console.error('[health] database unreachable:', err)
      return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Database tidak dapat dihubungi', {
        status: 'degraded',
        database: 'unreachable',
        uptime: process.uptime(),
        timestamp,
      })
    }
  })

  api.get('/hello', (c) => {
    const name = c.req.query('name') ?? 'World'
    return ok(
      c,
      { greeting: `Hello, ${name}!`, from: 'Hono API @ Bun', time: new Date().toISOString() },
      { message: `Salam untuk ${name}` },
    )
  })

  api.post('/echo', async (c) => {
    const body = await c.req.json().catch(() => undefined)
    if (body === undefined) {
      return fail(c, 400, 'INVALID_JSON', 'Body harus JSON valid')
    }
    return ok(c, { echoed: body }, { status: 201 })
  })

  return api
}

export const api = createApiRoutes()
