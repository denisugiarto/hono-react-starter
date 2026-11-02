/**
 * Role dinamis: CRUD /api/admin/roles, /api/me/permissions, dan efek runtime pada
 * middleware requirePermission + plugin admin Better Auth (objek roles dimutasi di tempat).
 */
import { afterAll, afterEach, describe, expect, test } from 'bun:test'
import { desc, eq, inArray } from 'drizzle-orm'
import { db, type Db } from '../src/db/index.ts'
import { appRole, auditLog, session, user } from '../src/db/schema.ts'
import { RoleRegistry } from '../src/lib/roles.ts'
import { roleRegistry } from '../src/roles.ts'
import { call, json, readData, readJson, signUp } from './helpers.ts'

async function asAdmin() {
  const u = await signUp({ name: 'Admin Roles' })
  await db.update(user).set({ role: 'admin' }).where(eq(user.id, u.user.id))
  return u
}
const post = (cookie: string, body: unknown) => call('/api/admin/roles', { method: 'POST', cookie, body: typeof body === 'string' ? body : json(body) })
const patch = (cookie: string, name: string, body: unknown) => call(`/api/admin/roles/${name}`, { method: 'PATCH', cookie, body: json(body) })
const del = (cookie: string, name: string) => call(`/api/admin/roles/${name}`, { method: 'DELETE', cookie })

const cleanup = async () => {
  await db.update(user).set({ role: 'user' }).where(inArray(user.role, ['viewer', 'editor', 'temp']))
  await db.delete(appRole).where(eq(appRole.system, false))
  roleRegistry.invalidate()
}
afterEach(cleanup)
afterAll(cleanup)

describe('GET/POST/PATCH/DELETE /api/admin/roles', () => {
  test('tanpa sesi → 401; user biasa → 403', async () => {
    expect((await call('/api/admin/roles')).status).toBe(401)
    const u = await signUp()
    expect((await call('/api/admin/roles', { cookie: u.cookie })).status).toBe(403)
    expect((await post(u.cookie, { name: 'x', permissions: {} })).status).toBe(403)
  })

  test('daftar awal: role sistem admin (penuh, terkunci) & user, dengan jumlah pengguna', async () => {
    const admin = await asAdmin()
    const roles = await readData(await call('/api/admin/roles', { cookie: admin.cookie }))
    const names = roles.map((r: { name: string }) => r.name)
    expect(names.slice(0, 2)).toEqual(['admin', 'user'])
    const adminRole = roles.find((r: { name: string }) => r.name === 'admin')
    expect(adminRole.system).toBe(true)
    expect(adminRole.permissions.user).not.toContain('impersonate')
    expect(adminRole.permissions.role).toEqual(['list', 'create', 'update', 'delete'])
    expect(adminRole.usersCount).toBeGreaterThanOrEqual(1)
  })

  test('validasi: nama tidak valid / permission di luar katalog / impersonasi / body bukan JSON → 400; duplikat → 409', async () => {
    const admin = await asAdmin()
    expect((await post(admin.cookie, '{rusak')).status).toBe(400)
    expect((await post(admin.cookie, { name: 'Viewer!', permissions: {} })).status).toBe(400)
    expect((await post(admin.cookie, { name: 'viewer', permissions: { note: ['fly'] } })).status).toBe(400)
    expect((await post(admin.cookie, { name: 'viewer', permissions: { user: ['impersonate'] } })).status).toBe(400)
    expect((await post(admin.cookie, { name: 'viewer', permissions: { bukan: ['x'] } })).status).toBe(400)
    const dup = await post(admin.cookie, { name: 'user', permissions: {} })
    expect(dup.status).toBe(409)
    expect((await readJson(dup)).code).toBe('ROLE_EXISTS')
  })

  test('buat → 201 + audit; ubah → audit; admin terkunci; sistem tidak bisa dihapus; dipakai → 409; hapus → audit', async () => {
    const admin = await asAdmin()
    const created = await post(admin.cookie, { name: 'viewer', description: ' Hanya baca ', permissions: { note: ['read', 'read'] } })
    expect(created.status).toBe(201)
    const body = await readJson(created)
    expect(body.data).toEqual({ name: 'viewer', description: 'Hanya baca', permissions: { note: ['read'] }, system: false, usersCount: 0 })
    expect(body.message).toContain('dibuat')

    const upd = await patch(admin.cookie, 'viewer', { permissions: { note: ['read', 'update'] } })
    expect(upd.status).toBe(200)
    expect((await readJson(upd)).data.permissions).toEqual({ note: ['read', 'update'] })
    expect((await patch(admin.cookie, 'viewer', {})).status).toBe(400)
    expect((await patch(admin.cookie, 'tidak-ada', { description: 'x' })).status).toBe(404)
    const locked = await patch(admin.cookie, 'admin', { description: 'x' })
    expect(locked.status).toBe(403)
    expect((await readJson(locked)).code).toBe('ROLE_LOCKED')
    // role sistem `user` boleh diubah permission-nya
    expect((await patch(admin.cookie, 'user', { description: 'Pengguna' })).status).toBe(200)

    expect((await del(admin.cookie, 'user')).status).toBe(403)
    expect((await del(admin.cookie, 'tidak-ada')).status).toBe(404)

    const target = await signUp({ name: 'Pakai Viewer' })
    await db.update(user).set({ role: 'viewer' }).where(eq(user.id, target.user.id))
    const inUse = await del(admin.cookie, 'viewer')
    expect(inUse.status).toBe(409)
    expect((await readJson(inUse)).code).toBe('ROLE_IN_USE')
    const list = await readData(await call('/api/admin/roles', { cookie: admin.cookie }))
    expect(list.find((r: { name: string }) => r.name === 'viewer').usersCount).toBe(1)

    await db.update(user).set({ role: 'user' }).where(eq(user.id, target.user.id))
    expect((await del(admin.cookie, 'viewer')).status).toBe(200)

    const actions = (await db.select().from(auditLog).where(eq(auditLog.actorId, admin.user.id)).orderBy(desc(auditLog.at))).map((r) => r.action)
    for (const a of ['admin.role_created', 'admin.role_updated', 'admin.role_deleted']) expect(actions).toContain(a)
  })

  test('efek runtime: role baru langsung berlaku di middleware, plugin admin, dan /api/me/permissions; set-role mencabut sesi', async () => {
    const admin = await asAdmin()
    const target = await signUp({ name: 'Target' })
    const targetNotes = (init?: RequestInit) => call('/api/notes', { cookie: target.cookie, ...init })

    // Role belum ada → plugin admin menolak set-role
    const missing = await call('/api/auth/admin/set-role', { method: 'POST', cookie: admin.cookie, body: json({ userId: target.user.id, role: 'viewer' }) })
    expect(missing.status).toBe(400)

    expect((await post(admin.cookie, { name: 'viewer', permissions: { note: ['read'] } })).status).toBe(201)
    const set = await call('/api/auth/admin/set-role', { method: 'POST', cookie: admin.cookie, body: json({ userId: target.user.id, role: 'viewer' }) })
    expect(set.status).toBe(200)

    // Sesi lama target dicabut (propagasi) → masuk lagi
    expect((await targetNotes()).status).toBe(401)
    expect((await db.select().from(session).where(eq(session.userId, target.user.id))).length).toBe(0)
    const relogin = await call('/api/auth/sign-in/email', { method: 'POST', body: json({ email: target.email, password: target.password }) })
    expect(relogin.status).toBe(200)
    const cookie = relogin.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')

    const me = await readData(await call('/api/me/permissions', { cookie }))
    expect(me).toEqual({ role: 'viewer', permissions: { note: ['read'] } })
    expect((await call('/api/notes', { cookie })).status).toBe(200)
    expect((await call('/api/notes', { method: 'POST', cookie, body: json({ title: 'x' }) })).status).toBe(403)

    // Tambah permission → langsung berlaku tanpa restart & tanpa login ulang
    expect((await patch(admin.cookie, 'viewer', { permissions: { note: ['read', 'create'] } })).status).toBe(200)
    expect((await call('/api/notes', { method: 'POST', cookie, body: json({ title: 'x' }) })).status).toBe(201)

    await db.update(user).set({ role: 'user' }).where(eq(user.id, target.user.id))
  })

  test('/api/me/permissions: 401 tanpa sesi; user biasa mendapat permission role user', async () => {
    expect((await call('/api/me/permissions')).status).toBe(401)
    const u = await signUp()
    const me = await readData(await call('/api/me/permissions', { cookie: u.cookie }))
    expect(me.role).toBe('user')
    expect(me.permissions).toEqual({ note: ['create', 'read', 'update', 'delete'] })
  })
})

