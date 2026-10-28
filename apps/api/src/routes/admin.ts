import { Hono } from 'hono'
import { and, desc, eq, like, lt, type SQL } from 'drizzle-orm'
import type { AdminUser } from '@hono-react-starter/shared/auth'
import { auditLogQuerySchema, type AuditLog, type AuditLogList } from '@hono-react-starter/shared/audit'
import { requireAuth, requirePermission } from '../middleware/auth.ts'
import { revalidate } from '../middleware/cache-control.ts'
import type { AppEnv } from '../types.ts'
import { db } from '../db/index.ts'
import { auditLog, user } from '../db/schema.ts'
import { fail, ok } from '../lib/response.ts'

export const adminRoutes = new Hono<AppEnv>()

// Semua route admin wajib terautentikasi (sesi atau JWT); permission dicek per route.
adminRoutes.use('*', requireAuth)

// GET /api/admin/users — daftar semua user (permission user:list → hanya admin)
adminRoutes.get('/users', requirePermission({ user: ['list'] }), revalidate(), async (c) => {
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

// GET /api/admin/audit-logs — audit log terbaru dulu, paginasi cursor (permission audit:list)
//   ?limit=50&cursor=<nextCursor>&action=auth.&actorId=…&success=false
adminRoutes.get('/audit-logs', requirePermission({ audit: ['list'] }), revalidate(), async (c) => {
  const parsed = auditLogQuerySchema.safeParse(c.req.query())
  if (!parsed.success) {
    return fail(c, 400, 'VALIDATION_ERROR', 'Query tidak valid', parsed.error.flatten().fieldErrors)
  }
  const q = parsed.data
  const where: SQL[] = []
  if (q.cursor) where.push(lt(auditLog.at, new Date(q.cursor)))
  if (q.action) where.push(like(auditLog.action, `${q.action.replaceAll('%', '')}%`))
  if (q.actorId) where.push(eq(auditLog.actorId, q.actorId))
  if (q.success !== undefined) where.push(eq(auditLog.success, q.success))

  // Ambil limit+1 untuk tahu apakah masih ada halaman berikutnya
  const rows = await db
    .select()
    .from(auditLog)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(auditLog.at), desc(auditLog.id))
    .limit(q.limit + 1)

  const page = rows.slice(0, q.limit)
  const items: AuditLog[] = page.map((r) => ({ ...r, at: r.at.toISOString(), metadata: r.metadata ?? null }))
  const last = page[page.length - 1]
  const body: AuditLogList = { items, nextCursor: rows.length > q.limit && last ? last.at.toISOString() : null }
  return ok(c, body)
})
