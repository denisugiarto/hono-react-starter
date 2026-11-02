import { Hono } from 'hono'
import { and, desc, eq, like, lt, type SQL } from 'drizzle-orm'
import type { AdminUser } from '@hono-react-starter/shared/auth'
import { auditLogQuerySchema, type AuditLog, type AuditLogList } from '@hono-react-starter/shared/audit'
import { appSettingsUpdateSchema, type AppSettingsView } from '@hono-react-starter/shared/settings'
import { roleCreateSchema, roleUpdateSchema, type RoleView } from '@hono-react-starter/shared/roles'
import { requireAuth, requirePermission } from '../middleware/auth.ts'
import { revalidate } from '../middleware/cache-control.ts'
import type { AppEnv } from '../types.ts'
import { db } from '../db/index.ts'
import { auditLog, user } from '../db/schema.ts'
import { auditFromContext } from '../lib/audit.ts'
import { fail, ok } from '../lib/response.ts'
import { canRequireEmailVerification } from '../lib/settings.ts'
import { envIsProd, readMailConfig } from '../env.ts'
import { settings } from '../settings.ts'
import { roleRegistry } from '../roles.ts'

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

function settingsView(): AppSettingsView {
  const mailProvider = readMailConfig().provider
  return {
    ...settings.current(),
    mailProvider,
    emailVerificationReady: canRequireEmailVerification({ isProd: envIsProd(), mailProvider }),
    ...settings.lastUpdate(),
  }
}

// GET /api/admin/settings — pengaturan runtime + kesiapan infra (permission settings:read)
adminRoutes.get('/settings', requirePermission({ settings: ['read'] }), async (c) => {
  await settings.load()
  return ok(c, settingsView())
})

// PATCH /api/admin/settings — ubah pengaturan runtime (permission settings:update)
adminRoutes.patch('/settings', requirePermission({ settings: ['update'] }), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = appSettingsUpdateSchema.safeParse(body)
  if (!parsed.success) return fail(c, 400, 'VALIDATION_ERROR', 'Data tidak valid', parsed.error.flatten().fieldErrors)

  const mailProvider = readMailConfig().provider
  if (parsed.data.requireEmailVerification && !canRequireEmailVerification({ isProd: envIsProd(), mailProvider })) {
    return fail(
      c,
      409,
      'MAIL_PROVIDER_REQUIRED',
      `Verifikasi email wajib butuh provider email sungguhan di production (MAIL_PROVIDER=resend, sekarang ${mailProvider})`,
    )
  }

  await settings.update(parsed.data, c.get('user').id)
  await auditFromContext(c, { action: 'admin.settings_updated', targetType: 'settings', metadata: { changes: parsed.data } })
  return ok(c, settingsView(), { message: 'Pengaturan disimpan' })
})

// ---------------------------------------------------------------------------
// Role dinamis (tabel app_role) — permission role:*
// ---------------------------------------------------------------------------

async function roleViews(): Promise<RoleView[]> {
  const defs = await roleRegistry.load()
  const counts = await roleRegistry.usersCount()
  return defs
    .map((d) => ({ ...d, usersCount: counts.get(d.name) ?? 0 }))
    .sort((a, b) => Number(b.system) - Number(a.system) || a.name.localeCompare(b.name))
}

// GET /api/admin/roles — semua role + jumlah user (permission role:list)
adminRoutes.get('/roles', requirePermission({ role: ['list'] }), revalidate(), async (c) => ok(c, await roleViews()))

// POST /api/admin/roles — role baru (permission role:create)
adminRoutes.post('/roles', requirePermission({ role: ['create'] }), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = roleCreateSchema.safeParse(body)
  if (!parsed.success) return fail(c, 400, 'VALIDATION_ERROR', 'Data tidak valid', parsed.error.flatten().fieldErrors)
  if (roleRegistry.has(parsed.data.name)) return fail(c, 409, 'ROLE_EXISTS', `Role "${parsed.data.name}" sudah ada`)

  const created = await roleRegistry.create(parsed.data)
  await auditFromContext(c, {
    action: 'admin.role_created',
    targetType: 'role',
    targetId: created.name,
    metadata: { permissions: created.permissions },
  })
  return ok(c, { ...created, usersCount: 0 } satisfies RoleView, { status: 201, message: `Role "${created.name}" dibuat` })
})

// PATCH /api/admin/roles/:name — ubah deskripsi/permission (permission role:update); `admin` terkunci
adminRoutes.patch('/roles/:name', requirePermission({ role: ['update'] }), async (c) => {
  const name = c.req.param('name')
  const existing = roleRegistry.has(name) ? name : null
  if (!existing) return fail(c, 404, 'NOT_FOUND', 'Role tidak ditemukan')
  if (name === 'admin') return fail(c, 403, 'ROLE_LOCKED', 'Role admin tidak bisa diubah')

  const body = await c.req.json().catch(() => null)
  const parsed = roleUpdateSchema.safeParse(body)
  if (!parsed.success) return fail(c, 400, 'VALIDATION_ERROR', 'Data tidak valid', parsed.error.flatten().fieldErrors)

  const updated = await roleRegistry.update(name, parsed.data)
  await auditFromContext(c, {
    action: 'admin.role_updated',
    targetType: 'role',
    targetId: name,
    metadata: { fields: Object.keys(parsed.data), ...(parsed.data.permissions ? { permissions: parsed.data.permissions } : {}) },
  })
  const counts = await roleRegistry.usersCount()
  return ok(c, { ...updated, usersCount: counts.get(name) ?? 0 } satisfies RoleView, { message: 'Role disimpan' })
})

// DELETE /api/admin/roles/:name — hapus role kustom yang tidak dipakai (permission role:delete)
adminRoutes.delete('/roles/:name', requirePermission({ role: ['delete'] }), async (c) => {
  const name = c.req.param('name')
  const def = roleRegistry.definition(name)
  if (!def) return fail(c, 404, 'NOT_FOUND', 'Role tidak ditemukan')
  if (def.system) return fail(c, 403, 'ROLE_LOCKED', 'Role sistem tidak bisa dihapus')
  const inUse = (await roleRegistry.usersCount()).get(name) ?? 0
  if (inUse > 0) return fail(c, 409, 'ROLE_IN_USE', `Role masih dipakai ${inUse} pengguna — pindahkan dulu`, { usersCount: inUse })

  await roleRegistry.delete(name)
  await auditFromContext(c, { action: 'admin.role_deleted', targetType: 'role', targetId: name })
  return ok(c, { name }, { message: `Role "${name}" dihapus` })
})