describe('RoleRegistry', () => {
  test('membuat ulang role sistem yang hilang; admin dipaksa penuh; permission rusak → fallback default', async () => {
    await db.delete(appRole)
    await db.insert(appRole).values([
      { name: 'admin', description: 'x', permissions: { note: ['read'] }, system: true },
      { name: 'user', description: 'y', permissions: { note: ['fly'] }, system: true },
    ])
    const reg = new RoleRegistry(db)
    const defs = await reg.load()
    expect(defs.map((d) => d.name).sort()).toEqual(['admin', 'user'])
    expect(reg.definition('admin')?.permissions.role).toEqual(['list', 'create', 'update', 'delete'])
    expect(reg.definition('user')?.permissions).toEqual({ note: ['create', 'read', 'update', 'delete'] })

    await db.delete(appRole).where(eq(appRole.name, 'user'))
    const again = new RoleRegistry(db)
    expect((await again.load()).some((d) => d.name === 'user')).toBe(true)
  })

  test('can/permissionsOf: gabungan role dipisah koma, role tak dikenal kosong; load paralel berbagi promise', async () => {
    const reg = new RoleRegistry(db)
    const [a, b] = await Promise.all([reg.load(), reg.load()])
    expect(a).toBe(b)
    await reg.create({ name: 'temp', description: '', permissions: { audit: ['list'] } })
    expect(reg.can('user,temp', { audit: ['list'], note: ['read'] })).toBe(true)
    expect(reg.can('user', { audit: ['list'] })).toBe(false)
    expect(reg.can(null, { note: ['read'] })).toBe(false)
    expect(reg.permissionsOf('user,temp')).toEqual({ note: ['create', 'read', 'update', 'delete'], audit: ['list'] })
    expect(reg.permissionsOf('ghost')).toEqual({})
    expect(reg.roles.temp).toBeDefined()
    await reg.delete('temp')
    expect(reg.roles.temp).toBeUndefined()
    expect(reg.has('temp')).toBe(false)
  })

  test('current: DB gagal → definisi terakhir tetap dipakai', async () => {
    let calls = 0
    const broken = {
      select: () => {
        calls++
        throw new Error('db down')
      },
    } as unknown as Db
    const reg = new RoleRegistry(broken, { ttlMs: 0 })
    expect(reg.current().map((d) => d.name)).toEqual(['admin', 'user'])
    await new Promise((r) => setTimeout(r, 5))
    expect(calls).toBe(1)
    expect(reg.can('admin', { role: ['delete'] })).toBe(true)
    await expect(reg.load()).rejects.toThrow('db down')
  })
})
