import { Hono } from 'hono'
import { desc } from 'drizzle-orm'
import type { AdminUser } from '../../shared/auth.ts'
import { requireAuth, requirePermission, type AuthEnv } from '../middleware/auth.ts'
import { db } from '../db/index.ts'
import { user } from '../db/schema.ts'

export const adminRoutes = new Hono<AuthEnv>()

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

  return c.json(users)
})

// GET /api/admin/me — contoh: identitas pemanggil + cara autentikasi (session/jwt)
adminRoutes.get('/me', (c) => c.json(c.get('user')))
