import { createMiddleware } from 'hono/factory'
import type { User } from 'better-auth'
import { auth } from '../auth.ts'

export type AuthEnv = {
  Variables: {
    user: User
  }
}

/**
 * Wajib login. Menyimpan user di c.get('user').
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }
  c.set('user', session.user)
  await next()
})

/**
 * Wajib login DAN berperan admin.
 */
export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }
  if (session.user.role !== 'admin') {
    return c.json({ error: 'Forbidden: butuh role admin', code: 'FORBIDDEN' }, 403)
  }
  c.set('user', session.user)
  await next()
})
