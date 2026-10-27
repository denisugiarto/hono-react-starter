import { createMiddleware } from 'hono/factory'
import { can, isUserRole, type Permissions, type UserRole } from '../../shared/permissions.ts'
import { jwtPayloadSchema } from '../../shared/auth.ts'
import { auth } from '../auth.ts'
import { fail } from '../lib/response.ts'

/**
 * Identitas pemanggil yang sudah terautentikasi, tersedia via `c.get('user')`.
 * `authMethod` menunjukkan sumbernya: cookie sesi (browser) atau JWT (API client).
 */
export type AuthUser = {
  id: string
  email: string
  name: string
  role: UserRole
  authMethod: 'session' | 'jwt'
}

export type AuthEnv = {
  Variables: {
    user: AuthUser
  }
}

const unauthorized = (c: Parameters<typeof fail>[0]) =>
  fail(c, 401, 'UNAUTHORIZED', 'Harus login (sesi atau Authorization: Bearer <JWT>)')

function readBearer(headers: Headers): string | null {
  const value = headers.get('authorization')
  if (!value || value.slice(0, 7).toLowerCase() !== 'bearer ') return null
  const token = value.slice(7).trim()
  return token || null
}

/** JWT = tiga segmen base64url dipisah titik; session token Better Auth hanya dua. */
function looksLikeJwt(token: string): boolean {
  return token.split('.').length === 3
}

/**
 * Resolusi identitas, urutan:
 * 1. `Authorization: Bearer <JWT>` → verifikasi tanda tangan + iss/aud/exp
 *    terhadap JWKS (stateless, tanpa query sesi).
 * 2. Selain itu → sesi Better Auth (cookie, atau bearer session-token via
 *    plugin bearer).
 */
export async function resolveUser(headers: Headers): Promise<AuthUser | null> {
  const bearerToken = readBearer(headers)

  if (bearerToken && looksLikeJwt(bearerToken)) {
    const { payload } = await auth.api.verifyJWT({ body: { token: bearerToken } })
    if (!payload) return null
    const parsed = jwtPayloadSchema.safeParse(payload)
    if (!parsed.success) return null
    const p = parsed.data
    return { id: p.sub, email: p.email, name: p.name, role: p.role, authMethod: 'jwt' }
  }

  const session = await auth.api.getSession({ headers })
  if (!session) return null
  const role = isUserRole(session.user.role) ? session.user.role : 'user'
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role,
    authMethod: 'session',
  }
}

/**
 * Wajib terautentikasi (sesi cookie ATAU JWT bearer). Menyimpan user di c.get('user').
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const user = await resolveUser(c.req.raw.headers)
  if (!user) return unauthorized(c)
  c.set('user', user)
  await next()
})

/**
 * Wajib memiliki salah satu role yang disebut.
 *   app.get('/x', requireRole('admin'), handler)
 */
export function requireRole(...allowed: UserRole[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get('user') ?? (await resolveUser(c.req.raw.headers))
    if (!user) return unauthorized(c)
    if (!allowed.includes(user.role)) {
      return fail(c, 403, 'FORBIDDEN', `Butuh role ${allowed.join('/')}`)
    }
    c.set('user', user)
    await next()
  })
}

/**
 * Wajib memiliki SEMUA permission yang diminta (lihat src/shared/permissions.ts).
 *   adminRoutes.get('/users', requirePermission({ user: ['list'] }), handler)
 */
export function requirePermission(permissions: Permissions) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get('user') ?? (await resolveUser(c.req.raw.headers))
    if (!user) return unauthorized(c)
    if (!can(user.role, permissions)) {
      return fail(c, 403, 'FORBIDDEN', 'Permission tidak cukup', permissions)
    }
    c.set('user', user)
    await next()
  })
}

/** Wajib login DAN berperan admin. */
export const requireAdmin = requireRole('admin')
