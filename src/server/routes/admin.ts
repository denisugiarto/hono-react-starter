import { Hono } from 'hono'
import { desc } from 'drizzle-orm'
import type { AdminUser } from '../../shared/auth.ts'
import { requireAuth, requirePermission } from '../middleware/auth.ts'
import type { AppEnv } from '../types.ts'
import { db } from '../db/index.ts'
import { user } from '../db/schema.ts'
import { ok } from '../lib/response.ts'

export const adminRoutes = new Hono<AppEnv>()

// Semua route admin wajib terautentikasi (sesi atau JWT); permission dicek per route.
adminRoutes.use('*', requireAuth)

// GET /api/admin/users — daftar semua user (permission user:list → hanya admin)
adminRoutes.get('/users', requirePermission({ user: ['list'] }), async (c) => {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))

  // Konversi ke bentuk DTO agar sesuai tipe shared AdminUser
  const users: AdminUser[] = rows.map((r) => ({
    ...r,
    role: r.role === 'admin' || r.role === 'user' ? r.role : null,
    banned: r.banned ?? false,
    createdAt: r.createdAt.toISOString(),
  }))

  return ok(c, users)
})

// GET /api/admin/me — contoh: identitas pemanggil + cara autentikasi (session/jwt)
adminRoutes.get('/me', (c) => ok(c, c.get('user')))
