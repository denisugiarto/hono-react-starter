import { Hono } from 'hono'
import { desc } from 'drizzle-orm'
import type { AdminUser } from '../../shared/auth.ts'
import { requireAdmin } from '../middleware/auth.ts'
import { db } from '../db/index.ts'
import { user } from '../db/schema.ts'

export const adminRoutes = new Hono()

// Semua route di bawah wajib role admin (middleware requireAdmin)
adminRoutes.use('*', requireAdmin)

// GET /api/admin/users — daftar semua user
adminRoutes.get('/users', async (c) => {
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
