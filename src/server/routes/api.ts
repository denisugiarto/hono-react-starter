import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.ts'

export const api = new Hono()

/**
 * GET /api/health — liveness + readiness.
 * Mengecek koneksi database; 503 bila DB tidak bisa dihubungi
 * agar load balancer / orchestrator tidak mengarahkan traffic.
 */
api.get('/health', async (c) => {
  const timestamp = new Date().toISOString()
  try {
    await db.execute(sql`select 1`)
    return c.json({ status: 'ok', database: 'ok', uptime: process.uptime(), timestamp })
  } catch (err) {
    console.error('[health] database unreachable:', err)
    return c.json(
      { status: 'degraded', database: 'unreachable', uptime: process.uptime(), timestamp },
      503,
    )
  }
})

api.get('/hello', (c) => {
  const name = c.req.query('name') ?? 'World'
  return c.json({
    message: `Hello, ${name}!`,
    from: 'Hono API @ Bun',
    time: new Date().toISOString(),
  })
})

api.post('/echo', async (c) => {
  const body = await c.req.json().catch(() => undefined)
  if (body === undefined) {
    return c.json({ error: 'Body harus JSON valid', code: 'INVALID_JSON' }, 400)
  }
  return c.json({ echoed: body }, 201)
})
