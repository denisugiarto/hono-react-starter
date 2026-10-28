import { Hono, type Context } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { Logger } from '../lib/logger.ts'
import { fail, ok } from '../lib/response.ts'
import type { AppEnv } from '../types.ts'

export type ApiOptions = {
  /** Pengecekan kesiapan DB; default `select 1`. Bisa diganti di test. */
  ping?: () => Promise<unknown>
}

const defaultPing = () => db.execute(sql`select 1`)
// Fallback bila route dipakai tanpa middleware requestLog (mis. test unit)
const rootLogger = new Logger({ level: 'silent' })

/**
 * Route API umum (health live/ready, contoh hello/echo). `api` di bawah adalah instance
 * runtime; `createApiRoutes()` dipakai test untuk menyimulasikan DB down.
 */
export function createApiRoutes({ ping = defaultPing }: ApiOptions = {}) {
  const api = new Hono<AppEnv>()

  /**
   * GET /api/health/live — liveness: proses hidup & event loop merespons.
   * TANPA cek dependensi, supaya orchestrator tidak me-restart pod hanya karena
   * database sedang down (itu urusan readiness).
   */
  api.get('/health/live', (c) => ok(c, { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }))

  /**
   * GET /api/health/ready — readiness: siap menerima traffic (DB terhubung).
   * 503 bila DB tidak bisa dihubungi agar load balancer menghentikan routing
   * ke instance ini. `/api/health` adalah alias (kompatibilitas).
   */
  const readiness = async (c: Context<AppEnv>) => {
    const timestamp = new Date().toISOString()
    try {
      await ping()
      return ok(c, { status: 'ok', database: 'ok', uptime: process.uptime(), timestamp })
    } catch (err) {
      ;(c.get('log') ?? rootLogger).error('health check: database unreachable', { err })
      return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Database tidak dapat dihubungi', {
        status: 'degraded',
        database: 'unreachable',
        uptime: process.uptime(),
        timestamp,
      })
    }
  }
  api.get('/health/ready', readiness)
  api.get('/health', readiness)

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
